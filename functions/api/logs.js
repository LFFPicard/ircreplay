// ─────────────────────────────────────────────
// IRCReplay — Cloud Log Storage
// Handles R2 presigned URLs and session metadata in KV
//
// GET  /api/logs          — list user's saved sessions
// POST /api/logs          — get presigned upload URL for a new session
// DELETE /api/logs?id=xxx — delete a session from R2 and KV
// GET  /api/logs?id=xxx   — get presigned download URL for a session
// ─────────────────────────────────────────────

const HEADERS = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': 'https://ircreplay.app',
}

function getUserId(request) {
  return request.headers.get('X-User-Id')
}

// ─────────────────────────────────────────────
// SESSION LIST HELPERS
// ─────────────────────────────────────────────

async function getSessions(kv, userId) {
  const raw = await kv.get(`sessions:${userId}`)
  return raw ? JSON.parse(raw) : []
}

async function saveSessions(kv, userId, sessions) {
  await kv.put(`sessions:${userId}`, JSON.stringify(sessions))
}

// ─────────────────────────────────────────────
// PREMIUM CHECK
// ─────────────────────────────────────────────

async function isPremium(kv, userId) {
  const raw = await kv.get(`user:${userId}`)
  if (!raw) return false
  const user = JSON.parse(raw)
  return user.isPremium === true
}

// ─────────────────────────────────────────────
// HANDLERS
// ─────────────────────────────────────────────

async function handleList(userId, env) {
  const sessions = await getSessions(env.IRCREPLAY_KV, userId)
  return new Response(JSON.stringify({ sessions }), { status: 200, headers: HEADERS })
}

async function handleGetDownloadUrl(userId, sessionId, env) {
  const key    = `${userId}/${sessionId}.json`
  const object = await env.IRCREPLAY_R2.get(key)

  if (!object) {
    return new Response(
      JSON.stringify({ error: 'Session not found' }),
      { status: 404, headers: HEADERS }
    )
  }

  const text = await object.text()
  return new Response(text, {
    status:  200,
    headers: { ...HEADERS, 'Content-Type': 'application/json' },
  })
}

async function handleUpload(userId, request, env) {
  const kv = env.IRCREPLAY_KV

  const premium = await isPremium(kv, userId)
  if (!premium) {
    return new Response(
      JSON.stringify({ error: 'Premium required' }),
      { status: 403, headers: HEADERS }
    )
  }

  const sessions = await getSessions(kv, userId)
  const userRaw  = await kv.get(`user:${userId}`)
  const user     = userRaw ? JSON.parse(userRaw) : {}
  const limit    = user.isLifetime ? 999999 : 50

  if (sessions.length >= limit) {
    return new Response(
      JSON.stringify({ error: 'Session limit reached', limit }),
      { status: 403, headers: HEADERS }
    )
  }

  // Read the JSON body
  const body = await request.text()

  let sessionMeta
  try {
    const parsed = JSON.parse(body)
    sessionMeta = {
      channel: parsed.channel || 'Unknown',
      date:    parsed.date    || null,
      size:    body.length,
    }
  } catch {
    return new Response(
      JSON.stringify({ error: 'Invalid session JSON' }),
      { status: 400, headers: HEADERS }
    )
  }

  const sessionId = crypto.randomUUID()
  const key       = `${userId}/${sessionId}.json`

  // Write directly to R2
  await env.IRCREPLAY_R2.put(key, body, {
    httpMetadata: { contentType: 'application/json' },
  })

  // Record metadata in KV
  const newSession = {
    id:      sessionId,
    channel: sessionMeta.channel,
    date:    sessionMeta.date,
    savedAt: new Date().toISOString(),
    size:    sessionMeta.size,
  }

  sessions.push(newSession)
  await saveSessions(kv, userId, sessions)

  return new Response(
    JSON.stringify({ sessionId, saved: true }),
    { status: 200, headers: HEADERS }
  )
}

async function handleDelete(userId, sessionId, env) {
  const kv  = env.IRCREPLAY_KV
  const key = `${userId}/${sessionId}.json`

  // Delete from R2
  await env.IRCREPLAY_R2.delete(key)

  // Remove from session list in KV
  const sessions    = await getSessions(kv, userId)
  const updated     = sessions.filter(s => s.id !== sessionId)
  await saveSessions(kv, userId, updated)

  return new Response(JSON.stringify({ deleted: true }), { status: 200, headers: HEADERS })
}

// ─────────────────────────────────────────────
// ROUTER
// ─────────────────────────────────────────────

export async function onRequestGet(context) {
  const { request, env } = context
  const userId = getUserId(request)
  if (!userId) return new Response(JSON.stringify({ error: 'Unauthorised' }), { status: 401, headers: HEADERS })

  const url        = new URL(request.url)
  const sessionId  = url.searchParams.get('id')

  if (sessionId) return handleGetDownloadUrl(userId, sessionId, env)
  return handleList(userId, env)
}

export async function onRequestPost(context) {
  const { request, env } = context
  const userId = getUserId(request)
  if (!userId) return new Response(JSON.stringify({ error: 'Unauthorised' }), { status: 401, headers: HEADERS })

  return handleUpload(userId, request, env)
}

export async function onRequestDelete(context) {
  const { request, env } = context
  const userId = getUserId(request)
  if (!userId) return new Response(JSON.stringify({ error: 'Unauthorised' }), { status: 401, headers: HEADERS })

  const url       = new URL(request.url)
  const sessionId = url.searchParams.get('id')
  if (!sessionId) return new Response(JSON.stringify({ error: 'Missing session ID' }), { status: 400, headers: HEADERS })

  return handleDelete(userId, sessionId, env)
}

export async function onRequestOptions() {
  return new Response(null, {
    headers: {
      'Access-Control-Allow-Origin':  'https://ircreplay.app',
      'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, X-User-Id',
    },
  })
}
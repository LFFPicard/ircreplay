// ─────────────────────────────────────────────
// IRCReplay — Public Share Endpoint
// Serves session JSON publicly — no auth required
// URL: /api/share/:userId/:sessionId
// ─────────────────────────────────────────────

const HEADERS = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': '*',
}

export async function onRequestGet(context) {
  const { env, params } = context
  const userId    = params.userId
  const sessionId = params.sessionId

  if (!userId || !sessionId) {
    return new Response(
      JSON.stringify({ error: 'Invalid share link' }),
      { status: 400, headers: HEADERS }
    )
  }

  try {
    const key    = `${userId}/${sessionId}.json`
    const object = await env.IRCREPLAY_R2.get(key)

    if (!object) {
      return new Response(
        JSON.stringify({ error: 'Session not found or link has expired' }),
        { status: 404, headers: HEADERS }
      )
    }

    const text = await object.text()
    return new Response(text, {
      status:  200,
      headers: { ...HEADERS, 'Cache-Control': 'public, max-age=3600' },
    })

  } catch (err) {
    console.error('Share function error:', err.message)
    return new Response(
      JSON.stringify({ error: 'Something went wrong' }),
      { status: 500, headers: HEADERS }
    )
  }
}

export async function onRequestOptions() {
  return new Response(null, {
    headers: {
      'Access-Control-Allow-Origin':  '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
    },
  })
}
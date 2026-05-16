// ─────────────────────────────────────────────
// IRCReplay — Paddle Webhook Handler
//
// Env vars required in Cloudflare Pages:
//   PADDLE_WEBHOOK_SECRET  — from Paddle dashboard
//                            Developer Tools → Notifications → your endpoint
//   PADDLE_PRICE_LTD       — Price ID for the lifetime deal product
//
// Events subscribed to in Paddle dashboard:
//   subscription.created
//   subscription.updated
//   subscription.canceled
//   subscription.past_due
//   transaction.completed  (for LTD one-time payment)
// ─────────────────────────────────────────────

const HEADERS = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': 'https://ircreplay.app',
}

// ─────────────────────────────────────────────
// SIGNATURE VERIFICATION
// Paddle signs webhooks with HMAC-SHA256
// Also checks timestamp to prevent replay attacks
// ─────────────────────────────────────────────

async function verifySignature(secret, body, signatureHeader) {
  if (!signatureHeader) return false

  const tsMatch = signatureHeader.match(/ts=(\d+)/)
  const h1Match = signatureHeader.match(/h1=([a-f0-9]+)/)

  if (!tsMatch || !h1Match) return false

  const timestamp = tsMatch[1]
  const signature = h1Match[1]

  // Reject webhooks older than 5 minutes — prevents replay attacks
  const webhookTime = parseInt(timestamp, 10) * 1000
  const fiveMinutes = 5 * 60 * 1000
  if (Math.abs(Date.now() - webhookTime) > fiveMinutes) return false

  const signedPayload = `${timestamp}:${body}`

  const encoder = new TextEncoder()
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  )
  const signed = await crypto.subtle.sign('HMAC', key, encoder.encode(signedPayload))
  const expected = Array.from(new Uint8Array(signed))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('')

  return expected === signature
}

// ─────────────────────────────────────────────
// KV HELPERS
// ─────────────────────────────────────────────

async function getUser(kv, userId) {
  const record = await kv.get(`user:${userId}`)
  return record ? JSON.parse(record) : null
}

async function setUser(kv, userId, data) {
  await kv.put(`user:${userId}`, JSON.stringify(data))
}

async function setPremium(kv, userId, isPremium) {
  const user = await getUser(kv, userId)
  if (!user) {
    await setUser(kv, userId, {
      userId,
      createdAt:    new Date().toISOString(),
      isPremium,
      premiumSince: isPremium ? new Date().toISOString() : null,
    })
    return
  }
  await setUser(kv, userId, {
    ...user,
    isPremium,
    premiumSince: isPremium && !user.premiumSince
      ? new Date().toISOString()
      : user.premiumSince,
  })
}

// ─────────────────────────────────────────────
// EVENT HANDLERS
// ─────────────────────────────────────────────

async function handleSubscriptionCreated(data, kv) {
  const customData = data.custom_data || data.customData || {}
  const userId     = customData.clerk_user_id || customData.clerkUserId
  if (!userId) return
  await setPremium(kv, userId, true)
}

async function handleSubscriptionUpdated(data, kv) {
  const customData     = data.custom_data || data.customData || {}
  const userId         = customData.clerk_user_id || customData.clerkUserId
  if (!userId) return
  const activeStatuses = ['active', 'trialing', 'past_due']
  const isPremium      = activeStatuses.includes(data.status)
  await setPremium(kv, userId, isPremium)
}

async function handleSubscriptionCancelled(data, kv) {
  const customData = data.custom_data || data.customData || {}
  const userId     = customData.clerk_user_id || customData.clerkUserId
  if (!userId) return
  await setPremium(kv, userId, false)
}

async function handleTransactionCompleted(data, kv, ltdPriceId) {
  const customData = data.custom_data || data.customData || {}
  const userId     = customData.clerk_user_id || customData.clerkUserId
  if (!userId) return
  const items = data.items || []
  const isLTD = items.some(item => item.price?.id === ltdPriceId || item.price_id === ltdPriceId)
  if (!isLTD) return
  const user = await getUser(kv, userId) || { userId, createdAt: new Date().toISOString() }
  await setUser(kv, userId, {
    ...user,
    isPremium:    true,
    isLifetime:   true,
    premiumSince: user.premiumSince || new Date().toISOString(),
  })
}

// ─────────────────────────────────────────────
// MAIN HANDLER
// ─────────────────────────────────────────────

export async function onRequestPost(context) {
  const { request, env } = context

  const secret          = env.PADDLE_WEBHOOK_SECRET
  const signatureHeader = request.headers.get('paddle-signature')
  const body            = await request.text()

  const isValid = await verifySignature(secret, body, signatureHeader)
  if (!isValid) {
    return new Response(
      JSON.stringify({ error: 'Invalid signature' }),
      { status: 401, headers: HEADERS }
    )
  }

  let payload
  try {
    payload = JSON.parse(body)
  } catch {
    return new Response(
      JSON.stringify({ error: 'Invalid JSON' }),
      { status: 400, headers: HEADERS }
    )
  }

  const eventType  = payload.event_type || payload.eventType
  const data       = payload.data
  const kv         = env.IRCREPLAY_KV
  const ltdPriceId = env.PADDLE_PRICE_LTD

  try {
    if      (eventType === 'subscription.created')                                             await handleSubscriptionCreated(data, kv)
    else if (eventType === 'subscription.updated')                                             await handleSubscriptionUpdated(data, kv)
    else if (eventType === 'subscription.canceled' || eventType === 'subscription.cancelled')  await handleSubscriptionCancelled(data, kv)
    else if (eventType === 'subscription.past_due')                                            await handleSubscriptionCancelled(data, kv)
    else if (eventType === 'transaction.completed')                                            await handleTransactionCompleted(data, kv, ltdPriceId)

    return new Response(
      JSON.stringify({ received: true }),
      { status: 200, headers: HEADERS }
    )

  } catch (err) {
    return new Response(
      JSON.stringify({ error: 'Handler failed' }),
      { status: 500, headers: HEADERS }
    )
  }
}

export async function onRequestOptions() {
  return new Response(null, {
    headers: {
      'Access-Control-Allow-Origin':  'https://ircreplay.app',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, paddle-signature',
    },
  })
}
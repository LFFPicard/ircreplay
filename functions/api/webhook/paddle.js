// ─────────────────────────────────────────────
// IRCReplay — Paddle Webhook Handler
//
// Env vars required in Cloudflare Pages:
//   PADDLE_WEBHOOK_SECRET  — from Paddle dashboard
//                            Developer Tools → Notifications → your endpoint
//   PADDLE_PRICE_LTD       — Price ID for the lifetime deal product
//   PADDLE_API_KEY         — used to look up the original transaction on refunds
//
// Events subscribed to in Paddle dashboard:
//   subscription.created
//   subscription.updated
//   subscription.canceled
//   subscription.past_due  (keeps access — Paddle retries payment)
//   subscription.paused    (revokes access unless isLifetime)
//   transaction.completed  (for LTD one-time payment)
//   adjustment.created     (refunds — acts only once approved)
//   adjustment.updated     (refund approval arrives here)
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

  return timingSafeEqual(expected, signature)
}

// Constant-time string comparison — avoids leaking how many leading
// characters of the signature matched via response timing
function timingSafeEqual(a, b) {
  if (typeof a !== 'string' || typeof b !== 'string') return false
  if (a.length !== b.length) return false
  let diff = 0
  for (let i = 0; i < a.length; i++) {
    diff |= a.charCodeAt(i) ^ b.charCodeAt(i)
  }
  return diff === 0
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
  // past_due keeps access — Paddle retries the payment. Only canceled or
  // paused revokes. Any other status leaves the record unchanged.
  const activeStatuses  = ['active', 'trialing', 'past_due']
  const revokedStatuses = ['canceled', 'paused']
  if (activeStatuses.includes(data.status)) {
    await setPremium(kv, userId, true)
    return
  }
  if (!revokedStatuses.includes(data.status)) return
  // Lifetime users keep premium regardless of any subscription's status
  if (await isLifetimeUser(kv, userId)) return
  await setPremium(kv, userId, false)
}

async function handleSubscriptionCancelled(data, kv) {
  const customData = data.custom_data || data.customData || {}
  const userId     = customData.clerk_user_id || customData.clerkUserId
  if (!userId) return
  // Lifetime users keep premium even if an old subscription is cancelled
  if (await isLifetimeUser(kv, userId)) return
  await setPremium(kv, userId, false)
}

async function isLifetimeUser(kv, userId) {
  const user = await getUser(kv, userId)
  return user?.isLifetime === true
}

// ─────────────────────────────────────────────
// REFUNDS (adjustment.created / adjustment.updated)
// Adjustments don't carry custom_data, so the original transaction is
// fetched from the Paddle API to find the Clerk user ID.
// Access is revoked only — R2 sessions and KV session lists are kept.
// ─────────────────────────────────────────────

// Sandbox keys (pdl_sdbx_apikey_…) only work against the sandbox API.
// Live keys use https://api.paddle.com.
function paddleApiBase(apiKey) {
  return apiKey.startsWith('pdl_sdbx_')
    ? 'https://sandbox-api.paddle.com'
    : 'https://api.paddle.com'
}

async function fetchTransaction(transactionId, apiKey) {
  const res = await fetch(
    `${paddleApiBase(apiKey)}/transactions/${encodeURIComponent(transactionId)}`,
    { headers: { 'Authorization': `Bearer ${apiKey}` } }
  )
  if (!res.ok) throw new Error(`Paddle transaction lookup failed: ${res.status}`)
  const json = await res.json()
  return json.data
}

async function handleAdjustment(data, kv, env) {
  // Only fully approved, full refunds. Partial refunds and other actions are ignored.
  if (data?.action !== 'refund' || data?.status !== 'approved' || data?.type !== 'full') return

  const transactionId = data.transaction_id
  if (!transactionId) {
    console.error('Refund adjustment has no transaction_id:', data.id)
    return
  }
  if (!env.PADDLE_API_KEY) {
    console.error('Refund not applied: PADDLE_API_KEY is not configured', data.id)
    return
  }

  let transaction
  try {
    transaction = await fetchTransaction(transactionId, env.PADDLE_API_KEY)
  } catch (err) {
    console.error('Refund not applied — transaction lookup failed:', transactionId, err.message)
    return
  }

  const customData = transaction?.custom_data || transaction?.customData || {}
  const userId     = customData.clerk_user_id || customData.clerkUserId
  if (!userId) {
    console.error('Refund not applied — no Clerk user ID on transaction:', transactionId)
    return
  }

  const user = await getUser(kv, userId)
  if (!user) {
    console.error('Refund not applied — no KV user record for:', userId)
    return
  }

  const ltdPriceId = env.PADDLE_PRICE_LTD
  const items      = transaction.items || []
  const lineItems  = transaction.details?.line_items || []
  const wasLTD     = !!ltdPriceId && (
    items.some(item => item.price?.id === ltdPriceId || item.price_id === ltdPriceId) ||
    lineItems.some(item => item.price_id === ltdPriceId)
  )

  if (wasLTD) {
    await setUser(kv, userId, { ...user, isLifetime: false, isPremium: false })
    return
  }

  if (user.isLifetime === true) return
  await setUser(kv, userId, { ...user, isPremium: false })
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
    else if (eventType === 'subscription.paused')                                              await handleSubscriptionCancelled(data, kv)
    else if (eventType === 'subscription.past_due')                                            await handleSubscriptionUpdated(data, kv)
    else if (eventType === 'transaction.completed')                                            await handleTransactionCompleted(data, kv, ltdPriceId)
    else if (eventType === 'adjustment.created' || eventType === 'adjustment.updated')         await handleAdjustment(data, kv, env)

    return new Response(
      JSON.stringify({ received: true }),
      { status: 200, headers: HEADERS }
    )

  } catch (err) {
    console.error('Paddle webhook handler failed:', eventType, err?.message || err)
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
// ─────────────────────────────────────────────
// IRCReplay — Paddle Webhook Handler
//
// TODO: Before going live, confirm these are set in Cloudflare Pages env vars:
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
// ─────────────────────────────────────────────

async function verifySignature(secret, body, signatureHeader) {
  if (!signatureHeader) return false

  // Use regex to extract ts and h1 — splitting on = breaks if hash contains =
  const tsMatch = signatureHeader.match(/ts=(\d+)/)
  const h1Match = signatureHeader.match(/h1=([a-f0-9]+)/)

  if (!tsMatch || !h1Match) return false

  const timestamp = tsMatch[1]
  const signature = h1Match[1]

  // Signed payload is: timestamp:rawBody
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
  console.log('handleSubscriptionCreated called')
  console.log('data:', JSON.stringify(data))
  
  const customData = data.custom_data || data.customData || {}
  console.log('customData:', JSON.stringify(customData))
  
  const userId = customData.clerk_user_id || customData.clerkUserId
  console.log('userId:', userId)
  
  if (!userId) {
    console.error('no clerk_user_id found')
    return
  }
  
  console.log('calling setPremium for', userId)
  await setPremium(kv, userId, true)
  console.log('setPremium complete')
}

async function handleSubscriptionUpdated(data, kv) {
  const customData = data.custom_data || data.customData || {}
  const userId = customData.clerk_user_id || customData.clerkUserId
  if (!userId) return
  const status = data.status
  console.log(`subscription.updated: userId=${userId} status=${status}`)
  const activeStatuses = ['active', 'trialing', 'past_due']
  const isPremium = activeStatuses.includes(status)
  await setPremium(kv, userId, isPremium)
}

async function handleSubscriptionCancelled(data, kv) {
  const customData = data.custom_data || data.customData || {}
  const userId = customData.clerk_user_id || customData.clerkUserId
  if (!userId) return
  console.log(`subscription.canceled: revoking premium from ${userId}`)
  await setPremium(kv, userId, false)
}

async function handleTransactionCompleted(data, kv, ltdPriceId) {
  const customData = data.custom_data || data.customData || {}
  const userId = customData.clerk_user_id || customData.clerkUserId
  if (!userId) {
    console.error('transaction.completed: no clerk_user_id in custom_data', JSON.stringify(customData))
    return
  }
  const items = data.items || []
  const isLTD = items.some(item => (item.price?.id === ltdPriceId) || (item.price_id === ltdPriceId))
  if (!isLTD) {
    console.log('transaction.completed: not an LTD purchase — ignoring')
    return
  }
  console.log(`transaction.completed: granting lifetime premium to ${userId}`)
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

  //const secret = env.PADDLE_WEBHOOK_SECRET
  //if (!secret) {
    //console.error('PADDLE_WEBHOOK_SECRET is not set')
    //return new Response(
     // JSON.stringify({ error: 'Webhook secret not configured' }),
    //  { status: 500, headers: HEADERS }
   // )
  //}

  const signatureHeader = request.headers.get('paddle-signature')
  const body = await request.text()

  const isValid = await verifySignature(secret, body, signatureHeader)
  if (!isValid) {
    console.error('Paddle webhook signature verification failed')
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

  const eventType = payload.event_type
  const data      = payload.data
  const kv        = env.IRCREPLAY_KV
  const ltdPriceId = env.PADDLE_PRICE_LTD

  console.log(`Paddle webhook received: ${eventType}`)

  try {
    if      (eventType === 'subscription.created')   await handleSubscriptionCreated(data, kv)
    else if (eventType === 'subscription.updated')   await handleSubscriptionUpdated(data, kv)
    else if (eventType === 'subscription.canceled')  await handleSubscriptionCancelled(data, kv)
    else if (eventType === 'subscription.past_due')  await handleSubscriptionCancelled(data, kv)
    else if (eventType === 'transaction.completed')  await handleTransactionCompleted(data, kv, ltdPriceId)
    else console.log(`Unhandled event: ${eventType}`)

    return new Response(
      JSON.stringify({ received: true }),
      { status: 200, headers: HEADERS }
    )

  } catch (err) {
    console.error(`Error handling ${eventType}:`, err.message)
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
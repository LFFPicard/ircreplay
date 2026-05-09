// ─────────────────────────────────────────────
// IRCReplay — LemonSqueezy Webhook Handler
//
// TODO: Before going live, add these to Cloudflare Pages env vars:
//   LEMONSQUEEZY_WEBHOOK_SECRET  — generated in LemonSqueezy dashboard
//                                  Settings → Webhooks → Add webhook
//                                  URL: https://ircreplay.app/api/webhook/lemonsqueezy
//
// Events to subscribe to in LemonSqueezy:
//   subscription_created
//   subscription_updated
//   subscription_cancelled
//   subscription_expired
//   order_created  (for LTD one-time payment)
// ─────────────────────────────────────────────

const HEADERS = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': 'https://ircreplay.app',
}

// ─────────────────────────────────────────────
// SIGNATURE VERIFICATION
// LemonSqueezy signs every webhook with HMAC-SHA256
// We must verify this before acting on any event
// ─────────────────────────────────────────────

async function verifySignature(secret, body, signature) {
  const encoder = new TextEncoder()
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  )
  const signed = await crypto.subtle.sign('HMAC', key, encoder.encode(body))
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
    // User record doesn't exist yet — create it
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
  const userId = data.meta?.custom_data?.clerk_user_id
  if (!userId) {
    console.error('subscription_created: no clerk_user_id in custom_data')
    return
  }
  console.log(`subscription_created: granting premium to ${userId}`)
  await setPremium(kv, userId, true)
}

async function handleSubscriptionUpdated(data, kv) {
  const userId = data.meta?.custom_data?.clerk_user_id
  if (!userId) return

  const status = data.data?.attributes?.status
  console.log(`subscription_updated: userId=${userId} status=${status}`)

  // Active statuses — keep premium
  const activeStatuses = ['active', 'trialing', 'past_due']
  const isPremium = activeStatuses.includes(status)
  await setPremium(kv, userId, isPremium)
}

async function handleSubscriptionCancelled(data, kv) {
  const userId = data.meta?.custom_data?.clerk_user_id
  if (!userId) return
  console.log(`subscription_cancelled: revoking premium from ${userId}`)
  // Keep data — just flip the flag
  // A 30-day grace period could be added here later
  await setPremium(kv, userId, false)
}

async function handleSubscriptionExpired(data, kv) {
  const userId = data.meta?.custom_data?.clerk_user_id
  if (!userId) return
  console.log(`subscription_expired: revoking premium from ${userId}`)
  await setPremium(kv, userId, false)
}

async function handleOrderCreated(data, kv) {
  // One-time purchase — used for the Lifetime Deal
  const userId = data.meta?.custom_data?.clerk_user_id
  if (!userId) {
    console.error('order_created: no clerk_user_id in custom_data')
    return
  }

  // TODO: confirm your LTD variant ID here
  // LEMONSQUEEZY_VARIANT_LTD = 1628935
  const variantId = data.data?.attributes?.first_order_item?.variant_id
  const LTD_VARIANT_ID = 1628935

  if (variantId !== LTD_VARIANT_ID) {
    console.log(`order_created: variant ${variantId} is not the LTD — ignoring`)
    return
  }

  console.log(`order_created: granting lifetime premium to ${userId}`)
  const user = await getUser(kv, userId) || {
    userId,
    createdAt: new Date().toISOString(),
  }
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

  // TODO: LEMONSQUEEZY_WEBHOOK_SECRET must be set in Cloudflare env vars
  // Add it in: Cloudflare → Pages → ircreplay → Settings → Environment Variables
  const secret = env.LEMONSQUEEZY_WEBHOOK_SECRET
  if (!secret) {
    console.error('LEMONSQUEEZY_WEBHOOK_SECRET is not set')
    return new Response(JSON.stringify({ error: 'Webhook secret not configured' }), { status: 500, headers: HEADERS })
  }

  const signature = request.headers.get('x-signature')
  if (!signature) {
    return new Response(JSON.stringify({ error: 'Missing signature' }), { status: 401, headers: HEADERS })
  }

  // Read body as text for signature verification — must happen before parsing JSON
  const body = await request.text()

  const isValid = await verifySignature(secret, body, signature)
  if (!isValid) {
    console.error('Webhook signature verification failed')
    return new Response(JSON.stringify({ error: 'Invalid signature' }), { status: 401, headers: HEADERS })
  }

  // Parse the verified payload
  let payload
  try {
    payload = JSON.parse(body)
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid JSON' }), { status: 400, headers: HEADERS })
  }

  const eventName = payload.meta?.event_name
  const kv        = env.IRCREPLAY_KV

  console.log(`Webhook received: ${eventName}`)

  try {
    if (eventName === 'subscription_created')   await handleSubscriptionCreated(payload, kv)
    else if (eventName === 'subscription_updated')   await handleSubscriptionUpdated(payload, kv)
    else if (eventName === 'subscription_cancelled') await handleSubscriptionCancelled(payload, kv)
    else if (eventName === 'subscription_expired')   await handleSubscriptionExpired(payload, kv)
    else if (eventName === 'order_created')          await handleOrderCreated(payload, kv)
    else console.log(`Unhandled event: ${eventName}`)

    return new Response(JSON.stringify({ received: true }), { status: 200, headers: HEADERS })

  } catch (err) {
    console.error(`Error handling ${eventName}:`, err.message)
    return new Response(JSON.stringify({ error: 'Handler failed' }), { status: 500, headers: HEADERS })
  }
}

export async function onRequestOptions() {
  return new Response(null, {
    headers: {
      'Access-Control-Allow-Origin':  'https://ircreplay.app',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, x-signature',
    },
  })
}
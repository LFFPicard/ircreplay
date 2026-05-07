export async function onRequestGet(context) {
  const { env, request } = context

  const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': 'https://ircreplay.app',
  }

  try {
    // Get Clerk user ID from the request header
    // The frontend will send it as X-User-Id
    const userId = request.headers.get('X-User-Id')

    if (!userId) {
      return new Response(
        JSON.stringify({ error: 'No user ID provided' }),
        { status: 401, headers }
      )
    }

    // Look up user record in KV
    const record = await env.IRCREPLAY_KV.get(`user:${userId}`)

    if (!record) {
      // First time we've seen this user — create a default record
      const newUser = {
        userId,
        createdAt:  new Date().toISOString(),
        isPremium:  false,
        premiumSince: null,
      }
      await env.IRCREPLAY_KV.put(`user:${userId}`, JSON.stringify(newUser))
      return new Response(JSON.stringify(newUser), { status: 200, headers })
    }

    return new Response(record, { status: 200, headers })

  } catch (err) {
    console.error('User function error:', err.message)
    return new Response(
      JSON.stringify({ error: 'Something went wrong' }),
      { status: 500, headers }
    )
  }
}

export async function onRequestOptions() {
  return new Response(null, {
    headers: {
      'Access-Control-Allow-Origin': 'https://ircreplay.app',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, X-User-Id',
    },
  })
}
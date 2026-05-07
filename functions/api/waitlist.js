export async function onRequestPost(context) {
  const { request, env } = context

  // CORS headers for the response
  const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': 'https://ircreplay.app',
  }

  try {
    const body = await request.json()
    const email = (body.email || '').trim().toLowerCase()

    // Basic email validation
    if (!email || !email.includes('@') || !email.includes('.')) {
      return new Response(
        JSON.stringify({ success: false, error: 'Please enter a valid email address' }),
        { status: 400, headers }
      )
    }

    // Add contact to Resend with ircreplay-waitlist tag
    const resendRes = await fetch('https://api.resend.com/contacts', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${env.RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email,
        tags: ['ircreplay-waitlist'],
        unsubscribed: false,
      }),
    })

    if (!resendRes.ok) {
      const err = await resendRes.json()
      // If contact already exists that is fine — treat as success
      if (resendRes.status === 409 || (err.name && err.name === 'validation_error')) {
        return new Response(
          JSON.stringify({ success: true, alreadySubscribed: true }),
          { status: 200, headers }
        )
      }
      throw new Error(`Resend error: ${resendRes.status}`)
    }

    return new Response(
      JSON.stringify({ success: true }),
      { status: 200, headers }
    )

  } catch (err) {
    console.error('Waitlist error:', err)
    return new Response(
      JSON.stringify({ success: false, error: 'Something went wrong, please try again' }),
      { status: 500, headers }
    )
  }
}

// Handle CORS preflight
export async function onRequestOptions() {
  return new Response(null, {
    headers: {
      'Access-Control-Allow-Origin': 'https://ircreplay.app',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  })
}
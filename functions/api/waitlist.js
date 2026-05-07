export async function onRequestPost(context) {
  const { request, env } = context

  const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': 'https://ircreplay.app',
  }

  try {
    const body  = await request.json()
    const email = (body.email || '').trim().toLowerCase()

    if (!email || !email.includes('@') || !email.includes('.')) {
      return new Response(
        JSON.stringify({ success: false, error: 'Please enter a valid email address' }),
        { status: 400, headers }
      )
    }

    // Create contact with custom property so we can segment them
    const resendRes = await fetch('https://api.resend.com/contacts', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${env.RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email,
        unsubscribed: false,
        properties: {
          ircreplay_waitlist: 'true',
        },
      }),
    })

    if (!resendRes.ok) {
      const err = await resendRes.json()
      console.error('Resend response:', resendRes.status, JSON.stringify(err))

      // Contact already exists — still a success
      if (resendRes.status === 409) {
        return new Response(
          JSON.stringify({ success: true, alreadySubscribed: true }),
          { status: 200, headers }
        )
      }
      throw new Error(`Resend error: ${resendRes.status} — ${JSON.stringify(err)}`)
    }

    return new Response(
      JSON.stringify({ success: true }),
      { status: 200, headers }
    )

  } catch (err) {
    console.error('Waitlist error:', err.message)
    return new Response(
      JSON.stringify({ success: false, error: 'Something went wrong, please try again' }),
      { status: 500, headers }
    )
  }
}

export async function onRequestOptions() {
  return new Response(null, {
    headers: {
      'Access-Control-Allow-Origin': 'https://ircreplay.app',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  })
}
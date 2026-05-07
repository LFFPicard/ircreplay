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

    // Step 1 — Create the contact
    const createRes = await fetch('https://api.resend.com/contacts', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${env.RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email,
        unsubscribed: false,
      }),
    })

    let contactId = null

    if (createRes.ok) {
      const created = await createRes.json()
      contactId = created.id
    } else if (createRes.status === 409) {
      // Contact already exists — fetch their ID
      const getRes = await fetch(`https://api.resend.com/contacts/${encodeURIComponent(email)}`, {
        headers: { 'Authorization': `Bearer ${env.RESEND_API_KEY}` },
      })
      if (getRes.ok) {
        const existing = await getRes.json()
        contactId = existing.id
      }
    } else {
      const err = await createRes.json()
      throw new Error(`Create contact failed: ${createRes.status} — ${JSON.stringify(err)}`)
    }

    if (!contactId) {
      throw new Error('Could not resolve contact ID')
    }

    // Step 2 — Add contact to the waitlist segment
    const segmentRes = await fetch(
      `https://api.resend.com/contacts/${contactId}/segments/${env.RESEND_SEGMENT_ID}`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${env.RESEND_API_KEY}`,
          'Content-Type': 'application/json',
        },
      }
    )

    if (!segmentRes.ok) {
      const err = await segmentRes.json()
      // 409 means already in segment — still a success
      if (segmentRes.status !== 409) {
        throw new Error(`Add to segment failed: ${segmentRes.status} — ${JSON.stringify(err)}`)
      }
    }

    const alreadySubscribed = createRes.status === 409
    return new Response(
      JSON.stringify({ success: true, alreadySubscribed }),
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
// ─────────────────────────────────────────────
// IRCReplay — Shared API auth helper
//
// Verifies the Clerk session token sent as
//   Authorization: Bearer <token>
// and returns the Clerk user ID from the token's `sub` claim.
//
// Requires env.CLERK_SECRET_KEY in Cloudflare Pages (and .dev.vars locally).
// This file exports no onRequest handlers, so Pages does not route it.
// ─────────────────────────────────────────────

import { verifyToken } from '@clerk/backend'

/**
 * @returns {Promise<{ userId: string } | { error: string }>}
 */
export async function authenticate(request, env) {
  if (!env.CLERK_SECRET_KEY) {
    console.error('Auth error: CLERK_SECRET_KEY is not configured')
    return { error: 'Authentication not configured' }
  }

  const header = request.headers.get('Authorization') || ''
  const match  = header.match(/^Bearer\s+(.+)$/i)
  if (!match) return { error: 'Missing bearer token' }

  try {
    const payload = await verifyToken(match[1].trim(), { secretKey: env.CLERK_SECRET_KEY })
    if (!payload?.sub) return { error: 'Invalid token' }
    return { userId: payload.sub }
  } catch {
    return { error: 'Invalid token' }
  }
}

export function unauthorised(error, headers) {
  return new Response(JSON.stringify({ error }), { status: 401, headers })
}

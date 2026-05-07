# CLAUDE.md — IRCReplay.app

## Project Overview
Browser-based IRC log viewer and statistics generator. Users drag-and-drop IRC log files, view them in a themed chat interface, and explore channel statistics. Fully client-side — no server, no database.

A premium tier is in active planning. The build order is: SEO + email capture first, then auth, then storage, then billing.

## Stack

### Current (free tier, static)
- **Framework:** Vite + React (JavaScript, no TypeScript)
- **Styling:** Tailwind CSS
- **Routing:** react-router-dom
- **Charts:** Recharts (stats page)
- **Hosting:** Cloudflare Pages (auto-deploys from GitHub on push to `main`)
- **Repo:** github.com/LFFPicard/ircreplay (public)
- **Domain:** ircreplay.app

### Planned additions (premium tier)
- **Auth:** Clerk.dev — chosen over Supabase Auth because Vite/CF Pages integration is cleaner. Drop-in ClerkProvider wrapper.
- **Backend API:** Cloudflare Pages Functions — `/functions` folder alongside the existing Vite site. No separate deployment needed.
- **File storage:** Cloudflare R2 — zero egress fees, native to CF Pages. Log files uploaded via presigned URLs (client uploads directly to R2, never passes through the function).
- **Database (user/subscription records):** Cloudflare KV — lightweight key/value for user state and premium flags. No Supabase needed at this scale.
- **Billing:** LemonSqueezy — acts as Merchant of Record, handles EU VAT automatically. Use for recurring subscriptions. **NOT Stripe** (tax complexity). 
- **LTD launch payments:** PayPal — simpler for one-time lifetime deal payments before full billing infrastructure is live. Manual premium grant is fine at launch scale.
- **Transactional email:** Resend — for subscription confirmations and welcome emails.

## Architecture
- All processing happens client-side in Web Workers for non-blocking parsing of large log files.
- Virtual scrolling for rendering large chat histories without DOM overload.
- Three visual themes for the chat view.
- No backend, no auth, no database — purely static site.

### Planned architecture additions (premium)
- CF Pages Functions will add a thin API layer at `/functions/api/`. These are Worker-based edge functions.
- R2 bucket scoped per user ID. Presigned URL flow: client requests upload URL from function → uploads directly to R2 → function records metadata in KV.
- Premium flag lives in Cloudflare KV keyed by Clerk user ID. LemonSqueezy webhook flips this flag.
- All premium features gate on `isPremium` check against KV at request time.

## Key Directories
```
src/
├── pages/          # Viewer.jsx, Stats.jsx
├── components/     # ChatPane, stat display components
├── workers/        # parseWorker.js, statsWorker.js
├── lib/            # parser.js, mergelogs.js, core logic
└── context/        # SessionContext (React context for parsed data)

functions/          # CF Pages Functions (to be created — premium API layer)
├── api/
│   ├── logs.js     # R2 presigned URL generation, log CRUD
│   └── user.js     # User state, premium flag checks
```

## Web Workers
- `src/workers/parseWorker.js` — Parses raw IRC log text into structured message objects. Imports from `../lib/parser.js` and `../lib/mergelogs.js`.
- `src/workers/statsWorker.js` — Computes channel statistics from parsed data.
- Workers are imported using Vite's `?worker` suffix syntax:
  ```js
  import ParseWorker from '../workers/parseWorker.js?worker'
  const worker = new ParseWorker()
  ```
  Do NOT use `new Worker(new URL(...), { type: 'module' })` — it's unreliable in Vite.

## Parser
- Handles mIRC-format logs (timestamps, nicks, actions, joins/parts/quits, mode changes, topic changes).
- `stripControlCodes` removes IRC formatting codes.
- `extractColour` / `MIRC_COLOURS` handle mIRC colour code rendering.
- `sortLogFiles` merges and chronologically sorts multiple log files.

## Themes
Three chat display themes available to users. Classic theme is desktop-only.

## Known Gotchas — IMPORTANT
- **Vite/OXC JSX parser strictness:** Comparison operators (`<`, `>`) and special characters in JSX expressions MUST be pre-computed into variables or use HTML entities. Standalone `>` in multi-line JSX causes build errors. This is a recurring issue — always extract comparisons to `const` before the return statement.
- **Worker import paths:** Workers live in `src/workers/` but import utilities from `src/lib/`. Relative paths must use `../lib/` prefix.
- **MIME type errors on workers** are almost always a "file not found" — Vite returns a 404 HTML page and the browser complains about MIME types instead of saying the file is missing.
- **CF Pages Functions + Vite together:** The `functions/` folder must sit at the project root (not inside `src/`). CF Pages detects it automatically. Vite's dev server does not run functions locally — use `wrangler pages dev dist` for local function testing after a build.
- **Presigned URLs and CORS:** R2 bucket will need a CORS policy that allows PUT from the domain. Set this in the Cloudflare dashboard before testing uploads.
- **Clerk + CF Pages:** Use `@clerk/clerk-react` (not the Next.js package). ClerkProvider wraps the React Router root. Protected routes use `<SignedIn>` / `<SignedOut>` components or the `useAuth()` hook.

## Planned Work

### Priority 1 — SEO and email capture (do this before any premium build)
The Reddit spike and scriptserv.com referral are warm traffic landing on a free tool with no retention mechanism. Fix this first:
- Vite is a SPA — Googlebot may not be indexing it well. Audit with Google Search Console.
- Add `react-helmet-async` (or Vite SSG plugin) for per-page `<title>`, `<meta description>`, and OpenGraph tags.
- Create `public/robots.txt` and `public/sitemap.xml`.
- Add OpenGraph social preview image (1200×630px).
- **Add email capture banner** — "Pro features coming soon — get notified." Even 50 email signups is a warm list for the LTD launch. Use a simple Resend form or a Netlify/CF form.
- Add a "Coming Soon" section to the landing page listing the planned premium features by name.
- Target keywords: `IRC log viewer`, `IRC replay`, `mIRC log parser`, `IRC chat history`, `IRC log reader online`

### Priority 2 — Mobile responsiveness
- Hamburger menu for mobile nav
- Classic theme restricted to desktop only
- Dropzone layout improvements on small screens

### Priority 3 — Premium tier (phases below)
Build phases in order. Do not skip phases — each one is a prerequisite for the next.

### Priority 4 — Parser expansion
Expanded parser support as more log formats and log samples become available.

## Premium Tier Roadmap

### Phase 0 — Auth (1–2 weeks)
**Goal:** User accounts exist. Nothing is premium-gated yet.
- Install `@clerk/clerk-react`
- Wrap React Router root with `ClerkProvider` (publishable key from Clerk dashboard)
- Add `/login` and `/signup` pages using Clerk's prebuilt components
- Protect the `/dashboard` route with `<SignedIn>` redirect
- Store minimal user record in Cloudflare KV on first sign-in: `{ userId, email, createdAt, isPremium: false }`

**Learning unlocks:** JWTs, session tokens vs cookies, route guards, auth state in React

### Phase 1 — Storage layer (2–3 weeks)
**Goal:** Logged-in users can save and retrieve logs across sessions.
- Create `functions/` folder at project root
- Add `functions/api/logs.js` — generates R2 presigned upload URLs (PUT), lists user's saved logs (GET), deletes a log (DELETE)
- Presigned URL flow: React calls function → function generates signed R2 URL → React uploads file directly to R2 → function writes metadata to KV
- Add a Saved Logs dashboard page (list, delete, rename, click to load)
- Free tier: session-only (existing behaviour, no changes needed). Premium: persisted.

**Learning unlocks:** Serverless edge functions, object storage, presigned URL security model, user-scoped data

### Phase 2 — Billing (1–2 weeks)
**Goal:** Money comes in. Premium flag gets set automatically.
- Create LemonSqueezy product (Pro monthly £3.49, Pro annual £29.99)
- Add `/pricing` page with plan cards
- Add `functions/api/webhooks/lemonsqueezy.js` — listens for `subscription_created`, `subscription_updated`, `subscription_cancelled` events
- On `subscription_created`: set `isPremium: true` in KV for the user
- On `subscription_cancelled`: set `isPremium: false`, keep data for 30-day grace period
- Verify webhook signatures — do not skip this
- **LTD launch (PayPal, pre-LemonSqueezy):** A simple PayPal.me link or button on the pricing page. First 100 customers pay £49.99, you manually set their KV flag to `isPremium: true`. This is intentionally low-tech — get cash in the door before the automated system is built.

**Learning unlocks:** Payment webhook flows, idempotency (why you must check event IDs before acting), subscription state machine

### Phase 3 — Premium features (2–3 weeks)
**Goal:** Paying users get things they actually paid for.
- **PDF/PNG export:** `html2canvas` to render the stats page to canvas, `jsPDF` to wrap it. Export button on Stats page, gated by `isPremium`.
- **Branded share links:** `/s/:username/:slug` routes. When a user saves a log, they get a shareable URL. Public view is read-only, no login required.
- **Extended stats:** More Recharts visualisations — hourly activity heatmap, top word clouds (consider `d3-cloud`), nick activity over time.
- **Multi-file session:** Allow dragging in multiple files at once for merged viewing (free tier already supports this but can be surfaced better for premium).

**Learning unlocks:** Canvas rendering, client-side PDF generation, URL slug namespacing, richer data vis

### Phase 4 — Launch (1 week)
**Goal:** Tell people it exists. Capture email list. Run LTD.
- Enforce free tier limits in the UI (soft limits with upgrade prompts, not hard errors)
- Wire up Resend for subscription confirmation and welcome emails
- Polish the `/pricing` page
- Announce to the same communities that drove the Reddit spike
- Run the lifetime deal (£49.99, first 100 customers, PayPal or LemonSqueezy one-time product)

**Learning unlocks:** Transactional email, rate/usage limiting, indie product launch

## Monetisation Model

| Tier | Price | Key limits |
|------|-------|-----------|
| Free | £0 forever | Session-only, 1 file at a time, basic stats, no sharing |
| Pro monthly | £3.49/month | 50 saved logs, PDF export, branded share links, extended stats |
| Pro annual | £29.99/year (~28% saving) | Same as monthly |
| Lifetime | £49.99 one-time (launch only, first 100) | Everything in Pro, all future features |

Revenue targets:
- 50 lifetime @ £49.99 = £2,500 upfront (LTD launch)
- 100 monthly @ £3.49 = £349/month recurring
- 50 annual @ £29.99 = ~£125/month equivalent

## Commands
```bash
npm run dev      # Local dev server (default port 5173)
npm run build    # Production build to dist/
npm run preview  # Preview production build locally

# When functions/ exists:
wrangler pages dev dist   # Test CF Pages Functions locally (after build)
```

## Deployment
Push to `main` triggers Cloudflare Pages auto-deploy.
Build command: `npm run build`
Output directory: `dist`

When `functions/` folder is added, CF Pages detects and deploys it automatically alongside the static site. No separate wrangler deploy needed.

# CLAUDE.md — IRCReplay.app

## Project Overview
Browser-based IRC log viewer and statistics generator. Users drag-and-drop IRC log files, view them in a themed chat interface, and explore channel statistics. Fully client-side for the free tier — no server, no database.

A premium tier is in active build. Auth, KV storage, and billing pipeline are all live in sandbox. Next step is R2 storage for cloud log saving.

## Stack

### Current (live)
- **Framework:** Vite + React (JavaScript, no TypeScript)
- **Styling:** Tailwind CSS
- **Routing:** react-router-dom
- **Charts:** Recharts (stats page)
- **Virtual scrolling:** @tanstack/react-virtual
- **Auth:** @clerk/react v6 (Core 3) — ClerkProvider in main.jsx
- **Hosting:** Cloudflare Pages (auto-deploys from GitHub push to `main`)
- **Functions:** Cloudflare Pages Functions (`/functions` folder at project root)
- **KV:** Cloudflare KV — namespace `IRCREPLAY_KV`, bound in CF Pages settings
- **Billing:** Paddle (sandbox) — overlay checkout via Paddle.js, webhook handler live
- **Email:** Resend — waitlist signups via `/api/waitlist` function
- **Repo:** github.com/LFFPicard/ircreplay (public)
- **Domain:** ircreplay.app

### Planned additions (premium tier)
- **File storage:** Cloudflare R2 — zero egress fees, native to CF Pages. Log files uploaded via presigned URLs.
- **Transactional email:** Resend — subscription confirmations and welcome emails.

## Environment Variables (Cloudflare Pages + .env.local)

| Variable | Used in | Notes |
|---|---|---|
| `VITE_CLERK_PUBLISHABLE_KEY` | Frontend | Clerk dev key — swap for prod key at launch |
| `RESEND_API_KEY` | CF Function | Resend API key for waitlist |
| `RESEND_SEGMENT_ID` | CF Function | Resend segment ID for waitlist |
| `VITE_PADDLE_CLIENT_TOKEN` | Frontend | Paddle.js client token — starts with `test_` in sandbox |
| `VITE_PADDLE_PRICE_MONTHLY` | Frontend | Price ID `pri_01krp43ygghhsdtbhr2964yqv3` |
| `VITE_PADDLE_PRICE_ANNUAL` | Frontend | Price ID `pri_01krp47c4gm27t2py6adrj2nag` |
| `VITE_PADDLE_PRICE_LTD` | Frontend | Price ID `pri_01krp485agbrm8c4ghv8avbvwf` |
| `PADDLE_API_KEY` | CF Function | Paddle sandbox API key |
| `PADDLE_WEBHOOK_SECRET` | CF Function | Full secret from Paddle notification destination — starts with `pdl_ntfset_` |
| `PADDLE_PRICE_LTD` | CF Function | Same LTD price ID — used by webhook to identify LTD purchases |

## Architecture

### Free tier (fully client-side)
- All log parsing in Web Workers — non-blocking, handles 136k+ messages
- Virtual scrolling — only visible rows rendered regardless of log size
- Three themes — Dark, Light, Classic (desktop-only)
- Session JSON save/load — no server needed
- Stats engine in Web Worker

### Premium tier (in build)
- CF Pages Functions provide thin API at `/functions/api/`
- KV stores user records keyed by Clerk user ID: `user:{userId}`
- User record shape: `{ userId, createdAt, isPremium, premiumSince, isLifetime? }`
- Paddle webhook flips `isPremium` flag in KV on subscription events
- All premium features will gate on `isPremium` from KV
- R2 bucket scoped per user ID (not yet built)

## Key Directories
```
src/
├── pages/          # Viewer, Stats, About, Help, Links, ComingSoon, Pricing
├── components/     # Nav, ChatPane, NamesPanel, ChatLine, DropZone, Footer,
│                   # PlaybackControls, ClassicChrome
├── workers/        # parseWorker.js, statsWorker.js
├── lib/            # parser.js, mergelogs.js, exportHtml.js, exportSession.js
├── hooks/          # usePlayback.js
└── context/        # SessionContext, ThemeContext, UserContext

functions/
└── api/
    ├── waitlist.js         # Resend email capture — LIVE
    ├── user.js             # KV user record create/fetch — LIVE
    └── webhook/
        └── paddle.js       # Paddle webhook handler — LIVE (sandbox)
```

## Clerk Auth — IMPORTANT
- Package: `@clerk/react` v6 (Core 3) — NOT `@clerk/clerk-react`
- Import path matters — wrong package = missing exports error
- v6 uses `<Show when="signed-out">` / `<Show when="signed-in">` NOT `<SignedIn>` / `<SignedOut>` (deprecated in Core 3)
- Also exports `useAuth` and `useClerk` for hooks-based auth
- `ClerkProvider` wraps the app in `main.jsx` — NOT in `App.jsx`
- Sign ups are RESTRICTED in Clerk dashboard — invite only until Pro launches
- Sign Up buttons are commented out in Nav.jsx ready to uncomment at launch
- Currently using DEV keys — swap for production keys before launch
- `VITE_CLERK_PUBLISHABLE_KEY` in `.env.local` for local dev + Cloudflare env vars for production

## Paddle Billing — IMPORTANT

### Current state
- Sandbox mode — no real money
- Overlay checkout via Paddle.js loaded in `index.html`
- Paddle initialised in `useEffect` in `Pricing.jsx` — called ONCE on page load, not on button click
- `Environment.set('sandbox')` must be called BEFORE `Initialize()`
- Checkout passes `clerk_user_id` via `customData`

### Paddle camelCase gotcha
Paddle converts `custom_data` keys to camelCase in webhook payloads:
- You send: `{ clerk_user_id: 'user_xxx' }`
- Webhook receives: `{ clerkUserId: 'user_xxx' }`
- Always handle both: `customData.clerk_user_id || customData.clerkUserId`

### Event type gotcha
Paddle uses British spelling in some events:
- `subscription.cancelled` (double l) — British
- `subscription.canceled` (single l) — American
- Always handle both in the router

### Webhook secret
The webhook secret is NOT the notification ID (`ntfset_xxx`).
The full secret is found by editing the notification destination in Paddle dashboard.
It starts with `pdl_ntfset_` and is much longer — includes a random signing key after the last underscore.

### Going live checklist
1. Remove `Paddle.Environment.set('sandbox')` from Pricing.jsx
2. Swap all `VITE_PADDLE_*` env vars for live price IDs
3. Swap `VITE_PADDLE_CLIENT_TOKEN` for live client token (starts with `live_`)
4. Swap `PADDLE_API_KEY` and `PADDLE_WEBHOOK_SECRET` for live values
5. Create new live webhook endpoint in Paddle pointing to same URL
6. Switch Clerk from dev to production keys

## Web Workers
- Workers live in `src/workers/`, import from `../lib/` (relative path)
- Import syntax — ALWAYS use Vite `?worker` suffix:
  ```js
  import ParseWorker from '../workers/parseWorker.js?worker'
  const worker = new ParseWorker()
  ```
- Do NOT use `new Worker(new URL(...), { type: 'module' })` — unreliable in Vite

## Parser
- Auto-detects log format via `detectFormat()` — inspects first 30 lines
- Format A: mIRC binary (real `\x03` control codes)
- Format B: mIRC plain text (no control codes) — mIRCStats sample format
- Format C: XChat/HexChat — `Mon DD HH:MM:SS` timestamp, tab-separated, single `*` events
- `stripControlCodes` removes IRC formatting bytes
- `extractColour` / `MIRC_COLOURS` handle mIRC 16-colour palette
- `sortLogFiles` merges and chronologically orders multiple log files
- Shared `parseSystemBody()` handles `***` event lines for mIRC formats
- XChat mode events use natural language ("gives channel operator status to") — translated to standard `+o/-o` format

## Supported Log Formats
| Format | Status |
|---|---|
| mIRC default (binary control codes) | ✅ Live |
| mIRC plain text | ✅ Live |
| XChat / HexChat | ✅ Live |
| Multi-file merge with date ordering | ✅ Live |
| irssi | 🔄 Planned — VM idling to collect logs |
| ZNC bouncer | 🔄 Planned |

## Themes
- Dark, Light, Classic — switched via ThemeContext
- Classic is desktop-only — auto-switches to Dark on mobile (screen width < 768px)
- Classic uses Fixedsys Excelsior font from CDN, falls back to Courier New
- CSS overrides per theme class in `index.css`

## Known Gotchas — IMPORTANT

### OXC JSX Parser (most common issue)
Vite 6 uses OXC which is stricter than previous parsers. These ALL cause build errors:
- Comparison operators (`<`, `>`) inline in JSX className strings
- Ternary operators inline in JSX className strings
- Multi-line JSX attributes with `>` on their own line
- Special characters (`©`, `—`, emojis) directly in JSX text
- JSX comments `{/* */}` that accidentally swallow closing tags

**Fix pattern — ALWAYS do this:**
```jsx
// WRONG
<div className={`text-${value > 10 ? 'red' : 'green'}-400`}>

// RIGHT — pre-compute before return
const colour = value > 10 ? 'text-red-400' : 'text-green-400'
return <div className={colour}>
```

Use HTML entities for special chars: `&copy;` `&mdash;` `&middot;` `&#9889;` etc.

### Worker Import Paths
Workers in `src/workers/` import from `src/lib/` — use `../lib/` prefix. Wrong path = MIME type error.

### CF Pages Functions Local Testing
`npm run dev` does NOT run CF Pages Functions. To test functions locally:
```bash
npm run build
wrangler pages dev dist
```
Opens at `http://localhost:8788`. Requires `wrangler.toml` at project root with KV namespace binding.

### wrangler.toml
Required for local KV testing. Local dev uses simulated KV — does NOT write to real Cloudflare KV. Use `--remote` flag for real KV testing locally.

### .gitignore — must include
```
*.local
.wrangler
node_modules
dist
```

### Resend Global Contact Model
As of Nov 2025 Resend uses global contacts — no audience IDs. Contacts are segmented via Segments. Waitlist flow: create contact → add to segment by segment ID. Two API calls.

### Git on Windows
Line ending warnings (LF → CRLF) on `git add` are normal on Windows — not errors, safe to ignore.

## Completed Work

### Free Tier — Complete ✅
- Multi-file IRC log parser with auto format detection (mIRC binary, plain text, XChat)
- IRC chat viewer with virtual scrolling
- Instant and Replay playback modes with speed controls
- Live names panel with @/+ prefixes and IRC sort order
- Stats engine — top chatters, hourly activity, word frequency, URLs, time of day
- Clickable nick profiles with sample lines
- Three themes — Dark, Light, Classic mIRC chrome
- Mobile responsive — hamburger nav, Classic desktop-only
- Export — HTML stats page, PDF via print dialog
- Session JSON save/load
- Demo log (one-click load on drop zone)
- About, Help/FAQ, Links, Pricing, Pro Coming Soon pages
- Footer with Ko-fi and PayPal donation links

### SEO & Marketing — Complete ✅
- Meta tags, OG tags, Twitter card (summary_large_image)
- OG social preview image (1200×630px)
- LemonSqueezy store assets (logo 160x160, favicon 32x32, header 1600x300)
- robots.txt and sitemap.xml
- Google Search Console submitted
- Reddit posts — r/IRC and r/mIRC
- Scriptserv.com (sorzkode) linking to IRCReplay
- 875+ unique visitors in first week

### Premium Infrastructure — Billing Complete ✅
- ✅ Clerk auth — sign in live, sign ups restricted, Google SSO working
- ✅ Cloudflare KV — user records created on sign in
- ✅ /api/waitlist CF Function — Resend email capture live
- ✅ /api/user CF Function — KV user record create/fetch live
- ✅ Paddle sandbox — products created (monthly, annual, LTD)
- ✅ Paddle.js overlay checkout — working end to end
- ✅ /api/webhook/paddle — signature verification working
- ✅ subscription.created → isPremium: true confirmed
- ✅ subscription.cancelled → isPremium: false confirmed
- ✅ Sign in guard on checkout — prompts Clerk modal if not signed in
- ⏳ R2 file storage — next up
- ⏳ Switch to live Paddle + Clerk credentials — after Pro features built

## Next Steps (in order)

### Phase 1 — R2 Storage
- Create R2 bucket in Cloudflare dashboard
- Build `functions/api/logs.js` — presigned URL generation, log CRUD
- Add saved logs dashboard page (list, load, delete)
- Gate on `isPremium` check from KV

### Phase 2 — Premium Features
- Cloud log storage UI wired to R2
- Branded share links `/s/:nick/:channel`
- Extended stats visualisations
- Enforce free tier limits with upgrade prompts

### Phase 3 — Launch
- Remove debug console.logs from webhook handler
- Switch Paddle sandbox → live credentials
- Switch Clerk dev → production keys
- Uncomment Sign Up buttons in Nav.jsx
- Resend subscription confirmation emails
- Announce to IRC communities
- Run LTD campaign

## Commands
```bash
npm run dev               # Local dev (port 5173) — no CF Functions
npm run build             # Production build to dist/
npm run preview           # Preview production build

wrangler pages dev dist   # Local dev WITH CF Functions (port 8788)
```

## Deployment
Push to `main` → Cloudflare Pages auto-deploys. Build command: `npm run build`. Output: `dist/`. CF Pages detects `functions/` folder automatically.

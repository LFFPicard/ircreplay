# CLAUDE.md — IRCReplay.app

## Project Overview
Browser-based IRC log viewer and statistics generator. Users drag-and-drop IRC log files, view them in a themed chat interface, and explore channel statistics. Fully client-side for the free tier — no server, no database.

A premium tier is in active build. Auth and KV storage are live. Billing is blocked on LemonSqueezy identity verification.

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
- **Email:** Resend — waitlist signups via `/api/waitlist` function
- **Repo:** github.com/LFFPicard/ircreplay (public)
- **Domain:** ircreplay.app

### Planned additions (premium tier)
- **File storage:** Cloudflare R2 — zero egress fees, native to CF Pages. Log files uploaded via presigned URLs.
- **Billing:** LemonSqueezy — Merchant of Record, handles EU VAT. NOT Stripe (tax complexity).
- **Transactional email:** Resend — subscription confirmations and welcome emails.

## Environment Variables (Cloudflare Pages + .env.local)

| Variable | Used in | Notes |
|---|---|---|
| `VITE_CLERK_PUBLISHABLE_KEY` | Frontend | Clerk publishable key — safe to expose |
| `RESEND_API_KEY` | CF Function | Resend API key for waitlist |
| `RESEND_SEGMENT_ID` | CF Function | Resend segment ID for waitlist |
| `LEMONSQUEEZY_VARIANT_MONTHLY` | Frontend/Function | Variant ID 1628924 |
| `LEMONSQUEEZY_VARIANT_ANNUAL` | Frontend/Function | Variant ID 1628930 |
| `LEMONSQUEEZY_VARIANT_LTD` | Frontend/Function | Variant ID 1628935 |
| `LEMONSQUEEZY_STORE_ID` | Function | Store ID (no # prefix) |
| `LEMONSQUEEZY_API_KEY` | Function | Awaiting identity verification |
| `LEMONSQUEEZY_WEBHOOK_SECRET` | Function | Generated when webhook is created |

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
- User record shape: `{ userId, createdAt, isPremium, premiumSince }`
- R2 bucket scoped per user ID (not yet built)
- LemonSqueezy webhook flips `isPremium` flag in KV
- All premium features gate on `isPremium` from KV

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
    ├── waitlist.js       # Resend email capture — LIVE
    ├── user.js           # KV user record create/fetch — LIVE
    └── webhook/
        └── lemonsqueezy.js  # TO BUILD — awaiting LS verification
```

## Clerk Auth — IMPORTANT
- Package: `@clerk/react` v6 (Core 3) — NOT `@clerk/clerk-react`
- Import path matters — wrong package = missing exports error
- v6 uses `<Show when="signed-out">` / `<Show when="signed-in">` NOT `<SignedIn>` / `<SignedOut>` (those are deprecated in Core 3)
- `ClerkProvider` wraps the app in `main.jsx` — NOT in `App.jsx`
- Sign ups are RESTRICTED in Clerk dashboard — invite only until Pro launches
- Sign Up buttons are commented out in Nav.jsx ready to uncomment at launch
- `VITE_CLERK_PUBLISHABLE_KEY` in `.env.local` for local dev + Cloudflare env vars for production

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
- Format A: mIRC binary (real `\x03` control codes) — your personal logs
- Format B: mIRC plain text (no control codes) — mIRCStats sample format
- `stripControlCodes` removes IRC formatting bytes
- `extractColour` / `MIRC_COLOURS` handle mIRC 16-colour palette
- `sortLogFiles` merges and chronologically orders multiple log files
- Shared `parseSystemBody()` handles `***` event lines across all formats

## Supported Log Formats
| Format | Status |
|---|---|
| mIRC default (binary control codes) | ✅ Live |
| mIRC plain text | ✅ Live |
| Multi-file merge with date ordering | ✅ Live |
| irssi | 🔄 Planned |
| XChat / HexChat | 🔄 Planned |
| ZNC bouncer | 🔄 Planned |

## Themes
- Dark, Light, Classic — switched via ThemeContext
- Classic is desktop-only — auto-switches to Dark on mobile (screen width < 768px)
- Classic uses Fixedsys Excelsior font from CDN, falls back to Courier New
- CSS overrides per theme class in `index.css` — Tailwind arbitrary values not used for theme colours

## LemonSqueezy Products
| Product | Variant ID | Type |
|---|---|---|
| Pro Monthly | 1628924 | Subscription |
| Pro Annual | 1628930 | Subscription |
| Lifetime Deal | 1628935 | One-time |

Checkout URL format: `https://ircreplay.lemonsqueezy.com/checkout/buy/{variantId}?checkout[custom][clerk_user_id]={userId}`

The `clerk_user_id` custom param is how the webhook knows which KV record to update.

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
Workers in `src/workers/` import from `src/lib/` — use `../lib/` prefix. Wrong path = MIME type error (Vite returns 404 HTML, browser complains about MIME type instead of saying file not found).

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
- Multi-file IRC log parser with auto format detection
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
- About, Help/FAQ, Links pages
- Footer with Ko-fi and PayPal donation links

### SEO & Marketing — Complete ✅
- Meta tags, OG tags, Twitter card (summary_large_image)
- OG social preview image (1200×630px)
- robots.txt and sitemap.xml
- Google Search Console submitted
- Reddit posts — r/IRC and r/mIRC
- Scriptserv.com (sorzkode) linking to IRCReplay
- 875+ unique visitors, 6.25k requests in first week

### Premium Infrastructure — In Progress 🔄
- ✅ Clerk auth — sign in live, sign ups restricted
- ✅ Cloudflare KV — user records created on sign in
- ✅ /api/waitlist CF Function — Resend email capture live
- ✅ /api/user CF Function — KV user record create/fetch live
- ✅ Pro Coming Soon page with waitlist signup
- ✅ Pricing page — four plan cards, FAQ
- ✅ LemonSqueezy products created (3 variants)
- ⏳ LemonSqueezy identity verification pending
- ⏳ /api/webhook/lemonsqueezy — blocked on verification
- ⏳ Checkout URLs need clerk_user_id param wired in
- ⏳ R2 file storage (Phase 1 — not started)

## Next Steps (in order)

### Immediate — when LemonSqueezy verification comes through
1. Get API key and add to Cloudflare env vars
2. Create webhook in LemonSqueezy dashboard → get signing secret
3. Add `LEMONSQUEEZY_WEBHOOK_SECRET` to Cloudflare env vars
4. Build `functions/api/webhook/lemonsqueezy.js`
5. Update Pricing.jsx checkout URLs to pass `clerk_user_id`
6. Test end to end with test mode payments

### Phase 1 — R2 Storage (after billing works)
- Create R2 bucket in Cloudflare
- Build `functions/api/logs.js` — presigned URL generation, log CRUD
- Add saved logs dashboard page
- Gate on `isPremium` check

### Phase 2 — Premium Features
- Cloud log storage UI
- Branded share links `/s/:nick/:channel`
- Extended stats visualisations
- Enforce free tier limits with upgrade prompts

### Phase 3 — Launch
- Resend subscription confirmation emails
- Announce to IRC communities
- Run LTD campaign

## Commands
```bash
npm run dev           # Local dev (port 5173) — no CF Functions
npm run build         # Production build to dist/
npm run preview       # Preview production build

wrangler pages dev dist   # Local dev WITH CF Functions (port 8788)
```

## Deployment
Push to `main` → Cloudflare Pages auto-deploys. Build command: `npm run build`. Output: `dist/`. CF Pages detects `functions/` folder automatically.

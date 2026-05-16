# CLAUDE.md — IRCReplay.app

## Project Overview
Browser-based IRC log viewer and statistics generator. Users drag-and-drop IRC log files, view them in a themed chat interface, and explore channel statistics. Fully client-side for the free tier — no server, no database.

Premium tier is feature-complete in sandbox. Auth, KV, billing, R2 cloud storage, share links, and extended Pro stats are all working. Ready for launch after switching to live credentials.

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
- **R2:** Cloudflare R2 — bucket `ircreplay-logs`, bound as `IRCREPLAY_R2`
- **Billing:** Paddle (sandbox) — overlay checkout via Paddle.js, webhook handler live
- **Email:** Resend — waitlist signups via `/api/waitlist` function
- **Repo:** github.com/LFFPicard/ircreplay (public)
- **Domain:** ircreplay.app

### Planned additions
- **Transactional email:** Resend — subscription confirmations at launch

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

### Premium tier (complete in sandbox)
- CF Pages Functions provide thin API at `/functions/api/`
- KV stores user records keyed by Clerk user ID: `user:{userId}`
- KV stores session lists: `sessions:{userId}` — array of session metadata
- User record shape: `{ userId, createdAt, isPremium, premiumSince, isLifetime? }`
- Session metadata shape: `{ id, channel, date, savedAt, size }`
- R2 stores session JSON at key: `{userId}/{sessionId}.json`
- Paddle webhook flips `isPremium` flag in KV on subscription events
- All premium features gate on `isPremium` from KV via UserContext
- Share links served publicly via `/api/share/[userId]/[sessionId]` CF Function

## Key Directories
```
src/
├── pages/          # Viewer, Stats, About, Help, Links, ComingSoon,
│                   # Pricing, Dashboard, ShareView
├── components/     # Nav, ChatPane, NamesPanel, ChatLine, DropZone,
│                   # Footer, PlaybackControls, ClassicChrome
├── workers/        # parseWorker.js, statsWorker.js
├── lib/            # parser.js, mergelogs.js, exportHtml.js, exportSession.js
├── hooks/          # usePlayback.js
└── context/        # SessionContext, ThemeContext, UserContext

functions/
└── api/
    ├── waitlist.js             # Resend email capture — LIVE
    ├── user.js                 # KV user record create/fetch — LIVE
    ├── logs.js                 # R2 cloud storage CRUD — LIVE
    ├── share/
    │   └── [userId]/
    │       └── [sessionId].js  # Public share endpoint — LIVE
    └── webhook/
        └── paddle.js           # Paddle webhook handler — LIVE (sandbox)
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
- Sign in guard in place — `openSignIn()` called if not signed in when clicking checkout

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
7. Uncomment Sign Up buttons in Nav.jsx
8. Remove debug console.logs from paddle.js webhook handler

## R2 Cloud Storage — IMPORTANT

### How it works
- Session JSON is POSTed directly to `/api/logs` — function writes to R2
- Function reads JSON back from R2 and returns it directly on GET
- No presigned URLs — direct read/write through the function
- Session limit: 50 for Pro, unlimited for Lifetime (`isLifetime: true` in KV)
- Cloud Save shows full-screen overlay with spinner during upload

### R2 binding
- Variable name in function: `env.IRCREPLAY_R2`
- Bound in Cloudflare Pages — Settings — Bindings
- Any change to bindings requires a new deployment to take effect

### Dashboard
- `/dashboard` route — shows saved sessions list
- Instant and Replay buttons per session — mode passed via `session.mode`
- Viewer picks up `session.mode` via `useEffect` on session change
- Copy share link button per session — shows "Copied!" for 2 seconds
- Delete removes from both R2 and KV session list

## Share Links — IMPORTANT

### URL format
`https://ircreplay.app/s/{userId}/{sessionId}`

### Privacy and security
- Share page sets `noindex, nofollow` meta tag and document title on mount
- CF Function returns `X-Robots-Tag: noindex, nofollow` and `Cache-Control: private, no-store`
- robots.txt has `Disallow: /s/` to block search crawlers
- Cloudflare AI crawler blocking enabled in dashboard — blocks GPTBot, Claude-Web etc
- UUIDs in URL make links unguessable

### Share page
- Public route — no auth required to view
- Renders full Pro stats page (all charts, clickable nick profiles)
- Shows "Powered by IRCReplay" banner with Try Free and Go Pro CTAs
- Copy Link button in header
- ShareView route is OUTSIDE AppContent — has its own standalone layout

### App.jsx routing — CRITICAL
The `/s/:userId/:sessionId` route must be declared OUTSIDE the main layout:
```jsx
function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/s/:userId/:sessionId" element={<ShareView />} />
        <Route path="*" element={<AppContent />} />
      </Routes>
    </BrowserRouter>
  )
}
```

## Pro Stats

### Free tier stats
- Overview cards (messages, chatters, words, URLs, joins, days)
- Activity by hour bar chart
- Time of day champions
- Top chatters table with clickable nick profiles
- Most used words
- URLs shared

### Pro tier stats (gated with ProGate blur overlay)
- Bot Filter — exclude nicks from all stats, updates filteredStats via useMemo
- Activity Heatmap — day x hour CSS grid, green intensity scale, last 30 days
- Top Chatters Over Time — line chart, top 5 by day, downsampled if over 60 days
- Word Cloud — CSS-based, font size scales with frequency, top 60 words
- Emoji and Emoticon Stats — top 15 emoticons and laugh words
- Connections — top nick mention pairs with relationship arrows
- Conversation Starters — who breaks silence after 5+ minutes quiet
- Channel Mood Over Time — laughter/questions/CAPS % line chart

### Bot Filter
- Appears above all stats — first thing to configure
- Shows as locked banner for non-premium users
- Nicks sorted by activity (bots usually at top)
- Search box to find specific nicks
- Exclusions update `filteredStats` via useMemo — all charts update instantly
- Exclusions reset when new session loaded

## Classic Chrome
- Full Windows 98 aesthetic — inline styles only, no Tailwind
- Sign In button and UserButton avatar in title bar
- Dashboard link in menu bar when isPremium and signed in
- Toolbar buttons: Load Log, Save, Stats, Cloud Save (premium only), Help
- Cloud Save in toolbar calls same handleCloudSave as modern nav

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
- XChat mode events use natural language — translated to standard `+o/-o` format

## Supported Log Formats
| Format | Status |
|---|---|
| mIRC default (binary control codes) | Live |
| mIRC plain text | Live |
| XChat / HexChat | Live |
| Multi-file merge with date ordering | Live |
| irssi | Planned — VM idling to collect logs |
| ZNC bouncer | Planned |

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
- Special characters directly in JSX text
- JSX comments that accidentally swallow closing tags

**Fix pattern — ALWAYS do this:**
```jsx
// WRONG
<div className={`text-${value > 10 ? 'red' : 'green'}-400`}>

// RIGHT — pre-compute before return
const colour = value > 10 ? 'text-red-400' : 'text-green-400'
return <div className={colour}>
```

Use HTML entities for special chars: `&copy;` `&mdash;` `&middot;` `&#9889;` etc.
Nav.jsx and ShareView.jsx use HTML entities throughout to avoid OXC issues.

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

### Cloudflare Bindings
Any change to KV or R2 bindings in Cloudflare dashboard requires a new deployment before the function can use the updated binding. Push an empty commit to trigger a rebuild if needed.

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

### Free Tier — Complete
- Multi-file IRC log parser with auto format detection (mIRC binary, plain text, XChat)
- IRC chat viewer with virtual scrolling
- Instant and Replay playback modes with speed controls
- Live names panel with @/+ prefixes and IRC sort order
- Stats engine — top chatters, hourly activity, word frequency, URLs, time of day
- Clickable nick profiles with expandable sample quotes and hourly chart
- Three themes — Dark, Light, Classic mIRC chrome
- Mobile responsive — hamburger nav, Classic desktop-only
- Export — HTML stats page, PDF via print dialog
- Session JSON save/load (local)
- Demo log (one-click load on drop zone)
- About, Help/FAQ, Links, Pricing, Pro Coming Soon pages
- Footer with Ko-fi and PayPal donation links

### SEO and Marketing — Complete
- Meta tags, OG tags, Twitter card (summary_large_image)
- OG social preview image (1200x630px)
- Paddle store assets (logo, favicon, header)
- robots.txt with /s/ disallowed, sitemap.xml
- Google Search Console submitted
- Reddit posts — r/IRC and r/mIRC — 875+ unique visitors in first week
- Scriptserv.com (sorzkode) linking to IRCReplay

### Premium Infrastructure — Complete
- Clerk auth — sign in live, sign ups restricted, Google SSO working
- Cloudflare KV — user records created on sign in
- /api/waitlist CF Function — Resend email capture live
- /api/user CF Function — KV user record create/fetch live
- Paddle sandbox — products created (monthly, annual, LTD)
- Paddle.js overlay checkout — working end to end
- /api/webhook/paddle — signature verification working
- subscription.created → isPremium: true confirmed
- subscription.cancelled → isPremium: false confirmed
- Sign in guard on checkout — prompts Clerk modal if not signed in
- R2 bucket created and bound as IRCREPLAY_R2
- /api/logs CF Function — cloud save, list, restore, delete all working
- Dashboard page — session list with Instant/Replay restore, share link, delete
- Cloud Save button in nav with full-screen overlay during upload
- Session limit enforced — 50 for Pro, unlimited for Lifetime
- /api/share CF Function — public read from R2, no auth required
- ShareView page — full Pro stats, Powered by banner, copy link
- Share link privacy — noindex meta, X-Robots-Tag, private Cache-Control
- Cloudflare AI crawler blocking — GPTBot, Claude-Web etc blocked
- Classic Chrome updated — sign in, dashboard, save, cloud save all working

### Pro Stats — Complete
- Bot Filter — exclude nicks from all stats with instant update
- Activity Heatmap
- Top Chatters Over Time line chart
- Word Cloud
- Emoji and Emoticon Stats
- Connections / Relationship Map
- Conversation Starters
- Channel Mood Over Time

## Next Steps — Launch

### Pre-launch checklist
- Remove debug console.logs from paddle.js webhook handler
- Switch Paddle sandbox → live credentials (see Going live checklist above)
- Switch Clerk dev → production keys
- Uncomment Sign Up buttons in Nav.jsx
- Update Help page — add cloud storage, dashboard, and share links to feature list
- Add Resend subscription confirmation emails

### Launch
- Announce to IRC communities (Reddit r/IRC, r/mIRC, Scriptserv)
- Run LTD campaign — first 100 customers £49.99 lifetime
- Monitor KV and R2 usage in Cloudflare dashboard

### Post-launch ideas
- irssi log format support
- ZNC bouncer log format support
- Grace period for cancelled subscriptions (keep sessions 30 days)
- Download sessions as JSON from dashboard

## Commands
```bash
npm run dev               # Local dev (port 5173) — no CF Functions
npm run build             # Production build to dist/
npm run preview           # Preview production build

wrangler pages dev dist   # Local dev WITH CF Functions (port 8788)
```

## Deployment
Push to `main` → Cloudflare Pages auto-deploys. Build command: `npm run build`. Output: `dist/`. CF Pages detects `functions/` folder automatically.

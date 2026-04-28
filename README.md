# IRCReplay

> Relive the chat. A browser-based IRC log viewer and stats generator.

**[ircreplay.app](https://ircreplay.app)** — Upload your old mIRC log files and read them like you used to. Watch the conversation replay in real time, generate channel statistics, and export shareable HTML stats pages. Everything runs in your browser — your logs never leave your device.

---

## Features

- **Multi-file upload** — Drop one file or an entire collection. Files named `#channel.YYYYMMDD.log` are automatically sorted and merged in chronological order
- **Two viewing modes** — Instant (full log at once) or Replay (watch it unfold in real time with speed controls)
- **mIRC colour codes** — Authentic rendering of mIRC's 16-colour palette with theme-aware fallbacks
- **Live names panel** — Populates dynamically as joins, quits and nick changes appear, with `@` op and `+` voice prefixes
- **Stats engine** — Top chatters, activity by hour, time of day champions, most used words, URL extraction, question/CAPS/action ratios with example lines
- **Export** — Self-contained HTML stats page or PDF via browser print dialog
- **Session save/load** — Export your parsed session as JSON and reload it instantly next time — no re-uploading the original logs
- **Three themes** — Dark, Light, and Classic (full mIRC Windows 98 chrome with title bar, menu bar, toolbar and status bar)
- **Mobile responsive** — Hamburger nav, Classic theme is desktop-only
- **Privacy first** — All processing happens in the browser via Web Workers. Nothing is ever transmitted to a server

---

## Supported Log Formats

| Format | Status |
|---|---|
| mIRC default logging (binary control codes) | ✅ Supported |
| mIRC plain text logging | ✅ Supported |
| Multi-file merge with date-based ordering | ✅ Supported |
| UTF-8 encoded files | ✅ Supported |
| irssi | 🔄 In Progress |
| XChat / HexChat | 🔄 In Progress |
| ZNC bouncer | 🔄 In Progress |
| Textual | 🔄 In Progress |
| Latin-1 / Windows-1252 encoding | 🔄 In Progress |

Have logs from a client not listed? See [Contributing](#contributing) below.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | React 18 + Vite |
| Styling | Tailwind CSS |
| Charts | Recharts |
| Virtual scrolling | @tanstack/react-virtual |
| Heavy processing | Web Workers (parse, merge, stats) |
| Hosting | Cloudflare Pages |

No backend. No database. No cookies. No accounts.

---

## Getting Started

### Prerequisites

- Node.js v18 or higher
- npm

### Local Development

```bash
# Clone the repo
git clone https://github.com/LFFPicard/ircreplay.git
cd ircreplay

# Install dependencies
npm install

# Start the dev server
npm run dev
```

The app will be available at `http://localhost:5173`.

### Build for Production

```bash
npm run build
```

Output goes to `/dist` — deploy to any static host.

---

## Project Structure

```
src/
  components/       # UI components (Nav, ChatPane, NamesPanel, etc.)
  context/          # React context (ThemeContext, SessionContext)
  hooks/            # Custom hooks (usePlayback)
  lib/              # Core logic
    parser.js       # mIRC log parser with format auto-detection
    mergelogs.js    # Multi-file sort and merge utilities
    exportHtml.js   # Stats HTML export generator
    exportSession.js # Session JSON save/load
  pages/            # Route-level page components
  workers/          # Web Workers
    parseWorker.js  # Parses and merges log files off the main thread
    statsWorker.js  # Computes all stats off the main thread
public/
  ircreplay-demo.log  # Demo log file (loads with one click on the drop zone)
  _headers            # Cloudflare security headers
```

---

## Contributing

Contributions are welcome — especially new log format parsers. Here is how to get involved:

### Adding a New Log Format Parser

The parser lives in `src/lib/parser.js`. The architecture is designed to make new formats straightforward to add:

1. Add a new format identifier to `detectFormat()` — this function inspects the first 30 lines of a file and returns the format name
2. Write a `parseLineYourFormat()` function — takes a raw line string, returns a structured event object
3. Call your parser from `parseLog()` via the format router
4. Add your format to the compatibility table in `src/pages/Help.jsx`

The event object shape all parsers must return:

```js
{
  type:      string,   // 'message'|'action'|'join'|'quit'|'part'|'nick'|'mode'|'kick'|'topic'|'notice'|'system'|'session'
  timestamp: string,   // 'HH:MM' or null
  nick:      string,   // nick involved, or null
  text:      string,   // clean plain text (control codes stripped)
  rawText:   string,   // text with colour codes intact (for viewer rendering)
  colour:    number,   // mIRC colour index 0-15, or null
  hostmask:  string,   // user@host if present, or null
  extra:     object,   // type-specific data (newNick, modeString, reason etc.)
  raw:       string,   // original unmodified line
}
```

The shared `parseSystemBody()` function handles `***` event lines which are consistent across most IRC clients — reuse it and you only need to handle message and timestamp format differences.

### Have a log file from an unsupported client?

The best way to help is to send a sample (a few hundred lines, personal details edited out if needed) to **help@ircreplay.app** and we will build the parser and credit you. Alternatively open an issue or discussion on GitHub with the sample attached.

### General Contributions

- Bug reports via GitHub Issues are very welcome
- Feature suggestions via GitHub Discussions
- PRs against `main` — please keep them focused, one feature or fix per PR

---

## Inspiration & Credits

IRCReplay was directly inspired by **[mIRCStats](https://storage.googleapis.com/mircstats/index.html)** by Mikko "Ave" Auvinen — the definitive IRC stats generator for the best part of two decades. Development has been discontinued but Ave generously released it with a full open license. If you ran a channel in the early 2000s you almost certainly used it.

Thanks to **[Scriptserv](https://scriptserv.com)** (sorzkode) for being the first to link to IRCReplay and for the feedback that shaped the early releases.

Built by **[Gary Thwaites](https://garythwaites.com)** with a lot of help from Claude (Anthropic).

---

## Support

If IRCReplay brought back some good memories and you want to keep the lights on:

[![Ko-fi](https://img.shields.io/badge/Ko--fi-FF5E5B?style=flat&logo=ko-fi&logoColor=white)](https://ko-fi.com/baggins83)
[![PayPal](https://img.shields.io/badge/PayPal-0070BA?style=flat&logo=paypal&logoColor=white)](https://www.paypal.com/paypalme/garyt83)

---

## License

MIT — do what you like with it, just don't claim you built it from scratch.

---

*Built with nostalgia somewhere in the South of England.*

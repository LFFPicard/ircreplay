function Help() {
  const faqs = [
    {
      q: 'My log file loads but some lines show incorrectly — what is happening?',
      a: 'This usually means your mIRC was using a custom script that changed the log format slightly. Send us a sample (a few hundred lines is enough — you can edit out anything personal) and we will update the parser to handle it.',
    },
    {
      q: 'Can I upload logs from a client other than mIRC?',
      a: 'Not yet reliably. irssi, XChat, HexChat, ZNC bouncers and others all use slightly different formats. We are building support for these — if you have logs from another client, send us a sample and we will prioritise it.',
    },
    {
      q: 'My log files are huge — will IRCReplay handle them?',
      a: 'Yes. IRCReplay uses Web Workers to parse in a background thread so the browser never freezes, and virtual scrolling so only visible lines are rendered. We have tested with 136,000 messages across 11 merged files without issues.',
    },
    {
      q: 'Can I load multiple log files at once?',
      a: 'Yes — select or drop multiple .log files at the same time. IRCReplay detects dates in filenames like #channel.YYYYMMDD.log and merges them in chronological order automatically. The most recent file without a date stamp is always placed last.',
    },
    {
      q: 'What is a Session JSON file?',
      a: 'Once your logs are loaded, clicking Save Session in the nav downloads a .json file of the parsed session. Next time you want to view the same logs, drop the .json onto the drop zone and it restores instantly — no need to re-upload the original log files.',
    },
    {
      q: 'Are my log files uploaded to a server?',
      a: 'No. Everything is processed entirely in your browser. Your log files never leave your device and are never transmitted anywhere. Closing the tab clears everything.',
    },
    {
      q: 'The stats page says I have hundreds of aliases — that seems wrong.',
      a: 'Alias detection is based on nick change events within the same session. In large multi-year logs, the same nick may have been used by different people at different times, so aliases are shown as possibilities rather than certainties. They are informational only and stats are not merged between nicks.',
    },
    {
      q: 'The Classic theme font is not loading — everything looks like Courier New.',
      a: 'The Classic theme uses Fixedsys Excelsior loaded from a CDN. If you are offline or the CDN is unreachable, Courier New is used as a fallback. It looks very similar — Courier New was the standard monospace font of that era anyway.',
    },
    {
      q: 'Can I export my stats to share with people?',
      a: 'Yes — once stats have loaded, an Export button appears in the nav. Choose HTML for a self-contained interactive page anyone can open in a browser, or PDF to trigger your browser print dialog where you can save as a PDF file.',
    },
    {
      q: 'I found a bug or have a feature suggestion — how do I get in touch?',
      a: 'Email us at help@ircreplay.app — we genuinely read everything. If you have a parsing issue, attach a sample of the problematic log (a few hundred lines, personal details edited out) and we will investigate.',
    },
  ]

const supportedItems = [
    { label: 'mIRC default logging format',              dot: 'bg-green-500',  text: 'text-green-400',  slabel: 'Supported'   },
    { label: 'Multi-file upload with date-based merge',  dot: 'bg-green-500',  text: 'text-green-400',  slabel: 'Supported'   },
    { label: 'mIRC colour codes and control characters', dot: 'bg-green-500',  text: 'text-green-400',  slabel: 'Supported'   },
    { label: 'All standard IRC event types',             dot: 'bg-green-500',  text: 'text-green-400',  slabel: 'Supported'   },
    { label: 'UTF-8 encoded log files',                  dot: 'bg-green-500',  text: 'text-green-400',  slabel: 'Supported'   },
    { label: 'Session save and restore via JSON',        dot: 'bg-green-500',  text: 'text-green-400',  slabel: 'Supported'   },
    { label: 'irssi log format',                         dot: 'bg-yellow-500', text: 'text-yellow-400', slabel: 'In Progress' },
    { label: 'XChat / HexChat log format',               dot: 'bg-yellow-500', text: 'text-yellow-400', slabel: 'In Progress' },
    { label: 'ZNC bouncer log format',                   dot: 'bg-yellow-500', text: 'text-yellow-400', slabel: 'In Progress' },
    { label: 'Textual log format',                       dot: 'bg-yellow-500', text: 'text-yellow-400', slabel: 'In Progress' },
    { label: 'Latin-1 / Windows-1252 encoded files',     dot: 'bg-yellow-500', text: 'text-yellow-400', slabel: 'In Progress' },
    { label: 'Very old mIRC formats (pre-2000)',          dot: 'bg-yellow-500', text: 'text-yellow-400', slabel: 'In Progress' },
  ]

  return (
    <div className="h-full overflow-y-auto">
      <div className="max-w-3xl mx-auto px-4 py-8 space-y-10">

        <div className="space-y-2">
          <h1 className="text-3xl font-bold text-green-400 font-mono">Help &amp; FAQ</h1>
          <p className="text-gray-400 font-mono text-sm">What IRCReplay supports and how to get help</p>
          <div className="h-px bg-gray-700 mt-4" />
        </div>

        <section className="space-y-4">
          <h2 className="text-gray-300 font-semibold text-lg font-mono">*** Log Format Compatibility</h2>
          <p className="text-gray-400 leading-relaxed">
            IRCReplay is built and tested primarily against mIRC default logging format.
            Support for other clients is actively being added &mdash; if your client is
            listed as In Progress and you want to help, send us a sample log.
          </p>
          <div className="bg-gray-800 rounded-lg p-4 space-y-2">
            {supportedItems.map((item) => (
              <div key={item.label} className="flex items-center justify-between gap-4">
                <span className="text-gray-300 text-sm">{item.label}</span>
                <div className="flex items-center gap-1.5 shrink-0">
                  <div className={`w-2 h-2 rounded-full ${item.dot}`} />
                  <span className={`text-xs font-mono ${item.text}`}>{item.slabel}</span>
                </div>
              </div>
            ))}
          </div>
        </section>

        <div className="flex items-center gap-3">
          <div className="h-px flex-1 bg-gray-700" />
          <span className="text-gray-600 font-mono text-xs">*** help #ircreplay</span>
          <div className="h-px flex-1 bg-gray-700" />
        </div>

        <section className="space-y-6">
          <h2 className="text-gray-300 font-semibold text-lg font-mono">*** Frequently Asked Questions</h2>
          {faqs.map((faq, i) => (
            <div key={i} className="space-y-2">
              <p className="text-gray-200 font-semibold text-sm">{faq.q}</p>
              <p className="text-gray-400 text-sm leading-relaxed pl-3 border-l border-gray-700">{faq.a}</p>
            </div>
          ))}
        </section>

        <div className="flex items-center gap-3">
          <div className="h-px flex-1 bg-gray-700" />
          <span className="text-gray-600 font-mono text-xs">*** sending help request</span>
          <div className="h-px flex-1 bg-gray-700" />
        </div>

        <section className="space-y-4">
          <h2 className="text-gray-300 font-semibold text-lg font-mono">*** Get in Touch</h2>
          <p className="text-gray-400 leading-relaxed">
            Found a bug? Logs not parsing correctly? Want to request support for a specific
            IRC client? We genuinely want to hear from you &mdash; every report helps make
            IRCReplay better for everyone.
          </p>
          <div className="bg-gray-800 rounded-lg p-4 space-y-3">
            <div className="flex items-start gap-3">
              <span className="text-green-400 font-mono shrink-0">+</span>
              <div>
                <p className="text-gray-300 text-sm font-semibold">Parsing issues</p>
                <p className="text-gray-500 text-xs mt-0.5">Send a sample of the problematic log (a few hundred lines &mdash; edit out anything personal) and describe what is going wrong</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <span className="text-green-400 font-mono shrink-0">+</span>
              <div>
                <p className="text-gray-300 text-sm font-semibold">New client support</p>
                <p className="text-gray-500 text-xs mt-0.5">Send a sample log from your IRC client and we will build a parser for it</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <span className="text-green-400 font-mono shrink-0">+</span>
              <div>
                <p className="text-gray-300 text-sm font-semibold">Feature suggestions</p>
                <p className="text-gray-500 text-xs mt-0.5">Always welcome &mdash; no promises but everything gets read</p>
              </div>
            </div>
          </div>
          <a href="mailto:help@ircreplay.app" className="inline-flex items-center gap-2 bg-green-500 hover:bg-green-400 text-black text-sm font-semibold px-4 py-2 rounded-lg transition-colors">help@ircreplay.app</a>
        </section>

        <div className="border-t border-gray-700 pt-6">
          <p className="text-gray-600 font-mono text-xs text-center">
            &copy; 2026 IRCReplay.app &mdash; Built with nostalgia somewhere in the South of England
          </p>
        </div>

      </div>
    </div>
  )
}

export default Help
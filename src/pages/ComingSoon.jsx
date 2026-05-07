import { useState } from 'react'

const FEATURES = [
  {
    icon: '☁️',
    title: 'Cloud Log Storage',
    desc: 'Save your parsed sessions to the cloud and access them from any device. No more keeping track of local JSON files.',
    tier: 'Pro',
  },
  {
    icon: '🔗',
    title: 'Branded Share Links',
    desc: 'Share your channel stats with a permanent link — ircreplay.app/s/yournick/channelname. Anyone can view, no login needed.',
    tier: 'Pro',
  },
  {
    icon: '📊',
    title: 'Extended Stats',
    desc: 'Richer visualisations — activity heatmaps, word clouds, nick activity over time, relationship maps between users.',
    tier: 'Pro',
  },
  {
    icon: '📄',
    title: 'PDF & Image Export',
    desc: 'Export your stats as a polished PDF or PNG image — perfect for sharing on social media or keeping as a memento.',
    tier: 'Pro',
  },
  {
    icon: '📁',
    title: 'Multi-Session Dashboard',
    desc: 'Save and manage multiple channel sessions. Switch between them instantly without re-uploading.',
    tier: 'Pro',
  },
  {
    icon: '🚀',
    title: 'Lifetime Deal',
    desc: 'First 100 customers get lifetime access to all Pro features for a one-time payment. No subscription, no recurring fees.',
    tier: 'LTD',
  },
]

function ComingSoon() {
  const [email,    setEmail   ] = useState('')
  const [status,   setStatus  ] = useState(null)  // null | 'loading' | 'success' | 'exists' | 'error'
  const [errorMsg, setErrorMsg] = useState('')

  const handleSubmit = async () => {
    if (!email.trim()) return
    setStatus('loading')
    setErrorMsg('')

    try {
      const res  = await fetch('/api/waitlist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim() }),
      })
      const data = await res.json()

      if (data.success) {
        setStatus(data.alreadySubscribed ? 'exists' : 'success')
      } else {
        setStatus('error')
        setErrorMsg(data.error || 'Something went wrong')
      }
    } catch {
      setStatus('error')
      setErrorMsg('Could not connect — please try again')
    }
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') handleSubmit()
  }

  const tierStyle = {
    Pro:  'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30',
    LTD:  'bg-green-500/20 text-green-400 border border-green-500/30',
  }

  return (
    <div className="h-full overflow-y-auto">
      <div className="max-w-3xl mx-auto px-4 py-8 space-y-10">

        {/* Header */}
        <div className="space-y-3 text-center">
          <div className="inline-flex items-center gap-2 bg-yellow-500/20 border border-yellow-500/30 text-yellow-400 text-xs font-mono px-3 py-1 rounded-full">
            ⚡ Coming Soon
          </div>
          <h1 className="text-3xl font-bold text-white font-mono">IRCReplay Pro</h1>
          <p className="text-gray-400 leading-relaxed max-w-xl mx-auto">
            IRCReplay will always be free for personal use. Pro adds cloud storage,
            share links and richer stats for the people who want more.
          </p>
          <div className="h-px bg-gray-700 mt-4" />
        </div>

        {/* Feature grid */}
        <section className="space-y-4">
          <h2 className="text-gray-300 font-semibold text-lg font-mono">*** What is coming</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {FEATURES.map((f) => (
              <div key={f.title} className="bg-gray-800 rounded-lg p-4 space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="text-xl">{f.icon}</span>
                    <h3 className="text-gray-200 font-semibold text-sm">{f.title}</h3>
                  </div>
                  <span className={`text-xs font-mono px-2 py-0.5 rounded-full shrink-0 ${tierStyle[f.tier]}`}>
                    {f.tier}
                  </span>
                </div>
                <p className="text-gray-400 text-sm leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Divider */}
        <div className="flex items-center gap-3">
          <div className="h-px flex-1 bg-gray-700" />
          <span className="text-gray-600 font-mono text-xs">*** join the waitlist</span>
          <div className="h-px flex-1 bg-gray-700" />
        </div>

        {/* Email signup */}
        <section className="space-y-4">
          <h2 className="text-gray-300 font-semibold text-lg font-mono">*** Get notified</h2>
          <p className="text-gray-400 leading-relaxed">
            Drop your email below and we will let you know when Pro launches —
            including first access to the lifetime deal for early supporters.
            No spam, no marketing nonsense. One email when it is ready.
          </p>

          {status === 'success' && (
            <div className="bg-green-900/30 border border-green-500/30 rounded-lg p-4">
              <p className="text-green-400 font-mono text-sm">✓ You are on the list! We will be in touch when Pro launches.</p>
            </div>
          )}

          {status === 'exists' && (
            <div className="bg-yellow-900/30 border border-yellow-500/30 rounded-lg p-4">
              <p className="text-yellow-400 font-mono text-sm">✓ You are already on the list — we have not forgotten you!</p>
            </div>
          )}

          {status !== 'success' && status !== 'exists' && (
            <div className="flex gap-2 flex-wrap">
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="your@email.com"
                className="flex-1 min-w-0 bg-gray-800 border border-gray-600 focus:border-yellow-500 rounded-lg px-4 py-2 text-white text-sm font-mono outline-none transition-colors placeholder-gray-600"
              />
              <button
                onClick={handleSubmit}
                disabled={status === 'loading' || !email.trim()}
                className="bg-yellow-500 hover:bg-yellow-400 disabled:opacity-50 disabled:cursor-not-allowed text-black text-sm font-semibold px-6 py-2 rounded-lg transition-colors whitespace-nowrap"
              >
                {status === 'loading' ? 'Sending...' : 'Notify me'}
              </button>
            </div>
          )}

          {status === 'error' && (
            <p className="text-red-400 text-xs font-mono">{errorMsg}</p>
          )}

          <p className="text-gray-600 text-xs">
            Your email is only used to notify you about the Pro launch.
            Unsubscribe any time.
          </p>
        </section>

        {/* Pricing preview */}
        <section className="space-y-4">
          <h2 className="text-gray-300 font-semibold text-lg font-mono">*** Pricing</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[
              { tier: 'Free',     price: '£0',        period: 'forever',   desc: 'Full viewer, stats and export. Always free.', highlight: false },
              { tier: 'Pro',      price: '£3.49',     period: 'per month', desc: 'Cloud storage, share links, extended stats, PDF export.', highlight: true },
              { tier: 'Lifetime', price: '£49.99',    period: 'one-time',  desc: 'First 100 customers only. Everything in Pro, forever.', highlight: false },
            ].map((p) => (
              <div key={p.tier} className={`rounded-lg p-4 space-y-2 ${p.highlight ? 'bg-yellow-500/10 border border-yellow-500/30' : 'bg-gray-800'}`}>
                <div className="flex items-baseline justify-between">
                  <h3 className={`font-mono font-bold ${p.highlight ? 'text-yellow-400' : 'text-gray-300'}`}>{p.tier}</h3>
                  <span className="text-gray-500 text-xs">{p.period}</span>
                </div>
                <div className={`font-mono text-2xl font-bold ${p.highlight ? 'text-yellow-400' : 'text-white'}`}>{p.price}</div>
                <p className="text-gray-400 text-xs leading-relaxed">{p.desc}</p>
              </div>
            ))}
          </div>
          <p className="text-gray-600 text-xs">Annual plan coming at launch (~28% saving). Prices subject to change before launch.</p>
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

export default ComingSoon
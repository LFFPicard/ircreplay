import { useAuth } from '@clerk/react'

const PLANS = [
  {
    id:        'free',
    name:      'Free',
    price:     '£0',
    period:    'forever',
    highlight: false,
    badge:     null,
    badgeClass: 'bg-green-500 text-black',
    priceId:   null,
    features: [
      'Full IRC log viewer',
      'Instant and Replay modes',
      'Multi-file merge',
      'Stats engine',
      'HTML and PDF export',
      'Session JSON save/load',
      'Three themes including Classic',
      'Your logs never leave your device',
    ],
    cta:      'Start for free',
    ctaStyle: 'border',
  },
  {
    id:        'monthly',
    name:      'Pro',
    price:     '£3.49',
    period:    'per month',
    highlight: true,
    badge:     'Most popular',
    badgeClass: 'bg-green-500 text-black',
    priceId:   import.meta.env.VITE_PADDLE_PRICE_MONTHLY,
    features: [
      'Everything in Free',
      'Cloud log storage — 50 sessions',
      'Branded share links',
      'Extended stats and visualisations',
      'PDF and image export',
      'Priority support',
      'All future Pro features',
    ],
    cta:      'Get Pro Monthly',
    ctaStyle: 'primary',
  },
  {
    id:        'annual',
    name:      'Pro Annual',
    price:     '£29.99',
    period:    'per year',
    highlight: false,
    badge:     'Save 28%',
    badgeClass: 'bg-blue-500 text-white',
    priceId:   import.meta.env.VITE_PADDLE_PRICE_ANNUAL,
    features: [
      'Everything in Pro Monthly',
      'Two months free vs monthly',
      'Cloud log storage — 50 sessions',
      'Branded share links',
      'Extended stats and visualisations',
      'PDF and image export',
      'Priority support',
    ],
    cta:      'Get Pro Annual',
    ctaStyle: 'secondary',
  },
  {
    id:        'ltd',
    name:      'Lifetime',
    price:     '£49.99',
    period:    'one-time',
    highlight: false,
    badge:     'First 100 only',
    badgeClass: 'bg-yellow-500 text-black',
    priceId:   import.meta.env.VITE_PADDLE_PRICE_LTD,
    features: [
      'Everything in Pro, forever',
      'No recurring fees ever',
      'All future features included',
      'Cloud log storage — unlimited',
      'Branded share links',
      'Extended stats and visualisations',
      'Founding supporter status',
    ],
    cta:      'Get Lifetime Access',
    ctaStyle: 'ltd',
  },
]

const CTA_CLASSES = {
  primary:   'bg-green-500 hover:bg-green-400 text-black font-bold',
  secondary: 'bg-gray-700 hover:bg-gray-600 text-white font-semibold',
  border:    'border border-gray-600 hover:border-gray-400 text-gray-300 font-semibold',
  ltd:       'bg-yellow-500 hover:bg-yellow-400 text-black font-bold',
}

const FAQS = [
  { q: 'Will the free tier always exist?',         a: 'Yes, absolutely. The core viewer, stats and export will always be free. Pro is for people who want cloud storage and sharing features on top of that.' },
  { q: 'What happens to my data if I cancel?',     a: 'Your cloud-stored sessions are kept for 30 days after cancellation. You can download them as JSON files at any time before then.' },
  { q: 'Is the lifetime deal really lifetime?',    a: 'Yes — one payment, all Pro features forever, including everything added in future. Limited to the first 100 customers.' },
  { q: 'Do my logs get stored on your servers?',   a: 'Free tier — never. Pro tier — only if you explicitly save a session to the cloud. You are always in control.' },
  { q: 'What payment methods are accepted?',       a: 'All major credit and debit cards via Paddle. They handle VAT automatically so you always see the final price.' },
  { q: 'Can I switch between monthly and annual?', a: 'Yes — you can upgrade from monthly to annual at any time and get a prorated credit for the remaining monthly period.' },
]

function PlanCard({ plan }) {
  const { userId } = useAuth()
  const isHighlight   = plan.highlight
  const priceColour   = plan.id === 'ltd' ? 'text-yellow-400' : isHighlight ? 'text-green-400' : 'text-white'
  const borderClass   = isHighlight ? 'bg-green-500/10 border-2 border-green-500/50' : 'bg-gray-800 border border-gray-700'
  const checkColour   = isHighlight ? 'text-green-400' : 'text-gray-500'
  const headingColour = isHighlight ? 'text-green-400' : 'text-gray-200'

  const handleCheckout = () => {
    if (!plan.priceId) {
      window.location.href = '/'
      return
    }
    if (!window.Paddle) {
      console.error('Paddle.js not loaded')
      return
    }
    // TODO: Remove this line when going live — sandbox only
    window.Paddle.Environment.set('sandbox')
    window.Paddle.Initialize({
      token: import.meta.env.VITE_PADDLE_CLIENT_TOKEN,
    })
    window.Paddle.Checkout.open({
      items: [{ priceId: plan.priceId, quantity: 1 }],
      customData: { clerk_user_id: userId || null },
    })
  }

  return (
    <div className={`relative flex flex-col rounded-xl p-6 space-y-4 ${borderClass}`}>
      {plan.badge && (
        <div className={`absolute -top-3 left-1/2 -translate-x-1/2 text-xs font-bold px-3 py-1 rounded-full whitespace-nowrap ${plan.badgeClass}`}>{plan.badge}</div>
      )}
      <div>
        <h3 className={`font-mono font-bold text-lg ${headingColour}`}>{plan.name}</h3>
        <div className="flex items-baseline gap-2 mt-1">
          <span className={`font-mono text-3xl font-bold ${priceColour}`}>{plan.price}</span>
          <span className="text-gray-500 text-sm">{plan.period}</span>
        </div>
      </div>
      <ul className="space-y-2 flex-1">
        {plan.features.map((f) => (
          <li key={f} className="flex items-start gap-2 text-sm">
            <span className={`shrink-0 mt-0.5 ${checkColour}`}>&#10003;</span>
            <span className="text-gray-300">{f}</span>
          </li>
        ))}
      </ul>
      <button onClick={handleCheckout} className={`w-full py-2.5 rounded-lg text-sm transition-colors ${CTA_CLASSES[plan.ctaStyle]}`}>{plan.cta}</button>
    </div>
  )
}

function Pricing() {
  return (
    <div className="h-full overflow-y-auto">
      <div className="max-w-5xl mx-auto px-4 py-8 space-y-10">

        <div className="text-center space-y-3">
          <div className="inline-flex items-center gap-2 bg-yellow-500/20 border border-yellow-500/30 text-yellow-400 text-xs font-mono px-3 py-1 rounded-full">&#9889; Pro &mdash; Coming Soon</div>
          <h1 className="text-3xl font-bold text-white font-mono">Simple, honest pricing</h1>
          <p className="text-gray-400 max-w-xl mx-auto leading-relaxed">IRCReplay is free forever. Pro adds cloud storage, share links and richer stats for the people who want more. No dark patterns, no surprise charges.</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 pt-4">
          {PLANS.map((plan) => (
            <PlanCard key={plan.id} plan={plan} />
          ))}
        </div>

        <div className="flex items-center gap-3">
          <div className="h-px flex-1 bg-gray-700" />
          <span className="text-gray-600 font-mono text-xs">*** frequently asked</span>
          <div className="h-px flex-1 bg-gray-700" />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {FAQS.map((faq) => (
            <div key={faq.q} className="space-y-1">
              <p className="text-gray-200 font-semibold text-sm">{faq.q}</p>
              <p className="text-gray-400 text-sm leading-relaxed pl-3 border-l border-gray-700">{faq.a}</p>
            </div>
          ))}
        </div>

        <div className="bg-gray-800 rounded-xl p-6 text-center space-y-3">
          <p className="text-gray-300 font-semibold">Not sure yet?</p>
          <p className="text-gray-400 text-sm">Join the waitlist and get notified when Pro launches &mdash; including first access to the lifetime deal.</p>
          <a href="/pro" className="inline-flex items-center gap-2 bg-yellow-500 hover:bg-yellow-400 text-black text-sm font-bold px-6 py-2.5 rounded-lg transition-colors">&#9889; Join the waitlist</a>
        </div>

        <div className="border-t border-gray-700 pt-6">
          <p className="text-gray-600 font-mono text-xs text-center">&copy; 2026 IRCReplay.app &mdash; Payments handled securely by Paddle</p>
        </div>

      </div>
    </div>
  )
}

export default Pricing
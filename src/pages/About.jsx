function About() {
  const features = [
    { title: 'Upload your .log files',     desc: 'Single files or entire multi-year collections at once' },
    { title: 'Read them like you remember',desc: 'Instant view or real-time replay with authentic mIRC styling' },
    { title: 'Generate stats',             desc: 'Top chatters, activity charts, word frequency, URLs and more' },
    { title: 'Export and share',           desc: 'Self-contained HTML stats pages you can send to old channel mates' },
    { title: 'Three themes',               desc: 'Dark, Light, or the full Classic mIRC chrome experience' },
  ]

  return (
    <div className="h-full overflow-y-auto">
      <div className="max-w-3xl mx-auto px-4 py-8 space-y-10">

        <div className="space-y-2">
          <h1 className="text-3xl font-bold text-green-400 font-mono">About IRCReplay</h1>
          <p className="text-gray-400 font-mono text-sm">A love letter to the golden age of IRC</p>
          <div className="h-px bg-gray-700 mt-4" />
        </div>

        <section className="space-y-4">
          <h2 className="text-gray-300 font-semibold text-lg font-mono">*** The Story</h2>
          <p className="text-gray-400 leading-relaxed">
            Born in 1983, right on the cusp of the generation that grew up watching the internet
            go from nothing to everything. By the time the late 90s rolled around, IRC was where
            life happened after school &mdash; a wild, unfiltered, impossibly social place where
            you could be talking to someone in Finland at 2am about nothing in particular and it
            felt like the most important conversation in the world.
          </p>
          <p className="text-gray-400 leading-relaxed">
            The IRC story started with a browser-based space strategy game called{' '}
            <a href="https://www.planetarion.com" target="_blank" rel="noopener noreferrer" className="text-green-400 hover:text-green-300 transition-colors">
              Planetarion
            </a>
            {' '}&mdash; which was absolutely enormous in its heyday and still runs today.
            The game had its own IRC channels, and before long that meant not just playing
            but helping run the place as a channel operator. From there it spread &mdash;
            more channels, more networks, more late nights.
          </p>
          <p className="text-gray-400 leading-relaxed">
            One of those channels is where a friendship began that has lasted almost 25 years.
            Two people who met over a shared love of a game, who have since worked their way
            through pretty much every MMO ever released side by side, and still game and talk
            regularly to this day. That friendship started in a text window with a blinking cursor.
          </p>
          <p className="text-gray-400 leading-relaxed">
            Being a natural hoarder, about 90% of those original mIRC logs survived &mdash;
            hundreds of thousands of lines of conversations, jokes, arguments, late nights and
            memories sitting in a folder on a hard drive. IRCReplay started as a personal tool
            to actually read them again, and turned into something worth sharing.
          </p>
        </section>

        <div className="flex items-center gap-3">
          <div className="h-px flex-1 bg-gray-700" />
          <span className="text-gray-600 font-mono text-xs">*** join #ircreplay</span>
          <div className="h-px flex-1 bg-gray-700" />
        </div>

        <section className="space-y-4">
          <h2 className="text-gray-300 font-semibold text-lg font-mono">*** What is IRCReplay?</h2>
          <p className="text-gray-400 leading-relaxed">
            IRCReplay is a browser-based log viewer and stats generator for IRC log files &mdash;
            the spiritual successor to mIRCStats. It runs entirely in your browser on any device
            with no installation required.
          </p>
          <div className="bg-gray-800 rounded-lg p-4 space-y-2">
            {features.map((f) => (
              <div key={f.title} className="flex gap-3 text-sm">
                <span className="text-green-400 font-mono shrink-0">+</span>
                <div>
                  <span className="text-gray-300 font-semibold">{f.title}</span>
                  <span className="text-gray-500"> &mdash; {f.desc}</span>
                </div>
              </div>
            ))}
          </div>
          <p className="text-gray-400 leading-relaxed">
            Everything processes entirely in your browser. Your log files never leave your
            device &mdash; they are never uploaded to any server, stored anywhere, or seen
            by anyone but you.
          </p>
        </section>

        <div className="flex items-center gap-3">
          <div className="h-px flex-1 bg-gray-700" />
          <span className="text-gray-600 font-mono text-xs">*** topic set by LFFPicard</span>
          <div className="h-px flex-1 bg-gray-700" />
        </div>

        <section className="space-y-4">
          <h2 className="text-gray-300 font-semibold text-lg font-mono">*** Standing on the shoulders of giants</h2>
          <p className="text-gray-400 leading-relaxed">
            IRCReplay was directly inspired by{' '}
            <a href="https://storage.googleapis.com/mircstats/index.html" target="_blank" rel="noopener noreferrer" className="text-green-400 hover:text-green-300 transition-colors">
              mIRCStats
            </a>
            {' '}by Mikko &ldquo;Ave&rdquo; Auvinen &mdash; the definitive IRC stats generator
            for the best part of two decades. If you ran a channel in the early 2000s, you almost
            certainly used it. Development has been discontinued but Ave was kind enough to release
            it with a full open license &mdash; a generous final gift to the community it served
            so well for so long.
          </p>
        </section>

        <div className="flex items-center gap-3">
          <div className="h-px flex-1 bg-gray-700" />
          <span className="text-gray-600 font-mono text-xs">*** Connecting...</span>
          <div className="h-px flex-1 bg-gray-700" />
        </div>

        <section className="space-y-4">
          <h2 className="text-gray-300 font-semibold text-lg font-mono">*** Keep the lights on</h2>
          <p className="text-gray-400 leading-relaxed">
            IRCReplay is free and always will be. If it brought back some good memories and you
            feel like buying the developer a coffee, it is genuinely appreciated and goes straight
            towards keeping the domain running and future development.
          </p>
          <div className="flex gap-3 flex-wrap">
            <a href="https://ko-fi.com/baggins83" target="_blank" rel="noopener noreferrer" style={{ backgroundColor: '#FF5E5B' }} className="hover:opacity-90 text-white text-sm font-semibold px-4 py-2 rounded-lg transition-opacity">
              Ko-fi
            </a>
            <a href="https://www.paypal.com/paypalme/garyt83" target="_blank" rel="noopener noreferrer" style={{ backgroundColor: '#0070BA' }} className="hover:opacity-90 text-white text-sm font-semibold px-4 py-2 rounded-lg transition-opacity">
              PayPal
            </a>
          </div>
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

export default About
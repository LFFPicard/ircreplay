function Links() {
  const sections = [
    {
      heading: '*** IRC Archives & Community',
      links: [
        {
          name: 'Scriptserv',
          url: 'https://scriptserv.com',
          author: 'sorzkode',
          authorUrl: 'https://github.com/sorzkode',
          desc: 'A comprehensive preservation project dedicated to collecting, documenting and archiving mIRC scripts. If you lived through the golden age of mIRC scripting this is an essential bookmark — and the site that first linked to IRCReplay.',
        },
      ],
    },
    {
      heading: '*** Tools That Inspired IRCReplay',
      links: [
        {
          name: 'mIRC',
          url: 'https://www.mirc.co.uk',
          author: null,
          authorUrl: null,
          desc: 'The IRC client that defined a generation. If you have logs to load into IRCReplay there is a good chance mIRC made them. Still actively developed after nearly 30 years.',
        },
        {
          name: 'mIRCStats',
          url: 'https://storage.googleapis.com/mircstats/index.html',
          author: "Mikko 'Ave' Auvinen",
          authorUrl: null,
          desc: 'The original IRC channel stats generator that IRCReplay was directly inspired by. Discontinued and Windows-only but Ave generously released it with a full open license. If you used IRC in the early 2000s you almost certainly ran mIRCStats.',
        },
      ],
    },
    {
      heading: '*** Built By',
      links: [
        {
          name: 'Gary Thwaites',
          url: 'https://garythwaites.com',
          author: null,
          authorUrl: null,
          desc: 'IRCReplay was designed and built by Gary — a ramp operative by day, developer and creative by night, based in the South of England. Grew up in the IRC era starting with Planetarion and never quite got over it. Also working on a TV script, a Unity bike courier game called Messenger, and a fantasy short story collection.',
        },
        {
          name: 'Claude by Anthropic',
          url: 'https://claude.ai',
          author: 'Anthropic',
          authorUrl: 'https://anthropic.com',
          desc: "IRCReplay was built collaboratively with Claude — Anthropic's AI assistant. Every component, parser, worker and theme was written through a genuine back-and-forth process. Gary brought the ideas, the IRC knowledge, the real-world testing, and the judgment calls. Claude brought the code. It was a proper team effort.",
        },
      ],
    },
  ]

  return (
    <div className="h-full overflow-y-auto">
      <div className="max-w-3xl mx-auto px-4 py-8 space-y-10">

        <div className="space-y-2">
          <h1 className="text-3xl font-bold text-green-400 font-mono">Links</h1>
          <p className="text-gray-400 font-mono text-sm">Sites worth visiting and credits</p>
          <div className="h-px bg-gray-700 mt-4" />
        </div>

        {sections.map((section) => (
          <section key={section.heading} className="space-y-4">
            <h2 className="text-gray-300 font-semibold text-lg font-mono">{section.heading}</h2>
            <div className="space-y-4">
              {section.links.map((link) => (
                <div key={link.name} className="bg-gray-800 rounded-lg p-4 space-y-2">
                  <div className="flex items-start justify-between gap-4 flex-wrap">
                    <a href={link.url} target="_blank" rel="noopener noreferrer" className="text-green-400 hover:text-green-300 font-semibold font-mono transition-colors">
                      {link.name}
                    </a>
                    {link.author && (
                      link.authorUrl
                        ? <a href={link.authorUrl} target="_blank" rel="noopener noreferrer" className="text-gray-500 text-xs hover:text-gray-400 transition-colors">{link.author}</a>
                        : <span className="text-gray-500 text-xs">{link.author}</span>
                    )}
                  </div>
                  <p className="text-gray-400 text-sm leading-relaxed">{link.desc}</p>
                  <a href={link.url} target="_blank" rel="noopener noreferrer" className="text-gray-600 text-xs hover:text-gray-500 transition-colors font-mono">{link.url}</a>
                </div>
              ))}
            </div>
          </section>
        ))}

        <div className="flex items-center gap-3">
          <div className="h-px flex-1 bg-gray-700" />
          <span className="text-gray-600 font-mono text-xs">*** links updated</span>
          <div className="h-px flex-1 bg-gray-700" />
        </div>

        <div className="bg-gray-800 rounded-lg p-4">
          <p className="text-gray-400 text-sm leading-relaxed">
            Know a site that belongs here? Running an IRC archive or preservation project?
            Get in touch at{' '}
            <a href="mailto:help@ircreplay.app" className="text-green-400 hover:text-green-300 transition-colors">
              help@ircreplay.app
            </a>
            {' '}and we will take a look.
          </p>
        </div>

        <div className="border-t border-gray-700 pt-6">
          <p className="text-gray-600 font-mono text-xs text-center">
            &copy; 2026 IRCReplay.app &mdash; Built with nostalgia somewhere in the South of England
          </p>
        </div>

      </div>
    </div>
  )
}

export default Links
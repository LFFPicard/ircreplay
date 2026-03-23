import { useState, useEffect, useRef, Fragment } from 'react'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts'
import { useSession } from '../context/SessionContext'
import StatsWorker from '../workers/statsWorker.js?worker'

const HOUR_COLORS = [
  '#6366f1','#6366f1','#6366f1','#6366f1','#6366f1','#6366f1',
  '#f59e0b','#f59e0b','#f59e0b','#f59e0b','#f59e0b','#f59e0b',
  '#10b981','#10b981','#10b981','#10b981','#10b981','#10b981',
  '#3b82f6','#3b82f6','#3b82f6','#3b82f6','#3b82f6','#3b82f6',
]

function OverviewCard({ label, value }) {
  return (
    <div className="bg-gray-800 rounded-lg p-3 text-center">
      <div className="text-green-400 font-mono text-xl font-bold">{value}</div>
      <div className="text-gray-400 text-xs mt-1">{label}</div>
    </div>
  )
}

function OverviewCards({ summary }) {
  return (
    <div className="grid grid-cols-3 md:grid-cols-6 gap-3">
      <OverviewCard label="Messages"  value={summary.totalMessages.toLocaleString()} />
      <OverviewCard label="Chatters"  value={summary.uniqueChatters.toLocaleString()} />
      <OverviewCard label="Words"     value={summary.totalWords.toLocaleString()} />
      <OverviewCard label="URLs"      value={summary.totalUrls.toLocaleString()} />
      <OverviewCard label="Joins"     value={summary.totalJoins.toLocaleString()} />
      <OverviewCard label="Quits"     value={summary.totalQuits.toLocaleString()} />
    </div>
  )
}

function HourlyChart({ hourly }) {
  const data = hourly.map((count, hour) => ({ hour: String(hour), count }))
  return (
    <div className="bg-gray-800 rounded-lg p-4">
      <h3 className="text-gray-300 font-semibold mb-3">Activity by Hour</h3>
      <ResponsiveContainer width="100%" height={160}>
        <BarChart data={data} margin={{ top: 0, right: 0, bottom: 0, left: -20 }}>
          <XAxis dataKey="hour" tick={{ fill: '#6b7280', fontSize: 10 }} interval={2} />
          <YAxis tick={{ fill: '#6b7280', fontSize: 10 }} />
          <Tooltip
            contentStyle={{ backgroundColor: '#1f2937', border: '1px solid #374151', borderRadius: '6px' }}
            labelStyle={{ color: '#9ca3af' }}
            itemStyle={{ color: '#10b981' }}
            formatter={(v) => [v.toLocaleString(), 'messages']}
            labelFormatter={(h) => `${h}:00`}
          />
          <Bar dataKey="count" radius={[2, 2, 0, 0]}>
            {data.map((_, i) => <Cell key={i} fill={HOUR_COLORS[i]} />)}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
      <div className="flex gap-3 mt-2 justify-center flex-wrap">
        {[
          { label: 'Night 0-6',      color: '#6366f1' },
          { label: 'Morning 6-12',   color: '#f59e0b' },
          { label: 'Afternoon 12-18',color: '#10b981' },
          { label: 'Evening 18-24',  color: '#3b82f6' },
        ].map(l => (
          <div key={l.label} className="flex items-center gap-1">
            <div className="w-2 h-2 rounded-full" style={{ backgroundColor: l.color }} />
            <span className="text-gray-500 text-xs">{l.label}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

function TimeOfDay({ timeOfDay }) {
  const sections = [
    { key: 'nightcrawlers', label: 'Nightcrawlers', sub: '0-6'   },
    { key: 'morning',       label: 'Morning Birds', sub: '6-12'  },
    { key: 'afternoon',     label: 'Afternoon',     sub: '12-18' },
    { key: 'evening',       label: 'Evening',       sub: '18-24' },
  ]
  return (
    <div className="bg-gray-800 rounded-lg p-4">
      <h3 className="text-gray-300 font-semibold mb-3">Time of Day Champions</h3>
      <div className="grid grid-cols-2 gap-4">
        {sections.map(s => (
          <div key={s.key}>
            <div className="text-gray-400 text-xs font-semibold">{s.label}</div>
            <div className="text-gray-600 text-xs mb-2">Hours {s.sub}</div>
            {timeOfDay[s.key].length === 0
              ? <div className="text-gray-700 text-xs">No activity</div>
              : timeOfDay[s.key].map((n, i) => (
                <div key={n.nick} className="flex items-center justify-between text-xs mb-0.5">
                  <span className={`font-mono truncate ${i === 0 ? 'text-green-400' : 'text-gray-400'}`}>{n.nick}</span>
                  <span className="text-gray-600 ml-2 shrink-0">{n.count}</span>
                </div>
              ))
            }
          </div>
        ))}
      </div>
    </div>
  )
}

function SamplePanel({ label, samples }) {
  if (!samples || samples.length === 0) {
    return <div className="mb-3 text-gray-600 text-xs italic">No examples available</div>
  }
  return (
    <div className="mb-3 bg-gray-900 rounded p-3">
      <div className="text-gray-500 text-xs mb-2">{label} examples:</div>
      <div className="space-y-1">
        {samples.map((s, i) => (
          <div key={i} className="font-mono text-xs text-gray-300 italic">&ldquo;{s}&rdquo;</div>
        ))}
      </div>
    </div>
  )
}

function NickProfile({ chatter, onClose }) {
  const [showSamples, setShowSamples] = useState(null)

  const toggleSamples = (key) => setShowSamples(showSamples === key ? null : key)

  const hourlyData = chatter.hourly.map((count, hour) => ({ hour: String(hour), count }))

  const clickableStats = [
    { key: 'questions', label: 'Question ratio', value: `${chatter.questionRatio}%`, samples: chatter.questionSamples || [] },
    { key: 'caps',      label: 'CAPS ratio',     value: `${chatter.capsRatio}%`,     samples: chatter.capsSamples     || [] },
    { key: 'actions',   label: 'Actions (/me)',  value: chatter.actionCount,          samples: chatter.actionSamples   || [] },
  ]

  return (
    <div className="bg-gray-900 border border-green-500/30 rounded-lg p-4 mt-1">

      <div className="flex items-center justify-between mb-3">
        <h3 className="text-green-400 font-mono font-bold text-lg">{chatter.nick}</h3>
        <button onClick={onClose} className="text-gray-500 hover:text-white text-xs transition-colors">close ✕</button>
      </div>

      {/* Static stats */}
      <div className="grid grid-cols-4 gap-2 mb-2">
        {[
          { label: 'Lines',          value: chatter.lines.toLocaleString() },
          { label: 'Words',          value: chatter.words.toLocaleString() },
          { label: 'Avg words/line', value: chatter.avgWords },
          { label: 'Short lines',    value: chatter.shortLines.toLocaleString() },
        ].map(s => (
          <div key={s.label} className="bg-gray-800 rounded p-2">
            <div className="text-white font-mono text-sm font-bold">{s.value}</div>
            <div className="text-gray-500 text-xs">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Clickable stats */}
      <div className="grid grid-cols-3 gap-2 mb-3">
        {clickableStats.map(s => (
          <div
            key={s.key}
            onClick={() => toggleSamples(s.key)}
            className={`rounded p-2 cursor-pointer transition-colors border ${
              showSamples === s.key
                ? 'bg-gray-700 border-green-500/50'
                : 'bg-gray-800 border-transparent hover:border-green-500/30 hover:bg-gray-700'
            }`}
          >
            <div className="text-white font-mono text-sm font-bold">{s.value}</div>
            <div className="text-gray-500 text-xs">{s.label}</div>
            <div className="text-green-600 text-xs mt-0.5">
              {showSamples === s.key ? 'hide examples' : 'click for examples'}
            </div>
          </div>
        ))}
      </div>

      {/* Sample panel */}
      {showSamples && (
        <SamplePanel
          label={clickableStats.find(s => s.key === showSamples)?.label}
          samples={clickableStats.find(s => s.key === showSamples)?.samples}
        />
      )}

      {/* Aliases */}
      {chatter.aliases.length > 0 && (
        <div className="mb-3">
          <span className="text-gray-500 text-xs">Possible aliases (same session nick changes): </span>
          {chatter.aliases.map(a => (
            <span key={a} className="text-gray-400 font-mono text-xs bg-gray-800 px-2 py-0.5 rounded mr-1">{a}</span>
          ))}
        </div>
      )}

      {/* Hourly chart */}
      <div className="mb-3">
        <div className="text-gray-500 text-xs mb-1">Hourly activity</div>
        <ResponsiveContainer width="100%" height={60}>
          <BarChart data={hourlyData} margin={{ top: 0, right: 0, bottom: 0, left: -30 }}>
            <XAxis dataKey="hour" tick={{ fill: '#4b5563', fontSize: 8 }} interval={5} />
            <Tooltip
              contentStyle={{ backgroundColor: '#111827', border: '1px solid #374151', borderRadius: '4px' }}
              labelStyle={{ color: '#9ca3af', fontSize: '10px' }}
              itemStyle={{ color: '#10b981', fontSize: '10px' }}
              formatter={(v) => [v, 'msgs']}
            />
            <Bar dataKey="count" fill="#059669" radius={[1, 1, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* First / last seen */}
      {chatter.firstSeen && (
        <div className="text-gray-600 text-xs mb-3">
          First seen: <span className="text-gray-400">{chatter.firstSeen}</span>
          {' · '}
          Last seen: <span className="text-gray-400">{chatter.lastSeen}</span>
        </div>
      )}

      {/* Sample quote */}
      {chatter.sampleQuote && (
        <div className="text-gray-500 text-xs italic mb-3">&ldquo;{chatter.sampleQuote}&rdquo;</div>
      )}

      {/* Recent activity */}
      {chatter.recentActivity.length > 0 && (
        <div>
          <div className="text-gray-500 text-xs mb-1">Recent messages</div>
          <div className="bg-gray-800 rounded p-2 space-y-0.5 max-h-32 overflow-y-auto">
            {chatter.recentActivity.map((a, i) => (
              <div key={i} className="font-mono text-xs flex gap-2">
                <span className="text-gray-600 shrink-0">[{a.timestamp}]</span>
                <span className={a.type === 'action' ? 'text-purple-400 italic' : 'text-gray-300'}>
                  {a.type === 'action' ? `* ${chatter.nick} ${a.text}` : a.text}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

    </div>
  )
}

function TopChatters({ topChatters }) {
  const [selected, setSelected] = useState(null)
  const [showAll,  setShowAll  ] = useState(false)
  const displayed = showAll ? topChatters : topChatters.slice(0, 20)

  return (
    <div className="bg-gray-800 rounded-lg p-4">
      <h3 className="text-gray-300 font-semibold mb-3">Top Chatters</h3>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-gray-500 text-xs border-b border-gray-700">
              <th className="text-left pb-2 w-8">#</th>
              <th className="text-left pb-2">Nick</th>
              <th className="text-right pb-2">Lines</th>
              <th className="text-right pb-2 hidden md:table-cell">Words</th>
              <th className="text-right pb-2 hidden md:table-cell">Avg words</th>
              <th className="text-left pb-2 hidden lg:table-cell pl-4">Sample Quote</th>
            </tr>
          </thead>
          <tbody>
            {displayed.map((chatter) => (
              <Fragment key={chatter.nick}>
                <tr
                  onClick={() => setSelected(selected === chatter.nick ? null : chatter.nick)}
                  className={`border-b border-gray-700/50 cursor-pointer transition-colors ${
                    selected === chatter.nick ? 'bg-green-900/20' : 'hover:bg-gray-700/50'
                  }`}
                >
                  <td className="py-1.5 text-gray-600 font-mono text-xs">{chatter.rank}</td>
                  <td className="py-1.5 font-mono text-green-400 font-semibold">
                    {chatter.nick}
                    {chatter.aliases.length > 0 && (
                      <span className="text-gray-600 text-xs ml-1">+{chatter.aliases.length} alias</span>
                    )}
                  </td>
                  <td className="py-1.5 text-right text-gray-300 font-mono">{chatter.lines.toLocaleString()}</td>
                  <td className="py-1.5 text-right text-gray-500 font-mono hidden md:table-cell">{chatter.words.toLocaleString()}</td>
                  <td className="py-1.5 text-right text-gray-500 font-mono hidden md:table-cell">{chatter.avgWords}</td>
                  <td className="py-1.5 text-gray-600 text-xs pl-4 hidden lg:table-cell truncate max-w-xs italic">
                    {chatter.sampleQuote ? `"${chatter.sampleQuote}"` : ''}
                  </td>
                </tr>
                {selected === chatter.nick && (
                  <tr>
                    <td colSpan={6} className="pb-3">
                      <NickProfile chatter={chatter} onClose={() => setSelected(null)} />
                    </td>
                  </tr>
                )}
              </Fragment>
            ))}
          </tbody>
        </table>
      </div>
      {topChatters.length > 20 && (
        <button
          onClick={() => setShowAll(!showAll)}
          className="mt-3 text-xs text-gray-500 hover:text-green-400 transition-colors"
        >
          {showAll ? 'Show top 20 only' : `Show all ${topChatters.length} chatters`}
        </button>
      )}
    </div>
  )
}

function WordStats({ topWords }) {
  const [showAll, setShowAll] = useState(false)
  const maxCount  = topWords[0]?.count || 1
  const displayed = showAll ? topWords : topWords.slice(0, 20)
  return (
    <div className="bg-gray-800 rounded-lg p-4">
      <h3 className="text-gray-300 font-semibold mb-3">Most Used Words</h3>
      <div className="space-y-1">
        {displayed.map(({ word, count }) => (
          <div key={word} className="flex items-center gap-2">
            <span className="text-gray-400 font-mono text-sm w-28 shrink-0 truncate">{word}</span>
            <div className="flex-1 bg-gray-700 rounded-full h-1.5">
              <div className="bg-green-500 h-1.5 rounded-full" style={{ width: `${(count / maxCount) * 100}%` }} />
            </div>
            <span className="text-gray-600 font-mono text-xs w-14 text-right">{count.toLocaleString()}</span>
          </div>
        ))}
      </div>
      {topWords.length > 20 && (
        <button
          onClick={() => setShowAll(!showAll)}
          className="mt-3 text-xs text-gray-500 hover:text-green-400 transition-colors"
        >
          {showAll ? 'Show top 20' : `Show all ${topWords.length} words`}
        </button>
      )}
    </div>
  )
}

function UrlList({ urls }) {
  const [showAll, setShowAll] = useState(false)
  if (urls.length === 0) return null
  const displayed = showAll ? urls : urls.slice(0, 10)
  const hasMore = urls.length > 10
  const showMoreLabel = `Show all ${urls.length} URLs`
  return (
    <div className="bg-gray-800 rounded-lg p-4">
      <h3 className="text-gray-300 font-semibold mb-3">URLs Shared ({urls.length.toLocaleString()})</h3>
      <div className="space-y-1.5">
        {displayed.map((u, i) => (
          <div key={i} className="flex items-center gap-2 text-xs">
            <span className="text-green-500 font-mono shrink-0">{u.nick}</span>
            <a href={u.url.startsWith('http') ? u.url : `https://${u.url}`} target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:text-blue-300 truncate">{u.url}</a>
          </div>
        ))}
      </div>
      {hasMore && (
        <button onClick={() => setShowAll(!showAll)} className="mt-3 text-xs text-gray-500 hover:text-green-400 transition-colors">
          {showAll ? 'Show fewer' : showMoreLabel}
        </button>
      )}
    </div>
  )
}

function Stats() {
  const { session } = useSession()
  const [stats,   setStats  ] = useState(null)
  const [loading, setLoading] = useState(false)
  const workerRef = useRef(null)

  useEffect(() => {
    if (!session) { setStats(null); return }
    setLoading(true)
    setStats(null)
    workerRef.current?.terminate()
    const worker = new StatsWorker()
    workerRef.current = worker
    worker.onmessage = ({ data }) => {
      if (data.type === 'done') {
        setStats(data.stats)
        setLoading(false)
        worker.terminate()
      }
    }
    worker.onerror = (err) => {
      console.error('Stats worker error:', err)
      setLoading(false)
    }
    worker.postMessage({ events: session.events })
    return () => worker.terminate()
  }, [session])

  if (!session) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <p className="text-white font-mono text-lg">No log loaded</p>
        <p className="text-gray-400 text-sm">Load a log file in the Viewer tab first</p>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <div className="w-12 h-12 border-4 border-green-400 border-t-transparent rounded-full animate-spin" />
        <p className="text-white font-mono text-lg">Computing stats...</p>
        <p className="text-gray-400 font-mono text-sm">{session.stats.totalMessages.toLocaleString()} messages to crunch</p>
      </div>
    )
  }

  if (!stats) return null

  const isMultiFile = session.fileCount > 1
  const dateRange = session.dateEnd ? `${session.date} to ${session.dateEnd}` : session.date

  return (
    <div className="h-full overflow-y-auto">
      <div className="max-w-6xl mx-auto space-y-4 pb-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-green-400">{session.channel} &mdash; Stats</h2>
            <p className="text-gray-400 text-sm">{dateRange}</p>
          </div>
          {isMultiFile && (
            <span className="text-xs bg-green-900/50 text-green-400 px-2 py-0.5 rounded-full">{session.fileCount} files</span>
          )}
        </div>
        <OverviewCards summary={stats.summary} />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <HourlyChart hourly={stats.hourly} />
          <TimeOfDay timeOfDay={stats.timeOfDay} />
        </div>
        <TopChatters topChatters={stats.topChatters} />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <WordStats topWords={stats.topWords} />
          <UrlList urls={stats.urls} />
        </div>
      </div>
    </div>
  )
}

export default Stats
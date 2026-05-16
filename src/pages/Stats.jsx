import { useState, useEffect, useRef, Fragment, useMemo } from 'react'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, LineChart, Line, Legend } from 'recharts'
import { useSession } from '../context/SessionContext'
import { useUser } from '../context/UserContext'
import StatsWorker from '../workers/statsWorker.js?worker'

const HOUR_COLORS = [
  '#6366f1','#6366f1','#6366f1','#6366f1','#6366f1','#6366f1',
  '#f59e0b','#f59e0b','#f59e0b','#f59e0b','#f59e0b','#f59e0b',
  '#10b981','#10b981','#10b981','#10b981','#10b981','#10b981',
  '#3b82f6','#3b82f6','#3b82f6','#3b82f6','#3b82f6','#3b82f6',
]

const LINE_COLORS = ['#22c55e','#a78bfa','#fb923c','#38bdf8','#f472b6']

// ── PRO GATE ─────────────────────────────────────────────────────────

function ProGate({ children, title }) {
  return (
    <div className="relative">
      <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-gray-950/80 backdrop-blur-sm rounded-lg gap-3">
        <span className="text-2xl">🔒</span>
        <p className="text-yellow-400 font-semibold font-mono text-sm">Pro Feature</p>
        {title && <p className="text-gray-300 text-sm font-semibold">{title}</p>}
        <p className="text-gray-400 text-xs text-center px-4">Upgrade to IRCReplay Pro to unlock extended stats</p>
        <a href="/pricing" className="bg-yellow-500 hover:bg-yellow-400 text-black text-xs font-bold px-4 py-2 rounded-lg transition-colors">
          View Pricing
        </a>
      </div>
      <div className="opacity-20 pointer-events-none select-none">
        {children}
      </div>
    </div>
  )
}

// ── BOT FILTER ────────────────────────────────────────────────────────

function BotFilter({ nicks, excluded, onToggle, isPremium }) {
  const [open,   setOpen  ] = useState(false)
  const [search, setSearch] = useState('')

  if (!isPremium) {
    return (
      <div className="flex items-center justify-center gap-3 bg-gray-800/50 border border-gray-700 rounded-lg px-4 py-2">
        <span className="text-gray-600 text-xs">🔒</span>
        <span className="text-gray-600 text-xs font-mono">Bot Filter — exclude bots from all stats</span>
        <a href="/pricing" className="text-yellow-500 text-xs hover:text-yellow-400 transition-colors font-semibold">&#9889; Pro</a>
      </div>
    )
  }

  const filtered = nicks.filter(n => n.toLowerCase().includes(search.toLowerCase()))
  const exCount  = excluded.size

  return (
    <div className="bg-gray-800 border border-gray-700 rounded-lg overflow-hidden">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-4 py-2.5 hover:bg-gray-700/50 transition-colors"
      >
        <div className="flex items-center gap-2">
          <span className="text-gray-400 text-sm font-semibold">Bot Filter</span>
          {exCount > 0 && (
            <span className="bg-yellow-500/20 text-yellow-400 border border-yellow-500/30 text-xs px-2 py-0.5 rounded-full font-mono">
              {exCount} excluded
            </span>
          )}
          {exCount === 0 && (
            <span className="text-gray-600 text-xs">exclude bots from all stats</span>
          )}
        </div>
        <span className="text-gray-500 text-xs">{open ? '▲ close' : '▼ open'}</span>
      </button>

      {open && (
        <div className="border-t border-gray-700 p-4 space-y-3">
          <p className="text-gray-500 text-xs">Select nicks to exclude from all stats. Sorted by activity — bots are usually near the top.</p>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search nicks..."
            className="w-full bg-gray-900 border border-gray-600 focus:border-yellow-500 rounded-lg px-3 py-1.5 text-white text-sm font-mono outline-none transition-colors placeholder-gray-600"
          />
          <div className="max-h-48 overflow-y-auto space-y-1">
            {filtered.map(nick => {
              const isExcluded = excluded.has(nick)
              const rowClass   = isExcluded
                ? 'flex items-center gap-2 px-2 py-1 rounded cursor-pointer bg-yellow-500/10 border border-yellow-500/20'
                : 'flex items-center gap-2 px-2 py-1 rounded cursor-pointer hover:bg-gray-700/50'
              return (
                <div key={nick} onClick={() => onToggle(nick)} className={rowClass}>
                  <div className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 ${isExcluded ? 'bg-yellow-500 border-yellow-500' : 'border-gray-600'}`}>
                    {isExcluded && <span className="text-black text-xs font-bold">&#10003;</span>}
                  </div>
                  <span className={`font-mono text-sm ${isExcluded ? 'text-yellow-400 line-through' : 'text-gray-300'}`}>{nick}</span>
                  {isExcluded && <span className="text-gray-600 text-xs ml-auto">excluded</span>}
                </div>
              )
            })}
          </div>
          {exCount > 0 && (
            <button
              onClick={() => { excluded.forEach(n => onToggle(n)) }}
              className="text-xs text-gray-500 hover:text-red-400 transition-colors"
            >
              Clear all exclusions
            </button>
          )}
        </div>
      )}
    </div>
  )
}

// ── FREE TIER COMPONENTS ──────────────────────────────────────────────

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
      <OverviewCard label="Days"      value={summary.totalDays.toLocaleString()} />
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
          { label: 'Night 0-6',       color: '#6366f1' },
          { label: 'Morning 6-12',    color: '#f59e0b' },
          { label: 'Afternoon 12-18', color: '#10b981' },
          { label: 'Evening 18-24',   color: '#3b82f6' },
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
            <div className="text-gray-400 text-xs mb-2">Hours {s.sub}</div>
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
    <div className="bg-gray-900 border border-green-500/30 rounded-lg p-4 mt-1 w-full overflow-x-hidden">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-green-400 font-mono font-bold text-lg">{chatter.nick}</h3>
        <button onClick={onClose} className="text-gray-500 hover:text-white text-xs transition-colors">close &#10005;</button>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-2">
        {[
          { label: 'Lines',          value: chatter.lines.toLocaleString() },
          { label: 'Words',          value: chatter.words.toLocaleString() },
          { label: 'Avg words/line', value: chatter.avgWords },
          { label: 'Short lines',    value: chatter.shortLines.toLocaleString() },
        ].map(s => (
          <div key={s.label} className="bg-gray-800 rounded p-2 min-w-0 overflow-hidden">
            <div className="text-white font-mono text-sm font-bold">{s.value}</div>
            <div className="text-gray-500 text-xs truncate">{s.label}</div>
          </div>
        ))}
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-2 mb-3">
        {clickableStats.map(s => {
          const isActive  = showSamples === s.key
          const cardClass = isActive
            ? 'bg-gray-700 border-green-500/50'
            : 'bg-gray-800 border-transparent hover:border-green-500/30 hover:bg-gray-700'
          return (
            <div key={s.key} onClick={() => toggleSamples(s.key)} className={`rounded p-2 cursor-pointer transition-colors border min-w-0 overflow-hidden ${cardClass}`}>
              <div className="text-white font-mono text-sm font-bold">{s.value}</div>
              <div className="text-gray-500 text-xs truncate">{s.label}</div>
              <div className="text-green-600 text-xs mt-0.5">{isActive ? 'hide examples' : 'click for examples'}</div>
            </div>
          )
        })}
      </div>
      {showSamples && (
        <SamplePanel
          label={clickableStats.find(s => s.key === showSamples)?.label}
          samples={clickableStats.find(s => s.key === showSamples)?.samples}
        />
      )}
      {chatter.aliases.length > 0 && (
        <div className="mb-3">
          <div className="text-gray-500 text-xs mb-1">Known aliases:</div>
          <div className="flex flex-wrap gap-1">
            {chatter.aliases.map(a => (
              <span key={a} className="text-gray-400 font-mono text-xs bg-gray-800 px-2 py-0.5 rounded">{a}</span>
            ))}
          </div>
        </div>
      )}
      <div>
        <div className="text-gray-500 text-xs mb-1">Hourly activity:</div>
        <ResponsiveContainer width="100%" height={60}>
          <BarChart data={hourlyData} margin={{ top: 0, right: 0, bottom: 0, left: -30 }}>
            <XAxis dataKey="hour" tick={{ fill: '#4b5563', fontSize: 8 }} interval={5} />
            <Bar dataKey="count" fill="#22c55e" radius={[1, 1, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}

function TopChatters({ topChatters }) {
  const [showAll,  setShowAll ] = useState(false)
  const [selected, setSelected] = useState(null)
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
              <th className="text-right pb-2 hidden md:table-cell">Avg</th>
              <th className="text-left pb-2 hidden lg:table-cell pl-4">Sample Quote</th>
            </tr>
          </thead>
          <tbody>
            {displayed.map((chatter) => {
              const isSelected = selected === chatter.nick
              const rowClass   = isSelected
                ? 'border-b border-gray-700/50 cursor-pointer transition-colors bg-green-900/20'
                : 'border-b border-gray-700/50 cursor-pointer transition-colors hover:bg-gray-700/50'
              return (
                <Fragment key={chatter.nick}>
                  <tr onClick={() => setSelected(isSelected ? null : chatter.nick)} className={rowClass}>
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
                  {isSelected && (
                    <tr>
                      <td colSpan={6} className="pb-3 overflow-hidden" style={{ maxWidth: '1px', width: '100%' }}>
                        <NickProfile chatter={chatter} onClose={() => setSelected(null)} />
                      </td>
                    </tr>
                  )}
                </Fragment>
              )
            })}
          </tbody>
        </table>
      </div>
      {topChatters.length > 20 && (
        <button onClick={() => setShowAll(!showAll)} className="mt-3 text-xs text-gray-500 hover:text-green-400 transition-colors">
          {showAll ? 'Show top 20 only' : `Show all ${topChatters.length} chatters`}
        </button>
      )}
    </div>
  )
}

function WordStats({ topWords }) {
  const [showAll, setShowAll] = useState(false)
  const maxCount  = topWords[0]?.count || 1
  const displayed = showAll ? topWords.slice(0, 50) : topWords.slice(0, 20)
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
        <button onClick={() => setShowAll(!showAll)} className="mt-3 text-xs text-gray-500 hover:text-green-400 transition-colors">
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
  const hasMore   = urls.length > 10
  const moreLabel = `Show all ${urls.length} URLs`
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
          {showAll ? 'Show fewer' : moreLabel}
        </button>
      )}
    </div>
  )
}

// ── PRO TIER COMPONENTS ───────────────────────────────────────────────

function ActivityHeatmap({ heatmap }) {
  if (!heatmap || heatmap.length === 0) return null
  const allCounts = heatmap.flatMap(d => d.hours)
  const maxCount  = Math.max(...allCounts, 1)

  const getColor = (count) => {
    if (count === 0) return '#111827'
    const intensity = count / maxCount
    if (intensity < 0.25) return '#14532d'
    if (intensity < 0.5)  return '#166534'
    if (intensity < 0.75) return '#15803d'
    return '#22c55e'
  }

  const hours    = [0,1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,21,22,23]
  const showDays = heatmap.slice(-30)

  return (
    <div className="bg-gray-800 rounded-lg p-4">
      <h3 className="text-gray-300 font-semibold mb-1">Activity Heatmap</h3>
      <p className="text-gray-500 text-xs mb-3">Message activity by hour across each day (darker = more active)</p>
      <div className="overflow-x-auto">
        <div className="min-w-max">
          <div className="flex gap-1 mb-1 ml-8">
            {hours.map(h => (
              <div key={h} className="w-4 text-center text-gray-600" style={{ fontSize: '8px' }}>{h}</div>
            ))}
          </div>
          <div className="space-y-0.5">
            {showDays.map((day) => (
              <div key={day.day} className="flex items-center gap-1">
                <div className="w-7 text-gray-600 text-right shrink-0" style={{ fontSize: '8px' }}>D{day.day}</div>
                {day.hours.map((count, h) => (
                  <div
                    key={h}
                    className="w-4 h-4 rounded-sm"
                    style={{ backgroundColor: getColor(count) }}
                    title={`Day ${day.day} ${h}:00 — ${count} messages`}
                  />
                ))}
              </div>
            ))}
          </div>
          <div className="flex items-center gap-2 mt-3">
            <span className="text-gray-600 text-xs">Less</span>
            {['#111827','#14532d','#166534','#15803d','#22c55e'].map(c => (
              <div key={c} className="w-3 h-3 rounded-sm" style={{ backgroundColor: c }} />
            ))}
            <span className="text-gray-600 text-xs">More</span>
          </div>
        </div>
      </div>
    </div>
  )
}

function NickActivityChart({ nickActivityData, top5nicks }) {
  if (!nickActivityData || nickActivityData.length === 0) return null
  const showData = nickActivityData.length > 60
    ? nickActivityData.filter((_, i) => i % Math.ceil(nickActivityData.length / 60) === 0)
    : nickActivityData

  return (
    <div className="bg-gray-800 rounded-lg p-4">
      <h3 className="text-gray-300 font-semibold mb-1">Top Chatters Over Time</h3>
      <p className="text-gray-500 text-xs mb-3">Daily message counts for the top 5 most active users</p>
      <ResponsiveContainer width="100%" height={200}>
        <LineChart data={showData} margin={{ top: 0, right: 0, bottom: 0, left: -20 }}>
          <XAxis dataKey="day" tick={{ fill: '#6b7280', fontSize: 10 }} />
          <YAxis tick={{ fill: '#6b7280', fontSize: 10 }} />
          <Tooltip
            contentStyle={{ backgroundColor: '#1f2937', border: '1px solid #374151', borderRadius: '6px' }}
            labelStyle={{ color: '#9ca3af' }}
            labelFormatter={(d) => `Day ${d}`}
          />
          <Legend wrapperStyle={{ fontSize: '11px', color: '#9ca3af' }} />
          {top5nicks.map((nick, i) => (
            <Line key={nick} type="monotone" dataKey={nick} stroke={LINE_COLORS[i]} dot={false} strokeWidth={1.5} />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}

function WordCloud({ topWords }) {
  if (!topWords || topWords.length === 0) return null
  const maxCount   = topWords[0]?.count || 1
  const cloudWords = topWords.slice(0, 60)

  const getSize = (count) => {
    const ratio = count / maxCount
    if (ratio > 0.8) return 'text-3xl font-black'
    if (ratio > 0.6) return 'text-2xl font-bold'
    if (ratio > 0.4) return 'text-xl font-bold'
    if (ratio > 0.2) return 'text-lg font-semibold'
    if (ratio > 0.1) return 'text-base font-medium'
    return 'text-sm'
  }

  const getColorClass = (count) => {
    const ratio = count / maxCount
    if (ratio > 0.6) return 'text-green-400'
    if (ratio > 0.3) return 'text-green-500'
    if (ratio > 0.1) return 'text-green-600'
    return 'text-gray-500'
  }

  return (
    <div className="bg-gray-800 rounded-lg p-4">
      <h3 className="text-gray-300 font-semibold mb-1">Word Cloud</h3>
      <p className="text-gray-500 text-xs mb-3">Top 60 words — size reflects frequency</p>
      <div className="flex flex-wrap gap-2 items-center justify-center min-h-32">
        {cloudWords.map(({ word, count }) => {
          const sizeClass  = getSize(count)
          const colorClass = getColorClass(count)
          return (
            <span key={word} className={`${sizeClass} ${colorClass} font-mono cursor-default`} title={`${word}: ${count.toLocaleString()} times`}>
              {word}
            </span>
          )
        })}
      </div>
    </div>
  )
}

function EmoticonStats({ topEmoticons }) {
  if (!topEmoticons || topEmoticons.length === 0) return null
  const maxCount = topEmoticons[0]?.count || 1
  return (
    <div className="bg-gray-800 rounded-lg p-4">
      <h3 className="text-gray-300 font-semibold mb-1">Emoji &amp; Emoticon Stats</h3>
      <p className="text-gray-500 text-xs mb-3">Most used emoticons and laugh words</p>
      <div className="space-y-1.5">
        {topEmoticons.map(({ emoticon, count }) => (
          <div key={emoticon} className="flex items-center gap-2">
            <span className="text-yellow-400 font-mono text-sm w-16 shrink-0">{emoticon}</span>
            <div className="flex-1 bg-gray-700 rounded-full h-1.5">
              <div className="bg-yellow-500 h-1.5 rounded-full" style={{ width: `${(count / maxCount) * 100}%` }} />
            </div>
            <span className="text-gray-600 font-mono text-xs w-14 text-right">{count.toLocaleString()}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

function RelationshipMap({ topMentions }) {
  if (!topMentions || topMentions.length === 0) return null
  const maxCount = topMentions[0]?.count || 1
  return (
    <div className="bg-gray-800 rounded-lg p-4">
      <h3 className="text-gray-300 font-semibold mb-1">Connections</h3>
      <p className="text-gray-500 text-xs mb-3">Who mentions who most often — top nick-to-nick connections</p>
      <div className="space-y-1.5">
        {topMentions.map(({ from, to, count }, i) => (
          <div key={i} className="flex items-center gap-2 text-xs">
            <span className="text-green-400 font-mono w-24 shrink-0 truncate">{from}</span>
            <span className="text-gray-600">&#8594;</span>
            <span className="text-blue-400 font-mono w-24 shrink-0 truncate">{to}</span>
            <div className="flex-1 bg-gray-700 rounded-full h-1">
              <div className="bg-blue-500 h-1 rounded-full" style={{ width: `${(count / maxCount) * 100}%` }} />
            </div>
            <span className="text-gray-600 font-mono w-10 text-right">{count}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

function ConversationStarters({ topStarters }) {
  if (!topStarters || topStarters.length === 0) return null
  const maxCount = topStarters[0]?.count || 1
  return (
    <div className="bg-gray-800 rounded-lg p-4">
      <h3 className="text-gray-300 font-semibold mb-1">Conversation Starters</h3>
      <p className="text-gray-500 text-xs mb-3">Who breaks the silence most — first to post after 5+ minutes quiet</p>
      <div className="space-y-1.5">
        {topStarters.map(({ nick, count }) => (
          <div key={nick} className="flex items-center gap-2">
            <span className="text-gray-400 font-mono text-sm w-28 shrink-0 truncate">{nick}</span>
            <div className="flex-1 bg-gray-700 rounded-full h-1.5">
              <div className="bg-purple-500 h-1.5 rounded-full" style={{ width: `${(count / maxCount) * 100}%` }} />
            </div>
            <span className="text-gray-600 font-mono text-xs w-14 text-right">{count} times</span>
          </div>
        ))}
      </div>
    </div>
  )
}

function ChannelMoodChart({ moodData }) {
  if (!moodData || moodData.length === 0) return null
  const showData = moodData.length > 60
    ? moodData.filter((_, i) => i % Math.ceil(moodData.length / 60) === 0)
    : moodData

  return (
    <div className="bg-gray-800 rounded-lg p-4">
      <h3 className="text-gray-300 font-semibold mb-1">Channel Mood Over Time</h3>
      <p className="text-gray-500 text-xs mb-3">Daily % of messages containing laughter, questions, and CAPS</p>
      <ResponsiveContainer width="100%" height={200}>
        <LineChart data={showData} margin={{ top: 0, right: 0, bottom: 0, left: -20 }}>
          <XAxis dataKey="day" tick={{ fill: '#6b7280', fontSize: 10 }} />
          <YAxis tick={{ fill: '#6b7280', fontSize: 10 }} unit="%" />
          <Tooltip
            contentStyle={{ backgroundColor: '#1f2937', border: '1px solid #374151', borderRadius: '6px' }}
            labelStyle={{ color: '#9ca3af' }}
            labelFormatter={(d) => `Day ${d}`}
            formatter={(v, name) => [`${v}%`, name]}
          />
          <Legend wrapperStyle={{ fontSize: '11px', color: '#9ca3af' }} />
          <Line type="monotone" dataKey="laughter"  stroke="#22c55e" dot={false} strokeWidth={1.5} name="Laughter" />
          <Line type="monotone" dataKey="questions" stroke="#38bdf8" dot={false} strokeWidth={1.5} name="Questions" />
          <Line type="monotone" dataKey="caps"      stroke="#f87171" dot={false} strokeWidth={1.5} name="CAPS" />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}

// ── MAIN STATS PAGE ───────────────────────────────────────────────────

function Stats() {
  const { session, setStats: setStatsCtx } = useSession()
  const { isPremium } = useUser()
  const [stats,   setStats  ] = useState(null)    // line ~530 — raw stats from worker
  const [loading, setLoading] = useState(false)
  const [excluded, setExcluded] = useState(new Set()) // line ~532 — bot exclusion set
  const workerRef = useRef(null)

  // Recompute filtered stats whenever raw stats or excluded set changes
  // line ~536
  const filteredStats = useMemo(() => {
    if (!stats) return null
    return {
      ...stats,
      topChatters: stats.topChatters.filter(c => !excluded.has(c.nick)),
      urls:        stats.urls.filter(u => !excluded.has(u.nick)),
      topMentions: stats.topMentions?.filter(m => !excluded.has(m.from) && !excluded.has(m.to)),
      topStarters: stats.topStarters?.filter(s => !excluded.has(s.nick)),
      summary: {
        ...stats.summary,
        uniqueChatters: stats.topChatters.filter(c => !excluded.has(c.nick)).length,
      },
    }
  }, [stats, excluded])

  // Nicks sorted by activity for the bot filter panel
  // line ~553
  const nicksByActivity = useMemo(() => {
    if (!stats) return []
    return stats.topChatters.map(c => c.nick)
  }, [stats])

  const toggleExcluded = (nick) => {
    setExcluded(prev => {
      const next = new Set(prev)
      if (next.has(nick)) next.delete(nick)
      else next.add(nick)
      return next
    })
  }

  useEffect(() => {
    if (!session) { setStats(null); return }
    setLoading(true)
    setStats(null)
    setExcluded(new Set()) // reset exclusions when new session loaded
    workerRef.current?.terminate()
    const worker = new StatsWorker()
    workerRef.current = worker
    worker.onmessage = ({ data }) => {
      if (data.type === 'done') {
        setStats(data.stats)
        setStatsCtx(data.stats)
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
  const dateRange   = session.dateEnd ? `${session.date} to ${session.dateEnd}` : session.date

  return (
    <div className="h-full overflow-y-auto">
      <div className="max-w-6xl mx-auto space-y-4 pb-6">

        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-green-400">{session.channel} &mdash; Stats</h2>
            <p className="text-gray-400 text-sm">{dateRange}</p>
          </div>
          <div className="flex items-center gap-2">
            {isPremium && (
              <span className="text-xs bg-yellow-500/20 text-yellow-400 border border-yellow-500/30 px-2 py-0.5 rounded-full font-mono">
                &#9889; Pro
              </span>
            )}
            {isMultiFile && (
              <span className="text-xs bg-green-900/50 text-green-400 px-2 py-0.5 rounded-full">{session.fileCount} files</span>
            )}
          </div>
        </div>

        {/* Bot filter — sits above all stats */}
        <BotFilter
          nicks={nicksByActivity}
          excluded={excluded}
          onToggle={toggleExcluded}
          isPremium={isPremium}
        />

        {/* Free stats — all use filteredStats */}
        <OverviewCards summary={filteredStats.summary} />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <HourlyChart hourly={filteredStats.hourly} />
          <TimeOfDay timeOfDay={filteredStats.timeOfDay} />
        </div>
        <TopChatters topChatters={filteredStats.topChatters} />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <WordStats topWords={filteredStats.topWords} />
          <UrlList urls={filteredStats.urls} />
        </div>

        {/* Pro stats divider */}
        <div className="flex items-center gap-3 pt-2">
          <div className="h-px flex-1 bg-gray-700" />
          <span className="text-yellow-500/70 font-mono text-xs">&#9889; Pro Stats</span>
          <div className="h-px flex-1 bg-gray-700" />
        </div>

        {/* Activity heatmap */}
        {isPremium
          ? <ActivityHeatmap heatmap={filteredStats.heatmap} />
          : <ProGate title="Activity Heatmap"><ActivityHeatmap heatmap={stats.heatmap} /></ProGate>
        }

        {/* Nick activity over time */}
        {isPremium
          ? <NickActivityChart nickActivityData={filteredStats.nickActivityData} top5nicks={filteredStats.top5nicks} />
          : <ProGate title="Top Chatters Over Time"><NickActivityChart nickActivityData={stats.nickActivityData} top5nicks={stats.top5nicks} /></ProGate>
        }

        {/* Word cloud + emoticons */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {isPremium
            ? <WordCloud topWords={filteredStats.topWords} />
            : <ProGate title="Word Cloud"><WordCloud topWords={stats.topWords} /></ProGate>
          }
          {isPremium
            ? <EmoticonStats topEmoticons={filteredStats.topEmoticons} />
            : <ProGate title="Emoji &amp; Emoticon Stats"><EmoticonStats topEmoticons={stats.topEmoticons} /></ProGate>
          }
        </div>

        {/* Connections + conversation starters */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {isPremium
            ? <RelationshipMap topMentions={filteredStats.topMentions} />
            : <ProGate title="Connections Map"><RelationshipMap topMentions={stats.topMentions} /></ProGate>
          }
          {isPremium
            ? <ConversationStarters topStarters={filteredStats.topStarters} />
            : <ProGate title="Conversation Starters"><ConversationStarters topStarters={stats.topStarters} /></ProGate>
          }
        </div>

        {/* Channel mood */}
        {isPremium
          ? <ChannelMoodChart moodData={filteredStats.moodData} />
          : <ProGate title="Channel Mood Over Time"><ChannelMoodChart moodData={stats.moodData} /></ProGate>
        }

      </div>
    </div>
  )
}

export default Stats

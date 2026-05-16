import { useEffect, useRef, useState } from 'react'
import { useParams } from 'react-router-dom'
import { loadSession } from '../lib/exportSession'
import StatsWorker from '../workers/statsWorker.js?worker'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, LineChart, Line, Legend } from 'recharts'
import { Fragment } from 'react'

const HOUR_COLORS = [
  '#6366f1','#6366f1','#6366f1','#6366f1','#6366f1','#6366f1',
  '#f59e0b','#f59e0b','#f59e0b','#f59e0b','#f59e0b','#f59e0b',
  '#10b981','#10b981','#10b981','#10b981','#10b981','#10b981',
  '#3b82f6','#3b82f6','#3b82f6','#3b82f6','#3b82f6','#3b82f6',
]

const LINE_COLORS = ['#22c55e','#a78bfa','#fb923c','#38bdf8','#f472b6']

// ── SHARED STAT COMPONENTS ────────────────────────────────────────────
// Simplified versions — no interactivity needed for public view

function OverviewCard({ label, value }) {
  return (
    <div className="bg-gray-800 rounded-lg p-3 text-center">
      <div className="text-green-400 font-mono text-xl font-bold">{value}</div>
      <div className="text-gray-400 text-xs mt-1">{label}</div>
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
    </div>
  )
}

function TopChattersSimple({ topChatters }) {
  const displayed = topChatters.slice(0, 15)
  const maxLines  = displayed[0]?.lines || 1
  return (
    <div className="bg-gray-800 rounded-lg p-4">
      <h3 className="text-gray-300 font-semibold mb-3">Top Chatters</h3>
      <div className="space-y-2">
        {displayed.map((c, i) => (
          <div key={c.nick} className="flex items-center gap-3">
            <span className="text-gray-600 font-mono text-xs w-4 shrink-0">{i + 1}</span>
            <span className="text-green-400 font-mono text-sm w-28 shrink-0 truncate">{c.nick}</span>
            <div className="flex-1 bg-gray-700 rounded-full h-1.5">
              <div className="bg-green-500 h-1.5 rounded-full" style={{ width: `${(c.lines / maxLines) * 100}%` }} />
            </div>
            <span className="text-gray-500 font-mono text-xs w-16 text-right">{c.lines.toLocaleString()}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

function WordCloud({ topWords }) {
  if (!topWords || topWords.length === 0) return null
  const maxCount   = topWords[0]?.count || 1
  const cloudWords = topWords.slice(0, 50)

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
      <h3 className="text-gray-300 font-semibold mb-3">Word Cloud</h3>
      <div className="flex flex-wrap gap-2 items-center justify-center min-h-32">
        {cloudWords.map(({ word, count }) => {
          const sizeClass  = getSize(count)
          const colorClass = getColorClass(count)
          return (
            <span key={word} className={`${sizeClass} ${colorClass} font-mono`} title={`${count.toLocaleString()} times`}>
              {word}
            </span>
          )
        })}
      </div>
    </div>
  )
}

function RelationshipMap({ topMentions }) {
  if (!topMentions || topMentions.length === 0) return null
  const maxCount = topMentions[0]?.count || 1
  return (
    <div className="bg-gray-800 rounded-lg p-4">
      <h3 className="text-gray-300 font-semibold mb-3">Connections</h3>
      <div className="space-y-1.5">
        {topMentions.slice(0, 10).map(({ from, to, count }, i) => (
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

function NickActivityChart({ nickActivityData, top5nicks }) {
  if (!nickActivityData || nickActivityData.length === 0) return null
  const showData = nickActivityData.length > 60
    ? nickActivityData.filter((_, i) => i % Math.ceil(nickActivityData.length / 60) === 0)
    : nickActivityData

  return (
    <div className="bg-gray-800 rounded-lg p-4">
      <h3 className="text-gray-300 font-semibold mb-3">Top Chatters Over Time</h3>
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

// ── MAIN SHARE VIEW ───────────────────────────────────────────────────

function ShareView() {
  const { userId, sessionId } = useParams()
  const [phase,   setPhase  ] = useState('loading')  // loading | computing | ready | error
  const [session, setSession] = useState(null)
  const [stats,   setStats  ] = useState(null)
  const [errorMsg, setErrorMsg] = useState('')
  const workerRef = useRef(null)

  useEffect(() => {
  const load = async () => {
        try {
          setPhase('loading')
          const res = await fetch(`/api/share/${userId}/${sessionId}`)

          if (!res.ok) {
            let errMsg = `HTTP ${res.status}`
            try {
              const errData = await res.json()
              errMsg = errData.error || errMsg
            } catch {}
            throw new Error(errMsg)
          }

          // Read as text first for loadSession
          const jsonText = await res.text()
          if (!jsonText || jsonText.trim() === '') {
            throw new Error('Empty response from server')
          }

          const restored = loadSession(jsonText)
          setSession(restored)
          setPhase('computing')

          const worker = new StatsWorker()
          workerRef.current = worker
          worker.onmessage = ({ data }) => {
            if (data.type === 'done') {
              setStats(data.stats)
              setPhase('ready')
              worker.terminate()
            }
          }
          worker.onerror = () => {
            setPhase('error')
            setErrorMsg('Failed to compute stats')
            worker.terminate()
          }
          worker.postMessage({ events: restored.events })
        } catch (err) {
          console.error('Share load error:', err)
          setPhase('error')
          setErrorMsg(err.message || 'Failed to load session')
        }
      }
    if (userId && sessionId) load()
    return () => workerRef.current?.terminate()
  }, [userId, sessionId])

  const handleCopyLink = () => {
    navigator.clipboard.writeText(window.location.href)
  }

  if (phase === 'loading') {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <div className="text-center space-y-3">
          <div className="w-12 h-12 border-4 border-green-400 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-white font-mono">Loading shared session...</p>
        </div>
      </div>
    )
  }

  if (phase === 'computing') {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <div className="text-center space-y-3">
          <div className="w-12 h-12 border-4 border-green-400 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-white font-mono">Computing stats...</p>
          <p className="text-gray-500 font-mono text-sm">{session?.stats?.totalMessages?.toLocaleString()} messages</p>
        </div>
      </div>
    )
  }

  if (phase === 'error') {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <div className="text-center space-y-4">
          <p className="text-red-400 font-mono text-lg">&#10005; {errorMsg}</p>
          <p className="text-gray-500 text-sm">This link may be invalid or the session may have been deleted.</p>
          <a href="/" className="text-green-400 hover:text-green-300 text-sm transition-colors">
            &#8592; Go to IRCReplay
          </a>
        </div>
      </div>
    )
  }

  if (!session || !stats) return null

  const dateRange = session.dateEnd ? `${session.date} to ${session.dateEnd}` : session.date

  return (
    <div className="min-h-screen bg-gray-950 text-white">

      {/* Header bar */}
      <div className="bg-gray-900 border-b border-gray-700 px-6 py-4 flex items-center justify-between">
        <div>
          <a href="/" className="text-green-400 font-bold font-mono text-lg hover:text-green-300 transition-colors">
            IRCReplay
          </a>
          <span className="text-gray-600 font-mono text-sm ml-2">— shared stats</span>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={handleCopyLink}
            className="text-gray-400 hover:text-white border border-gray-600 hover:border-gray-400 text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors"
          >
            &#128279; Copy Link
          </button>
          <a href="/" className="bg-green-500 hover:bg-green-400 text-black text-xs font-bold px-3 py-1.5 rounded-lg transition-colors">
            Try IRCReplay Free
          </a>
        </div>
      </div>

      {/* Stats content */}
      <div className="max-w-6xl mx-auto px-4 py-8 space-y-4">

        {/* Channel header */}
        <div>
          <h1 className="text-2xl font-bold text-green-400 font-mono">{session.channel}</h1>
          <p className="text-gray-400 text-sm">{dateRange}</p>
        </div>

        {/* Overview */}
        <div className="grid grid-cols-3 md:grid-cols-6 gap-3">
          <OverviewCard label="Messages"  value={stats.summary.totalMessages.toLocaleString()} />
          <OverviewCard label="Chatters"  value={stats.summary.uniqueChatters.toLocaleString()} />
          <OverviewCard label="Words"     value={stats.summary.totalWords.toLocaleString()} />
          <OverviewCard label="URLs"      value={stats.summary.totalUrls.toLocaleString()} />
          <OverviewCard label="Joins"     value={stats.summary.totalJoins.toLocaleString()} />
          <OverviewCard label="Days"      value={stats.summary.totalDays.toLocaleString()} />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <HourlyChart hourly={stats.hourly} />
          <TopChattersSimple topChatters={stats.topChatters} />
        </div>

        <WordCloud topWords={stats.topWords} />

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <NickActivityChart nickActivityData={stats.nickActivityData} top5nicks={stats.top5nicks} />
          <RelationshipMap topMentions={stats.topMentions} />
        </div>

        {/* Powered by banner */}
        <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-6 text-center space-y-3 mt-8">
          <p className="text-gray-400 text-sm">These stats were generated with</p>
          <a href="/" className="text-green-400 font-bold font-mono text-xl hover:text-green-300 transition-colors">
            IRCReplay.app
          </a>
          <p className="text-gray-500 text-xs">Upload your old IRC logs and generate stats like these — free forever</p>
          <div className="flex items-center justify-center gap-3 pt-1">
            <a href="/" className="bg-green-500 hover:bg-green-400 text-black text-sm font-bold px-6 py-2 rounded-lg transition-colors">
              Try it free
            </a>
            <a href="/pricing" className="bg-yellow-500/20 hover:bg-yellow-500/30 text-yellow-400 border border-yellow-500/30 text-sm font-bold px-6 py-2 rounded-lg transition-colors">
              &#9889; Go Pro
            </a>
          </div>
        </div>

      </div>
    </div>
  )
}

export default ShareView
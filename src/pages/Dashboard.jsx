import { useEffect, useState } from 'react'
import { useAuth } from '@clerk/react'
import { useSession } from '../context/SessionContext'
import { loadSession } from '../lib/exportSession'

function formatSize(bytes) {
  if (!bytes) return '—'
  const mb = bytes / 1024 / 1024
  return mb > 1 ? `${mb.toFixed(1)} MB` : `${Math.round(bytes / 1024)} KB`
}

function formatDate(iso) {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('en-GB', {
    day: '2-digit', month: 'short', year: 'numeric',
  })
}

function Dashboard() {
  const { userId }         = useAuth()
  const { setSession }     = useSession()
  const [sessions, setSessions] = useState([])
  const [loading,  setLoading ] = useState(true)
  const [error,    setError   ] = useState(null)
  const [deleting, setDeleting] = useState(null)
  const [restoring, setRestoring] = useState(null)

  useEffect(() => {
    if (!userId) return
    fetchSessions()
  }, [userId])

  const fetchSessions = async () => {
    setLoading(true)
    setError(null)
    try {
      const res  = await fetch('/api/logs', { headers: { 'X-User-Id': userId } })
      const data = await res.json()
      setSessions(data.sessions || [])
    } catch {
      setError('Failed to load sessions')
    } finally {
      setLoading(false)
    }
  }

  const handleRestore = async (session) => {
    setRestoring(session.id)
    try {
      // Get presigned download URL
      const res  = await fetch(`/api/logs?id=${session.id}`, { headers: { 'X-User-Id': userId } })
      const data = await res.json()
      if (!data.url) throw new Error('No download URL')

      // Fetch the JSON from R2
      const jsonRes  = await fetch(data.url)
      const jsonText = await jsonRes.text()

      // Restore via existing loadSession utility
      const restored = loadSession(jsonText)
      setSession(restored)

      // Navigate to viewer
      window.location.href = '/'
    } catch {
      setError('Failed to restore session')
    } finally {
      setRestoring(null)
    }
  }

  const handleDelete = async (session) => {
    if (!window.confirm(`Delete "${session.channel}" saved on ${formatDate(session.savedAt)}?`)) return
    setDeleting(session.id)
    try {
      await fetch(`/api/logs?id=${session.id}`, {
        method:  'DELETE',
        headers: { 'X-User-Id': userId },
      })
      setSessions(prev => prev.filter(s => s.id !== session.id))
    } catch {
      setError('Failed to delete session')
    } finally {
      setDeleting(null)
    }
  }

  if (!userId) {
    return (
      <div className="h-full flex items-center justify-center">
        <p className="text-gray-500 font-mono">Sign in to view your saved sessions</p>
      </div>
    )
  }

  return (
    <div className="h-full overflow-y-auto">
      <div className="max-w-3xl mx-auto px-4 py-8 space-y-6">

        <div className="space-y-1">
          <h1 className="text-2xl font-bold text-green-400 font-mono">Cloud Sessions</h1>
          <p className="text-gray-500 text-sm">Your saved IRC sessions stored in the cloud</p>
          <div className="h-px bg-gray-700 mt-3" />
        </div>

        {error && (
          <div className="bg-red-900/30 border border-red-500/30 rounded-lg p-3">
            <p className="text-red-400 text-sm font-mono">{error}</p>
          </div>
        )}

        {loading && (
          <div className="flex items-center gap-2 text-gray-500 text-sm font-mono">
            <span className="animate-pulse">▋</span>
            <span>Loading sessions...</span>
          </div>
        )}

        {!loading && sessions.length === 0 && (
          <div className="bg-gray-800 rounded-lg p-8 text-center space-y-2">
            <p className="text-gray-400 font-mono">No saved sessions yet</p>
            <p className="text-gray-600 text-sm">Load a log file and click ☁️ Cloud Save in the nav to save it here</p>
          </div>
        )}

        {!loading && sessions.length > 0 && (
          <div className="space-y-3">
            {sessions.map((session) => (
              <div key={session.id} className="bg-gray-800 rounded-lg p-4 flex items-center justify-between gap-4">
                <div className="min-w-0">
                  <p className="text-gray-200 font-mono font-semibold truncate">{session.channel}</p>
                  <div className="flex items-center gap-3 mt-1">
                    <span className="text-gray-500 text-xs">{formatDate(session.savedAt)}</span>
                    <span className="text-gray-700 text-xs">&middot;</span>
                    <span className="text-gray-500 text-xs">{formatSize(session.size)}</span>
                    {session.date && (
                      <>
                        <span className="text-gray-700 text-xs">&middot;</span>
                        <span className="text-gray-500 text-xs">{session.date}</span>
                      </>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={() => handleRestore(session)}
                    disabled={restoring === session.id}
                    className="bg-green-500 hover:bg-green-400 disabled:opacity-50 text-black text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors"
                  >
                    {restoring === session.id ? 'Loading...' : '▶ Load'}
                  </button>
                  <button
                    onClick={() => handleDelete(session)}
                    disabled={deleting === session.id}
                    className="text-gray-600 hover:text-red-400 disabled:opacity-50 text-xs px-2 py-1.5 rounded transition-colors"
                  >
                    {deleting === session.id ? '...' : '✕'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="border-t border-gray-700 pt-4">
          <p className="text-gray-600 text-xs font-mono">
            {sessions.length} session{sessions.length !== 1 ? 's' : ''} saved
            {' '}&middot;{' '}
            Pro limit: 50 sessions
          </p>
        </div>

      </div>
    </div>
  )
}

export default Dashboard
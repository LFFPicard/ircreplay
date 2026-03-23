import { useState, useCallback, useEffect, useRef } from 'react'
import DropZone from '../components/DropZone'
import ChatPane from '../components/ChatPane'
import { useSession } from '../context/SessionContext'
import ParseWorker from '../workers/parseWorker.js?worker'

function Viewer() {
  const { session, setSession } = useSession()
  const [mode,          setMode         ] = useState('instant')
  const [phase,         setPhase        ] = useState(null)
  const [loadingFiles,  setLoadingFiles ] = useState([])
  const [currentFile,   setCurrentFile  ] = useState('')
  const [parseProgress, setParseProgress] = useState(0)
  const [mergeProgress, setMergeProgress] = useState(0)
  const workerRef = useRef(null)

  useEffect(() => {
    return () => workerRef.current?.terminate()
  }, [])

  const handleFilesStart = useCallback((filenames) => {
    setLoadingFiles(filenames)
    setParseProgress(0)
    setMergeProgress(0)
    setCurrentFile('')
    setPhase('reading')
  }, [])

  const handleFilesLoaded = useCallback((files, selectedMode) => {
    setPhase('parsing')
    workerRef.current?.terminate()

    const worker = new ParseWorker()

    workerRef.current = worker

    worker.onmessage = ({ data }) => {
      if (data.type === 'parseProgress') {
        setCurrentFile(data.filename)
        setParseProgress(data.current)
      }
      if (data.type === 'mergeStart') {
        setPhase('merging')
        setMergeProgress(0)
      }
      if (data.type === 'mergeProgress') {
        setMergeProgress(Math.round((data.current / data.total) * 100))
      }
      if (data.type === 'done') {
        setMode(selectedMode)
        setSession(data.session)
        setPhase(null)
        worker.terminate()
      }
    }

    worker.onerror = (err) => {
      console.error('Worker error:', err)
      setPhase(null)
    }

    worker.postMessage({ files })
  }, [setSession])

  if (phase !== null) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-6">
        <div className="w-12 h-12 border-4 border-green-400 border-t-transparent rounded-full animate-spin" />
        <p className="text-white font-mono text-lg">
          {phase === 'reading' && 'Reading log files...'}
          {phase === 'parsing' && 'Parsing log files...'}
          {phase === 'merging' && 'Merging sessions...'}
        </p>
        {phase === 'parsing' && (
          <div className="flex flex-col items-center gap-2 w-full max-w-sm">
            <p className="text-green-400 font-mono text-sm truncate max-w-full px-4">{currentFile}</p>
            <div className="w-full bg-gray-800 rounded-full h-2">
              <div className="bg-green-500 h-2 rounded-full transition-all duration-300" style={{ width: `${(parseProgress / loadingFiles.length) * 100}%` }} />
            </div>
            <p className="text-gray-600 font-mono text-xs">{parseProgress} of {loadingFiles.length} files</p>
          </div>
        )}
        {phase === 'parsing' && (
          <div className="flex flex-col items-center gap-1 max-h-48 overflow-y-auto">
            {loadingFiles.map((f, i) => (
              <p key={f} className={`font-mono text-xs ${i < parseProgress ? 'text-green-600' : i === parseProgress - 1 ? 'text-green-400' : 'text-gray-600'}`}>
                {i < parseProgress ? '✓' : i === parseProgress - 1 ? '▶' : '·'} {f}
              </p>
            ))}
          </div>
        )}
        {phase === 'merging' && (
          <div className="flex flex-col items-center gap-2 w-full max-w-sm">
            <div className="w-full bg-gray-800 rounded-full h-2">
              <div className="bg-green-500 h-2 rounded-full transition-all duration-300" style={{ width: `${mergeProgress}%` }} />
            </div>
            <p className="text-gray-600 font-mono text-xs">{mergeProgress}% &mdash; combining {loadingFiles.length} files...</p>
          </div>
        )}
      </div>
    )
  }

  if (!session) {
    return (
      <DropZone onFilesLoaded={handleFilesLoaded} onFilesStart={handleFilesStart} />
    )
  }

  return (
    <div className="flex flex-col h-full gap-2 p-4">
      <div className="flex items-center justify-between shrink-0">
        <div>
          <h2 className="text-xl font-bold text-green-400">{session.channel}</h2>
          <div className="flex items-center gap-3">
            <p className="text-gray-400 text-sm">{session.date}</p>
            {session.fileCount > 1 && (
              <span className="text-xs bg-green-900/50 text-green-400 px-2 py-0.5 rounded-full">{session.fileCount} files merged</span>
            )}
            <span className="text-xs bg-gray-800 text-gray-400 px-2 py-0.5 rounded-full">
              {mode === 'instant' ? '⚡ Instant' : '▶ Replay'}
            </span>
            <p className="text-gray-600 text-xs">{session.stats.totalMessages.toLocaleString()} messages &middot; {session.stats.uniqueChatters} chatters</p>
          </div>
        </div>
        <button onClick={() => { setSession(null); setPhase(null) }} className="text-sm text-gray-500 hover:text-white transition-colors">&larr; Load different log</button>
      </div>
      <div className="flex-1 overflow-hidden">
        <ChatPane session={session} mode={mode} />
      </div>
    </div>
  )
}

export default Viewer
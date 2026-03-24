import { useState, useCallback } from 'react'

function DropZone({ onFilesLoaded, onFilesStart, onSessionLoaded }) {
  const [isDragging, setIsDragging] = useState(false)
  const [error,      setError     ] = useState(null)
  const [mode,       setMode      ] = useState('instant')

  const handleFiles = useCallback((fileList) => {
    setError(null)
    const files = Array.from(fileList)

    // If a single .json file — restore saved session directly
    if (files.length === 1 && files[0].name.endsWith('.json')) {
      const reader = new FileReader()
      reader.onload = (e) => {
        try {
          onSessionLoaded(e.target.result)
        } catch {
          setError('Invalid IRCReplay session file')
        }
      }
      reader.readAsText(files[0], 'utf-8')
      return
    }

    // Otherwise handle as .log files
    const invalid = files.filter(f => !f.name.endsWith('.log'))
    if (invalid.length > 0) {
      setError(`Unsupported file type: ${invalid.map(f => f.name).join(', ')}`)
      return
    }

    onFilesStart?.(files.map(f => f.name))

    const results = []
    let index = 0

    function readNext() {
      if (index >= files.length) {
        onFilesLoaded(results, mode)
        return
      }
      const file = files[index]
      const reader = new FileReader()
      reader.onload = (e) => {
        results.push({ filename: file.name, rawText: e.target.result })
        index++
        readNext()
      }
      reader.readAsText(file, 'utf-8')
    }

    readNext()
  }, [onFilesLoaded, onFilesStart, onSessionLoaded, mode])

  const handleDrop = useCallback((e) => {
    e.preventDefault()
    setIsDragging(false)
    if (e.dataTransfer.files.length > 0) handleFiles(e.dataTransfer.files)
  }, [handleFiles])

  const handleDragOver  = (e) => { e.preventDefault(); setIsDragging(true) }
  const handleDragLeave = ()  => setIsDragging(false)
  const handleClick     = ()  => document.getElementById('log-file-input').click()
  const handleInputChange = (e) => { if (e.target.files.length > 0) handleFiles(e.target.files) }

  return (
    <div className="flex flex-col items-center justify-center h-full w-full gap-6 bg-gray-950 rounded-lg">

      {/* Mode toggle */}
      <div className="flex items-center gap-2 bg-gray-800 rounded-lg p-1">
        {['instant', 'replay'].map(m => (
          <button
            key={m}
            onClick={() => setMode(m)}
            className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors capitalize ${
              mode === m
                ? 'bg-green-500 text-black font-semibold'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            {m === 'instant' ? '⚡ Instant' : '▶ Replay'}
          </button>
        ))}
      </div>

      {/* Drop zone */}
      <div
        onClick={handleClick}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        className={`
          w-full max-w-lg border-2 border-dashed rounded-xl p-16
          flex flex-col items-center gap-4 cursor-pointer transition-all
          ${isDragging
            ? 'border-green-400 bg-green-400/10 scale-105'
            : 'border-gray-600 hover:border-green-500 hover:bg-gray-800/50'
          }
        `}
      >
        <div className="text-6xl">📂</div>
        <p className="text-xl font-semibold text-gray-200">Drop your IRC log files here</p>
        <p className="text-gray-400 text-sm">or click to browse</p>

        {/* How To */}
        <div className="mt-2 space-y-1.5 text-left w-full max-w-xs">
          {[
            ['1', 'Drop one or more mIRC .log files — or a saved .json session'],
            ['2', 'Select Instant to read immediately, or Replay to watch it unfold'],
            ['3', 'Switch to the Stats tab for charts, top chatters and word stats'],
            ['4', 'Export stats as HTML or PDF to share with old channel mates'],
            ['5', 'Save Session to reload instantly next time with .json — no orignal logs needed'],
          ].map(([num, text]) => (
            <div key={num} className="flex gap-2 text-xs text-gray-500">
              <span className="text-green-600 font-mono shrink-0">{num}.</span>
              <span>{text}</span>
            </div>
          ))}
        </div>

          <div className="flex items-center gap-3 mt-2">
          <span className="text-gray-600 text-xs">mIRC .log files</span>
          <span className="text-gray-700 text-xs">&middot;</span>
          <span className="text-gray-600 text-xs">IRCReplay .json sessions</span>
        </div>

        <div className="flex flex-col items-center gap-1 mt-3">
          <p className="text-green-400 text-xs text-center px-4">
            🔒 Your log files are processed entirely in your browser and never transmitted to any server
          </p>
          <div className="flex items-center gap-2 mt-2">
            <span className="text-gray-600 text-xs">No logs handy?</span>
            <button
              onClick={async (e) => {
                e.stopPropagation()
                onFilesStart?.(['ircreplay-demo.log'])
                const res  = await fetch('/ircreplay-demo.log')
                const text = await res.text()
                onFilesLoaded([{ filename: 'ircreplay-demo.log', rawText: text }], mode)
              }}
              className="text-green-400 hover:text-green-300 text-xs underline transition-colors"
            >
              Load the demo log
            </button>
          </div>
        </div>

      </div>
      {/* ↑ this closes the dashed drop zone border div */}

      {error && <p className="text-red-400 text-sm">{error}</p>}

      <input
        id="log-file-input"
        type="file"
        accept=".log,.json"
        multiple
        className="hidden"
        onChange={handleInputChange}
      />

    </div>
    )
}

export default DropZone
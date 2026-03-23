import { useState, useCallback } from 'react'

function DropZone({ onFilesLoaded, onFilesStart }) {
  const [isDragging, setIsDragging] = useState(false)
  const [error,      setError     ] = useState(null)
  const [mode,       setMode      ] = useState('instant')

  const handleFiles = useCallback((fileList) => {
    setError(null)
    const files = Array.from(fileList)

    const invalid = files.filter(f => !f.name.endsWith('.log'))
    if (invalid.length > 0) {
      setError(`Not .log files: ${invalid.map(f => f.name).join(', ')}`)
      return
    }

    onFilesStart?.(files.map(f => f.name))

    // Read files sequentially — one at a time, not all at once
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
  }, [onFilesLoaded, onFilesStart, mode])

  const handleDrop = useCallback((e) => {
    e.preventDefault()
    setIsDragging(false)
    if (e.dataTransfer.files.length > 0) handleFiles(e.dataTransfer.files)
  }, [handleFiles])

  const handleDragOver  = (e) => { e.preventDefault(); setIsDragging(true) }
  const handleDragLeave = () => setIsDragging(false)
  const handleClick     = () => document.getElementById('log-file-input').click()
  const handleInputChange = (e) => { if (e.target.files.length > 0) handleFiles(e.target.files) }

  return (
    <div className="flex flex-col items-center justify-center h-full w-full gap-6 bg-gray-950 rounded-1g">
      <div className="flex items-center gap-2 bg-gray-800 rounded-lg p-1">
        {['instant', 'replay'].map(m => (
          <button key={m} onClick={() => setMode(m)} className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors capitalize ${mode === m ? 'bg-green-500 text-black font-semibold' : 'text-gray-400 hover:text-white'}`}>{m === 'instant' ? '⚡ Instant' : '▶ Replay'}</button>
        ))}
      </div>
      <div onClick={handleClick} onDrop={handleDrop} onDragOver={handleDragOver} onDragLeave={handleDragLeave} className={`w-full max-w-lg border-2 border-dashed rounded-xl p-16 flex flex-col items-center gap-4 cursor-pointer transition-all ${isDragging ? 'border-green-400 bg-green-400/10 scale-105' : 'border-gray-600 hover:border-green-500 hover:bg-gray-800/50'}`}>
        <div className="text-6xl">📂</div>
        <p className="text-xl font-semibold text-gray-200">Drop your IRC log files here</p>
        <p className="text-gray-400 text-sm">or click to browse</p>
        <p className="text-gray-500 text-xs mt-1">You can select multiple files at once</p>
        <p className="text-gray-600 text-xs">Supports mIRC .log files</p>
      </div>
      {error && <p className="text-red-400 text-sm">{error}</p>}
      <input id="log-file-input" type="file" accept=".log" multiple className="hidden" onChange={handleInputChange} />
    </div>
  )
}

export default DropZone
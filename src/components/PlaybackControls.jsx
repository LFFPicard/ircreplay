import { SPEEDS } from '../hooks/usePlayback'

function PlaybackControls({ playback, session }) {
  const { isPlaying, play, pause, speedIndex, setSpeedIndex, progress, seek, isDone } = playback

  const handleProgressClick = (e) => {
    const rect = e.currentTarget.getBoundingClientRect()
    const fraction = (e.clientX - rect.left) / rect.width
    seek(fraction)
    if (!isPlaying && !isDone) play()
  }

  return (
    <div className="shrink-0 border-t border-gray-700 bg-gray-900 px-4 py-2 flex flex-col gap-2">

      {/* Progress bar */}
      <div
        className="w-full h-2 bg-gray-700 rounded-full cursor-pointer group"
        onClick={handleProgressClick}
      >
        <div
          className="h-full bg-green-500 rounded-full transition-all group-hover:bg-green-400"
          style={{ width: `${progress * 100}%` }}
        />
      </div>

      {/* Controls row */}
      <div className="flex items-center gap-3">

        {/* Play / Pause */}
        <button
          onClick={isPlaying ? pause : play}
          className="w-8 h-8 flex items-center justify-center rounded-full bg-green-500 hover:bg-green-400 text-black font-bold transition-colors"
        >
          {isDone ? '↺' : isPlaying ? '⏸' : '▶'}
        </button>

        {/* Speed buttons */}
        <div className="flex gap-1">
          {SPEEDS.map((s, i) => (
            <button
              key={s.label}
              onClick={() => setSpeedIndex(i)}
              className={`px-2 py-0.5 rounded text-xs font-mono transition-colors ${
                speedIndex === i
                  ? 'bg-green-500 text-black font-bold'
                  : 'text-gray-400 hover:text-white bg-gray-800'
              }`}
            >
              {s.label}
            </button>
          ))}
        </div>

        {/* Event counter */}
        <span className="text-gray-600 font-mono text-xs ml-auto">
          {playback.visibleCount.toLocaleString()} / {session.events.length.toLocaleString()} events
        </span>

      </div>
    </div>
  )
}

export default PlaybackControls
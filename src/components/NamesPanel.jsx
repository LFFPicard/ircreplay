function NamesPanel({ nicks }) {
  return (
    <div className="w-40 shrink-0 border-l border-gray-700 overflow-y-auto">
      <div className="px-3 py-2 text-xs text-gray-500 uppercase tracking-wider border-b border-gray-700">
        Users — {nicks.length}
      </div>
      <ul className="py-1">
        {nicks.map(nick => (
          <li
            key={nick}
            className="px-3 py-0.5 text-sm font-mono text-gray-300 hover:text-white hover:bg-white/5"
          >
            {nick}
          </li>
        ))}
      </ul>
    </div>
  )
}

export default NamesPanel
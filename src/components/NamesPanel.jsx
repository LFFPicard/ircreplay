function NamesPanel({ nicks }) {
  return (
    <div className="w-40 shrink-0 border-l border-gray-700 overflow-y-auto">
      <div className="px-3 py-2 text-xs text-gray-500 uppercase tracking-wider border-b border-gray-700">
        Users — {nicks.length}
      </div>
      <ul className="py-1">
        {nicks.map(({ nick, prefix }) => (
          <li key={nick} className="px-3 py-0.5 text-sm font-mono hover:bg-white/5 flex items-center gap-0.5">
            <span className={`shrink-0 w-3 ${
              prefix === '@' ? 'text-green-400' :
              prefix === '+' ? 'text-yellow-400' :
              'text-transparent'
            }`}>
              {prefix || '.'}
            </span>
            <span className={`truncate ${
              prefix === '@' ? 'text-green-300' :
              prefix === '+' ? 'text-yellow-300' :
              'text-gray-300'
            }`}>
              {nick}
            </span>
          </li>
        ))}
      </ul>
    </div>
  )
}

export default NamesPanel
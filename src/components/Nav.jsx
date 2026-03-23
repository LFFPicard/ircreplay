import { NavLink } from 'react-router-dom'
import { useTheme } from '../context/ThemeContext'
import { useSession } from '../context/SessionContext'
import { generateStatsHtml, downloadFile } from '../lib/exportHtml'
import { useState } from 'react'

const THEMES = [
  { id: 'light',   label: '☀️ Light'   },
  { id: 'dark',    label: '🌙 Dark'    },
  { id: 'classic', label: '💾 Classic' },
]

function Nav() {
  const { theme, setTheme }   = useTheme()
  const { session, stats }    = useSession()
  const [exportMode, setExportMode] = useState('html')

  const canExport = session && stats

  const handleExport = () => {
    if (!canExport) return

    const channel  = (session.channel || 'channel').replace(/[^a-zA-Z0-9_-]/g, '')
    const datePart = session.date
      ? session.date.replace(/[^a-zA-Z0-9]/g, '-').slice(0, 15)
      : 'stats'

    if (exportMode === 'html') {
      const html = generateStatsHtml(session, stats)
      downloadFile(`${channel}-${datePart}-ircreplay.html`, html, 'text/html')
    } else {
      // PDF via browser print dialog
      const html     = generateStatsHtml(session, stats)
      const printWin = window.open('', '_blank')
      printWin.document.write(html)
      printWin.document.close()
      printWin.onload = () => {
        printWin.print()
      }
    }
  }

  return (
    <nav className="flex items-center gap-6 px-6 py-4 bg-gray-900 text-white">
      <span className="font-bold text-lg text-green-400 mr-4">IRCReplay</span>

      <NavLink to="/" className={({ isActive }) => isActive ? 'text-green-400 font-semibold' : 'hover:text-green-400'}>
        Viewer
      </NavLink>
      <NavLink to="/stats" className={({ isActive }) => isActive ? 'text-green-400 font-semibold' : 'hover:text-green-400'}>
        Stats
      </NavLink>
      <NavLink to="/about" className={({ isActive }) => isActive ? 'text-green-400 font-semibold' : 'hover:text-green-400'}>
        About
      </NavLink>

      <div className="ml-auto flex items-center gap-3">

        {/* Export controls — only when session + stats are ready */}
        {canExport && (
          <div className="flex items-center gap-1">
            {/* Format toggle */}
            <div className="flex items-center gap-1 bg-gray-800 rounded-lg p-1">
              {['html', 'pdf'].map(m => (
                <button
                  key={m}
                  onClick={() => setExportMode(m)}
                  className={`px-2 py-1 rounded-md text-xs font-mono transition-colors uppercase ${
                    exportMode === m
                      ? 'bg-green-500 text-black font-semibold'
                      : 'text-gray-400 hover:text-white'
                  }`}
                >
                  {m}
                </button>
              ))}
            </div>
            {/* Export button */}
            <button
              onClick={handleExport}
              className="flex items-center gap-1.5 bg-green-500 hover:bg-green-400 text-black text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors"
            >
              ↓ Export
            </button>
          </div>
        )}

        {/* Theme switcher */}
        <div className="flex items-center gap-1 bg-gray-800 rounded-lg p-1">
          {THEMES.map(t => (
            <button
              key={t.id}
              onClick={() => setTheme(t.id)}
              className={`px-3 py-1 rounded-md text-sm transition-colors ${
                theme === t.id
                  ? 'bg-green-500 text-black font-semibold'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

      </div>
    </nav>
  )
}

export default Nav
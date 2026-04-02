import { useState } from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import { useTheme } from '../context/ThemeContext'
import { useSession } from '../context/SessionContext'
import { generateStatsHtml, downloadFile } from '../lib/exportHtml'
import { saveSession } from '../lib/exportSession'

const THEMES_DESKTOP = [
  { id: 'light',   label: '☀️ Light'   },
  { id: 'dark',    label: '🌙 Dark'    },
  { id: 'classic', label: '💾 Classic' },
]

const THEMES_MOBILE = [
  { id: 'light', label: '☀️' },
  { id: 'dark',  label: '🌙' },
]

const NAV_LINKS = [
  { to: '/',      label: 'Viewer' },
  { to: '/stats', label: 'Stats'  },
  { to: '/about', label: 'About'  },
  { to: '/help',  label: 'Help'   },
  { to: '/links', label: 'Links'  },
]

function Nav({ isMobile }) {
  const { theme, setTheme }   = useTheme()
  const { session, stats }    = useSession()
  const navigate              = useNavigate()
  const [menuOpen, setMenuOpen] = useState(false)
  const [exportMode, setExportMode] = useState('html')

  const canExport = session && stats
  const canSave   = !!session

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
      const html     = generateStatsHtml(session, stats)
      const printWin = window.open('', '_blank')
      printWin.document.write(html)
      printWin.document.close()
      printWin.onload = () => { printWin.print() }
    }
  }

  const handleSave = () => {
    if (!canSave) return
    saveSession(session)
  }

  const handleNavClick = (to) => {
    navigate(to)
    setMenuOpen(false)
  }

  const linkClass = ({ isActive }) =>
    isActive ? 'text-green-400 font-semibold' : 'hover:text-green-400 text-gray-300'

  // ── MOBILE NAV ───────────────────────────────────────────────────
  if (isMobile) {
    return (
      <>
        <nav className="flex items-center justify-between px-4 py-3 bg-gray-900 text-white shrink-0">
          {/* Logo */}
          <span className="font-bold text-lg text-green-400">IRCReplay</span>

          <div className="flex items-center gap-2">
            {/* Mobile theme switcher — Light/Dark only */}
            <div className="flex items-center gap-1 bg-gray-800 rounded-lg p-1">
              {THEMES_MOBILE.map(t => (
                <button
                  key={t.id}
                  onClick={() => setTheme(t.id)}
                  className={`px-2 py-1 rounded-md text-sm transition-colors ${
                    theme === t.id
                      ? 'bg-green-500 text-black font-semibold'
                      : 'text-gray-400 hover:text-white'
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>

            {/* Hamburger button */}
            <button
              onClick={() => setMenuOpen(!menuOpen)}
              className="flex flex-col justify-center items-center w-8 h-8 gap-1.5 text-gray-300 hover:text-white"
              aria-label="Toggle menu"
            >
              <span className={`block w-5 h-0.5 bg-current transition-all ${menuOpen ? 'rotate-45 translate-y-2' : ''}`} />
              <span className={`block w-5 h-0.5 bg-current transition-all ${menuOpen ? 'opacity-0' : ''}`} />
              <span className={`block w-5 h-0.5 bg-current transition-all ${menuOpen ? '-rotate-45 -translate-y-2' : ''}`} />
            </button>
          </div>
        </nav>

        {/* Mobile dropdown menu */}
        {menuOpen && (
          <div className="bg-gray-900 border-t border-gray-700 flex flex-col shrink-0">
            {/* Nav links */}
            {NAV_LINKS.map(link => (
              <button
                key={link.to}
                onClick={() => handleNavClick(link.to)}
                className="text-left px-6 py-3 text-gray-300 hover:text-green-400 hover:bg-gray-800 transition-colors border-b border-gray-800 text-sm"
              >
                {link.label}
              </button>
            ))}

            {/* Save / Export in menu on mobile */}
            {canSave && (
              <button
                onClick={() => { handleSave(); setMenuOpen(false) }}
                className="text-left px-6 py-3 text-gray-300 hover:text-green-400 hover:bg-gray-800 transition-colors border-b border-gray-800 text-sm"
              >
                💾 Save Session
              </button>
            )}
            {canExport && (
              <div className="px-6 py-3 border-b border-gray-800 flex items-center gap-2">
                <span className="text-gray-400 text-sm">Export:</span>
                {['html', 'pdf'].map(m => (
                  <button
                    key={m}
                    onClick={() => setExportMode(m)}
                    className={`px-2 py-0.5 rounded text-xs font-mono uppercase transition-colors ${
                      exportMode === m
                        ? 'bg-green-500 text-black font-semibold'
                        : 'text-gray-400 hover:text-white bg-gray-800'
                    }`}
                  >
                    {m}
                  </button>
                ))}
                <button
                  onClick={() => { handleExport(); setMenuOpen(false) }}
                  className="bg-green-500 hover:bg-green-400 text-black text-xs font-semibold px-3 py-1 rounded-lg transition-colors"
                >
                  ↓ Export
                </button>
              </div>
            )}
          </div>
        )}
      </>
    )
  }

  // ── DESKTOP NAV ──────────────────────────────────────────────────
  return (
    <nav className="flex items-center gap-6 px-6 py-4 bg-gray-900 text-white shrink-0">
      <span className="font-bold text-lg text-green-400 mr-4">IRCReplay</span>

      {NAV_LINKS.map(link => (
        <NavLink key={link.to} to={link.to} className={linkClass}>
          {link.label}
        </NavLink>
      ))}

      <div className="ml-auto flex items-center gap-3">
        {canSave && (
          <button
            onClick={handleSave}
            title="Save session as JSON — reload later without re-uploading logs"
            className="flex items-center gap-1.5 text-gray-400 hover:text-white border border-gray-600 hover:border-gray-400 text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors"
          >
            💾 Save Session
          </button>
        )}
        {canExport && (
          <div className="flex items-center gap-1">
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
            <button
              onClick={handleExport}
              className="flex items-center gap-1.5 bg-green-500 hover:bg-green-400 text-black text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors"
            >
              ↓ Export
            </button>
          </div>
        )}
        <div className="flex items-center gap-1 bg-gray-800 rounded-lg p-1">
          {THEMES_DESKTOP.map(t => (
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
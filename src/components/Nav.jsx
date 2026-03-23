import { NavLink } from 'react-router-dom'
import { useTheme } from '../context/ThemeContext'

const THEMES = [
  { id: 'light',   label: '☀️ Light'   },
  { id: 'dark',    label: '🌙 Dark'    },
  { id: 'classic', label: '💾 Classic' },
]

function Nav() {
  const { theme, setTheme } = useTheme()

  return (
    <nav className="flex items-center gap-6 px-6 py-4 bg-gray-900 text-white">
      <span className="font-bold text-lg text-green-400 mr-4">IRCReplay</span>

      <NavLink
        to="/"
        className={({ isActive }) => isActive ? 'text-green-400 font-semibold' : 'hover:text-green-400'}
      >
        Viewer
      </NavLink>
      <NavLink
        to="/stats"
        className={({ isActive }) => isActive ? 'text-green-400 font-semibold' : 'hover:text-green-400'}
      >
        Stats
      </NavLink>
      <NavLink
        to="/about"
        className={({ isActive }) => isActive ? 'text-green-400 font-semibold' : 'hover:text-green-400'}
      >
        About
      </NavLink>

      {/* Theme switcher — pushed to the right */}
      <div className="ml-auto flex items-center gap-1 bg-gray-800 rounded-lg p-1">
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
    </nav>
  )
}

export default Nav
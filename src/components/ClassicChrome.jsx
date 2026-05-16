import { useNavigate, useLocation } from 'react-router-dom'
import { useSession } from '../context/SessionContext'
import { useTheme } from '../context/ThemeContext'
import { useUser } from '../context/UserContext'
import { Show, SignInButton, UserButton, useAuth } from '@clerk/react'
import { saveSession } from '../lib/exportSession'

const FONT = "'Fixedsys Excelsior', 'Courier New', monospace"
const CLASSIC_GREY = '#c0c0c0'
const NAVY = '#000080'

const insetBorder  = { border: '2px solid', borderColor: '#808080 #ffffff #ffffff #808080' }
const raisedBorder = { border: '2px solid', borderColor: '#ffffff #808080 #808080 #ffffff' }

function TitleButton({ label }) {
  return (
    <button style={{
      width: '16px', height: '14px', fontSize: '9px',
      backgroundColor: CLASSIC_GREY, fontFamily: FONT,
      ...raisedBorder, cursor: 'default', display: 'flex',
      alignItems: 'center', justifyContent: 'center',
      padding: 0, lineHeight: 1,
    }}>
      {label}
    </button>
  )
}

function MenuBtn({ label, active, onClick }) {
  return (
    <button onClick={onClick} style={{
      fontFamily: FONT, fontSize: '11px', padding: '2px 6px',
      backgroundColor: active ? NAVY : 'transparent',
      color: active ? '#ffffff' : '#000000',
      border: 'none', cursor: 'default', whiteSpace: 'nowrap',
    }}>
      {label}
    </button>
  )
}

function ToolbarBtn({ label, title, onClick }) {
  return (
    <button onClick={onClick} title={title} style={{
      width: '24px', height: '22px', fontSize: '13px',
      backgroundColor: CLASSIC_GREY, ...raisedBorder,
      cursor: 'default', display: 'flex',
      alignItems: 'center', justifyContent: 'center', padding: 0,
    }}>
      {label}
    </button>
  )
}

function StatusPanel({ text, minWidth }) {
  return (
    <div style={{
      fontSize: '11px', color: '#000000', padding: '1px 6px',
      fontFamily: FONT, ...insetBorder,
      minWidth: minWidth || 'auto',
      whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
    }}>
      {text}
    </div>
  )
}

function ClassicChrome({ children }) {
  const { session }         = useSession()
  const { theme, setTheme } = useTheme()
  const { isPremium }       = useUser()
  const { userId }          = useAuth()
  const navigate            = useNavigate()
  const location            = useLocation()

  const channel  = session?.channel || '#channel'
  const title    = `mIRC - [${channel}]`
  const messages = session?.stats?.totalMessages?.toLocaleString() || '0'
  const users    = session?.stats?.uniqueChatters || '0'

  const fakeMenus = ['File', 'View', 'Favorites', 'Tools', 'Window', 'Help']

  const navItems = [
    { label: 'Viewer',  path: '/'         },
    { label: 'Stats',   path: '/stats'    },
    { label: 'About',   path: '/about'    },
    { label: 'Help',    path: '/help'     },
    { label: 'Links',   path: '/links'    },
    { label: 'Pricing', path: '/pricing'  },
    { label: '⚡ Pro',   path: '/pro'      },
  ]

  if (isPremium && userId) {
    navItems.push({ label: 'Dashboard', path: '/dashboard' })
  }

  const themes = [
    { id: 'light',   label: '☀' },
    { id: 'dark',    label: '🌙' },
    { id: 'classic', label: '💾' },
  ]

  const handleSave = () => {
    if (session) saveSession(session)
  }

  const handleCloudSave = async () => {
    if (!session || !userId) return
    try {
      const compactEvents = session.events.map(({ raw, ...rest }) => rest)
      const exportData = {
        version: 1, savedAt: new Date().toISOString(),
        channel: session.channel, date: session.date,
        dateEnd: session.dateEnd, fileCount: session.fileCount,
        nicks: session.nicks, stats: session.stats,
        events: compactEvents,
      }
      const res  = await fetch('/api/logs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-User-Id': userId },
        body: JSON.stringify(exportData),
      })
      const data = await res.json()
      if (!data.saved) throw new Error(data.error || 'Save failed')
      const shareUrl = `${window.location.origin}/s/${userId}/${data.sessionId}`
      await navigator.clipboard.writeText(shareUrl)
      alert(`Session saved! Share link copied:\n${shareUrl}`)
    } catch (err) {
      alert('Cloud save failed — please try again')
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', overflow: 'hidden', backgroundColor: CLASSIC_GREY, fontFamily: FONT }}>

      {/* ── TITLE BAR ──────────────────────────────────────────────── */}
      <div style={{ background: `linear-gradient(to right, ${NAVY}, #1084d0)`, padding: '3px 4px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', userSelect: 'none', flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
          <span style={{ fontSize: '12px' }}>💬</span>
          <span style={{ color: '#ffffff', fontSize: '11px', fontFamily: FONT, fontWeight: 'bold' }}>{title}</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {/* Theme switcher */}
          <div style={{ display: 'flex', gap: '2px', marginRight: '6px' }}>
            {themes.map(t => (
              <button key={t.id} onClick={() => setTheme(t.id)} title={t.id} style={{
                height: '16px', padding: '0 6px', fontSize: '10px', fontFamily: FONT,
                fontWeight: theme === t.id ? 'bold' : 'normal',
                backgroundColor: theme === t.id ? '#ffffff' : CLASSIC_GREY,
                color: theme === t.id ? NAVY : '#000000',
                cursor: 'pointer', ...raisedBorder,
                display: 'flex', alignItems: 'center', justifyContent: 'center', whiteSpace: 'nowrap',
              }}>
                {t.label} {t.id.charAt(0).toUpperCase() + t.id.slice(1)}
              </button>
            ))}
          </div>
          {/* Auth — sign in button or user avatar */}
          <Show when="signed-out">
            <SignInButton mode="modal">
              <button style={{
                height: '16px', padding: '0 6px', fontSize: '10px', fontFamily: FONT,
                backgroundColor: CLASSIC_GREY, color: '#000000',
                cursor: 'pointer', ...raisedBorder,
                display: 'flex', alignItems: 'center',
              }}>
                Sign In
              </button>
            </SignInButton>
          </Show>
          <Show when="signed-in">
            <UserButton afterSignOutUrl="/" />
          </Show>
          {/* Window buttons */}
          <div style={{ display: 'flex', gap: '2px' }}>
            <TitleButton label="_" />
            <TitleButton label="□" />
            <TitleButton label="✕" />
          </div>
        </div>
      </div>

      {/* ── MENU BAR ───────────────────────────────────────────────── */}
      <div style={{ backgroundColor: CLASSIC_GREY, borderBottom: `1px solid #808080`, padding: '1px 2px', display: 'flex', alignItems: 'center', flexShrink: 0 }}>
        {fakeMenus.map(item => <MenuBtn key={item} label={item} />)}
        <div style={{ width: '1px', height: '16px', backgroundColor: '#808080', margin: '0 4px' }} />
        {navItems.map(item => (
          <MenuBtn key={item.path} label={item.label} active={location.pathname === item.path} onClick={() => navigate(item.path)} />
        ))}
      </div>

      {/* ── TOOLBAR ────────────────────────────────────────────────── */}
      <div style={{ backgroundColor: CLASSIC_GREY, borderBottom: `2px solid #808080`, padding: '2px 4px', display: 'flex', alignItems: 'center', gap: '2px', flexShrink: 0 }}>
        <ToolbarBtn label="📁" title="Load Log" onClick={() => navigate('/')} />
        <ToolbarBtn label="💾" title="Save Session" onClick={handleSave} />
        <ToolbarBtn label="📊" title="View Stats" onClick={() => navigate('/stats')} />
        {isPremium && userId && session && (
          <ToolbarBtn label="☁️" title="Cloud Save" onClick={handleCloudSave} />
        )}
        <div style={{ width: '1px', height: '20px', backgroundColor: '#808080', margin: '0 2px' }} />
        <ToolbarBtn label="⚙️" title="Options" />
        <ToolbarBtn label="❓" title="Help" onClick={() => navigate('/help')} />
        <div style={{ width: '1px', height: '20px', backgroundColor: '#808080', margin: '0 4px' }} />
        <span style={{ fontSize: '11px', color: '#000000', fontFamily: FONT }}>IRCReplay.app — Relive the chat</span>
      </div>

      {/* ── MAIN CONTENT ───────────────────────────────────────────── */}
      <div style={{ flex: 1, overflow: 'hidden', padding: '4px', minHeight: 0 }}>
        {children}
      </div>

      {/* ── STATUS BAR ─────────────────────────────────────────────── */}
      <div style={{ backgroundColor: CLASSIC_GREY, borderTop: `1px solid #808080`, padding: '2px 4px', display: 'flex', alignItems: 'center', gap: '4px', flexShrink: 0 }}>
        <StatusPanel text={session ? `Connected · ${channel}` : 'No log loaded — use Viewer to load a .log file'} minWidth="220px" />
        {session && <StatusPanel text={`${messages} messages`} minWidth="120px" />}
        {session && <StatusPanel text={`${users} users`} minWidth="80px" />}
        <div style={{ flex: 1 }} />
        <StatusPanel text="© 2026 IRCReplay.app" />
        <a href="/terms"   className="text-gray-600 hover:text-gray-400 text-xs transition-colors">Terms</a>
        <a href="/privacy" className="text-gray-600 hover:text-gray-400 text-xs transition-colors">Privacy</a>
        <a href="/refunds" className="text-gray-600 hover:text-gray-400 text-xs transition-colors">Refunds</a>
        <a href="https://ko-fi.com/baggins83" target="_blank" rel="noopener noreferrer" style={{ fontSize: '11px', color: NAVY, fontFamily: FONT, padding: '1px 4px', ...insetBorder, textDecoration: 'none' }}>Ko-fi</a>
        <a href="https://www.paypal.com/paypalme/garyt83" target="_blank" rel="noopener noreferrer" style={{ fontSize: '11px', color: NAVY, fontFamily: FONT, padding: '1px 4px', ...insetBorder, textDecoration: 'none' }}>PayPal</a>
      </div>

    </div>
  )
}

export default ClassicChrome
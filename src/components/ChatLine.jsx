import { MIRC_COLOURS } from '../lib/parser'
import { useTheme } from '../context/ThemeContext'

// Colours invisible on dark backgrounds — remap them
const DARK_REMAP = {
  1: '#dddddd',  // black → light grey
  2: '#6699ff',  // navy → lighter blue
}

// Colours invisible on light backgrounds
const LIGHT_REMAP = {
  0: '#aaaaaa',  // white → mid grey
  8: '#aaaa00',  // yellow → darker yellow
  9: '#00aa00',  // bright lime → darker green
}

function Timestamp({ time }) {
  if (!time) return null
  return (
    <span className="text-gray-500 text-xs select-none mr-2 shrink-0">
      [{time}]
    </span>
  )
}

function Nick({ nick, colour, bracket = true }) {
  const { theme } = useTheme()

  let hexColour = null

  if (colour != null) {
    // Colour code present — apply theme-aware remapping
    if (theme === 'classic') {
      hexColour = '#000000'
    } else if (theme === 'dark') {
      hexColour = DARK_REMAP[colour] ?? MIRC_COLOURS[colour]
    } else {
      hexColour = LIGHT_REMAP[colour] ?? MIRC_COLOURS[colour]
    }
  } else {
    // No colour code — use theme default so nicks are always visible
    if (theme === 'dark')    hexColour = '#a3e635'  // lime green — distinct from message text
    if (theme === 'light')   hexColour = '#166534'  // dark green
    if (theme === 'classic') hexColour = '#000000'  // black
  }

  const style = hexColour ? { color: hexColour } : {}

  return (
    <span className="shrink-0 mr-2 font-mono" style={style}>
      {bracket ? `<${nick}>` : nick}
    </span>
  )
}

function ChatLine({ event }) {
  const { type, timestamp, nick, text, colour } = event

  // ── REGULAR MESSAGE ───────────────────────────────────────────────
  if (type === 'message') {
    return (
      <div className="flex items-baseline py-0.5 hover:bg-white/5 px-2 rounded font-mono text-sm">
        <Timestamp time={timestamp} />
        <Nick nick={nick} colour={colour} />
        <span className="text-gray-200 break-words min-w-0">{text}</span>
      </div>
    )
  }

  // ── ACTION: * nick does something ─────────────────────────────────
  if (type === 'action') {
    return (
      <div className="flex items-baseline py-0.5 hover:bg-white/5 px-2 rounded font-mono text-sm">
        <Timestamp time={timestamp} />
        <span className="text-purple-400 italic break-words min-w-0">
          * <Nick nick={nick} colour={colour} bracket={false} />
          {text}
        </span>
      </div>
    )
  }

  // ── JOIN ──────────────────────────────────────────────────────────
  if (type === 'join') {
    return (
      <div className="flex items-baseline py-0.5 px-2 font-mono text-xs">
        <Timestamp time={timestamp} />
        <span className="text-green-600">*** {text}</span>
      </div>
    )
  }

  // ── QUIT ──────────────────────────────────────────────────────────
  if (type === 'quit') {
    return (
      <div className="flex items-baseline py-0.5 px-2 font-mono text-xs">
        <Timestamp time={timestamp} />
        <span className="text-red-700">*** {text}</span>
      </div>
    )
  }

  // ── PART ──────────────────────────────────────────────────────────
  if (type === 'part') {
    return (
      <div className="flex items-baseline py-0.5 px-2 font-mono text-xs">
        <Timestamp time={timestamp} />
        <span className="text-red-800">*** {text}</span>
      </div>
    )
  }

  // ── NICK CHANGE ───────────────────────────────────────────────────
  if (type === 'nick') {
    return (
      <div className="flex items-baseline py-0.5 px-2 font-mono text-xs">
        <Timestamp time={timestamp} />
        <span className="text-yellow-600">*** {text}</span>
      </div>
    )
  }

  // ── MODE CHANGE ───────────────────────────────────────────────────
  if (type === 'mode') {
    return (
      <div className="flex items-baseline py-0.5 px-2 font-mono text-xs">
        <Timestamp time={timestamp} />
        <span className="text-gray-500">*** {text}</span>
      </div>
    )
  }

  // ── NOTICE ────────────────────────────────────────────────────────
  if (type === 'notice') {
    return (
      <div className="flex items-baseline py-0.5 px-2 font-mono text-sm">
        <Timestamp time={timestamp} />
        <span className="text-yellow-400">
          -{nick}- {text}
        </span>
      </div>
    )
  }

  // ── KICK ─────────────────────────────────────────────────────────
  if (type === 'kick') {
    return (
      <div className="flex items-baseline py-0.5 px-2 font-mono text-xs">
        <Timestamp time={timestamp} />
        <span className="text-orange-600">*** {text}</span>
      </div>
    )
  }



  // ── TOPIC ─────────────────────────────────────────────────────────
  if (type === 'topic') {
    return (
      <div className="flex items-baseline py-0.5 px-2 font-mono text-xs">
        <Timestamp time={timestamp} />
        <span className="text-cyan-600">*** Topic: {text}</span>
      </div>
    )
  }

  // ── SYSTEM ────────────────────────────────────────────────────────
  if (type === 'system') {
    return (
      <div className="flex items-baseline py-0.5 px-2 font-mono text-xs">
        <Timestamp time={timestamp} />
        <span className="text-gray-500">*** {text}</span>
      </div>
    )
  }

  // ── SESSION ───────────────────────────────────────────────────────
  if (type === 'session') {
    return (
      <div className="py-1 px-2 font-mono text-xs text-gray-600 italic">
        {text}
      </div>
    )
  }

  // ── INFO / UNKNOWN — skip ─────────────────────────────────────────
  return null
}

export default ChatLine
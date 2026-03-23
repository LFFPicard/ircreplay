/**
 * IRCReplay Log Parser
 * Handles multiple mIRC log formats with auto-detection.
 *
 * Format A — mIRC with binary control codes (your personal logs):
 *   \x03NN[HH:MM]\x03 content
 *
 * Format B — mIRC plain text (no control codes, e.g. mIRCStats sample logs):
 *   [HH:MM] content
 */

// ─────────────────────────────────────────────
// mIRC COLOUR PALETTE
// ─────────────────────────────────────────────

const MIRC_COLOURS = [
  '#FFFFFF', '#000000', '#00007F', '#009300', '#FF0000', '#7F0000',
  '#9C009C', '#FC7F00', '#FFFF00', '#00FC00', '#009393', '#00FFFF',
  '#0000FC', '#FF00FF', '#7F7F7F', '#D2D2D2',
]

const MIRC_COLOUR_NAMES = [
  'white', 'black', 'navy', 'green', 'red', 'maroon',
  'purple', 'olive', 'yellow', 'lime', 'teal', 'cyan',
  'royal', 'pink', 'grey', 'silver',
]

// ─────────────────────────────────────────────
// CONTROL CODE HELPERS
// ─────────────────────────────────────────────

function stripControlCodes(str) {
  if (!str) return ''
  return str
    .replace(/\x03\d{0,2}(,\d{1,2})?/g, '')
    .replace(/[\x02\x0F\x16\x1F]/g, '')
    .trim()
}

function extractColour(str) {
  const m = str.match(/\x03(\d{1,2})/)
  return m ? parseInt(m[1], 10) : null
}

// ─────────────────────────────────────────────
// FORMAT DETECTION
// ─────────────────────────────────────────────

/**
 * Inspects the first 30 lines and returns the detected format:
 *   'binary'    — mIRC with \x03 control codes (Format A)
 *   'plaintext' — mIRC plain text no control codes (Format B)
 */
function detectFormat(lines) {
  for (const line of lines.slice(0, 30)) {
    if (!line.trim()) continue
    // Binary format has \x03 before the timestamp
    if (/^\x03\d{1,2}\[/.test(line)) return 'binary'
    // Plain text has timestamp directly at start
    if (/^\[\d{1,2}:\d{2}\]/.test(line)) return 'plaintext'
    // Session headers exist in both — skip them
    if (/^Session (Start|Close|Ident|Time):/.test(line)) continue
  }
  return 'plaintext'
}

// ─────────────────────────────────────────────
// TIMESTAMP
// ─────────────────────────────────────────────

function parseTimestamp(line) {
  const m = line.match(/\[(\d{1,2}:\d{2})\]/)
  return m ? m[1] : null
}

function stripBinaryTimestampPrefix(line) {
  return line.replace(/^\x03\d{1,2}\[\d{1,2}:\d{2}\]\x03\s*/, '').trim()
}

function stripPlainTimestampPrefix(line) {
  return line.replace(/^\[\d{1,2}:\d{2}\]\s*/, '').trim()
}

// ─────────────────────────────────────────────
// SHARED EVENT BUILDERS
// Used by both parsers — same output shape regardless of format
// ─────────────────────────────────────────────

function makeEvent(overrides = {}) {
  return {
    type:     'unknown',
    timestamp: null,
    nick:     null,
    text:     null,
    rawText:  null,
    colour:   null,
    hostmask: null,
    extra:    {},
    raw:      '',
    ...overrides,
  }
}

/**
 * Parses the body (post-timestamp content) for system/event lines.
 * Used by both parsers since *** lines are the same in both formats.
 * Returns a partial event object or null if not a system line.
 */
function parseSystemBody(body, timestamp, rawLine) {
  const clean = stripControlCodes(body)

  // Action: * nick text
  if (body.startsWith('* ') && !body.startsWith('***')) {
    const m = body.match(/^\*\s+(\S+)\s*(.*)/)
    if (m) return makeEvent({ type: 'action', timestamp, nick: m[1], text: stripControlCodes(m[2]), rawText: m[2], raw: rawLine })
  }

  // Join
  const join = clean.match(/^\*\*\*\s+(\S+)\s+\((.+?)\)\s+has joined\s+(\S+)/)
  if (join) return makeEvent({ type: 'join', timestamp, nick: join[1], hostmask: join[2], extra: { channel: join[3] }, text: `${join[1]} has joined ${join[3]}`, raw: rawLine })

  // Quit
  const quit = clean.match(/^\*\*\*\s+(\S+)\s+(?:\((.+?)\)\s+)?Quit(?:\s+\((.+?)\))?/)
  if (quit) {
    const reason = quit[3] || ''
    return makeEvent({ type: 'quit', timestamp, nick: quit[1], hostmask: quit[2] || null, extra: { reason }, text: reason ? `${quit[1]} has quit (${reason})` : `${quit[1]} has quit`, raw: rawLine })
  }

  // Part
  const part = clean.match(/^\*\*\*\s+(\S+)\s+(?:\((.+?)\)\s+)?has left\s+(\S+)(?:\s+\((.+)\))?/)
  if (part) return makeEvent({ type: 'part', timestamp, nick: part[1], hostmask: part[2] || null, extra: { channel: part[3], reason: part[4] || '' }, text: `${part[1]} has left ${part[3]}`, raw: rawLine })

  // Nick change
  const nick = clean.match(/^\*\*\*\s+(\S+)\s+is now known as\s+(\S+)/)
  if (nick) return makeEvent({ type: 'nick', timestamp, nick: nick[1], extra: { newNick: nick[2] }, text: `${nick[1]} is now known as ${nick[2]}`, raw: rawLine })

  // Kick
  const kick = clean.match(/^\*\*\*\s+(\S+)\s+was kicked by\s+(\S+)(?:\s+\((.+)\))?/)
  if (kick) return makeEvent({ type: 'kick', timestamp, nick: kick[1], extra: { by: kick[2], reason: kick[3] || '' }, text: `${kick[1]} was kicked by ${kick[2]}${kick[3] ? ` (${kick[3]})` : ''}`, raw: rawLine })

  // Mode
  const mode = clean.match(/^\*\*\*\s+(\S+)\s+sets mode:\s+(.+)/)
  if (mode) return makeEvent({ type: 'mode', timestamp, nick: mode[1], extra: { modeString: mode[2].trim() }, text: `${mode[1]} sets mode: ${mode[2].trim()}`, raw: rawLine })

  // Topic change
  const topic = clean.match(/^\*\*\*\s+(\S+)\s+changes topic to\s+'(.*)'/)
  if (topic) return makeEvent({ type: 'topic', timestamp, nick: topic[1], text: topic[2], extra: { setBy: topic[1] }, raw: rawLine })

  // Self join
  const selfJoin = clean.match(/^\*\*\*\s+Now talking in\s+(.+)/)
  if (selfJoin) return makeEvent({ type: 'system', timestamp, extra: { subtype: 'self-join', channel: selfJoin[1].trim() }, text: `Now talking in ${selfJoin[1].trim()}`, raw: rawLine })

  // Any other *** line
  if (clean.startsWith('***')) return makeEvent({ type: 'system', timestamp, text: clean.replace(/^\*\*\*\s*/, ''), raw: rawLine })

  return null
}

// ─────────────────────────────────────────────
// FORMAT A — BINARY (your personal mIRC logs)
// ─────────────────────────────────────────────

function parseLineBinary(rawLine) {
  const timestamp = parseTimestamp(rawLine)
  const event     = makeEvent({ timestamp, raw: rawLine })

  if (/^Session Start:/.test(rawLine)) return { ...event, type: 'session', extra: { sessionType: 'start' }, text: rawLine.replace('Session Start:', '').trim() }
  if (/^Session Close:/.test(rawLine)) return { ...event, type: 'session', extra: { sessionType: 'close' }, text: rawLine.replace('Session Close:', '').trim() }
  if (/^Session Ident:/.test(rawLine)) {
    const m = rawLine.match(/Session Ident:\s*(.+)/)
    const ch = m ? m[1].trim() : ''
    return { ...event, type: 'session', extra: { sessionType: 'ident', channel: ch }, text: ch }
  }

  const body  = stripBinaryTimestampPrefix(rawLine)
  if (!body) return event

  const sys = parseSystemBody(body, timestamp, rawLine)
  if (sys) return sys

  const clean = stripControlCodes(body)

  // Notice
  const notice = clean.match(/^-(.+?)-\s*(.+)/)
  if (notice) return { ...event, type: 'notice', nick: notice[1].trim(), text: notice[2].trim() }

  // Topic info block
  const topicInfo = clean.match(/\[(.+?)\]\s+topic-\s*(.+)/)
  if (topicInfo) return { ...event, type: 'topic', extra: { channel: topicInfo[1].trim() }, text: topicInfo[2].trim() }

  // Message (nick): format
  const msgParen = clean.match(/^\((\S+?)\):\s*(.*)/)
  if (msgParen) return { ...event, type: 'message', nick: msgParen[1], text: msgParen[2], rawText: body, colour: extractColour(body) }

  // Message <nick> format
  const msgAngle = clean.match(/^<\+?(\S+?)>\s*(.*)/)
  if (msgAngle) return { ...event, type: 'message', nick: msgAngle[1], text: msgAngle[2], rawText: body, colour: extractColour(body) }

  event.text = clean
  return event
}

// ─────────────────────────────────────────────
// FORMAT B — PLAIN TEXT (mIRCStats sample, no control codes)
// ─────────────────────────────────────────────

function parseLinePlainText(rawLine) {
  const timestamp = parseTimestamp(rawLine)
  const event     = makeEvent({ timestamp, raw: rawLine })

  // Session markers
  if (/^Session Start:/.test(rawLine)) return { ...event, type: 'session', extra: { sessionType: 'start' }, text: rawLine.replace('Session Start:', '').trim() }
  if (/^Session Close:/.test(rawLine)) return { ...event, type: 'session', extra: { sessionType: 'close' }, text: rawLine.replace('Session Close:', '').trim() }
  if (/^Session Time:/.test(rawLine))  return { ...event, type: 'session', extra: { sessionType: 'time'  }, text: rawLine.replace('Session Time:', '').trim() }
  if (/^Session Ident:/.test(rawLine)) {
    const m = rawLine.match(/Session Ident:\s*(.+)/)
    const ch = m ? m[1].trim() : ''
    return { ...event, type: 'session', extra: { sessionType: 'ident', channel: ch }, text: ch }
  }

  const body = stripPlainTimestampPrefix(rawLine)
  if (!body) return event

  const sys = parseSystemBody(body, timestamp, rawLine)
  if (sys) return sys

  // Notice: -nick- text
  const notice = body.match(/^-(.+?)-\s*(.+)/)
  if (notice) return { ...event, type: 'notice', nick: notice[1].trim(), text: notice[2].trim() }

  // Message <nick> or <+nick> (voiced)
  const msgAngle = body.match(/^<\+?(\S+?)>\s*(.*)/)
  if (msgAngle) return { ...event, type: 'message', nick: msgAngle[1], text: msgAngle[2], rawText: body }

  event.text = body
  return event
}

// ─────────────────────────────────────────────
// FULL LOG PARSER
// ─────────────────────────────────────────────

function parseLog(rawText) {
  const lines  = rawText.split('\n')
  const format = detectFormat(lines)
  const parseFn = format === 'binary' ? parseLineBinary : parseLinePlainText

  const events = []
  let channel     = null
  let sessionDate = null

  for (const line of lines) {
    const trimmed = line.trim()
    if (!trimmed) continue

    const event = parseFn(trimmed)
    events.push(event)

    if (event.type === 'session') {
      if (event.extra.sessionType === 'start') sessionDate = event.text
      if (event.extra.sessionType === 'ident') channel = event.extra.channel
    }
    if (event.type === 'system' && event.extra.subtype === 'self-join') {
      channel = channel || event.extra.channel
    }
  }

  const nickSet = new Set()
  for (const e of events) {
    if (e.nick && (e.type === 'message' || e.type === 'action')) nickSet.add(e.nick)
  }

  const stats = {
    totalMessages:    events.filter(e => e.type === 'message').length,
    totalActions:     events.filter(e => e.type === 'action').length,
    totalJoins:       events.filter(e => e.type === 'join').length,
    totalQuits:       events.filter(e => e.type === 'quit').length,
    totalParts:       events.filter(e => e.type === 'part').length,
    totalNickChanges: events.filter(e => e.type === 'nick').length,
    uniqueChatters:   nickSet.size,
    unknownLines:     events.filter(e => e.type === 'unknown').length,
  }

  return {
    channel,
    date: sessionDate,
    events,
    nicks: [...nickSet].sort((a, b) => a.toLowerCase().localeCompare(b.toLowerCase())),
    stats,
    format,
  }
}

// ─────────────────────────────────────────────
// EXPORTS
// ─────────────────────────────────────────────

export {
  parseLog,
  parseLineBinary,
  parseLinePlainText,
  stripControlCodes,
  extractColour,
  detectFormat,
  MIRC_COLOURS,
  MIRC_COLOUR_NAMES,
}
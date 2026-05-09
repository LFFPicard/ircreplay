/**
 * IRCReplay Log Parser
 * Handles multiple IRC log formats with auto-detection.
 *
 * Format A — mIRC with binary control codes:
 *   \x03NN[HH:MM]\x03 content
 *
 * Format B — mIRC plain text (no control codes):
 *   [HH:MM] content
 *
 * Format C — XChat / HexChat:
 *   Mon DD HH:MM:SS <nick>\tcontent
 *   Mon DD HH:MM:SS *\tevent content
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

function detectFormat(lines) {
  for (const line of lines.slice(0, 30)) {
    if (!line.trim()) continue
    // Binary mIRC — \x03 control code before timestamp
    if (/^\x03\d{1,2}\[/.test(line)) return 'binary'
    // mIRC plain text — [HH:MM] timestamp
    if (/^\[\d{1,2}:\d{2}\]/.test(line)) return 'plaintext'
    // XChat/HexChat — Mon DD HH:MM:SS or **** BEGIN LOGGING
    if (/^\*\*\*\* (BEGIN|ENDING) LOGGING/.test(line)) return 'xchat'
    if (/^[A-Z][a-z]{2} \d{1,2} \d{2}:\d{2}:\d{2}/.test(line)) return 'xchat'
    // Session headers — skip
    if (/^Session (Start|Close|Ident|Time):/.test(line)) continue
  }
  return 'plaintext'
}

// ─────────────────────────────────────────────
// TIMESTAMP HELPERS
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

// XChat timestamp: extracts HH:MM from "May 07 16:25:44"
function parseXChatTimestamp(line) {
  const m = line.match(/^[A-Z][a-z]{2} \d{1,2} (\d{2}:\d{2}):\d{2}/)
  return m ? m[1] : null
}

// Strips "May 07 16:25:44 " prefix, returns the rest
function stripXChatTimestampPrefix(line) {
  return line.replace(/^[A-Z][a-z]{2} \d{1,2} \d{2}:\d{2}:\d{2} /, '').trim()
}

// ─────────────────────────────────────────────
// SHARED EVENT BUILDER
// ─────────────────────────────────────────────

function makeEvent(overrides = {}) {
  return {
    type:      'unknown',
    timestamp: null,
    nick:      null,
    text:      null,
    rawText:   null,
    colour:    null,
    hostmask:  null,
    extra:     {},
    raw:       '',
    ...overrides,
  }
}

// ─────────────────────────────────────────────
// SHARED SYSTEM BODY PARSER (mIRC *** lines)
// ─────────────────────────────────────────────

function parseSystemBody(body, timestamp, rawLine) {
  const clean = stripControlCodes(body)

  // Action: * nick text (not ***)
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
// FORMAT A — BINARY (mIRC with control codes)
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
// FORMAT B — PLAIN TEXT (mIRCStats sample)
// ─────────────────────────────────────────────

function parseLinePlainText(rawLine) {
  const timestamp = parseTimestamp(rawLine)
  const event     = makeEvent({ timestamp, raw: rawLine })

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

  const notice = body.match(/^-(.+?)-\s*(.+)/)
  if (notice) return { ...event, type: 'notice', nick: notice[1].trim(), text: notice[2].trim() }

  const msgAngle = body.match(/^<\+?(\S+?)>\s*(.*)/)
  if (msgAngle) return { ...event, type: 'message', nick: msgAngle[1], text: msgAngle[2], rawText: body }

  event.text = body
  return event
}

// ─────────────────────────────────────────────
// FORMAT C — XCHAT / HEXCHAT
// ─────────────────────────────────────────────

/**
 * XChat log format (default logging, timestamped):
 *   May 07 16:25:44 <nick>\tmessage
 *   May 07 16:25:44 *\tevent content
 *   May 07 16:25:44 -nick-\tnotice content
 *
 * Without timestamps (same format minus the date prefix):
 *   <nick>\tmessage
 *   *\tevent content
 *
 * System events use single * not ***
 * Mode expressed as "gives channel operator status to" / "gives voice to"
 */
function parseLineXChat(rawLine) {
  // Header/footer lines
  if (/^\*\*\*\* BEGIN LOGGING/.test(rawLine)) {
    const m = rawLine.match(/\*\*\*\* BEGIN LOGGING AT (.+)/)
    return makeEvent({ type: 'session', extra: { sessionType: 'start' }, text: m ? m[1].trim() : '', raw: rawLine })
  }
  if (/^\*\*\*\* ENDING LOGGING/.test(rawLine)) {
    const m = rawLine.match(/\*\*\*\* ENDING LOGGING AT (.+)/)
    return makeEvent({ type: 'session', extra: { sessionType: 'close' }, text: m ? m[1].trim() : '', raw: rawLine })
  }

  // Extract timestamp if present
  const timestamp = parseXChatTimestamp(rawLine)

  // Strip the timestamp prefix — works whether timestamp exists or not
  const body = stripXChatTimestampPrefix(rawLine)
  if (!body) return makeEvent({ timestamp, raw: rawLine })

  // Split on tab — XChat separates event type from content with \t
  const tabIdx  = body.indexOf('\t')
  const prefix  = tabIdx >= 0 ? body.slice(0, tabIdx) : body
  const content = tabIdx >= 0 ? body.slice(tabIdx + 1).trim() : ''

  const event = makeEvent({ timestamp, raw: rawLine })

  // ── MESSAGES: <nick> ────────────────────────────────────────────
  const msgMatch = prefix.match(/^<\+?(\S+?)>$/)
  if (msgMatch) {
    return { ...event, type: 'message', nick: msgMatch[1], text: content, rawText: body }
  }

  // ── NOTICES: -nick- ─────────────────────────────────────────────
  const noticeMatch = prefix.match(/^-(.+?)-$/)
  if (noticeMatch) {
    return { ...event, type: 'notice', nick: noticeMatch[1].trim(), text: content }
  }

  // ── SYSTEM EVENTS: * ────────────────────────────────────────────
  if (prefix === '*') {

    // Self join: Now talking on #channel
    const selfJoin = content.match(/^Now talking on\s+(\S+)/)
    if (selfJoin) return { ...event, type: 'system', extra: { subtype: 'self-join', channel: selfJoin[1] }, text: `Now talking in ${selfJoin[1]}` }

    // Topic info: Topic for #channel is: text
    const topicIs = content.match(/^Topic for\s+(\S+)\s+is:\s*(.*)/)
    if (topicIs) return { ...event, type: 'topic', extra: { channel: topicIs[1] }, text: topicIs[2] }

    // Topic set by: Topic for #channel set by nick at date
    const topicSet = content.match(/^Topic for\s+(\S+)\s+set by\s+(\S+)/)
    if (topicSet) return { ...event, type: 'system', text: `Topic set by ${topicSet[2]}` }

    // Join: nick (hostmask) has joined #channel
    const join = content.match(/^(\S+)\s+\((.+?)\)\s+has joined\s+(\S+)/)
    if (join) return { ...event, type: 'join', nick: join[1], hostmask: join[2], extra: { channel: join[3] }, text: `${join[1]} has joined ${join[3]}` }

    // Part: nick (hostmask) has left #channel (reason)
    const part = content.match(/^(\S+)\s+(?:\((.+?)\)\s+)?has left\s+(\S+)(?:\s+\((.+)\))?/)
    if (part) return { ...event, type: 'part', nick: part[1], hostmask: part[2] || null, extra: { channel: part[3], reason: part[4] || '' }, text: `${part[1]} has left ${part[3]}` }

    // Quit: nick has quit (reason)  OR  nick (hostmask) has quit (reason)
    const quit = content.match(/^(\S+)\s+(?:\((.+?)\)\s+)?has quit(?:\s+\((.+)\))?/)
    if (quit) {
      const reason = quit[3] || ''
      return { ...event, type: 'quit', nick: quit[1], hostmask: quit[2] || null, extra: { reason }, text: reason ? `${quit[1]} has quit (${reason})` : `${quit[1]} has quit` }
    }

    // Nick change: nick is now known as newnick
    const nickChange = content.match(/^(\S+)\s+is now known as\s+(\S+)/)
    if (nickChange) return { ...event, type: 'nick', nick: nickChange[1], extra: { newNick: nickChange[2] }, text: `${nickChange[1]} is now known as ${nickChange[2]}` }

    // Kick: nick was kicked by othernick (reason)
    const kick = content.match(/^(\S+)\s+was kicked by\s+(\S+)(?:\s+\((.+)\))?/)
    if (kick) return { ...event, type: 'kick', nick: kick[1], extra: { by: kick[2], reason: kick[3] || '' }, text: `${kick[1]} was kicked by ${kick[2]}${kick[3] ? ` (${kick[3]})` : ''}` }

    // Mode — XChat uses natural language rather than +o/-o notation
    // "nick gives channel operator status to target"
    const opGive = content.match(/^(\S+)\s+gives channel operator status to\s+(.+)/)
    if (opGive) return { ...event, type: 'mode', nick: opGive[1], extra: { modeString: `+o ${opGive[2]}` }, text: `${opGive[1]} sets mode: +o ${opGive[2]}` }

    // "nick gives voice to target"
    const voiceGive = content.match(/^(\S+)\s+gives voice to\s+(.+)/)
    if (voiceGive) return { ...event, type: 'mode', nick: voiceGive[1], extra: { modeString: `+v ${voiceGive[2]}` }, text: `${voiceGive[1]} sets mode: +v ${voiceGive[2]}` }

    // "nick removes channel operator status from target"
    const opRemove = content.match(/^(\S+)\s+removes channel operator status from\s+(.+)/)
    if (opRemove) return { ...event, type: 'mode', nick: opRemove[1], extra: { modeString: `-o ${opRemove[2]}` }, text: `${opRemove[1]} sets mode: -o ${opRemove[2]}` }

    // "nick removes voice from target"
    const voiceRemove = content.match(/^(\S+)\s+removes voice from\s+(.+)/)
    if (voiceRemove) return { ...event, type: 'mode', nick: voiceRemove[1], extra: { modeString: `-v ${voiceRemove[2]}` }, text: `${voiceRemove[1]} sets mode: -v ${voiceRemove[2]}` }

    // Action: * nick does something (XChat /me lines)
    // In XChat, /me appears as: * nick text (no tab, just the content)
    const action = content.match(/^(\S+)\s+(.+)/)
    if (action && !content.match(/^(\S+)\s+(has|is|was|gives|removes)/)) {
      return { ...event, type: 'action', nick: action[1], text: action[2] }
    }

    // Fallback system line
    return { ...event, type: 'system', text: content }
  }

  // Fallback
  event.text = body
  return event
}

// ─────────────────────────────────────────────
// FULL LOG PARSER
// ─────────────────────────────────────────────

function parseLog(rawText) {
  const lines  = rawText.split('\n')
  const format = detectFormat(lines)

  let parseFn
  if (format === 'binary')   parseFn = parseLineBinary
  else if (format === 'xchat') parseFn = parseLineXChat
  else                         parseFn = parseLinePlainText

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

  // XChat logs don't have Session Ident — extract channel from self-join
  if (!channel) {
    const selfJoin = events.find(e => e.type === 'system' && e.extra.subtype === 'self-join')
    if (selfJoin) channel = selfJoin.extra.channel
  }

  // XChat logs don't have Session Start — use BEGIN LOGGING date
  if (!sessionDate) {
    const start = events.find(e => e.type === 'session' && e.extra.sessionType === 'start')
    if (start) sessionDate = start.text
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
  parseLineXChat,
  stripControlCodes,
  extractColour,
  detectFormat,
  MIRC_COLOURS,
  MIRC_COLOUR_NAMES,
}
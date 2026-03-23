/**
 * IRCReplay Log Parser v2
 * Handles mIRC log format with real embedded control characters.
 *
 * mIRC saves logs with ACTUAL control bytes:
 *   \x02 = bold on/off
 *   \x03 = colour code, followed by 1-2 digit colour number
 *   \x0F = reset all formatting
 *
 * Line structure in your logs (hex view):
 *   \x02[HH:MM]\x03 <event content>
 *
 * Message lines look like:
 *   \x02[HH:MM]\x03 \x02\x03NN(\x02nick\x02)\x03\x02: message text
 *   where NN = colour number (01, 05, 12 etc.)
 */

// ─────────────────────────────────────────────
// mIRC COLOUR PALETTE (standard 16 colours)
// ─────────────────────────────────────────────

const MIRC_COLOURS = [
  '#FFFFFF', // 0  white
  '#000000', // 1  black
  '#00007F', // 2  navy
  '#009300', // 3  green
  '#FF0000', // 4  red
  '#7F0000', // 5  maroon (dark red) — used for LFF|Away in your log
  '#9C009C', // 6  purple
  '#FC7F00', // 7  olive/orange
  '#FFFF00', // 8  yellow
  '#00FC00', // 9  lime
  '#009393', // 10 teal
  '#00FFFF', // 11 cyan
  '#0000FC', // 12 royal blue — used for system lines
  '#FF00FF', // 13 pink/magenta
  '#7F7F7F', // 14 grey
  '#D2D2D2', // 15 silver/light grey
];

const MIRC_COLOUR_NAMES = [
  'white', 'black', 'navy', 'green', 'red', 'maroon',
  'purple', 'olive', 'yellow', 'lime', 'teal', 'cyan',
  'royal', 'pink', 'grey', 'silver',
];

// ─────────────────────────────────────────────
// CONTROL CODE HELPERS
// ─────────────────────────────────────────────

/**
 * Strip ALL mIRC control characters from a string, returning plain text.
 */
function stripControlCodes(str) {
  if (!str) return '';
  return str
    .replace(/\x03\d{0,2}(,\d{1,2})?/g, '')
    .replace(/[\x02\x0F\x16\x1F]/g, '')
    .trim();
}

/**
 * Extract the foreground colour number from the first \x03NN sequence.
 * Returns integer 0-15, or null.
 */
function extractColour(str) {
  const m = str.match(/\x03(\d{1,2})/);
  return m ? parseInt(m[1], 10) : null;
}

// ─────────────────────────────────────────────
// TIMESTAMP PARSING
// ─────────────────────────────────────────────

function parseTimestamp(line) {
  const m = line.match(/\[(\d{1,2}:\d{2})\]/);
  return m ? m[1] : null;
}

/**
 * Strips the leading colour+timestamp prefix from a line.
 * mIRC format: \x03NN[HH:MM]\x03<space>
 * where NN is the colour number for the timestamp (usually 02 = navy).
 */
function stripTimestampPrefix(line) {
  // Match: \x03 + 1-2 digit colour + [HH:MM] + \x03 + optional space
  return line.replace(/^\x03\d{1,2}\[\d{1,2}:\d{2}\]\x03\s*/, '').trim();
}

// ─────────────────────────────────────────────
// MAIN LINE PARSER
// ─────────────────────────────────────────────

function parseLine(rawLine) {
  const timestamp = parseTimestamp(rawLine);

  const event = {
    type: 'unknown',
    timestamp,
    nick: null,
    text: null,
    rawText: null,
    colour: null,
    hostmask: null,
    extra: {},
    raw: rawLine,
  };

  // ── SESSION HEADER LINES ─────────────────────────────────────────
  if (/^Session Start:/.test(rawLine)) {
    event.type = 'session';
    event.extra.sessionType = 'start';
    event.text = rawLine.replace('Session Start:', '').trim();
    return event;
  }
  if (/^Session Close:/.test(rawLine)) {
    event.type = 'session';
    event.extra.sessionType = 'close';
    event.text = rawLine.replace('Session Close:', '').trim();
    return event;
  }
  if (/^Session Ident:/.test(rawLine)) {
    event.type = 'session';
    event.extra.sessionType = 'ident';
    const m = rawLine.match(/Session Ident:\s*(.+)/);
    event.text = m ? m[1].trim() : '';
    event.extra.channel = event.text;
    return event;
  }

  // Strip timestamp prefix to get the event body
  const body = stripTimestampPrefix(rawLine);
  if (!body) return event;

  // Clean version for pattern matching (no control codes)
  const cleanBody = stripControlCodes(body);

  // ── ACTION ───────────────────────────────────────────────────────
  // Body: * nick text  (but NOT *** which is system)
  if (body.startsWith('* ') && !body.startsWith('***')) {
    const actionMatch = body.match(/^\*\s+(\S+)\s*(.*)/);
    if (actionMatch) {
      event.type = 'action';
      event.nick = actionMatch[1];
      event.text = stripControlCodes(actionMatch[2]);
      event.rawText = actionMatch[2];
      return event;
    }
  }

  // ── JOIN ─────────────────────────────────────────────────────────
  const joinMatch = cleanBody.match(/^\*\*\*\s+(\S+)\s+\((.+?)\)\s+has joined\s+(\S+)/);
  if (joinMatch) {
    event.type = 'join';
    event.nick = joinMatch[1];
    event.hostmask = joinMatch[2];
    event.extra.channel = joinMatch[3];
    event.text = `${event.nick} has joined ${event.extra.channel}`;
    return event;
  }

  // ── QUIT ─────────────────────────────────────────────────────────
  const quitMatch = cleanBody.match(/^\*\*\*\s+(\S+)\s+(?:\((.+?)\)\s+)?Quit(?:\s+\((.+?)\))?/);
  if (quitMatch) {
    event.type = 'quit';
    event.nick = quitMatch[1];
    event.hostmask = quitMatch[2] || null;
    event.extra.reason = quitMatch[3] || '';
    event.text = event.extra.reason
      ? `${event.nick} has quit (${event.extra.reason})`
      : `${event.nick} has quit`;
    return event;
  }

  // ── PART ─────────────────────────────────────────────────────────
  const partMatch = cleanBody.match(/^\*\*\*\s+(\S+)\s+(?:\((.+?)\)\s+)?has left\s+(\S+)(?:\s+\((.+)\))?/);
  if (partMatch) {
    event.type = 'part';
    event.nick = partMatch[1];
    event.hostmask = partMatch[2] || null;
    event.extra.channel = partMatch[3];
    event.extra.reason = partMatch[4] || '';
    event.text = `${event.nick} has left ${event.extra.channel}`;
    return event;
  }

  // ── NICK CHANGE ──────────────────────────────────────────────────
  const nickMatch = cleanBody.match(/^\*\*\*\s+(\S+)\s+is now known as\s+(\S+)/);
  if (nickMatch) {
    event.type = 'nick';
    event.nick = nickMatch[1];
    event.extra.newNick = nickMatch[2];
    event.text = `${nickMatch[1]} is now known as ${nickMatch[2]}`;
    return event;
  }

  // ── MODE CHANGE ──────────────────────────────────────────────────
  const modeMatch = cleanBody.match(/^\*\*\*\s+(\S+)\s+sets mode:\s+(.+)/);
  if (modeMatch) {
    event.type = 'mode';
    event.nick = modeMatch[1];
    event.extra.modeString = modeMatch[2].trim();
    event.text = `${event.nick} sets mode: ${event.extra.modeString}`;
    return event;
  }

  // ── SELF JOIN (Now talking in) ────────────────────────────────────
  const selfJoinMatch = cleanBody.match(/^\*\*\*\s+Now talking in\s+(.+)/);
  if (selfJoinMatch) {
    event.type = 'system';
    event.extra.subtype = 'self-join';
    event.extra.channel = selfJoinMatch[1].trim();
    event.text = `Now talking in ${event.extra.channel}`;
    return event;
  }

  // ── ANY OTHER *** line ────────────────────────────────────────────
  if (cleanBody.startsWith('***')) {
    event.type = 'system';
    event.text = cleanBody.replace(/^\*\*\*\s*/, '');
    return event;
  }

  // ── SERVER/CHANNEL NOTICE: -nick- text ───────────────────────────
  const noticeMatch = cleanBody.match(/^-(.+?)-\s*(.+)/);
  if (noticeMatch) {
    event.type = 'notice';
    event.nick = noticeMatch[1].trim();
    event.text = noticeMatch[2].trim();
    return event;
  }

  // ── TOPIC INFO: [#channel] topic- text ───────────────────────────
  const topicMatch = cleanBody.match(/\[(.+?)\]\s+topic-\s*(.+)/);
  if (topicMatch) {
    event.type = 'topic';
    event.extra.channel = topicMatch[1].trim();
    event.text = topicMatch[2].trim();
    return event;
  }

  // ── CHAT MESSAGE ─────────────────────────────────────────────────
  // Your format after stripping codes: (nick): message
  const msgParen = cleanBody.match(/^\((\S+?)\):\s*(.*)/);
  if (msgParen) {
    event.type = 'message';
    event.nick = msgParen[1];
    event.text = msgParen[2];
    event.rawText = body;
    event.colour = extractColour(body);
    return event;
  }

  // Standard <nick> format (other clients)
  const msgAngle = cleanBody.match(/^<(\S+?)>\s*(.*)/);
  if (msgAngle) {
    event.type = 'message';
    event.nick = msgAngle[1];
    event.text = msgAngle[2];
    event.rawText = body;
    event.colour = extractColour(body);
    return event;
  }

  // ── INFO / DECORATIVE (channel info block, borders, user counts) ──
  // These are the * * * [#channel] users- N etc. lines and unicode art
  const infoMatch = cleanBody.match(/^\*\s+\*\s+\[(.+?)\]/);
  if (infoMatch || cleanBody.match(/^\*\s+\*\s+\*/)) {
    event.type = 'info';
    event.text = cleanBody;
    return event;
  }

  // Remaining unmatched — still record with cleaned text
  event.text = cleanBody;
  return event;
}

// ─────────────────────────────────────────────
// FULL LOG PARSER
// ─────────────────────────────────────────────

function parseLog(rawText) {
  const lines = rawText.split('\n');
  const events = [];

  let channel = null;
  let sessionDate = null;

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    const event = parseLine(trimmed);
    events.push(event);

    if (event.type === 'session') {
      if (event.extra.sessionType === 'start') sessionDate = event.text;
      if (event.extra.sessionType === 'ident') channel = event.extra.channel;
    }
    if (event.type === 'system' && event.extra.subtype === 'self-join') {
      channel = channel || event.extra.channel;
    }
  }

  // Nick list — only users who actually sent messages or actions
  const nickSet = new Set();
  for (const e of events) {
    if (e.nick && (e.type === 'message' || e.type === 'action')) {
      nickSet.add(e.nick);
    }
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
  };

  return {
    channel,
    date: sessionDate,
    events,
    nicks: [...nickSet].sort((a, b) => a.toLowerCase().localeCompare(b.toLowerCase())),
    stats,
  };
}

// ─────────────────────────────────────────────
// EXPORTS
// ─────────────────────────────────────────────

export {
  parseLog,
  parseLine,
  stripControlCodes,
  extractColour,
  MIRC_COLOURS,
  MIRC_COLOUR_NAMES,
};

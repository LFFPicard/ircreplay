/**
 * Session save/load utilities.
 * Saves the parsed session as a compact JSON file.
 * The raw field is stripped from events to keep file size reasonable.
 */

export function saveSession(session) {
  // Strip raw field from every event — not needed after parsing
  const compactEvents = session.events.map(e => {
    const { raw, ...rest } = e
    return rest
  })

  const exportData = {
    version:   1,
    savedAt:   new Date().toISOString(),
    channel:   session.channel,
    date:      session.date,
    dateEnd:   session.dateEnd,
    fileCount: session.fileCount,
    nicks:     session.nicks,
    stats:     session.stats,
    events:    compactEvents,
  }

  const json     = JSON.stringify(exportData)
  const blob     = new Blob([json], { type: 'application/json' })
  const url      = URL.createObjectURL(blob)
  const a        = document.createElement('a')
  const channel  = (session.channel || 'session').replace(/[^a-zA-Z0-9_-]/g, '')
  a.href         = url
  a.download     = `${channel}-ircreplay-session.json`
  a.click()
  URL.revokeObjectURL(url)
}

export function loadSession(jsonText) {
  const data = JSON.parse(jsonText)

  // Basic validation
  if (!data.version || !data.events || !data.channel) {
    throw new Error('Invalid IRCReplay session file')
  }

  return {
    channel:   data.channel,
    date:      data.date,
    dateEnd:   data.dateEnd,
    fileCount: data.fileCount || 1,
    nicks:     data.nicks     || [],
    stats:     data.stats     || {},
    events:    data.events,
    fromSave:  true,
  }
}
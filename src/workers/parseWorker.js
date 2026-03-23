import { parseLog } from '../lib/parser'
import { sortLogFiles } from '../lib/mergelogs'

// Synchronous merge is fine here — we're on a background thread
// so blocking it doesn't affect the UI at all
function mergeSync(sessions) {
  if (sessions.length === 1) {
    return { ...sessions[0], fileCount: 1 }
  }

  const allEvents  = []
  const allNickSet = new Set()

  for (const session of sessions) {
    for (let i = 0; i < session.events.length; i++) {
      allEvents.push(session.events[i])
    }
    session.nicks.forEach(n => allNickSet.add(n))
  }

  const first = sessions[0]
  const last  = sessions[sessions.length - 1]

  const stats = {
    totalMessages:    allEvents.filter(e => e.type === 'message').length,
    totalActions:     allEvents.filter(e => e.type === 'action').length,
    totalJoins:       allEvents.filter(e => e.type === 'join').length,
    totalQuits:       allEvents.filter(e => e.type === 'quit').length,
    totalParts:       allEvents.filter(e => e.type === 'part').length,
    totalNickChanges: allEvents.filter(e => e.type === 'nick').length,
    uniqueChatters:   allNickSet.size,
    unknownLines:     allEvents.filter(e => e.type === 'unknown').length,
  }

  return {
    channel:   first.channel,
    date:      first.date,
    dateEnd:   last.date,
    events:    allEvents,
    nicks:     [...allNickSet].sort((a, b) => a.toLowerCase().localeCompare(b.toLowerCase())),
    stats,
    fileCount: sessions.length,
  }
}

self.onmessage = function(e) {
  const { files, mode } = e.data
  const sorted   = sortLogFiles(files)
  const sessions = []

  // Parse each file and report progress
  for (let i = 0; i < sorted.length; i++) {
    const file = sorted[i]
    self.postMessage({
      type:    'parsing',
      file:    file.filename,
      current: i + 1,
      total:   sorted.length,
    })
    const parsed = parseLog(file.rawText)
    sessions.push({ ...parsed, filename: file.filename })
  }

  // Merge and send back
  self.postMessage({ type: 'merging' })
  const merged = mergeSync(sessions)
  self.postMessage({ type: 'done', session: merged, mode })
}
/**
 * Merges multiple parsed log sessions into one combined session.
 * Files are sorted chronologically before merging.
 */

function extractDateFromFilename(filename) {
  const match = filename.match(/\.(\d{8})\.log$/i)
  return match ? match[1] : null
}

function sortLogFiles(files) {
  return [...files].sort((a, b) => {
    const dateA = extractDateFromFilename(a.filename)
    const dateB = extractDateFromFilename(b.filename)
    if (dateA && dateB) return dateA.localeCompare(dateB)
    if (!dateA) return 1
    if (!dateB) return -1
    return 0
  })
}

/**
 * Async merge — yields to browser between each session
 * so Chrome doesn't hang on large multi-file loads.
 * Calls onProgress(current, total) as each file is merged.
 * Calls onDone(mergedSession) when complete.
 */
function mergeSessions(sessions, onProgress, onDone) {
  if (sessions.length === 1) {
    onDone({
      ...sessions[0],
      fileCount: 1,
    })
    return
  }

  const allNickSet = new Set()
  const allEvents  = []
  let index = 0

  function mergeNext() {
    if (index >= sessions.length) {
      // All merged — build final object
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

      onDone({
        channel:   first.channel,
        date:      first.date,
        dateEnd:   last.date,
        events:    allEvents,
        nicks:     [...allNickSet].sort((a, b) => a.toLowerCase().localeCompare(b.toLowerCase())),
        stats,
        fileCount: sessions.length,
      })
      return
    }

    const session = sessions[index]
    session.nicks.forEach(n => allNickSet.add(n))

    // Push events in chunks to avoid one massive spread operation
    const CHUNK = 5000
    let offset = 0

    function pushChunk() {
      const chunk = session.events.slice(offset, offset + CHUNK)
      for (let i = 0; i < chunk.length; i++) {
        allEvents.push(chunk[i])
      }
      offset += CHUNK

      if (offset < session.events.length) {
        // More chunks in this file — yield and continue
        setTimeout(pushChunk, 0)
      } else {
        // File done — move to next
        index++
        onProgress?.(index, sessions.length)
        setTimeout(mergeNext, 0)
      }
    }

    pushChunk()
  }

  mergeNext()
}

export { sortLogFiles, mergeSessions, extractDateFromFilename }
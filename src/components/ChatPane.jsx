import { useEffect, useRef, useMemo } from 'react'
import { useVirtualizer } from '@tanstack/react-virtual'
import ChatLine from './ChatLine'
import NamesPanel from './NamesPanel'
import PlaybackControls from './PlaybackControls'
import { usePlayback } from '../hooks/usePlayback'

const REPLAY_WINDOW = 500

function ChatPane({ session, mode }) {
  const parentRef = useRef(null)
  const playback  = usePlayback(session.events, mode)

  const visibleEvents  = session.events.slice(0, playback.visibleCount)
  const renderedEvents = mode === 'replay'
    ? visibleEvents.slice(-REPLAY_WINDOW)
    : visibleEvents

  // Virtual scroller — only renders rows in the viewport
  const virtualizer = useVirtualizer({
    count:            renderedEvents.length,
    getScrollElement: () => parentRef.current,
    estimateSize:     () => 22,   // estimated row height in px
    overscan:         20,         // extra rows above/below viewport
  })

  // Scroll to bottom when new events appear
  useEffect(() => {
    if (renderedEvents.length === 0) return
    virtualizer.scrollToIndex(renderedEvents.length - 1, {
      behavior: mode === 'instant' ? 'auto' : 'smooth',
    })
  }, [playback.visibleCount, mode])

    const dynamicNicks = useMemo(() => {
    const nickMap = {}  // nick → { op: bool, voice: bool }

    const getOrAdd = (nick) => {
      if (!nickMap[nick]) nickMap[nick] = { op: false, voice: false }
      return nickMap[nick]
    }

    for (const event of visibleEvents) {
      if (event.type === 'join' && event.nick) {
        getOrAdd(event.nick)
      }
      if ((event.type === 'quit' || event.type === 'part') && event.nick) {
        delete nickMap[event.nick]
      }
      if (event.type === 'nick' && event.nick) {
        const existing = nickMap[event.nick] || { op: false, voice: false }
        delete nickMap[event.nick]
        if (event.extra?.newNick) nickMap[event.extra.newNick] = existing
      }
      if ((event.type === 'message' || event.type === 'action') && event.nick) {
        getOrAdd(event.nick)
      }
      // Track mode changes — +o/-o +v/-v
      if (event.type === 'mode' && event.extra?.modeString) {
        const modeStr = event.extra.modeString
        // Parse mode string like "+o Nick" or "+vv Nick1 Nick2" or "-o+v Nick"
        const parts  = modeStr.trim().split(/\s+/)
        const flags  = parts[0] || ''
        const nicks  = parts.slice(1)
        let adding   = true
        let nickIdx  = 0
        for (const char of flags) {
          if (char === '+') { adding = true;  continue }
          if (char === '-') { adding = false; continue }
          if (char === 'o' || char === 'v') {
            const target = nicks[nickIdx]
            nickIdx++
            if (target) {
              const entry = getOrAdd(target)
              if (char === 'o') entry.op    = adding
              if (char === 'v') entry.voice = adding
            }
          } else {
            // Other mode flags that take a parameter — skip the parameter
            if ('beIklLjf'.includes(char) && nicks[nickIdx]) nickIdx++
          }
        }
      }
    }

    // Sort: ops first, then voiced, then regular — alphabetical within each group
    const ops     = []
    const voiced  = []
    const regular = []

    for (const [nick, flags] of Object.entries(nickMap)) {
      if (flags.op)    ops.push(nick)
      else if (flags.voice) voiced.push(nick)
      else             regular.push(nick)
    }

    const alpha = (a, b) => a.toLowerCase().localeCompare(b.toLowerCase())
    ops.sort(alpha)
    voiced.sort(alpha)
    regular.sort(alpha)

    return [
      ...ops.map(n    => ({ nick: n, prefix: '@' })),
      ...voiced.map(n => ({ nick: n, prefix: '+' })),
      ...regular.map(n => ({ nick: n, prefix: ''  })),
    ]
  }, [mode === 'instant' ? null : visibleEvents, session.nicks, visibleEvents])

  return (
    <div className="flex flex-col border border-gray-700 rounded-lg overflow-hidden bg-gray-950 h-full">

      <div className="flex flex-1 overflow-hidden">

        {/* Virtual scrolling chat pane */}
        <div ref={parentRef} className="flex-1 overflow-y-auto">
          <div style={{ height: virtualizer.getTotalSize(), position: 'relative' }}>
            {virtualizer.getVirtualItems().map(virtualItem => (
              <div
                key={virtualItem.key}
                data-index={virtualItem.index}
                ref={virtualizer.measureElement}
                style={{
                  position:  'absolute',
                  top:       0,
                  left:      0,
                  width:     '100%',
                  transform: `translateY(${virtualItem.start}px)`,
                }}
              >
                <ChatLine event={renderedEvents[virtualItem.index]} />
              </div>
            ))}
          </div>
        </div>

        <NamesPanel nicks={dynamicNicks} />
      </div>

      {mode === 'replay' && (
        <PlaybackControls playback={playback} session={session} />
      )}

      <div className="shrink-0 border-t border-gray-700 flex items-center px-3 py-2 gap-2">
        <span className="text-gray-500 font-mono text-sm shrink-0">{session.channel}</span>
        <div className="flex-1 bg-gray-900 border border-gray-600 rounded px-3 py-1 font-mono text-sm text-gray-600 select-none">&nbsp;</div>
      </div>

    </div>
  )
}

export default ChatPane
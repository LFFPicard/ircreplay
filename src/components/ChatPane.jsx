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

  // Dynamic names panel
  const dynamicNicks = useMemo(() => {
    const nickSet = new Set()
    for (const event of visibleEvents) {
      if (event.type === 'join' && event.nick) {
        nickSet.add(event.nick)
      }
      if ((event.type === 'quit' || event.type === 'part') && event.nick) {
        nickSet.delete(event.nick)
      }
      if (event.type === 'nick' && event.nick) {
        nickSet.delete(event.nick)
        if (event.extra?.newNick) nickSet.add(event.extra.newNick)
      }
      if ((event.type === 'message' || event.type === 'action') && event.nick) {
        nickSet.add(event.nick)
      }
    }
    return [...nickSet].sort((a, b) => a.toLowerCase().localeCompare(b.toLowerCase()))
  }, [visibleEvents])

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
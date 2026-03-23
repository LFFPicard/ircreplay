import { useState, useEffect, useRef, useCallback } from 'react'

export const SPEEDS = [
  { label: '1x',  linesPerSec: 0.2  },  // 1 line per 5 seconds
  { label: '5x',  linesPerSec: 1    },  // 1 line per second
  { label: '15x', linesPerSec: 3    },  // 3 lines per second
  { label: '30x', linesPerSec: 8    },  // 8 lines per second
  { label: '60x', linesPerSec: 20   },  // 20 lines per second
]

export function usePlayback(events, mode) {
  const intervalRef    = useRef(null)
  const positionRef    = useRef(0)   // float position — avoids float accumulation drift
  const totalRef       = useRef(0)

  const [isPlaying,    setIsPlaying   ] = useState(false)
  const [speedIndex,   setSpeedIndex  ] = useState(0)
  const [visibleCount, setVisibleCount] = useState(0)

  // Initialise when events or mode changes
  useEffect(() => {
    totalRef.current  = events.length
    positionRef.current = 0
    clearInterval(intervalRef.current)
    setIsPlaying(false)

    if (mode === 'instant') {
      setVisibleCount(events.length)
    } else {
      setVisibleCount(0)
    }
  }, [events, mode])

  // Interval ticker — fires every 100ms
  useEffect(() => {
    clearInterval(intervalRef.current)
    if (mode === 'instant' || !isPlaying) return

    const linesPerSec = SPEEDS[speedIndex].linesPerSec
    const increment   = linesPerSec * 0.1   // how many lines to advance per 100ms tick

    intervalRef.current = setInterval(() => {
      positionRef.current = Math.min(
        positionRef.current + increment,
        totalRef.current
      )

      const count = Math.floor(positionRef.current)
      setVisibleCount(count)

      if (positionRef.current >= totalRef.current) {
        clearInterval(intervalRef.current)
        setIsPlaying(false)
      }
    }, 100)

    return () => clearInterval(intervalRef.current)
  }, [isPlaying, speedIndex, mode])

  const play  = useCallback(() => {
    // If we're at the end, restart from beginning
    if (positionRef.current >= totalRef.current) {
      positionRef.current = 0
      setVisibleCount(0)
    }
    setIsPlaying(true)
  }, [])

  const pause = useCallback(() => setIsPlaying(false), [])

  const seek = useCallback((fraction) => {
    const pos = fraction * totalRef.current
    positionRef.current = pos
    setVisibleCount(Math.floor(pos))
  }, [])

  const progress = totalRef.current === 0
    ? 0
    : visibleCount / totalRef.current

  const isDone = visibleCount >= totalRef.current && totalRef.current > 0

  return {
    visibleCount,
    isPlaying,
    speedIndex,
    setSpeedIndex,
    play,
    pause,
    seek,
    progress: Math.min(1, Math.max(0, progress)),
    isDone,
  }
}
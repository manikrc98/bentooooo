import { useEffect, useLayoutEffect, useRef } from 'react'
import BentoGrid from '@bentogrid/core'

/**
 * Manages a BentoGrid instance attached to containerRef.
 *
 * Key pattern: Before each recalculate call, we strip all .bento-filler
 * elements that BentoGrid previously injected — they live in the real DOM
 * but outside React's virtual DOM. Stripping them ensures BentoGrid starts
 * fresh and doesn't double-count them as real cards.
 *
 * useLayoutEffect (not useEffect) is critical here: it runs synchronously
 * after React mutates the DOM but before the browser paints, so the user
 * never sees the intermediate state of new cards + stale fillers.
 */
export function useBentoGrid(containerRef, cards, gridConfig, mode) {
  const instanceRef = useRef(null)

  useLayoutEffect(() => {
    if (!containerRef.current) return

    // Remove fillers injected by a previous BentoGrid run
    containerRef.current
      .querySelectorAll('.bento-filler')
      .forEach(el => el.remove())

    if (!instanceRef.current) {
      instanceRef.current = new BentoGrid({
        target: containerRef.current,
        columns: gridConfig.columns,
        cellGap: gridConfig.cellGap,
        aspectRatio: gridConfig.aspectRatio,
      })
    } else {
      instanceRef.current.recalculate()
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cards, gridConfig.columns, gridConfig.cellGap, gridConfig.aspectRatio, mode])

  // Destroy on unmount
  useEffect(() => {
    return () => {
      instanceRef.current = null
    }
  }, [])

  return instanceRef
}

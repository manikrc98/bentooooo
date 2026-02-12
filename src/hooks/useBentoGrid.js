import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import BentoGrid from '@bentogrid/core'

/**
 * Given a container width and desired max columns, return the number of
 * columns that actually fit comfortably.  Each column needs roughly 160 px
 * (plus gap) to remain usable.
 */
function responsiveColumns(containerWidth, maxColumns, cellGap) {
  const minColWidth = 160
  // Available width per column = (containerWidth - gaps) / cols
  // We find the largest column count <= maxColumns where each column is >= minColWidth.
  for (let cols = maxColumns; cols >= 1; cols--) {
    const available = (containerWidth - cellGap * (cols - 1)) / cols
    if (available >= minColWidth) return cols
  }
  return 1
}

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
  const [effectiveCols, setEffectiveCols] = useState(gridConfig.columns)

  // ── Observe container width and derive responsive column count ──────────
  useEffect(() => {
    const el = containerRef.current
    if (!el) return

    const ro = new ResizeObserver(entries => {
      for (const entry of entries) {
        const width = entry.contentRect.width
        setEffectiveCols(responsiveColumns(width, gridConfig.columns, gridConfig.cellGap))
      }
    })

    ro.observe(el)
    return () => ro.disconnect()
  }, [containerRef, gridConfig.columns, gridConfig.cellGap])

  // ── (Re-)create BentoGrid whenever layout-affecting props change ────────
  useLayoutEffect(() => {
    if (!containerRef.current) return

    // Remove fillers injected by a previous BentoGrid run
    containerRef.current
      .querySelectorAll('.bento-filler')
      .forEach(el => el.remove())

    // Destroy previous instance so we can recreate with new columns
    instanceRef.current = null

    instanceRef.current = new BentoGrid({
      target: containerRef.current,
      columns: effectiveCols,
      cellGap: gridConfig.cellGap,
      aspectRatio: gridConfig.aspectRatio,
    })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cards, effectiveCols, gridConfig.cellGap, gridConfig.aspectRatio, mode])

  // Destroy on unmount
  useEffect(() => {
    return () => {
      instanceRef.current = null
    }
  }, [])

  return { instanceRef, effectiveCols }
}

import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import BentoGrid from '@bentogrid/core'

function responsiveColumns(containerWidth, maxColumns, cellGap) {
  const minColWidth = 160
  for (let cols = maxColumns; cols >= 1; cols--) {
    const available = (containerWidth - cellGap * (cols - 1)) / cols
    if (available >= minColWidth) return cols
  }
  return 1
}

export function useBentoGrid(containerRef, cards, gridConfig) {
  const instanceRef = useRef(null)
  const [effectiveCols, setEffectiveCols] = useState(gridConfig.columns)

  // Observe container width and derive responsive column count
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

  // (Re-)create BentoGrid whenever layout-affecting props change
  useLayoutEffect(() => {
    const container = containerRef.current
    if (!container) return

    // Remove fillers injected by a previous BentoGrid run
    container.querySelectorAll('.bento-filler').forEach(el => el.remove())

    instanceRef.current = new BentoGrid({
      target: container,
      columns: effectiveCols,
      cellGap: gridConfig.cellGap,
      aspectRatio: gridConfig.aspectRatio,
    })

    return () => {
      instanceRef.current = null
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cards, effectiveCols, gridConfig.cellGap, gridConfig.aspectRatio])

  // Destroy on unmount
  useEffect(() => {
    return () => {
      instanceRef.current = null
    }
  }, [])

  return { effectiveCols }
}

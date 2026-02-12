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
export function useBentoGrid(containerRef, cards, gridConfig, mode, onAddCard) {
  const instanceRef = useRef(null)
  const [effectiveCols, setEffectiveCols] = useState(gridConfig.columns)
  const colsRef = useRef(effectiveCols)
  colsRef.current = effectiveCols
  const onAddRef = useRef(onAddCard)
  onAddRef.current = onAddCard

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
    const container = containerRef.current
    if (!container) return

    // Remove fillers injected by a previous BentoGrid run
    container
      .querySelectorAll('.bento-filler')
      .forEach(el => el.remove())

    // Remove previously injected dynamic add buttons
    container
      .querySelectorAll('.dynamic-add-btn')
      .forEach(el => el.remove())

    // Destroy previous instance so we can recreate with new columns
    instanceRef.current = null

    // Place [+] buttons in every empty grid cell after BentoGrid calculates
    function placeAddButtons() {
      // Clear any existing dynamic add buttons
      container.querySelectorAll('.dynamic-add-btn').forEach(el => el.remove())

      // Only show add buttons in edit mode
      if (mode !== 'edit') return

      const cols = colsRef.current
      const items = container.querySelectorAll(':scope > [data-bento]')
      const occupied = new Set()
      let maxRowEnd = 0

      items.forEach(item => {
        const rowStart = parseInt(item.style.gridRow) || 1
        const rowSpan = parseInt((item.style.gridRow.split('span ')[1])) || 1
        const colStart = parseInt(item.style.gridColumn) || 1
        const colSpan = parseInt((item.style.gridColumn.split('span ')[1])) || 1
        for (let r = rowStart; r < rowStart + rowSpan; r++) {
          for (let c = colStart; c < colStart + colSpan; c++) {
            occupied.add(`${r},${c}`)
          }
        }
        maxRowEnd = Math.max(maxRowEnd, rowStart + rowSpan - 1)
      })

      // Include one extra row below existing content for adding new cards
      const totalRows = Math.max(maxRowEnd + 1, 1)

      // Check if there's any card ahead of position (r, c) in the same row or next row
      function hasCardAhead(r, c) {
        // Check same row, later columns
        for (let cc = c + 1; cc <= cols; cc++) {
          if (occupied.has(`${r},${cc}`)) return true
        }
        // Check next row
        for (let cc = 1; cc <= cols; cc++) {
          if (occupied.has(`${r + 1},${cc}`)) return true
        }
        return false
      }

      // Create add buttons — but limit to one trailing button when no cards are ahead
      let trailingAddPlaced = false
      for (let r = 1; r <= totalRows; r++) {
        for (let c = 1; c <= cols; c++) {
          if (!occupied.has(`${r},${c}`)) {
            if (hasCardAhead(r, c) || !trailingAddPlaced) {
              const btn = document.createElement('div')
              btn.className = 'dynamic-add-btn'
              btn.style.gridColumn = `${c} / span 1`
              btn.style.gridRow = `${r} / span 1`
              btn.title = 'Add card'
              btn.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>'
              btn.addEventListener('click', () => onAddRef.current?.())
              container.appendChild(btn)
              if (!hasCardAhead(r, c)) trailingAddPlaced = true
            }
          }
        }
      }

      // Extend grid rows so all button rows have proper height
      const currentRows = parseInt(container.style.gridTemplateRows?.match(/repeat\((\d+)/)?.[1]) || 0
      if (totalRows > currentRows) {
        container.style.gridTemplateRows = `repeat(${totalRows}, minmax(var(--bento-row-height), 1fr))`
      }
    }

    container.addEventListener('calculationDone', placeAddButtons)

    instanceRef.current = new BentoGrid({
      target: container,
      columns: effectiveCols,
      cellGap: gridConfig.cellGap,
      aspectRatio: gridConfig.aspectRatio,
    })

    // Handle 0-card case where BentoGrid may not fire calculationDone
    if (cards.length === 0 && mode === 'edit') {
      placeAddButtons()
    }

    return () => {
      container.removeEventListener('calculationDone', placeAddButtons)
    }

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

import { useRef } from 'react'
import { useBentoGrid } from '../hooks/useBentoGrid.js'
import BentoCard from './BentoCard.jsx'

export default function SectionGrid({ section, gridConfig }) {
  const { cards } = section
  const containerRef = useRef(null)

  const { effectiveCols } = useBentoGrid(containerRef, cards, gridConfig)

  return (
    <div ref={containerRef} className="bentogrid w-full">
      {cards.map(card => (
        <BentoCard
          key={card.id}
          card={card}
          maxColumns={effectiveCols}
        />
      ))}
    </div>
  )
}

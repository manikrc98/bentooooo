import SectionHeader from './SectionHeader.jsx'
import SectionGrid from './SectionGrid.jsx'

export default function BentoCanvas({ sections, gridConfig }) {
  if (!sections || sections.length === 0) return null

  return (
    <div className="flex-1 min-w-0">
      <div className="w-full max-w-4xl mx-auto space-y-6">
        {sections.map(section => (
          <div key={section.id}>
            <SectionHeader section={section} />
            <SectionGrid section={section} gridConfig={gridConfig} />
          </div>
        ))}
      </div>
    </div>
  )
}

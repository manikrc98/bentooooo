export default function SectionHeader({ section }) {
  return (
    <div className="flex items-center gap-2 mb-2">
      <h2 className="text-lg font-semibold px-1 py-0.5 flex-1 border-b-2 border-transparent">{section.title}</h2>
    </div>
  )
}

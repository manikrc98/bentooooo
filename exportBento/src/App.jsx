import data from './data.json'
import BioSection from './components/BioSection.jsx'
import BentoCanvas from './components/BentoCanvas.jsx'

export default function App() {
  const { sections, bio, gridConfig } = data

  return (
    <div className="flex flex-col min-h-screen bg-gray-50 text-zinc-800">
      <div className="flex-1 flex px-6 py-6">
        <BioSection bio={bio} />
        <BentoCanvas sections={sections} gridConfig={gridConfig} />
      </div>
    </div>
  )
}

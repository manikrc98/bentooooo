import BioSection from '../BioSection.jsx'
import BentoCanvas from '../BentoCanvas.jsx'

/**
 * Read-only portfolio preview used in the chat split view.
 * Renders the same components as the main view but forces preview mode.
 */
export default function PortfolioPreview({ state, dispatch }) {
  const previewState = { ...state, mode: 'preview' }

  // No-op for card selection in preview
  const noop = () => {}

  return (
    <div className="flex flex-col lg:flex-row h-full overflow-y-auto px-4 py-4">
      <BioSection bio={state.bio} mode="preview" dispatch={dispatch} />
      <BentoCanvas
        state={previewState}
        dispatch={dispatch}
        selectedCardId={null}
        onCardSelect={noop}
      />
    </div>
  )
}

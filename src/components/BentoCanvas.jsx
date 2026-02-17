import { useState } from 'react'
import { ADD_SECTION, REMOVE_SECTION } from '../store/cardStore.js'
import { Plus } from 'lucide-react'
import SectionHeader from './SectionHeader.jsx'
import SectionGrid from './SectionGrid.jsx'
import DeleteConfirmModal from './DeleteConfirmModal.jsx'

export default function BentoCanvas({ state, dispatch, selectedCardId, onCardSelect }) {
  const { sections, mode } = state
  const [deletingSectionId, setDeletingSectionId] = useState(null)

  function handleDeleteRequest(sectionId) {
    setDeletingSectionId(sectionId)
  }

  function handleConfirmDelete() {
    if (deletingSectionId) {
      dispatch({ type: REMOVE_SECTION, payload: deletingSectionId })
    }
    setDeletingSectionId(null)
  }

  function handleCancelDelete() {
    setDeletingSectionId(null)
  }

  function handleAddSection() {
    dispatch({ type: ADD_SECTION })
  }

  const deletingSection = sections.find(s => s.id === deletingSectionId)

  return (
    <div className="flex-1 min-w-0">
      {sections.length === 0 && mode === 'preview' ? (
        <div className="flex flex-col items-center justify-center h-64 text-zinc-300 text-sm gap-2">
          <span className="text-4xl">⬜</span>
          <p>No sections yet. Switch to Edit mode to get started.</p>
        </div>
      ) : (
        <div className="w-full max-w-4xl mx-auto space-y-6 pb-16">
          {sections.map(section => (
            <div key={section.id}>
              <SectionHeader
                section={section}
                isEditMode={mode === 'edit'}
                dispatch={dispatch}
                onDeleteRequest={handleDeleteRequest}
              />
              <SectionGrid
                section={section}
                state={state}
                dispatch={dispatch}
                selectedCardId={selectedCardId}
                onCardSelect={onCardSelect}
              />
            </div>
          ))}

          {mode === 'edit' && (
            <button
              onClick={handleAddSection}
              className="w-full py-3 rounded-xl border-2 border-dashed border-zinc-200
                text-zinc-400 text-sm font-medium flex items-center justify-center gap-2
                hover:border-zinc-300 hover:text-zinc-500 hover:bg-zinc-50/50 transition-colors"
            >
              <Plus size={16} />
              Add section
            </button>
          )}
        </div>
      )}

      {deletingSectionId && (
        <DeleteConfirmModal
          sectionTitle={deletingSection?.title}
          onConfirm={handleConfirmDelete}
          onCancel={handleCancelDelete}
        />
      )}
    </div>
  )
}

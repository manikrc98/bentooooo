import { useState, useRef, useEffect, useCallback } from 'react'
import { Plus, Trash2, ImagePlus, X, Link as LinkIcon } from 'lucide-react'
import { SET_BIO, CLEAR_BIO } from '../store/cardStore.js'
import { compressImage } from '../utils/imageCompression.js'

function makeBioBlock() {
  return {
    id: crypto.randomUUID(),
    heading: '',
    body: '',
  }
}

function makeBio() {
  return {
    avatar: '',
    name: '',
    description: '',
    blocks: [makeBioBlock()],
  }
}

/* Parse body text with markdown-style links [text](url) into React elements */
function renderBodyWithLinks(body) {
  const parts = []
  const regex = /\[([^\]]+)\]\(([^)]+)\)/g
  let lastIndex = 0
  let match

  while ((match = regex.exec(body)) !== null) {
    if (match.index > lastIndex) {
      parts.push(body.slice(lastIndex, match.index))
    }
    parts.push(
      <a
        key={match.index}
        href={match[2]}
        target="_blank"
        rel="noopener noreferrer"
        className="text-blue-500 underline underline-offset-2 hover:text-blue-600 transition-colors"
      >
        {match[1]}
      </a>
    )
    lastIndex = match.index + match[0].length
  }

  if (lastIndex < body.length) {
    parts.push(body.slice(lastIndex))
  }

  return parts.length > 0 ? parts : body
}

/* Floating link tray that appears at bottom of textarea */
function LinkTray({ onSubmit, onDismiss }) {
  const inputRef = useRef(null)

  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  useEffect(() => {
    function handleEsc(e) {
      if (e.key === 'Escape') onDismiss()
    }
    window.addEventListener('keydown', handleEsc)
    return () => window.removeEventListener('keydown', handleEsc)
  }, [onDismiss])

  function handleSubmit(e) {
    e.preventDefault()
    const url = inputRef.current?.value.trim()
    if (url) onSubmit(url)
  }

  return (
    <div className="absolute bottom-1 left-0 right-0 z-20 flex justify-center">
      <form
        onSubmit={handleSubmit}
        className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-white border border-zinc-200 shadow-lg"
        onClick={e => e.stopPropagation()}
      >
        <LinkIcon size={13} className="text-zinc-400 shrink-0" />
        <input
          ref={inputRef}
          type="url"
          className="text-xs text-zinc-600 bg-transparent outline-none w-40 placeholder:text-zinc-300"
          placeholder="https://…"
          onBlur={(e) => {
            // Dismiss if blurred without submitting (small delay to allow submit click)
            setTimeout(() => {
              if (!e.currentTarget?.closest('form')?.contains(document.activeElement)) {
                onDismiss()
              }
            }, 150)
          }}
        />
        <button
          type="submit"
          className="text-[10px] font-medium text-blue-500 hover:text-blue-600 px-1.5 py-0.5 rounded bg-blue-50 hover:bg-blue-100 transition-colors"
        >
          Add
        </button>
      </form>
    </div>
  )
}

export default function BioSection({ bio, mode, dispatch }) {
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [linkEditState, setLinkEditState] = useState(null) // { blockId, selStart, selEnd, selectedText }
  const avatarInputRef = useRef(null)
  const bodyRefs = useRef({}) // blockId -> textarea ref

  const isEditMode = mode === 'edit'

  // Register a body textarea ref
  const setBodyRef = useCallback((blockId, el) => {
    if (el) bodyRefs.current[blockId] = el
    else delete bodyRefs.current[blockId]
  }, [])

  // Handle Cmd+K on body textareas
  useEffect(() => {
    if (!isEditMode) return

    function handleKeyDown(e) {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        // Check if focus is on one of our body textareas
        const active = document.activeElement
        const blockId = Object.keys(bodyRefs.current).find(
          id => bodyRefs.current[id] === active
        )
        if (!blockId) return

        e.preventDefault()
        const ta = active
        const selStart = ta.selectionStart
        const selEnd = ta.selectionEnd
        if (selStart === selEnd) return // No text selected

        const selectedText = ta.value.slice(selStart, selEnd)
        setLinkEditState({ blockId, selStart, selEnd, selectedText })
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isEditMode])

  // No bio and not in edit mode — nothing to show
  if (!bio && !isEditMode) return null

  // No bio yet — show the "Add bio" CTA in edit mode
  if (!bio) {
    return (
      <div className="relative lg:absolute lg:left-6 lg:top-6 lg:bottom-6 flex items-stretch mb-4 lg:mb-0" style={{ width: '48px', zIndex: 10 }}>
        <button
          onClick={() => dispatch({ type: SET_BIO, payload: makeBio() })}
          className="w-full rounded-xl border-2 border-dashed border-zinc-200
            text-zinc-400 text-sm font-medium flex items-center justify-center gap-2
            hover:border-zinc-300 hover:text-zinc-500 hover:bg-zinc-50/50 transition-colors"
        >
          <span
            className="flex items-center gap-2 whitespace-nowrap"
            style={{
              writingMode: 'vertical-rl',
              textOrientation: 'mixed',
              transform: 'rotate(180deg)',
            }}
          >
            <Plus size={14} />
            Add bio
          </span>
        </button>
      </div>
    )
  }

  async function handleAvatarUpload(e) {
    const file = e.target.files?.[0]
    if (!file) return
    const compressed = await compressImage(file)
    const url = URL.createObjectURL(compressed)
    dispatch({ type: SET_BIO, payload: { avatar: url } })
  }

  function updateField(field, value) {
    dispatch({ type: SET_BIO, payload: { [field]: value } })
  }

  function updateBlock(blockId, field, value) {
    const blocks = bio.blocks.map(b =>
      b.id === blockId ? { ...b, [field]: value } : b
    )
    dispatch({ type: SET_BIO, payload: { blocks } })
  }

  function addBlock() {
    dispatch({ type: SET_BIO, payload: { blocks: [...bio.blocks, makeBioBlock()] } })
  }

  function removeBlock(blockId) {
    dispatch({
      type: SET_BIO,
      payload: { blocks: bio.blocks.filter(b => b.id !== blockId) },
    })
  }

  function handleLinkSubmit(url) {
    if (!linkEditState) return
    const { blockId, selStart, selEnd, selectedText } = linkEditState
    const block = bio.blocks.find(b => b.id === blockId)
    if (!block) return

    const before = block.body.slice(0, selStart)
    const after = block.body.slice(selEnd)
    const linked = `[${selectedText}](${url})`
    const newBody = before + linked + after

    updateBlock(blockId, 'body', newBody)
    setLinkEditState(null)
  }

  function confirmDelete() {
    dispatch({ type: CLEAR_BIO })
    setShowDeleteConfirm(false)
  }

  return (
    <>
      <div className="bio-sidebar shrink-0 w-full lg:w-64 lg:sticky lg:top-0 lg:self-start relative mb-6 lg:mb-0">
        {/* Delete button — top right, edit mode only */}
        {isEditMode && (
          <button
            onClick={() => setShowDeleteConfirm(true)}
            className="absolute right-0 top-0 p-1.5 rounded-lg text-zinc-300 hover:text-red-500 hover:bg-red-50 transition-colors z-10"
            title="Delete bio section"
          >
            <Trash2 size={14} />
          </button>
        )}

        {/* Avatar — large, left-aligned */}
        <div
          className={`w-24 h-24 rounded-full overflow-hidden bg-zinc-100 flex items-center justify-center
            ${isEditMode ? 'cursor-pointer hover:ring-2 hover:ring-blue-300 transition-all' : ''}`}
          onClick={() => isEditMode && avatarInputRef.current?.click()}
        >
          {bio.avatar ? (
            <img src={bio.avatar} alt="Avatar" className="w-full h-full object-cover" />
          ) : (
            <ImagePlus size={24} className="text-zinc-300" />
          )}
        </div>
        {isEditMode && (
          <input
            ref={avatarInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleAvatarUpload}
          />
        )}

        {/* Name */}
        <div className="mt-4">
          {isEditMode ? (
            <input
              className="w-full text-2xl font-bold text-zinc-800 bg-transparent outline-none
                placeholder:text-zinc-300"
              placeholder="Your name"
              value={bio.name}
              onChange={e => updateField('name', e.target.value)}
            />
          ) : (
            bio.name && <h2 className="text-2xl font-bold text-zinc-800">{bio.name}</h2>
          )}
        </div>

        {/* Description */}
        <div className="mt-1.5">
          {isEditMode ? (
            <textarea
              className="w-full text-sm text-zinc-500 bg-transparent outline-none resize-none
                placeholder:text-zinc-300 leading-relaxed"
              placeholder="Short description"
              rows={2}
              value={bio.description}
              onChange={e => updateField('description', e.target.value)}
            />
          ) : (
            bio.description && (
              <p className="text-sm text-zinc-500 leading-relaxed">{bio.description}</p>
            )
          )}
        </div>

        {/* Content blocks */}
        <div className="mt-6 space-y-5">
          {bio.blocks.map(block => (
            <div key={block.id} className="group/block relative">
              {isEditMode && bio.blocks.length > 1 && (
                <button
                  onClick={() => removeBlock(block.id)}
                  className="absolute -right-1 -top-1 w-5 h-5 rounded-full bg-red-50 text-red-400
                    flex items-center justify-center opacity-0 group-hover/block:opacity-100
                    hover:bg-red-100 transition-all z-10"
                >
                  <X size={10} />
                </button>
              )}
              {isEditMode ? (
                <div className="space-y-1 relative">
                  <input
                    className="w-full text-xs font-semibold text-zinc-400 bg-transparent outline-none
                      placeholder:text-zinc-300 uppercase tracking-wide"
                    placeholder="Heading"
                    value={block.heading}
                    onChange={e => updateBlock(block.id, 'heading', e.target.value)}
                  />
                  <div className="relative">
                    <textarea
                      ref={el => setBodyRef(block.id, el)}
                      className="w-full text-sm text-zinc-700 bg-transparent outline-none resize-none
                        placeholder:text-zinc-300 leading-relaxed"
                      placeholder="Body text"
                      rows={3}
                      value={block.body}
                      onChange={e => updateBlock(block.id, 'body', e.target.value)}
                    />
                    {linkEditState && linkEditState.blockId === block.id && (
                      <LinkTray
                        onSubmit={handleLinkSubmit}
                        onDismiss={() => setLinkEditState(null)}
                      />
                    )}
                  </div>
                </div>
              ) : (
                <div>
                  {block.heading && (
                    <h3 className="text-xs font-semibold text-zinc-400 uppercase tracking-wide mb-2">{block.heading}</h3>
                  )}
                  {block.body && (
                    <p className="text-sm text-zinc-700 leading-relaxed whitespace-pre-line">
                      {renderBodyWithLinks(block.body)}
                    </p>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Add content block button */}
        {isEditMode && (
          <button
            onClick={addBlock}
            className="mt-4 w-full py-2 rounded-xl border border-dashed border-zinc-200
              text-zinc-400 text-xs font-medium flex items-center justify-center gap-1.5
              hover:border-zinc-300 hover:text-zinc-500 hover:bg-zinc-50/50 transition-colors"
          >
            <Plus size={12} />
            Add content block
          </button>
        )}
      </div>

      {/* Delete confirmation modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm">
          <div className="animate-modal-in bg-white rounded-2xl shadow-xl p-6 max-w-sm w-full mx-4">
            <h3 className="text-base font-semibold text-zinc-800 mb-2">Delete bio section?</h3>
            <p className="text-sm text-zinc-500 mb-5">
              This will permanently remove your bio, avatar, and all content blocks. This action cannot be undone.
            </p>
            <div className="flex gap-2 justify-end">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="px-4 py-2 text-sm font-medium text-zinc-600 hover:bg-zinc-100 rounded-xl transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={confirmDelete}
                className="px-4 py-2 text-sm font-medium text-white bg-red-500 hover:bg-red-600 rounded-xl transition-colors"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

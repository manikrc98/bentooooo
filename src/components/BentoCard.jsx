import { useRef } from 'react'
import { ImagePlus, GripVertical } from 'lucide-react'
import { UPDATE_CARD_CONTENT } from '../store/cardStore.js'
import { clampBento } from '../utils/bentoDimensions.js'

export default function BentoCard({
  card, maxColumns, isSelected, isEditMode, onSelect, dispatch,
  index, onDragStart, isDragging, isDropTarget,
}) {
  const { id, bento, content } = card
  const { imageUrl, title, bgColor, textColor, linkUrl } = content
  const fileInputRef = useRef(null)

  function handleImageUpload(e) {
    const file = e.target.files?.[0]
    if (!file) return
    const url = URL.createObjectURL(file)
    dispatch({ type: UPDATE_CARD_CONTENT, payload: { id, updates: { imageUrl: url } } })
  }

  function handleTitleChange(e) {
    dispatch({ type: UPDATE_CARD_CONTENT, payload: { id, updates: { title: e.target.value } } })
  }

  const Tag = (!isEditMode && linkUrl) ? 'a' : 'div'
  const linkProps = (!isEditMode && linkUrl)
    ? { href: linkUrl, target: '_blank', rel: 'noopener noreferrer' }
    : {}

  return (
    <Tag
      data-bento={clampBento(bento, maxColumns)}
      data-card-id={id}
      {...linkProps}
      className={`bento-card block relative rounded-2xl overflow-hidden cursor-pointer select-none
        ${isSelected ? 'selected' : ''}
        group
      `}
      style={{
        backgroundColor: bgColor,
        backgroundImage: imageUrl ? `url(${imageUrl})` : 'none',
        backgroundSize: 'cover',
        backgroundPosition: 'center',
      }}
      onClick={() => isEditMode && onSelect(id)}
    >
      {/* Dark gradient overlay only when image is present */}
      {imageUrl && (
        <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent pointer-events-none" />
      )}

      {/* Drop zone indicator when this card is the target */}
      {isDropTarget && !isDragging && (
        <div
          className="absolute inset-0 rounded-2xl pointer-events-none
            bg-gray-300
            ring-2 ring-gray-400"
          style={{ zIndex: 10 }}
        />
      )}

      {/* Floating caption */}
      <div className={`absolute bottom-0 left-0 right-0 p-3 ${isEditMode ? 'z-10' : ''}`}>
        {isEditMode ? (
          <input
            className="bg-transparent font-medium text-sm outline-none border-0 w-full placeholder:opacity-30"
            style={{ color: imageUrl ? '#ffffff' : textColor }}
            placeholder="Caption…"
            value={title}
            onChange={handleTitleChange}
            onClick={e => e.stopPropagation()}
          />
        ) : (
          title && (
            <span
              className="inline-block text-sm font-medium px-2.5 py-1 rounded-full backdrop-blur-sm bg-white/90 shadow-sm"
              style={{ color: textColor }}
            >
              {title}
            </span>
          )
        )}
      </div>

      {/* Edit mode overlay: selection ring, drag handle, image upload */}
      {isEditMode && (
        <div className={`absolute inset-0 rounded-2xl transition-all duration-150
          ${isSelected ? 'ring-[2.5px] ring-blue-400' : 'ring-0 hover:ring-[1.5px] hover:ring-blue-300/50'}
        `}>
          {/* Drag handle */}
          <div
            onPointerDown={(e) => {
              e.stopPropagation()
              e.preventDefault()
              onDragStart(index, e)
            }}
            className="absolute top-2 right-2 w-7 h-7 flex items-center justify-center
              rounded-lg bg-black/15 backdrop-blur-sm text-black/50
              hover:bg-black/25 hover:text-black/80 transition-all cursor-grab active:cursor-grabbing z-10
              opacity-0 group-hover:opacity-100"
            style={{ color: imageUrl ? 'rgba(255,255,255,0.7)' : undefined }}
            title="Drag to reorder"
          >
            <GripVertical size={13} />
          </div>

          {/* Image upload button */}
          <button
            className="absolute top-2 left-2 w-7 h-7 flex items-center justify-center
              rounded-lg bg-black/15 backdrop-blur-sm text-black/50
              hover:bg-black/25 hover:text-black/80 transition-all
              opacity-0 group-hover:opacity-100"
            style={{ color: imageUrl ? 'rgba(255,255,255,0.7)' : undefined }}
            onClick={e => { e.stopPropagation(); fileInputRef.current?.click() }}
            title="Upload image"
          >
            <ImagePlus size={13} />
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleImageUpload}
          />
        </div>
      )}
    </Tag>
  )
}

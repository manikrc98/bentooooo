import { Plus } from 'lucide-react'

export default function AddCardButton({ onAdd, isHidden }) {
  if (isHidden) {
    // Keep data-bento so BentoGrid still reserves the slot — just invisible
    return <div data-bento="1x1" data-add-btn aria-hidden="true" />
  }
  return (
    <div
      data-bento="1x1"
      data-add-btn
      className="bento-card relative rounded-2xl
        outline-2 outline-dashed outline-zinc-200 -outline-offset-2 cursor-pointer
        hover:outline-zinc-300 hover:bg-zinc-100/60
        active:scale-95 transition-all duration-150 group overflow-hidden"
      onClick={onAdd}
      title="Add card"
    >
      <Plus size={24} className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-zinc-300 group-hover:text-zinc-500 transition-colors" />
    </div>
  )
}

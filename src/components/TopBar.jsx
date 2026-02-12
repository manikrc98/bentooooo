import { Download, Save, LayoutGrid } from 'lucide-react'
import { SET_MODE } from '../store/cardStore.js'

export default function TopBar({ mode, isDirty, onSave, onExport, dispatch }) {
  return (
    <header className="flex items-center justify-between px-6 py-3 border-b border-zinc-200 bg-white/80 backdrop-blur-md shrink-0">
      {/* Logo */}
      <div className="flex items-center gap-2">
        <LayoutGrid size={18} className="text-blue-500" />
        <span className="text-zinc-800 font-semibold text-sm tracking-tight">BentoBuilder</span>
      </div>

      {/* Mode toggle */}
      <div className="relative flex items-center bg-zinc-100 rounded-xl p-1 gap-0.5">
        {/* Sliding indicator */}
        <div
          className={`absolute top-1 h-[calc(100%-8px)] w-[calc(50%-4px)] rounded-lg bg-white shadow-sm
            transition-transform duration-200 ease-out
            ${mode === 'preview' ? 'translate-x-[calc(100%+4px)]' : 'translate-x-0'}
          `}
          style={{ left: 4 }}
        />
        <button
          className={`relative z-10 px-4 py-1.5 rounded-lg text-xs font-medium transition-colors
            ${mode === 'edit' ? 'text-zinc-800' : 'text-zinc-400 hover:text-zinc-600'}
          `}
          onClick={() => dispatch({ type: SET_MODE, payload: 'edit' })}
        >
          Edit
        </button>
        <button
          className={`relative z-10 px-4 py-1.5 rounded-lg text-xs font-medium transition-colors
            ${mode === 'preview' ? 'text-zinc-800' : 'text-zinc-400 hover:text-zinc-600'}
          `}
          onClick={() => dispatch({ type: SET_MODE, payload: 'preview' })}
        >
          Preview
        </button>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2">
        <button
          onClick={onExport}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-zinc-400 hover:text-zinc-600
            hover:bg-zinc-100 text-xs font-medium transition-all"
          title="Export as HTML"
        >
          <Download size={14} />
          Export
        </button>
        <button
          onClick={onSave}
          className={`flex items-center gap-1.5 px-4 py-1.5 rounded-xl text-xs font-medium transition-all
            ${isDirty
              ? 'bg-blue-500 hover:bg-blue-400 text-white'
              : 'bg-zinc-100 text-zinc-400 hover:bg-zinc-200 hover:text-zinc-600'}
          `}
          title="Save to browser"
        >
          {isDirty && <span className="w-1.5 h-1.5 rounded-full bg-blue-200 mr-0.5" />}
          <Save size={13} />
          Save
        </button>
      </div>
    </header>
  )
}

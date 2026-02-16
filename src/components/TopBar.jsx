import { Save, LayoutGrid, RotateCcw, LogIn, LogOut, X, Loader2 } from 'lucide-react'
import { SET_MODE } from '../store/cardStore.js'

export default function TopBar({ mode, isDirty, onSave, saving, saveError, onClearSaveError, onReset, dispatch, isOwner, user, onSignIn, onSignOut, username, authError, onClearAuthError }) {
  // Read-only users: just show a floating sign-in button, no branded header
  if (!isOwner) {
    return (
      <div className="absolute top-4 right-4 z-50 flex items-center gap-2">
        {user ? (
          <button
            onClick={onSignOut}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium transition-all
              bg-white/80 backdrop-blur-md border border-zinc-200 text-zinc-500 hover:bg-zinc-100 hover:text-zinc-600 shadow-sm"
            title="Sign out"
          >
            {user.user_metadata?.avatar_url ? (
              <img
                src={user.user_metadata.avatar_url}
                alt=""
                className="w-5 h-5 rounded-full"
              />
            ) : (
              <LogOut size={13} />
            )}
            Sign out
          </button>
        ) : (
          <button
            onClick={onSignIn}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium transition-all
              bg-white/80 backdrop-blur-md border border-zinc-200 text-zinc-500 hover:bg-zinc-100 hover:text-zinc-600 shadow-sm"
            title="Sign in"
          >
            <LogIn size={13} />
            Sign in
          </button>
        )}

        {authError && (
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-red-50 border border-red-200 text-red-600 text-xs font-medium">
            <span>{authError}</span>
            <button onClick={onClearAuthError} className="hover:text-red-800 transition-colors">
              <X size={13} />
            </button>
          </div>
        )}
      </div>
    )
  }

  return (
    <header className="flex items-center justify-between px-6 py-3 border-b border-zinc-200 bg-white/80 backdrop-blur-md shrink-0">
      {/* Logo + username */}
      <div className="flex items-center gap-2">
        <LayoutGrid size={18} className="text-blue-500" />
        <span className="text-zinc-800 font-semibold text-sm tracking-tight">BentoBuilder</span>
        {username && (
          <span className="text-zinc-400 text-sm font-medium">/ {username}</span>
        )}
      </div>

      {/* Mode toggle */}
      <div className="relative flex items-center bg-zinc-100 rounded-xl p-1 gap-0.5">
        {/* Sliding indicator */}
        <div
          className={`absolute top-1 h-[calc(100%-8px)] w-20 rounded-lg bg-white shadow-sm
            transition-all duration-200 ease-out
            ${mode === 'preview' ? 'translate-x-[calc(100%+2px)]' : 'translate-x-0'}
          `}
          style={{ left: 4 }}
        />
        <button
          className={`relative z-10 w-20 py-1.5 rounded-lg text-xs font-medium text-center transition-colors
            ${mode === 'edit' ? 'text-zinc-800' : 'text-zinc-400 hover:text-zinc-600'}
          `}
          onClick={() => dispatch({ type: SET_MODE, payload: 'edit' })}
        >
          Edit
        </button>
        <button
          className={`relative z-10 w-20 py-1.5 rounded-lg text-xs font-medium text-center transition-colors
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
          onClick={onReset}
          className="flex items-center gap-1.5 px-4 py-1.5 rounded-xl text-xs font-medium transition-all
            bg-zinc-100 text-zinc-500 hover:bg-red-50 hover:text-red-500"
          title="Reset to default"
        >
          <RotateCcw size={13} />
          Reset
        </button>
        <button
          onClick={onSave}
          disabled={saving}
          className={`flex items-center gap-1.5 px-4 py-1.5 rounded-xl text-xs font-medium transition-all
            ${saving
              ? 'bg-blue-400 text-white cursor-wait'
              : isDirty
                ? 'bg-blue-500 hover:bg-blue-400 text-white'
                : 'bg-zinc-100 text-zinc-400 hover:bg-zinc-200 hover:text-zinc-600'}
          `}
          title="Publish to Supabase"
        >
          {saving
            ? <Loader2 size={13} className="animate-spin" />
            : <>
                {isDirty && <span className="w-1.5 h-1.5 rounded-full bg-blue-200 mr-0.5" />}
                <Save size={13} />
              </>
          }
          {saving ? 'Publishing…' : 'Publish'}
        </button>

        {saveError && (
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-red-50 border border-red-200 text-red-600 text-xs font-medium">
            <span>{saveError}</span>
            <button onClick={onClearSaveError} className="hover:text-red-800 transition-colors">
              <X size={13} />
            </button>
          </div>
        )}

        {/* Auth buttons */}
        {user ? (
          <button
            onClick={onSignOut}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium transition-all
              bg-zinc-100 text-zinc-500 hover:bg-zinc-200 hover:text-zinc-600"
            title="Sign out"
          >
            {user.user_metadata?.avatar_url ? (
              <img
                src={user.user_metadata.avatar_url}
                alt=""
                className="w-5 h-5 rounded-full"
              />
            ) : (
              <LogOut size={13} />
            )}
            Sign out
          </button>
        ) : (
          <button
            onClick={onSignIn}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium transition-all
              bg-zinc-100 text-zinc-500 hover:bg-zinc-200 hover:text-zinc-600"
            title="Sign in"
          >
            <LogIn size={13} />
            Sign in
          </button>
        )}

        {authError && (
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-red-50 border border-red-200 text-red-600 text-xs font-medium">
            <span>{authError}</span>
            <button onClick={onClearAuthError} className="hover:text-red-800 transition-colors">
              <X size={13} />
            </button>
          </div>
        )}
      </div>
    </header>
  )
}

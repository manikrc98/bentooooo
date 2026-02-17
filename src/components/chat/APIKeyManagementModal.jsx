import { useState, useEffect } from 'react'
import { X, Loader2, Check, AlertCircle, Eye, EyeOff } from 'lucide-react'
import { getKeys, setKey, removeKey } from '../../lib/llmKeyStore.js'
import { createProvider } from '../../lib/llm/provider.js'
import { QuotaIndicator } from '../QuotaIndicator.jsx'

const PROVIDERS = [
  {
    id: 'github',
    label: 'GitHub Models',
    hint: 'ghp_...',
    color: 'bg-slate-50 border-slate-200 text-slate-700',
    buttonColor: 'bg-slate-600 hover:bg-slate-700',
  },
]

function maskKey(key) {
  if (!key) return null
  if (key.length <= 8) return key
  return key.slice(0, 4) + '...' + key.slice(-4)
}

export default function APIKeyManagementModal({ userId, onClose, onKeysUpdated }) {
  const [activeTab, setActiveTab] = useState('github')
  const [loadingKeys, setLoadingKeys] = useState(true)
  const [keys, setKeys] = useState({})
  const [inputValues, setInputValues] = useState({
    github: '',
  })
  const [states, setStates] = useState({
    github: { isValidating: false, error: null, success: false },
  })
  const [showPasswords, setShowPasswords] = useState({
    github: false,
  })

  // Load existing keys on mount
  useEffect(() => {
    async function loadKeys() {
      try {
        const fetchedKeys = await getKeys(userId)
        setKeys(fetchedKeys)
        setLoadingKeys(false)
      } catch (error) {
        console.error('Failed to load keys:', error)
        setLoadingKeys(false)
      }
    }
    loadKeys()
  }, [userId])

  async function handleSave(providerId) {
    const inputKey = inputValues[providerId].trim()
    if (!inputKey) {
      setStates(prev => ({
        ...prev,
        [providerId]: { ...prev[providerId], error: 'Please enter an API key' },
      }))
      return
    }

    setStates(prev => ({
      ...prev,
      [providerId]: { isValidating: true, error: null, success: false },
    }))

    try {
      // Validate the key
      const provider = createProvider(providerId, inputKey)
      const isValid = await provider.validateKey()

      if (!isValid) {
        setStates(prev => ({
          ...prev,
          [providerId]: {
            isValidating: false,
            error: 'Invalid credentials. Please check and try again.',
            success: false,
          },
        }))
        return
      }

      // Save to database
      await setKey(userId, providerId, inputKey)

      // Update local state
      setKeys(prev => ({ ...prev, [providerId]: inputKey }))
      setInputValues(prev => ({
        ...prev,
        [providerId]: '',
      }))
      setStates(prev => ({
        ...prev,
        [providerId]: { isValidating: false, error: null, success: true },
      }))

      // Clear success message after 2 seconds
      setTimeout(() => {
        setStates(prev => ({
          ...prev,
          [providerId]: { ...prev[providerId], success: false },
        }))
      }, 2000)

      // Notify parent to refresh chat state
      onKeysUpdated?.()
    } catch (error) {
      setStates(prev => ({
        ...prev,
        [providerId]: {
          isValidating: false,
          error: error.message || 'Failed to save key',
          success: false,
        },
      }))
    }
  }

  async function handleRemove(providerId) {
    setStates(prev => ({
      ...prev,
      [providerId]: { isValidating: true, error: null, success: false },
    }))

    try {
      await removeKey(userId, providerId)
      setKeys(prev => {
        const updated = { ...prev }
        delete updated[providerId]
        return updated
      })
      setInputValues(prev => ({ ...prev, [providerId]: '' }))
      setStates(prev => ({
        ...prev,
        [providerId]: { isValidating: false, error: null, success: true },
      }))

      setTimeout(() => {
        setStates(prev => ({
          ...prev,
          [providerId]: { ...prev[providerId], success: false },
        }))
      }, 2000)

      onKeysUpdated?.()
    } catch (error) {
      setStates(prev => ({
        ...prev,
        [providerId]: {
          isValidating: false,
          error: error.message || 'Failed to remove key',
          success: false,
        },
      }))
    }
  }

  const currentTab = PROVIDERS.find(p => p.id === activeTab)
  const currentState = states[activeTab]

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={onClose} />

      {/* Dialog */}
      <div className="relative bg-white rounded-2xl shadow-xl max-w-md w-full max-h-[90vh] flex flex-col animate-modal-in">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-200 shrink-0">
          <h2 className="text-lg font-semibold text-zinc-900">API Keys</h2>
          <button
            onClick={onClose}
            className="p-1 text-zinc-400 hover:text-zinc-600 hover:bg-zinc-100 rounded-lg transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Loading state */}
        {loadingKeys && (
          <div className="flex-1 flex items-center justify-center">
            <div className="flex flex-col items-center gap-3">
              <Loader2 size={24} className="text-zinc-400 animate-spin" />
              <p className="text-sm text-zinc-500">Loading keys...</p>
            </div>
          </div>
        )}

        {/* Tabs and content */}
        {!loadingKeys && (
          <>
            {/* Tabs */}
            <div className="flex border-b border-zinc-200 px-6 gap-4 shrink-0 overflow-x-auto">
              {PROVIDERS.map(provider => (
                <button
                  key={provider.id}
                  onClick={() => setActiveTab(provider.id)}
                  className={`px-2 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
                    activeTab === provider.id
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-zinc-500 hover:text-zinc-700'
                  }`}
                >
                  {provider.label}
                </button>
              ))}
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto px-6 py-4">
              {/* Provider info badge */}
              <div className={`px-3 py-2 rounded-lg border mb-4 text-sm ${currentTab.color}`}>
                Key format: <code className="font-mono font-medium">{currentTab.hint}</code>
              </div>

              {/* Current key info */}
              {keys[activeTab] && (
                <div className="mb-4 p-3 rounded-lg bg-green-50 border border-green-200">
                  <p className="text-xs text-green-600 font-medium mb-1">Current key saved</p>
                  <p className="text-sm font-mono text-green-700">
                    {maskKey(keys[activeTab])}
                  </p>
                </div>
              )}

              {/* Live quota stats */}
              {keys[activeTab] && (
                <div className="mb-4">
                  <p className="text-xs font-medium text-zinc-600 mb-2">Usage & Quotas</p>
                  <QuotaIndicator model="gpt-4o-mini" compact={false} />
                </div>
              )}

              {/* Key input */}
              <div className="mb-4">
                <label className="block text-sm font-medium text-zinc-700 mb-2">
                  {keys[activeTab] ? 'Update API Key' : 'Enter API Key'}
                </label>
                <div className="relative">
                  <input
                    type={showPasswords[activeTab] ? 'text' : 'password'}
                    value={inputValues[activeTab]}
                    onChange={e => setInputValues(prev => ({ ...prev, [activeTab]: e.target.value }))}
                    placeholder={`Paste your ${currentTab.label} API key`}
                    className="w-full px-3 py-2 pr-10 border border-zinc-200 rounded-lg text-sm
                      focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    disabled={currentState.isValidating}
                  />
                  <button
                    type="button"
                    onClick={() =>
                      setShowPasswords(prev => ({ ...prev, [activeTab]: !prev[activeTab] }))
                    }
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600"
                  >
                    {showPasswords[activeTab] ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              {/* Error message */}
              {currentState.error && (
                <div className="mb-4 p-3 rounded-lg bg-red-50 border border-red-200 flex gap-2">
                  <AlertCircle size={16} className="text-red-600 flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-red-600">{currentState.error}</p>
                </div>
              )}

              {/* Success message */}
              {currentState.success && (
                <div className="mb-4 p-3 rounded-lg bg-green-50 border border-green-200 flex gap-2">
                  <Check size={16} className="text-green-600 flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-green-600">
                    {keys[activeTab] ? 'Key updated successfully' : 'Key saved successfully'}
                  </p>
                </div>
              )}

              {/* Action buttons */}
              <div className="flex gap-2">
                <button
                  onClick={() => handleSave(activeTab)}
                  disabled={currentState.isValidating || !inputValues[activeTab].trim()}
                  className="flex-1 px-4 py-2 bg-blue-500 hover:bg-blue-600 disabled:bg-zinc-200
                    disabled:cursor-not-allowed text-white text-sm font-medium rounded-lg
                    transition-colors flex items-center justify-center gap-2"
                >
                  {currentState.isValidating ? (
                    <>
                      <Loader2 size={14} className="animate-spin" />
                      Validating...
                    </>
                  ) : (
                    'Save Key'
                  )}
                </button>
                {keys[activeTab] && (
                  <button
                    onClick={() => handleRemove(activeTab)}
                    disabled={currentState.isValidating}
                    className="px-4 py-2 bg-red-50 hover:bg-red-100 disabled:bg-zinc-200
                      disabled:cursor-not-allowed text-red-600 text-sm font-medium rounded-lg
                      transition-colors disabled:text-zinc-400"
                  >
                    Remove
                  </button>
                )}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

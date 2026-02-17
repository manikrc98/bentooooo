/**
 * React hook for displaying GitHub Models quota status
 * Tracks and displays daily request/token usage with warnings
 */

import { useState, useEffect, useCallback } from 'react'
import { getQuotaStatus, isQuotaCritical, getQuotaWarning } from '../lib/llm/smartChatWrapper.js'

/**
 * Hook to track and display quota status
 * @param {string} [model] - Specific model to track (default: gpt-4o-mini)
 * @param {number} [pollIntervalMs] - How often to update (default: 5000ms)
 * @returns {{ status: Object, warning: string|null, isCritical: boolean, refresh: Function }}
 */
export function useQuotaStatus(model = 'gpt-4o-mini', pollIntervalMs = 5000) {
  const [status, setStatus] = useState(null)
  const [warning, setWarning] = useState(null)
  const [isCritical, setIsCritical] = useState(false)

  const refresh = useCallback(() => {
    try {
      const newStatus = getQuotaStatus(model)
      setStatus(newStatus)

      const newWarning = getQuotaWarning(model)
      setWarning(newWarning)

      const critical = isQuotaCritical(model)
      setIsCritical(critical)
    } catch (err) {
      console.error('Failed to get quota status:', err)
    }
  }, [model])

  // Initial load and set up polling
  useEffect(() => {
    refresh()
    const interval = setInterval(refresh, pollIntervalMs)
    return () => clearInterval(interval)
  }, [refresh, pollIntervalMs])

  return {
    status,
    warning,
    isCritical,
    refresh,
  }
}

/**
 * Hook to get quota percentage for UI progress bars
 * @param {string} [model]
 * @returns {{ requests: number, inputTokens: number, outputTokens: number }}
 */
export function useQuotaPercentage(model = 'gpt-4o-mini') {
  const { status } = useQuotaStatus(model, 10000) // Update less frequently

  if (!status) {
    return { requests: 0, inputTokens: 0, outputTokens: 0 }
  }

  return {
    requests: status.percentUsed.requests,
    inputTokens: status.percentUsed.inputTokens,
    outputTokens: status.percentUsed.outputTokens,
  }
}

/**
 * Get a human-readable quota status message
 * @param {string} [model]
 * @returns {string}
 */
export function useQuotaMessage(model = 'gpt-4o-mini') {
  const { status } = useQuotaStatus(model, 10000)

  if (!status) return 'Loading quota info...'

  const requestsRemaining = status.limit.requests - status.requests
  return `${requestsRemaining}/${status.limit.requests} requests remaining`
}

/**
 * Format quota as readable percentages
 * @param {string} [model]
 * @returns {{ used: string, remaining: string, status: 'ok'|'warning'|'critical' }}
 */
export function useQuotaFormatted(model = 'gpt-4o-mini') {
  const { status, isCritical } = useQuotaStatus(model)

  if (!status) {
    return { used: '0%', remaining: '100%', status: 'ok' }
  }

  const percent = status.percentUsed.requests
  let statusLevel = 'ok'
  if (isCritical) statusLevel = 'critical'
  else if (percent > 60) statusLevel = 'warning'

  return {
    used: `${percent}%`,
    remaining: `${100 - percent}%`,
    status: statusLevel,
  }
}

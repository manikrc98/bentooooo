/**
 * Quota indicator component for displaying GitHub Models usage
 * Shows requests used, token usage, and warnings
 */

import { useQuotaStatus, useQuotaFormatted } from '../hooks/useQuotaStatus'

export function QuotaIndicator({ model = 'gpt-4o-mini', compact = false }) {
  const { status, warning, isCritical } = useQuotaStatus(model)
  const { used, remaining, status: statusLevel } = useQuotaFormatted(model)

  if (!status) {
    return <div className="quota-indicator loading">Loading quota...</div>
  }

  const statusColors = {
    ok: '#10b981',
    warning: '#f59e0b',
    critical: '#ef4444',
  }

  if (compact) {
    return (
      <div className="quota-indicator compact" title={warning || `${used} of quota used`}>
        <div
          className="quota-bar"
          style={{
            background: statusColors[statusLevel],
            width: used,
            height: '4px',
            borderRadius: '2px',
          }}
        />
        <span className="quota-text quota-text-xs">{used}</span>
      </div>
    )
  }

  return (
    <div className="quota-indicator" style={{ borderColor: statusColors[statusLevel] }}>
      <div className="quota-header">
        <span className="quota-model">{model}</span>
        <span className={`quota-status ${statusLevel}`}>{used} used</span>
      </div>

      <div className="quota-details">
        <div className="quota-row">
          <span>Requests:</span>
          <span>
            {status.requests}/{status.limit.requests}
          </span>
        </div>
        <div className="quota-row">
          <span>Input tokens:</span>
          <span>{status.percentUsed.inputTokens}%</span>
        </div>
        <div className="quota-row">
          <span>Output tokens:</span>
          <span>{status.percentUsed.outputTokens}%</span>
        </div>
      </div>

      <div className="quota-progress">
        <div
          className="quota-fill"
          style={{
            width: used,
            background: statusColors[statusLevel],
          }}
        />
      </div>

      {warning && (
        <div className={`quota-warning ${statusLevel}`}>
          {warning}
        </div>
      )}

    </div>
  )
}

/**
 * Minimal quota badge for header/footer
 */
export function QuotaBadge({ model = 'gpt-4o-mini' }) {
  const { used, status: statusLevel } = useQuotaFormatted(model)

  const colors = {
    ok: { bg: '#dcfce7', text: '#166534' },
    warning: { bg: '#fef3c7', text: '#92400e' },
    critical: { bg: '#fee2e2', text: '#991b1b' },
  }

  const color = colors[statusLevel]

  return (
    <div
      style={{
        display: 'inline-block',
        padding: '4px 8px',
        borderRadius: '12px',
        background: color.bg,
        color: color.text,
        fontSize: '12px',
        fontWeight: '600',
        fontFamily: 'monospace',
      }}
      title={`${model} quota usage`}
    >
      {used}
    </div>
  )
}

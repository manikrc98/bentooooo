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
        <span className="quota-text text-xs">{used}</span>
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

      <style>{`
        .quota-indicator {
          padding: 12px;
          background: #f9fafb;
          border: 1px solid #e5e7eb;
          border-radius: 6px;
          font-size: 13px;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
        }

        .quota-indicator.loading {
          padding: 8px 12px;
          color: #6b7280;
        }

        .quota-indicator.compact {
          padding: 4px 8px;
          border: none;
          background: transparent;
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .quota-header {
          display: flex;
          justify-content: space-between;
          margin-bottom: 10px;
          font-weight: 500;
        }

        .quota-model {
          color: #1f2937;
        }

        .quota-status {
          font-size: 12px;
          font-weight: 600;
          padding: 2px 8px;
          border-radius: 4px;
          background: #f3f4f6;
        }

        .quota-status.ok {
          background: #dcfce7;
          color: #166534;
        }

        .quota-status.warning {
          background: #fef3c7;
          color: #92400e;
        }

        .quota-status.critical {
          background: #fee2e2;
          color: #991b1b;
        }

        .quota-details {
          margin-bottom: 10px;
          padding: 8px;
          background: white;
          border-radius: 4px;
        }

        .quota-row {
          display: flex;
          justify-content: space-between;
          padding: 4px 0;
          color: #4b5563;
        }

        .quota-row span:last-child {
          font-weight: 600;
          color: #1f2937;
        }

        .quota-progress {
          height: 6px;
          background: #e5e7eb;
          border-radius: 3px;
          overflow: hidden;
          margin-bottom: 8px;
        }

        .quota-fill {
          height: 100%;
          border-radius: 3px;
          transition: width 0.3s ease;
        }

        .quota-warning {
          padding: 8px;
          background: #fef3c7;
          border-left: 3px solid #f59e0b;
          border-radius: 4px;
          color: #92400e;
          font-size: 12px;
          margin-top: 8px;
        }

        .quota-warning.critical {
          background: #fee2e2;
          border-left-color: #ef4444;
          color: #991b1b;
        }

        .text-xs {
          font-size: 11px;
        }
      `}</style>
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

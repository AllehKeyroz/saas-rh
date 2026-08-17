import React from 'react';
import { AlertCircle, X, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function AlertBanner({ alerts = [] }) {
  const [dismissed, setDismissed] = React.useState(new Set());

  const getAlertColor = (type) => {
    const colors = {
      warning: 'bg-yellow-50 border-yellow-200 text-yellow-800',
      error: 'bg-red-50 border-red-200 text-red-800',
      info: 'bg-blue-50 border-blue-200 text-blue-800',
      success: 'bg-green-50 border-green-200 text-green-800',
    };
    return colors[type] || colors.info;
  };

  const dismiss = (originalIdx) => setDismissed(new Set([...dismissed, originalIdx]));

  const activeAlerts = alerts
    .map((alert, originalIdx) => ({ alert, originalIdx }))
    .filter(({ originalIdx }) => !dismissed.has(originalIdx));

  if (activeAlerts.length === 0) return null;

  return (
    <div className="flex flex-col gap-1.5 mb-4">
      {activeAlerts.map(({ alert, originalIdx }) => (
        <div
          key={originalIdx}
          className={cn(
            "flex items-center gap-2 rounded-lg border px-3 py-1.5 text-xs leading-none",
            getAlertColor(alert.type)
          )}
        >
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span className="font-semibold whitespace-nowrap">{alert.title}</span>
          {alert.description && (
            <span className="opacity-80 truncate min-w-0">{alert.description}</span>
          )}
          {alert.action && (
            <button
              className="font-semibold hover:underline shrink-0 whitespace-nowrap"
              onClick={() => { dismiss(originalIdx); alert.onAction?.(); }}
            >
              {alert.action} <ChevronRight className="w-3 h-3 inline" />
            </button>
          )}
          <button
            onClick={() => dismiss(originalIdx)}
            className="ml-auto opacity-50 hover:opacity-100 transition-opacity shrink-0"
            title="Dispensar"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      ))}
    </div>
  );
}

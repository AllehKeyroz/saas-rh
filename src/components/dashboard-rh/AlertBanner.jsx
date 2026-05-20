import React from 'react';
import { AlertCircle, X, ChevronRight } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
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
    <div className="space-y-3 mb-6">
      {activeAlerts.map(({ alert, originalIdx }) => (
        <Card key={originalIdx} className={cn("border-l-4 p-4 flex items-start gap-4", getAlertColor(alert.type))}>
          <AlertCircle className="w-5 h-5 mt-0.5 shrink-0" />
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-sm mb-1">{alert.title}</h3>
            <p className="text-sm opacity-90 mb-2">{alert.description}</p>
            {alert.action && (
              <Button
                size="sm"
                variant="ghost"
                className="h-auto p-0 text-xs font-semibold hover:underline"
                onClick={() => { dismiss(originalIdx); alert.onAction?.(); }}
              >
                {alert.action}
                <ChevronRight className="w-3 h-3 ml-1" />
              </Button>
            )}
          </div>
          <button
            onClick={() => dismiss(originalIdx)}
            className="text-current opacity-50 hover:opacity-100 transition-opacity"
          >
            <X className="w-4 h-4" />
          </button>
        </Card>
      ))}
    </div>
  );
}
import React from 'react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

const statusConfigs = {
  pending: { bg: 'bg-warning/10', text: 'text-warning', label: 'Pendente', icon: '⏳' },
  approved: { bg: 'bg-success/10', text: 'text-success', label: 'Aprovado', icon: '✓' },
  rejected: { bg: 'bg-destructive/10', text: 'text-destructive', label: 'Recusado', icon: '✕' },
  active: { bg: 'bg-success/10', text: 'text-success', label: 'Ativo', icon: '●' },
  inactive: { bg: 'bg-muted/10', text: 'text-muted-foreground', label: 'Inativo', icon: '○' },
  warning: { bg: 'bg-warning/10', text: 'text-warning', label: 'Atenção', icon: '⚠' },
  critical: { bg: 'bg-destructive/10', text: 'text-destructive', label: 'Crítico', icon: '●' }
};

export default function BadgeStatus({ status, customLabel, showIcon = true }) {
  const config = statusConfigs[status] || statusConfigs.pending;
  
  return (
    <Badge className={cn(
      "px-3 py-1.5 rounded-md font-medium text-13 border-0",
      config.bg,
      config.text
    )}>
      {showIcon && <span className="mr-1">{config.icon}</span>}
      {customLabel || config.label}
    </Badge>
  );
}
import React from 'react';
import { TrendingUp, TrendingDown, AlertCircle } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';

export default function StatsCard({
  title,
  value,
  icon: Icon,
  trend,
  trendLabel,
  color = 'blue',
  onClick,
  action,
  loading = false
}) {
  const colorClasses = {
    blue: 'bg-primary/10 text-primary border-primary/30',
    green: 'bg-success/10 text-success border-success/30',
    red: 'bg-destructive/10 text-destructive border-destructive/30',
    purple: 'bg-chart-4/10 text-chart-4 border-chart-4/30',
    orange: 'bg-accent/10 text-accent border-accent/30',
    pink: 'bg-warning/10 text-warning border-warning/30',
  };

  const iconColorClasses = {
    blue: 'bg-primary/10',
    green: 'bg-success/10',
    red: 'bg-destructive/10',
    purple: 'bg-chart-4/10',
    orange: 'bg-accent/10',
    pink: 'bg-warning/10',
  };

  return (
    <Card
      className={cn(
        "cursor-pointer hover:shadow-md transition-all duration-200 border rounded-lg",
        colorClasses[color]
      )}
      onClick={onClick}
    >
      <CardContent className="p-6">
        <div className="flex items-start justify-between mb-4">
          <div>
            <p className="text-sm font-medium text-muted-foreground mb-1">{title}</p>
            <p className="text-3xl font-bold text-foreground">
              {loading ? '...' : value}
            </p>
          </div>
          {Icon && (
           <div className={cn("w-12 h-12 rounded-md flex items-center justify-center", iconColorClasses[color])}>
             <Icon className="w-6 h-6" />
           </div>
          )}
        </div>

        {(trend || action) && (
          <div className="flex items-center justify-between">
            {trend && (
              <div className="flex items-center gap-1 text-sm">
                {trend > 0 ? (
                  <TrendingUp className="w-4 h-4 text-green-600" />
                ) : trend < 0 ? (
                  <TrendingDown className="w-4 h-4 text-red-600" />
                ) : null}
                <span className={trend > 0 ? 'text-green-600' : trend < 0 ? 'text-red-600' : 'text-muted-foreground'}>
                  {trendLabel}
                </span>
              </div>
            )}
            {action && (
              <button className="text-xs font-semibold text-primary hover:underline">
                {action}
              </button>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
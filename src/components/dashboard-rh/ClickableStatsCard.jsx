import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';

export default function ClickableStatsCard({
  title,
  value,
  icon,
  color = 'blue',
  route,
  tooltip,
  loading = false
}) {
  const Icon = icon;
  const [isPressed, setIsPressed] = useState(false);
  const navigate = useNavigate();

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

  const handleClick = () => {
    if (route) {
      navigate(route);
    }
  };

  const handleMouseDown = () => setIsPressed(true);
  const handleMouseUp = () => setIsPressed(false);
  const handleMouseLeave = () => setIsPressed(false);

  return (
    <div title={tooltip} className="group">
      <Card
        onClick={handleClick}
        onMouseDown={handleMouseDown}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseLeave}
        tabIndex={route ? 0 : -1}
        onKeyDown={(e) => {
          if (route && (e.key === 'Enter' || e.key === ' ')) {
            e.preventDefault();
            handleClick();
          }
        }}
        className={cn(
          "rounded-lg border transition-all duration-200",
          route && "cursor-pointer",
          route && "hover:shadow-md hover:border-primary",
          isPressed && route && "shadow-lg transform scale-98",
          colorClasses[color],
          !route && "cursor-default"
        )}
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
        </CardContent>
      </Card>
    </div>
  );
}
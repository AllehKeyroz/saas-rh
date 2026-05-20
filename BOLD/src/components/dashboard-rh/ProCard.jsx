import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';

export default function ProCard({
  title,
  subtitle,
  icon,
  children,
  action,
  loading,
  className = '',
  headerClassName = '',
  contentClassName = ''
}) {
  const Icon = icon;
  return (
    <Card className={cn(
      "border border-border rounded-lg shadow-sm hover:shadow-md transition-shadow",
      className
    )}>
      {(title || Icon) && (
        <CardHeader className={cn(
          "pb-3 border-b border-border",
          headerClassName
        )}>
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-start gap-3 flex-1">
              {Icon && (
                <div className="p-2 bg-primary/10 rounded-md mt-1">
                  <Icon className="w-5 h-5 text-primary" />
                </div>
              )}
              <div className="flex-1">
                {title && (
                  <CardTitle className="text-foreground text-16 font-bold">
                    {title}
                  </CardTitle>
                )}
                {subtitle && (
                  <p className="text-muted-foreground text-13 mt-1">{subtitle}</p>
                )}
              </div>
            </div>
            {action && <div>{action}</div>}
          </div>
        </CardHeader>
      )}
      <CardContent className={cn(
        "pt-6",
        contentClassName
      )}>
        {loading ? (
          <div className="flex items-center justify-center h-32 text-muted-foreground">
            Carregando...
          </div>
        ) : (
          children
        )}
      </CardContent>
    </Card>
  );
}
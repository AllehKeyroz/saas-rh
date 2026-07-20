import React from 'react';

export default function LimiteProgressBar({ percentual, className = '' }) {
  if (percentual === null || percentual === undefined) return null;

  const pct = Math.min(Math.max(percentual, 0), 100);

  return (
    <div className={`space-y-1.5 ${className}`}>
      <div className="flex justify-between text-xs">
        <span className="text-muted-foreground">Utilização do limite</span>
        <span className={`font-bold ${pct >= 100 ? 'text-destructive' : pct >= 80 ? 'text-yellow-600' : 'text-green-600'}`}>
          {pct.toFixed(0)}%
        </span>
      </div>
      <div className="w-full h-2.5 rounded-full bg-muted overflow-hidden">
        <div
          className={`h-full rounded-full transition-all ${pct >= 100 ? 'bg-destructive' : pct >= 80 ? 'bg-yellow-500' : 'bg-green-500'}`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

import React from 'react';
import { Link } from 'react-router-dom';
import { cn } from '@/lib/utils';

export default function MobileNavigation({ items, activeIndex = 0, className = '' }) {
  return (
    <div className={cn(
      "flex gap-2 overflow-x-auto pb-2 lg:hidden border-b border-border",
      className
    )}>
      {items.map((item, idx) => (
        <Link
          key={idx}
          to={item.path}
          className={cn(
            "flex items-center gap-2 px-4 py-2 rounded-md whitespace-nowrap text-13 font-medium transition-all",
            activeIndex === idx 
              ? "bg-primary text-white shadow-sm" 
              : "bg-secondary text-muted-foreground hover:bg-secondary/80"
          )}
        >
          {item.icon && <span>{item.icon}</span>}
          {item.label}
        </Link>
      ))}
    </div>
  );
}
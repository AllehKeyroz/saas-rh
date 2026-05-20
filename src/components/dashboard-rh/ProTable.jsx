import React from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { cn } from '@/lib/utils';

export default function ProTable({ 
  columns, 
  data, 
  striped = true,
  hoverable = true,
  className = '' 
}) {
  return (
    <div className="overflow-x-auto rounded-lg border border-border shadow-sm">
      <Table className={className}>
        <TableHeader>
          <TableRow className="bg-primary-dark hover:bg-primary-dark">
            {columns.map((col) => (
              <TableHead 
                key={col.key} 
                className="text-white font-semibold text-14 py-3 px-4"
              >
                {col.label}
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.map((row, rowIdx) => (
            <TableRow
              key={rowIdx}
              className={cn(
                striped && rowIdx % 2 === 0 && 'bg-secondary/20',
                hoverable && 'hover:bg-secondary/30 transition-colors'
              )}
            >
              {columns.map((col) => (
                <TableCell
                  key={`${rowIdx}-${col.key}`}
                  className="text-foreground text-14 py-3 px-4"
                >
                  {col.render ? col.render(row[col.key], row) : row[col.key]}
                </TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
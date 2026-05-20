import React, { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { DollarSign, ChevronDown } from 'lucide-react';
import { formatCurrency } from '@/lib/formatters';

export default function ResumoSalarioCard({ label, valor, salarioBase, comissao, tipo = 'medio' }) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <div
        onClick={() => setOpen(true)}
        className="bg-card rounded-xl border p-4 flex items-center gap-3 cursor-pointer hover:shadow-md transition-shadow"
      >
        <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
          <DollarSign className="w-5 h-5 text-primary" />
        </div>
        <div className="flex-1">
          <p className="text-xs text-muted-foreground">{label}</p>
          <p className="text-base font-bold text-foreground">{formatCurrency(valor)}</p>
        </div>
        <ChevronDown className="w-4 h-4 text-muted-foreground" />
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>{label}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Salário Base (Contrato)</span>
              <span className="font-medium">{formatCurrency(salarioBase)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">
                {tipo === 'medio' ? 'Comissão (Mês Anterior)' : 'Comissão (Mês Corrente)'}
              </span>
              <span className="font-medium text-green-600">{formatCurrency(comissao)}</span>
            </div>
            <div className="border-t pt-3 flex justify-between text-sm font-bold">
              <span>Total</span>
              <span className="text-primary">{formatCurrency(valor)}</span>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Loader2, User, Calculator } from 'lucide-react';
import { formatCurrency } from '@/lib/formatters';

const TIPOS_FECHAMENTO = [
  { value: 'mensal', label: 'Mensal (normal)' },
  { value: 'rescisao', label: 'Rescisão' },
  { value: 'ferias', label: 'Férias' },
];

export default function FechamentoIndividualDialog({ open, onClose, funcionarios, mesRef, calcular, onProcessar, processing }) {
  const [funcId, setFuncId] = useState('');
  const [tipo, setTipo] = useState('mensal');

  const func = funcionarios.find(f => f.id === funcId);
  const calc = funcId ? calcular(funcId) : null;

  const handleProcessar = () => {
    if (!func) return;
    onProcessar(func, tipo);
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Calculator className="w-5 h-5 text-primary" />
            Fechamento Individual
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 mt-2">
          <div className="space-y-1.5">
            <Label>Funcionário</Label>
            <Select value={funcId} onValueChange={setFuncId}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione o funcionário..." />
              </SelectTrigger>
              <SelectContent>
                {[...funcionarios].sort((a, b) => (a.nome || '').localeCompare(b.nome || '')).map(f => (
                  <SelectItem key={f.id} value={f.id}>{f.nome}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label>Tipo de Fechamento</Label>
            <Select value={tipo} onValueChange={setTipo}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {TIPOS_FECHAMENTO.map(t => (
                  <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {calc && func && (
            <div className="rounded-lg border bg-muted/40 p-4 space-y-2">
              <div className="flex items-center gap-2 mb-3">
                <User className="w-4 h-4 text-muted-foreground" />
                <span className="font-semibold text-sm">{func.nome}</span>
                <Badge variant="outline" className="ml-auto text-xs">{mesRef}</Badge>
              </div>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div>
                  <p className="text-xs text-muted-foreground">Salário Base</p>
                  <p className="font-medium">{formatCurrency(calc.salarioBase)}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Comissão</p>
                  <p className="font-medium text-emerald-600">{formatCurrency(calc.comissaoGorjeta || 0)}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Adicionais</p>
                  <p className="font-medium text-green-600">{formatCurrency(calc.totalAdicionais)}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Descontos</p>
                  <p className="font-medium text-destructive">{formatCurrency(calc.totalDescontos)}</p>
                </div>
              </div>
              <div className="border-t pt-2 mt-1 flex justify-between items-center">
                <span className="text-sm font-semibold">Salário Líquido</span>
                <span className="text-base font-bold">{formatCurrency(calc.salarioLiquido)}</span>
              </div>
              {tipo !== 'mensal' && (
                <div className="mt-1">
                  <Badge className={tipo === 'rescisao' ? 'bg-red-100 text-red-700' : 'bg-blue-100 text-blue-700'}>
                    {tipo === 'rescisao' ? '⚠️ Fechamento por Rescisão' : '🏖️ Fechamento por Férias'}
                  </Badge>
                </div>
              )}
            </div>
          )}

          <div className="flex justify-end gap-2 pt-1">
            <Button variant="outline" onClick={onClose}>Cancelar</Button>
            <Button onClick={handleProcessar} disabled={!funcId || processing}>
              {processing && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Processar Fechamento
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
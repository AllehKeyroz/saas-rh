import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { formatCurrency, parseDateLocal, getMesRef } from '@/lib/formatters';
import { AlertTriangle, XCircle, CheckCircle, Wallet } from 'lucide-react';

export default function PainelValesCard({ funcionarios, lancamentos, mesAtual }) {
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);
  // Filtra apenas vales e adiantamentos do mês
  const valesDoMes = lancamentos.filter(l => {
    if (!['vale', 'adiantamento'].includes(l.tipo_lancamento)) return false;
    if (!l.data_lancamento) return false;
    const mr = getMesRef(l.data_lancamento);
    return mr === mesAtual;
  });

  const totalVales = valesDoMes.reduce((s, l) => s + (l.valor || 0), 0);

  // Calcula percentual por funcionário ativo com limite configurado
  const ativos = funcionarios.filter(f => f.ativo !== false && f.limite_vales);

  const statusFuncionarios = ativos.map(f => {
    const usado = valesDoMes
      .filter(l => l.funcionario_id === f.id)
      .reduce((s, l) => s + (l.valor || 0), 0);
    const percentual = (usado / f.limite_vales) * 100;
    return { ...f, usado, percentual };
  });

  const atingiram100 = statusFuncionarios.filter(f => f.percentual >= 100);
  const atingiram80 = statusFuncionarios.filter(f => f.percentual >= 80 && f.percentual < 100);
  const abaixo80 = statusFuncionarios.filter(f => f.percentual < 80);

  const items = [
    {
      icon: XCircle,
      iconColor: 'text-destructive',
      bgColor: 'bg-destructive/10',
      label: 'Limite esgotado (≥ 100%)',
      count: atingiram100.length,
      badgeVariant: 'destructive',
      names: atingiram100.sort((a, b) => (a.nome || '').localeCompare(b.nome || '')).map(f => f.nome),
    },
    {
      icon: AlertTriangle,
      iconColor: 'text-yellow-500',
      bgColor: 'bg-yellow-100',
      label: 'Alerta (≥ 80%)',
      count: atingiram80.length,
      badgeVariant: 'outline',
      names: atingiram80.sort((a, b) => (a.nome || '').localeCompare(b.nome || '')).map(f => f.nome),
    },
    {
      icon: CheckCircle,
      iconColor: 'text-green-500',
      bgColor: 'bg-green-100',
      label: 'Dentro do limite',
      count: abaixo80.length,
      badgeVariant: 'secondary',
      names: [],
    },
  ];

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
            <Wallet className="w-4 h-4 text-primary" />
          </div>
          <CardTitle className="text-lg">Controle de Vales — {mesAtual}</CardTitle>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between rounded-lg bg-muted/50 px-4 py-3">
          <span className="text-sm text-muted-foreground">Total emitido no mês</span>
          <span className="text-xl font-bold text-primary">{formatCurrency(totalVales)}</span>
        </div>

        <div className="space-y-2">
           {items.map((item) => (
             <button
               key={item.label}
               onClick={() => { setSelectedItem(item); setModalOpen(true); }}
               className="w-full flex items-center justify-between gap-3 rounded-lg border px-3 py-2.5 hover:bg-muted/50 transition-colors cursor-pointer"
             >
               <div className="flex items-center gap-3 flex-1 text-left">
                 <div className={`w-8 h-8 rounded-lg ${item.bgColor} flex items-center justify-center shrink-0`}>
                   <item.icon className={`w-4 h-4 ${item.iconColor}`} />
                 </div>
                 <div>
                   <p className="text-sm font-medium">{item.label}</p>
                   {item.names.length > 0 && (
                     <p className="text-xs text-muted-foreground truncate max-w-[200px]">
                       {item.names.slice(0, 3).join(', ')}{item.names.length > 3 ? ` +${item.names.length - 3}` : ''}
                     </p>
                   )}
                 </div>
               </div>
               <Badge variant={item.badgeVariant} className="text-base font-bold px-3 py-1">
                 {item.count}
               </Badge>
             </button>
           ))}
         </div>

        {ativos.length === 0 && (
           <p className="text-xs text-muted-foreground text-center py-2">
             Nenhum funcionário com limite de vales configurado.
           </p>
         )}
        </CardContent>

        {/* Modal com nomes dos funcionários */}
        <Dialog open={modalOpen} onOpenChange={setModalOpen}>
         <DialogContent className="max-w-md">
           <DialogHeader>
             <DialogTitle>{selectedItem?.label}</DialogTitle>
           </DialogHeader>
           <div className="space-y-2">
             {selectedItem?.names.length > 0 ? (
               selectedItem.names.map((nome, idx) => (
                 <div key={idx} className="flex items-center gap-3 p-3 rounded-lg bg-muted/50 border">
                   <div className="w-2 h-2 rounded-full bg-primary" />
                   <span className="text-sm font-medium">{nome}</span>
                 </div>
               ))
             ) : (
               <p className="text-sm text-muted-foreground text-center py-4">
                 Nenhum funcionário nesta categoria.
               </p>
             )}
           </div>
         </DialogContent>
        </Dialog>
        </Card>
        );
        }
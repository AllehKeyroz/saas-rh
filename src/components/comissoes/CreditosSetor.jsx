import React, { useMemo, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { formatCurrency } from '@/lib/formatters';
import { formatPeriodo } from '@/lib/comissoes';
import { Wallet, CheckCircle2, History, Eye, ArrowRight } from 'lucide-react';

function OrigemDialog({ credito, onClose }) {
  if (!credito) return null;
  return (
    <Dialog open={!!credito} onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Origem do crédito</DialogTitle>
          <DialogDescription>Detalhes do crédito de setor.</DialogDescription>
        </DialogHeader>
        <div className="space-y-2 text-sm">
          <div className="flex justify-between gap-4">
            <span className="text-muted-foreground">Setor</span>
            <strong>{credito.setor_nome || '—'}</strong>
          </div>
          <div className="flex justify-between gap-4">
            <span className="text-muted-foreground">Valor</span>
            <strong className="text-emerald-700">{formatCurrency(credito.valor || 0)}</strong>
          </div>
          <div className="flex justify-between gap-4">
            <span className="text-muted-foreground">Origem (período)</span>
            <strong>{formatPeriodo(credito.origem_periodo_inicio, credito.origem_periodo_fim)}</strong>
          </div>
          <div className="flex justify-between gap-4">
            <span className="text-muted-foreground">Mês de referência</span>
            <strong>{credito.origem_mes_referencia || '—'}</strong>
          </div>
          <div className="flex justify-between gap-4 items-center">
            <span className="text-muted-foreground">Status</span>
            {credito.status === 'usado' ? (
              <Badge variant="outline" className="text-slate-600">
                <CheckCircle2 className="w-3 h-3 mr-1" />Usado
              </Badge>
            ) : (
              <Badge variant="outline" className="text-emerald-700 border-emerald-300">
                <Wallet className="w-3 h-3 mr-1" />Disponível
              </Badge>
            )}
          </div>
          {credito.status === 'usado' && credito.usado_em && (
            <div className="flex justify-between gap-4">
              <span className="text-muted-foreground">Usado em</span>
              <strong>{new Date(credito.usado_em).toLocaleDateString('pt-BR')}</strong>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default function CreditosSetor({ creditos = [], onUsarNoLancamento }) {
  const [selecionados, setSelecionados] = useState([]);
  const [origem, setOrigem] = useState(null);

  const disponiveis = useMemo(() => creditos.filter(c => c.status !== 'usado'), [creditos]);
  const usados = useMemo(() => creditos.filter(c => c.status === 'usado'), [creditos]);
  const totalDisponivel = disponiveis.reduce((s, c) => s + (c.valor || 0), 0);

  const toggle = (id) => {
    setSelecionados(prev => (prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]));
  };

  const toggleTodos = () => {
    setSelecionados(selecionados.length === disponiveis.length ? [] : disponiveis.map(c => c.id));
  };

  if (creditos.length === 0) {
    return (
      <div className="text-center py-16 text-muted-foreground">
        <Wallet className="w-8 h-8 mx-auto mb-3 opacity-40" />
        <p className="font-medium">Nenhum crédito de setor.</p>
        <p className="text-sm mt-1">Quando um setor ficar sem ninguém apto, o valor vira crédito e aparece aqui.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Total disponível</p>
            <p className="text-xl font-bold text-emerald-700">{formatCurrency(totalDisponivel)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Créditos disponíveis</p>
            <p className="text-xl font-bold">{disponiveis.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Créditos já usados</p>
            <p className="text-xl font-bold">{usados.length}</p>
          </CardContent>
        </Card>
      </div>

      <div className="space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <h3 className="font-medium text-sm">Disponíveis</h3>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={toggleTodos} disabled={disponiveis.length === 0}>
              {selecionados.length === disponiveis.length && disponiveis.length > 0 ? 'Desmarcar todas' : 'Selecionar todas'}
            </Button>
            <Button size="sm" disabled={selecionados.length === 0} onClick={() => onUsarNoLancamento?.(selecionados)}>
              <ArrowRight className="w-4 h-4 mr-2" />
              Usar no lançamento ({selecionados.length})
            </Button>
          </div>
        </div>

        {disponiveis.length === 0 ? (
          <div className="text-center py-10 text-muted-foreground text-sm">Nenhum crédito disponível no momento.</div>
        ) : (
          disponiveis.map(c => (
            <Card key={c.id} className="border-emerald-200">
              <CardContent className="p-4 flex items-center gap-3">
                <Checkbox
                  checked={selecionados.includes(c.id)}
                  onCheckedChange={() => toggle(c.id)}
                  aria-label={`Selecionar crédito de ${c.setor_nome}`}
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <Wallet className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span className="font-medium truncate">{c.setor_nome || 'Setor'}</span>
                    <span className="text-xs text-muted-foreground">· origem {formatPeriodo(c.origem_periodo_inicio, c.origem_periodo_fim)}</span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">Mês de referência: {c.origem_mes_referencia || '—'}</p>
                </div>
                <div className="text-right shrink-0">
                  <p className="font-bold text-emerald-700">{formatCurrency(c.valor || 0)}</p>
                  <Button variant="ghost" size="sm" className="text-xs text-muted-foreground" onClick={() => setOrigem(c)}>
                    <Eye className="w-3.5 h-3.5 mr-1" />Ver origem
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {usados.length > 0 && (
        <div className="space-y-3">
          <h3 className="font-medium text-sm flex items-center gap-2">
            <History className="w-4 h-4 text-muted-foreground" />Já usados
          </h3>
          {usados.map(c => (
            <Card key={c.id} className="opacity-70">
              <CardContent className="p-4 flex items-center gap-3">
                <CheckCircle2 className="w-4 h-4 text-slate-400 shrink-0" />
                <div className="flex-1 min-w-0">
                  <span className="font-medium">{c.setor_nome || 'Setor'}</span>
                  <span className="text-xs text-muted-foreground"> · origem {formatPeriodo(c.origem_periodo_inicio, c.origem_periodo_fim)}</span>
                  {c.usado_em && (
                    <p className="text-xs text-muted-foreground mt-0.5">Usado em {new Date(c.usado_em).toLocaleDateString('pt-BR')}</p>
                  )}
                </div>
                <span className="font-semibold text-slate-500">{formatCurrency(c.valor || 0)}</span>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <OrigemDialog credito={origem} onClose={() => setOrigem(null)} />
    </div>
  );
}

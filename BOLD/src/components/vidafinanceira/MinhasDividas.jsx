import React, { useState, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Pencil, Trash2, CreditCard, Building2, TrendingUp, Calendar, CheckCircle2 } from 'lucide-react';
import { formatCurrency } from '@/lib/formatters';
import { useToast } from '@/components/ui/use-toast';

const TIPOS = {
  cartao_credito: { label: 'Cartão de Crédito', color: 'bg-blue-100 text-blue-700' },
  emprestimo_pessoal: { label: 'Empréstimo Pessoal', color: 'bg-orange-100 text-orange-700' },
  consignado: { label: 'Consignado', color: 'bg-purple-100 text-purple-700' },
  financiamento: { label: 'Financiamento', color: 'bg-green-100 text-green-700' },
  cheque_especial: { label: 'Cheque Especial', color: 'bg-red-100 text-red-700' },
  outro: { label: 'Outro', color: 'bg-gray-100 text-gray-700' },
};

const EMPTY = { tipo: 'cartao_credito', descricao: '', instituicao: '', valor_total: '', valor_parcela: '', parcelas_total: '', parcelas_pagas: '0', taxa_juros_mensal: '', dia_vencimento: '', ativa: true };

function DividaForm({ open, onClose, onSaved, funcionarioId, divida }) {
  const { toast } = useToast();
  const [form, setForm] = useState(divida || EMPTY);
  const [saving, setSaving] = useState(false);

  React.useEffect(() => { setForm(divida || EMPTY); }, [divida, open]);

  const n = f => parseFloat(f) || 0;
  const ni = f => parseInt(f) || 0;

  const handleSave = async () => {
    if (!form.descricao || !form.valor_parcela) { toast({ title: 'Preencha descrição e valor da parcela', variant: 'destructive' }); return; }
    setSaving(true);
    const data = { ...form, funcionario_id: funcionarioId, valor_total: n(form.valor_total), valor_parcela: n(form.valor_parcela), parcelas_total: ni(form.parcelas_total), parcelas_pagas: ni(form.parcelas_pagas), taxa_juros_mensal: n(form.taxa_juros_mensal), dia_vencimento: ni(form.dia_vencimento) };
    if (divida?.id) {
      await base44.entities.DividasPessoais.update(divida.id, data);
    } else {
      await base44.entities.DividasPessoais.create(data);
    }
    setSaving(false);
    onSaved();
    onClose();
    toast({ title: 'Dívida salva!' });
  };

  return (
    <Dialog open={open} onOpenChange={v => !v && onClose()}>
      <DialogContent className="max-w-sm max-h-[90vh] overflow-y-auto">
        <DialogHeader><DialogTitle>{divida?.id ? 'Editar' : 'Nova'} Dívida</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div>
            <Label>Tipo</Label>
            <Select value={form.tipo} onValueChange={v => setForm({ ...form, tipo: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{Object.entries(TIPOS).map(([k, v]) => <SelectItem key={k} value={k}>{v.label}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div><Label>Descrição</Label><Input value={form.descricao} onChange={e => setForm({ ...form, descricao: e.target.value })} placeholder="Ex: Cartão Nubank" /></div>
          <div><Label>Instituição</Label><Input value={form.instituicao} onChange={e => setForm({ ...form, instituicao: e.target.value })} placeholder="Ex: Nubank, CEF" /></div>
          <div className="grid grid-cols-2 gap-2">
            <div><Label>Valor Total (R$)</Label><Input type="number" value={form.valor_total} onChange={e => setForm({ ...form, valor_total: e.target.value })} placeholder="0,00" /></div>
            <div><Label>Parcela (R$)</Label><Input type="number" value={form.valor_parcela} onChange={e => setForm({ ...form, valor_parcela: e.target.value })} placeholder="0,00" /></div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div><Label>Nº Parcelas</Label><Input type="number" value={form.parcelas_total} onChange={e => setForm({ ...form, parcelas_total: e.target.value })} placeholder="12" /></div>
            <div><Label>Pagas</Label><Input type="number" value={form.parcelas_pagas} onChange={e => setForm({ ...form, parcelas_pagas: e.target.value })} /></div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div><Label>Juros/mês (%)</Label><Input type="number" value={form.taxa_juros_mensal} onChange={e => setForm({ ...form, taxa_juros_mensal: e.target.value })} placeholder="1.99" /></div>
            <div><Label>Dia vencimento</Label><Input type="number" min="1" max="31" value={form.dia_vencimento} onChange={e => setForm({ ...form, dia_vencimento: e.target.value })} /></div>
          </div>
          <div className="flex gap-2 pt-2">
            <Button variant="outline" className="flex-1" onClick={onClose}>Cancelar</Button>
            <Button className="flex-1" onClick={handleSave} disabled={saving}>{saving ? 'Salvando...' : 'Salvar'}</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function ProgressBar({ value, max, color = 'bg-primary' }) {
  const pct = max > 0 ? Math.min((value / max) * 100, 100) : 0;
  return (
    <div className="w-full h-2 rounded-full bg-muted overflow-hidden">
      <div className={`h-full rounded-full transition-all ${color}`} style={{ width: `${pct}%` }} />
    </div>
  );
}

export default function MinhasDividas({ funcionarioId, salarioBase = 0 }) {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [formOpen, setFormOpen] = useState(false);
  const [editItem, setEditItem] = useState(null);

  const { data: dividas = [] } = useQuery({
    queryKey: ['dividas_pessoais', funcionarioId],
    queryFn: () => base44.entities.DividasPessoais.filter({ funcionario_id: funcionarioId }),
    enabled: !!funcionarioId,
  });

  const ativas = dividas.filter(d => d.ativa);
  const totalParcelas = ativas.reduce((s, d) => s + (d.valor_parcela || 0), 0);
  const totalDevido = ativas.reduce((s, d) => {
    const restantes = (d.parcelas_total || 0) - (d.parcelas_pagas || 0);
    return s + (d.valor_parcela || 0) * Math.max(restantes, 0);
  }, 0);
  const pctSalario = salarioBase > 0 ? ((totalParcelas / salarioBase) * 100).toFixed(1) : null;

  const handleDelete = async (id) => {
    if (!confirm('Excluir dívida?')) return;
    await base44.entities.DividasPessoais.delete(id);
    qc.invalidateQueries({ queryKey: ['dividas_pessoais'] });
    toast({ title: 'Dívida removida' });
  };

  const handleQuitar = async (divida) => {
    await base44.entities.DividasPessoais.update(divida.id, { ativa: false, parcelas_pagas: divida.parcelas_total });
    qc.invalidateQueries({ queryKey: ['dividas_pessoais'] });
    toast({ title: '🎉 Dívida quitada!' });
  };

  const onSaved = () => qc.invalidateQueries({ queryKey: ['dividas_pessoais'] });

  return (
    <div className="space-y-4">
      {/* Resumo */}
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-red-50 border border-red-200 rounded-xl p-4">
          <p className="text-xs text-red-600 font-medium">Total Devedor</p>
          <p className="text-xl font-bold text-red-800">{formatCurrency(totalDevido)}</p>
          <p className="text-xs text-red-500 mt-0.5">{ativas.length} dívida(s) ativa(s)</p>
        </div>
        <div className="bg-orange-50 border border-orange-200 rounded-xl p-4">
          <p className="text-xs text-orange-600 font-medium">Parcelas/Mês</p>
          <p className="text-xl font-bold text-orange-800">{formatCurrency(totalParcelas)}</p>
          <p className="text-xs text-orange-500 mt-0.5">{pctSalario ? `${pctSalario}% do salário` : '—'}</p>
        </div>
      </div>

      {pctSalario > 30 && (
        <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-700">
          ⚠️ Suas parcelas comprometem <strong>{pctSalario}%</strong> do salário. O recomendado é até 30%.
        </div>
      )}

      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold">Suas Dívidas</p>
        <Button size="sm" onClick={() => { setEditItem(null); setFormOpen(true); }}>
          <Plus className="w-4 h-4 mr-1" />Adicionar
        </Button>
      </div>

      {ativas.length === 0 ? (
        <Card><CardContent className="py-10 text-center text-sm text-muted-foreground">Nenhuma dívida ativa. <button className="text-primary underline" onClick={() => { setEditItem(null); setFormOpen(true); }}>Cadastrar</button></CardContent></Card>
      ) : (
        <div className="space-y-3">
          {ativas.map(d => {
            const tipo = TIPOS[d.tipo] || TIPOS.outro;
            const restantes = (d.parcelas_total || 0) - (d.parcelas_pagas || 0);
            const totalRestante = d.valor_parcela * Math.max(restantes, 0);
            return (
              <Card key={d.id}>
                <CardContent className="p-4 space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="font-semibold text-sm">{d.descricao}</p>
                      {d.instituicao && <p className="text-xs text-muted-foreground">{d.instituicao}</p>}
                      <Badge className={`${tipo.color} border-0 text-xs mt-1`}>{tipo.label}</Badge>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="font-bold text-sm text-red-700">{formatCurrency(d.valor_parcela)}/mês</p>
                      {d.dia_vencimento && <p className="text-xs text-muted-foreground">Vence dia {d.dia_vencimento}</p>}
                    </div>
                  </div>

                  {d.parcelas_total > 0 && (
                    <div className="space-y-1">
                      <div className="flex justify-between text-xs text-muted-foreground">
                        <span>{d.parcelas_pagas || 0}/{d.parcelas_total} parcelas pagas</span>
                        <span>Restam {formatCurrency(totalRestante)}</span>
                      </div>
                      <ProgressBar value={d.parcelas_pagas || 0} max={d.parcelas_total} color="bg-orange-500" />
                    </div>
                  )}

                  {d.taxa_juros_mensal > 0 && (
                    <p className="text-xs text-muted-foreground flex items-center gap-1">
                      <TrendingUp className="w-3 h-3" />Juros: {d.taxa_juros_mensal}% a.m.
                    </p>
                  )}

                  <div className="flex gap-2">
                    <Button size="sm" variant="outline" className="flex-1 text-green-700 border-green-300 hover:bg-green-50" onClick={() => handleQuitar(d)}>
                      <CheckCircle2 className="w-3 h-3 mr-1" />Quitar
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => { setEditItem(d); setFormOpen(true); }}><Pencil className="w-3 h-3" /></Button>
                    <Button size="sm" variant="ghost" className="text-destructive" onClick={() => handleDelete(d.id)}><Trash2 className="w-3 h-3" /></Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <DividaForm
        open={formOpen}
        onClose={() => { setFormOpen(false); setEditItem(null); }}
        onSaved={onSaved}
        funcionarioId={funcionarioId}
        divida={editItem}
      />
    </div>
  );
}
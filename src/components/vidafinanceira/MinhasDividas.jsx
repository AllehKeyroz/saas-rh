import React, { useState, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { client } from '@/api/client';
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
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';

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
    const parcelasTotal = ni(form.parcelas_total);
    const parcelasPagas = ni(form.parcelas_pagas);
    const data = {
      ...form,
      funcionario_id: funcionarioId,
      valor_total: n(form.valor_total),
      valor_parcela: n(form.valor_parcela),
      parcelas_total: parcelasTotal,
      parcelas_pagas: parcelasPagas,
      taxa_juros_mensal: n(form.taxa_juros_mensal),
      dia_vencimento: ni(form.dia_vencimento),
      ativa: parcelasTotal > parcelasPagas,
    };
    if (divida?.id) {
      await client.entities.DividasPessoais.update(divida.id, data);
    } else {
      await client.entities.DividasPessoais.create(data);
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
  const [deleteTarget, setDeleteTarget] = useState(null);

  const { data: dividas = [] } = useQuery({
    queryKey: ['dividas_pessoais', funcionarioId],
    queryFn: () => client.entities.DividasPessoais.filter({ funcionario_id: funcionarioId }),
    enabled: !!funcionarioId,
  });

  const ativas = dividas.filter(d => d.ativa);
  const totalParcelas = ativas.reduce((s, d) => s + (d.valor_parcela || 0), 0);
  const totalDevido = ativas.reduce((s, d) => {
    const restantes = (d.parcelas_total || 0) - (d.parcelas_pagas || 0);
    return s + (d.valor_parcela || 0) * Math.max(restantes, 0);
  }, 0);
  const pctSalario = salarioBase > 0 ? ((totalParcelas / salarioBase) * 100).toFixed(1) : null;

  const handleDelete = async () => {
    if (!deleteTarget) return;
    await client.entities.DividasPessoais.delete(deleteTarget);
    qc.invalidateQueries({ queryKey: ['dividas_pessoais'] });
    toast({ title: 'Dívida removida' });
    setDeleteTarget(null);
  };

  const handlePagarParcela = async (divida) => {
    const pagas = (divida.parcelas_pagas || 0) + 1;
    const total = divida.parcelas_total || 0;
    const data = pagas >= total
      ? { parcelas_pagas: pagas, ativa: false }
      : { parcelas_pagas: pagas };
    await client.entities.DividasPessoais.update(divida.id, data);
    qc.invalidateQueries({ queryKey: ['dividas_pessoais'] });
    toast({ title: pagas >= total ? '🎉 Dívida quitada!' : `✅ Parcela ${pagas}/${total} paga` });
  };

  const onSaved = () => qc.invalidateQueries({ queryKey: ['dividas_pessoais'] });

  const [mostrarQuitadas, setMostrarQuitadas] = useState(false);
  const quitadas = dividas.filter(d => !d.ativa);
  const exibidas = mostrarQuitadas ? quitadas : ativas;

  return (
    <div className="space-y-4">
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
        <div className="flex gap-2">
          <button onClick={() => setMostrarQuitadas(false)} className={`text-sm px-3 py-1 rounded-full font-medium transition-colors ${!mostrarQuitadas ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground'}`}>Ativas ({ativas.length})</button>
          <button onClick={() => setMostrarQuitadas(true)} className={`text-sm px-3 py-1 rounded-full font-medium transition-colors ${mostrarQuitadas ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground'}`}>Quitadas ({quitadas.length})</button>
        </div>
        <Button size="sm" onClick={() => { setEditItem(null); setFormOpen(true); }}>
          <Plus className="w-4 h-4 mr-1" />Adicionar
        </Button>
      </div>

      {exibidas.length === 0 ? (
        <Card><CardContent className="py-10 text-center text-sm text-muted-foreground">
          {mostrarQuitadas ? 'Nenhuma dívida quitada ainda.' : 'Nenhuma dívida ativa.'}
          {!mostrarQuitadas && <button className="text-primary underline ml-1" onClick={() => { setEditItem(null); setFormOpen(true); }}>Cadastrar</button>}
        </CardContent></Card>
      ) : (
        <div className="space-y-3">
          {exibidas.map(d => {
            const tipo = TIPOS[d.tipo] || TIPOS.outro;
            const restantes = (d.parcelas_total || 0) - (d.parcelas_pagas || 0);
            const totalRestante = (d.valor_parcela || 0) * Math.max(restantes, 0);
            return (
              <Card key={d.id}>
                <CardContent className="p-4 space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="font-semibold text-sm">{d.descricao}</p>
                      {d.instituicao && <p className="text-xs text-muted-foreground">{d.instituicao}</p>}
                      <Badge className={`${tipo.color} border-0 text-xs mt-1`}>{tipo.label}</Badge>
                      {!d.ativa && <Badge className="text-xs bg-green-100 text-green-700 border-0 ml-1">Quitada</Badge>}
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
                        <span>{mostrarQuitadas ? 'Concluída' : `Restam ${formatCurrency(totalRestante)}`}</span>
                      </div>
                      <ProgressBar value={d.parcelas_pagas || 0} max={d.parcelas_total} color={!d.ativa ? 'bg-green-500' : 'bg-orange-500'} />
                    </div>
                  )}

                  {d.taxa_juros_mensal > 0 && (
                    <p className="text-xs text-muted-foreground flex items-center gap-1">
                      <TrendingUp className="w-3 h-3" />Juros: {d.taxa_juros_mensal}% a.m.
                    </p>
                  )}

                  <div className="flex gap-2">
                    {d.ativa && (
                      <Button size="sm" variant="outline" className="flex-1 text-green-700 border-green-300 hover:bg-green-50" onClick={() => handlePagarParcela(d)}>
                        <CheckCircle2 className="w-3 h-3 mr-1" />
                        {d.parcelas_total > 0 ? `Pagar Parcela (${d.parcelas_pagas || 0}/${d.parcelas_total})` : 'Quitar'}
                      </Button>
                    )}
                    <Button size="sm" variant="ghost" onClick={() => { setEditItem(d); setFormOpen(true); }}><Pencil className="w-3 h-3" /></Button>
                    <Button size="sm" variant="ghost" className="text-destructive" onClick={() => setDeleteTarget(d.id)}><Trash2 className="w-3 h-3" /></Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir dívida?</AlertDialogTitle>
            <AlertDialogDescription>Esta ação não pode ser desfeita.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setDeleteTarget(null)}>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete}>Excluir</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

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
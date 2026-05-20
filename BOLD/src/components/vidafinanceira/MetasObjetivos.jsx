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
import { Plus, Pencil, Trash2, Target, Trophy, PlusCircle } from 'lucide-react';
import { formatCurrency } from '@/lib/formatters';
import { useToast } from '@/components/ui/use-toast';

const PRIORIDADE_COLORS = {
  alta: 'bg-red-100 text-red-700',
  media: 'bg-yellow-100 text-yellow-700',
  baixa: 'bg-green-100 text-green-700',
};

const EMPTY = { nome: '', descricao: '', valor_total: '', valor_guardado: '0', valor_mensal: '', data_prevista: '', prioridade: 'media', icone: '🎯' };

const ICONES = ['🎯', '🏍️', '✈️', '🏠', '🚗', '💰', '📱', '🎓', '👶', '💳', '🏋️', '🎮'];

function MetaForm({ open, onClose, onSaved, funcionarioId, meta }) {
  const { toast } = useToast();
  const [form, setForm] = useState(meta || EMPTY);
  const [saving, setSaving] = useState(false);

  React.useEffect(() => { setForm(meta || EMPTY); }, [meta, open]);

  const handleSave = async () => {
    if (!form.nome || !form.valor_total) { toast({ title: 'Preencha nome e valor', variant: 'destructive' }); return; }
    setSaving(true);
    const data = {
      ...form,
      funcionario_id: funcionarioId,
      valor_total: parseFloat(form.valor_total) || 0,
      valor_guardado: parseFloat(form.valor_guardado) || 0,
      valor_mensal: parseFloat(form.valor_mensal) || 0,
    };
    if (meta?.id) {
      await base44.entities.MetasObjetivos.update(meta.id, data);
    } else {
      await base44.entities.MetasObjetivos.create(data);
    }
    setSaving(false);
    onSaved();
    onClose();
    toast({ title: 'Meta salva!' });
  };

  return (
    <Dialog open={open} onOpenChange={v => !v && onClose()}>
      <DialogContent className="max-w-sm max-h-[90vh] overflow-y-auto">
        <DialogHeader><DialogTitle>{meta?.id ? 'Editar' : 'Nova'} Meta / Objetivo</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div>
            <Label>Ícone</Label>
            <div className="flex flex-wrap gap-2 mt-1">
              {ICONES.map(ic => (
                <button key={ic} onClick={() => setForm({ ...form, icone: ic })}
                  className={`text-lg p-1.5 rounded-lg border-2 transition-all ${form.icone === ic ? 'border-primary bg-primary/10' : 'border-transparent hover:border-muted'}`}>
                  {ic}
                </button>
              ))}
            </div>
          </div>
          <div><Label>Nome da meta</Label><Input value={form.nome} onChange={e => setForm({ ...form, nome: e.target.value })} placeholder="Ex: Comprar moto" /></div>
          <div><Label>Descrição (opcional)</Label><Input value={form.descricao} onChange={e => setForm({ ...form, descricao: e.target.value })} placeholder="Detalhes..." /></div>
          <div className="grid grid-cols-2 gap-2">
            <div><Label>Valor Total (R$)</Label><Input type="number" value={form.valor_total} onChange={e => setForm({ ...form, valor_total: e.target.value })} /></div>
            <div><Label>Já Guardei (R$)</Label><Input type="number" value={form.valor_guardado} onChange={e => setForm({ ...form, valor_guardado: e.target.value })} /></div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div><Label>Guardar/mês (R$)</Label><Input type="number" value={form.valor_mensal} onChange={e => setForm({ ...form, valor_mensal: e.target.value })} /></div>
            <div><Label>Data prevista</Label><Input type="date" value={form.data_prevista} onChange={e => setForm({ ...form, data_prevista: e.target.value })} /></div>
          </div>
          <div>
            <Label>Prioridade</Label>
            <Select value={form.prioridade} onValueChange={v => setForm({ ...form, prioridade: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="alta">🔴 Alta</SelectItem>
                <SelectItem value="media">🟡 Média</SelectItem>
                <SelectItem value="baixa">🟢 Baixa</SelectItem>
              </SelectContent>
            </Select>
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

function ProgressBar({ value, max }) {
  const pct = max > 0 ? Math.min((value / max) * 100, 100) : 0;
  const color = pct >= 100 ? 'bg-green-500' : pct >= 50 ? 'bg-primary' : 'bg-orange-400';
  return (
    <div className="space-y-1">
      <div className="w-full h-3 rounded-full bg-muted overflow-hidden">
        <div className={`h-full rounded-full transition-all ${color}`} style={{ width: `${pct}%` }} />
      </div>
      <div className="flex justify-between text-xs text-muted-foreground">
        <span>{formatCurrency(value)} guardado</span>
        <span>{pct.toFixed(0)}%</span>
      </div>
    </div>
  );
}

export default function MetasObjetivosPage({ funcionarioId }) {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [formOpen, setFormOpen] = useState(false);
  const [editItem, setEditItem] = useState(null);

  const { data: metas = [] } = useQuery({
    queryKey: ['metas_objetivos', funcionarioId],
    queryFn: () => base44.entities.MetasObjetivos.filter({ funcionario_id: funcionarioId }),
    enabled: !!funcionarioId,
  });

  const ativas = metas.filter(m => !m.concluida).sort((a, b) => {
    const ord = { alta: 0, media: 1, baixa: 2 };
    return (ord[a.prioridade] || 1) - (ord[b.prioridade] || 1);
  });
  const concluidas = metas.filter(m => m.concluida);

  const handleDelete = async (id) => {
    if (!confirm('Excluir meta?')) return;
    await base44.entities.MetasObjetivos.delete(id);
    qc.invalidateQueries({ queryKey: ['metas_objetivos'] });
  };

  const handleAddAporte = async (meta) => {
    const valor = prompt('Quanto você guardou agora? (R$)');
    const v = parseFloat(valor);
    if (isNaN(v) || v <= 0) return;
    const novoGuardado = (meta.valor_guardado || 0) + v;
    const concluida = novoGuardado >= meta.valor_total;
    await base44.entities.MetasObjetivos.update(meta.id, { valor_guardado: novoGuardado, concluida });
    qc.invalidateQueries({ queryKey: ['metas_objetivos'] });
    if (concluida) toast({ title: `🎉 Parabéns! Meta "${meta.nome}" concluída!` });
    else toast({ title: `Aporte registrado! +${formatCurrency(v)}` });
  };

  const onSaved = () => qc.invalidateQueries({ queryKey: ['metas_objetivos'] });

  return (
    <div className="space-y-4">
      {/* Resumo */}
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
          <p className="text-xs text-blue-600 font-medium">Metas Ativas</p>
          <p className="text-2xl font-bold text-blue-800">{ativas.length}</p>
        </div>
        <div className="bg-green-50 border border-green-200 rounded-xl p-4">
          <p className="text-xs text-green-600 font-medium">Concluídas 🏆</p>
          <p className="text-2xl font-bold text-green-800">{concluidas.length}</p>
        </div>
      </div>

      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold">Meus Objetivos</p>
        <Button size="sm" onClick={() => { setEditItem(null); setFormOpen(true); }}>
          <Plus className="w-4 h-4 mr-1" />Nova Meta
        </Button>
      </div>

      {ativas.length === 0 ? (
        <Card><CardContent className="py-10 text-center">
          <Target className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
          <p className="text-sm text-muted-foreground">Nenhuma meta ativa. Defina um objetivo!</p>
          <Button size="sm" className="mt-3" onClick={() => { setEditItem(null); setFormOpen(true); }}>Criar primeira meta</Button>
        </CardContent></Card>
      ) : (
        <div className="space-y-3">
          {ativas.map(m => {
            const mesesRestantes = m.valor_mensal > 0
              ? Math.ceil((m.valor_total - (m.valor_guardado || 0)) / m.valor_mensal)
              : null;
            return (
              <Card key={m.id}>
                <CardContent className="p-4 space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="text-2xl">{m.icone || '🎯'}</span>
                      <div>
                        <p className="font-semibold text-sm">{m.nome}</p>
                        {m.descricao && <p className="text-xs text-muted-foreground">{m.descricao}</p>}
                        <Badge className={`${PRIORIDADE_COLORS[m.prioridade]} border-0 text-xs mt-1`}>
                          Prioridade {m.prioridade}
                        </Badge>
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="font-bold text-sm">{formatCurrency(m.valor_total)}</p>
                      {m.valor_mensal > 0 && <p className="text-xs text-muted-foreground">{formatCurrency(m.valor_mensal)}/mês</p>}
                    </div>
                  </div>

                  <ProgressBar value={m.valor_guardado || 0} max={m.valor_total} />

                  {mesesRestantes !== null && mesesRestantes > 0 && (
                    <p className="text-xs text-muted-foreground">⏱️ Previsão: {mesesRestantes} mês(es) restante(s)</p>
                  )}

                  <div className="flex gap-2">
                    <Button size="sm" variant="outline" className="flex-1 text-green-700 border-green-300 hover:bg-green-50" onClick={() => handleAddAporte(m)}>
                      <PlusCircle className="w-3 h-3 mr-1" />Registrar Aporte
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => { setEditItem(m); setFormOpen(true); }}><Pencil className="w-3 h-3" /></Button>
                    <Button size="sm" variant="ghost" className="text-destructive" onClick={() => handleDelete(m.id)}><Trash2 className="w-3 h-3" /></Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {concluidas.length > 0 && (
        <div className="space-y-2">
          <p className="text-sm font-semibold text-green-700 flex items-center gap-2"><Trophy className="w-4 h-4" />Conquistas</p>
          {concluidas.map(m => (
            <div key={m.id} className="flex items-center gap-3 bg-green-50 border border-green-200 rounded-xl px-4 py-3">
              <span className="text-xl">{m.icone || '🏆'}</span>
              <div className="flex-1"><p className="font-semibold text-sm text-green-800">{m.nome}</p></div>
              <span className="font-bold text-green-700 text-sm">{formatCurrency(m.valor_total)}</span>
              <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive" onClick={() => handleDelete(m.id)}><Trash2 className="w-3 h-3" /></Button>
            </div>
          ))}
        </div>
      )}

      <MetaForm
        open={formOpen}
        onClose={() => { setFormOpen(false); setEditItem(null); }}
        onSaved={onSaved}
        funcionarioId={funcionarioId}
        meta={editItem}
      />
    </div>
  );
}
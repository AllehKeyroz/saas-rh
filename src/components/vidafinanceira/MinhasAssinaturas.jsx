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
import { Switch } from '@/components/ui/switch';
import { Plus, Pencil, Trash2, Tv, Music, Gamepad2, Heart, BookOpen, Zap, MoreHorizontal, AlertTriangle, TrendingDown } from 'lucide-react';
import { formatCurrency } from '@/lib/formatters';
import { useToast } from '@/components/ui/use-toast';

const CATEGORIAS = {
  streaming: { label: 'Streaming', icon: Tv, color: 'bg-red-100 text-red-700' },
  musica: { label: 'Música', icon: Music, color: 'bg-purple-100 text-purple-700' },
  jogos: { label: 'Jogos', icon: Gamepad2, color: 'bg-blue-100 text-blue-700' },
  saude_beleza: { label: 'Saúde/Beleza', icon: Heart, color: 'bg-pink-100 text-pink-700' },
  educacao: { label: 'Educação', icon: BookOpen, color: 'bg-yellow-100 text-yellow-700' },
  produtividade: { label: 'Produtividade', icon: Zap, color: 'bg-green-100 text-green-700' },
  outro: { label: 'Outro', icon: MoreHorizontal, color: 'bg-gray-100 text-gray-700' },
};

const EMPTY = { nome: '', valor: '', dia_cobranca: '', categoria: 'streaming', essencial: false, ativa: true };

function AssinaturaForm({ open, onClose, onSaved, funcionarioId, assinatura }) {
  const { toast } = useToast();
  const [form, setForm] = useState(assinatura || EMPTY);
  const [saving, setSaving] = useState(false);

  useEffect(() => { setForm(assinatura || EMPTY); }, [assinatura, open]);

  const handleSave = async () => {
    if (!form.nome || !form.valor) { toast({ title: 'Preencha nome e valor', variant: 'destructive' }); return; }
    setSaving(true);
    const data = { ...form, funcionario_id: funcionarioId, valor: parseFloat(form.valor), dia_cobranca: parseInt(form.dia_cobranca) || null };
    if (assinatura?.id) {
      await client.entities.AssinaturasPessoais.update(assinatura.id, data);
    } else {
      await client.entities.AssinaturasPessoais.create(data);
    }
    setSaving(false);
    onSaved();
    onClose();
    toast({ title: 'Assinatura salva!' });
  };

  return (
    <Dialog open={open} onOpenChange={v => !v && onClose()}>
      <DialogContent className="max-w-sm">
        <DialogHeader><DialogTitle>{assinatura?.id ? 'Editar' : 'Nova'} Assinatura</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div><Label>Nome do serviço</Label><Input value={form.nome} onChange={e => setForm({ ...form, nome: e.target.value })} placeholder="Netflix, Spotify..." /></div>
          <div><Label>Valor mensal (R$)</Label><Input type="number" value={form.valor} onChange={e => setForm({ ...form, valor: e.target.value })} placeholder="0,00" /></div>
          <div><Label>Dia de cobrança</Label><Input type="number" min="1" max="31" value={form.dia_cobranca} onChange={e => setForm({ ...form, dia_cobranca: e.target.value })} placeholder="Ex: 15" /></div>
          <div>
            <Label>Categoria</Label>
            <Select value={form.categoria} onValueChange={v => setForm({ ...form, categoria: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{Object.entries(CATEGORIAS).map(([k, v]) => <SelectItem key={k} value={k}>{v.label}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="flex items-center justify-between">
            <Label>É essencial?</Label>
            <Switch checked={form.essencial} onCheckedChange={v => setForm({ ...form, essencial: v })} />
          </div>
          <div className="flex items-center justify-between">
            <Label>Ativa</Label>
            <Switch checked={form.ativa} onCheckedChange={v => setForm({ ...form, ativa: v })} />
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

export default function MinhasAssinaturas({ funcionarioId, salarioBase = 0 }) {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [formOpen, setFormOpen] = useState(false);
  const [editItem, setEditItem] = useState(null);
  const [showInativos, setShowInativos] = useState(false);

  const { data: assinaturas = [] } = useQuery({
    queryKey: ['assinaturas_pessoais', funcionarioId],
    queryFn: () => client.entities.AssinaturasPessoais.filter({ funcionario_id: funcionarioId }),
    enabled: !!funcionarioId,
  });

  const ativas = assinaturas.filter(a => a.ativa);
  const inativas = assinaturas.filter(a => !a.ativa);
  const lista = showInativos ? inativas : ativas;
  const totalMensal = ativas.reduce((s, a) => s + (a.valor || 0), 0);
  const pctSalario = salarioBase > 0 ? ((totalMensal / salarioBase) * 100).toFixed(1) : null;

  // Detectar duplicatas por categoria
  const porCategoria = ativas.reduce((acc, a) => { acc[a.categoria] = (acc[a.categoria] || []).concat(a); return acc; }, {});
  const duplicatas = Object.entries(porCategoria).filter(([, arr]) => arr.length > 1);

  const handleDelete = async (id) => {
    if (!confirm('Excluir assinatura?')) return;
    await client.entities.AssinaturasPessoais.delete(id);
    qc.invalidateQueries({ queryKey: ['assinaturas_pessoais'] });
    toast({ title: 'Assinatura removida' });
  };

  const onSaved = () => qc.invalidateQueries({ queryKey: ['assinaturas_pessoais'] });

  return (
    <div className="space-y-4">
      {/* Resumo */}
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-purple-50 border border-purple-200 rounded-xl p-4">
          <p className="text-xs text-purple-600 font-medium">Total Mensal</p>
          <p className="text-xl font-bold text-purple-800">{formatCurrency(totalMensal)}</p>
          <p className="text-xs text-purple-500 mt-0.5">{ativas.length} assinatura(s) ativa(s)</p>
        </div>
        <div className="bg-orange-50 border border-orange-200 rounded-xl p-4">
          <p className="text-xs text-orange-600 font-medium">% do Salário</p>
          <p className="text-xl font-bold text-orange-800">{pctSalario ? `${pctSalario}%` : '—'}</p>
          <p className="text-xs text-orange-500 mt-0.5">{pctSalario > 10 ? 'Acima do recomendado' : 'Dentro do limite'}</p>
        </div>
      </div>

      {/* Alerta de duplicatas */}
      {duplicatas.length > 0 && (
        <div className="flex items-start gap-3 bg-yellow-50 border border-yellow-200 rounded-xl px-4 py-3">
          <AlertTriangle className="w-4 h-4 text-yellow-600 mt-0.5 shrink-0" />
          <div className="text-sm text-yellow-700">
            <p className="font-semibold">Possíveis duplicatas detectadas</p>
            {duplicatas.map(([cat, items]) => (
              <p key={cat} className="text-xs">Categoria "{CATEGORIAS[cat]?.label}": {items.map(i => i.nome).join(', ')}</p>
            ))}
          </div>
        </div>
      )}

      {/* Alerta alto percentual */}
      {pctSalario > 15 && (
        <div className="flex items-start gap-3 bg-red-50 border border-red-200 rounded-xl px-4 py-3">
          <TrendingDown className="w-4 h-4 text-red-600 mt-0.5 shrink-0" />
          <p className="text-sm text-red-700">Suas assinaturas representam <strong>{pctSalario}%</strong> do salário. Considere cancelar as não essenciais.</p>
        </div>
      )}

      {/* Header lista */}
      <div className="flex items-center justify-between">
        <div className="flex gap-2">
          <button onClick={() => setShowInativos(false)} className={`text-sm px-3 py-1 rounded-full font-medium transition-colors ${!showInativos ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground'}`}>Ativas ({ativas.length})</button>
          <button onClick={() => setShowInativos(true)} className={`text-sm px-3 py-1 rounded-full font-medium transition-colors ${showInativos ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground'}`}>Inativas ({inativas.length})</button>
        </div>
        <Button size="sm" onClick={() => { setEditItem(null); setFormOpen(true); }}>
          <Plus className="w-4 h-4 mr-1" />Nova
        </Button>
      </div>

      {/* Lista */}
      {lista.length === 0 ? (
        <Card><CardContent className="py-10 text-center text-sm text-muted-foreground">Nenhuma assinatura {showInativos ? 'inativa' : 'ativa'}. {!showInativos && <button className="text-primary underline ml-1" onClick={() => { setEditItem(null); setFormOpen(true); }}>Adicionar</button>}</CardContent></Card>
      ) : (
        <div className="space-y-2">
          {lista.map(a => {
            const cat = CATEGORIAS[a.categoria] || CATEGORIAS.outro;
            const Icon = cat.icon;
            return (
              <Card key={a.id} className="overflow-hidden">
                <CardContent className="p-0">
                  <div className="flex items-center gap-3 p-4">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${cat.color}`}>
                      <Icon className="w-5 h-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold text-sm">{a.nome}</span>
                        {a.essencial && <Badge variant="outline" className="text-xs border-green-400 text-green-700">Essencial</Badge>}
                        {!a.ativa && <Badge variant="outline" className="text-xs border-gray-400 text-gray-500">Inativa</Badge>}
                      </div>
                      <p className="text-xs text-muted-foreground">{cat.label}{a.dia_cobranca ? ` · Vence dia ${a.dia_cobranca}` : ''}</p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="font-bold text-sm">{formatCurrency(a.valor)}</p>
                      <p className="text-xs text-muted-foreground">/mês</p>
                    </div>
                    <div className="flex gap-1 shrink-0">
                      <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => { setEditItem(a); setFormOpen(true); }}><Pencil className="w-3 h-3" /></Button>
                      <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive" onClick={() => handleDelete(a.id)}><Trash2 className="w-3 h-3" /></Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <AssinaturaForm
        open={formOpen}
        onClose={() => { setFormOpen(false); setEditItem(null); }}
        onSaved={onSaved}
        funcionarioId={funcionarioId}
        assinatura={editItem}
      />
    </div>
  );
}
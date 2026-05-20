import React, { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { client } from '@/api/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { Target, Plus, Trash2, Copy, TrendingUp, Users } from 'lucide-react';
import { formatCurrency, getMesReferenciaAtual, getMesesOptions } from '@/lib/formatters';
import { calcularComissaoMensal, calcularProgressoMetaComissao } from '@/lib/comissoes';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';

function ProgressoBar({ acumulado, meta }) {
  const prog = calcularProgressoMetaComissao(acumulado, meta);
  if (prog === null) return null;
  return (
    <div className="space-y-1 mt-1">
      <Progress value={prog} className="h-1.5" />
      <div className="flex justify-between text-xs text-muted-foreground">
        <span>{formatCurrency(acumulado)} acumulado</span>
        <span className={prog >= 100 ? 'text-green-600 font-semibold' : ''}>{prog.toFixed(0)}%</span>
      </div>
    </div>
  );
}

export default function ConfigurarMetasComissao({ funcionarios = [], comissoesFuncionarios = [] }) {
  const queryClient = useQueryClient();
  const [mesRef, setMesRef] = useState(getMesReferenciaAtual());
  const [form, setForm] = useState({ tipo: 'setor', setor: '', funcionario_id: '', meta_valor: '' });
  const [salvando, setSalvando] = useState(false);

  const { data: setores = [] } = useQuery({
    queryKey: ['setores_comissao'],
    queryFn: () => client.entities.SetoresComissao.list('ordem_exibicao', 50),
  });

  const { data: metas = [], isLoading } = useQuery({
    queryKey: ['metas_comissao', mesRef],
    queryFn: () => client.entities.MetaComissao.filter({ mes_referencia: mesRef }),
  });

  const setoresAtivos = setores.filter(s => s.ativo !== false);

  const handleAdd = async () => {
    if (!parseFloat(form.meta_valor)) {
      toast.error('Informe o valor da meta'); return;
    }
    if (form.tipo === 'setor' && !form.setor) {
      toast.error('Selecione o setor'); return;
    }
    if (form.tipo === 'individual' && !form.funcionario_id) {
      toast.error('Selecione o funcionário'); return;
    }

    setSalvando(true);
    try {
      const me = await client.auth.me();
      const func = funcionarios.find(f => f.id === form.funcionario_id);
      await client.entities.MetaComissao.create({
        mes_referencia: mesRef,
        meta_valor: parseFloat(form.meta_valor),
        setor: form.tipo === 'setor' ? form.setor : null,
        funcionario_id: form.tipo === 'individual' ? form.funcionario_id : null,
        funcionario_nome: func?.nome || null,
        criado_por: me?.email,
      });
      queryClient.invalidateQueries({ queryKey: ['metas_comissao'] });
      setForm({ tipo: 'setor', setor: '', funcionario_id: '', meta_valor: '' });
      toast.success('Meta criada!');
      } catch (e) {
      toast.error(`Erro ao criar meta: ${e.message}`);
      } finally {
      setSalvando(false);
      }
      };

  const handleDelete = async (id) => {
    try {
      await client.entities.MetaComissao.delete(id);
      queryClient.invalidateQueries({ queryKey: ['metas_comissao'] });
      toast.success('Meta removida');
    } catch (e) {
      toast.error(`Erro ao remover meta: ${e.message}`);
    }
  };

  const handleCopiarMesAnterior = async () => {
    const [mm, aa] = mesRef.split('/').map(Number);
    const anterior = mm === 1
      ? `12/${aa - 1}`
      : `${String(mm - 1).padStart(2, '0')}/${aa}`;
    const metasAnt = await client.entities.MetaComissao.filter({ mes_referencia: anterior });
    if (!metasAnt.length) { toast.warning('Sem metas no mês anterior'); return; }
    const me = await client.auth.me();
    for (const m of metasAnt) {
      await client.entities.MetaComissao.create({
        mes_referencia: mesRef,
        meta_valor: m.meta_valor,
        setor: m.setor,
        funcionario_id: m.funcionario_id,
        funcionario_nome: m.funcionario_nome,
        criado_por: me?.email,
      });
    }
    queryClient.invalidateQueries({ queryKey: ['metas_comissao'] });
    toast.success(`${metasAnt.length} meta(s) copiada(s) do mês anterior`);
    };

  // Progressos
  const metasComProgresso = metas.map(m => {
    let acumulado = 0;
    if (m.funcionario_id) {
      acumulado = calcularComissaoMensal(comissoesFuncionarios, m.funcionario_id, mesRef);
    } else if (m.setor) {
      // Soma todos do setor
      const funcDoSetor = funcionarios.filter(f => f.setor?.toLowerCase().includes(m.setor.toLowerCase()));
      acumulado = funcDoSetor.reduce((sum, f) => sum + calcularComissaoMensal(comissoesFuncionarios, f.id, mesRef), 0);
    }
    return { ...m, acumulado };
  });

  return (
    <div className="space-y-4">
      {/* Formulário nova meta */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Target className="w-4 h-4 text-primary" />
            Nova Meta de Comissão
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 items-end">
            <div>
              <Label className="text-xs mb-1 block">Mês</Label>
              <Select value={mesRef} onValueChange={setMesRef}>
                <SelectTrigger className="h-8"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {getMesesOptions(12).map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs mb-1 block">Tipo</Label>
              <Select value={form.tipo} onValueChange={v => setForm(f => ({ ...f, tipo: v, setor: '', funcionario_id: '' }))}>
                <SelectTrigger className="h-8"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="setor">Por Setor</SelectItem>
                  <SelectItem value="individual">Individual</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {form.tipo === 'setor' ? (
              <div>
                <Label className="text-xs mb-1 block">Setor</Label>
                <Select value={form.setor} onValueChange={v => setForm(f => ({ ...f, setor: v }))}>
                  <SelectTrigger className="h-8"><SelectValue placeholder="Selecione..." /></SelectTrigger>
                  <SelectContent>
                    {setoresAtivos.map(s => <SelectItem key={s.id} value={s.nome_do_setor}>{s.nome_do_setor}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            ) : (
              <div>
                <Label className="text-xs mb-1 block">Funcionário</Label>
                <Select value={form.funcionario_id} onValueChange={v => setForm(f => ({ ...f, funcionario_id: v }))}>
                  <SelectTrigger className="h-8"><SelectValue placeholder="Selecione..." /></SelectTrigger>
                  <SelectContent>
                    {funcionarios.filter(f => f.ativo !== false).map(f => (
                      <SelectItem key={f.id} value={f.id}>{f.nome}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            <div>
              <Label className="text-xs mb-1 block">Meta (R$)</Label>
              <Input
                type="number"
                placeholder="0,00"
                value={form.meta_valor}
                onChange={e => setForm(f => ({ ...f, meta_valor: e.target.value }))}
                className="h-8"
              />
            </div>
          </div>
          <div className="flex gap-2">
            <Button size="sm" onClick={handleAdd} disabled={salvando}>
              <Plus className="w-3.5 h-3.5 mr-1" />Adicionar Meta
            </Button>
            <Button size="sm" variant="outline" onClick={handleCopiarMesAnterior}>
              <Copy className="w-3.5 h-3.5 mr-1" />Copiar do Mês Anterior
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Lista de metas + progresso */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-primary" />
            Metas de {mesRef} — Progresso
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading && <Skeleton className="h-24" />}
          {!isLoading && metasComProgresso.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-6">Nenhuma meta para {mesRef}</p>
          )}
          <div className="space-y-3">
            {metasComProgresso.map(m => (
              <div key={m.id} className="border rounded-xl p-3 space-y-1">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {m.funcionario_id
                      ? <Users className="w-3.5 h-3.5 text-primary" />
                      : <Target className="w-3.5 h-3.5 text-accent" />
                    }
                    <span className="text-sm font-medium">
                      {m.funcionario_nome || m.setor || '—'}
                    </span>
                    <Badge variant="outline" className="text-xs">
                      {m.funcionario_id ? 'Individual' : 'Setor'}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold text-primary">{formatCurrency(m.meta_valor)}</span>
                    <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => handleDelete(m.id)}>
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </div>
                <ProgressoBar acumulado={m.acumulado} meta={m.meta_valor} />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
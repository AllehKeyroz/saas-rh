import React, { useState, useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { client } from '@/api/client';
import { registrarAuditoria } from '@/lib/audit';
import { getCurrentTenantId } from '@/firebase/auth';
import { formatCurrency, formatDate, getMesReferenciaAtual } from '@/lib/formatters';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Pencil, Save, X, Clock, DollarSign, Briefcase, Building2, HelpCircle, AlertTriangle, Info } from 'lucide-react';
import { toast } from 'sonner';

function getHojeStr() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export default function CargoSalario360({ funcionario }) {
  const queryClient = useQueryClient();
  const [editando, setEditando] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState(null);

  const hojeStr = getHojeStr();

  const { data: setores = [] } = useQuery({
    queryKey: ['setores'],
    queryFn: () => client.entities.Setor.list(),
  });

  const { data: funcoes = [] } = useQuery({
    queryKey: ['funcoes'],
    queryFn: () => client.entities.Funcao.list(),
  });

  const { data: historico = [], isLoading: loadingHistorico } = useQuery({
    queryKey: ['historico_salario', funcionario?.id],
    queryFn: () => funcionario?.id
      ? client.entities.HistoricoSalario.filter({ funcionario_id: funcionario.id })
      : [],
    enabled: !!funcionario?.id,
  });

  const { data: fechamentos = [] } = useQuery({
    queryKey: ['fechamentos_cargo_salario', funcionario?.id],
    queryFn: () => funcionario?.id
      ? client.entities.FechamentoMensal.filter({ funcionario_id: funcionario.id })
      : [],
    enabled: !!funcionario?.id,
  });

  const mesAtual = getMesReferenciaAtual();
  const mesFechado = fechamentos.some(f => f.mes_referencia === mesAtual);

  const opcoesSetores = useMemo(() => {
    const nomes = setores.filter(s => s.ativo !== false).map(s => s.nome);
    if (funcionario.setor && !nomes.includes(funcionario.setor)) {
      nomes.push(funcionario.setor);
    }
    return [...new Set(nomes)].sort();
  }, [setores, funcionario.setor]);

  const opcoesFuncoes = useMemo(() => {
    const nomes = funcoes.filter(f => f.ativo !== false).map(f => f.nome);
    if (funcionario.funcao && !nomes.includes(funcionario.funcao)) {
      nomes.push(funcionario.funcao);
    }
    return [...new Set(nomes)].sort();
  }, [funcoes, funcionario.funcao]);

  const historicoOrdenado = useMemo(() => {
    return [...historico].sort((a, b) => {
      const da = a.created_date || '';
      const db = b.created_date || '';
      return db.localeCompare(da);
    });
  }, [historico]);

  function abrirEdicao() {
    setForm({
      funcao: funcionario.funcao || '',
      setor: funcionario.setor || '',
      salario_base: funcionario.salario_base ? String(funcionario.salario_base) : '',
      ajuda_custo: funcionario.ajuda_custo ? String(funcionario.ajuda_custo) : '',
      data_alteracao: hojeStr,
      motivo_reajuste: '',
    });
    setEditando(true);
  }

  function fecharEdicao() {
    setEditando(false);
    setForm(null);
  }

  function handleChange(field, value) {
    setForm(prev => ({ ...prev, [field]: value }));
  }

  async function handleSave() {
    if (!form.motivo_reajuste.trim()) {
      toast.error('Informe o motivo do reajuste');
      return;
    }

    const salarioAntigo = Number(funcionario.salario_base) || 0;
    const salarioNovo = Number(form.salario_base) || 0;
    const ajudaAntiga = Number(funcionario.ajuda_custo) || 0;
    const ajudaNova = Number(form.ajuda_custo) || 0;
    const funcaoAntiga = funcionario.funcao || '';
    const funcaoNova = form.funcao || '';
    const setorAntigo = funcionario.setor || '';
    const setorNovo = form.setor || '';

    const salarioMudou = salarioNovo !== salarioAntigo;
    const ajudaMudou = ajudaNova !== ajudaAntiga;
    const funcaoMudou = funcaoNova !== funcaoAntiga;
    const setorMudou = setorNovo !== setorAntigo;

    if (!salarioMudou && !ajudaMudou && !funcaoMudou && !setorMudou) {
      toast.error('Nenhum campo foi alterado');
      return;
    }

    if (!salarioNovo || salarioNovo <= 0) {
      toast.error('Salário base é obrigatório e deve ser maior que zero');
      return;
    }

    setSaving(true);
    try {
      const tenantId = getCurrentTenantId();

      await client.entities.Funcionarios.update(funcionario.id, {
        funcao: funcaoNova,
        setor: setorNovo,
        salario_base: salarioNovo,
        ajuda_custo: ajudaNova,
      });

      await client.entities.HistoricoSalario.create({
        funcionario_id: funcionario.id,
        funcao_anterior: funcaoAntiga || null,
        funcao_nova: funcaoNova,
        setor_anterior: setorAntigo || null,
        setor_novo: setorNovo,
        salario_anterior: salarioAntigo || null,
        salario_novo: salarioNovo,
        ajuda_custo_anterior: ajudaAntiga || null,
        ajuda_custo_nova: ajudaNova,
        data_alteracao: form.data_alteracao,
        motivo_reajuste: form.motivo_reajuste.trim(),
        tenant_id: tenantId || '',
      });

      const descricaoParts = [];
      if (funcaoMudou) descricaoParts.push(`função: "${funcaoAntiga}" → "${funcaoNova}"`);
      if (setorMudou) descricaoParts.push(`setor: "${setorAntigo}" → "${setorNovo}"`);
      if (salarioMudou) descricaoParts.push(`salário: ${formatCurrency(salarioAntigo)} → ${formatCurrency(salarioNovo)}`);
      if (ajudaMudou) descricaoParts.push(`ajuda de custo: ${formatCurrency(ajudaAntiga)} → ${formatCurrency(ajudaNova)}`);

      await registrarAuditoria({
        acao: 'editar', modulo: 'funcionario',
        entidade_id: funcionario.id,
        descricao: `Cargo/Salário alterado: ${descricaoParts.join('; ')}`,
        dados_anteriores: {
          funcao: funcaoAntiga, setor: setorAntigo,
          salario_base: salarioAntigo, ajuda_custo: ajudaAntiga,
        },
        dados_novos: {
          funcao: funcaoNova, setor: setorNovo,
          salario_base: salarioNovo, ajuda_custo: ajudaNova,
        },
      });

      queryClient.invalidateQueries({ queryKey: ['funcionario360', funcionario.id] });
      queryClient.invalidateQueries({ queryKey: ['historico_salario', funcionario.id] });

      toast.success('Cargo e salário atualizados com sucesso!');
      fecharEdicao();
    } catch (err) {
      toast.error(err?.message || 'Erro ao salvar alterações');
    } finally {
      setSaving(false);
    }
  }

  if (!funcionario) return null;

  return (
    <div className="space-y-6">
      {/* Card: Situação Atual */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Cargo & Salário — Situação Atual</CardTitle>
          <Button variant="outline" size="sm" onClick={abrirEdicao}>
            <Pencil className="w-3.5 h-3.5 mr-1.5" />
            Editar
          </Button>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            <div>
              <label className="text-xs font-semibold text-muted-foreground flex items-center gap-1">
                <Briefcase className="w-3 h-3" /> Função
              </label>
              <p className="text-sm font-medium mt-1">{funcionario.funcao || '-'}</p>
            </div>
            <div>
              <label className="text-xs font-semibold text-muted-foreground flex items-center gap-1">
                <Building2 className="w-3 h-3" /> Setor
              </label>
              <p className="text-sm font-medium mt-1">{funcionario.setor || '-'}</p>
            </div>
            <div>
              <label className="text-xs font-semibold text-muted-foreground flex items-center gap-1">
                <DollarSign className="w-3 h-3" /> Salário Base
              </label>
              <p className="text-sm font-medium mt-1">{formatCurrency(funcionario.salario_base || 0)}</p>
            </div>
            <div>
              <label className="text-xs font-semibold text-muted-foreground flex items-center gap-1">
                <HelpCircle className="w-3 h-3" /> Ajuda de Custo
              </label>
              <p className="text-sm font-medium mt-1">{formatCurrency(funcionario.ajuda_custo || 0)}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Modal de Edição */}
      <Dialog open={editando} onOpenChange={open => { if (!open) fecharEdicao(); }}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>Editar Cargo & Salário</DialogTitle>
          </DialogHeader>

          <div className="space-y-5 py-2">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label>Função</Label>
                {opcoesFuncoes.length > 0 ? (
                  <Select value={form?.funcao || ''} onValueChange={v => handleChange('funcao', v)}>
                    <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                    <SelectContent>
                      {opcoesFuncoes.map(nome => (
                        <SelectItem key={nome} value={nome}>{nome}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : (
                  <Input value={form?.funcao || ''} onChange={e => handleChange('funcao', e.target.value)} placeholder="Ex: Operador" />
                )}
              </div>
              <div>
                <Label>Setor</Label>
                {opcoesSetores.length > 0 ? (
                  <Select value={form?.setor || ''} onValueChange={v => handleChange('setor', v)}>
                    <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                    <SelectContent>
                      {opcoesSetores.map(nome => (
                        <SelectItem key={nome} value={nome}>{nome}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : (
                  <Input value={form?.setor || ''} onChange={e => handleChange('setor', e.target.value)} placeholder="Ex: Produção" />
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label>Novo Salário Base *</Label>
                <Input type="number" step="0.01" min="0" value={form?.salario_base || ''} onChange={e => handleChange('salario_base', e.target.value)} placeholder="0,00" required />
              </div>
              <div>
                <Label>Nova Ajuda de Custo</Label>
                <Input type="number" step="0.01" min="0" value={form?.ajuda_custo || ''} onChange={e => handleChange('ajuda_custo', e.target.value)} placeholder="0,00" />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label>Data da Alteração</Label>
                <Input type="date" value={form?.data_alteracao || hojeStr} onChange={e => handleChange('data_alteracao', e.target.value)} />
              </div>
            </div>

            <div>
              <Label>Motivo do Reajuste *</Label>
              <Textarea value={form?.motivo_reajuste || ''} onChange={e => handleChange('motivo_reajuste', e.target.value)} placeholder="Ex: Aumento salarial por mérito, promoção de cargo, reajuste coletivo..." rows={3} />
            </div>

            {mesFechado ? (
              <div className="flex items-start gap-3 p-3 rounded-lg bg-amber-50 border border-amber-200">
                <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                <div className="text-sm text-amber-800">
                  <p className="font-medium">Mês já fechado</p>
                  <p className="mt-1">O fechamento de <strong>{mesAtual}</strong> já foi processado para este funcionário. O novo salário valerá apenas a partir do <strong>próximo fechamento</strong>.</p>
                </div>
              </div>
            ) : (
              <div className="flex items-start gap-3 p-3 rounded-lg bg-blue-50 border border-blue-200">
                <Info className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
                <div className="text-sm text-blue-800">
                  <p className="font-medium">Mês em aberto</p>
                  <p className="mt-1">O fechamento de <strong>{mesAtual}</strong> ainda não foi processado. O novo salário será considerado no fechamento deste mês.</p>
                </div>
              </div>
            )}
          </div>

          <div className="flex items-center justify-end gap-2 pt-2 border-t">
            <Button variant="ghost" onClick={fecharEdicao} disabled={saving}>
              <X className="w-3.5 h-3.5 mr-1.5" />
              Cancelar
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? (
                <>Salvando...</>
              ) : (
                <><Save className="w-3.5 h-3.5 mr-1.5" />Salvar Alterações</>
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Card: Histórico de Alterações */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="w-4 h-4" />
            Histórico de Alterações
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {loadingHistorico ? (
            <div className="text-center py-8 text-muted-foreground">Carregando...</div>
          ) : historicoOrdenado.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <p>Nenhuma alteração registrada</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Data</TableHead>
                  <TableHead>Função</TableHead>
                  <TableHead>Setor</TableHead>
                  <TableHead>Salário Base</TableHead>
                  <TableHead>Ajuda de Custo</TableHead>
                  <TableHead>Motivo</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {historicoOrdenado.map(h => (
                  <TableRow key={h.id}>
                    <TableCell className="whitespace-nowrap text-xs">
                      {h.data_alteracao ? formatDate(h.data_alteracao) : '-'}
                    </TableCell>
                    <TableCell className="text-xs">
                      {h.funcao_anterior && h.funcao_nova !== h.funcao_anterior ? (
                        <span>
                          <span className="line-through text-muted-foreground">{h.funcao_anterior}</span>
                          {' → '}
                          <span className="font-medium">{h.funcao_nova}</span>
                        </span>
                      ) : (
                        <span className="text-muted-foreground">{h.funcao_nova || '-'}</span>
                      )}
                    </TableCell>
                    <TableCell className="text-xs">
                      {h.setor_anterior && h.setor_novo !== h.setor_anterior ? (
                        <span>
                          <span className="line-through text-muted-foreground">{h.setor_anterior}</span>
                          {' → '}
                          <span className="font-medium">{h.setor_novo}</span>
                        </span>
                      ) : (
                        <span className="text-muted-foreground">{h.setor_novo || '-'}</span>
                      )}
                    </TableCell>
                    <TableCell className="text-xs">
                      {h.salario_anterior && h.salario_novo !== h.salario_anterior ? (
                        <span>
                          <span className="line-through text-muted-foreground">{formatCurrency(h.salario_anterior)}</span>
                          {' → '}
                          <span className="font-medium">{formatCurrency(h.salario_novo)}</span>
                        </span>
                      ) : (
                        <span>{formatCurrency(h.salario_novo)}</span>
                      )}
                    </TableCell>
                    <TableCell className="text-xs">
                      {h.ajuda_custo_anterior !== null && h.ajuda_custo_nova !== h.ajuda_custo_anterior ? (
                        <span>
                          <span className="line-through text-muted-foreground">{formatCurrency(h.ajuda_custo_anterior)}</span>
                          {' → '}
                          <span className="font-medium">{formatCurrency(h.ajuda_custo_nova)}</span>
                        </span>
                      ) : (
                        <span>{formatCurrency(h.ajuda_custo_nova || 0)}</span>
                      )}
                    </TableCell>
                    <TableCell className="max-w-[200px]">
                      <span className="text-xs">{h.motivo_reajuste || '-'}</span>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

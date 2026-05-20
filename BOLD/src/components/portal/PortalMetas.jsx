import React, { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Target, TrendingUp, Award, CheckCircle2, AlertTriangle } from 'lucide-react';
import { formatCurrency, getMesReferenciaAtual, getMesesOptions } from '@/lib/formatters';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { filtrarGastosPorMes, calcularResumoMensal, calcularProgressoMeta } from '@/lib/vidaFinanceira';
import { calcularComissaoMensal, calcularProgressoMetaComissao } from '@/lib/comissoes';
import { useToast } from '@/components/ui/use-toast';
import { useRHControl } from '@/lib/rhControl';

export default function PortalMetas({ funcionarioId, funcionarioSetor, salarioBase, comissoesFuncionarios = [], mesSelecionado, setMesSelecionado }) {
  const { toast } = useToast();
  const qc = useQueryClient();
  const { isAtiva } = useRHControl();
  const meses = getMesesOptions(12);
  const [metaInput, setMetaInput] = useState('');
  const [saving, setSaving] = useState(false);

  const { data: gastos = [] } = useQuery({
    queryKey: ['gastos_pessoais', funcionarioId],
    queryFn: () => base44.entities.GastosPessoais.filter({ funcionario_id: funcionarioId }),
    enabled: !!funcionarioId,
  });

  const { data: metas = [] } = useQuery({
    queryKey: ['metas_financeiras', funcionarioId],
    queryFn: () => base44.entities.MetaFinanceira.filter({ funcionario_id: funcionarioId }),
    enabled: !!funcionarioId,
  });

  const { data: metasComissao = [] } = useQuery({
    queryKey: ['metas_comissao_portal', funcionarioId, funcionarioSetor],
    queryFn: () => base44.entities.MetaComissao.list('-created_date', 100),
    enabled: !!funcionarioId && isAtiva('metas_comissao'),
  });

  const metaMes = metas.find(m => m.mes_referencia === mesSelecionado);
  const salario = salarioBase || metaMes?.salario_pessoal || 0;
  const gastosMes = filtrarGastosPorMes(gastos, mesSelecionado);
  const { totalGastos } = calcularResumoMensal(gastosMes, salario);
  const comissaoMes = calcularComissaoMensal(comissoesFuncionarios, funcionarioId, mesSelecionado);
  const receitaTotal = salario + comissaoMes;
  const saldoPessoal = receitaTotal - totalGastos;
  const progresso = calcularProgressoMeta(saldoPessoal, metaMes?.meta_mensal);

  // Meta de comissão
  const metaComissaoMes = metasComissao.find(m => m.mes_referencia === mesSelecionado && m.funcionario_id === funcionarioId)
    || metasComissao.find(m => m.mes_referencia === mesSelecionado && !m.funcionario_id && m.setor && funcionarioSetor?.toLowerCase().includes(m.setor.toLowerCase()));
  const progressoComissao = metaComissaoMes ? calcularProgressoMetaComissao(comissaoMes, metaComissaoMes.meta_valor) : null;

  const handleSalvarMeta = async () => {
    const v = parseFloat(metaInput);
    if (isNaN(v) || v <= 0) {
      toast({ title: 'Informe uma meta válida', variant: 'destructive' });
      return;
    }
    setSaving(true);
    if (metaMes) {
      await base44.entities.MetaFinanceira.update(metaMes.id, { meta_mensal: v });
    } else {
      await base44.entities.MetaFinanceira.create({ funcionario_id: funcionarioId, mes_referencia: mesSelecionado, meta_mensal: v });
    }
    qc.invalidateQueries({ queryKey: ['metas_financeiras'] });
    setSaving(false);
    setMetaInput('');
    toast({ title: 'Meta salva!' });
  };

  return (
    <div className="space-y-5">
      <div className="flex gap-2 items-center">
        <Select value={mesSelecionado} onValueChange={setMesSelecionado}>
          <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
          <SelectContent>
            {meses.map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {/* Meta de economia */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <Target className="w-4 h-4 text-primary" />
            Meta de Economia — {mesSelecionado}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {metaMes?.meta_mensal && (
            <div className="flex items-center justify-between bg-primary/5 rounded-lg px-4 py-3">
              <span className="text-sm text-muted-foreground">Meta atual</span>
              <span className="text-lg font-bold text-primary">{formatCurrency(metaMes.meta_mensal)}</span>
            </div>
          )}
          <div className="flex gap-2">
            <Input
              type="number"
              min="0"
              step="0.01"
              placeholder={metaMes?.meta_mensal ? 'Nova meta...' : 'Definir meta de economia...'}
              value={metaInput}
              onChange={e => setMetaInput(e.target.value)}
              className="flex-1"
            />
            <Button onClick={handleSalvarMeta} disabled={saving}>
              {saving ? 'Salvando...' : metaMes?.meta_mensal ? 'Atualizar' : 'Definir'}
            </Button>
          </div>

          {metaMes?.meta_mensal && progresso !== null && (
            <div className="space-y-2 pt-1">
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-muted rounded-xl p-3 text-center">
                  <p className="text-xs text-muted-foreground">Meta</p>
                  <p className="font-bold text-primary text-sm">{formatCurrency(metaMes.meta_mensal)}</p>
                </div>
                <div className={`rounded-xl p-3 text-center ${saldoPessoal >= 0 ? 'bg-green-50' : 'bg-red-50'}`}>
                  <p className="text-xs text-muted-foreground">Economia Real</p>
                  <p className={`font-bold text-sm ${saldoPessoal >= 0 ? 'text-green-700' : 'text-red-700'}`}>{formatCurrency(saldoPessoal)}</p>
                </div>
              </div>
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>Progresso</span>
                <span className={`font-bold ${progresso >= 100 ? 'text-green-600' : 'text-primary'}`}>{progresso.toFixed(0)}%</span>
              </div>
              <div className="w-full h-3 rounded-full bg-muted overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all ${progresso >= 100 ? 'bg-green-500' : progresso >= 50 ? 'bg-primary' : 'bg-orange-500'}`}
                  style={{ width: `${Math.min(Math.max(progresso, 0), 100)}%` }}
                />
              </div>
              <div className={`flex items-center gap-3 rounded-xl px-4 py-3 ${progresso >= 100 ? 'bg-green-50 border border-green-200' : saldoPessoal < 0 ? 'bg-red-50 border border-red-200' : 'bg-blue-50 border border-blue-200'}`}>
                {progresso >= 100 ? <CheckCircle2 className="w-5 h-5 text-green-600 shrink-0" /> : <AlertTriangle className="w-5 h-5 text-orange-500 shrink-0" />}
                <p className={`text-sm font-medium ${progresso >= 100 ? 'text-green-700' : saldoPessoal < 0 ? 'text-red-700' : 'text-blue-700'}`}>
                  {progresso >= 100 ? 'Parabéns! Meta atingida! 🎉'
                    : saldoPessoal < 0 ? 'Gastos ultrapassaram o salário.'
                    : `Faltam ${formatCurrency(metaMes.meta_mensal - saldoPessoal)} para a meta.`}
                </p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Meta de comissão */}
      {isAtiva('metas_comissao') && metaComissaoMes && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Award className="w-4 h-4 text-yellow-500" />
              Meta de Comissão — {mesSelecionado}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-muted rounded-xl p-3 text-center">
                <p className="text-xs text-muted-foreground">Meta</p>
                <p className="font-bold text-primary text-sm">{formatCurrency(metaComissaoMes.meta_valor)}</p>
              </div>
              <div className="bg-green-50 rounded-xl p-3 text-center">
                <p className="text-xs text-muted-foreground">Comissão Real</p>
                <p className="font-bold text-green-700 text-sm">{formatCurrency(comissaoMes)}</p>
              </div>
            </div>
            {progressoComissao !== null && (
              <>
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>Progresso</span>
                  <span className={`font-bold ${progressoComissao >= 100 ? 'text-green-600' : 'text-primary'}`}>{progressoComissao.toFixed(0)}%</span>
                </div>
                <div className="w-full h-3 rounded-full bg-muted overflow-hidden">
                  <div
                    className={`h-full rounded-full ${progressoComissao >= 100 ? 'bg-green-500' : 'bg-yellow-500'}`}
                    style={{ width: `${Math.min(Math.max(progressoComissao, 0), 100)}%` }}
                  />
                </div>
              </>
            )}
          </CardContent>
        </Card>
      )}

      {/* Histórico de metas */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-primary" />
            Histórico de Metas
          </CardTitle>
        </CardHeader>
        <CardContent>
          {metas.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">Nenhuma meta definida ainda.</p>
          ) : (
            <div className="space-y-2">
              {metas.sort((a, b) => b.mes_referencia.localeCompare(a.mes_referencia)).slice(0, 6).map(m => {
                const g = filtrarGastosPorMes(gastos, m.mes_referencia);
                const { saldoPessoal: sp } = calcularResumoMensal(g, salario);
                const p = calcularProgressoMeta(sp, m.meta_mensal);
                return (
                  <div key={m.id} className={`flex items-center justify-between rounded-lg px-3 py-2 text-sm ${m.mes_referencia === mesSelecionado ? 'bg-primary/5 border border-primary/20' : 'bg-muted/40'}`}>
                    <span className="font-medium">{m.mes_referencia}</span>
                    <div className="flex items-center gap-3 text-xs">
                      <span className="text-muted-foreground">{formatCurrency(m.meta_mensal)}</span>
                      <span className={`font-bold ${p >= 100 ? 'text-green-600' : p >= 0 ? 'text-primary' : 'text-destructive'}`}>
                        {p?.toFixed(0) ?? '—'}%
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { client } from '@/api/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { formatCurrency } from '@/lib/formatters';
import { formatPeriodo, calcularComissaoMensal, calcularProgressoMetaComissao, getAlertaMetaComissao } from '@/lib/comissoes';
import { AlertTriangle, Award, Info, CheckCircle2, Target, TrendingUp, Star, Zap, CalendarDays, ChevronDown, ChevronUp, Users } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { useRHControl } from '@/lib/rhControl';
import { useFinancialDataLogger } from '@/hooks/useFinancialDataLogger';

function AlertaMotivacional({ progresso, meta }) {
  const alerta = getAlertaMetaComissao(progresso, progresso >= 100);
  if (!alerta) return null;
  const config = {
    sucesso: { bg: 'bg-green-50 border-green-200', text: 'text-green-800', icon: <Star className="w-4 h-4 text-green-600 shrink-0" /> },
    otimo: { bg: 'bg-blue-50 border-blue-200', text: 'text-blue-800', icon: <Zap className="w-4 h-4 text-blue-600 shrink-0" /> },
    metade: { bg: 'bg-amber-50 border-amber-200', text: 'text-amber-800', icon: <TrendingUp className="w-4 h-4 text-amber-600 shrink-0" /> },
  }[alerta.tipo];
  return (
    <div className={`flex items-start gap-2 border rounded-lg px-3 py-2 ${config.bg}`}>
      {config.icon}
      <p className={`text-xs font-medium ${config.text}`}>{alerta.msg}</p>
    </div>
  );
}

export default function MinhasComissoes({ funcionarioId, funcionarioSetor }) {
  const { isAtiva, isLoading: loadingRH } = useRHControl();
  const { logError } = useFinancialDataLogger('MinhasComissoes');
  const [mesExpandido, setMesExpandido] = useState(null);

  const { data: minhasComissoes = [], isLoading, error: comissoesError } = useQuery({
    queryKey: ['comissoes_funcionario', funcionarioId],
    queryFn: () => client.entities.ComissaoPorFuncionario.filter({ funcionario_id: funcionarioId }),
    enabled: !!funcionarioId,
  });

  if (comissoesError) logError(comissoesError, 'Erro ao carregar comissões');

  const { data: comissoesSetor = [] } = useQuery({
    queryKey: ['comissoes_setor', funcionarioSetor],
    queryFn: () => client.entities.ComissaoPorFuncionario.filter({ setor: funcionarioSetor }),
    enabled: !!funcionarioId && !!funcionarioSetor,
  });

  const { data: metas = [] } = useQuery({
    queryKey: ['metas_comissao_portal', funcionarioId, funcionarioSetor],
    queryFn: () => client.entities.MetaComissao.list('-created_date', 100),
    enabled: !!funcionarioId && isAtiva('metas_comissao'),
  });

  if (isLoading || loadingRH) return <Skeleton className="h-32" />;
  if (!isAtiva('comissoes_por_periodo')) return (
    <div className="text-center py-6 text-muted-foreground text-sm">Módulo de comissões desativado.</div>
  );

  // ─── VISÃO INDIVIDUAL ───
  const porMes = {};
  minhasComissoes.forEach(c => {
    const m = c.mes_referencia || 'Sem data';
    if (!porMes[m]) porMes[m] = [];
    porMes[m].push(c);
  });
  const meses = Object.keys(porMes).sort((a, b) => b.localeCompare(a));

  // ─── VISÃO DO SETOR ───
  const setorPorMes = {};
  comissoesSetor.forEach(c => {
    const m = c.mes_referencia || 'Sem data';
    if (!setorPorMes[m]) setorPorMes[m] = [];
    setorPorMes[m].push(c);
  });
  const mesesSetor = Object.keys(setorPorMes).sort((a, b) => b.localeCompare(a));

  function getMetaMes(mes) {
    const metaInd = metas.find(m => m.mes_referencia === mes && m.funcionario_id === funcionarioId);
    if (metaInd) return metaInd;
    if (funcionarioSetor) {
      return metas.find(m =>
        m.mes_referencia === mes && !m.funcionario_id && m.setor &&
        funcionarioSetor.toLowerCase().includes(m.setor.toLowerCase())
      );
    }
    return null;
  }

  if (minhasComissoes.length === 0 && comissoesSetor.length === 0) return (
    <div className="text-center py-6 text-muted-foreground text-sm">Nenhuma comissão registrada.</div>
  );

  return (
    <div className="space-y-6">

      {/* ─── RESUMO DO SETOR ─── */}
      {funcionarioSetor && comissoesSetor.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center gap-2 text-sm font-semibold text-muted-foreground">
            <Users className="w-4 h-4" />
            Resumo do Setor: <span className="text-foreground">{funcionarioSetor}</span>
          </div>

          {mesesSetor.map(mes => {
            const registros = setorPorMes[mes];
            const totalBruto = registros.reduce((s, r) => s + (r.valor_setor || 0), 0);
            const totalPago = registros.filter(r => r.apto).reduce((s, r) => s + (r.valor_individual_final ?? r.valor_individual ?? 0), 0);
            const excluidos = registros.filter(r => !r.apto).length;
            const funcionarios = new Set(registros.map(r => r.funcionario_nome)).size;
            const expandido = mesExpandido === mes;

            return (
              <Card key={mes}>
                <button
                  onClick={() => setMesExpandido(expandido ? null : mes)}
                  className="w-full text-left"
                >
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <CalendarDays className="w-4 h-4 text-primary" />
                        <span className="font-semibold text-sm">{mes}</span>
                        <span className="text-xs text-muted-foreground">({funcionarios} funcionários)</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="text-right">
                          <p className="text-xs text-muted-foreground">Distribuído ao setor</p>
                          <p className="font-bold text-primary">{formatCurrency(totalBruto)}</p>
                        </div>
                        {expandido ? <ChevronUp className="w-4 h-4 text-muted-foreground shrink-0" /> : <ChevronDown className="w-4 h-4 text-muted-foreground shrink-0" />}
                      </div>
                    </div>
                  </CardHeader>
                </button>

                {expandido && (
                  <CardContent className="space-y-2 pt-0">
                    <div className="bg-muted/30 rounded-lg px-3 py-2 flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Valor total distribuído</span>
                      <span className="font-semibold">{formatCurrency(totalBruto)}</span>
                    </div>
                    <div className="bg-muted/30 rounded-lg px-3 py-2 flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Valor pago aos funcionários</span>
                      <span className="font-semibold text-green-600">{formatCurrency(totalPago)}</span>
                    </div>
                    {excluidos > 0 && (
                      <div className="bg-red-50 rounded-lg px-3 py-2 flex items-center justify-between text-sm">
                        <span className="text-red-700">Funcionários excluídos (faltas/atestados)</span>
                        <span className="font-semibold text-red-700">{excluidos}</span>
                      </div>
                    )}

                    <div className="divide-y rounded-lg border mt-2">
                      <div className="bg-muted/30 px-3 py-1.5 text-xs font-medium text-muted-foreground">
                        Períodos
                      </div>
                      {registros.sort((a, b) => (a.periodo_inicio || '').localeCompare(b.periodo_inicio || '')).map(r => (
                        <div key={r.id} className={`px-3 py-2 text-sm flex items-center justify-between gap-2 ${!r.apto ? 'bg-red-50' : ''}`}>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-medium">{r.funcionario_nome}</span>
                              {!r.apto ? (
                                <Badge variant="destructive" className="text-xs">Excluído</Badge>
                              ) : r.dias_ausentes_no_periodo > 0 ? (
                                <Badge variant="outline" className="text-xs border-amber-300 text-amber-700">Com falta</Badge>
                              ) : null}
                            </div>
                            <p className="text-xs text-muted-foreground">{formatPeriodo(r.periodo_inicio, r.periodo_fim)}</p>
                          </div>
                          <div className="text-right shrink-0">
                            {r.apto ? (
                              r.dias_ausentes_no_periodo > 0 ? (
                                <div>
                                  <p className="text-xs text-muted-foreground line-through">{formatCurrency(r.valor_individual_cheio ?? 0)}</p>
                                  <p className="font-bold text-amber-600">{formatCurrency(r.valor_individual_final ?? r.valor_individual ?? 0)}</p>
                                </div>
                              ) : (
                                <p className="font-bold text-green-600">{formatCurrency(r.valor_individual_final ?? r.valor_individual ?? 0)}</p>
                              )
                            ) : (
                              <span className="text-xs text-red-600">R$ 0,00</span>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                )}
              </Card>
            );
          })}
        </div>
      )}

      {/* ─── MINHAS COMISSÕES ─── */}
      {minhasComissoes.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center gap-2 text-sm font-semibold text-muted-foreground">
            <Award className="w-4 h-4" />
            Minhas Comissões
          </div>

          {meses.map(mes => {
            const periodos = porMes[mes].sort((a, b) => (a.periodo_inicio || '').localeCompare(b.periodo_inicio || ''));
            const totalMes = periodos.filter(p => p.apto).reduce((s, p) => s + (p.valor_individual_final ?? p.valor_individual ?? 0), 0);
            const meta = getMetaMes(mes);
            const progresso = meta ? calcularProgressoMetaComissao(totalMes, meta.meta_valor) : null;
            const faltaMeta = meta && progresso < 100 ? meta.meta_valor - totalMes : 0;

            const porSetor = {};
            periodos.forEach(p => {
              const s = p.setor || 'Sem setor';
              if (!porSetor[s]) porSetor[s] = [];
              porSetor[s].push(p);
            });

            return (
              <Card key={mes}>
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base flex items-center gap-2">
                      <CalendarDays className="w-4 h-4 text-primary" />
                      {mes}
                    </CardTitle>
                    <span className="text-lg font-bold text-primary">{formatCurrency(totalMes)}</span>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  {Object.entries(porSetor).map(([setor, lista]) => (
                    <div key={setor} className="border rounded-lg overflow-hidden">
                      <div className="bg-muted/30 px-3 py-1.5 text-xs font-medium text-muted-foreground">
                        {setor}
                      </div>
                      <div className="divide-y">
                        {lista.map(p => {
                          const temDesconto = p.apto && (p.dias_ausentes_no_periodo > 0);
                          const valorFinal = p.valor_individual_final ?? p.valor_individual ?? 0;
                          return (
                            <div key={p.id} className={`px-3 py-2.5 text-sm flex items-center justify-between gap-2 ${!p.apto ? 'bg-red-50' : temDesconto ? 'bg-amber-50/40' : ''}`}>
                              <div className="min-w-0 flex-1">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <span className="font-medium">{formatPeriodo(p.periodo_inicio, p.periodo_fim)}</span>
                                  {!p.apto ? (
                                    <Badge variant="destructive" className="text-xs">Excluído</Badge>
                                  ) : temDesconto ? (
                                    <Badge variant="outline" className="text-xs border-amber-300 text-amber-700">Com falta</Badge>
                                  ) : (
                                    <Badge variant="outline" className="text-xs border-green-300 text-green-700">Completo</Badge>
                                  )}
                                </div>
                                {!p.apto && p.motivo_exclusao && (
                                  <p className="text-xs text-red-600 mt-0.5">{p.motivo_exclusao}</p>
                                )}
                                {temDesconto && (
                                  <p className="text-xs text-amber-700 mt-0.5">
                                    {p.dias_trabalhados ?? (p.dias_totais - p.dias_ausentes_no_periodo)} de {p.dias_totais} dias trabalhados
                                  </p>
                                )}
                              </div>
                              <div className="text-right shrink-0">
                                {p.apto ? (
                                  temDesconto ? (
                                    <div>
                                      <p className="text-xs text-muted-foreground line-through">{formatCurrency(p.valor_individual_cheio ?? valorFinal)}</p>
                                      <p className="font-bold text-amber-600">{formatCurrency(valorFinal)}</p>
                                    </div>
                                  ) : (
                                    <p className="font-bold text-green-600">{formatCurrency(valorFinal)}</p>
                                  )
                                ) : null}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ))}

                  {isAtiva('metas_comissao') && meta && (
                    <div className="pt-2 space-y-2">
                      <div className="flex items-center justify-between text-sm">
                        <span className="flex items-center gap-1.5 text-muted-foreground">
                          <Target className="w-3.5 h-3.5" />Meta do mês
                        </span>
                        <span className="font-semibold text-primary">{formatCurrency(meta.meta_valor)}</span>
                      </div>
                      <Progress value={progresso || 0} className="h-2" />
                      <div className="flex justify-between text-xs text-muted-foreground">
                        <span>{(progresso || 0).toFixed(0)}% atingido</span>
                        {faltaMeta > 0 && <span className="text-orange-600">Falta {formatCurrency(faltaMeta)}</span>}
                        {progresso >= 100 && <span className="text-green-600 font-semibold">Meta batida! 🎉</span>}
                      </div>
                      {isAtiva('alertas_motivacionais') && (
                        <AlertaMotivacional progresso={progresso || 0} meta={meta.meta_valor} />
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

    </div>
  );
}

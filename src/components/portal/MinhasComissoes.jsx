import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { client } from '@/api/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { formatCurrency } from '@/lib/formatters';
import { formatPeriodo, calcularComissaoMensal, calcularProgressoMetaComissao, getAlertaMetaComissao } from '@/lib/comissoes';
import { AlertTriangle, Award, Info, CheckCircle2, Target, TrendingUp, Star, Zap, ChevronDown, Calculator, Users } from 'lucide-react';
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

function ModalDetalheCalculo({ periodo, open, onClose }) {
  if (!periodo) return null;

  const diasTotais = periodo.dias_totais || 30;
  const diasTrabalhados = periodo.dias_trabalhados ?? (diasTotais - (periodo.dias_ausentes_no_periodo || 0));
  const diasAusentes = periodo.dias_ausentes_no_periodo || 0;
  const proporcao = periodo.proporcao ?? (diasTotais > 0 ? diasTrabalhados / diasTotais : 1);
  const valorCheio = periodo.valor_individual_cheio ?? periodo.valor_setor_individual ?? periodo.valor_individual ?? 0;
  const valorFinal = periodo.valor_individual_final ?? periodo.valor_individual ?? 0;
  const temDesconto = diasAusentes > 0 && valorCheio !== valorFinal;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base">
            <Calculator className="w-4 h-4 text-primary" />
            Detalhes do Cálculo — {formatPeriodo(periodo.periodo_inicio, periodo.periodo_fim)}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-3 text-sm">
          {/* Cabeçalho: setor */}
          {periodo.setor && (
            <div className="flex items-center gap-2 text-xs text-muted-foreground bg-muted/40 rounded-lg px-3 py-2">
              <Users className="w-3.5 h-3.5 shrink-0" />
              Setor: <span className="font-semibold text-foreground">{periodo.setor}</span>
            </div>
          )}

          {/* ── PASSO 1 ── Valor base */}
          <div className="rounded-xl border overflow-hidden">
            <div className="flex items-center gap-2 bg-muted/40 px-3 py-2 border-b">
              <span className="w-5 h-5 rounded-full bg-primary text-primary-foreground text-xs flex items-center justify-center font-bold shrink-0">1</span>
              <span className="text-xs font-semibold text-foreground">Valor Base (sem desconto)</span>
            </div>
            <div className="px-3 py-2.5 flex items-center justify-between">
              <span className="text-xs text-muted-foreground">Comissão integral do período</span>
              <span className="font-bold text-base">{formatCurrency(valorCheio)}</span>
            </div>
          </div>

          {/* ── PASSO 2 ── Dias trabalhados */}
          <div className="rounded-xl border overflow-hidden">
            <div className="flex items-center gap-2 bg-muted/40 px-3 py-2 border-b">
              <span className="w-5 h-5 rounded-full bg-primary text-primary-foreground text-xs flex items-center justify-center font-bold shrink-0">2</span>
              <span className="text-xs font-semibold text-foreground">Proporcionalidade por Dias</span>
            </div>
            <div className="px-3 py-3 space-y-3">
              {/* Cards de dias */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-center text-xs">
                <div className="bg-slate-50 border rounded-lg py-2.5">
                  <p className="text-muted-foreground mb-0.5">Dias do Mês</p>
                  <p className="text-xl font-bold text-slate-700">{diasTotais}</p>
                </div>
                <div className={`border rounded-lg py-2.5 ${temDesconto ? 'bg-amber-50 border-amber-200' : 'bg-green-50 border-green-200'}`}>
                  <p className={`mb-0.5 ${temDesconto ? 'text-amber-600' : 'text-green-600'}`}>Trabalhados</p>
                  <p className={`text-xl font-bold ${temDesconto ? 'text-amber-800' : 'text-green-800'}`}>{diasTrabalhados}</p>
                </div>
                <div className={`border rounded-lg py-2.5 ${diasAusentes > 0 ? 'bg-red-50 border-red-200' : 'bg-muted/20 border-muted'}`}>
                  <p className={`mb-0.5 ${diasAusentes > 0 ? 'text-red-500' : 'text-muted-foreground'}`}>Ausências</p>
                  <p className={`text-xl font-bold ${diasAusentes > 0 ? 'text-red-700' : 'text-muted-foreground'}`}>{diasAusentes}</p>
                </div>
              </div>

              {/* Barra visual */}
              <div>
                <div className="flex justify-between text-xs text-muted-foreground mb-1">
                  <span>Aproveitamento do período</span>
                  <span className="font-semibold text-foreground">{(proporcao * 100).toFixed(1)}%</span>
                </div>
                <div className="h-2.5 bg-muted rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full ${temDesconto ? 'bg-amber-400' : 'bg-green-500'}`}
                    style={{ width: `${Math.min(100, proporcao * 100)}%` }}
                  />
                </div>
              </div>

              {/* Fórmula */}
              <div className="bg-muted/40 border rounded-lg px-3 py-2 text-xs text-center font-mono text-muted-foreground">
                {diasTrabalhados} ÷ {diasTotais} = <strong className="text-foreground">{(proporcao * 100).toFixed(1)}%</strong> de aproveitamento
              </div>

              {periodo.motivo_exclusao && (
                <div className="flex items-start gap-2 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                  <AlertTriangle className="w-3.5 h-3.5 text-red-500 mt-0.5 shrink-0" />
                  <p className="text-xs text-red-700"><strong>Motivo:</strong> {periodo.motivo_exclusao}</p>
                </div>
              )}
            </div>
          </div>

          {/* ── PASSO 3 ── Resultado final */}
          <div className={`rounded-xl border-2 overflow-hidden ${temDesconto ? 'border-amber-300' : 'border-green-300'}`}>
            <div className={`flex items-center gap-2 px-3 py-2 border-b ${temDesconto ? 'bg-amber-50 border-amber-300' : 'bg-green-50 border-green-300'}`}>
              <span className={`w-5 h-5 rounded-full text-xs flex items-center justify-center font-bold shrink-0 ${temDesconto ? 'bg-amber-500 text-white' : 'bg-green-600 text-white'}`}>3</span>
              <span className={`text-xs font-semibold ${temDesconto ? 'text-amber-800' : 'text-green-800'}`}>Valor Final a Receber</span>
            </div>
            <div className="px-3 py-3">
              {temDesconto ? (
                <div className="space-y-1.5">
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>Valor integral</span>
                    <span className="line-through">{formatCurrency(valorCheio)}</span>
                  </div>
                  <div className="flex justify-between text-xs text-red-600">
                    <span>Desconto ({diasAusentes} dia{diasAusentes > 1 ? 's' : ''} ausente{diasAusentes > 1 ? 's' : ''})</span>
                    <span className="font-semibold">− {formatCurrency(valorCheio - valorFinal)}</span>
                  </div>
                  <div className="flex justify-between items-center pt-2 border-t mt-1">
                    <span className="font-semibold text-sm">Valor a receber</span>
                    <span className="text-xl font-bold text-amber-600">{formatCurrency(valorFinal)}</span>
                  </div>
                  <p className="text-xs text-muted-foreground text-right">
                    {formatCurrency(valorCheio)} × {(proporcao * 100).toFixed(1)}%
                  </p>
                </div>
              ) : (
                <div className="flex justify-between items-center">
                  <div>
                    <p className="text-xs text-green-700 font-medium">✅ Período completo — sem descontos</p>
                    <p className="text-xs text-muted-foreground mt-0.5">Comissão integral mantida</p>
                  </div>
                  <span className="text-xl font-bold text-green-600">{formatCurrency(valorFinal)}</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default function MinhasComissoes({ funcionarioId, funcionarioSetor }) {
  const { isAtiva, isLoading: loadingRH } = useRHControl();
  const { logError } = useFinancialDataLogger('MinhasComissoes');
  const [modalPeriodo, setModalPeriodo] = useState(null);

  const { data: minhasComissoes = [], isLoading, error: comissoesError } = useQuery({
    queryKey: ['comissoes_funcionario', funcionarioId],
    queryFn: () => client.entities.ComissaoPorFuncionario.filter({ funcionario_id: funcionarioId }),
    enabled: !!funcionarioId,
  });

  if (comissoesError) {
    logError(comissoesError, 'Erro ao carregar comissões');
  }

  const { data: metas = [], error: metasError } = useQuery({
    queryKey: ['metas_comissao_portal', funcionarioId, funcionarioSetor],
    queryFn: () => client.entities.MetaComissao.list('-created_date', 100),
    enabled: !!funcionarioId && isAtiva('metas_comissao'),
  });

  if (metasError) {
    logError(metasError, 'Erro ao carregar metas de comissão');
  }

  if (isLoading || loadingRH) return <Skeleton className="h-32" />;
  if (!isAtiva('comissoes_por_periodo')) return (
    <div className="text-center py-6 text-muted-foreground text-sm">Módulo de comissões desativado.</div>
  );
  if (minhasComissoes.length === 0) return (
    <div className="text-center py-6 text-muted-foreground text-sm">Nenhuma comissão registrada.</div>
  );

  const exibirDetalhes = isAtiva('exibir_calculo_comissao_detalhado');

  // Agrupar por mês
  const porMes = {};
  minhasComissoes.forEach(c => {
    const m = c.mes_referencia || 'Sem data';
    if (!porMes[m]) porMes[m] = [];
    porMes[m].push(c);
  });

  const meses = Object.keys(porMes).sort((a, b) => b.localeCompare(a));

  function getMetaMes(mes) {
    const metaInd = metas.find(m => m.mes_referencia === mes && m.funcionario_id === funcionarioId);
    if (metaInd) return metaInd;
    if (funcionarioSetor) {
      const metaSetor = metas.find(m =>
        m.mes_referencia === mes &&
        !m.funcionario_id &&
        m.setor &&
        funcionarioSetor.toLowerCase().includes(m.setor.toLowerCase())
      );
      if (metaSetor) return metaSetor;
    }
    return null;
  }

  return (
    <>
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <Award className="w-4 h-4 text-primary" />
            Minhas Comissões (Gorjetas)
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-start gap-2 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
            <Info className="w-4 h-4 text-amber-600 mt-0.5 shrink-0" />
            <p className="text-xs text-amber-800">
              Valores <strong>BRUTOS</strong>. Quando há dias ausentes, a comissão é reduzida proporcionalmente aos dias trabalhados.
            </p>
          </div>

          {meses.map(mes => {
            const periodos = porMes[mes].sort((a, b) => (a.periodo_inicio || '').localeCompare(b.periodo_inicio || ''));
            const totalMes = periodos.filter(p => p.apto).reduce((s, p) => {
              return s + (p.valor_individual_final ?? p.valor_individual ?? 0);
            }, 0);
            const meta = getMetaMes(mes);
            const progresso = meta ? calcularProgressoMetaComissao(totalMes, meta.meta_valor) : null;
            const faltaMeta = meta && progresso < 100 ? meta.meta_valor - totalMes : 0;

            return (
              <div key={mes} className="border rounded-xl overflow-hidden">
                <div className="bg-muted/40 px-4 py-2.5 flex items-center justify-between">
                  <span className="font-semibold text-sm">{mes}</span>
                  <span className="font-bold text-primary">{formatCurrency(totalMes)}</span>
                </div>

                <div className="divide-y">
                  {periodos.map(p => {
                    const temDesconto = p.apto && (p.dias_ausentes_no_periodo > 0);
                    return (
                      <div key={p.id} className={`px-4 py-2.5 text-sm ${!p.apto ? 'bg-red-50/50' : temDesconto ? 'bg-amber-50/40' : ''}`}>
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <span className="font-medium">{formatPeriodo(p.periodo_inicio, p.periodo_fim)}</span>
                            {p.setor && <span className="ml-2 text-xs text-muted-foreground">· {p.setor}</span>}
                            {!p.apto && (
                              <p className="text-xs text-red-600 flex items-center gap-1 mt-0.5">
                                <AlertTriangle className="w-3 h-3" />{p.motivo_exclusao || 'Falta/atestado'}
                              </p>
                            )}
                            {p.apto && temDesconto && (
                              <p className="text-xs text-amber-700 flex items-center gap-1 mt-0.5">
                                <AlertTriangle className="w-3 h-3" />
                                Reduzida: {p.dias_trabalhados ?? (p.dias_totais - p.dias_ausentes_no_periodo)} de {p.dias_totais} dias trabalhados
                              </p>
                            )}
                          </div>
                          <div className="flex flex-col items-end gap-0.5">
                            {p.apto ? (
                              <>
                                <Badge variant="outline" className="text-green-700 border-green-300 text-xs">
                                  <CheckCircle2 className="w-3 h-3 mr-1" />Recebido
                                </Badge>
                                {temDesconto && p.valor_individual_cheio != null ? (
                                  <>
                                    <span className="text-xs text-muted-foreground line-through">{formatCurrency(p.valor_individual_cheio)}</span>
                                    <span className="font-bold text-amber-600">{formatCurrency(p.valor_individual_final ?? p.valor_individual)}</span>
                                  </>
                                ) : (
                                  <span className="font-bold text-green-600">{formatCurrency(p.valor_individual_final ?? p.valor_individual)}</span>
                                )}
                              </>
                            ) : (
                              <Badge variant="destructive" className="text-xs">Excluído</Badge>
                            )}
                          </div>
                        </div>

                        {/* Mini-resumo de dias (sempre visível quando há ausências) */}
                        {p.apto && temDesconto && p.dias_totais != null && (
                          <div className="mt-2 bg-amber-50 border border-amber-200 rounded-lg overflow-hidden text-xs">
                            {/* Barra de progresso de dias */}
                            <div className="px-3 pt-2.5 pb-1.5">
                              <div className="flex justify-between text-amber-700 mb-1 font-medium">
                                <span>Dias trabalhados</span>
                                <span>{p.dias_trabalhados ?? (p.dias_totais - p.dias_ausentes_no_periodo)} de {p.dias_totais} dias ({((p.proporcao || 0) * 100).toFixed(0)}%)</span>
                              </div>
                              <div className="h-2 bg-amber-200 rounded-full overflow-hidden">
                                <div
                                  className="h-full bg-amber-500 rounded-full"
                                  style={{ width: `${Math.min(100, ((p.proporcao || 0) * 100))}%` }}
                                />
                              </div>
                            </div>
                            {/* Linha resumo */}
                            <div className="grid grid-cols-3 divide-x divide-amber-200 border-t border-amber-200">
                              <div className="px-3 py-1.5 text-center">
                                <p className="text-amber-600">Integral</p>
                                <p className="font-bold text-amber-800 line-through">{formatCurrency(p.valor_individual_cheio)}</p>
                              </div>
                              <div className="px-3 py-1.5 text-center">
                                <p className="text-red-500">Desconto</p>
                                <p className="font-bold text-red-700">− {formatCurrency(p.valor_individual_cheio - (p.valor_individual_final ?? p.valor_individual))}</p>
                              </div>
                              <div className="px-3 py-1.5 text-center bg-amber-100">
                                <p className="text-amber-700">A receber</p>
                                <p className="font-bold text-amber-900">{formatCurrency(p.valor_individual_final ?? p.valor_individual)}</p>
                              </div>
                            </div>
                          </div>
                        )}

                        {/* Botão de detalhes do cálculo (controlado pelo RH) */}
                        {exibirDetalhes && p.apto && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="mt-1.5 h-9 text-xs text-muted-foreground hover:text-primary px-2 gap-1"
                            onClick={() => setModalPeriodo(p)}
                          >
                            <Calculator className="w-3 h-3" />
                            Ver cálculo detalhado
                            <ChevronDown className="w-3 h-3" />
                          </Button>
                        )}
                      </div>
                    );
                  })}
                </div>

                <div className="bg-muted/20 px-4 py-2 flex items-center justify-between text-sm border-t">
                  <span className="text-muted-foreground">Total do mês</span>
                  <span className="font-bold">{formatCurrency(totalMes)}</span>
                </div>

                {isAtiva('metas_comissao') && meta && (
                  <div className="px-4 py-3 border-t bg-white space-y-2">
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
              </div>
            );
          })}
        </CardContent>
      </Card>

      <ModalDetalheCalculo
        periodo={modalPeriodo}
        open={!!modalPeriodo}
        onClose={() => setModalPeriodo(null)}
      />
    </>
  );
}
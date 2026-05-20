import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { formatCurrency, getMesReferenciaAtual } from '@/lib/formatters';
import { AlertTriangle, CheckCircle2, Users, Calculator, Save, AlertCircle, Info, CalendarMinus } from 'lucide-react';
import { toast } from 'sonner';
import { mapearSetorDinamico, calcularDivisaoDinamica, calcularDivisao, SETOR_LABELS, normalizarSetor, calcularProporcionalidade } from '@/lib/comissoes';
import { registrarAuditoria } from '@/lib/audit';
import { Skeleton } from '@/components/ui/skeleton';
import { useRHControl } from '@/lib/rhControl';

function getMesFromDatas(inicio) {
  if (!inicio) return getMesReferenciaAtual();
  const d = new Date(inicio + 'T00:00:00');
  return `${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
}

export default function LancarComissao({ funcionarios, onSaved }) {
  const { isAtiva } = useRHControl();
  const [periodoInicio, setPeriodoInicio] = useState('');
  const [periodoFim, setPeriodoFim] = useState('');
  const [valorTotal, setValorTotal] = useState('');
  const [observacao, setObservacao] = useState('');
  const [calculado, setCalculado] = useState(false);
  const [salvando, setSalvando] = useState(false);
  // diasAusentes por funcionário: { [funcId]: número }
  const [diasAusentesPorFunc, setDiasAusentesPorFunc] = useState({});

  const mesRef = getMesFromDatas(periodoInicio);

  const { data: setoresDB = [], isLoading: loadingSetores } = useQuery({
    queryKey: ['setores_comissao'],
    queryFn: () => base44.entities.SetoresComissao.list('ordem_exibicao', 50),
  });

  // Usar setores dinâmicos apenas se a funcionalidade estiver ativa
  const setoresAtivos = isAtiva('setores_configuráveis') ? setoresDB.filter(s => s.ativo !== false) : [];
  const usarDinamico = setoresAtivos.length > 0 && isAtiva('divisao_automatica_setor');

  // Divisão de valores por setor
  const divisao = useMemo(() => {
    const v = parseFloat(valorTotal) || 0;
    if (usarDinamico) return calcularDivisaoDinamica(v, setoresAtivos);
    return calcularDivisao(v);
  }, [valorTotal, setoresAtivos, usarDinamico]);

  const hoje = new Date().toISOString().split('T')[0];

  // Filtra funcionários aptos a receber comissão
  const funcionariosAptos = funcionarios.filter(f => {
    if (f.ativo === false) return false;
    if (f.apto_comissao) return true;
    // Verifica data programada
    if (f.data_inicio_comissao && f.data_inicio_comissao <= hoje) return true;
    return false;
  });

  const funcionariosInaptos = funcionarios.filter(f => {
    if (f.ativo === false) return false;
    return !f.apto_comissao && (!f.data_inicio_comissao || f.data_inicio_comissao > hoje);
  });

  // Agrupa funcionários por setor
  const porSetor = useMemo(() => {
    const grupos = {};
    if (usarDinamico) {
      setoresAtivos.forEach(s => { grupos[s.id] = []; });
      grupos['__outros'] = []; // fallback para aptos sem setor mapeado
      funcionariosAptos.filter(f => f.ativo !== false).forEach(f => {
        const sid = mapearSetorDinamico(f.setor, setoresAtivos);
        if (sid && grupos[sid]) {
          grupos[sid].push(f);
        } else {
          grupos['__outros'].push(f); // garante que não seja ignorado
        }
      });
    } else {
      const chaves = { salao: [], cozinha: [], copa_playground_caixa: [], limpeza_rh: [], __outros: [] };
      funcionariosAptos.filter(f => f.ativo !== false).forEach(f => {
        const setor = normalizarSetor(f.setor);
        if (setor && chaves[setor]) {
          chaves[setor].push(f);
        } else {
          chaves['__outros'].push(f); // garante que não seja ignorado
        }
      });
      return chaves;
    }
    return grupos;
  }, [funcionariosAptos, setoresAtivos, usarDinamico]);

  // Aptos e excluídos por setor (exclusão só se funcionalidade ativa)
  const aptoPorSetor = useMemo(() => {
    const excluirPorFalta = isAtiva('exclusao_faltas_atestados');
    const result = {};
    for (const [setor, funcs] of Object.entries(porSetor)) {
      result[setor] = {
        aptos: excluirPorFalta ? funcs.filter(f => !f.faltas_no_periodo && !f.atestados_no_periodo) : funcs,
        excluidos: excluirPorFalta ? funcs.filter(f => f.faltas_no_periodo || f.atestados_no_periodo) : [],
      };
    }
    return result;
  }, [porSetor]);

  // Distribuição final
  const distribuicao = useMemo(() => {
    const result = {};
    for (const [setorId, { aptos, excluidos }] of Object.entries(aptoPorSetor)) {
      // __outros: funcionários aptos cujo setor não foi mapeado — recebem valor proporcional à sua participação individual
      // Eles dividem o valor que ficaria "sem dono" de forma igualitária entre si
      let valorSetor, nome;
      if (setorId === '__outros') {
        // Soma dos valores de todos os setores com valor (para calcular o não distribuído)
        const totalDistribuido = Object.entries(divisao)
          .filter(([k]) => k !== '__outros')
          .reduce((s, [, v]) => s + (typeof v === 'object' ? (v?.valor || 0) : (v || 0)), 0);
        const totalGeral = parseFloat(valorTotal) || 0;
        valorSetor = Math.max(0, totalGeral - totalDistribuido);
        nome = 'Outros (setor não mapeado)';
      } else {
        valorSetor = usarDinamico ? (divisao[setorId]?.valor || 0) : (divisao[setorId] || 0);
        nome = usarDinamico ? (divisao[setorId]?.nome || setorId) : (SETOR_LABELS[setorId] || setorId);
      }
      const valorInd = aptos.length > 0 ? valorSetor / aptos.length : 0;
      result[setorId] = { aptos, excluidos, valorSetor, valorInd, semAptos: aptos.length === 0, nome };
    }
    return result;
  }, [aptoPorSetor, divisao, usarDinamico, valorTotal]);

  const totalExcluidos = Object.values(aptoPorSetor).reduce((s, v) => s + v.excluidos.length, 0);
  const setoresSemAptosComFuncs = Object.entries(distribuicao).filter(([sid, v]) => v.semAptos && (porSetor[sid]?.length || 0) > 0 && sid !== '__outros');
  const outrosFuncs = aptoPorSetor['__outros']?.aptos || [];

  const handleCalcular = () => {
    if (!periodoInicio || !periodoFim) { toast.error('Informe o período'); return; }
    if (!parseFloat(valorTotal)) { toast.error('Informe o valor total'); return; }
    if (new Date(periodoInicio) > new Date(periodoFim)) { toast.error('Data início deve ser anterior ao fim'); return; }
    setCalculado(true);
  };

  const getDiasAusentes = (funcId) => parseInt(diasAusentesPorFunc[funcId] || 0);

  const handleConfirmar = async () => {
    setSalvando(true);
    try {
      const v = parseFloat(valorTotal);
      const comissaoData = {
        periodo_inicio: periodoInicio,
        periodo_fim: periodoFim,
        mes_referencia: mesRef,
        valor_total_periodo: v,
        observacao,
        status: 'confirmado',
      };

      // Adicionar campos de valor por setor
      if (!usarDinamico) {
        comissaoData.valor_empresa = divisao.empresa;
        comissaoData.valor_salao = divisao.salao;
        comissaoData.valor_cozinha = divisao.cozinha;
        comissaoData.valor_copa_playground_caixa = divisao.copa_playground_caixa;
        comissaoData.valor_limpeza_rh = divisao.limpeza_rh;
      }

      const comissao = await base44.entities.ComissoesGorjetas.create(comissaoData);

      const registros = [];
      for (const [setorId, { aptos, excluidos, valorSetor, valorInd, nome }] of Object.entries(distribuicao)) {
        const nomeSetor = setorId === '__outros'
          ? 'Outros'
          : usarDinamico
            ? setoresAtivos.find(s => s.id === setorId)?.nome_do_setor || setorId
            : (SETOR_LABELS[setorId] || setorId);
        for (const f of aptos) {
          const diasAusentes = getDiasAusentes(f.id);
          const { diasTotais, diasTrabalhados, proporcao } = calcularProporcionalidade(periodoInicio, periodoFim, diasAusentes);
          const valorFinal = valorInd * proporcao;
          registros.push({
            funcionario_id: f.id, funcionario_nome: f.nome, comissao_id: comissao.id,
            setor: nomeSetor, periodo_inicio: periodoInicio, periodo_fim: periodoFim,
            mes_referencia: mesRef, valor_setor: valorSetor,
            valor_individual: valorFinal, // retrocompatibilidade
            valor_individual_cheio: valorInd,
            valor_individual_final: valorFinal,
            dias_ausentes_no_periodo: diasAusentes,
            dias_trabalhados: diasTrabalhados,
            dias_totais: diasTotais,
            proporcao,
            apto: true,
          });
        }
        for (const f of excluidos) {
          registros.push({
            funcionario_id: f.id, funcionario_nome: f.nome, comissao_id: comissao.id,
            setor: nomeSetor, periodo_inicio: periodoInicio, periodo_fim: periodoFim,
            mes_referencia: mesRef, valor_setor: valorSetor,
            valor_individual: 0, valor_individual_cheio: valorInd, valor_individual_final: 0,
            dias_ausentes_no_periodo: 0, dias_trabalhados: 0, dias_totais: 0, proporcao: 0,
            apto: false,
            motivo_exclusao: f.faltas_no_periodo ? `${f.faltas_no_periodo} falta(s)` : `${f.atestados_no_periodo} atestado(s)`,
          });
        }
      }

      if (registros.length > 0) await base44.entities.ComissaoPorFuncionario.bulkCreate(registros);

      await registrarAuditoria({
        acao: 'criar', modulo: 'comissao',
        descricao: `Comissão lançada: ${periodoInicio} a ${periodoFim} — ${formatCurrency(v)}`,
        dados_novos: { valor_total: v, periodo: `${periodoInicio} a ${periodoFim}` },
      });

      toast.success('Comissão lançada com sucesso!');
      setPeriodoInicio(''); setPeriodoFim(''); setValorTotal(''); setObservacao(''); setCalculado(false); setDiasAusentesPorFunc({});
      onSaved();
      } catch (e) {
      toast.error(`Erro ao salvar: ${e.message}`);
      } finally {
      setSalvando(false);
      }
      };

  if (loadingSetores) return <Skeleton className="h-48" />;

  return (
    <div className="space-y-5">
      <div className="flex items-start gap-3 bg-amber-50 border border-amber-200 rounded-xl p-4">
        <AlertTriangle className="w-5 h-5 text-amber-600 mt-0.5 shrink-0" />
        <p className="text-sm text-amber-800">
          <strong>Atenção:</strong> Valores <strong>BRUTOS</strong>. Descontos trabalhistas/fiscais devem ser aplicados conforme legislação.
        </p>
      </div>

      {!usarDinamico && (
        <div className="flex items-start gap-2 bg-blue-50 border border-blue-200 rounded-xl p-3">
          <Info className="w-4 h-4 text-blue-600 mt-0.5 shrink-0" />
          <p className="text-xs text-blue-800">Usando percentuais padrão (20%/40%/24%/14%/2%). Configure setores dinâmicos na aba "Setores".</p>
        </div>
      )}

      {usarDinamico && (
        <div className="flex items-start gap-2 bg-green-50 border border-green-200 rounded-xl p-3">
          <CheckCircle2 className="w-4 h-4 text-green-600 mt-0.5 shrink-0" />
          <p className="text-xs text-green-800">
            Usando <strong>{setoresAtivos.length} setores configurados</strong>: {setoresAtivos.map(s => `${s.nome_do_setor} (${s.percentual}%)`).join(', ')}
          </p>
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Calculator className="w-5 h-5 text-primary" />Dados do Período
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Período — Início *</Label>
              <Input type="date" value={periodoInicio} onChange={e => { setPeriodoInicio(e.target.value); setCalculado(false); }} />
            </div>
            <div className="space-y-1.5">
              <Label>Período — Fim *</Label>
              <Input type="date" value={periodoFim} onChange={e => { setPeriodoFim(e.target.value); setCalculado(false); }} />
            </div>
          </div>
          {periodoInicio && periodoFim && (
            <div className="text-sm text-muted-foreground bg-muted/50 rounded-lg px-3 py-2">
              Mês de referência: <strong>{mesRef}</strong>
            </div>
          )}
          <div className="space-y-1.5">
            <Label>Valor Total das Gorjetas (R$) *</Label>
            <Input type="number" placeholder="0,00" value={valorTotal} onChange={e => { setValorTotal(e.target.value); setCalculado(false); }} />
          </div>
          <div className="space-y-1.5">
            <Label>Observação (opcional)</Label>
            <Input placeholder="Ex.: Semana 1, evento especial..." value={observacao} onChange={e => setObservacao(e.target.value)} />
          </div>
          <Button onClick={handleCalcular}>
            <Calculator className="w-4 h-4 mr-2" />Calcular Divisão
          </Button>
        </CardContent>
      </Card>

      {calculado && (
        <>
          {funcionariosInaptos.length > 0 && (
            <div className="flex items-start gap-3 bg-slate-50 border border-slate-200 rounded-xl p-4">
              <AlertCircle className="w-5 h-5 text-slate-500 shrink-0 mt-0.5" />
              <div className="text-sm text-slate-700">
                <strong>{funcionariosInaptos.length} funcionário(s)</strong> excluídos por período de experiência:{' '}
                {funcionariosInaptos.map(f => f.nome).join(', ')}.
              </div>
            </div>
          )}
          {totalExcluidos > 0 && (
            <div className="flex items-start gap-3 bg-red-50 border border-red-200 rounded-xl p-4">
              <AlertCircle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
              <p className="text-sm text-red-800"><strong>{totalExcluidos} funcionário(s)</strong> não receberão comissão por falta/atestado.</p>
            </div>
          )}
          {Object.values(diasAusentesPorFunc).some(d => parseInt(d) > 0) && (() => {
            const comReducao = Object.entries(diasAusentesPorFunc).filter(([, d]) => parseInt(d) > 0).length;
            return (
              <div className="flex items-start gap-3 bg-amber-50 border border-amber-200 rounded-xl p-4">
                <CalendarMinus className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                <p className="text-sm text-amber-800">
                  <strong>{comReducao} funcionário(s)</strong> terão comissão reduzida proporcionalmente por dias ausentes neste período.
                </p>
              </div>
            );
          })()}
          {outrosFuncs.length > 0 && (
            <div className="flex items-start gap-3 bg-yellow-50 border border-yellow-300 rounded-xl p-4">
              <AlertTriangle className="w-5 h-5 text-yellow-600 shrink-0 mt-0.5" />
              <div className="text-sm text-yellow-800">
                <strong>{outrosFuncs.length} funcionário(s)</strong> estão aptos mas seu setor não está mapeado ({outrosFuncs.map(f => `${f.nome} (${f.setor || 'sem setor'})`).join(', ')}). Eles foram agrupados em <strong>"Outros"</strong> e receberão a parte não distribuída. Configure as palavras-chave dos setores para melhor precisão.
              </div>
            </div>
          )}
          {setoresSemAptosComFuncs.map(([sid, { nome, valorSetor }]) => (
            <div key={sid} className="flex items-start gap-3 bg-orange-50 border border-orange-200 rounded-xl p-4">
              <AlertTriangle className="w-5 h-5 text-orange-600 shrink-0 mt-0.5" />
              <p className="text-sm text-orange-800">Nenhum apto no setor <strong>{nome}</strong>. Valor <strong>{formatCurrency(valorSetor)}</strong> será retido.</p>
            </div>
          ))}

          {/* Divisão por setor */}
          <Card>
            <CardHeader><CardTitle className="text-sm">Divisão por Setor</CardTitle></CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {usarDinamico
                  ? setoresAtivos.map(s => (
                    <div key={s.id} className="rounded-xl p-3 bg-primary/5">
                      <p className="text-xs font-medium text-muted-foreground">{s.nome_do_setor} ({s.percentual}%)</p>
                      <p className="text-lg font-bold mt-0.5 text-primary">{formatCurrency(divisao[s.id]?.valor || 0)}</p>
                    </div>
                  ))
                  : [
                    { key: 'empresa', color: 'bg-slate-100 text-slate-700' },
                    { key: 'salao', color: 'bg-blue-50 text-blue-700' },
                    { key: 'cozinha', color: 'bg-orange-50 text-orange-700' },
                    { key: 'copa_playground_caixa', color: 'bg-purple-50 text-purple-700' },
                    { key: 'limpeza_rh', color: 'bg-green-50 text-green-700' },
                  ].map(({ key, color }) => (
                    <div key={key} className={`rounded-xl p-3 ${color}`}>
                      <p className="text-xs font-medium opacity-70">{SETOR_LABELS[key]}</p>
                      <p className="text-lg font-bold mt-0.5">{formatCurrency(divisao[key] || 0)}</p>
                    </div>
                  ))
                }
              </div>
            </CardContent>
          </Card>

          {/* Por funcionário */}
          {Object.entries(distribuicao).map(([sid, { aptos, excluidos, valorSetor, valorInd, nome }]) => {
            if (aptos.length === 0 && excluidos.length === 0) return null;
            return (
              <Card key={sid}>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex items-center justify-between">
                    <span className="flex items-center gap-2"><Users className="w-4 h-4 text-primary" />{nome}</span>
                    <div className="flex gap-1.5">
                      <Badge variant="outline" className="text-green-700">{aptos.length} aptos</Badge>
                      {excluidos.length > 0 && <Badge variant="outline" className="text-red-700">{excluidos.length} excluídos</Badge>}
                    </div>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div className="flex gap-4 text-xs text-muted-foreground">
                    <span>Setor: <strong>{formatCurrency(valorSetor)}</strong></span>
                    <span>Por funcionário: <strong className="text-green-600">{formatCurrency(valorInd)}</strong></span>
                  </div>
                  {aptos.map(f => {
                    const diasAus = getDiasAusentes(f.id);
                    const { diasTotais, diasTrabalhados, proporcao } = calcularProporcionalidade(periodoInicio, periodoFim, diasAus);
                    const valorFinal = valorInd * proporcao;
                    const temReducao = diasAus > 0;
                    return (
                      <div key={f.id} className="py-2 border-b last:border-0 space-y-1.5">
                        <div className="flex items-center justify-between text-sm">
                          <span className="font-medium">{f.nome}</span>
                          <div className="flex items-center gap-3">
                            {temReducao ? (
                              <div className="text-right">
                                <p className="text-xs text-muted-foreground line-through">{formatCurrency(valorInd)}</p>
                                <p className="font-bold text-amber-600">{formatCurrency(valorFinal)}</p>
                              </div>
                            ) : (
                              <span className="font-bold text-green-600">{formatCurrency(valorFinal)}</span>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <CalendarMinus className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                          <Label className="text-xs text-muted-foreground whitespace-nowrap">Dias ausentes:</Label>
                          <Input
                            type="number" min="0" max={diasTotais}
                            className="h-6 w-16 text-xs px-2"
                            value={diasAusentesPorFunc[f.id] ?? ''}
                            placeholder="0"
                            onChange={e => {
                              const val = parseInt(e.target.value) || 0;
                              const capped = Math.min(val, diasTotais);
                              setDiasAusentesPorFunc(prev => ({ ...prev, [f.id]: capped }));
                            }}
                          />
                          {temReducao && (
                            <span className="text-xs text-amber-700">
                              {diasTrabalhados}/{diasTotais} dias ({(proporcao * 100).toFixed(0)}%)
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                  {excluidos.length > 0 && (
                    <div className="bg-red-50 border border-red-200 rounded-lg p-3 space-y-1 mt-1">
                      <p className="text-xs font-semibold text-red-700 flex items-center gap-1 mb-1.5">
                        <AlertTriangle className="w-3.5 h-3.5" />Excluídos por falta/atestado
                      </p>
                      {excluidos.map(f => (
                        <div key={f.id} className="flex items-center justify-between text-sm">
                          <span className="text-red-800">{f.nome}</span>
                          <span className="text-xs text-red-600">
                            {f.faltas_no_periodo ? `${f.faltas_no_periodo} falta(s)` : ''}
                            {f.faltas_no_periodo && f.atestados_no_periodo ? ' + ' : ''}
                            {f.atestados_no_periodo ? `${f.atestados_no_periodo} atestado(s)` : ''}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}

          <Button 
            onClick={() => {
              try {
                handleConfirmar();
              } catch (e) {
                console.error('[LancarComissao] Erro ao confirmar:', e);
                alert('Erro ao confirmar comissões. Tente novamente.');
              }
            }} 
            disabled={salvando} 
            className="w-full" 
            size="lg"
          >
            <Save className="w-4 h-4 mr-2" />
            {salvando ? 'Salvando...' : 'Confirmar e Gerar Comissões'}
          </Button>
        </>
      )}
    </div>
  );
}
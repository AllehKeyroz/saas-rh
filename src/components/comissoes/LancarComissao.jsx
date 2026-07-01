import React, { useState, useMemo, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { client } from '@/api/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { formatCurrency, getMesReferenciaAtual } from '@/lib/formatters';
import { AlertTriangle, CheckCircle2, Users, Calculator, Save, AlertCircle, CalendarMinus } from 'lucide-react';
import { toast } from 'sonner';
import { mapearSetorDinamico, calcularDivisaoDinamica, calcularDistribuicaoFuncionarios } from '@/lib/comissoes';
import { registrarAuditoria } from '@/lib/audit';
import { Skeleton } from '@/components/ui/skeleton';
import { useRHControl } from '@/lib/rhControl';
import DetalheComissaoTooltip from './DetalheComissaoTooltip';

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
  const [retencao, setRetencao] = useState('0');
  // diasAusentes por funcionário: { [funcId]: número }
  const [diasAusentesPorFunc, setDiasAusentesPorFunc] = useState({});

  const mesRef = getMesFromDatas(periodoInicio);

  const { data: setoresDB = [], isLoading: loadingSetores } = useQuery({
    queryKey: ['setores_comissao'],
    queryFn: () => client.entities.SetoresComissao.list('ordem_exibicao', 50),
  });

  // Carrega retenção padrão da configuração
  const { data: configsRH = [] } = useQuery({
    queryKey: ['config_rh_retencao_lancar'],
    queryFn: () => client.entities.ConfiguracoesRH.list(),
  });

  useEffect(() => {
    const cfg = configsRH.find(c => c.chave === 'comissao_retencao_padrao');
    if (cfg && cfg.valor != null) {
      setRetencao(String(cfg.valor));
    }
  }, [configsRH]);

  // Setores dinâmicos (obrigatórios)
  const setoresAtivos = setoresDB.filter(s => s.ativo !== false);
  const setoresProntos = isAtiva('divisao_automatica_setor') && setoresAtivos.length > 0;
  const somaPercentuais = setoresAtivos.reduce((s, setor) => s + (setor.percentual || 0), 0);
  const setoresValidos = setoresProntos && Math.abs(somaPercentuais - 100) < 0.01;

  const pctRetencao = Math.min(Math.max(parseFloat(retencao) || 0, 0), 100);

  // Divisão de valores por setor (aplicando retenção)
  const divisao = useMemo(() => {
    const v = parseFloat(valorTotal) || 0;
    const vDistribuir = v * (1 - pctRetencao / 100);
    if (!setoresValidos) return {};
    return calcularDivisaoDinamica(vDistribuir, setoresAtivos);
  }, [valorTotal, setoresAtivos, setoresValidos, pctRetencao]);

  const valorRetido = (parseFloat(valorTotal) || 0) * (pctRetencao / 100);

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
    setoresAtivos.forEach(s => { grupos[s.id] = []; });
    grupos['__outros'] = [];
    funcionariosAptos.filter(f => f.ativo !== false).forEach(f => {
      const sid = mapearSetorDinamico(f.setor, setoresAtivos);
      if (sid && grupos[sid]) {
        grupos[sid].push(f);
      } else {
        grupos['__outros'].push(f);
      }
    });
    return grupos;
  }, [funcionariosAptos, setoresAtivos]);

  // Aptos e excluídos por setor (todos são incluídos, redução é calculada proporcionalmente)
  const aptoPorSetor = useMemo(() => {
    const result = {};
    for (const [setor, funcs] of Object.entries(porSetor)) {
      result[setor] = {
        aptos: funcs,
        excluidos: [],
      };
    }
    return result;
  }, [porSetor]);

  // Distribuição final
  const distribuicao = useMemo(() => {
    const result = {};
    let totalComAptos = 0;
    let totalSemAptos = 0;

    for (const [setorId, { aptos, excluidos }] of Object.entries(aptoPorSetor)) {
      let valorSetor, nome;
      if (setorId === '__outros') {
        const totalDistribuido = Object.values(divisao).reduce((s, v) => s + (v?.valor || 0), 0);
        valorSetor = Math.max(0, (parseFloat(valorTotal) || 0) - totalDistribuido);
        nome = 'Outros (setor não mapeado)';
      } else {
        valorSetor = divisao[setorId]?.valor || 0;
        nome = divisao[setorId]?.nome || setorId;
      }
      const semAptos = aptos.length === 0;
      if (setorId !== '__outros') {
        if (semAptos) totalSemAptos += valorSetor;
        else totalComAptos += valorSetor;
      }
      result[setorId] = { aptos, excluidos, valorSetor, valorInd: 0, semAptos, nome };
    }

    // Redistribui valor de setores vazios para quem tem gente
    for (const [setorId, data] of Object.entries(result)) {
      if (setorId === '__outros') continue;
      if (data.semAptos) {
        data.valorSetor = 0;
      } else if (totalComAptos > 0 && totalSemAptos > 0) {
        data.valorSetor += totalSemAptos * (data.valorSetor / totalComAptos);
      }
      data.valorInd = data.aptos.length > 0 ? data.valorSetor / data.aptos.length : 0;
    }

    // __outros: residual
    if (result['__outros']) {
      const totalDistribuido = Object.values(result)
        .filter(v => v !== result['__outros'])
        .reduce((s, v) => s + (v.valorSetor || 0), 0);
      result['__outros'].valorSetor = Math.max(0, (parseFloat(valorTotal) || 0) - totalDistribuido);
      result['__outros'].valorInd = result['__outros'].aptos.length > 0
        ? result['__outros'].valorSetor / result['__outros'].aptos.length : 0;
    }

    return result;
  }, [aptoPorSetor, divisao, valorTotal]);

  const setoresSemAptosComFuncs = Object.entries(distribuicao).filter(([sid, v]) => v.semAptos && (porSetor[sid]?.length || 0) > 0 && sid !== '__outros');
  const outrosFuncs = aptoPorSetor['__outros']?.aptos || [];

  // Preview em tempo real com redistribuição pelas ausências (modelo de bônus para presentes)
  const previewAptos = useMemo(() => {
    const mapa = {};
    for (const [setorId, { aptos, valorSetor }] of Object.entries(distribuicao)) {
      if (aptos.length === 0) continue;
      const resultados = calcularDistribuicaoFuncionarios(
        valorSetor, aptos, diasAusentesPorFunc, periodoInicio, periodoFim
      );
      for (const r of resultados) {
        mapa[r.funcionarioId] = r;
      }
    }
    return mapa;
  }, [distribuicao, diasAusentesPorFunc, periodoInicio, periodoFim]);

  const handleCalcular = () => {
    if (!periodoInicio || !periodoFim) { toast.error('Informe o período'); return; }
    if (!parseFloat(valorTotal)) { toast.error('Informe o valor total'); return; }
    if (new Date(periodoInicio) > new Date(periodoFim)) { toast.error('Data início deve ser anterior ao fim'); return; }
    if (!setoresAtivos.length) { toast.error('Configure os setores na aba "Setores" antes de lançar comissões.'); return; }
    if (!setoresValidos) { toast.error('Os percentuais dos setores não somam 100%. Verifique a aba "Setores".'); return; }
    if (pctRetencao >= 100) { toast.error('Retenção não pode ser 100%. Deixe espaço para distribuir aos funcionários.'); return; }
    setCalculado(true);
  };


  const handleConfirmar = async () => {
    setSalvando(true);
    try {
      const v = parseFloat(valorTotal);
      const comissaoData = {
        periodo_inicio: periodoInicio,
        periodo_fim: periodoFim,
        mes_referencia: mesRef,
        valor_total_periodo: v,
        valor_empresa: valorRetido,
        percentual_retencao: pctRetencao,
        observacao,
        status: 'confirmado',
      };

      const comissao = await client.entities.ComissoesGorjetas.create(comissaoData);

      const registros = [];
      for (const [setorId, { aptos, excluidos, valorSetor, valorInd, nome }] of Object.entries(distribuicao)) {
        const nomeSetor = setorId === '__outros' ? 'Outros' : (divisao[setorId]?.nome || setorId);
        
        // Calcula distribuição usando a nova lógica de bônus para os presentes
        const resultados = calcularDistribuicaoFuncionarios(
          valorSetor, aptos, diasAusentesPorFunc, periodoInicio, periodoFim
        );
        
        for (const r of resultados) {
          registros.push({
            funcionario_id: r.funcionarioId, funcionario_nome: r.funcionarioNome, comissao_id: comissao.id,
            setor: nomeSetor, periodo_inicio: periodoInicio, periodo_fim: periodoFim,
            mes_referencia: mesRef, valor_setor: valorSetor,
            valor_individual: r.valorFinal, // retrocompatibilidade
            valor_individual_cheio: r.valorBase,
            valor_individual_final: r.valorFinal,
            perda_faltas_proprias: r.loss,
            bonus_faltas_terceiros: r.bonus,
            dias_ausentes_no_periodo: r.diasAusentes,
            dias_trabalhados: r.diasTrabalhados,
            dias_totais: r.diasTotais,
            proporcao: r.proporcao,
            apto: true,
          });
        }
      }

      if (registros.length > 0) await client.entities.ComissaoPorFuncionario.bulkCreate(registros);

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

      {setoresAtivos.length > 0 ? (
        <div className="flex items-start gap-2 bg-green-50 border border-green-200 rounded-xl p-3">
          <CheckCircle2 className="w-4 h-4 text-green-600 mt-0.5 shrink-0" />
          <p className="text-xs text-green-800">
            Setores configurados: {setoresAtivos.map(s => `${s.nome_do_setor} (${s.percentual}%)`).join(', ')}
          </p>
        </div>
      ) : (
        <div className="flex items-start gap-2 bg-red-50 border border-red-200 rounded-xl p-3">
          <AlertCircle className="w-4 h-4 text-red-600 mt-0.5 shrink-0" />
          <p className="text-xs text-red-800">Nenhum setor configurado. Acesse a aba <strong>Setores</strong> para criar os setores e definir os percentuais antes de lançar comissões.</p>
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
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Retenção da Empresa (%)</Label>
              <Input type="number" min="0" max="99" placeholder="0" value={retencao} onChange={e => { setRetencao(e.target.value); setCalculado(false); }} className="[appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none" />
              <p className="text-xs text-muted-foreground">Percentual retido pela empresa (ex: 20). Não distribuído.</p>
            </div>
            {pctRetencao > 0 && (
              <div className="space-y-1.5 pt-6">
                <p className="text-sm text-muted-foreground">
                  Valor retido: <strong className="text-amber-700">{formatCurrency(valorRetido)}</strong>
                </p>
                <p className="text-sm text-muted-foreground">
                  A distribuir: <strong className="text-green-700">{formatCurrency((parseFloat(valorTotal) || 0) - valorRetido)}</strong>
                </p>
              </div>
            )}
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
              <p className="text-sm text-orange-800">Nenhum apto no setor <strong>{nome}</strong>. Valor <strong>{formatCurrency(valorSetor)}</strong> foi redistribuído entre os setores com funcionários.</p>
            </div>
          ))}

          {/* Divisão por setor */}
          <Card>
            <CardHeader><CardTitle className="text-sm">Divisão por Setor</CardTitle></CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {pctRetencao > 0 && (
                  <div className="rounded-xl p-3 bg-slate-100 border border-slate-200">
                    <p className="text-xs font-medium text-slate-600">Retido (Empresa) — {pctRetencao}%</p>
                    <p className="text-lg font-bold mt-0.5 text-slate-500">{formatCurrency(valorRetido)}</p>
                  </div>
                )}
                {setoresAtivos.length > 0 ? setoresAtivos.map(s => (
                  <div key={s.id} className="rounded-xl p-3 bg-primary/5">
                    <p className="text-xs font-medium text-muted-foreground">{s.nome_do_setor} ({s.percentual}%)</p>
                    <p className="text-lg font-bold mt-0.5 text-primary">{formatCurrency(divisao[s.id]?.valor || 0)}</p>
                  </div>
                )) : (
                  <div className="col-span-full text-sm text-muted-foreground text-center py-4">Configure os setores na aba "Setores".</div>
                )}
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
                    </div>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div className="flex gap-4 text-xs text-muted-foreground">
                    <span>Setor: <strong>{formatCurrency(valorSetor)}</strong></span>
                    <span>Cota base: <strong className="text-green-600">{formatCurrency(valorInd)}</strong></span>
                  </div>
                  {aptos.map(f => {
                    const preview = previewAptos[f.id];
                    if (!preview) return null;
                    const temReducao = preview.diasAusentes > 0;
                    return (
                      <div key={f.id} className="py-2 border-b last:border-0 space-y-1.5">
                        <div className="flex items-center justify-between text-sm">
                          <span className="font-medium">{f.nome}</span>
                          <div className="flex items-center gap-3">
                            {temReducao ? (
                              <div className="text-right">
                                <p className="text-xs text-muted-foreground line-through">{formatCurrency(preview.valorBase)}</p>
                                <DetalheComissaoTooltip
                                  valorBase={preview.valorBase}
                                  perda={preview.loss}
                                  bonus={preview.bonus}
                                  diasAusentes={preview.diasAusentes}
                                  contribuicoes={preview.contribuicoes}
                                >
                                  <p className="font-bold text-green-600">{formatCurrency(preview.valorFinal)}</p>
                                </DetalheComissaoTooltip>
                              </div>
                            ) : (
                              <DetalheComissaoTooltip
                                valorBase={preview.valorBase}
                                perda={preview.loss}
                                bonus={preview.bonus}
                                diasAusentes={preview.diasAusentes}
                                contribuicoes={preview.contribuicoes}
                              >
                                <span className="font-bold text-green-600">{formatCurrency(preview.valorFinal)}</span>
                              </DetalheComissaoTooltip>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <CalendarMinus className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                          <Label className="text-xs text-muted-foreground whitespace-nowrap">Dias ausentes:</Label>
                          <Input
                            type="number" min="0" max={preview.diasTotais}
                            className="h-6 w-16 text-xs px-2"
                            value={diasAusentesPorFunc[f.id] ?? ''}
                            placeholder="0"
                            onChange={e => {
                              const val = parseInt(e.target.value) || 0;
                              const capped = Math.min(val, preview.diasTotais);
                              setDiasAusentesPorFunc(prev => ({ ...prev, [f.id]: capped }));
                            }}
                          />
                          {temReducao && (
                            <span className="text-xs text-amber-700">
                              {preview.diasTrabalhados}/{preview.diasTotais} dias ({(preview.proporcao * 100).toFixed(0)}%)
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
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
                toast.error('Erro ao confirmar comissões. Tente novamente.');
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
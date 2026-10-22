import React, { useState, useMemo, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { client } from '@/api/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { formatCurrency, formatDate, getMesReferenciaAtual } from '@/lib/formatters';
import { AlertTriangle, CheckCircle2, Users, Calculator, Save, AlertCircle, CalendarMinus, Plus, Trash2, MinusCircle } from 'lucide-react';
import { toast } from 'sonner';
import { mapearSetorDinamico, calcularDivisaoDinamica, calcularDistribuicaoFuncionarios, sobrepoeAfastamento, calcularDiasUniao, calcularDiasTotais, COMISSAO_STATUS, publicarComissao, formatPeriodo } from '@/lib/comissoes';
import { registrarAuditoria } from '@/lib/audit';
import { Skeleton } from '@/components/ui/skeleton';
import { useRHControl } from '@/lib/rhControl';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import DetalheComissaoTooltip from './DetalheComissaoTooltip';

function getMesFromDatas(inicio) {
  if (!inicio) return getMesReferenciaAtual();
  const d = new Date(inicio + 'T00:00:00');
  return `${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
}

// Motivo de exclusão do rateio conforme o tipo de ausência (afastamento e/ou férias)
function motivoAusencia(aus) {
  if (!aus) return 'Afastamento no período';
  const temAfast = (aus.afastamentos || []).length > 0;
  const temFerias = (aus.ferias || []).length > 0;
  if (temAfast && temFerias) return 'Afastamento e férias no período';
  if (temFerias) return 'Férias no período';
  return 'Afastamento no período';
}

// Faltou o período inteiro = inapto (excluído do rateio)
function faltouTodoPeriodo(diasAusentes, diasTotaisPeriodo) {
  return diasTotaisPeriodo > 0 && (parseInt(diasAusentes || 0, 10) >= diasTotaisPeriodo);
}

// Motivo legível da exclusão (afastamento/férias, faltas ou genérico)
function motivoExclusao(aus, faltou) {
  if (aus) return motivoAusencia(aus);
  if (faltou) return 'Faltou todo o período';
  return 'Excluído';
}

export default function LancarComissao({ funcionarios, onSaved, comissaoEmEdicao, onCancelarEdicao, creditosIniciais = [] }) {
  const { isAtiva } = useRHControl();
  const inputsRascunho = comissaoEmEdicao?.rascunho?.inputs || null;
  const [periodoInicio, setPeriodoInicio] = useState(inputsRascunho?.periodo_inicio || comissaoEmEdicao?.periodo_inicio || '');
  const [periodoFim, setPeriodoFim] = useState(inputsRascunho?.periodo_fim || comissaoEmEdicao?.periodo_fim || '');
  const [valorTotal, setValorTotal] = useState(
    inputsRascunho
      ? String(inputsRascunho.valor_total ?? '')
      : (comissaoEmEdicao?.valor_total_periodo != null ? String(comissaoEmEdicao.valor_total_periodo) : '')
  );
  const [observacao, setObservacao] = useState(inputsRascunho?.observacao ?? comissaoEmEdicao?.observacao ?? '');
  const [calculado, setCalculado] = useState(!!inputsRascunho);
  const [salvando, setSalvando] = useState(false);
  const [retencao, setRetencao] = useState(
    inputsRascunho
      ? String(inputsRascunho.percentual_retencao ?? 0)
      : String(comissaoEmEdicao?.percentual_retencao ?? 0)
  );
  // diasAusentes por funcionário: { [funcId]: número }
  const [diasAusentesPorFunc, setDiasAusentesPorFunc] = useState(inputsRascunho?.dias_ausentes || {});
  // decisão de rateio por funcionário ausente no período (afastamento ou férias): { [funcId]: 'recebe' | 'nao_recebe' }
  const [decisoesAusencia, setDecisoesAusencia] = useState(inputsRascunho?.decisoes || {});
  // créditos de setor marcados para usar neste lançamento (ids)
  const [creditosSelecionados, setCreditosSelecionados] = useState(inputsRascunho?.creditos_selecionados ?? creditosIniciais);
  // débitos do período: [{ setor_id, setor_nome, valor, observacao }]
  const [debitos, setDebitos] = useState(inputsRascunho?.debitos || []);

  const mesRef = getMesFromDatas(periodoInicio);

  const { data: setoresDB = [], isLoading: loadingSetores } = useQuery({
    queryKey: ['setores_comissao'],
    queryFn: () => client.entities.SetoresComissao.list('ordem_exibicao', 50),
  });

  const { data: afastamentos = [] } = useQuery({
    queryKey: ['afastamentos_comissao'],
    queryFn: () => client.entities.Afastamento.list(),
  });

  // Férias também contam como ausência no período da comissão (mesmo tratamento do afastamento)
  const { data: ferias = [] } = useQuery({
    queryKey: ['ferias_comissao'],
    queryFn: () => client.entities.Ferias.list(),
  });

  // Créditos de setor disponíveis (gerados por setores que ficaram sem aptos)
  const { data: creditosDisponiveis = [] } = useQuery({
    queryKey: ['creditos_comissao_setor'],
    queryFn: () => client.entities.CreditoComissaoSetor.filter({ status: 'disponivel' }),
  });

  // Carrega retenção padrão da configuração
  const { data: configsRH = [] } = useQuery({
    queryKey: ['config_rh_retencao_lancar'],
    queryFn: () => client.entities.ConfiguracoesRH.list(),
  });

  useEffect(() => {
    // Ao editar um rascunho, preserva o percentual salvo (não sobrescreve com o padrão)
    if (comissaoEmEdicao) return;
    const cfg = configsRH.find(c => c.chave === 'comissao_retencao_padrao');
    if (cfg && cfg.valor != null) {
      setRetencao(String(cfg.valor));
    }
  }, [configsRH, comissaoEmEdicao]);

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
  // Valor efetivamente a distribuir aos funcionários (após a retenção da empresa)
  const vDistribuir = (parseFloat(valorTotal) || 0) - valorRetido;

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

  // Distribuição base por setor. IMPORTANTE: setor sem aptos NÃO redistribui o
  // valor para os outros setores (race condition — as ausências dos outros setores
  // podem ainda não ter sido lançadas). O valor vira crédito do próprio setor.
  const distribuicao = useMemo(() => {
    const result = {};

    for (const [setorId, { aptos, excluidos }] of Object.entries(aptoPorSetor)) {
      let valorSetor, nome;
      if (setorId === '__outros') {
        const totalBase = Object.values(divisao).reduce((s, v) => s + (v?.valor || 0), 0);
        valorSetor = Math.max(0, vDistribuir - totalBase);
        nome = 'Outros (setor não mapeado)';
      } else {
        valorSetor = divisao[setorId]?.valor || 0;
        nome = divisao[setorId]?.nome || setorId;
      }
      const semAptos = aptos.length === 0;
      result[setorId] = {
        aptos,
        excluidos,
        semAptos,
        nome,
        valorSetor: semAptos ? 0 : valorSetor,
        valorCreditoGerado: semAptos ? valorSetor : 0,
        valorInd: 0,
      };
    }

    for (const data of Object.values(result)) {
      data.valorInd = data.aptos.length > 0 ? data.valorSetor / data.aptos.length : 0;
    }

    return result;
  }, [aptoPorSetor, divisao, vDistribuir]);

  const outrosFuncs = aptoPorSetor['__outros']?.aptos || [];

  // Funcionários aptos com ausência no período da comissão (afastamento OU férias)
  const ausenciasNoPeriodo = useMemo(() => {
    if (!calculado || !periodoInicio || !periodoFim) return {};
    const mapa = {};
    for (const [sid, { aptos }] of Object.entries(distribuicao)) {
      for (const f of aptos) {
        const afs = (afastamentos || []).filter(a => a.funcionario_id === f.id && sobrepoeAfastamento(a, periodoInicio, periodoFim));
        const fer = (ferias || []).filter(x => x.funcionario_id === f.id && x.cancelada !== true && sobrepoeAfastamento(x, periodoInicio, periodoFim));
        if (afs.length === 0 && fer.length === 0) continue;
        const totalDias = calcularDiasUniao([...afs, ...fer], periodoInicio, periodoFim);
        mapa[f.id] = {
          funcionario: f,
          afastamentos: afs,
          ferias: fer,
          totalDias,
        };
      }
    }
    return mapa;
  }, [calculado, periodoInicio, periodoFim, distribuicao, afastamentos, ferias]);

  const diasTotaisPeriodo = useMemo(
    () => (periodoInicio && periodoFim ? calcularDiasTotais(periodoInicio, periodoFim) : 0),
    [periodoInicio, periodoFim]
  );

  // Distribuição efetiva: exclui quem "não recebe" o rateio por ausência (afastamento/férias)
  // e quem faltou o período inteiro (inapto automático). Setor que fica sem aptos não
  // redistribui: o valor vira crédito do setor.
  const distribuicaoEfetiva = useMemo(() => {
    const result = {};

    for (const [setorId, data] of Object.entries(distribuicao)) {
      // Afastamento/férias: só recebe se marcado explicitamente como "recebe".
      // Faltas = período inteiro: inapto (excluído automaticamente).
      const aptosEfetivos = data.aptos.filter(f => {
        const aus = ausenciasNoPeriodo[f.id];
        if (aus) return decisoesAusencia[f.id] === 'recebe';
        if (faltouTodoPeriodo(diasAusentesPorFunc[f.id], diasTotaisPeriodo)) return false;
        return true;
      });
      const excluidos = [
        ...(data.excluidos || []),
        ...data.aptos.filter(f => ausenciasNoPeriodo[f.id] && decisoesAusencia[f.id] !== 'recebe'),
        ...data.aptos.filter(f => !ausenciasNoPeriodo[f.id] && faltouTodoPeriodo(diasAusentesPorFunc[f.id], diasTotaisPeriodo)),
      ];
      const semAptos = aptosEfetivos.length === 0;
      const valorCreditoGerado = semAptos ? (data.valorCreditoGerado || data.valorSetor) : 0;
      result[setorId] = {
        ...data,
        aptos: aptosEfetivos,
        excluidos,
        semAptos,
        valorSetor: semAptos ? 0 : data.valorSetor,
        valorCreditoGerado,
        valorInd: aptosEfetivos.length > 0
          ? (semAptos ? 0 : data.valorSetor) / aptosEfetivos.length
          : 0,
      };
    }

    return result;
  }, [distribuicao, ausenciasNoPeriodo, decisoesAusencia, diasAusentesPorFunc, diasTotaisPeriodo]);

  // Créditos disponíveis agrupados por setor (somente os marcados)
  const creditosPorSetor = useMemo(() => {
    const mapa = {};
    for (const c of creditosDisponiveis) {
      if (!creditosSelecionados.includes(c.id) || !c.setor_id) continue;
      if (!mapa[c.setor_id]) mapa[c.setor_id] = { valor: 0, ids: [] };
      mapa[c.setor_id].valor += c.valor || 0;
      mapa[c.setor_id].ids.push(c.id);
    }
    return mapa;
  }, [creditosDisponiveis, creditosSelecionados]);

  const totalCreditosSelecionados = Object.values(creditosPorSetor).reduce((s, g) => s + g.valor, 0);

  // Aplica os créditos apenas nos setores que têm aptos efetivos
  const distribuicaoComCreditos = useMemo(() => {
    const out = {};
    for (const [setorId, data] of Object.entries(distribuicaoEfetiva)) {
      const temAptos = (data.aptos?.length || 0) > 0;
      const credito = setorId !== '__outros' && temAptos ? (creditosPorSetor[setorId]?.valor || 0) : 0;
      const valorSetor = (data.valorSetor || 0) + credito;
      out[setorId] = {
        ...data,
        valorSetor,
        valorCreditosUsados: credito,
        valorInd: temAptos ? valorSetor / data.aptos.length : 0,
      };
    }
    return out;
  }, [distribuicaoEfetiva, creditosPorSetor]);

  // Débitos do período agrupados por setor (soma)
  const debitosPorSetor = useMemo(() => {
    const mapa = {};
    for (const d of debitos) {
      if (!d.setor_id) continue;
      const v = parseFloat(d.valor) || 0;
      if (v <= 0) continue;
      if (!mapa[d.setor_id]) mapa[d.setor_id] = 0;
      mapa[d.setor_id] += v;
    }
    return mapa;
  }, [debitos]);

  const totalDebitos = useMemo(
    () => debitos.reduce((s, d) => s + (parseFloat(d.valor) || 0), 0),
    [debitos]
  );

  // Distribuição final: o débito é descontado igualmente apenas dos aptos presentes
  // (sem faltas). Quem teve falta no período não paga o débito.
  const distribuicaoFinal = useMemo(() => {
    const out = {};
    for (const [setorId, data] of Object.entries(distribuicaoComCreditos)) {
      const debito = debitosPorSetor[setorId] || 0;
      const presentes = (data.aptos || []).filter(f => !parseInt(diasAusentesPorFunc[f.id] || 0, 10)).length;
      out[setorId] = {
        ...data,
        valorDebito: debito,
        debitShare: presentes > 0 ? debito / presentes : 0,
      };
    }
    return out;
  }, [distribuicaoComCreditos, debitosPorSetor, diasAusentesPorFunc]);

  // Créditos que serão gerados ao publicar (setores sem aptos efetivos)
  const creditosGerados = useMemo(
    () => Object.entries(distribuicaoEfetiva)
      .filter(([setorId, data]) => setorId !== '__outros' && data.semAptos && (data.valorCreditoGerado || 0) > 0)
      .map(([setorId, data]) => ({ setor_id: setorId, setor_nome: data.nome, valor: data.valorCreditoGerado })),
    [distribuicaoEfetiva]
  );

  // Créditos efetivamente aplicados (somente setores com aptos) — consumidos ao publicar
  const creditosAplicados = useMemo(() => {
    const aplicados = [];
    for (const [setorId, data] of Object.entries(distribuicaoEfetiva)) {
      if (setorId === '__outros' || (data.aptos?.length || 0) === 0) continue;
      const grupo = creditosPorSetor[setorId];
      if (!grupo) continue;
      for (const c of creditosDisponiveis) {
        if (grupo.ids.includes(c.id)) {
          aplicados.push({ id: c.id, setor_id: setorId, setor_nome: c.setor_nome, valor: c.valor });
        }
      }
    }
    return aplicados;
  }, [distribuicaoEfetiva, creditosPorSetor, creditosDisponiveis]);

  // Avisos congelados no rascunho para a conferência antes de publicar
  const avisosRascunho = useMemo(() => ({
    setores_sem_aptos: Object.entries(distribuicaoEfetiva)
      .filter(([setorId, data]) => setorId !== '__outros' && data.semAptos && (data.valorCreditoGerado || 0) > 0)
      .map(([, data]) => ({ setor: data.nome, valor: data.valorCreditoGerado })),
    outros: outrosFuncs.map(f => ({ nome: f.nome, setor: f.setor || '' })),
    ausentes: Object.values(ausenciasNoPeriodo).map(a => ({
      nome: a.funcionario.nome,
      dias: a.totalDias,
      recebe: decisoesAusencia[a.funcionario.id] === 'recebe',
    })),
  }), [distribuicaoEfetiva, outrosFuncs, ausenciasNoPeriodo, decisoesAusencia]);

  // Preview em tempo real usa a distribuição final (com créditos e débitos aplicados)
  const previewAptos = useMemo(() => {
    const mapa = {};
    for (const [setorId, { aptos, valorSetor, debitShare }] of Object.entries(distribuicaoFinal)) {
      if (aptos.length === 0) continue;
      const resultados = calcularDistribuicaoFuncionarios(
        valorSetor, aptos, diasAusentesPorFunc, periodoInicio, periodoFim
      );
      for (const r of resultados) {
        const ehPresente = !parseInt(diasAusentesPorFunc[r.funcionarioId] || 0, 10);
        const shareDebito = ehPresente ? (debitShare || 0) : 0;
        mapa[r.funcionarioId] = {
          ...r,
          debitoShare: shareDebito,
          valorFinal: Math.max(0, r.valorFinal - shareDebito),
        };
      }
    }
    return mapa;
  }, [distribuicaoFinal, diasAusentesPorFunc, periodoInicio, periodoFim]);

  const handleCalcular = () => {
    if (!periodoInicio || !periodoFim) { toast.error('Informe o período'); return; }
    if (!parseFloat(valorTotal)) { toast.error('Informe o valor total'); return; }
    if (new Date(periodoInicio) > new Date(periodoFim)) { toast.error('Data início deve ser anterior ao fim'); return; }
    if (!setoresAtivos.length) { toast.error('Configure os setores na aba "Setores" antes de lançar comissões.'); return; }
    if (!setoresValidos) { toast.error('Os percentuais dos setores não somam 100%. Verifique a aba "Setores".'); return; }
    if (pctRetencao >= 100) { toast.error('Retenção não pode ser 100%. Deixe espaço para distribuir aos funcionários.'); return; }
    setCalculado(true);
    setDecisoesAusencia({});
  };


  const construirRegistros = () => {
    const registros = [];
    for (const [setorId, { aptos, excluidos, valorSetor, debitShare }] of Object.entries(distribuicaoFinal)) {
        const nomeSetor = setorId === '__outros' ? 'Outros' : (divisao[setorId]?.nome || setorId);
        
        // Calcula distribuição usando a nova lógica de bônus para os presentes
        const resultados = calcularDistribuicaoFuncionarios(
          valorSetor, aptos, diasAusentesPorFunc, periodoInicio, periodoFim
        );
        
        for (const r of resultados) {
          const ehPresente = !parseInt(diasAusentesPorFunc[r.funcionarioId] || 0, 10);
          const shareDebito = ehPresente ? (debitShare || 0) : 0;
          registros.push({
            funcionario_id: r.funcionarioId, funcionario_nome: r.funcionarioNome,
            setor: nomeSetor, periodo_inicio: periodoInicio, periodo_fim: periodoFim,
            mes_referencia: mesRef, valor_setor: valorSetor,
            valor_individual: r.valorFinal, // retrocompatibilidade
            valor_individual_cheio: r.valorBase,
            valor_individual_final: Math.max(0, r.valorFinal - shareDebito),
            debito_comissao: shareDebito,
            perda_faltas_proprias: r.loss,
            bonus_faltas_terceiros: r.bonus,
            dias_ausentes_no_periodo: r.diasAusentes,
            dias_trabalhados: r.diasTrabalhados,
            dias_totais: r.diasTotais,
            proporcao: r.proporcao,
            apto: true,
          });
        }

        // Registra excluídos (afastamento/férias ou faltou o período inteiro)
        for (const f of excluidos) {
          const aus = ausenciasNoPeriodo[f.id];
          const faltou = faltouTodoPeriodo(diasAusentesPorFunc[f.id], diasTotaisPeriodo);
          registros.push({
            funcionario_id: f.id, funcionario_nome: f.nome,
            setor: nomeSetor, periodo_inicio: periodoInicio, periodo_fim: periodoFim,
            mes_referencia: mesRef, valor_setor: valorSetor,
            valor_individual: 0,
            valor_individual_cheio: 0,
            valor_individual_final: 0,
            perda_faltas_proprias: 0,
            bonus_faltas_terceiros: 0,
            dias_ausentes_no_periodo: aus?.totalDias || (faltou ? parseInt(diasAusentesPorFunc[f.id] || 0, 10) : 0),
            dias_trabalhados: 0,
            dias_totais: 0,
            proporcao: 0,
            apto: false,
            motivo_exclusao: motivoExclusao(aus, faltou),
          });
        }
    }
    return registros;
  };

  const handleSalvar = async (status) => {
    setSalvando(true);
    try {
      const v = parseFloat(valorTotal);
      const registros = construirRegistros();
      const payload = {
        periodo_inicio: periodoInicio,
        periodo_fim: periodoFim,
        mes_referencia: mesRef,
        valor_total_periodo: v,
        valor_empresa: valorRetido,
        percentual_retencao: pctRetencao,
        total_debitos: totalDebitos,
        debitos,
        observacao,
        status: COMISSAO_STATUS.PENDENTE,
        rascunho: {
          calculado_em: new Date().toISOString(),
          inputs: {
            periodo_inicio: periodoInicio,
            periodo_fim: periodoFim,
            valor_total: v,
            percentual_retencao: pctRetencao,
            observacao,
            dias_ausentes: diasAusentesPorFunc,
            decisoes: decisoesAusencia,
            creditos_selecionados: creditosSelecionados,
            debitos,
            setores: setoresAtivos.map(s => ({ id: s.id, nome: s.nome_do_setor, percentual: s.percentual })),
          },
          registros,
          creditos_gerados: creditosGerados,
          creditos_usados: creditosAplicados,
          debitos,
          avisos: avisosRascunho,
        },
      };

      let comissao;
      if (comissaoEmEdicao?.id) {
        comissao = await client.entities.ComissoesGorjetas.update(comissaoEmEdicao.id, payload);
      } else {
        comissao = await client.entities.ComissoesGorjetas.create(payload);
      }

      // A partir daqui o rascunho já está salvo. Se a publicação falhar, o lançamento
      // permanece pendente e o usuário é levado para a aba Pendentes (sem duplicar).
      let publicado = false;
      if (status === COMISSAO_STATUS.CONFIRMADO) {
        try {
          await publicarComissao(comissao);
          publicado = true;
        } catch (e) {
          toast.error(`Rascunho salvo, mas não foi possível publicar: ${e?.message || e}. Publique na aba Pendentes.`);
        }
      } else {
        await registrarAuditoria({
          acao: comissaoEmEdicao?.id ? 'editar' : 'criar',
          modulo: 'comissao',
          descricao: `Comissão salva como pendente: ${periodoInicio} a ${periodoFim} — ${formatCurrency(v)}`,
          dados_novos: { valor_total: v, periodo: `${periodoInicio} a ${periodoFim}`, status: COMISSAO_STATUS.PENDENTE },
        });
        toast.success('Comissão salva como pendente. Confira e publique na aba Pendentes.');
      }

      if (publicado) toast.success('Comissão publicada com sucesso!');

      setPeriodoInicio(''); setPeriodoFim(''); setValorTotal(''); setObservacao(''); setCalculado(false); setDiasAusentesPorFunc({}); setDecisoesAusencia({}); setCreditosSelecionados([]); setDebitos([]);
      onSaved?.(publicado ? COMISSAO_STATUS.CONFIRMADO : COMISSAO_STATUS.PENDENTE);
    } catch (e) {
      toast.error(`Erro ao salvar: ${e?.message || e}`);
    } finally {
      setSalvando(false);
    }
  };

  const adicionarDebito = () => {
    setDebitos(prev => [...prev, { setor_id: '', setor_nome: '', valor: '', observacao: '' }]);
  };
  const atualizarDebito = (index, patch) => {
    setDebitos(prev => prev.map((d, i) => (i === index ? { ...d, ...patch } : d)));
  };
  const removerDebito = (index) => {
    setDebitos(prev => prev.filter((_, i) => i !== index));
  };

  if (loadingSetores) return <Skeleton className="h-48" />;

  return (
    <div className="space-y-5">
      {comissaoEmEdicao && (
        <div className="flex flex-col sm:flex-row sm:items-center gap-3 bg-blue-50 border border-blue-200 rounded-xl p-4">
          <AlertCircle className="w-5 h-5 text-blue-600 shrink-0" />
          <div className="text-sm text-blue-900 flex-1">
            <strong>Editando rascunho</strong> de {formatPeriodo(periodoInicio, periodoFim)} ({mesRef}).
            Ao salvar, a comissão é reprocessada por inteiro — não há edição individual.
          </div>
          <Button variant="outline" size="sm" onClick={onCancelarEdicao}>Cancelar edição</Button>
        </div>
      )}
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
                  A distribuir: <strong className="text-green-700">{formatCurrency(vDistribuir + totalCreditosSelecionados - totalDebitos)}</strong>
                  {totalCreditosSelecionados > 0 && (
                    <span className="text-xs text-emerald-700"> (inclui {formatCurrency(totalCreditosSelecionados)} de crédito)</span>
                  )}
                  {totalDebitos > 0 && (
                    <span className="text-xs text-red-700"> (menos {formatCurrency(totalDebitos)} de débitos)</span>
                  )}
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
          {avisosRascunho.setores_sem_aptos.map((aviso) => (
            <div key={aviso.setor} className="flex items-start gap-3 bg-orange-50 border border-orange-200 rounded-xl p-4">
              <AlertTriangle className="w-5 h-5 text-orange-600 shrink-0 mt-0.5" />
              <p className="text-sm text-orange-800">Nenhum apto no setor <strong>{aviso.setor}</strong>. O valor de <strong>{formatCurrency(aviso.valor)}</strong> vira <strong>crédito do setor</strong> para um próximo lançamento.</p>
            </div>
          ))}

          {/* Questionamento de ausência no período (afastamento ou férias) */}
          {Object.keys(ausenciasNoPeriodo).length > 0 && (
            <div className="flex items-start gap-3 bg-purple-50 border border-purple-200 rounded-xl p-4">
              <AlertCircle className="w-5 h-5 text-purple-600 shrink-0 mt-0.5" />
              <div className="w-full text-sm text-purple-900">
                <p className="font-semibold mb-2">
                  {Object.keys(ausenciasNoPeriodo).length} funcionário(s) ausente(s) no período da comissão (afastamento ou férias)
                </p>
                <div className="space-y-2">
                  {Object.values(ausenciasNoPeriodo).map(({ funcionario, afastamentos: afs, ferias: fer, totalDias }) => {
                    const decisao = decisoesAusencia[funcionario.id] || 'nao_recebe';
                    const motivos = [
                      ...afs.map(a => `afastado de ${a.data_inicio ? formatDate(a.data_inicio) : '—'} a ${a.data_fim ? formatDate(a.data_fim) : 'em aberto'}`),
                      ...fer.map(x => `férias de ${formatDate(x.data_inicio)} a ${formatDate(x.data_fim)}`),
                    ];
                    return (
                      <div key={funcionario.id} className="bg-white/60 rounded-lg px-3 py-2">
                        <div className="flex flex-col sm:flex-row sm:items-center gap-2 justify-between">
                          <div className="min-w-0">
                            <p className="font-medium text-sm">{funcionario.nome}</p>
                            <p className="text-xs text-muted-foreground">
                              {motivos.join('; ')}
                              {' · '}{totalDias} dia(s) no período
                            </p>
                          </div>
                          <RadioGroup
                            value={decisao}
                            onValueChange={v => {
                              setDecisoesAusencia(prev => ({ ...prev, [funcionario.id]: v }));
                              if (v === 'recebe') {
                                // Pré-preenche os dias ausentes com os dias de ausência sobrepostos
                                setDiasAusentesPorFunc(prev => ({ ...prev, [funcionario.id]: totalDias }));
                              }
                            }}
                            className="flex gap-4"
                          >
                            <label className="flex items-center gap-1.5 text-xs font-medium">
                              <RadioGroupItem value="nao_recebe" className="h-3.5 w-3.5" />
                              Não recebe
                            </label>
                            <label className="flex items-center gap-1.5 text-xs font-medium">
                              <RadioGroupItem value="recebe" className="h-3.5 w-3.5" />
                              Recebe
                            </label>
                          </RadioGroup>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

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
                {totalCreditosSelecionados > 0 && (
                  <div className="rounded-xl p-3 bg-emerald-50 border border-emerald-200">
                    <p className="text-xs font-medium text-emerald-700">Créditos usados</p>
                    <p className="text-lg font-bold mt-0.5 text-emerald-700">{formatCurrency(totalCreditosSelecionados)}</p>
                  </div>
                )}
                {totalDebitos > 0 && (
                  <div className="rounded-xl p-3 bg-red-50 border border-red-200">
                    <p className="text-xs font-medium text-red-700">Débitos</p>
                    <p className="text-lg font-bold mt-0.5 text-red-700">{formatCurrency(totalDebitos)}</p>
                  </div>
                )}
                {setoresAtivos.length > 0 ? setoresAtivos.map(s => {
                  const d = distribuicaoFinal[s.id];
                  const valor = d?.valorSetor || 0;
                  const creditoGerado = d?.valorCreditoGerado || 0;
                  return (
                    <div key={s.id} className="rounded-xl p-3 bg-primary/5">
                      <p className="text-xs font-medium text-muted-foreground">{s.nome_do_setor} ({s.percentual}%)</p>
                      <p className="text-lg font-bold mt-0.5 text-primary">{formatCurrency(valor)}</p>
                      {creditoGerado > 0 && <p className="text-xs text-amber-700 mt-0.5">+ {formatCurrency(creditoGerado)} → crédito</p>}
                      {d?.valorCreditosUsados > 0 && <p className="text-xs text-emerald-700 mt-0.5">inclui {formatCurrency(d.valorCreditosUsados)} de crédito</p>}
                      {d?.valorDebito > 0 && <p className="text-xs text-red-700 mt-0.5">− {formatCurrency(d.valorDebito)} débito</p>}
                    </div>
                  );
                }) : (
                  <div className="col-span-full text-sm text-muted-foreground text-center py-4">Configure os setores na aba "Setores".</div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Débitos do período */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <MinusCircle className="w-4 h-4 text-red-600" />
                Débitos do período (opcional)
              </CardTitle>
              <Button size="sm" variant="outline" onClick={adicionarDebito}>
                <Plus className="w-3.5 h-3.5 mr-1" />Adicionar débito
              </Button>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-xs text-muted-foreground">
                Valor descontado do setor, dividido igualmente entre os aptos. Ex.: pratos quebrados, mesa não cobrada, extra de garçom.
              </p>
              {debitos.length === 0 ? (
                <p className="text-xs text-muted-foreground text-center py-2">Nenhum débito.</p>
              ) : (
                debitos.map((d, i) => (
                  <div key={i} className="grid grid-cols-1 sm:grid-cols-[1fr_120px_1fr_auto] gap-2 items-end">
                    <div className="space-y-1.5">
                      <Label className="text-xs">Setor</Label>
                      <Select
                        value={d.setor_id || ''}
                        onValueChange={(v) => atualizarDebito(i, { setor_id: v, setor_nome: setoresAtivos.find(s => s.id === v)?.nome_do_setor || '' })}
                      >
                        <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Selecione o setor" /></SelectTrigger>
                        <SelectContent>
                          {setoresAtivos.map(s => <SelectItem key={s.id} value={s.id}>{s.nome_do_setor}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs">Valor (R$)</Label>
                      <Input type="number" min="0" step="0.01" placeholder="0,00" className="h-8 text-xs" value={d.valor} onChange={e => atualizarDebito(i, { valor: e.target.value })} />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs">Observação</Label>
                      <Input placeholder="Ex.: pratos quebrados" className="h-8 text-xs" value={d.observacao} onChange={e => atualizarDebito(i, { observacao: e.target.value })} />
                    </div>
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-red-600" onClick={() => removerDebito(i)}>
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                ))
              )}
            </CardContent>
          </Card>

          {/* Por funcionário */}
          {Object.entries(distribuicaoFinal).map(([sid, { aptos, excluidos, valorSetor, nome, valorCreditosUsados, valorCreditoGerado, valorDebito }]) => {
            if (aptos.length === 0 && excluidos.length === 0) return null;
            return (
              <Card key={sid}>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex items-center justify-between">
                    <span className="flex items-center gap-2"><Users className="w-4 h-4 text-primary" />{nome}</span>
                    <div className="flex gap-1.5">
                      <Badge variant="outline" className="text-green-700">{aptos.length} aptos</Badge>
                      {excluidos.length > 0 && (
                        <Badge variant="outline" className="text-red-700">{excluidos.length} excluídos</Badge>
                      )}
                    </div>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div className="flex flex-wrap gap-4 text-xs text-muted-foreground">
                    <span>Setor: <strong>{formatCurrency(valorSetor)}</strong></span>
                    {aptos.length > 0 && <span>Cota base: <strong className="text-green-600">{formatCurrency(valorSetor / aptos.length)}</strong></span>}
                    {valorCreditosUsados > 0 && <span className="text-emerald-700">inclui <strong>{formatCurrency(valorCreditosUsados)}</strong> de crédito</span>}
                    {valorCreditoGerado > 0 && <span className="text-amber-700"><strong>{formatCurrency(valorCreditoGerado)}</strong> → crédito do setor</span>}
                    {valorDebito > 0 && <span className="text-red-700">débito <strong>{formatCurrency(valorDebito)}</strong> (dividido entre quem não teve falta)</span>}
                  </div>
                  {excluidos.length > 0 && (
                    <div className="bg-red-50 border border-red-100 rounded-lg p-2 space-y-1">
                      {excluidos.map(f => (
                        <div key={f.id} className="flex items-center justify-between text-xs">
                          <span className="text-red-800 font-medium">{f.nome}</span>
                          <span className="text-red-600">Excluído — {motivoExclusao(ausenciasNoPeriodo[f.id], faltouTodoPeriodo(diasAusentesPorFunc[f.id], diasTotaisPeriodo))}</span>
                        </div>
                      ))}
                    </div>
                  )}
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
                        {preview.debitoShare > 0 && (
                          <div className="flex items-center gap-1 text-xs text-red-700">
                            <MinusCircle className="w-3 h-3 shrink-0" />
                            Débito descontado: − {formatCurrency(preview.debitoShare)}
                          </div>
                        )}
                        <div className="flex items-center gap-2">
                          <CalendarMinus className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                          <Label className="text-xs text-muted-foreground whitespace-nowrap" title="Se igualar ao total de dias do período, o funcionário é excluído do rateio (vira crédito do setor se ficar vazio)">Dias ausentes:</Label>
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

          <div className="flex flex-col sm:flex-row gap-3">
            <Button
              variant="outline"
              onClick={() => handleSalvar(COMISSAO_STATUS.CONFIRMADO)}
              disabled={salvando}
              size="lg"
            >
              <CheckCircle2 className="w-4 h-4 mr-2" />
              Publicar agora
            </Button>
            <Button
              onClick={() => handleSalvar(COMISSAO_STATUS.PENDENTE)}
              disabled={salvando}
              className="flex-1"
              size="lg"
            >
              <Save className="w-4 h-4 mr-2" />
              {salvando ? 'Salvando...' : (comissaoEmEdicao ? 'Salvar alterações (pendente)' : 'Salvar como pendente')}
            </Button>
          </div>
        </>
      )}
    </div>
  );
}
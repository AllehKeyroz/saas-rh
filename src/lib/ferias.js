// Regras CLT centralizadas de férias — fonte única de verdade.
// Evita duplicação de lógica entre FeriasBancoHorasTab, DashboardRH, calendário e portal.
//
// Regras embutidas:
// - Período aquisitivo: 12 meses de trabalho (art. 130)
// - Prazo concessivo: 12 meses após o fim do período aquisitivo (art. 134).
//   Férias não concedidas dentro do prazo pagam em dobro (art. 137).
// - Fracionamento: até 3 períodos, um com >= 14 dias, demais >= 5 (art. 134 §1º)
// - Abono pecuniário: até 1/3 dos dias, máximo 10 (art. 143)
// - Redução por faltas injustificadas (art. 130): ADIADA — não há dados de
//   faltas por período aquisitivo no sistema (pendência conhecida).
import { addDays, addMonths, differenceInCalendarDays, startOfDay } from 'date-fns';

const MESES_AQUISITIVO = 12;
const MESES_CONCESSIVO = 12; // canônico (art. 134). ATENÇÃO: não usar 11.
const DIAS_URGENTE = 60; // heurística de aviso, não prazo legal
const DIAS_ATENCAO = 120; // heurística de aviso, não prazo legal
export const DIAS_FERIAS_PADRAO = 30;
export const ABONO_MAXIMO_LEGAL = 10;

export const FERIAS_STATUS = {
  PROGRAMADA: 'programada',
  EM_ANDAMENTO: 'em_andamento',
  CONCLUIDA: 'concluida',
  CANCELADA: 'cancelada',
};

export const FERIAS_ORIGEM = {
  SOLICITACAO: 'solicitacao',
  MANUAL: 'manual',
  ESCALA: 'escala',
};

/** Converte "YYYY-MM-DD" em Date local ao meio-dia (evita deslocamento de timezone). */
export function parseDataLocal(str) {
  if (!str) return new Date(NaN);
  const parts = str.split('T')[0].split('-');
  if (parts.length === 3) {
    const [y, m, d] = parts.map(Number);
    if (!isNaN(y) && !isNaN(m) && !isNaN(d)) return new Date(y, m - 1, d, 12, 0, 0);
  }
  return new Date(str);
}

function toISODate(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${dd}`;
}

export function getHojeISO() {
  return toISODate(new Date());
}

/**
 * Lista os períodos aquisitivos já completados até hoje (12 meses trabalhados).
 * @param {string} dataAdmissao "YYYY-MM-DD"
 * @returns {Array<{numero, inicio, fim, prazoLimite}>}
 */
export function calcularPeriodosAquisitivos(dataAdmissao, hoje = new Date()) {
  if (!dataAdmissao) return [];
  const admissao = parseDataLocal(dataAdmissao);
  if (isNaN(admissao.getTime())) return [];
  const periodos = [];
  let p = 1;
  for (;;) {
    const inicio = addMonths(admissao, (p - 1) * MESES_AQUISITIVO);
    const aniversario = addMonths(admissao, p * MESES_AQUISITIVO); // fim do aquisitivo
    // Direito a férias só nasce após 12 meses completos (art. 130 CLT):
    // período em andamento ainda não confere saldo.
    if (aniversario > hoje) break;
    periodos.push({
      numero: p,
      inicio,
      fim: addDays(aniversario, -1), // último dia corrido do aquisitivo
      prazoLimite: addDays(addMonths(aniversario, MESES_CONCESSIVO), -1), // último dia do concessivo (art. 134)
    });
    p++;
  }
  return periodos;
}

function isRegistroConsumido(f) {
  return !!f && f.cancelada !== true;
}

/**
 * Situação do próximo período aquisitivo pendente — mesma forma de retorno do
 * cálculo legado para manter compatibilidade de consumo.
 */
export function calcularSituacaoFerias(dataAdmissao, feriasConsumidas = []) {
  const periodos = calcularPeriodosAquisitivos(dataAdmissao);
  if (periodos.length === 0) return null;

  const consumidos = new Set(
    (feriasConsumidas || []).filter(isRegistroConsumido).map(f => f.periodo_aquisitivo)
  );
  const pendente = periodos.find(p => !consumidos.has(p.numero));

  if (!pendente) {
    return {
      todosConsumidos: true,
      totalPeriodos: periodos.length,
      periodosConsumidos: consumidos.size,
    };
  }

  const hoje = new Date();
  const diasParaVencer = differenceInCalendarDays(pendente.prazoLimite, hoje);
  const concessaoVencida = diasParaVencer < 0;

  return {
    periodoAquisitivo: pendente.numero,
    totalPeriodos: periodos.length,
    periodosConsumidos: consumidos.size,
    periodosPendentes: periodos.length - consumidos.size,
    diasParaVencer,
    prazoLimite: pendente.prazoLimite,
    // Férias "vencida" = período aquisitivo fechado e gozo ainda não concedido.
    // Conceito operacional (diferente do prazo de concessão, que é o limite máximo legal).
    vencido: true,
    // Prazo de concessão (art. 134) expirado → risco de pagamento em dobro (art. 137)
    concessaoVencida,
    urgente: !concessaoVencida && diasParaVencer >= 0 && diasParaVencer <= DIAS_URGENTE,
    atencao: !concessaoVencida && diasParaVencer > DIAS_URGENTE && diasParaVencer <= DIAS_ATENCAO,
  };
}

/** Dias de férias por período aquisitivo (base 30 — redução do art. 130 adiada). */
export function calcularDiasFerias() {
  return DIAS_FERIAS_PADRAO;
}

/**
 * Status derivado de um registro de férias a partir das datas.
 * 'programada' | 'em_andamento' | 'concluida' | 'cancelada' (esta é manual).
 */
export function getStatusFerias(f, hoje = new Date()) {
  if (!f) return null;
  if (f.cancelada === true) return FERIAS_STATUS.CANCELADA;
  if (!f.data_inicio || !f.data_fim) return FERIAS_STATUS.PROGRAMADA;
  const inicio = parseDataLocal(f.data_inicio);
  const fim = parseDataLocal(f.data_fim);
  if (isNaN(inicio.getTime()) || isNaN(fim.getTime())) return FERIAS_STATUS.PROGRAMADA;
  if (inicio > hoje) return FERIAS_STATUS.PROGRAMADA;
  if (fim < hoje) return FERIAS_STATUS.CONCLUIDA;
  return FERIAS_STATUS.EM_ANDAMENTO;
}

export function isFeriasAtiva(f, hoje = new Date()) {
  if (!f || f.cancelada === true) return false;
  if (!f.data_inicio || !f.data_fim) return false;
  const inicio = parseDataLocal(f.data_inicio);
  const fim = parseDataLocal(f.data_fim);
  if (isNaN(inicio.getTime()) || isNaN(fim.getTime())) return false;
  return inicio <= hoje && fim >= hoje;
}

/**
 * Valida o fracionamento de férias conforme art. 134 §1º.
 * @param {Array<{dias:number}>} periodos
 */
export function validarFracionamento(periodos) {
  const erros = [];
  const partes = (periodos || []).filter(p => p && p.dias > 0);
  if (partes.length > 3) {
    erros.push('Férias podem ser fracionadas em no máximo 3 períodos (art. 134 §1º)');
  }
  if (partes.length > 1) {
    const maior = partes.reduce((max, p) => Math.max(max, p.dias || 0), 0);
    if (maior < 14) {
      erros.push('Um dos períodos deve ter no mínimo 14 dias corridos (art. 134 §1º)');
    }
    if (partes.some(p => p.dias < 5)) {
      erros.push('Os demais períodos devem ter no mínimo 5 dias corridos (art. 134 §1º)');
    }
  }
  return { valido: erros.length === 0, erros };
}

/** Abono pecuniário máximo: até 1/3 dos dias, limitado a 10 (art. 143). */
export function abonoMaximo(dias = DIAS_FERIAS_PADRAO) {
  return Math.min(ABONO_MAXIMO_LEGAL, Math.floor(dias / 3));
}

/** Dia de retorno ao trabalho = dia seguinte ao fim das férias. */
export function getDiaRetorno(dataFim) {
  if (!dataFim) return null;
  const d = parseDataLocal(dataFim);
  if (isNaN(d.getTime())) return null;
  return addDays(d, 1);
}

/**
 * Encontra registros de férias de funcionários do MESMO SETOR sobrepondo um
 * intervalo candidato. Usado para alerta (soft) de conflito de escala.
 * @param {object} opts
 * @param {string} [opts.setor]
 * @param {string} [opts.dataInicio]
 * @param {string} [opts.dataFim]
 * @param {Array} [opts.todasFerias]
 * @param {Array} [opts.funcionarios]
 * @param {string} [opts.excluirFuncionarioId]
 */
export function getFeriasSobrepostas({
  setor,
  dataInicio,
  dataFim,
  todasFerias = [],
  funcionarios = [],
  excluirFuncionarioId = null,
} = {}) {
  if (!setor || !dataInicio || !dataFim) return [];
  const inicio = parseDataLocal(dataInicio);
  const fim = parseDataLocal(dataFim);
  if (isNaN(inicio.getTime()) || isNaN(fim.getTime())) return [];

  const idsSetor = new Set(
    (funcionarios || []).filter(f => f.setor === setor).map(f => f.id)
  );
  const resultado = [];
  for (const f of todasFerias || []) {
    if (!isRegistroConsumido(f)) continue;
    if (excluirFuncionarioId && f.funcionario_id === excluirFuncionarioId) continue;
    if (!idsSetor.has(f.funcionario_id)) continue;
    if (!f.data_inicio || !f.data_fim) continue;
    const fInicio = parseDataLocal(f.data_inicio);
    const fFim = parseDataLocal(f.data_fim);
    if (isNaN(fInicio.getTime()) || isNaN(fFim.getTime())) continue;
    if (fInicio <= fim && fFim >= inicio) {
      const funcionario = (funcionarios || []).find(fn => fn.id === f.funcionario_id);
      resultado.push({ funcionario, ferias: f });
    }
  }
  return resultado;
}

/** Quantos funcionários de um setor estão de férias em uma determinada data. */
export function contarAusenciasSetor(setor, dataISO, todasFerias = [], funcionarios = []) {
  if (!setor || !dataISO) return 0;
  const d = parseDataLocal(dataISO);
  if (isNaN(d.getTime())) return 0;
  const idsSetor = new Set((funcionarios || []).filter(f => f.setor === setor).map(f => f.id));
  return (todasFerias || []).filter(f => {
    if (!isRegistroConsumido(f) || !idsSetor.has(f.funcionario_id)) return false;
    if (!f.data_inicio || !f.data_fim) return false;
    const ini = parseDataLocal(f.data_inicio);
    const fim = parseDataLocal(f.data_fim);
    if (isNaN(ini.getTime()) || isNaN(fim.getTime())) return false;
    return ini <= d && fim >= d;
  }).length;
}

/**
 * Dias de férias EFETIVAMENTE gozados até hoje, com base nas datas do registro.
 * - Antes do início: 0 (ainda não gozou)
 * - Durante: dias decorridos desde o início (inclusive hoje)
 * - Após o fim: total do período
 */
export function diasEfetivosGozados(r, hoje = new Date()) {
  if (!r || !r.data_inicio || !r.data_fim) return 0;
  const inicio = parseDataLocal(r.data_inicio);
  const fim = parseDataLocal(r.data_fim);
  if (isNaN(inicio.getTime()) || isNaN(fim.getTime())) return 0;
  const d = startOfDay(hoje);
  const ini = startOfDay(inicio);
  const f = startOfDay(fim);
  const total = Math.max(1, r.dias_gozados || (differenceInCalendarDays(f, ini) + 1));
  if (d < ini) return 0;
  if (d > f) return total;
  return Math.min(total, differenceInCalendarDays(d, ini) + 1);
}

/**
 * Saldo de férias do funcionário: períodos e dias disponíveis/gozados.
 * @returns {{ periodos: Array<{numero: number, inicio: Date, fim: Date, prazoLimite: Date, estado: string, diasParaVencer: number, vencido: boolean, concessaoVencida: boolean, diasDisponiveis: number, diasGozados: number, diasProgramados: number}>, diasDisponiveis: number, diasGozados: number, diasProgramados: number, totalPeriodos: number }}
 */
export function calcularSaldoFerias(funcionario, feriasRegistradas = []) {
  const periodos = calcularPeriodosAquisitivos(funcionario?.data_admissao);
  const registros = (feriasRegistradas || []).filter(isRegistroConsumido);
  const hoje = new Date();

  const periodosMap = periodos.map(p => {
    const registrosDoPeriodo = registros.filter(r => r.periodo_aquisitivo === p.numero);
    const concluido = registrosDoPeriodo.some(r => getStatusFerias(r) === FERIAS_STATUS.CONCLUIDA);
    const programado = registrosDoPeriodo.some(r => getStatusFerias(r) === FERIAS_STATUS.PROGRAMADA);
    const emAndamento = registrosDoPeriodo.some(r => getStatusFerias(r) === FERIAS_STATUS.EM_ANDAMENTO);

    // Dias efetivamente gozados (dependem da data atual — férias futura ainda não conta)
    const diasGozados = registrosDoPeriodo.reduce((s, r) => s + diasEfetivosGozados(r, hoje), 0);
    // Dias agendados e ainda não gozados (programados = total agendado - já gozado)
    const diasProgramados = registrosDoPeriodo
      .filter(r => {
        const st = getStatusFerias(r);
        return st === FERIAS_STATUS.PROGRAMADA || st === FERIAS_STATUS.EM_ANDAMENTO;
      })
      .reduce((s, r) => s + Math.max(0, (r.dias_gozados || 0) - diasEfetivosGozados(r, hoje)), 0);

    let estado;
    if (emAndamento) estado = 'em_andamento';
    else if (programado) estado = 'programado';
    else if (concluido) estado = 'gozado';
    else estado = 'disponivel';

    const diasParaVencer = differenceInCalendarDays(p.prazoLimite, hoje);
    return {
      ...p,
      estado,
      diasDisponiveis: estado === 'disponivel' ? DIAS_FERIAS_PADRAO : 0,
      diasGozados,
      diasProgramados,
      diasParaVencer,
      // Férias vencida = período aquisitivo fechado e gozo não concedido (conceito operacional)
      vencido: estado === 'disponivel',
      // Prazo de concessão expirado → dobra (art. 137)
      concessaoVencida: diasParaVencer < 0,
    };
  });

  return {
    periodos: periodosMap,
    diasDisponiveis: periodosMap.reduce((s, p) => s + p.diasDisponiveis, 0),
    diasGozados: periodosMap.reduce((s, p) => s + p.diasGozados, 0),
    diasProgramados: periodosMap.reduce((s, p) => s + p.diasProgramados, 0),
    totalPeriodos: periodos.length,
  };
}

/**
 * Projeta os marcos de prazo FUTUROS de um funcionário dentro de um ano,
 * para o planejamento na escala anual:
 * - 'aquisicao': mês em que um período aquisitivo completa (direito adquirido)
 * - 'concessao': mês dentro da janela concessiva (férias PODE ser concedida)
 * - 'limite': último mês da janela concessiva (última oportunidade antes da dobra)
 *
 * Regras:
 * - Só marca os meses futuros (a partir de mesAtual) do ano informado.
 * - Períodos já providenciados (gozados OU programados/em andamento) não geram marcos.
 *
 * @param {string} dataAdmissao
 * @param {Array} feriasRegistradas registros de férias do funcionário
 * @param {number} ano
 * @param {number} mesAtual 0-11
 * @returns {{ porMes: object }}
 */
export function getMarcosFuturos(dataAdmissao, feriasRegistradas = [], ano, mesAtual) {
  const porMes = {};
  if (!dataAdmissao) return { porMes };
  const admissao = parseDataLocal(dataAdmissao);
  if (isNaN(admissao.getTime())) return { porMes };

  const providenciados = new Set(
    (feriasRegistradas || []).filter(isRegistroConsumido).map(r => r.periodo_aquisitivo)
  );

  const anoInicio = new Date(ano, 0, 1);
  const anoFim = new Date(ano, 11, 31);

  let p = 1;
  for (;;) {
    const aniversario = addMonths(admissao, p * MESES_AQUISITIVO); // fim do aquisitivo
    if (aniversario > anoFim) break; // período só começa depois do ano alvo
    const fimConcessivo = addDays(addMonths(aniversario, MESES_CONCESSIVO), -1); // último dia do concessivo
    if (fimConcessivo < anoInicio) { p++; continue; } // janela já terminou antes do ano alvo

    const aberto = !providenciados.has(p);
    for (let m = mesAtual; m <= 11; m++) {
      const primeiroMes = new Date(ano, m, 1);
      const ultimoMes = new Date(ano, m + 1, 0);
      if (aniversario > ultimoMes || fimConcessivo < primeiroMes) continue; // janela não cobre este mês
      if (!aberto) continue;

      const marcador = porMes[m] || { aquisicao: false, concessao: false, limite: false };
      marcador.concessao = true; // todos os meses da janela são concessíveis
      if (aniversario.getFullYear() === ano && aniversario.getMonth() === m) marcador.aquisicao = true;
      if (fimConcessivo.getFullYear() === ano && fimConcessivo.getMonth() === m) marcador.limite = true;
      porMes[m] = marcador;
    }
    p++;
  }

  return { porMes };
}

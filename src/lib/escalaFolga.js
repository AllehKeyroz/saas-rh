// Escala de folga (DSR) — cálculo dos dias de folga por funcionário.
// Tipos:
// - 'fixa': folga sempre no mesmo dia da semana (dia_semana_fixo, 0=domingo)
// - 'ciclo': padrão NxM (dias_trabalho x dias_folga) com offset para alternância
//   (ex.: 6x1, 5x1, 5x2, 4x2, 2x2, 12x36≈1x1). O offset distribui as folgas
//   entre os funcionários para que cada um folgue em dia diferente.
import { addDays, differenceInCalendarDays } from 'date-fns';
import { parseDataLocal } from '@/lib/ferias';

export const ESCALA_PRESETS = [
  { id: '6x1', label: '6x1', dias_trabalho: 6, dias_folga: 1 },
  { id: '5x1', label: '5x1', dias_trabalho: 5, dias_folga: 1 },
  { id: '5x2', label: '5x2', dias_trabalho: 5, dias_folga: 2 },
  { id: '4x2', label: '4x2', dias_trabalho: 4, dias_folga: 2 },
  { id: '2x2', label: '2x2', dias_trabalho: 2, dias_folga: 2 },
  { id: '12x36', label: '12x36', dias_trabalho: 1, dias_folga: 1 },
];

export function getPresetEscala(id) {
  return ESCALA_PRESETS.find(p => p.id === id) || null;
}

// Status de publicação da escala.
// - 'rascunho': ainda não publicada (não vai ao portal). Edição livre.
// - 'consolidada': publicada/travada. Editar exige "reabrir".
// RETROCOMPATIBILIDADE: registros antigos (sem `status`) são tratados como RASCUNHO.
export const ESCALA_STATUS = {
  RASCUNHO: 'rascunho',
  CONSOLIDADA: 'consolidada',
};

export function isConsolidada(escala) {
  return escala?.status === ESCALA_STATUS.CONSOLIDADA;
}

export function isRascunho(escala) {
  return !isConsolidada(escala);
}

/** Status agregado das escalas (ativas) de um funcionário. */
export function statusEscalasFuncionario(escalasFunc) {
  const ativas = (escalasFunc || []).filter(e => e.ativo !== false);
  if (ativas.length === 0) return 'sem_escala';
  return ativas.some(isRascunho) ? ESCALA_STATUS.RASCUNHO : ESCALA_STATUS.CONSOLIDADA;
}

/** True se a escala cobre (total ou parcialmente) o intervalo [inicioISO, fimISO]. */
export function escalaCobrePeriodo(escala, inicioISO, fimISO) {
  if (!escala || !escala.data_ancora) return false;
  const fim = escala.data_fim || '9999-12-31';
  return escala.data_ancora <= fimISO && fim >= inicioISO;
}

export function getCicloEscala(escala) {
  const trab = Number(escala?.dias_trabalho) || 0;
  const folga = Number(escala?.dias_folga) || 0;
  return trab + folga;
}

function toISO(d) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

// Posição (0-based) da data dentro do ciclo, considerando o offset.
function posicaoCiclo(escala, dataISO) {
  const ancora = parseDataLocal(escala.data_ancora);
  const d = parseDataLocal(dataISO);
  if (isNaN(ancora.getTime()) || isNaN(d.getTime())) return 0;
  const ciclo = getCicloEscala(escala);
  if (ciclo <= 0) return 0;
  const dias = differenceInCalendarDays(d, ancora) + (escala.offset || 0);
  return ((dias % ciclo) + ciclo) % ciclo;
}

/** Retorna true se a data é folga do funcionário conforme a escala. */
export function ehDiaFolga(escala, dataISO) {
  if (!escala || escala.ativo === false || !dataISO) return false;
  // A escala vale apenas dentro do período [data_ancora, data_fim] — não retroage nem vai ao infinito
  if (escala.data_ancora && dataISO < escala.data_ancora) return false;
  if (escala.data_fim && dataISO > escala.data_fim) return false;
  if (escala.tipo === 'personalizada') {
    const dias = Array.isArray(escala.dias_folga) ? escala.dias_folga : [];
    return dias.includes(dataISO);
  }
  if (escala.tipo === 'fixa') {
    const d = parseDataLocal(dataISO);
    if (isNaN(d.getTime())) return false;
    return d.getDay() === (escala.dia_semana_fixo ?? 0);
  }
  return posicaoCiclo(escala, dataISO) >= (escala.dias_trabalho || 0);
}

/**
 * Escala EFETIVA para uma data: a última escala do funcionário (maior data de
 * início) cujo período cobre a data. Suporta histórico/versões de escala.
 * @param {Array} escalas registros de EscalaFolga do funcionário
 * @param {string} dataISO
 * @returns {object|null}
 */
export function getEscalaEfetiva(escalas, dataISO) {
  if (!dataISO) return null;
  let efetiva = null;
  for (const e of escalas || []) {
    if (e.ativo === false) continue;
    if (e.data_ancora && dataISO < e.data_ancora) continue;
    if (e.data_fim && dataISO > e.data_fim) continue;
    if (!efetiva || (e.data_ancora || '') >= (efetiva.data_ancora || '')) efetiva = e;
  }
  return efetiva;
}

/** Dias de folga do funcionário em um mês (ano, mes 0-11). */
export function calcularDiasFolga(escala, ano, mes) {
  const dias = [];
  if (!escala || escala.ativo === false) return dias;
  const diasNoMes = new Date(ano, mes + 1, 0).getDate();
  for (let d = 1; d <= diasNoMes; d++) {
    const iso = `${ano}-${String(mes + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    if (ehDiaFolga(escala, iso)) dias.push(iso);
  }
  return dias;
}

/** Próximas datas de folga a partir de uma data (para a regra dos 48h). */
export function proximasFolgas(escala, dataInicio, qtd = 3) {
  const result = [];
  if (!escala || escala.ativo === false || !dataInicio) return result;
  const d = parseDataLocal(dataInicio);
  if (isNaN(d.getTime())) return result;
  for (let i = 0; i < 30 && result.length < qtd; i++) {
    const iso = toISO(addDays(d, i));
    if (ehDiaFolga(escala, iso)) result.push(iso);
  }
  return result;
}

/**
 * Regra do art. 134 §3º: férias não podem começar nos 2 dias anteriores a
 * folga/DSR do funcionário. Retorna a data da folga violada (ou null).
 */
export function verificarRegra48hFolga(escala, dataInicio) {
  if (!escala || escala.ativo === false || !dataInicio) return null;
  const inicio = parseDataLocal(dataInicio);
  if (isNaN(inicio.getTime())) return null;
  for (let i = 1; i <= 2; i++) {
    const iso = toISO(addDays(inicio, i));
    if (ehDiaFolga(escala, iso)) return iso;
  }
  return null;
}

/** Rótulo curto da escala para exibição (ex.: "6x1", "Fixa (dom)"). */
export function rotuloEscala(escala) {
  if (!escala) return 'Sem escala';
  if (escala.tipo === 'personalizada') return `Personalizada (${(Array.isArray(escala.dias_folga) ? escala.dias_folga : []).length} folgas)`;
  if (escala.tipo === 'fixa') {
    const dias = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sáb'];
    return `Fixa (${dias[escala.dia_semana_fixo ?? 0]})`;
  }
  return `${escala.dias_trabalho}x${escala.dias_folga}`;
}

/**
 * Dias de folga EFETIVOS de um funcionário em um mês (ano, mes 0-11),
 * respeitando o versionamento (usa a escala efetiva de cada dia).
 * @param {Array} escalasFunc registros de EscalaFolga do funcionário
 * @returns {string[]} datas ISO de folga
 */
export function getFolgasDoMes(escalasFunc, ano, mes) {
  const dias = [];
  const diasNoMes = new Date(ano, mes + 1, 0).getDate();
  for (let d = 1; d <= diasNoMes; d++) {
    const iso = `${ano}-${String(mes + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    const escala = getEscalaEfetiva(escalasFunc, iso);
    if (escala && ehDiaFolga(escala, iso)) dias.push(iso);
  }
  return dias;
}

/**
 * Folgas que caem em feriado para uma escala (preview ou salva).
 * - personalizada: verifica os dias escolhidos.
 * - fixa/ciclo: percorre o período [data_ancora, data_fim] (ou até `maxDias`).
 * @param {object} escala
 * @param {Array<{data:string,nome:string}>} feriados
 * @returns {Array<{data:string,nome:string}>}
 */
export function getFolgasEmFeriado(escala, feriados = [], maxDias = 400) {
  if (!escala) return [];
  const mapa = new Map((feriados || []).map(f => [f.data, f.nome || 'Feriado']));
  const resultado = [];

  if (escala.tipo === 'personalizada') {
    for (const iso of (Array.isArray(escala.dias_folga) ? escala.dias_folga : [])) {
      if (mapa.has(iso)) resultado.push({ data: iso, nome: mapa.get(iso) });
    }
    return resultado.sort((a, b) => a.data.localeCompare(b.data));
  }

  const inicio = parseDataLocal(escala.data_ancora);
  if (isNaN(inicio.getTime())) return [];
  const fim = escala.data_fim ? parseDataLocal(escala.data_fim) : addDays(inicio, maxDias);
  let d = inicio;
  let i = 0;
  while (d <= fim && i <= maxDias) {
    const iso = toISO(d);
    if (ehDiaFolga(escala, iso) && mapa.has(iso)) resultado.push({ data: iso, nome: mapa.get(iso) });
    d = addDays(d, 1);
    i++;
  }
  return resultado;
}
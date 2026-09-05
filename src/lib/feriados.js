// Feriados nacionais (fixos + móveis) e regra do art. 134 §3º da CLT:
// férias não podem ter início nos 2 dias anteriores a feriado ou dia de repouso.
import { addDays } from 'date-fns';

function toISO(d) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

// Algoritmo de Meeus/Jones/Butcher para a data da Páscoa
function calcularPascoa(ano) {
  const a = ano % 19;
  const b = Math.floor(ano / 100);
  const c = ano % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const mes = Math.floor((h + l - 7 * m + 114) / 31);
  const dia = ((h + l - 7 * m + 114) % 31) + 1;
  return new Date(ano, mes - 1, dia);
}

/** Feriados nacionais de um ano (fixos + móveis). */
export function getFeriadosNacionais(ano) {
  const pascoa = calcularPascoa(ano);
  return [
    { data: `${ano}-01-01`, nome: 'Confraternização Universal' },
    { data: `${ano}-04-21`, nome: 'Tiradentes' },
    { data: `${ano}-05-01`, nome: 'Dia do Trabalho' },
    { data: `${ano}-09-07`, nome: 'Independência do Brasil' },
    { data: `${ano}-10-12`, nome: 'Nossa Senhora Aparecida' },
    { data: `${ano}-11-02`, nome: 'Finados' },
    { data: `${ano}-11-15`, nome: 'Proclamação da República' },
    { data: `${ano}-11-20`, nome: 'Dia da Consciência Negra' },
    { data: `${ano}-12-25`, nome: 'Natal' },
    { data: toISO(addDays(pascoa, -47)), nome: 'Carnaval' },
    { data: toISO(addDays(pascoa, -2)), nome: 'Sexta-feira Santa' },
    { data: toISO(addDays(pascoa, 60)), nome: 'Corpus Christi' },
  ];
}

/**
 * Feriados de um ano: nacionais + extras (municipais/outros) cadastrados pelo RH.
 * @param {number} ano
 * @param {Array<{data:string,nome:string}>} extras
 */
export function getFeriadosCompletos(ano, extras = []) {
  const nacionais = getFeriadosNacionais(ano);
  const prefixo = `${ano}-`;
  const extra = (extras || [])
    .filter(f => f && f.data && f.data.startsWith(prefixo))
    .map(f => ({ data: f.data, nome: f.nome || 'Feriado' }));
  return [...nacionais, ...extra];
}

/**
 * Regra do art. 134 §3º: férias não podem começar nos 2 dias anteriores a feriado.
 * @param {string} dataInicio "YYYY-MM-DD"
 * @param {Array<{data:string,nome:string}>} feriados
 * @returns {object|null} o feriado violado (ou null se ok)
 */
export function verificarRegra48h(dataInicio, feriados) {
  if (!dataInicio) return null;
  const inicio = new Date(dataInicio + 'T00:00:00');
  for (const f of feriados || []) {
    const feriado = new Date(f.data + 'T00:00:00');
    const diff = Math.round((feriado - inicio) / 86400000);
    if (diff === 1 || diff === 2) return f;
  }
  return null;
}
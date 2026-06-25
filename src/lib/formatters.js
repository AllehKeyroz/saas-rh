export function formatCurrency(value) {
  if (value == null || isNaN(value)) return 'R$ 0,00';
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
}

export function formatDate(dateStr) {
  if (!dateStr) return '-';
  // Extrai partes para evitar interpretação como UTC (que desloca um dia em TZ diferente)
  const parts = dateStr.split(/[-\/]/);
  if (parts.length === 3 && dateStr.includes('-')) {
    // parts[2] pode conter timezone ("23T12:34:56") — extrair só a parte da data
    const dPart = parts[2].split('T')[0];
    const [y, m, d] = [parts[0], parts[1], dPart].map(Number);
    if (!isNaN(d)) {
      return new Date(y, m - 1, d).toLocaleDateString('pt-BR');
    }
  }
  if (parts.length === 3 && dateStr.includes('/')) {
    // Já está no formato dd/MM/yyyy ou MM/yyyy
    return dateStr;
  }
  // Fallback para outros formatos (ISO string, Timestamp, etc.)
  const d = new Date(dateStr);
  return isNaN(d.getTime()) ? dateStr : d.toLocaleDateString('pt-BR');
}

export const TIPO_LABELS = {
  vale: 'Vale',
  vale_parcelado: 'Vale Parcelado',
  adiantamento: 'Adiantamento',
  convenio: 'Convênio',
  consumo: 'Consumo',
  adicional: 'Adicional',
  ajuste: 'Ajuste',
  comissao: 'Comissão',
  credito_consignado: 'Crédito Consignado',
};

export const TIPO_COLORS = {
  vale: 'bg-red-100 text-red-700',
  vale_parcelado: 'bg-rose-100 text-rose-700',
  adiantamento: 'bg-orange-100 text-orange-700',
  convenio: 'bg-yellow-100 text-yellow-700',
  consumo: 'bg-pink-100 text-pink-700',
  adicional: 'bg-green-100 text-green-700',
  ajuste: 'bg-blue-100 text-blue-700',
  comissao: 'bg-emerald-100 text-emerald-700',
  credito_consignado: 'bg-purple-100 text-purple-700',
};

export const LIMITE_PERCENTUAL = 40; // % do salário + comissão usado como limite de vales/adiantamentos
export const TIPOS_DESCONTO_DEFAULT = ['vale', 'vale_parcelado', 'adiantamento', 'convenio', 'consumo', 'credito_consignado'];
export const TIPOS_ADICIONAL_DEFAULT = ['adicional', 'ajuste', 'comissao'];
// Legacy aliases for backward compatibility
export const TIPOS_DESCONTO = TIPOS_DESCONTO_DEFAULT;
export const TIPOS_ADICIONAL = TIPOS_ADICIONAL_DEFAULT;

export function isDesconto(tipo) {
  return TIPOS_DESCONTO.includes(tipo);
}

export function mergeTipos(tiposPersonalizados, categoria) {
  const custom = (tiposPersonalizados || [])
    .filter(t => t.ativo !== false && t.categoria === categoria)
    .map(t => t.nome);
  const defaults = categoria === 'desconto' ? TIPOS_DESCONTO_DEFAULT : TIPOS_ADICIONAL_DEFAULT;
  return [...new Set([...defaults, ...custom])];
}

export function getMesReferenciaAtual() {
  const now = new Date();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const y = now.getFullYear();
  return `${m}/${y}`;
}

export function getMesesOptions(mesesFuturos = 0) {
  const meses = [];
  const now = new Date();
  for (let i = 11; i >= -mesesFuturos; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const y = d.getFullYear();
    meses.push(`${m}/${y}`);
  }
  return meses;
}
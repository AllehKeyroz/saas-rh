export function formatCurrency(value) {
  if (value == null || isNaN(value)) return 'R$ 0,00';
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
}

export function formatDate(dateStr) {
  if (!dateStr) return '-';
  const d = new Date(dateStr);
  return d.toLocaleDateString('pt-BR');
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

export const TIPOS_DESCONTO = ['vale', 'vale_parcelado', 'adiantamento', 'convenio', 'consumo', 'credito_consignado'];
export const TIPOS_ADICIONAL = ['adicional', 'ajuste', 'comissao'];

export function isDesconto(tipo) {
  return TIPOS_DESCONTO.includes(tipo);
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
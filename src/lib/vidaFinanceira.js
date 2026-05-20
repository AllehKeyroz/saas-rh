// Categorias padrão do módulo Minha Vida Financeira

export const CATEGORIAS_PADRAO = {
  gasto_fixo: ['Aluguel', 'Água', 'Luz', 'Internet', 'Telefone', 'Transporte Fixo', 'Mensalidades'],
  gasto_variavel: ['Mercado', 'Lazer', 'Transporte Variável', 'Alimentação Fora', 'Compras'],
  investimento: ['Poupança', 'Aplicações', 'Previdência', 'Criptomoedas'],
  receita_extra: ['Bico', 'Gorjeta Direta', 'Venda', 'Freelance', 'Outro'],
};

export const TIPO_LABELS = {
  gasto_fixo: 'Gasto Fixo',
  gasto_variavel: 'Gasto Variável',
  investimento: 'Investimento',
  receita_extra: 'Receita Extra',
};

export const TIPO_COLORS = {
  gasto_fixo: { bg: 'bg-red-100', text: 'text-red-700', badge: 'destructive', chart: '#ef4444' },
  gasto_variavel: { bg: 'bg-orange-100', text: 'text-orange-700', badge: 'outline', chart: '#f97316' },
  investimento: { bg: 'bg-green-100', text: 'text-green-700', badge: 'secondary', chart: '#22c55e' },
  receita_extra: { bg: 'bg-blue-100', text: 'text-blue-700', badge: 'default', chart: '#3b82f6' },
};

export function calcularResumoMensal(gastos, salario) {
  const gastoFixo = gastos.filter(g => g.categoria_tipo === 'gasto_fixo').reduce((s, g) => s + (g.valor || 0), 0);
  const gastoVariavel = gastos.filter(g => g.categoria_tipo === 'gasto_variavel').reduce((s, g) => s + (g.valor || 0), 0);
  const investimento = gastos.filter(g => g.categoria_tipo === 'investimento').reduce((s, g) => s + (g.valor || 0), 0);
  const receitaExtra = gastos.filter(g => g.categoria_tipo === 'receita_extra').reduce((s, g) => s + (g.valor || 0), 0);
  const totalGastos = gastoFixo + gastoVariavel + investimento;
  const saldoPessoal = (salario || 0) + receitaExtra - totalGastos;

  return { gastoFixo, gastoVariavel, investimento, receitaExtra, totalGastos, saldoPessoal };
}

export function calcularAlerta(totalGastos, salario) {
  if (!salario || salario <= 0) return null;
  const pct = (totalGastos / salario) * 100;
  if (pct >= 100) return { nivel: 'vermelho', pct, msg: 'Você ultrapassou seu limite de gastos!' };
  if (pct >= 80) return { nivel: 'laranja', pct, msg: 'Atenção: você está perto de atingir seu limite.' };
  if (pct >= 50) return { nivel: 'amarelo', pct, msg: 'Você já gastou 50% do seu limite mensal.' };
  return { nivel: 'verde', pct, msg: null };
}

export function calcularProgressoMeta(economiReal, metaMensal) {
  if (!metaMensal || metaMensal <= 0) return null;
  return (economiReal / metaMensal) * 100;
}

export function filtrarGastosPorMes(gastos, mesReferencia) {
  return gastos.filter(g => {
    if (!g.data_lancamento) return false;
    const d = new Date(g.data_lancamento);
    const mr = `${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
    return mr === mesReferencia;
  });
}
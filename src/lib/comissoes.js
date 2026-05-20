// Utilitários compartilhados do módulo de comissões

// Divisão padrão (fallback quando não há SetoresComissao configurados)
export const DIVISAO_DEFAULT = {
  empresa: 0.20,
  salao: 0.40,
  cozinha: 0.24,
  copa_playground_caixa: 0.14,
  limpeza_rh: 0.02,
};

// Mapa de palavras-chave padrão para setores fixos (retrocompatibilidade)
export const SETOR_MAP = {
  salao: ['salão', 'salao', 'garçom', 'garcom', 'atendimento', 'recepção', 'recepcao'],
  cozinha: ['cozinha', 'cozinheiro', 'auxiliar de cozinha', 'chefe'],
  copa_playground_caixa: ['copa', 'playground', 'caixa'],
  limpeza_rh: ['limpeza', 'rh', 'recursos humanos', 'higienização', 'higienizacao'],
};

export const SETOR_LABELS = {
  empresa: 'Empresa',
  salao: 'Salão',
  cozinha: 'Cozinha',
  copa_playground_caixa: 'Copa / Playground / Caixa',
  limpeza_rh: 'Limpeza / RH',
};

// Normaliza setor usando SETOR_MAP padrão (para retrocompatibilidade)
export function normalizarSetor(setor) {
  if (!setor) return null;
  const s = setor.toLowerCase().trim();
  for (const [key, values] of Object.entries(SETOR_MAP)) {
    if (values.some(v => s.includes(v))) return key;
  }
  return null;
}

// Mapeia nome do setor de um funcionário para o ID de um SetoresComissao dinâmico
export function mapearSetorDinamico(setorFuncionario, setoresDinamicos) {
  if (!setorFuncionario || !setoresDinamicos?.length) return null;
  const s = setorFuncionario.toLowerCase().trim();
  for (const setor of setoresDinamicos) {
    if (!setor.ativo) continue;
    const palavras = (setor.palavras_chave || setor.nome_do_setor)
      .toLowerCase()
      .split(',')
      .map(p => p.trim())
      .filter(Boolean);
    if (palavras.some(p => s.includes(p))) return setor.id;
    if (s === setor.nome_do_setor.toLowerCase()) return setor.id;
  }
  return null;
}

// Calcula divisão com setores dinâmicos
export function calcularDivisaoDinamica(valorTotal, setoresAtivos) {
  const result = {};
  for (const s of setoresAtivos) {
    result[s.id] = {
      valor: valorTotal * ((s.percentual || 0) / 100),
      nome: s.nome_do_setor,
      percentual: s.percentual,
    };
  }
  return result;
}

// Fallback: calcula divisão com percentuais fixos
export function calcularDivisao(valorTotal, percentuais = DIVISAO_DEFAULT) {
  return {
    empresa: valorTotal * (percentuais.empresa ?? DIVISAO_DEFAULT.empresa),
    salao: valorTotal * (percentuais.salao ?? DIVISAO_DEFAULT.salao),
    cozinha: valorTotal * (percentuais.cozinha ?? DIVISAO_DEFAULT.cozinha),
    copa_playground_caixa: valorTotal * (percentuais.copa_playground_caixa ?? DIVISAO_DEFAULT.copa_playground_caixa),
    limpeza_rh: valorTotal * (percentuais.limpeza_rh ?? DIVISAO_DEFAULT.limpeza_rh),
  };
}

// Calcula dias totais de um período (inclusivo)
export function calcularDiasTotais(periodoInicio, periodoFim) {
  const inicio = new Date(periodoInicio + 'T00:00:00');
  const fim = new Date(periodoFim + 'T00:00:00');
  return Math.round((fim - inicio) / (1000 * 60 * 60 * 24)) + 1;
}

// Calcula proporcionalidade por dias trabalhados
// diasAusentes: número de dias ausentes no período
// Retorna { diasTotais, diasTrabalhados, proporcao }
export function calcularProporcionalidade(periodoInicio, periodoFim, diasAusentes = 0) {
  const diasTotais = calcularDiasTotais(periodoInicio, periodoFim);
  const diasTrabalhados = Math.max(0, diasTotais - (diasAusentes || 0));
  const proporcao = diasTotais > 0 ? diasTrabalhados / diasTotais : 1;
  return { diasTotais, diasTrabalhados, proporcao };
}

export function calcularComissaoMensal(comissoesFuncionarios, funcionarioId, mesRef) {
  return comissoesFuncionarios
    .filter(c => c.funcionario_id === funcionarioId && c.mes_referencia === mesRef && c.apto)
    .reduce((sum, c) => {
      // Usa valor_individual_final se existir, senão valor_individual (retrocompatibilidade)
      const val = c.valor_individual_final !== undefined ? c.valor_individual_final : (c.valor_individual || 0);
      return sum + val;
    }, 0);
}

export function formatPeriodo(inicio, fim) {
  if (!inicio || !fim) return '-';
  const fmt = (d) => {
    const dt = new Date(d + 'T00:00:00');
    return `${String(dt.getDate()).padStart(2, '0')}/${String(dt.getMonth() + 1).padStart(2, '0')}`;
  };
  return `${fmt(inicio)} a ${fmt(fim)}`;
}

// Calcula progresso da meta de comissão (0-100)
export function calcularProgressoMetaComissao(acumulado, metaValor) {
  if (!metaValor || metaValor <= 0) return null;
  return Math.min((acumulado / metaValor) * 100, 100);
}

// Retorna alerta motivacional baseado no progresso
export function getAlertaMetaComissao(progresso, atingida) {
  if (progresso === null) return null;
  if (atingida) return { tipo: 'sucesso', msg: 'Parabéns! Você bateu sua meta de comissão!' };
  if (progresso >= 80) return { tipo: 'otimo', msg: 'Você está muito perto de bater sua meta!' };
  if (progresso >= 50) return { tipo: 'metade', msg: 'Você já alcançou metade da sua meta. Continue assim!' };
  return null;
}
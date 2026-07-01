// Utilitários compartilhados do módulo de comissões

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

// Calcula distribuição de comissão para funcionários considerando faltas.
// Cada funcionário recebe bônus das PERDAS DOS DEMAIS (excluindo a própria perda).
// Fórmula: final = base - loss + bonus, onde bonus = (pool - loss) / (N-1)
export function calcularDistribuicaoFuncionarios(
  valorSetor, funcionarios, mapDiasAusentes, periodoInicio, periodoFim
) {
  const N = funcionarios.length;
  if (N === 0) return [];

  const diasTotaisPeriodo = calcularDiasTotais(periodoInicio, periodoFim);
  const base = valorSetor / N;

  const resultados = funcionarios.map(f => {
    const diasAus = parseInt(mapDiasAusentes[f.id] || 0);
    const loss = base * diasAus / diasTotaisPeriodo;
    const { diasTrabalhados, proporcao } =
      calcularProporcionalidade(periodoInicio, periodoFim, diasAus);
    return {
      funcionarioId: f.id,
      funcionarioNome: f.nome,
      diasAusentes: diasAus,
      diasTrabalhados,
      diasTotais: diasTotaisPeriodo,
      proporcao,
      valorBase: base,
      loss,
    };
  });

  const pool = resultados.reduce((s, r) => s + r.loss, 0);

  for (const r of resultados) {
    const bonus = (N > 1 && pool > 0) ? (pool - r.loss) / (N - 1) : 0;
    r.valorFinal = Math.max(0, r.valorBase - r.loss + bonus);
    r.bonus = bonus;

    // Cada pessoa recebe contribuição de cada outro funcionário que gerou perda
    r.contribuicoes = [];
    if (bonus > 0) {
      for (const outro of resultados) {
        if (outro.funcionarioId !== r.funcionarioId && outro.loss > 0) {
          r.contribuicoes.push({
            nome: outro.funcionarioNome,
            diasAusentes: outro.diasAusentes,
            perda: outro.loss,
            bonusGeradoPorPessoa: outro.loss / (N - 1),
          });
        }
      }
    }
  }

  return resultados;
}
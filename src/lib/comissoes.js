// Utilitários compartilhados do módulo de comissões
import { client } from '@/api/client';
import { registrarAuditoria } from '@/lib/audit';
import { formatCurrency } from '@/lib/formatters';

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

// Dias sobrepostos entre um afastamento e o período da comissão (inclusivo)
export function calcularDiasSobrepostos(afastInicio, afastFim, periodoInicio, periodoFim) {
  if (!afastInicio || !periodoInicio || !periodoFim) return 0;
  const inicio = new Date(afastInicio + 'T00:00:00');
  const fim = afastFim ? new Date(afastFim + 'T00:00:00') : new Date(periodoFim + 'T00:00:00');
  const pInicio = new Date(periodoInicio + 'T00:00:00');
  const pFim = new Date(periodoFim + 'T00:00:00');
  const a = inicio > pInicio ? inicio : pInicio;
  const b = fim < pFim ? fim : pFim;
  if (a > b) return 0;
  return Math.round((b - a) / (1000 * 60 * 60 * 24)) + 1;
}

// Afastamento "em aberto" (data_fim null) é tratado como vigente até o fim do período
export function sobrepoeAfastamento(afast, periodoInicio, periodoFim) {
  return calcularDiasSobrepostos(afast.data_inicio, afast.data_fim, periodoInicio, periodoFim) > 0;
}

// Dias ausentes DISTINTOS (união) de vários períodos (afastamento + férias) dentro do
// período da comissão. Evita contar em dobro quando afastamento e férias se cruzam.
export function calcularDiasUniao(periodos, periodoInicio, periodoFim) {
  const dias = new Set();
  const iso = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  for (const p of periodos || []) {
    if (!p.data_inicio) continue;
    const ini = new Date(p.data_inicio + 'T00:00:00');
    const fim = p.data_fim ? new Date(p.data_fim + 'T00:00:00') : new Date(periodoFim + 'T00:00:00');
    const pIni = new Date(periodoInicio + 'T00:00:00');
    const pFim = new Date(periodoFim + 'T00:00:00');
    const a = ini > pIni ? ini : pIni;
    const b = fim < pFim ? fim : pFim;
    if (a > b) continue;
    for (let d = new Date(a); d <= b; d.setDate(d.getDate() + 1)) {
      dias.add(iso(d));
    }
  }
  return dias.size;
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

// ── Status da comissão: rascunho (pendente) → publicado (confirmado) ─────────
// Registros antigos, gravados antes deste fluxo, não têm o campo e são tratados
// como confirmados — mantém o comportamento anterior.
export const COMISSAO_STATUS = {
  PENDENTE: 'pendente',
  CONFIRMADO: 'confirmado',
};

// Crédito de setor: valor que um setor sem aptos deixou de distribuir.
// Fica disponível e é aplicado em um lançamento futuro, quando o RH quiser.
export const CREDITO_STATUS = {
  DISPONIVEL: 'disponivel',
  USADO: 'usado',
};

export function isComissaoPendente(comissao) {
  return comissao?.status === COMISSAO_STATUS.PENDENTE;
}

export function isComissaoConfirmada(comissao) {
  return !comissao?.status || comissao.status === COMISSAO_STATUS.CONFIRMADO;
}

// Publica um rascunho: gera as linhas por funcionário (ComissaoPorFuncionario)
// e marca a comissão como confirmada. Enquanto pendente não existe linha por
// funcionário, então nenhum consumidor (fechamento, portal, dashboard) a enxerga.
// Idempotente: limpa linhas órfãs de uma tentativa anterior antes de recriar.
export async function publicarComissao(comissao) {
  if (!comissao?.id) throw new Error('Comissão inválida.');
  if (!isComissaoPendente(comissao)) {
    throw new Error('Somente comissões pendentes podem ser publicadas.');
  }

  const registros = (comissao.rascunho?.registros || []).map((r) => ({
    ...r,
    comissao_id: comissao.id,
  }));

  if (registros.length > 0) {
    // Se uma tentativa anterior já criou as linhas (falhou só no update final),
    // não recria nem apaga — apenas confirma. Evita duplicar sem exigir admin
    // (a regra do Firestore só deixa admin apagar).
    const existentes = await client.entities.ComissaoPorFuncionario.filter({ comissao_id: comissao.id });
    if (existentes.length === 0) {
      await client.entities.ComissaoPorFuncionario.bulkCreate(registros);
    }
  }

  // Créditos gerados: setores que ficaram sem aptos não distribuem; o valor
  // fica disponível para um lançamento futuro (evita a race condition de
  // redistribuir para setores cujas ausências ainda não foram lançadas).
  const creditosGerados = comissao.rascunho?.creditos_gerados || [];
  if (creditosGerados.length > 0) {
    const jaGerados = await client.entities.CreditoComissaoSetor.filter({ origem_comissao_id: comissao.id });
    if (jaGerados.length === 0) {
      await client.entities.CreditoComissaoSetor.bulkCreate(creditosGerados.map((c) => ({
        setor_id: c.setor_id || null,
        setor_nome: c.setor_nome,
        valor: c.valor,
        status: CREDITO_STATUS.DISPONIVEL,
        origem_comissao_id: comissao.id,
        origem_periodo_inicio: comissao.periodo_inicio,
        origem_periodo_fim: comissao.periodo_fim,
        origem_mes_referencia: comissao.mes_referencia,
      })));
    }
  }

  // Créditos usados neste lançamento: consome somente se ainda estiver disponível.
  const creditosUsados = comissao.rascunho?.creditos_usados || [];
  let consumidos = 0;
  for (const c of creditosUsados) {
    if (!c.id) continue;
    const atual = await client.entities.CreditoComissaoSetor.get(c.id);
    if (atual && atual.status === CREDITO_STATUS.DISPONIVEL) {
      await client.entities.CreditoComissaoSetor.update(c.id, {
        status: CREDITO_STATUS.USADO,
        usado_em: new Date().toISOString(),
        comissao_id_uso: comissao.id,
      });
      consumidos += 1;
    }
  }

  await client.entities.ComissoesGorjetas.update(comissao.id, {
    status: COMISSAO_STATUS.CONFIRMADO,
    publicado_em: new Date().toISOString(),
    rascunho: null,
  });

  await registrarAuditoria({
    acao: 'editar',
    modulo: 'comissao',
    entidade_id: comissao.id,
    descricao: `Comissão publicada: ${comissao.periodo_inicio} a ${comissao.periodo_fim} — ${formatCurrency(comissao.valor_total_periodo || 0)}`,
    dados_novos: {
      status: COMISSAO_STATUS.CONFIRMADO,
      registros: registros.length,
      creditos_gerados: creditosGerados.length,
      creditos_usados: consumidos,
    },
  });

  return { registros: registros.length, creditosGerados: creditosGerados.length, creditosUsados: consumidos };
}

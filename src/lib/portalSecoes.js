/**
 * Definição das seções do Portal do Funcionário.
 * Fonte única para: menu lateral (PortalSidebar), espelho do RH (EspelhoPortal),
 * roteamento por aba (PortalFuncionario) e configuração de visibilidade
 * (PermissoesPortalDialog).
 */

// Seções do menu do portal, na ordem de exibição.
// `sempre: true` → não pode ser ocultada (o funcionário precisa de um ponto de entrada).
export const SECOES_PORTAL = [
  { id: 'visao-geral', label: 'Visão Geral', sempre: true },
  { id: 'meus-dados', label: 'Meus Dados' },
  { id: 'financeiro', label: 'Meu Financeiro' },
  { id: 'meus-documentos', label: 'Meus Documentos' },
  { id: 'minhas-ferias', label: 'Minhas Férias' },
  { id: 'vida-financeira', label: 'Minha Vida Financeira' },
  { id: 'mensagens', label: 'Mensagens', chave: 'modulo_mensagens' },
  { id: 'solicitacoes', label: 'Minhas Solicitações', chave: 'modulo_solicitacoes' },
  { id: 'assinaturas', label: 'Assinaturas Digitais' },
];

// Sub-abas agrupadas em "Meu Financeiro".
// `legado` mantém funcionando links antigos (?tab=meu-salario, atalhos da Visão Geral).
export const SUBABAS_FINANCEIRO = [
  { id: 'salario', label: 'Salário', legado: 'meu-salario' },
  { id: 'vales', label: 'Vales', legado: 'meus-vales' },
  { id: 'comissoes', label: 'Comissões', legado: 'comissoes' },
  { id: 'extrato', label: 'Extrato', legado: 'extrato' },
  { id: 'metas', label: 'Metas', legado: 'metas' },
];

export const SECAO_FINANCEIRO = 'financeiro';

/** Abas antigas que passaram a viver dentro de "Meu Financeiro". */
export function subAbaDaLegado(id) {
  const sub = SUBABAS_FINANCEIRO.find(s => s.legado === id);
  return sub?.id || null;
}

/** Converte um id de aba (novo ou legado) em { aba, subAba }. */
export function resolverAba(id) {
  const subAba = subAbaDaLegado(id);
  if (subAba) return { aba: SECAO_FINANCEIRO, subAba };
  const existe = SECOES_PORTAL.some(s => s.id === id);
  if (!existe) return { aba: 'visao-geral', subAba: 'salario' };
  return { aba: id, subAba: 'salario' };
}

/** Seções ocultas pelo RH para este funcionário (array de ids). */
export function secoesOcultas(funcionario) {
  const ocultas = funcionario?.permissoes_portal?.secoes_ocultas;
  return Array.isArray(ocultas) ? ocultas : [];
}

/**
 * O funcionário pode ver a seção?
 * Padrão = visível: só esconde o que o RH marcou explicitamente em
 * "Permissões do Portal". Assim nenhum colaborador perde acesso ao
 * portal por falta de configuração.
 */
export function secaoVisivel(funcionario, id) {
  const secao = SECOES_PORTAL.find(s => s.id === id);
  if (!secao) return true;
  if (secao.sempre) return true;
  return !secoesOcultas(funcionario).includes(id);
}

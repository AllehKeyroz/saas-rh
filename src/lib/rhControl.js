/**
 * Centro de Controle do RH — definições de funcionalidades e hook de acesso.
 * Importar useRHControl() para verificar se uma funcionalidade está ativa.
 */

import { useQuery } from '@tanstack/react-query';
import { client } from '@/api/client';

// ── Definição de todas as funcionalidades controladas ──────────────────────────
export const RH_FEATURES = [
  {
    chave: 'comissoes_por_periodo',
    descricao: 'Comissões por Período',
    detalhe: 'Permite lançar comissões/gorjetas por período e distribuir entre funcionários.',
    grupo: 'comissoes',
    dependeDe: null,
  },
  {
    chave: 'divisao_automatica_setor',
    descricao: 'Divisão Automática por Setor',
    detalhe: 'Divide automaticamente o valor total entre os setores configurados.',
    grupo: 'comissoes',
    dependeDe: 'comissoes_por_periodo',
  },
  {
    chave: 'exclusao_faltas_atestados',
    descricao: 'Exclusão por Faltas/Atestados',
    detalhe: 'Exclui automaticamente funcionários com faltas ou atestados no período.',
    grupo: 'comissoes',
    dependeDe: 'comissoes_por_periodo',
  },
  {
    chave: 'setores_configuráveis',
    descricao: 'Setores Configuráveis',
    detalhe: 'Permite criar e gerenciar setores com percentuais personalizados.',
    grupo: 'comissoes',
    dependeDe: 'divisao_automatica_setor',
  },
  {
    chave: 'percentuais_configuráveis',
    descricao: 'Percentuais Configuráveis',
    detalhe: 'Permite alterar o percentual de cada setor na divisão das comissões.',
    grupo: 'comissoes',
    dependeDe: 'divisao_automatica_setor',
  },
  {
    chave: 'metas_comissao',
    descricao: 'Metas de Comissão',
    detalhe: 'Define metas mensais de comissão por funcionário ou setor.',
    grupo: 'comissoes',
    dependeDe: 'comissoes_por_periodo',
  },
  {
    chave: 'integracao_vida_financeira',
    descricao: 'Integração com Vida Financeira',
    detalhe: 'Exibe comissão do mês no módulo financeiro pessoal do funcionário.',
    grupo: 'comissoes',
    dependeDe: 'comissoes_por_periodo',
  },
  {
    chave: 'alertas_motivacionais',
    descricao: 'Alertas Motivacionais',
    detalhe: 'Exibe mensagens motivacionais de progresso de meta no portal do funcionário.',
    grupo: 'comissoes',
    dependeDe: 'metas_comissao',
  },
  {
    chave: 'exibir_calculo_comissao_detalhado',
    descricao: 'Relatório Detalhado do Cálculo de Comissão',
    detalhe: 'Permite que os funcionários visualizem como a comissão foi calculada: dias trabalhados, proporção aplicada e impacto de saídas de colaboradores do setor.',
    grupo: 'comissoes',
    dependeDe: 'comissoes_por_periodo',
  },
  {
    chave: 'relatorios_comissao',
    descricao: 'Relatórios de Comissão',
    detalhe: 'Habilita a aba de relatórios de comissão por mês/setor/funcionário.',
    grupo: 'comissoes',
    dependeDe: 'comissoes_por_periodo',
  },
  {
    chave: 'dashboard_comissao',
    descricao: 'Dashboard de Comissão',
    detalhe: 'Exibe o card de comissão no dashboard principal e nos painéis de resumo.',
    grupo: 'comissoes',
    dependeDe: 'comissoes_por_periodo',
  },
  // ── Vida Financeira ────────────────────────────────────────────────────────
  {
    chave: 'vida_financeira',
    descricao: 'Módulo Vida Financeira',
    detalhe: 'Ativa o acesso ao módulo de vida financeira para o funcionário.',
    grupo: 'vida_financeira',
    dependeDe: null,
  },
  {
    chave: 'exibir_comissao_vida_financeira',
    descricao: 'Exibir Comissão na Vida Financeira',
    detalhe: 'Mostra a comissão do mês anterior e atual na visão geral da renda.',
    grupo: 'vida_financeira',
    dependeDe: 'vida_financeira',
  },
  {
    chave: 'renda_base_inicial',
    descricao: 'Renda Base Inicial',
    detalhe: 'Calcula renda base como salário + comissão do mês anterior.',
    grupo: 'vida_financeira',
    dependeDe: 'vida_financeira',
  },
  {
    chave: 'atualizacao_automatica_fechamento',
    descricao: 'Atualização Automática no Fechamento',
    detalhe: 'Atualiza automaticamente a renda para o mês atual após fechamento mensal.',
    grupo: 'vida_financeira',
    dependeDe: 'vida_financeira',
  },
  {
    chave: 'receitas_extras_vida_financeira',
    descricao: 'Receitas Extras',
    detalhe: 'Permite adicionar e visualizar receitas extras (bicos, vendas, etc).',
    grupo: 'vida_financeira',
    dependeDe: 'vida_financeira',
  },
  {
    chave: 'receitas_extras_mini_dre',
    descricao: 'Receitas Extras no Mini DRE',
    detalhe: 'Exibe receitas extras na seção de receitas do Mini DRE.',
    grupo: 'vida_financeira',
    dependeDe: 'receitas_extras_vida_financeira',
  },
  {
    chave: 'receitas_extras_graficos',
    descricao: 'Receitas Extras nos Gráficos',
    detalhe: 'Exibe linha de receitas extras nos gráficos de evolução.',
    grupo: 'vida_financeira',
    dependeDe: 'receitas_extras_vida_financeira',
  },
  // ── Comunicação ────────────────────────────────────────────────────────────
  {
    chave: 'modulo_mensagens',
    descricao: 'Módulo de Mensagens do RH',
    detalhe: 'Ativa o envio de mensagens e comunicados do RH para os funcionários.',
    grupo: 'comunicacao',
    dependeDe: null,
  },
  {
    chave: 'push_notifications',
    descricao: 'Push Notifications',
    detalhe: 'Permite enviar push notifications para os funcionários ao enviar mensagens.',
    grupo: 'comunicacao',
    dependeDe: 'modulo_mensagens',
  },
  {
    chave: 'mensagens_motivacionais',
    descricao: 'Mensagens Motivacionais',
    detalhe: 'Libera o tipo "motivacional" no envio de mensagens.',
    grupo: 'comunicacao',
    dependeDe: 'modulo_mensagens',
  },
  {
    chave: 'comunicados_gerais',
    descricao: 'Comunicados Gerais',
    detalhe: 'Libera os tipos "comunicado", "aviso" e "geral" no envio de mensagens.',
    grupo: 'comunicacao',
    dependeDe: 'modulo_mensagens',
  },
  // ── Solicitações ───────────────────────────────────────────────────────────
  {
    chave: 'modulo_solicitacoes',
    descricao: 'Módulo de Solicitações',
    detalhe: 'Ativa a seção "Minhas Solicitações" no portal do funcionário.',
    grupo: 'solicitacoes',
    dependeDe: null,
  },
  {
    chave: 'solicitacoes_botoes_rapidos',
    descricao: 'Botões Rápidos de Solicitação',
    detalhe: 'Exibe atalhos rápidos para os tipos de solicitação disponíveis.',
    grupo: 'solicitacoes',
    dependeDe: 'modulo_solicitacoes',
  },
  {
    chave: 'push_solicitacoes',
    descricao: 'Push para Solicitações',
    detalhe: 'Envia push notification quando o RH responder uma solicitação.',
    grupo: 'solicitacoes',
    dependeDe: 'modulo_solicitacoes',
  },
  {
    chave: 'solicitacoes_ferias',
    descricao: 'Solicitações de Férias',
    detalhe: 'Permite que funcionários solicitem férias pelo portal.',
    grupo: 'solicitacoes',
    dependeDe: 'modulo_solicitacoes',
  },
  {
    chave: 'solicitacoes_vale',
    descricao: 'Solicitações de Vale',
    detalhe: 'Permite que funcionários solicitem vale pelo portal.',
    grupo: 'solicitacoes',
    dependeDe: 'modulo_solicitacoes',
  },
  {
    chave: 'solicitacoes_banco_horas',
    descricao: 'Solicitações de Banco de Horas',
    detalhe: 'Permite que funcionários solicitem compensação de banco de horas.',
    grupo: 'solicitacoes',
    dependeDe: 'modulo_solicitacoes',
  },
  {
    chave: 'solicitacoes_atestado',
    descricao: 'Envio de Atestados',
    detalhe: 'Permite que funcionários enviem atestados médicos pelo portal.',
    grupo: 'solicitacoes',
    dependeDe: 'modulo_solicitacoes',
  },
  {
    chave: 'solicitacoes_documentos',
    descricao: 'Solicitações de Documentos',
    detalhe: 'Permite que funcionários solicitem documentos pelo portal.',
    grupo: 'solicitacoes',
    dependeDe: 'modulo_solicitacoes',
  },
  {
    chave: 'solicitacoes_outros',
    descricao: 'Outras Solicitações',
    detalhe: 'Permite solicitações livres de qualquer tipo.',
    grupo: 'solicitacoes',
    dependeDe: 'modulo_solicitacoes',
  },
];

export const GRUPOS = {
  comissoes: { label: 'Módulo de Comissões', cor: 'text-primary' },
  vida_financeira: { label: 'Vida Financeira', cor: 'text-green-600' },
  comunicacao: { label: 'Módulo de Comunicação', cor: 'text-blue-600' },
  solicitacoes: { label: 'Módulo de Solicitações', cor: 'text-purple-600' },
};

// ── Hook principal ─────────────────────────────────────────────────────────────
export function useRHControl() {
  const { data: configs = [], isLoading } = useQuery({
    queryKey: ['configuracoes_rh'],
    queryFn: () => client.entities.ConfiguracoesRH.list(),
    staleTime: 0,
  });

  /**
   * Verifica se uma funcionalidade está ativa.
   * Se não houver registro no banco, retorna false por padrão.
   */
  function isAtiva(chave) {
    const cfg = configs.find(c => c.chave === chave);
    return cfg?.ativa === true;
  }

  return { isAtiva, configs, isLoading };
}
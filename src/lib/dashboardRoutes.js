// Configuração centralizada de rotas do dashboard
export const DASHBOARD_CARD_ROUTES = {
  funcionariosAtivos: {
    path: '/funcionarios',
    label: 'Ver lista de funcionários',
    description: 'Funcionários Ativos'
  },
  solicitacoesPendentes: {
    path: '/solicitacoes',
    label: 'Abrir solicitações pendentes',
    description: 'Solicitações Pendentes'
  },
  feriasVencidas: {
    path: '/funcionarios?tab=ferias',
    label: 'Ver férias e banco de horas',
    description: 'Férias Vencidas'
  },
  docsVencendo: {
    path: '/assinaturas-digitais',
    label: 'Gerenciar documentos vencendo',
    description: 'Documentos Vencendo'
  },
  valesMes: {
    path: '/lancamentos',
    label: 'Ver vales lançados',
    description: 'Vales no Mês'
  },
  custoFolha: {
    path: '/fechamento',
    label: 'Ver fechamento mensal',
    description: 'Custo da Folha'
  },
  comissaoTotal: {
    path: '/comissoes',
    label: 'Ver histórico de comissões',
    description: 'Comissão Total'
  }
};
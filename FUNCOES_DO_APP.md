# Lista de Funções do Sistema — RHDTalia

## 1. Módulo: Dashboard / Painel Principal

| # | Função | Descrição | Tela |
|---|--------|-----------|------|
| 1.1 | Painel RH | Visão geral com cards de KPIs: funcionários ativos, solicitações pendentes, férias vencidas, docs vencendo, vales do mês, consignados, custo folha, comissão total | `/` |
| 1.2 | Alertas | Banner de alertas: férias vencidas, documentos vencendo | `/` |
| 1.3 | Indicadores Financeiros | Indicadores consolidados de folha | `/` |
| 1.4 | Ações Rápidas | Botões de atalho para: férias, documentos, advertência, mensagem, solicitações, fechamento, comissões | `/` |
| 1.5 | Gráfico Custos por Setor | Barra horizontal com custo por setor | `/` |
| 1.6 | Gráfico Evolução Folha | Linha com evolução da folha nos últimos 6 meses | `/` |
| 1.7 | Gráfico Solicitações por Tipo | Pizza com distribuição de solicitações | `/` |
| 1.8 | Gráfico Absenteísmo | Barra com faltas por setor | `/` |

---

## 2. Módulo: Funcionários

| # | Função | Descrição | Tela |
|---|--------|-----------|------|
| 2.1 | Listar Funcionários | Grade de cards com nome, foto, função, setor, salário, datas | `/funcionarios` |
| 2.2 | Buscar Funcionários | Busca por nome, função ou setor | `/funcionarios` |
| 2.3 | Filtrar por Setor | Filtro dropdown por setor | `/funcionarios` |
| 2.4 | Filtrar por Status | Filtro: todos, ativos, inativos | `/funcionarios` |
| 2.5 | Filtrar por Período | Filtro por período de admissão (data início/data fim) | `/funcionarios` |
| 2.6 | Ordenar | Ordenar por nome ou data de admissão | `/funcionarios` |
| 2.7 | Abas Ativos/Inativos | Tabs separando funcionários ativos e inativos | `/funcionarios` |
| 2.8 | Cadastrar Funcionário | Modal com formulário completo (nome, email, telefone, função, setor, datas, salário, foto, comissão) | `/funcionarios` |
| 2.9 | Editar Funcionário | Modal com formulário preenchido | `/funcionarios` |
| 2.10 | Upload de Foto | Upload de imagem e armazenamento automático | `/funcionarios` |
| 2.11 | Importar Funcionários | Modal de importação em lote | `/funcionarios` |
| 2.12 | Pasta de Documentos | Modal com documentos por funcionário (enviar, visualizar, baixar, deletar) | `/funcionarios` |
| 2.13 | Permissões do Portal | Modal configurando o que o funcionário vê no portal: função, setor, salário, vales, extrato, comissões | `/funcionarios` |
| 2.14 | Documentos por Funcionário (tab) | Tabela de documentos agrupados por funcionário | `/funcionarios?tab=documentos` |
| 2.15 | Férias e Banco de Horas (tab) | Tabela de férias e banco de horas por funcionário | `/funcionarios?tab=ferias` |
| 2.16 | Visão 360° | Página detalhada com 17 abas: dados, documentos, pagamentos, vales, descontos, adicionais, comissões, fechamentos, extrato financeiro, solicitações, mensagens, advertências, assinaturas, férias, banco de horas, auditoria, logs | `/funcionarios/:id/360` |

---

## 3. Módulo: Lançamentos Financeiros

| # | Função | Descrição | Tela |
|---|--------|-----------|------|
| 3.1 | Listar Lançamentos | Resumo mensal por funcionário com descontos, adicionais, salário líquido | `/lancamentos` |
| 3.2 | Buscar Funcionário | Busca por nome/função/setor | `/lancamentos` |
| 3.3 | Selecionar Mês | Dropdown de mês/ano para filtrar | `/lancamentos` |
| 3.4 | Criar Lançamento | Modal: funcionário, tipo, valor, descrição, comprovante, data | `/lancamentos` |
| 3.5 | Importar Lançamentos | Modal de importação em lote | `/lancamentos` |
| 3.6 | Detalhes do Funcionário | Modal com lista de lançamentos do mês (data, tipo, descrição, valor), função de editar/excluir | `/lancamentos` |
| 3.7 | Filtro por Tipo | Filtro por consignado, convênio, consumo, vale parcelado (via URL) | `/lancamentos?tipo=consignado` |

---

## 4. Módulo: Fechamento Mensal

| # | Função | Descrição | Tela |
|---|--------|-----------|------|
| 4.1 | Tabela de Fechamento | Tabela com todos funcionários: salário base, descontos, adicionais, comissão, salário líquido, lançamentos | `/fechamento` |
| 4.2 | Selecionar Mês | Dropdown de mês/ano | `/fechamento` |
| 4.3 | Salário Líquido Calculável | Células editáveis do salário líquido | `/fechamento` |
| 4.4 | Fechamento Individual | Botão para fechar/calcular funcionário específico | `/fechamento` |
| 4.5 | Reprocessar Individual | Botão para reprocessar funcionário específico | `/fechamento` |
| 4.6 | Reabrir | Botão para reabrir funcionário já fechado | `/fechamento` |
| 4.7 | Fechar Todos | Botão para fechar todos pendentes | `/fechamento` |
| 4.8 | Exportar PDF | Exportação do demonstrativo individual em PDF | `/fechamento` |
| 4.9 | Exportar Contracheques (massa) | Exportação em lote de contracheques em PDF | `/fechamento` |

---

## 5. Módulo: Comissões

| # | Função | Descrição | Tela |
|---|--------|-----------|------|
| 5.1 | Lançar Comissão | Formulário: período, valor total, observação | `/comissoes` |
| 5.2 | Calcular Divisão Automática | Calcula divisão por setores (padrão ou configuráveis) | `/comissoes` |
| 5.3 | Confirmar e Gerar Comissões | Salva comissão e distribuição por funcionário | `/comissoes` |
| 5.4 | Adicionar Dias Ausentes | Input de dias ausentes por funcionário (redução proporcional) | `/comissoes` |
| 5.5 | Relatório de Comissões | Relatório por mês/setor/funcionário com totalizadores | `/comissoes` |
| 5.6 | Histórico de Comissões | Lista de comissões lançadas e correções | `/comissoes` |
| 5.7 | Configurar Setores | CRUD de setores de comissão com percentuais e palavras-chave | `/comissoes` |
| 5.8 | Metas de Comissão | Definição de metas mensais por funcionário/setor | `/comissoes` |
| 5.9 | Copiar Metas do Mês Anterior | Botão para copiar metas | `/comissoes` |
| 5.10 | Corrigir Valores | Modal de correção de valores individuais | `/comissoes` |
| 5.11 | Ver Histórico de Alterações | Timeline de alterações feitas na comissão | `/comissoes` |

---

## 6. Módulo: Relatórios

| # | Função | Descrição | Tela |
|---|--------|-----------|------|
| 6.1 | Relatório Geral | Relatório geral de todos funcionários por mês | `/relatorios` |
| 6.2 | Relatório Individual | Relatório específico por funcionário | `/relatorios` |
| 6.3 | Comparativo | Comparação entre meses diferentes | `/relatorios` |
| 6.4 | Limites de Vales | Relatório de limites de vales por funcionário | `/relatorios` |
| 6.5 | Exportar Dados | Exportação de dados para planilha (xlsx) | `/relatorios` |

---

## 7. Módulo: Assinaturas Digitais (GovBR)

| # | Função | Descrição | Tela |
|---|--------|-----------|------|
| 7.1 | Painel de Assinaturas | Cards com: enviados, aguardando, assinados, expirados | `/assinaturas-digitais` |
| 7.2 | Abas de Status | Tabs: painel, aguardando, assinados, histórico | `/assinaturas-digitais` |
| 7.3 | Enviar Documento | Dialog: selecionar funcionário, modelo, PDF, nome, descrição → envia para assinatura GovBR + email | `/assinaturas-digitais` |
| 7.4 | Preview de Modelo | Preview automático com variáveis preenchidas (nome, CPF, salário, etc.) | `/assinaturas-digitais` |
| 7.5 | Upload de PDF | Upload de PDF com validação de tamanho/tipo | `/assinaturas-digitais` |
| 7.6 | Reenviar Link | Reenvia link de assinatura para o funcionário | `/assinaturas-digitais` |
| 7.7 | Cancelar Assinatura | Cancelamento de documento pendente | `/assinaturas-digitais` |
| 7.8 | Download PDF Original/Assinado | Download do documento original ou já assinado | `/assinaturas-digitais` |
| 7.9 | Drawer de Auditoria | Painel lateral com histórico de eventos do documento | `/assinaturas-digitais` |

---

## 8. Módulo: Modelos de Documentos

| # | Função | Descrição | Tela |
|---|--------|-----------|------|
| 8.1 | Gerenciar Modelos | Lista de modelos de documento com CRUD | `/modelos-documentos` |
| 8.2 | Criar/Editar Modelo | Formulário: nome, descrição, conteúdo HTML, PDF base, finalidade, pasta destino | `/modelos-documentos` |
| 8.3 | Gerenciar Finalidades | Lista de finalidades de documento com CRUD | `/modelos-documentos` |
| 8.4 | Criar/Editar Finalidade | Formulário: nome, descrição | `/modelos-documentos` |
| 8.5 | Ativar/Desativar Modelo | Toggle de ativo/inativo | `/modelos-documentos` |

---

## 9. Módulo: Advertências

| # | Função | Descrição | Tela |
|---|--------|-----------|------|
| 9.1 | Listar Advertências | Lista com funcionário, data, tipo, motivo | `/advertencias` |
| 9.2 | Buscar | Busca por funcionário | `/advertencias` |
| 9.3 | Nova Advertência | Modal: funcionário, tipo, motivo, descrição, testemunhas | `/advertencias` |
| 9.4 | Deletar Advertência | Exclusão de registro | `/advertencias` |

---

## 10. Módulo: Comunicação

| # | Função | Descrição | Tela |
|---|--------|-----------|------|
| 10.1 | Enviar Mensagem | Formulário: tipo (comunicado, motivacional, aviso, geral), assunto, mensagem, destinatários (todos/funcionário específico) | `/comunicacao` |
| 10.2 | Push Notification | Envio de push notification para funcionários | `/comunicacao` |
| 10.3 | Histórico de Mensagens | Lista de mensagens enviadas com status | `/comunicacao` |
| 10.4 | Relatório de Visualizações | Modal com lista de quem visualizou a mensagem | `/comunicacao` |

---

## 11. Módulo: Solicitações

| # | Função | Descrição | Tela |
|---|--------|-----------|------|
| 11.1 | Listar Solicitações | Lista de solicitações dos funcionários com status | `/solicitacoes` |
| 11.2 | Filtrar | Filtros por tipo, status, funcionário | `/solicitacoes` |
| 11.3 | Solicitações Urgentes | Card destacado com solicitações urgentes | `/solicitacoes` |
| 11.4 | Aprovar/Recusar | Aprovação ou recusa inline com justificativa | `/solicitacoes` |
| 11.5 | Resposta em Lote | Modal para responder múltiplas solicitações de uma vez | `/solicitacoes` |
| 11.6 | Exportar | Exportar lista para planilha | `/solicitacoes` |

---

## 12. Módulo: Gestão de Usuários

| # | Função | Descrição | Tela |
|---|--------|-----------|------|
| 12.1 | Listar Usuários | Tabela de usuários com email, role, status | `/usuarios` |
| 12.2 | Editar Role | Modal para alterar permissão: admin, user, funcionario, consulta | `/usuarios` |
| 12.3 | Convidar Usuário | Modal de convite por email | `/usuarios` |
| 12.4 | Ativar/Desativar | Toggle de ativo/inativo | `/usuarios` |
| 12.5 | Vincular Funcionário | Vincular usuário a um funcionário existente | `/usuarios` |

---

## 13. Módulo: Auditoria

| # | Função | Descrição | Tela |
|---|--------|-----------|------|
| 13.1 | Log de Auditoria Geral | Lista com ações: criação, edição, exclusão de funcionários e lançamentos | `/auditoria` |
| 13.2 | Detalhes da Ação | Expansão com JSON de dados anteriores e novos | `/auditoria` |

---

## 14. Módulo: Auditoria de Documentos

| # | Função | Descrição | Tela |
|---|--------|-----------|------|
| 14.1 | Log de Auditoria de Documentos | Lista com ações de documentos: envio, assinatura, cancelamento, expiração | `/auditoria-documentos` |
| 14.2 | Filtros | Filtros por módulo, origem, ação | `/auditoria-documentos` |
| 14.3 | Detalhes do Evento | Modal com payload completo do evento | `/auditoria-documentos` |

---

## 15. Módulo: Configurações

| # | Função | Descrição | Tela |
|---|--------|-----------|------|
| 15.1 | Setores | CRUD de setores da empresa (nome, descrição, ativo) | `/configuracoes?tab=setores` |
| 15.2 | Funções | CRUD de cargos (nome, descrição, ativo) | `/configuracoes?tab=funcoes` |
| 15.3 | Tipos de Lançamento | CRUD de tipos de lançamento financeiro (nome, categoria, descrição, ativo) | `/configuracoes?tab=tipos` |
| 15.4 | Aparência | Configuração de tema/aparência | `/configuracoes?tab=aparencia` |
| 15.5 | Notificações | Configuração de notificações push | `/configuracoes?tab=notificacoes` |
| 15.6 | Modelos de Advertência | CRUD de templates de advertência | `/configuracoes?tab=modelos-advertencia` |
| 15.7 | Modelos de Documentos | CRUD de templates de documentos (atalho) | `/configuracoes?tab=modelos-documentos` |
| 15.8 | Assinatura GovBR | Configuração de integração GovBR | `/configuracoes?tab=govbr` |
| 15.9 | Backups | Histórico e gerenciamento de backups | `/configuracoes?tab=backups` |
| 15.10 | Limite de Vales (40%) | Configuração de limite de 40% para vales | `/configuracoes?tab=limite-vales` |

---

## 16. Módulo: Centro de Controle RH

| # | Função | Descrição | Tela |
|---|--------|-----------|------|
| 16.1 | Alertas RH | Alertas de segurança e compliance | `/centro-controle-rh` |
| 16.2 | Permissões | Gerenciamento de permissões do sistema | `/centro-controle-rh` |
| 16.3 | Integração Vida Financeira | Configuração de integração do módulo de vida financeira | `/centro-controle-rh` |
| 16.4 | Módulos | Toggles para ativar/desativar módulos do sistema | `/centro-controle-rh` |
| 16.5 | Modelos | Gerenciamento de modelos do sistema | `/centro-controle-rh` |

---

## 17. Módulo: Portal do Funcionário

| # | Função | Descrição | Tela |
|---|--------|-----------|------|
| 17.1 | Visão Geral | Dashboard pessoal do funcionário com saldo de vales, comissões, gastos | `/portal` |
| 17.2 | Meus Dados | Visualização dos dados cadastrais (conforme permissões) | `/portal` |
| 17.3 | Meu Salário | Visualização do salário e contracheques | `/portal` |
| 17.4 | Meus Vales | Solicitação e acompanhamento de vales | `/portal` |
| 17.5 | Extrato Mensal | Extrato completo de lançamentos do mês | `/portal` |
| 17.6 | Vida Financeira | Dashboard financeiro pessoal (gastos, receitas, saldo) | `/portal` |
| 17.7 | Minhas Comissões | Visualização de comissões recebidas | `/portal` |
| 17.8 | Metas | Acompanhamento de metas de comissão | `/portal` |
| 17.9 | Mensagens | Caixa de mensagens do RH | `/portal` |
| 17.10 | Minhas Solicitações | Abertura e acompanhamento de solicitações | `/portal` |
| 17.11 | Assinaturas Digitais | Visualização e assinatura de documentos pendentes | `/portal` |
| 17.12 | Mini DRE | Demonstrativo de resultados financeiros | `/portal` |

---

## 18. Módulo: Vida Financeira (Full)

| # | Função | Descrição | Tela |
|---|--------|-----------|------|
| 18.1 | Dashboard Financeiro | Visão geral com saldo, gastos fixos/variáveis, investimentos, receitas extras | `/vida-financeira` |
| 18.2 | Resumo Salário | Card com resumo de renda (salário + comissão) | `/vida-financeira` |
| 18.3 | Alerta Financeiro | Alerta de limite de gastos (verde, amarelo, laranja, vermelho) | `/vida-financeira` |
| 18.4 | Meus Gastos | CRUD de gastos pessoais (fixos, variáveis, investimentos) | `/vida-financeira` |
| 18.5 | Minhas Assinaturas | CRUD de assinaturas mensais (streaming, apps, etc.) | `/vida-financeira` |
| 18.6 | Minhas Dívidas | CRUD de dívidas com valor total, parcelas, juros | `/vida-financeira` |
| 18.7 | Metas e Objetivos | CRUD de metas financeiras com progresso | `/vida-financeira` |
| 18.8 | Simuladores Financeiros | Simulador de investimentos e economia | `/vida-financeira` |
| 18.9 | Educação Financeira | Conteúdo educativo sobre finanças | `/vida-financeira` |

---

## 19. Módulo: Espelho do Portal

| # | Função | Descrição | Tela |
|---|--------|-----------|------|
| 19.1 | Espelho do Funcionário | Visualização read-only de tudo que o funcionário vê no portal | `/espelho-portal` |
| 19.2 | Seletor de Funcionário | Dropdown para selecionar qual funcionário espelhar | `/espelho-portal` |

---

## 20. Módulo: Logs Financeiros

| # | Função | Descrição | Tela |
|---|--------|-----------|------|
| 20.1 | Log de Erros | Visualização de erros persistidos do sistema financeiro | `/logs-financeiros` |
| 20.2 | Erros por Sessão | Histórico de erros da sessão atual | `/logs-financeiros` |
| 20.3 | Notificação ao Admin | Botão para notificar administradores sobre erros | `/logs-financeiros` |

---

## 21. Funções de Background / Serverless

| # | Função | Descrição | Gatilho |
|---|--------|-----------|---------|
| 21.1 | Convidar Usuário | Envia email de convite para novo usuário | Manual (ação RH) |
| 21.2 | Notificar Aniversários | Envia notificações de aniversariantes do dia | Cron (diário) |
| 21.3 | Calcular Limite Vale Mensal | Calcula 40% do salário como limite de vale | Mensal |
| 21.4 | Verificar Limite Vale | Valida se funcionário pode solicitar vale | On-demand |
| 21.5 | Notificar Erros Admin | Alerta administradores sobre erros do sistema | On-demand |
| 21.6 | Exportar Contracheques Massa | Gera PDFs de contracheques em lote | Manual (ação RH) |
| 21.7 | Gerar Resumo PDF Vida Financeira | Gera PDF com resumo financeiro pessoal | Manual (funcionário) |
| 21.8 | Enviar Email (documento) | Notifica funcionário sobre novo documento para assinar | Automático |

---

## 22. Funções Transversais

| # | Função | Descrição |
|---|--------|-----------|
| 22.1 | Autenticação | Login, logout, gerenciamento de sessão com roles (admin, user, funcionario, consulta) |
| 22.2 | Controle de Acesso | Verificação de permissões por role em cada ação |
| 22.3 | Auditoria | Registro imutável de todas as ações: criar, editar, excluir |
| 22.4 | Upload de Arquivos | Upload de fotos, PDFs, comprovantes |
| 22.5 | Notificações Push | Envio de push notifications para funcionários |
| 22.6 | Envio de Email | Notificações por email (documentos, convites) |
| 22.7 | Centro de Controle | Toggle de funcionalidades: comissões, comunicação, solicitações, vida financeira |
| 22.8 | Navegação Segura | Validação e auditoria de rotas |
| 22.9 | Exportação PDF | Geração de demonstrativos, fechamentos, contracheques |
| 22.10 | Importação em Lote | Importação de funcionários e lançamentos via planilha |

---

**Total: ~98 funções** distribuídas em 20 módulos + 1 de background/transversal.

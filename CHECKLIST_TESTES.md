# Checklist de Testes — RHDTalia

## 1. Autenticação

- [x] Acessar /login  → exibe formulário de login
- [x] Acessar /register → exibe formulário de criação de conta
- [x] Criar conta → cria usuário no Firebase Auth + documento em users/{uid}
- [x] Fazer login → redireciona para / sem loop infinito
- [x] Logout → desloga e redireciona para /login
- [x] Acessar / sem login → redireciona para /login
- [x] Recarregar página logado → mantém sessão ativa

## 2. Dashboard

- [x] / → Dashboard carrega sem erros
- [x] Cards de KPIs → funcionários ativos, solicitações pendentes, etc.
- [ ] Alertas → banner dinâmico baseado em dados reais
- [ ] Gráficos → Custos por Setor, Evolução Folha, Solicitações por Tipo

## 3. Funcionários

- [ ] /funcionarios → lista carrega
- [ ] Buscar, filtrar, ordenar
- [ ] Criar/editar funcionário
- [ ] Upload de foto
- [ ] Importar CSV
- [ ] Pasta de documentos
- [ ] Permissões do portal
- [ ] Visão 360°

## 4. Lançamentos Financeiros

- [ ] /lancamentos → lista carrega
- [ ] Criar lançamento com parcelamento
- [ ] Importar CSV
- [ ] Limite de vales em tempo real

## 5. Fechamento Mensal

- [ ] /fechamento → tabela carrega
- [ ] Processar/reprocessar/reabrir
- [ ] Exportar demonstrativo PDF

## 6. Comissões

- [ ] /comissoes → página carrega
- [ ] Lançar, calcular divisão, confirmar
- [ ] Relatório, histórico, metas, setores

## 7. Demais Módulos

- [ ] Relatórios, Assinaturas, Modelos, Advertências
- [ ] Comunicação, Solicitações, Usuários
- [ ] Auditoria, Configurações
- [ ] Centro de Controle RH
- [ ] Vida Financeira
- [ ] Espelho do Portal
- [ ] Logs Financeiros

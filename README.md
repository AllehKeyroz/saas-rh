# RHDTalia — Sistema de Gestão de Recursos Humanos

Sistema completo de RH para gestão de funcionários, folha de pagamento, comissões, assinaturas digitais, comunicação interna e vida financeira dos colaboradores.

---

## Stack

| Camada | Tecnologia |
|--------|-----------|
| Frontend | React 18 + Vite 6 |
| UI | shadcn/ui + Tailwind CSS + Radix UI + Lucide Icons |
| Estado | TanStack React Query |
| Navegação | React Router v6 |
| Backend | Firebase (Auth, Firestore, Storage) |
| Build | Vite + esbuild |
| PDF | jsPDF |
| Planilhas | SheetJS (xlsx) |

---

## Estrutura de Pastas

```
src/
├── api/
│   └── client.js            ← Cliente Firebase (proxy)
├── firebase/
│   ├── config.js             ← Init Firebase
│   ├── auth.js               ← Auth (login, logout, onAuthChange)
│   ├── db.js                 ← Entity service genérico (32 coleções)
│   ├── storage.js            ← Upload de arquivos
│   └── email.js              ← Envio de email
├── lib/                      ← Utilitários e lógica de negócio
├── hooks/                    ← React hooks
├── pages/                    ← Páginas do sistema
├── components/               ← Componentes React
│   ├── ui/                   ← shadcn/ui components
│   ├── layout/               ← Sidebar, AppLayout
│   ├── funcionarios/         ← CRUD, documentos, permissões
│   ├── lancamentos/          ← Lançamentos financeiros
│   ├── comissoes/            ← Comissões e distribuição
│   ├── fechamento/           ← Fechamento mensal
│   ├── relatorios/           ← Relatórios
│   ├── assinaturas/          ← Assinaturas digitais
│   ├── portal/               ← Portal do funcionário
│   ├── solicitacoes/         ← Solicitações
│   ├── vidafinanceira/       ← Vida financeira pessoal
│   ├── configuracoes/        ← Configurações do sistema
│   └── dashboard-rh/         ← Dashboard RH
```

---

## Módulos e Funcionalidades

### 1. Dashboard RH (`/`)
Visão geral com KPIs:
- **Funcionários Ativos** — contagem do Firestore
- **Solicitações Pendentes** — aguardando aprovação
- **Férias Vencidas** — funcionários há +14 meses sem férias
- **Documentos Vencendo** — assinaturas a expirar em 5 dias
- **Vales do Mês** — total de vales/adiantamentos no período
- **Consignados Ativos** — funcionários com crédito consignado
- **Comissão Total** — comissões confirmadas do mês
- Gráficos: custos por setor, solicitações por tipo, evolução folha

### 2. Funcionários (`/funcionarios`)
- **Listagem** — grade com foto, nome, função, setor, salário
- **Filtros** — busca, setor, status ativo/inativo, período de admissão
- **CRUD** — cadastro completo com foto, dados pessoais, salário, comissão
- **Importação CSV** — upload em lote com validação
- **Pasta de Documentos** — upload e gestão de arquivos por funcionário
- **Permissões do Portal** — controle do que cada funcionário vê
- **Documentos por Funcionário** — visão tabular
- **Férias e Banco de Horas** — registro por funcionário
- **Visão 360°** (`/funcionarios/:id/360`) — perfil completo com 17 abas de dados

### 3. Lançamentos Financeiros (`/lancamentos`)
- **Resumo Mensal** — descontos, adicionais e salário líquido por funcionário
- **CRUD** — lançamento de vales, adiantamentos, convênios, comissões, ajustes
- **Parcelamento** — vale e crédito consignado em até 12x
- **Limite em Tempo Real** — alerta visual de 40% do salário
- **Importação CSV** — upload em lote
- **Filtro por Tipo** — consignado, convênio, consumo, vale parcelado

### 4. Fechamento Mensal (`/fechamento`)
- **Tabela de Fechamento** — todos funcionários com salário, descontos, adicionais
- **Processamento Individual/Em Lote** — calcular salário líquido
- **Reprocessar** — recalcular funcionário específico
- **Reabrir** — desfazer fechamento
- **Exportação** — demonstrativo individual PDF + contracheques em massa

### 5. Comissões (`/comissoes`)
- **Lançamento** — período, valor total, observação
- **Divisão Automática** — por setores (padrão ou configuráveis)
- **Proporcionalidade** — dias ausentes por funcionário
- **Relatório** — por mês/setor/funcionário
- **Metas** — definição de metas mensais com progresso
- **Setores Configuráveis** — percentuais e palavras-chave
- **Histórico** — timeline de alterações

### 6. Relatórios (`/relatorios`)
- **Geral do Mês** — consolidado de todos funcionários
- **Individual** — por funcionário selecionado
- **Comparativo** — entre meses
- **Limites de Adiantamento** — relatório de utilização
- **Exportação** — PDF e Excel

### 7. Assinaturas Digitais (`/assinaturas-digitais`)
- **Painel** — cards com enviados, aguardando, assinados, expirados
- **Envio** — seleciona funcionário, modelo, PDF, gera link GovBR
- **Modelos** — templates HTML com variáveis (`{{nome}}`, `{{cpf}}`, etc.)
- **Reenvio/Cancelamento** — gestão de documentos pendentes
- **Auditoria** — histórico completo de eventos

### 8. Modelos de Documentos (`/modelos-documentos`)
- **CRUD Modelos** — templates com conteúdo HTML, PDF base, finalidade
- **CRUD Finalidades** — categorias de documento

### 9. Advertências (`/advertencias`)
- **CRUD** — registro de advertências por funcionário

### 10. Comunicação (`/comunicacao`)
- **Envio de Mensagens** — comunicados, avisos, motivacionais
- **Push Notifications** — notificação para funcionários
- **Histórico** — mensagens enviadas com relatório de visualização

### 11. Solicitações (`/solicitacoes`)
- **Gestão** — lista com filtros por tipo, status, funcionário
- **Aprovação/Recusa** — ação inline com justificativa
- **Resposta em Lote** — modal para múltiplas respostas
- **Solicitações Urgentes** — destaque visual
- **Exportação** — para planilha

### 12. Usuários (`/usuarios`)
- **Listagem** — usuários do sistema com email e role
- **Roles** — admin (tudo), user (RH), funcionario (portal), consulta (leitura)
- **Convidar** — envio de convite por email
- **Ativar/Desativar** — controle de acesso

### 13. Auditoria (`/auditoria`)
- **Log Geral** — todas as ações: criar, editar, excluir
- **Filtros** — por módulo, ação, usuário
- **Detalhes** — JSON comparativo antes/depois

### 14. Auditoria de Documentos (`/auditoria-documentos`)
- **Log Específico** — eventos de documentos e assinaturas
- **Filtros** — módulo, origem, ação
- **Detalhes** — payload completo do evento

### 15. Configurações (`/configuracoes`)
- **Setores** — CRUD de departamentos
- **Funções** — CRUD de cargos
- **Tipos de Lançamento** — CRUD de categorias financeiras
- **Aparência** — tema, cores, logo da empresa
- **Notificações** — configuração de push
- **Modelos de Advertência** — templates
- **Modelos de Documentos** — atalho
- **Assinatura GovBR** — credenciais de integração
- **Backups** — exportação completa dos dados
- **Limite de Vales (40%)** — configuração de teto

### 16. Centro de Controle RH (`/centro-controle-rh`)
- **Alertas** — configuração de alertas automáticos
- **Permissões** — controle por cargo
- **Vida Financeira** — integração do módulo
- **Módulos** — toggle de funcionalidades (comissões, comunicação, etc.)
- **Modelos** — atalho para modelos de documento

### 17. Portal do Funcionário (`/portal`)
- **Visão Geral** — dashboard pessoal com saldo de vales
- **Meus Dados** — informações cadastrais
- **Meu Salário** — contracheques e histórico
- **Meus Vales** — extrato e solicitação
- **Extrato Mensal** — lançamentos do período
- **Vida Financeira** — gestão financeira pessoal
- **Comissões** — visualização de recebidos
- **Metas** — progresso de comissão
- **Mensagens** — caixa de entrada do RH
- **Solicitações** — abertura e acompanhamento
- **Assinaturas** — documentos pendentes

### 18. Vida Financeira (`/vida-financeira`)
- **Dashboard Financeiro** — saldo, gastos, receitas, investimentos
- **Gastos** — CRUD de gastos fixos, variáveis, investimentos
- **Assinaturas** — streaming, apps, etc.
- **Dívidas** — controle com parcelas e juros
- **Metas** — objetivos financeiros com progresso
- **Simuladores** — simulação de investimentos
- **Educação** — conteúdo educativo

### 19. Espelho do Portal (`/espelho-portal`)
- **Visualização Read-Only** — exata réplica do que o funcionário vê
- **Seletor** — escolhe funcionário para espelhar
- **Finalidade** — RH valida permissões e visibilidade

### 20. Logs Financeiros (`/logs-financeiros`)
- **Erros do Sistema** — persistidos no Firestore
- **Histórico da Sessão** — logs locais do navegador
- **Notificação** — marca erros como notificados

---

## Autenticação

| Rota | Função |
|------|--------|
| `/login` | Login com email/senha (Firebase Auth) |
| `/register` | Criar conta (role: admin) |

Roles disponíveis:
- **admin** — acesso total
- **user** — RH (CRUD operacional)
- **funcionario** — apenas portal próprio
- **consulta** — somente leitura

---

## Configuração do Firebase

### .env
```
VITE_FIREBASE_API_KEY=...
VITE_FIREBASE_AUTH_DOMAIN=...
VITE_FIREBASE_PROJECT_ID=rhdtalia
VITE_FIREBASE_STORAGE_BUCKET=...
VITE_FIREBASE_MESSAGING_SENDER_ID=...
VITE_FIREBASE_APP_ID=...
VITE_FIREBASE_MEASUREMENT_ID=...
VITE_LOGIN_URL=/login
```

### Firestore Database
- Nome: `rhdtalia`
- Região: `southamerica-east1`
- 32 coleções (criação automática no primeiro insert)

### Regras de Segurança
Aplicar `firestore.rules` no Console Firebase:
```
Firebase Console → Firestore → Regras → Publicar
```

---

## Comandos

```bash
npm install          # Instalar dependências
npm run dev          # Servidor de desenvolvimento
npm run build        # Build de produção
npm run preview      # Preview do build
npm run lint         # ESLint
npm run typecheck    # TypeScript check
```

O projeto original (pré-Firebase) está preservado em `BOLD/`.

## Funcionalidades Pendentes (Stubs)

Componentes marcados com ⚠️ amarelo no sistema:
- **Funcionarios 360°**: Advertências, Férias, Banco de Horas, Avaliações, Histórico Salarial, Histórico Função/Setor, Auditoria, Anexos
- **Cloud Functions** (para deploy futuro): `sendEmail`, `notifyAdminOfError`, `calcularLimiteValeMensal`, `exportarContrachequesMassa` (parcial), `gerarResumoPdfVidaFinanceira` (parcial)

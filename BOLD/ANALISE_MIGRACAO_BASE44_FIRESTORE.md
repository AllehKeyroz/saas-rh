# Análise Completa de Migração: Base44 → Firestore

## 1. Visão Geral do Sistema

**Nome:** RH System (Sistema de Recursos Humanos)  
**Stack:** React 18 + Vite + Tailwind CSS + Base44 BaaS  
**Entidades:** 32 coleções no banco de dados  
**Funções Serverless:** 7 funções backend  
**Autenticação:** Gerenciada pelo Base44 (OAuth, tokens, roles)  
**Armazenamento:** Upload de arquivos via Base44 Core  

---

## 2. Entidades Base44 → Coleções Firestore

### 2.1 Entidades CRUD Puras (32 coleções)

| # | Entidade | Uso | CRUD |
|---|----------|-----|------|
| 1 | `Funcionarios` | Cadastro central de funcionários | list, create, update |
| 2 | `FichaFinanceira` | Lançamentos financeiros individuais | list, create, update |
| 3 | `FechamentoMensal` | Fechamento mensal de folha | list, create, update, delete |
| 4 | `ComissoesGorjetas` | Períodos de comissão lançados | list, create |
| 5 | `ComissaoPorFuncionario` | Comissão individual por período | list, create, bulkCreate |
| 6 | `SetoresComissao` | Configuração de setores para comissão | list, create, update, delete |
| 7 | `MetaComissao` | Metas de comissão | list, create, update, delete |
| 8 | `HistoricoAlteracaoComissao` | Histórico de alterações | list |
| 9 | `Setor` | Departamentos da empresa | list, create, update, delete |
| 10 | `Funcao` | Cargos/funções | list, create, update, delete |
| 11 | `TipoLancamento` | Tipos de lançamento financeiro | list, create, update, delete |
| 12 | `ConfiguracoesRH` | Toggles de funcionalidades | list |
| 13 | `ConfiguracaoNotificacao` | Configurações de notificação | list, create, update |
| 14 | `ConfiguracaoAparencia` | Tema/aparência | list, create, update |
| 15 | `BackupRegistro` | Registros de backup | list |
| 16 | `LogAuditoria` | Log de auditoria geral | create |
| 17 | `AuditoriaDocumentos` | Auditoria de documentos | create |
| 18 | `ApplicationError` | Erros do sistema | create |
| 19 | `LogNotificacao` | Log de notificações enviadas | list |
| 20 | `AssinaturaDigital` | Assinaturas digitais (GovBR) | list, create, update |
| 21 | `ModeloDocumento` | Modelos de documento | list, filter, create, update, delete |
| 22 | `FinalidadeDocumento` | Finalidades de documento | list, create, update, delete |
| 23 | `ModeloAdvertencia` | Modelos de advertência | list, create, update, delete |
| 24 | `Advertencias` | Advertências registradas | list, create, delete |
| 25 | `DocumentoFuncionario` | Documentos na pasta do funcionário | list, create, delete |
| 26 | `SolicitacoesFuncionario` | Solicitações dos funcionários | list, create, update |
| 27 | `MensagensRH` | Mensagens do RH | list, create |
| 28 | `GastosPessoais` | Gastos pessoais (vida financeira) | list, create, update, delete |
| 29 | `DividasPessoais` | Dívidas pessoais | list, create, update, delete |
| 30 | `AssinaturasPessoais` | Assinaturas pessoais | list, create, update, delete |
| 31 | `MetasObjetivos` | Metas e objetivos financeiros | list, create, update, delete |
| 32 | `MetaFinanceira` | Metas financeiras | list, create, update, delete |

### 2.2 Funções Base44 → Firebase Functions (7 funções)

| Função | Descrição | O que faz |
|--------|-----------|-----------|
| `convidarUsuario` | Convida novo usuário | Cria usuário no sistema e envia convite |
| `enviarAniversarios` | Notifica aniversários | Envia notificações de aniversariantes do dia |
| `calcularLimiteValeMensal` | Calcula limite de vale | Calcula 40% do salário como limite |
| `verificarLimiteVale` | Verifica limite | Valida se funcionário pode solicitar vale |
| `notifyAdminOfError` | Notifica erro admin | Envia alerta de erro para administradores |
| `exportarContrachequesMassa` | Exporta contracheques | Gera PDFs em massa dos contracheques |
| `gerarResumoPdfVidaFinanceira` | Resumo financeiro PDF | Gera PDF com resumo de vida financeira |

---

## 3. Dependências Diretas do Base44

### 3.1 Packages (package.json)
```json
"@base44/sdk": "^0.8.28",
"@base44/vite-plugin": "^1.0.16"
```

### 3.2 Arquivo de Configuração
- `base44/.app.jsonc` — Contém `appId`
- `base44/config.jsonc` — Build/deploy config
- `base44/entities/` — 32 schemas de entidades (DEFINIÇÃO ESTRUTURAL)
- `base44/functions/` — 7 funções serverless

### 3.3 Vite Plugin
```js
// vite.config.js
base44({
  legacySDKImports: ...,
  hmrNotifier: true,
  navigationNotifier: true,
  analyticsTracker: true,
  visualEditAgent: true
})
```

### 3.4 Cliente SDK
```js
// src/api/base44Client.js
import { createClient } from '@base44/sdk';
export const base44 = createClient({ appId, token, functionsVersion, serverUrl: '', requiresAuth: false, appBaseUrl });
```

**Interceptador Axios custom:** `createAxiosClient` (usado em AuthContext.jsx para verificar app public settings)

---

## 4. Padrões de Uso do Base44 no Código

### 4.1 Padrão de Listagem
```js
base44.entities.Funcionarios.list()                              // Todos
base44.entities.Funcionarios.list('-created_date', 1000)         // Ordenado + limit
base44.entities.ModeloDocumento.filter({ ativo: true })          // Filtro
```

### 4.2 Padrão de CRUD
```js
base44.entities.Setor.create(data)                               // Criar
base44.entities.Setor.update(id, data)                           // Atualizar
base44.entities.Setor.delete(id)                                 // Deletar
base44.entities.ComissaoPorFuncionario.bulkCreate(registros)     // Em lote
```

### 4.3 Autenticação
```js
base44.auth.me()                                                 // Usuário atual
base44.auth.logout(redirectUrl?)                                 // Logout
base44.auth.redirectToLogin(currentUrl)                          // Redirecionar login
```

### 4.4 Integrações
```js
base44.integrations.Core.UploadFile({ file })                    // Upload
base44.integrations.Core.SendEmail({ to, subject, body })        // Email
```

### 4.5 Parâmetros de App (app-params.js)
```js
// Lê da URL ou localStorage:
access_token, app_id, from_url, functions_version, app_base_url
```

---

## 5. O Que Fica IGUAL (Reutilizável)

### 5.1 Frontend — 100% Reaproveitável
- **Todas as páginas** (16 páginas em `src/pages/`) — estrutura visual
- **Todos os componentes** (40+ em `src/components/`) — UI components
- **Layout** (`Sidebar`, `AppLayout`, `AppLayoutRH`, `Header`)
- **Hooks** (`useSafeNavigate`, `useFinancialDataLogger`, `use-mobile`)
- **UI Library** (componentes shadcn/ui em `src/components/ui/`)
- **Estilos** (`tailwind.config.js`, `src/index.css`, `postcss.config.js`)
- **Design tokens** (`designTokens.js`)

### 5.2 Lógica de Negócio — 100% Reaproveitável
- `src/lib/comissoes.js` — Cálculos de comissão (divisão, proporcionalidade)
- `src/lib/vidaFinanceira.js` — Cálculos financeiros pessoais
- `src/lib/formatters.js` — Formatação de moeda/data
- `src/lib/formValidation.js` — Validação de formulários
- `src/lib/utils.js` — Utilitários (cn, isIframe)
- `src/lib/navigationValidator.js` — Validação de rotas
- `src/lib/navigationAudit.js` — Auditoria de navegação
- `src/lib/buttonAudit.js` — Auditoria de botões
- `src/lib/financialErrorHandler.js` — Tratamento de erros financeiros
- `src/lib/designTokens.js` — Tokens de design

### 5.3 Configuração de Build
- `vite.config.js` (exceto plugin base44)
- `eslint.config.js`
- `jsconfig.json`

---

## 6. O Que PRECISA SER RECONSTRUÍDO

### 6.1 Data Layer (Firestore) — Prioridade Máxima

Criar um service layer completo que substitua `base44.entities.*`:

**Estrutura sugerida:**
```
src/
  firebase/
    config.js              ← Firebase App initialization
    auth.js                ← Auth service (login, logout, me, roles)
    db.js                  ← Firestore instance
    storage.js             ← Firebase Storage
    entities/
      Funcionarios.js      ← CRUD para cada entidade
      FichaFinanceira.js
      ComissoesGorjetas.js
      ... (32 entidades)
    index.js               ← Barrel export (simula base44.entities.*)
```

**Cada service de entidade precisa implementar:**
- `list(orderBy?, limit?)`
- `get(id)`
- `create(data)`
- `update(id, data)`
- `delete(id)`
- `filter(query)` — equivalente ao filter do Base44
- `bulkCreate(dataArray)` — batch writes

### 6.2 Autenticação (Firebase Auth) — Prioridade Máxima

Substituir `base44.auth.*` por Firebase Auth:

| Base44 | Firestore |
|--------|-----------|
| `base44.auth.me()` | `onAuthStateChanged` + `getUserRole()` custom claim |
| `base44.auth.logout()` | `signOut()` |
| `base44.auth.redirectToLogin(url)` | `signInWithRedirect()` ou redirect custom |
| Token da URL → localStorage | `onAuthStateChanged` direto |

**Roles de usuário (admin, user, funcionario, consulta):**
- Armazenar role como custom claim no Firebase Auth
- OU criar coleção `users` no Firestore com campo `role`

### 6.3 Arquivo de Upload (Firebase Storage)

| Base44 | Firebase Storage |
|--------|------------------|
| `base44.integrations.Core.UploadFile({ file })` | `uploadBytes(ref, file)` + `getDownloadURL()` |

Afeta:
- Upload de foto do funcionário (`FuncionarioForm.jsx`)
- Upload de PDF para assinatura (`EnviarDocumentoDialog.jsx`)
- Comprovantes de lançamentos (via thumbnails em PDF)

### 6.4 Envio de Email

| Base44 | Alternativa |
|--------|-------------|
| `base44.integrations.Core.SendEmail({to, subject, body})` | Firebase Extensions (SendGrid, Mailgun) ou API própria |

Afeta:
- `EnviarDocumentoDialog.jsx` — notificação de documento para assinar
- Função `convidarUsuario` — convite por email
- Função `enviarAniversarios` — notificação de aniversário

### 6.5 Funções Serverless (Firebase Functions)

Recriar as 7 funções como Firebase Cloud Functions (Node.js/TypeScript):

| Função Base44 | Tipo Firebase |
|---------------|---------------|
| `convidarUsuario` | `onCall` / `onDocumentCreated` |
| `enviarAniversarios` | `onSchedule` (cron) |
| `calcularLimiteValeMensal` | `onCall` |
| `verificarLimiteVale` | `onCall` |
| `notifyAdminOfError` | `onCall` |
| `exportarContrachequesMassa` | `onCall` |
| `gerarResumoPdfVidaFinanceira` | `onCall` |

### 6.6 API Client

Substituir `src/api/base44Client.js`:
- Remover `createClient` do `@base44/sdk`
- Criar `src/firebase/config.js` com init do Firebase
- Criar barrel exports que simulem a API do base44

### 6.7 App Initialization

Substituir `src/lib/app-params.js`:
- Remover lógica de token da URL / localStorage
- Substituir por inicialização direta do Firebase
- Remover `access_token`, `app_id`, `functions_version`, `app_base_url`

---

## 7. O Que NÃO Está Explícito no Código (Precisa Desenvolver)

### 7.1 Comportamento Interno do Base44 (Caixa Preta)

| Comportamento | Descrição |
|---------------|-----------|
| **Paginação** | `list()` retorna todos? Como funciona paginação implícita? |
| **Ordenação** | `list('-created_date', 1000)` — ordena por campo descendente com limit |
| **Filtro** | `filter({ ativo: true })` — como o Base44 interpreta query objects? |
| **Bulk Create** | `bulkCreate(registros)` — é atômico? Qual o limite? |
| **Auto ID** | Como o Base44 gera IDs? (provavelmente MongoDB ObjectId-style) |
| **Auth Token Flow** | access_token vem na URL → salvo localStorage → enviado em headers |
| **Roles** | `user.role` — como é gerenciado? Custom claims? Tabela separada? |
| **File Upload** | Endpoint exato de upload, como o arquivo é servido (URL pública?) |
| **Public Settings** | Endpoint `/api/apps/public/prod/public-settings/by-id/{id}` — lógica proprietária |
| **CORS/Proxy** | Vite plugin faz proxy? Configura headers? |

### 7.2 Fluxo de Autenticação (Oculto)

Base44 usa um fluxo de OAuth implícito:
1. Usuário acessa URL com `?access_token=xxx&app_id=yyy`
2. `app-params.js` extrai token da URL e salva no localStorage
3. `AuthContext.jsx` verifica app public settings via `createAxiosClient` custom
4. Se token existe, chama `base44.auth.me()` para validar
5. Se erro `auth_required`, redireciona para login
6. Se erro `user_not_registered`, mostra tela de bloqueio
7. Logout chama `base44.auth.logout()` que limpa token e redireciona

**Para migrar:** Decidir o fluxo de auth:
- Firebase Auth + coleção `app_public_settings`
- Ou auth gerenciado por regras custom

### 7.3 Relacionamentos entre Entidades

Não há foreign keys explícitas. Relacionamentos são por campo texto:
- `FichaFinanceira.funcionario_id` → `Funcionarios.id`
- `ComissaoPorFuncionario.funcionario_id` → `Funcionarios.id`
- `ComissaoPorFuncionario.comissao_id` → `ComissoesGorjetas.id`
- `AssinaturaDigital.funcionario_id` → `Funcionarios.id`
- etc.

**Decisão:** Manter como campos de referência (não usar subcoleções).

### 7.4 Segurança / Regras

Base44 gerencia permissões automaticamente. No Firestore:
- Escrever regras de segurança
- Validar roles (admin, funcionario, user, consulta)
- Controlar acesso CRUD por entidade

---

## 8. Cronograma Sugerido de Migração

### Fase 1: Fundação (3-5 dias)
1. Criar projeto Firebase + Firestore + Auth
2. Criar service layer (`src/firebase/`)
3. Migrar autenticação (`AuthContext.jsx`)
4. Criar coleções no Firestore

### Fase 2: Data Layer (5-7 dias)
5. Implementar CRUD para cada entidade (32 entidades)
6. Adaptar `src/api/base44Client.js` para novo client
7. Testar cada página individualmente

### Fase 3: Arquivos + Funções (3-5 dias)
8. Firebase Storage para uploads
9. Migrar 7 funções para Firebase Functions
10. Sistema de email (SendGrid/Mailgun)

### Fase 4: Refinamento (3-5 dias)
11. Regras de segurança do Firestore
12. Testes completos de todas as funcionalidades
13. Remover dependências Base44
14. Limpar configurações antigas

**Total estimado:** 14-22 dias para migração completa.

---

## 9. Resumo de Arquivos por Categoria

### 9.1 Arquivos que PODEM SER MANTIDOS (sem alteração)
- `src/pages/*` — 16 páginas (estrutura visual)
- `src/components/**/*` — Todos os componentes UI
- `src/lib/comissoes.js`, `vidaFinanceira.js`, `formatters.js`, `formValidation.js`, `utils.js`
- `src/lib/navigationValidator.js`, `navigationAudit.js`, `buttonAudit.js`
- `src/lib/designTokens.js`, `dashboardRoutes.js`
- `src/lib/financialErrorHandler.js`
- `src/lib/PageNotFound.jsx`
- `src/lib/pdfExport.js`
- `src/lib/query-client.js`
- `src/hooks/*` (com ajustes mínimos)
- `tailwind.config.js`, `postcss.config.js`, `index.html`
- `src/index.css`, `src/main.jsx`

### 9.2 Arquivos que PRECISAM SER ADAPTADOS
| Arquivo | O que muda |
|---------|------------|
| `src/lib/AuthContext.jsx` | Substituir `base44.auth.*` por Firebase Auth |
| `src/lib/useUserRole.js` | Substituir `base44.auth.me()` por Firebase Auth |
| `src/hooks/useAccessControl.js` | Substituir `base44.auth.me()` |
| `src/lib/audit.js` | Substituir `base44.entities.LogAuditoria.create` |
| `src/lib/auditoriaDocumentos.js` | Substituir `base44.entities.AuditoriaDocumentos.create` |
| `src/lib/rhControl.js` | Substituir `base44.entities.ConfiguracoesRH.list` |
| `src/lib/PageNotFound.jsx` | Substituir `base44.auth.me()` |
| `src/hooks/useFinancialDataLogger.js` | Substituir `base44.entities.ApplicationError.create` |
| `src/api/base44Client.js` | REMOVER e substituir por client Firestore |
| `src/lib/app-params.js` | REMOVER lógica de token/redirect |
| `vite.config.js` | Remover plugin `@base44/vite-plugin` |

### 9.3 Arquivos a SEREM SUBSTITUÍDOS
| Arquivo | Novo |
|---------|------|
| `src/api/base44Client.js` | `src/firebase/config.js` + `src/firebase/db.js` |
| `base44/` (pasta inteira) | Remover após migração |
| `@base44/sdk` (dependência) | `firebase` + `@react-native-firebase/app` |
| `@base44/vite-plugin` (dependência) | Remover do package.json |

### 9.4 Arquivos NOVOS a criar
| Arquivo | Finalidade |
|---------|------------|
| `src/firebase/config.js` | Inicialização do Firebase |
| `src/firebase/auth.js` | Serviço de autenticação |
| `src/firebase/db.js` | Firestore instance |
| `src/firebase/storage.js` | Firebase Storage |
| `src/firebase/entities/index.js` | Barrel export |
| `src/firebase/entities/Funcionarios.js` | +31 entidades |
| `functions/` (raiz) | 7 Firebase Cloud Functions |

---

## 10. Itens de Decisão (O que perguntar ao cliente)

1. **Fluxo de Login:** Manter o mesmo (login via URL com token) ou usar login/password tradicional do Firebase Auth?
2. **Roles:** Usar custom claims do Firebase Auth ou coleção `users` no Firestore?
3. **Email:** Qual serviço de email usar? (SendGrid, Mailgun, SES?)
4. **Upload de arquivos:** Firebase Storage é suficiente ou precisa de CDN?
5. **PDFs:** A geração de PDF atualmente é client-side (jsPDF). Manter ou migrar para server-side (Firebase Functions)?
6. **App ID/Config:** Atualmente o app depende de `app_id` para identificar a aplicação. No Firebase, cada projeto já é único.

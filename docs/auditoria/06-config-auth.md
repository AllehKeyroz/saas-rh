# Auditoria — Configurações, Autenticação, Auditoria, Backup

## Arquivos: Configuracoes.jsx, Usuarios.jsx, Login.jsx, Register.jsx, auth.js, config.js, db.js, AuthContext.jsx, useUserRole.js, client.js, Auditoria.jsx, LimiteValesTab.jsx, NotificacoesTab.jsx, AparenciaTab.jsx, BackupsTab.jsx, ModelosAdvertenciaTab.jsx

---

## 🔴 Críticos

### 01. `CreateFileSignedUrl` não existe — backup quebra
- **Arquivo:** BackupsTab.jsx:62
- **Caminho:** Configurações > Backups > Exportar
- **Ação:** `await client.integrations.Core.CreateFileSignedUrl({...})`
- **Problema:** `Core` só tem `UploadFile` e `SendEmail`. Função não existe
- **Impacto:** `TypeError: CreateFileSignedUrl is not a function` — backup inteiro quebra
- **Solução:** Implementar ou usar `getFileUrl` do `storage.js`

### 02. `tenants.create()` com `addDoc` — `id` vira campo, não ID do documento
- **Arquivo:** Register.jsx:112-119
- **Caminho:** Register > Criar empresa
- **Ação:** `await client.entities.tenants.create({ id: tenantId, ... })` — `create()` usa `addDoc` que gera ID automático
- **Problema:** `id` vira campo regular, não o identificador do documento
- **Impacto:** `convite.tenant_id` pode não corresponder ao ID real do tenant
- **Solução:** Usar `setDoc(doc(db, 'tenants', tenantId), data)` com ID explícito

### 03. `handleToggleInativo` perde role original do usuário
- **Arquivo:** Usuarios.jsx:124-133
- **Caminho:** Admin > Usuários > Inativar/Reativar
- **Ação:** `novoRole = u.role === 'inativo' ? 'user' : 'inativo'`
- **Problema:** Ao reativar, role é sempre 'user', independente de ser 'admin' originalmente

### 04. AuthContext — 3 stubs de função
- **Arquivo:** AuthContext.jsx:44-46
- **Ação:** `navigateToLogin: () => {}`, `checkUserAuth: () => {}`, `checkAppState: () => {}`
- **Problema:** Qualquer componente que consuma essas funções recebe no-op silencioso

### 05. `...userData` sobrescreve campos do Firebase Auth
- **Arquivo:** auth.js:27-36
- **Ação:** `{ id: user.uid, email: user.email, uid: user.uid, ...userData }`
- **Problema:** `...userData` (Firestore) sobrescreve `uid`, `email`, `role` do Firebase Auth
- **Impacto:** Atacante com acesso Firestore pode alterar role de 'user' para 'admin'
- **Solução:** `{ ...userData, id: user.uid, email: user.email }` (Firestore fields FIRST)

---

## 🟠 Altos

### 06. BackupsTab — lista sem filtro de tenant
- **Arquivo:** BackupsTab.jsx:138-143,156
- **Ação:** `client.entities.BackupRegistro.list()` SEM filtro — lista backups de outros tenants
- **Solução:** Adicionar filtro por `tenant_id` do usuário atual

### 07. db.js — ordenação numérica como string (fallback)
- **Arquivo:** db.js:79-82
- **Ação:** `String(va).localeCompare(String(vb))` — campos número viram string
- **Problema:** `[100, 20, 3]` ordena como `[100, 20, 3]` (string) em vez de `[3, 20, 100]`
- **Solução:** Detectar tipo do campo e ordenar numericamente quando for número

### 08. ModelosDocumentos.jsx ≈ ModelosDocumentosTab.jsx — duplicação
- **Arquivo:** ModelosDocumentos.jsx (59 linhas) e ModelosDocumentosTab.jsx (52 linhas)
- **Ação:** Queries + renderização virtualmente idênticas em dois lugares
- **Solução:** Unificar em um único componente

### 09. Configuracoes.jsx — sem role check
- **Arquivo:** Configuracoes.jsx
- **Ação:** Qualquer usuário autenticado pode acessar e alterar todas as configurações
- **Solução:** Verificar `isAdmin` antes de renderizar

### 10. `data_ativacao` sobrescrita a cada salvamento
- **Arquivo:** LimiteValesTab.jsx:61, AssinaturaGovBRTab.jsx:41
- **Ação:** `data_ativacao: new Date().toISOString()` — perde a data original
- **Solução:** Só setar no create, não no update

### 11. `invokeFunction` não envia token de autenticação
- **Arquivo:** client.js:56-76
- **Ação:** `fetch(url, { headers: { 'Content-Type': 'application/json' } })` — sem token
- **Problema:** Cloud Functions não podem verificar identidade do caller

### 12. Register.jsx — 20+ creates sequenciais para features
- **Arquivo:** Register.jsx:164-172
- **Ação:** `for (const chave of defaultFeatures) await client.entities.ConfiguracoesRH.create(...)`
- **Problema:** Se falhar no meio, estado inconsistente sem rollback. Extremamente lento
- **Solução:** Usar `bulkCreate` ou `writeBatch`

---

## 🟡 Médios

### 13. Toast inconsistente: `sonner` vs `shadcn useToast`
- `sonner`: Configuracoes.jsx, Usuarios.jsx, BackupsTab.jsx
- `useToast`: LimiteValesTab.jsx, AssinaturaGovBRTab.jsx
- **Solução:** Padronizar em um sistema

### 14. `formatDate` — retorna `dateStr` se inválido (formatters.js:24)
### 15. `formatDate` — timezone do cliente vs UTC (Auditoria.jsx:27, +arquivos)
### 16. `isLoadingPublicSettings` — estado nunca alterado (AuthContext.jsx:10-11)
### 17. Auditoria.jsx — limite de 500 registros sem paginação (linha 38)
### 18. `Configuracoes.jsx` — queries executadas independente da tab ativa (linhas 220-233)
### 19. `TIPOS_PADRAO` (LimiteValesTab) vs `TIPOS_DESCONTO_DEFAULT` (formatters) — `vale_parcelado` ausente em um
### 20. `subscribe()` no db.js — evento `removed` ignorado (linha 106)

---

## 🔵 Baixos

### 21. Emojis em labels de select (NotificacoesTab.jsx:14-22) — acessibilidade
### 22. Login sem "Esqueceu sua senha?" (Login.jsx)
### 23. Login sem loading state — tela pisca se já logado (Login.jsx)
### 24. `checkConvite` com delay mínimo 400ms desnecessário (Register.jsx:76)
### 25. Nome do arquivo de backup em timezone local (BackupsTab.jsx:40)
### 26. `setor.nome_do_setor || setor.nome` — inconsistência de nomenclatura (Configuracoes.jsx:25)

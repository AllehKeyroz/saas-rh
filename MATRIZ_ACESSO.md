# Matriz de Acesso — RH System

## Roles

| Role | Quem | Descrição |
|------|------|-----------|
| **admin** | Administrador / Dono | Acesso total ao sistema |
| **user** | Recursos Humanos | Operação do dia a dia (cria/edita funcionários e lançamentos) |
| **consulta** | Consulta | Somente visualização (atualmente sem telas — vê 404) |
| **funcionario** | Funcionário | Acesso exclusivo ao Portal do Funcionário |
| **inativo** | Conta desativada | Acesso roteado mas sem permissão de escrita no Firestore |

---

## Frontend — Páginas

### Painel Principal (admin e user)

| Página | admin | user | consulta | funcionario | inativo |
|--------|-------|------|----------|-------------|---------|
| Dashboard | ✅ | ✅ | 🚫 (404) | 🚫 | ✅ |
| Funcionários | ✅ | ✅ | 🚫 | 🚫 | ✅* |
| Lançamentos | ✅ | ✅ | 🚫 | 🚫 | ✅ |
| Fechamento Mensal | ✅ | ✅ | 🚫 | 🚫 | ✅ |
| Relatórios | ✅ | ✅ | 🚫 | 🚫 | ✅ |
| Comissões | ✅ | ✅ | 🚫 | 🚫 | ✅ |
| Solicitações | ✅ | ✅ | 🚫 | 🚫 | ✅ |
| Comunicação | ✅ | ✅ | 🚫 | 🚫 | ✅ |
| Advertências | ✅ | ✅ | 🚫 | 🚫 | ✅ |
| Centro de Controle RH | ✅ | ✅ | 🚫 | 🚫 | 🚫 |
| Assinaturas Digitais | ✅ | ✅ | 🚫 | 🚫 | ✅ |
| Modelos de Documentos | ✅ | ✅ | 🚫 | 🚫 | ✅ |
| Auditoria de Documentos | ✅ | ✅ | 🚫 | 🚫 | ✅ |
| Logs Financeiros | ✅ | ✅ | 🚫 | 🚫 | ✅ |
| Espelho do Portal | ✅ | ✅ | 🚫 | 🚫 | ✅ |
| Visão 360° Funcionário | ✅ | ✅ | 🚫 | 🚫 | ✅ |

### Administração (admin apenas)

| Página | admin | user | consulta | funcionario | inativo |
|--------|-------|------|----------|-------------|---------|
| Usuários | ✅ | 🚫 (restrito) | 🚫 | 🚫 | 🚫 |
| Auditoria | ✅ | 🚫 (restrito) | 🚫 | 🚫 | 🚫 |
| Configurações | ✅ | 🚫 (restrito) | 🚫 | 🚫 | 🚫 |

### Portal do Funcionário (funcionario apenas)

| Página | admin | user | consulta | funcionario | inativo |
|--------|-------|------|----------|-------------|---------|
| Visão Geral | 🚫 | 🚫 | 🚫 | ✅ | 🚫 |
| Meus Dados | 🚫 | 🚫 | 🚫 | ✅ | 🚫 |
| Meu Salário | 🚫 | 🚫 | 🚫 | ✅ | 🚫 |
| Meus Vales | 🚫 | 🚫 | 🚫 | ✅ | 🚫 |
| Extrato Mensal | 🚫 | 🚫 | 🚫 | ✅ | 🚫 |
| Minha Vida Financeira | 🚫 | 🚫 | 🚫 | ✅ | 🚫 |
| Minhas Comissões | 🚫 | 🚫 | 🚫 | ✅ | 🚫 |
| Minhas Metas | 🚫 | 🚫 | 🚫 | ✅ | 🚫 |
| Mensagens | 🚫 | 🚫 | 🚫 | ✅ | 🚫 |
| Minhas Solicitações | 🚫 | 🚫 | 🚫 | ✅ | 🚫 |
| Assinaturas | 🚫 | 🚫 | 🚫 | ✅ | 🚫 |

> \* `inativo` enxerga as páginas mas o Firestore bloqueia escritas. O frontend exibe botões de edição mesmo para inativo (bug conhecido).

---

## Ações Específicas por Página

### Fechamento Mensal

| Ação | admin | user |
|------|-------|------|
| Visualizar fechamentos | ✅ | ✅ |
| Processar fechamento (individual) | ✅ | ✅ |
| Processar todos | ✅ | ✅ |
| Reprocessar | ✅ | ❌ |
| Reabrir folha (individual) | ✅ | ❌ |
| Reabrir todos | ✅ | ❌ |
| Exportar contracheques em massa | ✅ | ❌ |

### Usuários

| Ação | admin | user |
|------|-------|------|
| Ver listagem | ✅ | ❌ (mensagem "Acesso restrito") |
| Criar usuário (admin/user) | ✅ | ❌ |
| Editar permissão (admin/user) | ✅ | ❌ |
| Inativar/reativar conta | ✅ | ❌ |

### Centro de Controle RH

| Ação | admin | user |
|------|-------|------|
| Acessar página | ✅ | ✅ |
| Configurar módulos (features) | ✅ | ❌ |
| Configurar integrações | ✅ | ❌ |

---

## Backend — Firestore

### Regras gerais
- **Leitura**: qualquer usuário autenticado pode ler qualquer coleção de negócio
- **Escrita em coleções de negócio** (Funcionarios, FichaFinanceira, Fechamento, Comissões, etc.): exige `isRH()` (admin ou user) **e** `tenantMatch()` (tenant_id do documento = tenant_id do usuário)
- **Coleções pessoais** (GastosPessoais, DividasPessoais, etc.): leitura e escrita para qualquer autenticado

### Matriz Firestore

| Coleção | Ler | Criar | Atualizar | Excluir |
|---------|-----|-------|-----------|---------|
| tenants | público | público | admin | admin |
| users | autenticado | autenticado | autenticado | admin |
| convites | público | RH | autenticado | admin |
| Funcionarios | autenticado | **RH + tenantMatch** | **RH** | admin |
| FichaFinanceira | autenticado | **RH + tenantMatch** | **RH** | admin |
| FechamentoMensal | autenticado | **RH + tenantMatch** | **RH** | admin |
| ComissoesGorjetas | autenticado | **RH + tenantMatch** | **RH** | admin |
| Setor / Funcao / TipoLancamento | autenticado | **RH + tenantMatch** | **RH** | admin |
| ConfiguracoesRH | autenticado | **admin + tenantMatch** | **admin** | admin |
| ConfiguracaoNotificacao | autenticado | **admin + tenantMatch** | **admin** | admin |
| ConfiguracaoAparencia | autenticado | **admin + tenantMatch** | **admin** | admin |
| BackupRegistro | **admin** | **admin + tenantMatch** | **admin** | admin |
| LogAuditoria / AuditoriaDocumentos | **admin** | autenticado | — | admin |
| ApplicationError / LogNotificacao | **admin** | autenticado | — | — |
| AssinaturaDigital | autenticado | **RH + tenantMatch** | **RH** | admin |
| SolicitacoesFuncionario | autenticado | autenticado | **RH** | admin |
| MensagensRH | autenticado | **RH + tenantMatch** | — | admin |
| GastosPessoais / DividasPessoais / AssinaturasPessoais / MetasObjetivos / MetaFinanceira | autenticado | autenticado | autenticado | autenticado |

> `tenantMatch()`: o `tenant_id` do documento sendo criado deve ser igual ao `tenant_id` do usuário logado.

---

## Resumo por Role

### admin
- ✅ Acesso a **todas as páginas** do sistema
- ✅ Criar, editar, excluir qualquer registro
- ✅ Gerenciar usuários (criar, alterar permissão, inativar)
- ✅ Reprocessar e reabrir fechamentos
- ✅ Configurar features, notificações, aparência, backups
- ✅ Ver logs de auditoria
- ❌ **Não** acessa o Portal do Funcionário (role separada)

### user (RH)
- ✅ Acesso a **quase todas as páginas** (exceto Administração e Configurações)
- ✅ Criar e editar funcionários, lançamentos, fechamentos
- ✅ Processar fechamentos
- ❌ **Não** pode reprocessar ou reabrir fechamentos
- ❌ **Não** gerencia usuários
- ❌ **Não** acessa Configurações / Auditoria

### consulta
- 🚫 **Todas as rotas retornam 404** — role sem utilidade atualmente
- Autentica mas não vê conteúdo algum

### funcionario
- ✅ Acesso exclusivo ao **Portal do Funcionário**
- ✅ Visualiza dados pessoais, salário, vales, extrato, comissões
- ✅ Envia solicitações (férias, vale, banco de horas, etc.)
- ✅ Assina documentos digitalmente
- ✅ Gerencia vida financeira pessoal (gastos, dívidas, metas)
- ❌ **Não** acessa nenhuma página administrativa

### inativo
- ⚠️ O frontend roteia como admin/user (vê as mesmas páginas)
- ⚠️ Botões de edição aparecem (bug: `canEdit` hardcoded como `true`)
- ❌ Firestore **bloqueia escritas** (regras exigem `isRH()` = admin ou user)
- ✅ Pode ler dados (regra de leitura é só `isAuthenticated()`)

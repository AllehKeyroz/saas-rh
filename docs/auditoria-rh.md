# Auditoria Geral — Portal RH (Admin)

**Data:** 17/07/2026  
**Branch:** `fix/vale-parcelado`  
**Escopo:** Portal administrativo (páginas em `src/pages/` + `src/components/layout/` + `src/components/*/` no lado admin)

---

## Arquitetura — Hierarquia de Layout

```
App.jsx
├── AuthProvider + QueryClientProvider
│   ├── /login → Login
│   ├── /register → Register
│   └── /* → AuthenticatedApp
│         ├── [role=funcionario] → PortalFuncionario (sem sidebar admin)
│         ├── [role=consulta] → 404
│         └── [role=admin|user|inativo] → AppLayoutRH
│               ├── Header (fixo topo, notificações, perfil)
│               ├── SidebarRH (11 categorias, colapsável)
│               └── <Outlet /> (página ativa)
```

### Arquivos de Layout

| Arquivo | Status | Proposito |
|---|---|---|
| `src/components/layout/AppLayoutRH.jsx` | ✅ Ativo | Layout principal admin (Header + SidebarRH + Outlet) |
| `src/components/layout/AppLayout.jsx` | ❌ Não usado | Layout legado com Sidebar antiga |
| `src/components/layout/SidebarRH.jsx` | ✅ Ativo | Sidebar com 11 categorias e dropdowns |
| `src/components/layout/Sidebar.jsx` | ❌ Não usado | Sidebar plana legada com `adminOnly` |
| `src/components/layout/Header.jsx` | ✅ Ativo | Header fixo com sino + menu perfil |
| `src/components/layout/VersionFooter.jsx` | ✅ Ativo | Footer com versão |

### Rotas Admin (20 páginas)

| # | Path | Componente | Categoria Sidebar |
|---|---|---|---|
| 1 | `/` | DashboardRH | Dashboard |
| 2 | `/relatorios` | Relatorios | Relatórios |
| 3 | `/fechamento` | Fechamento | Folha de Pagamento |
| 4 | `/lancamentos` | Lancamentos | Folha de Pagamento |
| 5 | `/logs-financeiros` | LogsFinanceiros | Folha de Pagamento |
| 6 | `/funcionarios` | Funcionarios | Funcionários |
| 7 | `/funcionarios/:id/360` | Funcionarios360 | (sub-rota de Funcionarios) |
| 8 | `/espelho-portal` | EspelhoPortal | Funcionários |
| 9 | `/comissoes` | Comissoes | Comissões |
| 10 | `/solicitacoes` | Solicitacoes | Solicitações |
| 11 | `/comunicacao` | Comunicacao | Comunicação |
| 12 | `/centro-controle-rh` | CentroControleRH | Centro de Controle |
| 13 | `/assinaturas-digitais` | AssinaturasDigitais | Assinaturas Digitais |
| 14 | `/auditoria-documentos` | AuditoriaDocumentos | Assinaturas Digitais |
| 15 | `/modelos-documentos` | ModelosDocumentos | Administração |
| 16 | `/auditoria` | Auditoria | Administração |
| 17 | `/usuarios` | Usuarios | Administração |
| 18 | `/configuracoes` | Configuracoes | Configurações |
| 19 | `/exportar-dados` | ExportarDados | (não está na sidebar! link oculto) |
| 20 | `/advertencias` | Advertencias | (não está na sidebar! link oculto) |

**INCONSISTÊNCIA [P4]:** As rotas `/exportar-dados` e `/advertencias` existem e funcionam, mas **não aparecem na SidebarRH**. O usuário admin só acessa essas páginas se souber a URL ou se houver link em outra página.

---

## Categoria 1 — Dashboard

**Rota:** `/`  
**Arquivo:** `src/pages/DashboardRH.jsx` (289 linhas)  
**Função:** `isRH()` (admin ou user)

### Queries Executadas (8)

| Query Key | Coleção | Filtro/Limite |
|---|---|---|
| `['funcionarios']` | Funcionarios | `list()` |
| `['solicitacoes']` | SolicitacoesFuncionario | `list()` |
| `['lancamentos']` | FichaFinanceira | `list('-data_lancamento', 2000)` |
| `['assinaturas_dashboard']` | AssinaturaDigital | `list('-data_envio', 200)` |
| `['comissoes_dashboard']` | ComissoesGorjetas | `list('-created_date', 50)` |
| `['fechamentos_dashboard']` | FechamentoMensal | `list('-created_date', 2000)` |
| `['ferias_dashboard']` | Ferias | `list()` |
| `['tipos-lancamento-rh']` | TipoLancamento | `list()` |

### CRUD
Apenas leitura — 8 queries, sem escritas.

### Componentes Renderizados

| Componente | Função |
|---|---|
| `StatisticsGrid` | KPIs numéricos (total funcionários, pendências, etc.) |
| `AlertBanner` | Alertas de fechamento pendente |
| `IndicadoresFinanceiros` | Gráficos financeiros (vale_parcelado incluso) |

### IFELS — Fluxo de Decisão

```
SE role === admin || role === user?
├── SIM → renderiza página com todos os componentes
└── NÃO → não deveria chegar aqui (AppLayoutRH filtra)
```

**INCONSISTÊNCIA [P2]:** `DashboardRH` usa chave `['lancamentos']` com limit 2000, enquanto `IndicadoresFinanceiros` (componente filho) usa `['lancamentos']` sem limit — duas queries para a mesma coleção com chaves diferentes, mas ambas são desduplicadas pelo React Query porque a primeira é mais restritiva. No entanto, `['tipos-lancamento-rh']` tem chave diferente de `['tipos-lancamento']` (usada em Lancamentos.jsx), causando duplicação de leitura dos tipos.

**CRUZAMENTO com Portal Funcionário:** A chave `['lancamentos']` é COMPARTILHADA com `PortalFuncionario.jsx`. Isso significa que invalidar `['lancamentos']` no RH (ex: ao criar um lançamento) faz o portal do funcionário refetchar na próxima montagem, e vice-versa.

---

## Categoria 2 — Relatórios

**Rota:** `/relatorios`  
**Arquivo:** `src/pages/Relatorios.jsx` (120 linhas)  
**Função:** `isRH()`

### Queries (3)

| Query Key | Coleção |
|---|---|
| `['funcionarios']` | Funcionarios |
| `['lancamentos']` | FichaFinanceira (limit 2000) |
| `['fechamentos']` | FechamentoMensal |

### CRUD
Apenas leitura.

### Abas Internas

| Aba | Componente | Função |
|---|---|---|
| Geral | `RelatorioGeral` | Relatório consolidado por funcionário |
| Individual | `RelatorioIndividual` | Relatório de um funcionário |
| Comparativo | `RelatorioComparativo` | Comparação entre meses |
| Limites | `RelatorioLimites` | Relatório de limites de vales |

**INCONSISTÊNCIA [P3]:** `RelatorioGeral` agrupa `vale` + `vale_parcelado` na mesma coluna "vales". Com a nova lógica de crédito+débito, o crédito (`parcelado:true`) pode aparecer como valor positivo no relatório, distorcendo os totais de vale. **Necessário verificar se `parcelado:true` é filtrado no RelatorioGeral.**

---

## Categoria 3 — Folha de Pagamento

### Submenu: Fechamento Mensal

**Rota:** `/fechamento`  
**Arquivo:** `src/pages/Fechamento.jsx` (684 linhas)  
**Função:** `isRH()` (processar: `isAdmin()`)

### Queries (7)

| Query Key | Coleção | Detalhes |
|---|---|---|
| `['funcionarios']` | Funcionarios | `list()` |
| `['lancamentos']` | FichaFinanceira | `list('-created_date', 1000)` |
| `['fechamentos']` | FechamentoMensal | `list()` |
| `['comissoes_funcionarios']` | ComissaoPorFuncionario | `list('-created_date', 2000)` |
| `['tipos-lancamento-fechamento']` | TipoLancamento | `list()` |
| `['consignados-fechamento']` | Consignado | `list()` |
| `['configuracoes-rh-fechamento']` | ConfiguracoesRH | `list()` |

### CRUD

| Operação | Ação | Coleção |
|---|---|---|
| Processar fechamento | `create()` | FechamentoMensal |
| Consolidar | `update({consolidado:true})` | FichaFinanceira |
| Avançar consignado | `update({parcelas_pagas})` | Consignado |
| Reabrir | `delete()` | FechamentoMensal |

### IFELS — Fluxo de Decisão

```
SE já fechado para o mês?
├── SIM → mostra "Fechado", botão "Reabrir" (só admin)
│   └── SE role === admin? → permite reprocessar
│   └── NÃO → apenas visualiza
└── NÃO → mostra "Pendente", botão "Processar Fechamento"

SE tem lançamentos sem consolidar? → permite processar
SE todos consolidados? → mostra status completo
```

**INCONSISTÊNCIA [P2]:** `vale_parcelado` é processado como débito no fechamento (assim como `vale`). Com a nova lógica de crédito + parcelas, o fechamento precisa:
- Ignorar registros com `parcelado: true` (o crédito à vista não é débito)
- Processar apenas `vale_parcelado` (as parcelas de pagamento) como débito

**INCONSISTÊNCIA [P3]:** `comissoes_funcionarios` usa chave diferente de `['comissoes_funcionario_vf']` (portal), causando leitura duplicada se ambos estiverem abertos.

### Submenu: Lançamentos

**Rota:** `/lancamentos`  
**Arquivo:** `src/pages/Lancamentos.jsx` (419 linhas)  
**Função:** `isRH()`

### Queries (4)

| Query Key | Coleção | Detalhes |
|---|---|---|
| `['lancamentos']` | FichaFinanceira | `list('-created_date', 1000)` |
| `['funcionarios']` | Funcionarios | `list()` |
| `['tipos-lancamento']` | TipoLancamento | `list()` |
| `['consignados-contratos']` | Consignado | `list('-created_date', 500)` |

### CRUD

| Operação | Ação |
|---|---|
| Criar lançamento | `LancamentoForm` → `FichaFinanceira.create()` |
| Criar consignado | `LancamentoForm` → `FichaFinanceira.create()` + `Consignado.create()` |
| Criar vale parcelado | `LancamentoForm` → 1 crédito + N débitos em `FichaFinanceira.create()` |
| Excluir | `DetalhesFuncionarioModal` → `FichaFinanceira.delete()` (se não consolidado) |

### IFELS — Fluxo de Decisão

```
SE tipo_lancamento === 'vale'?
├── SIM → mostra checkbox "Parcelar vale"
│   ├── SE parcelado? → mostra numParcelas (2-12)
│   │   └── Ao salvar: cria 1 crédito (valor total, parcelado:true) + N parcelas (tipo: vale_parcelado)
│   └── NÃO → cria 1 lançamento normal
└── NÃO → formulário normal

SE tipo_lancamento === 'credito_consignado'?
├── SIM → mostra campos de contrato (banco, parcelas, etc.)
└── NÃO → campos padrão (valor, data)

SE tem navegação por tipo?
├── 'todos' → mostra agregado mensal
├── 'vale_parcelado' → mostra acumulado histórico desse tipo
├── 'consignado' → mostra contratos + parcelas
└── outros → filtra por tipo
```

**INCONSISTÊNCIA [P1]:** O campo `limiteInfo` no `LancamentoForm.jsx` (linha 157) calcula o limite mensal filtrando `['vale', 'adiantamento']` com `!l.parcelado`. Isso está correto para excluir créditos parcelados. **Porém**, a soma só considera lançamentos do MESMO mês. Se um vale parcelado de R$3.000 foi criado, o limite só é verificado contra o total R$3.000 (não contra a parcela mensal). Isso é um problema porque o admin pode criar um vale parcelado que estoura o limite mensal das parcelas futuras.

**CRUZAMENTO com Portal Funcionário:** Dados criados aqui (`FichaFinanceira`) são os mesmos lidos no portal do funcionário em `MeusVales.jsx`, `ExtratoMensal.jsx`, `MeuSalario.jsx` e `MiniDRE.jsx`.

### Submenu: Logs de Erro

**Rota:** `/logs-financeiros`  
**Arquivo:** `src/pages/LogsFinanceiros.jsx` (86 linhas)  
**Função:** `isRH()`

### Query

| Query Key | Coleção |
|---|---|
| `['application_errors']` | ApplicationError (limit 100) |

### CRUD
Leitura + update (marcar como notificado).

### IFELS
```
SE lista vazia? → mostra "Nenhum erro registrado"
SE tem erros? → lista com badge de severidade + botão "Notificar"
```

---

## Categoria 4 — Funcionários

### Submenu: Gerenciar

**Rota:** `/funcionarios`  
**Arquivo:** `src/pages/Funcionarios.jsx` (344 linhas)  
**Função:** `isRH()`

### Queries (2)

| Query Key | Coleção |
|---|---|
| `['funcionarios']` | Funcionarios |
| `['advertencias']` | Advertencias |

### CRUD

| Operação | Ação |
|---|---|
| Criar funcionário | `FuncionarioForm` → `Funcionarios.create()` |
| Editar funcionário | `FuncionarioForm` → `Funcionarios.update()` |
| Excluir advertência | `Advertencias.delete()` (inline) |
| Reenviar convite | `criarOuReenviarConvite()` |
| Importar | `ImportarFuncionarios` (CSV) |

### Abas Internas (por funcionário — modal ou página)

| Aba | Componente | Coleção |
|---|---|---|
| Dados | `FuncionarioForm` | Funcionarios |
| Documentos | `PastaDocumentos` | Storage |
| Advertências | `AdvertenciaForm` + lista | Advertencias |
| Férias/BH | `FeriasBancoHorasTab` | Ferias, SolicitacoesFuncionario |
| Documentos Func. | `DocumentosFuncionarioTab` | DocumentoFuncionario |
| Permissões | `PermissoesPortalDialog` | Funcionarios (permissoes_portal) |

**INCONSISTÊNCIA [P3]:** `PermissoesPortalDialog` modifica o campo `permissoes_portal` no documento `Funcionarios`. Essas permissões controlam o que aparece no portal do funcionário. Mas não há validação de quais permissões existem — o dialog pode receber campos obsoletos.

### Submenu: Espelho do Portal

**Rota:** `/espelho-portal`  
**Arquivo:** `src/pages/EspelhoPortal.jsx` (361 linhas)  
**Função:** `isRH()`

### Queries (4)

| Query Key | Coleção |
|---|---|
| `['funcionarios']` | Funcionarios |
| `['lancamentos']` | FichaFinanceira |
| `['comissoes_espelho', id]` | ComissaoPorFuncionario |
| `['mensagens_rh_portal']` | MensagensRH |

### IFELS

```
SE funcionário selecionado?
├── SIM → carrega dados e renderiza abas do portal (VisaoGeral, MeusDados, MeuSalario, etc.)
└── NÃO → mostra seletor de funcionário
```

**INCONSISTÊNCIA [P3]:** `EspelhoPortal` reutiliza os MESMOS componentes do portal (`VisaoGeral`, `MeusDados`, `MeuSalario`, `MeusVales`, `ExtratoMensal`). Isso é bom para manutenção, mas significa que qualquer bug no portal se replica no espelho.

**CRUZAMENTO:** As chaves `['lancamentos']` e `['mensagens_rh_portal']` são COMPARTILHADAS com o portal do funcionário. Invalidar essas chaves no RH faz o portal refetchar.

---

## Categoria 5 — Comissões

**Rota:** `/comissoes`  
**Arquivo:** `src/pages/Comissoes.jsx` (166 linhas)  
**Função:** `isRH()`

### Queries (4)

| Query Key | Coleção |
|---|---|
| `['funcionarios']` | Funcionarios |
| `['comissoes_gorjetas']` | ComissoesGorjetas (limit 200) |
| `['comissoes_funcionarios']` | ComissaoPorFuncionario (limit 2000) |
| `['setores-comissao-page']` | SetoresComissao |

### CRUD
Leitura (escritas delegadas a child components).

### Abas

| Aba | Componente |
|---|---|
| Lançar | `LancarComissao` |
| Relatório | `RelatorioComissoes` |
| Histórico | `HistoricoComissoes` |
| Setores | `ConfigurarSetoresComissao` |
| Metas | `ConfigurarMetasComissao` |

---

## Categoria 6 — Solicitações

**Rota:** `/solicitacoes`  
**Arquivo:** `src/pages/Solicitacoes.jsx` (677 linhas)  
**Função:** `isRH()`

### Queries (2 + subscribe)

| Query Key | Coleção |
|---|---|
| `['solicitacoes_rh']` | SolicitacoesFuncionario (limit 200) |
| `['me_user']` | auth.me() |

Também: `subscribe()` em tempo real.

### CRUD

| Operação | Ação | Coleção |
|---|---|---|
| Aprovar/Recusar | `update({status, resposta_rh, ...})` | SolicitacoesFuncionario |
| Responder PIX | `update({chave_pix, chave_pix_tipo})` | Funcionarios |
| Enviar msg automática | `create()` | MensagensRH |

### IFELS

```
SE solicitação é do tipo 'pix' e status === 'aprovado'?
├── SIM → atualiza chave_pix do funcionário automaticamente
└── NÃO → apenas atualiza status

SE listener real-time detecta nova solicitação?
├── SIM → toast + invalidateQueries(['solicitacoes_rh'])
│   └── SE tipo === 'create' e não é first (2s debounce) → toast + badge no sidebar
│   └── SE tipo === 'update' → invalidateQueries(['solicitacoes_rh'])
└── NÃO → nada
```

**INCONSISTÊNCIA [P2]:** O listener `subscribe()` no `Solicitacoes.jsx` (linha 337) escuta TODAS as mudanças na coleção `SolicitacoesFuncionario` para o tenant inteiro, mas invalida `['solicitacoes_rh']` mesmo para solicitações de outros funcionários. O PortalFuncionario também tem um listener similar (linha 151). **Cada nova solicitação gera 2 leituras extras** (uma no RH, uma no portal) + invalidate cascade.

**CRUZAMENTO:** Solicitações aprovadas aqui podem disparar notificações no portal do funcionário via listener real-time.

---

## Categoria 7 — Comunicação

**Rota:** `/comunicacao`  
**Arquivo:** `src/pages/Comunicacao.jsx` (345 linhas)  
**Função:** `isRH()`

### Queries (4)

| Query Key | Coleção |
|---|---|
| `['mensagens_rh']` | MensagensRH (limit 100) |
| `['funcionarios']` | Funcionarios |
| `['setores']` | Setor |
| `['me_user']` | auth.me() |

### CRUD

| Operação | Ação |
|---|---|
| Criar mensagem | `MensagensRH.create()` |
| Excluir mensagem | `MensagensRH.delete()` |

### IFELS

```
SE público alvo === 'funcionario'?
├── SIM → mostra seletor de funcionário
└── NÃO → 
    ├── SE 'setor'? → mostra seletor de setor
    └── SE 'todos'? → não mostra seletor extra
```

---

## Categoria 8 — Centro de Controle

**Rota:** `/centro-controle-rh`  
**Arquivo:** `src/pages/CentroControleRH.jsx`  
**Função:** `isAdmin()` (provavelmente — verificar)

### Queries

| Coleção | Ação |
|---|---|
| `ConfiguracoesRH` | list() + update() |
| `TipoLancamento` | list() |
| Varias tabs de config | CRUD |

### Abas

| Aba | Função |
|---|---|
| Módulos | Ativar/desativar features (`isAtiva()`) |
| Integrações | Conexão com serviços externos |
| ... | Demais configurações avançadas |

---

## Categoria 9 — Assinaturas Digitais

### Submenu: Assinaturas

**Rota:** `/assinaturas-digitais`  
**Arquivo:** `src/pages/AssinaturasDigitais.jsx` (259 linhas)  
**Função:** `isRH()`

### Queries (2)

| Coleção | Detalhes |
|---|---|
| `AssinaturaDigital` | `list('-data_envio')` |
| `Funcionarios` | `filter({ativo: true})` |

### CRUD

| Operação | Ação |
|---|---|
| Enviar documento | `AssinaturaDigital.create()` |
| Reenviar | `update({data_envio})` |
| Cancelar | `update({status})` |

### Submenu: Auditoria de Documentos

**Rota:** `/auditoria-documentos`  
**Arquivo:** `src/pages/AuditoriaDocumentos.jsx` (218 linhas)  
**Função:** `isAdmin()`

### Query

| Coleção | Detalhes |
|---|---|
| `AuditoriaDocumentos` | `list('-created_date', 500)` + `refetchInterval: 30000` |

**INCONSISTÊNCIA [P1]:** `refetchInterval: 30000` (30 segundos) é extremamente agressivo. Um admin que deixa essa página aberta gera **2.880 leituras/hora** só desta query. A auditoria de documentos é uma tabela write-only — não precisa de atualização em tempo real.

---

## Categoria 10 — Administração

### Submenu: Modelos de Documentos

**Rota:** `/modelos-documentos`  
**Arquivo:** `src/pages/ModelosDocumentos.jsx` (59 linhas)

### Queries (2)

| Coleção |
|---|
| `ModeloDocumento` |
| `FinalidadeDocumento` |

### Submenu: Auditoria

**Rota:** `/auditoria`  
**Arquivo:** `src/pages/Auditoria.jsx` (195 linhas)  
**Função:** `isAdmin()`

### Query (1)

| Coleção | Detalhes |
|---|---|
| `LogAuditoria` | `list('-created_date', 500)` |

### Submenu: Usuários

**Rota:** `/usuarios`  
**Arquivo:** `src/pages/Usuarios.jsx` (334 linhas)  
**Função:** `isAdmin()`

### Query (1)

| Coleção | Detalhes |
|---|---|
| `users` | `filter({tenant_id})` |

### CRUD

| Operação | Ação |
|---|---|
| Criar usuário | Auth `createUserWithEmailAndPassword()` + Firestore `users` |
| Editar role | `users.update({role})` |
| Convidar | Envio de email |

---

## Categoria 11 — Configurações

**Rota:** `/configuracoes?tab=...`  
**Arquivo:** `src/pages/Configuracoes.jsx` (454 linhas)  
**Função:** `isRH()` (algumas abas `isAdmin()`)

### Abas e Coleções

| Tab | Coleção | CRUD |
|---|---|---|
| Setores | `SetoresComissao` | CRUD |
| Funções | `Funcao` | CRUD |
| Tipos de Lançamento | `TipoLancamento` | CRUD |
| Aparência | `ConfiguracaoAparencia` | CRUD |
| Notificações | `ConfiguracaoNotificacao` | CRUD |
| Modelos Advertência | `ModeloAdvertencia` | CRUD |
| Modelos Documentos | `ModeloDocumento` + `FinalidadeDocumento` | CRUD |
| Assinatura GovBR | `ConfiguracoesRH` (chave govbr) | CRUD |
| Limite de Vales | `ConfiguracoesRH` (chave limite_vale_tipos) | CRUD |
| Backups | `BackupRegistro` | CRUD |

---

## Header — Notificações

**Arquivo:** `src/components/layout/Header.jsx` (152 linhas)

### Funcionamento

```
useEffect: client.entities.SolicitacoesFuncionario.filter({status:'pendente'}, '-created_date', 5)
  ├── Carrega as 5 solicitações pendentes mais recentes
  └── Atualiza badge no sino

Sino → dropdown com:
  ├── Lista das solicitações pendentes
  └── Botão "Ver todas" → navigate('/solicitacoes')

Menu perfil → dropdown com:
  ├── Nome + email
  ├── "Configurações" (sem ação real)
  └── "Sair" → logout
```

**INCONSISTÊNCIA [P1]:** Header.jsx faz `client.entities.SolicitacoesFuncionario.filter()` em **useEffect simples** (sem React Query). Isso significa que:
- Não há cache — toda navegação que remonta o Header faz uma nova leitura
- Não há deduplicação — se dois componentes chamarem, duas leituras
- O Header está presente em TODAS as páginas admin, montando/desmontando a cada navegação (dependendo do layout)
- **Estimativa:** Se o admin visita 10 páginas, o Header refaz a query 10 vezes

**INCONSISTÊNCIA [P3]:** O menu "Configurações" no perfil (linha 134) não tem navegação — apenas fecha o dropdown. Deveria navegar para `/configuracoes`.

---

## Inconsistências — Ordenadas por Categoria da Sidebar

### Dashboard (Categoria 1)
| # | Prioridade | Inconsistência | Impacto |
|---|---|---|---|
| P2 | 🟠 | `['tipos-lancamento-rh']` duplica leitura com `['tipos-lancamento']` | +1 query por sessão |
| P3 | 🟡 | Chave `['lancamentos']` compartilhada com portal — invalidação cruzada | Refetch desnecessário no portal |

### Relatórios (Categoria 2)
| # | Prioridade | Inconsistência |
|---|---|---|
| P3 | 🟡 | `RelatorioGeral` precisa filtrar `parcelado:true` dos totais de vale |

### Folha de Pagamento — Fechamento (Categoria 3)
| # | Prioridade | Inconsistência |
|---|---|---|
| P2 | 🟠 | Fechamento precisa ignorar registros `parcelado:true` (crédito) e processar só `vale_parcelado` |
| P3 | 🟡 | Chave `['comissoes_funcionarios']` diferente do portal — duplicação |

### Folha de Pagamento — Lançamentos (Categoria 3)
| # | Prioridade | Inconsistência |
|---|---|---|
| P1 | 🔴 | Limite mensal não considera parcelas futuras de vale parcelado no cálculo |
| P3 | 🟡 | `limiteInfo` usa `['vale','adiantamento']` fixo — tipos custom de desconto ignorados |

### Funcionários (Categoria 4)
| # | Prioridade | Inconsistência |
|---|---|---|
| P3 | 🟡 | `PermissoesPortalDialog` sem validação de campos obsoletos |

### Solicitações (Categoria 6)
| # | Prioridade | Inconsistência |
|---|---|---|
| P2 | 🟠 | Listener subscribe() causa invalidate cascade para todo o tenant |
| P3 | 🟡 | Invalida `['funcionarios']` ao aprovar PIX — refetch desnecessário de 200+ docs |

### Comunicação (Categoria 7)
| # | Prioridade | Inconsistência |
|---|---|---|
| P3 | 🟡 | Sem validação de público-alvo duplicado |

### Assinaturas Digitais (Categoria 9)
| # | Prioridade | Inconsistência |
|---|---|---|
| P1 | 🔴 | `refetchInterval: 30000` em AuditoriaDocumentos — 2.880 leituras/hora |

### Header (Global)
| # | Prioridade | Inconsistência |
|---|---|---|
| P1 | 🔴 | `SolicitacoesFuncionario.filter()` em useEffect sem cache — 1 leitura extra por página |
| P3 | 🟡 | Botão "Configurações" no perfil sem navegação |
| P3 | 🟡 | Notificações só mostram pendentes — não mostra solicitações recusadas recentes |

### Sidebar (Global)
| # | Prioridade | Inconsistência |
|---|---|---|
| P4 | 🟢 | Rotas `/exportar-dados` e `/advertencias` existem mas não estão na sidebar |
| P3 | 🟡 | Sidebar não filtra por role — user vê links de admin (ex: Auditoria, Usuários) mas pode não ter acesso |
| P4 | 🟢 | `AppLayout.jsx` e `Sidebar.jsx` são dead code (não usados em nenhuma rota) |

### Layout (Global)
| # | Prioridade | Inconsistência |
|---|---|---|
| P3 | 🟡 | `AppLayoutRH` não envolve rotas com `ErrorBoundary` (diferente do `AppLayout` antigo) |
| P3 | 🟡 | Usuário `inativo` vê sidebar e botões de editar (Firestore bloqueia, mas UX confunde) |

---

## Inconsistências — Resumo por Prioridade

| Prioridade | Qtd | Descrição |
|---|---|---|
| 🔴 **P1** | 3 | Leituras excessivas (Header useEffect sem cache, AuditoriaDocumentos polling 30s, limite mensal ignorando parcelas futuras) |
| 🟠 **P2** | 3 | Fechamento precisa filtrar `parcelado:true`, listener subscribe causa cascade, chaves duplicadas |
| 🟡 **P3** | 10 | Chaves compartilhadas, permissões sem validação, dead code, botão sem ação |
| 🟢 **P4** | 2 | Rotas ocultas na sidebar, AppLayout.jsx não usado |
| **Total** | **18** | |

---

## Cruzamentos RH ↔ Portal do Funcionário

| Item | RH | Portal | Problema |
|---|---|---|---|
| Chave `['lancamentos']` | Dashboard, Lancamentos, Fechamento | PortalFuncionario, Espelho | Invalidação cruzada causa refetch |
| Chave `['funcionarios']` | Todas páginas admin | PortalFuncionario | Invalidação no RH força refetch no portal |
| Chave `['mensagens_rh_portal']` | EspelhoPortal | PortalFuncionario, MensagensPortal | Compartilhada — se invalida no espelho, portal refetcha |
| `FichaFinanceira.create()` | LancamentoForm | MiniDRE, MeuSalario, Extrato | Dados fluem do RH para o portal sem delay (staleTime=0) |
| `SolicitacoesFuncionario.subscribe()` | Solicitacoes.jsx | PortalFuncionario.jsx | Cada solicitação gera 2 listeners ativos simultaneamente |
| `Funcionarios.update({chave_pix})` | Solicitacoes (aprovação) | MeusDados (solicitação PIX) | Fluxo completo: funcionário solicita → RH aprova → Firestore atualiza |
| `MensagensRH.create()` | Comunicacao | MensagensPortal | Mensagem enviada pelo RH aparece no portal em tempo real |
| `ConfiguracoesRH.list()` | useRHControl (ambos) | PortalSidebar + PortalVidaFinanceira | Feature flags compartilhadas — desligar feature afeta ambos |
| `funcionario.permissoes_portal` | PermissoesPortalDialog | Todos os componentes portal | Permissões controlam visibilidade no portal |

# Auditoria Geral — Portal do Funcionário

**Data:** 17/07/2026  
**Branch:** `fix/vale-parcelado`  
**Escopo:** Exclusivamente o portal do funcionário (pastas `src/pages/PortalFuncionario.jsx`, `src/components/portal/`, `src/components/vidafinanceira/`)

---

## Arquitetura de Dados — Visão Geral

### Firestore — Coleções Utilizadas pelo Portal

| Coleção | Query no portal | Chave React Query |
|---|---|---|
| `Funcionarios` | `list()` (todos) | `['funcionarios']` |
| `FichaFinanceira` | `list()` (todos) | `['lancamentos']` |
| `GastosPessoais` | `filter({funcionario_id})` | `['gastos_pessoais', id]` |
| `MensagensRH` | `list('-data_envio', 200)` | `['mensagens_rh_portal']` |
| `FechamentoMensal` | `list()` (todos) | `['fechamentos-portal']` |
| `ComissaoPorFuncionario` | `filter({funcionario_id})` | `['comissoes_funcionario_vf', id]` |
| `TipoLancamento` | `list()` (todos) | `['tipos-lancamento']` |
| `AssinaturasPessoais` | `filter({funcionario_id})` | `['assinaturas_pessoais_vf', id]` |
| `DividasPessoais` | `filter({funcionario_id})` | `['dividas_pessoais_vf', id]` |
| `MetasObjetivos` | `filter({funcionario_id})` | `['metas_objetivos', id]` |
| `MetaFinanceira` | `filter({funcionario_id})` | `['metas_financeiras', id]` |
| `SolicitacoesFuncionario` | `subscribe()` + `filter({funcionario_id})` | listener + `['minhas_solicitacoes', id]` |
| `DocumentoFuncionario` | `filter({funcionario_id})` | `['documentos_portal', id]` |
| `AssinaturaDigital` | `filter({funcionario_id})` | `['assinaturas_portal', id]` |
| `ConfiguracoesRH` | `list()` (todos) | `['configuracoes_rh']` |

### Fluxo de Login e Identificação

```
1. PortalFuncionario: useEffect -> client.auth.me() -> setMeUser(email)
2. PortalFuncionario: Funcionarios.list() -> todos os funcionários do tenant
3. PortalFuncionario: funcionarios.find(f => f.user_email_portal === email || f.email === email)
4. Se não encontrar -> tela "Cadastro não encontrado" + botão Sair
5. Se encontrar -> funcionario.id é usado como chave para filtrar todos os dados
```

**INCONSISTÊNCIA [P1]:** `Funcionarios.list()` retorna TODOS os funcionários do tenant, mas só precisa de UM. 190k leituras/16d amplificadas por isso. Consulta ao banco poderia ser `filter({user_email_portal})`.

---

## Menu 1 — Visão Geral

**Arquivo:** `src/components/portal/VisaoGeral.jsx`  
**Componente:** `VisaoGeral`  
**Props recebidas:** `funcionario`, `totalValesMes`, `mesSelecionado`, `setAba`

### O que exibe

| Seção | Dados | Origem |
|---|---|---|
| Alerta de limite de vales | `totalValesMes` vs `limite_vales` | Calculado em PortalFuncionario (lancamentosLimiteMes) |
| Perfil do funcionário | Foto, nome, função, setor | `funcionario` object (da coleção Funcionarios) |
| Atalhos rápidos (grid 2 colunas) | 7-8 cards de navegação | Navegação interna via `setAba()` |

### Botões/Ações

| Botão | Ação | Destino |
|---|---|---|
| "Meus Dados" | `setAba('meus-dados')` | Aba Meus Dados |
| "Meu Salário" | `setAba('meu-salario')` | Aba Meu Salário |
| "Meus Vales" | `setAba('meus-vales')` | Aba Meus Vales |
| "Extrato Mensal" | `setAba('extrato')` | Aba Extrato Mensal |
| "Vida Financeira" | `setAba('vida-financeira')` | Aba Vida Financeira |
| "Minhas Comissões" | `setAba('comissoes')` | Aba Comissões |
| "Minhas Metas" | `setAba('metas')` | Aba Metas |

### Permissões (campos `permissoes_portal`)

| Campo | Efeito |
|---|---|
| `perm.ver_limite_vales` ou `ver_extrato_vales` | Mostra AlertaLimiteVale + card Meus Vales |
| `perm.ver_salario` | Mostra card Meu Salário |
| `perm.ver_extrato_completo` | Mostra card Extrato |
| `perm.ver_comissoes !== false` | Mostra card Minhas Comissões |
| `perm.ver_funcao` | Exibe função no perfil |
| `perm.ver_setor` | Exibe setor no perfil |

### IFELS — Fluxo de Decisão

```
SE funcionario.existe?
├── SIM → exibe nome + foto + função + setor
└── NÃO → não renderiza (PortalFuncionario trata separado com tela de erro)

SE perm.ver_limite_vales || perm.ver_extrato_vales?
├── SIM → renderiza AlertaLimiteVale + card Meus Vales
│   └── DENTRO: SE totalValesMes >= limite * 0.5 → alerta amarelo
│              SE totalValesMes >= limite * 0.8 → alerta laranja
│              SE totalValesMes >= limite → alerta vermelho "Limite atingido!"
└── NÃO → pula

SE perm.ver_salario?
├── SIM → renderiza card Meu Salário com valor
└── NÃO → pula (não mostra o card)

SE perm.ver_extrato_completo?
├── SIM → renderiza card Extrato
└── NÃO → pula

SE perm.ver_comissoes !== false?
├── SIM → renderiza card Comissões
└── NÃO → pula (default = true)
```

### Atalho "Ver Detalhes" do AlertaLimiteVale

**Arquivo:** `src/components/portal/AlertaLimiteVale.jsx` (56 linhas)

| Ação | Descrição |
|---|---|
| Clique em "Ver Detalhes" | `onVerDetalhes()` → `setAba('meus-vales')` |
| Dismiss | Salva no localStorage `hide_alerta_limite` + data atual |

**INCONSISTÊNCIA [P3]:** O alerta usa `localStorage` com chave fixa `hide_alerta_limite`, sem considerar `funcionario.id`. Se dois funcionários usarem o mesmo navegador, o alerta de um pode ser suprimido para o outro.

---

## Menu 2 — Meus Dados

**Arquivo:** `src/components/portal/MeusDados.jsx`  
**Componente:** `MeusDados`  
**Props recebidas:** `funcionario`

### O que exibe

| Seção | Campos | Origem |
|---|---|---|
| Foto + Nome | `funcionario.foto`, `funcionario.nome` | Coleção `Funcionarios` |
| Informações Pessoais | `nome`, `data_nascimento`, `email`, `telefone`, `data_admissao`, `funcao`, `setor` | Coleção `Funcionarios` |
| Chave PIX | `chave_pix`, `chave_pix_tipo` | Coleção `Funcionarios` |

### Botões/Ações

| Botão | Ação | Destino | Cria/Altera o quê |
|---|---|---|---|
| ✏️ (editar PIX) | `setEditandoPix(true)` | Abre formulário inline | Nada ainda |
| "Solicitar Alteração" | Abre confirmDialog | — | Nada ainda |
| "Confirmar e Enviar" | `SolicitacoesFuncionario.create()` | Cria solicitação no RH | Documento em `SolicitacoesFuncionario` com `tipo_solicitacao: 'pix'` |

### Fluxo de Solicitação de PIX

```
1. Usuário clica ✏️ → abre formulário inline (tipo + nova chave)
2. Usuário preenche e clica "Solicitar Alteração"
3. Dialog de confirmação → "Confirmar e Enviar"
4. handleSolicitarPix():
   ├── Compara pixValue + pixTipo com funcionario.chave_pix + chave_pix_tipo
   │   ├── IGUAIS → apenas fecha edição (sem criar solicitação)
   │   └── DIFERENTES → cria solicitação em SolicitacoesFuncionario
   │       ├── funcionario_id
   │       ├── funcionario_nome
   │       ├── tipo_solicitacao: 'pix'
   │       ├── status: 'pendente'
   │       ├── chave_pix_nova, chave_pix_tipo_novo
   │       ├── chave_pix_atual, chave_pix_tipo_atual
   │       └── push_enviado: false
   └── Se sucesso → fecha edição + abre dialog de confirmação
       Se erro → toast.error("Erro ao enviar solicitação")
5. Dialog de confirmação: informa que RH será notificado
```

**INCONSISTÊNCIA [P3]:** O campo `descricao` é fixo ("Solicitação de alteração de chave PIX") em vez de incluir os dados concretos (valor antigo → novo) para facilitar a análise do RH.

### Permissões

| Campo | Efeito |
|---|---|
| `perm.ver_funcao` | Exibe função em dois lugares (perfil + informações) |
| `perm.ver_setor` | Exibe setor em dois lugares |
| `perm.ver_data_admissao` | Exibe data de admissão |

---

## Menu 3 — Meu Salário

**Arquivo:** `src/components/portal/MeuSalario.jsx`  
**Componente:** `MeuSalario`  
**Props recebidas:** `funcionario`, `lancamentosFuncionario`, `comissoesFuncionarios`, `fechamentosFuncionario`, `mesSelecionado`, `tiposPersonalizados`

### O que exibe

| Seção | Dados | Cálculo |
|---|---|---|
| Salário Base / ResumoSalarioCard | `salarioBaseMes()` | Busca fechamento para o mês; se não existe, usa `funcionario.salario_base` |
| Resumo Salarial | Salário base, comissão, adicionais, descontos, líquido | `calcMes(mesSelecionado)` |
| Limite 40% | `limite40`, `percentualDesconto` | `salario_base * 0.4` |
| Histórico de Salários | Mês a mês com valores | Loop `mesesOpts` chamando `calcMes()` |
| Evolução Salarial (gráfico) | Comissão + líquido por mês | `lineData` |

### Cálculos Internos

#### `calcMes(mes)`:
```
lancs = lancamentosFuncionario.filter(data_lancamento pertence ao mes)
salarioBase = salarioBaseMes(mes) → busca fechamento; fallback = funcionario.salario_base + ajuda_custo
descontos = lancs.filter(tipo in TIPOS_LIMITE).sum(valor)
adicionais = lancs.filter(tipo in ['adicional','ajuste']).sum(valor)
comissao = calcularComissaoMensal(comissoesFuncionarios, funcionario.id, mes)
liquido = salarioBase + comissao + adicionais - descontos
```

#### `TIPOS_LIMITE` (dinâmico, via useMemo):
```
padrao = ['vale', 'vale_parcelado', 'adiantamento', 'convenio', 'consumo', 'credito_consignado']
custom = tiposPersonalizados.filter(ativo && categoria === 'desconto').map(nome)
```

#### `mesesOpts`:
```
minMes = max(data_admissao, lancamento mais antigo)
Gera sequência de minMes até mesAtual (inclusive)
```

**INCONSISTÊNCIA [P3]:** `mesesOpts` gera apenas meses de ADMISSÃO até ATUAL. Se o funcionário tem lançamentos em meses ANTERIORES à admissão (erro de cadastro), esses meses são ignorados no histórico. Além disso, meses FUTUROS (parcelas de vale) nunca aparecem, então não é possível ver descontos futuros.

**INCONSISTÊNCIA [P3]:** `adicionais` na linha 88 usa array fixo `['adicional', 'ajuste']` — ignora tipos personalizados de categoria `adicional`.

### Botões/Ações

Nenhum botão de ação — apenas exibição.

### Permissões

| Campo | Efeito |
|---|---|
| `perm.ver_salario` | Se false, exibe tela "Sem permissão" |

---

## Menu 4 — Meus Vales

**Arquivo:** `src/components/portal/MeusVales.jsx`  
**Componente:** `MeusVales`  
**Props recebidas:** `funcionario`, `lancamentosLimiteMes`, `totalValesMes`, `mesSelecionado`, `onVerComprovante`

### O que exibe

| Seção | Dados | Origem |
|---|---|---|
| Alertas (>=50%, >=80%, 100%) | `totalValesMes` vs `limite_vales` | Props |
| Cards resumo | Limite, Utilizado, Disponível | Props |
| Barra de progresso | % utilizado | Props |
| Lista de lançamentos | Cada item em `lancamentosLimiteMes` | Props (filtrados por TIPOS_LIMITE + excluindo `parcelado:true`) |

### Filtro de Dados

`lancamentosLimiteMes` é calculado em `PortalFuncionario.jsx:217`:
```
lancamentosMes.filter(l => TIPOS_LIMITE.includes(l.tipo_lancamento) && !l.parcelado)
```

Onde `TIPOS_LIMITE = ['vale', 'vale_parcelado', 'adiantamento', 'convenio', 'consumo', 'credito_consignado']`

### Botões/Ações

| Botão | Ação |
|---|---|
| 👁️ (comprovante) | `onVerComprovante(l)` → abre modal com imagem/PDF |
| Navegação de meses | Seletor de mês no topo (presente apenas em `ABAS_COM_MES`) |

**INCONSISTÊNCIA [P2]:** O texto informativo na linha 92-93 diz "O limite de 40% inclui: vale, adiantamento, convênio, consumo e crédito consignado." — mas **NÃO MENCIONA** `vale_parcelado`. Deveria incluir.

**INCONSISTÊNCIA [P3]:** `TIPO_LABELS` local tem `vale_parcelado`, mas o texto informativo não. Informação desatualizada.

### Permissões

| Campo | Efeito |
|---|---|
| `perm.ver_limite_vales` | Mostra alerta, cards, barra |
| `perm.ver_extrato_vales` | Mostra lista de lançamentos |

---

## Menu 5 — Extrato Mensal

**Arquivo:** `src/components/portal/ExtratoMensal.jsx`  
**Componente:** `ExtratoMensal`  
**Props recebidas:** `funcionario`, `lancamentosMes`, `mesSelecionado`, `onVerComprovante`, `receitasExtras`, `tiposPersonalizados`

### O que exibe

| Seção | Dados | Origem |
|---|---|---|
| Cards resumo | Créditos, Débitos, Saldo Final | Calculado de `lancamentosMes` + `receitasExtras` |
| Salário base + Ajuda de Custo | `funcionario.salario_base`, `ajuda_custo` | Funcionario object |
| Receitas Extras | Itens de `receitasExtras` | GastosPessoais com `categoria_tipo: 'receita_extra'` |
| Lista de lançamentos | Todos os `lancamentosMes` ordenados por data | FichaFinanceira |

### Lógica de Classificação

```
totalDebitos = lancamentosMes.filter(tiposDesconto && !parcelado).sum(valor)
totalCreditos = lancamentosMes.filter(TIPOS_ADICIONAL_DEFAULT || parcelado).sum(valor)
isDebito(l) = tiposDesconto.includes(l.tipo_lancamento) && !l.parcelado
```

Onde:
- `tiposDesconto` = `TIPOS_LIMITE_BASE` + custom tipos com `categoria: 'desconto'`
- `TIPOS_ADICIONAL_DEFAULT` = `['adicional', 'ajuste', 'comissao']`

**INCONSISTÊNCIA [P3]:** `totalCreditos` usa `TIPOS_ADICIONAL_DEFAULT` (fixo) e não inclui tipos personalizados de categoria `adicional`. Tipos custom adicionais são ignorados no cálculo de créditos.

**INCONSISTÊNCIA [P3]:** Labels dinâmicas via `labels` useMemo incluem tipos custom, mas o cálculo de `totalCreditos` não — o valor fica correto (incluído em soma) mas a classificação crédito/débito pode estar errada para tipos custom adicionais.

### Botões/Ações

| Botão | Ação |
|---|---|
| 👁️ (comprovante) | `onVerComprovante(l)` → modal |

### Permissões

| Campo | Efeito |
|---|---|
| `perm.ver_extrato_completo === false` | Tela "Sem permissão" |

---

## Menu 6 — Meus Documentos

**Arquivo:** `src/components/portal/MeusDocumentos.jsx`  
**Componente:** `MeusDocumentos`  
**Props recebidas:** `funcionarioId`

### O que exibe

Lista de documentos do funcionário (da coleção `DocumentoFuncionario`).

### Fluxo de Dados

```
useQuery(['documentos_portal', funcionarioId]) ->
  DocumentoFuncionario.filter(funcionario_id)
```

### Botões/Ações

| Botão | Ação | Destino |
|---|---|---|
| Download | Abre URL do documento | Storage URL |

---

## Menu 7 — Minha Vida Financeira

**Arquivo raiz:** `src/components/portal/PortalVidaFinanceira.jsx`  
**Subcomponentes:** `MiniDRE.jsx` + 4 abas de gestão de dados pessoais

### Abas Internas

| Aba | Componente | Dados que busca | CRUD |
|---|---|---|---|
| Visão Geral (dashboard) | `MiniDRE` | Props + computado de `lancamentosMes` | Leitura |
| Meus Gastos | `MeusGastos` (`vidafinanceira/`) | GastosPessoais | CRUD completo |
| Assinaturas | `MinhasAssinaturas` (`vidafinanceira/`) | AssinaturasPessoais | CRUD completo |
| Dívidas | `MinhasDividas` (`vidafinanceira/`) | DividasPessoais | CRUD + Pagar Parcela |
| Metas | `MetasObjetivos` (`vidafinanceira/`) | MetasObjetivos | CRUD |
| Simular | `SimuladoresFinanceiros` | Nenhum | Estático |
| Aprender | `EducacaoFinanceira` | Nenhum | Estático |

### MiniDRE — Verificação Detalhada

**Arquivo:** `MiniDRE.jsx`

#### Classificação de Lançamentos do RH

| Grupo | Tipos incluídos | Exibição |
|---|---|---|
| Adicionais (Outras Receitas) | `adicional`, `ajuste` + custom `categoria: 'adicional'` | Linha "Outras Receitas" nas Entradas |
| Consignado | `credito_consignado` | Um item por documento em Despesas Fixas |
| Descontos RH | `vale`, `vale_parcelado`, `adiantamento`, `convenio`, `consumo` + custom `categoria: 'desconto'` | Um item por tipo em Despesas Fixas |
| Investimentos RH | `investimento` | Um item por documento em Investimentos |
| Gastos Variáveis RH | `categoria_tipo: 'gasto_variavel'` + por nome | Um item em Gastos Variáveis |

#### Diálogos de Detalhe

| Linha clicável | O que mostra |
|---|---|
| "Total Despesas Fixas" | Lista completa de itensFixos (gastos, assinaturas, dívidas, consignados, descontos) |
| "Total Investimentos" (se > 0) | Todos investimentos (pessoais + RH) |
| "Total Gastos Variáveis" (se > 0) | Todos gastos variáveis (pessoais + RH) |

**INCONSISTÊNCIA [P2]:** O diálogo de "Despesas Fixas" mostra todos os itens em uma lista plana, sem agrupar por tipo. Usuário vê uma lista de 15 itens sem entender a hierarquia (gasto fixo vs assinatura vs dívida vs consignado vs desconto).

**INCONSISTÊNCIA [P3]:** `Investimentos RH` usa `l.tipo_lancamento === 'investimento'` — não existe esse tipo no `TIPO_LABELS` padrão. É um tipo que só funciona se criado manualmente no banco com o nome exato `'investimento'`.

**INCONSISTÊNCIA [P3]:** `Gastos Variáveis RH` busca por `categoria_tipo` ou `categoria_nome` — mas lançamentos de `FichaFinanceira` normalmente não têm esses campos (são campos de `GastosPessoais`). A chance de encontrar algo é quase zero.

**INCONSISTÊNCIA [P2]:** Fechamentos (`FechamentoMensal`) NÃO são exibidos em lugar nenhum dentro da Vida Financeira — nem no MiniDRE, nem nos gráficos. O salário base usado no DRE vem de `funcionario.salario_base` (não congelado), ignorando fechamentos processados.

### DashboardFinanceiro (Vida Financeira Pessoal — página standalone)

**Arquivo:** `src/components/vidafinanceira/DashboardFinanceiro.jsx`

**INCONSISTÊNCIA [P2]:** Este componente busca seus próprios dados de `GastosPessoais`, `AssinaturasPessoais`, `DividasPessoais`, `MetasObjetivos` — duplicando as mesmas queries que o `PortalVidaFinanceira` já faz. 4 queries a mais por acesso.

**INCONSISTÊNCIA [P3]:** `descontosRH` no DashboardFinanceiro usa array fixo `['vale', 'adiantamento', 'convenio', 'consumo', 'credito_consignado']` — não inclui `vale_parcelado` nem tipos custom de desconto.

---

## Menu 8 — Minhas Comissões

**Arquivo:** `src/components/portal/MinhasComissoes.jsx`  
**Props recebidas:** `funcionarioId`, `funcionarioSetor`

### O que exibe

Comissões por período + metas de comissão.

### Fluxo de Dados

```
useQuery(['comissoes', funcionarioId]) -> ComissaoPorFuncionario.filter(funcionario_id)
useQuery(['comissoes_setor']) -> SetoresComissao.list()
useQuery(['metas', funcionarioId]) -> MetaComissao.filter(funcionario_id)
```

---

## Menu 9 — Minhas Metas

**Arquivo:** `src/components/portal/PortalMetas.jsx`  
**Props recebidas:** `funcionarioId`, `funcionarioSetor`, `salarioBase`, `ajudaCusto`, `comissoesFuncionarios`, `mesSelecionado`

### Fluxo de Dados

```
useQuery(['gastos_pessoais', funcionarioId])
useQuery(['metas_financeiras', funcionarioId])
useQuery(['metas_comissao']) -> MetaComissao.list()
```

---

## Menu 10 — Mensagens

**Arquivo:** `src/components/portal/MensagensPortal.jsx`  
**Props recebidas:** `funcionario`

### Fluxo

```
useEffect: client.entities.MensagensRH.subscribe() — listener real-time
  ├── Se nova mensagem for para este funcionário (setor / funcionario_id / todos)
  └── incrementa contador de não lidas

Lista de mensagens disponíveis filtradas por público-alvo:
  ├── 'todos' → todas
  ├── 'setor' → funcionario.setor === m.setor_alvo
  └── 'funcionario' → funcionario.id === m.funcionario_id_alvo

Marcação de leitura:
  ├── lidas_por: array de funcionario.id
  └── Ao clicar → push do ID no array
```

---

## Menu 11 — Minhas Solicitações

**Arquivo:** `src/components/portal/MinhasSolicitacoes.jsx`  
**Props recebidas:** `funcionario`

### Fluxo

```
useQuery(['minhas_solicitacoes', funcionario.id]) ->
  SolicitacoesFuncionario.filter(funcionario_id)

Tipos de solicitação:
  ├── ferias
  ├── vale
  ├── pix
  ├── banco_horas
  ├── atestado
  ├── documento
  └── outro

Cada tipo tem seu próprio formulário de criação.
```

**INCONSISTÊNCIA [P2]:** O formulário de solicitação de vale abre um modal que permite ao usuário solicitar um vale — mas o portal não tem permissão para criar lançamentos em `FichaFinanceira`. O fluxo depende de aprovação do RH. Se a feature `solicitacoes_vale` estiver desativada, o botão não aparece.

---

## Menu 12 — Assinaturas Digitais

**Arquivo:** `src/components/portal/AssinaturasPortal.jsx`  
**Props recebidas:** `funcionario`

### Fluxo

```
useQuery(['assinaturas_portal', funcionario.id]) ->
  AssinaturaDigital.filter(funcionario_id, ativo: true)

Lista documentos pendentes de assinatura.
```

---

## Inconsistências Encontradas — Ordenadas por Menu

### Menu 1 — Visão Geral
| # | Prioridade | Inconsistência |
|---|---|---|
| P1 | 🔴 ALTA | `Funcionarios.list()` retorna todos os funcionários para identificar um. Deveria usar `filter({user_email_portal})`. |
| P3 | 🟡 MÉDIA | `localStorage` com chave fixa `hide_alerta_limite` conflita entre usuários do mesmo navegador. |

### Menu 2 — Meus Dados
| # | Prioridade | Inconsistência |
|---|---|---|
| P3 | 🟡 MÉDIA | Descrição da solicitação PIX não inclui dados concretos (chave antiga → nova). |

### Menu 3 — Meu Salário
| # | Prioridade | Inconsistência |
|---|---|---|
| P3 | 🟡 MÉDIA | `mesesOpts` gera apenas meses de admissão até atual — meses futuros (parcelas) excluídos. |
| P3 | 🟡 MÉDIA | `adicionais` (linha 88) usa array fixo `['adicional', 'ajuste']` — ignora tipos personalizados `categoria: 'adicional'`. |

### Menu 4 — Meus Vales
| # | Prioridade | Inconsistência |
|---|---|---|
| P2 | 🟠 MÉDIA | Texto informativo do limite não menciona `vale_parcelado`. |
| P3 | 🟢 BAIXA | `TIPO_LABELS` local e texto informativo divergem. |

### Menu 5 — Extrato Mensal
| # | Prioridade | Inconsistência |
|---|---|---|
| P3 | 🟡 MÉDIA | `totalCreditos` usa `TIPOS_ADICIONAL_DEFAULT` fixo — ignora tipos custom `categoria: 'adicional'`. |

### Menu 7 — Vida Financeira
| # | Prioridade | Inconsistência |
|---|---|---|
| P2 | 🟠 MÉDIA | Diálogo de "Despesas Fixas" lista sem agrupamento hierárquico. |
| P2 | 🟠 MÉDIA | Fechamentos (`FechamentoMensal`) não são usados no MiniDRE — salário base nunca é congelado. |
| P2 | 🟠 MÉDIA | `DashboardFinanceiro` duplica queries de GastosPessoais, Assinaturas, Dívidas, Metas. |
| P3 | 🟢 BAIXA | `Investimentos RH` busca tipo `'investimento'` que não existe no TIPO_LABELS padrão. |
| P3 | 🟢 BAIXA | `Gastos Variáveis RH` busca campos que FichaFinanceira não tem (`categoria_tipo`, `categoria_nome`). |
| P3 | 🟡 MÉDIA | `DashboardFinanceiro.descontosRH` usa array fixo sem `vale_parcelado` nem custom. |

### Legenda de Prioridades
| Prioridade | Significado |
|---|---|
| 🔴 P1 | Impacta diretamente leituras do Firestore (custo/limite) |
| 🟠 P2 | Impacta experiência do usuário (dados errados/confusos) |
| 🟡 P3 | Impacta consistência de dados (tipos custom ignorados) |
| 🟢 P4 | Baixo impacto, melhoria cosmética ou redundância menor |

---

## Resumo de Inconsistências por Prioridade

| Prioridade | Quantidade |
|---|---|
| 🔴 P1 (leituras excessivas) | 1 |
| 🟠 P2 (UX/dados errados) | 4 |
| 🟡 P3 (consistência) | 6 |
| 🟢 P4 (cosmética) | 2 |
| **Total** | **13** |

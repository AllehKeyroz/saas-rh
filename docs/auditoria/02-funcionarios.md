# Auditoria — Funcionários

## Arquivos: Funcionarios.jsx, Funcionarios360.jsx, FuncionarioForm.jsx, PastaDocumentos.jsx, DocumentosFuncionarioTab.jsx, FeriasBancoHorasTab.jsx, ProfileHeader360.jsx, InternalNavigation360.jsx, DadosPessoais360.jsx, Dashboard360.jsx, HistoricoPagamentos360.jsx, Documentos360.jsx, stub-components.jsx

---

## 🔴 Críticos

### 01. `getHojeBR()` — parse inseguro de `toLocaleString`
- **Arquivo:** FuncionarioForm.jsx:18-21
- **Caminho:** Funcionários > Cadastro (qualquer ação)
- **Ação:** `new Date(str)` onde `str = toLocaleString('en-US', { timeZone: 'America/Sao_Paulo' })`
- **Problema:** Formato "M/D/YYYY, H:MM:SS AM" não é garantido de ser parseado por todos os engines JS
- **Solução:** Usar `Intl.DateTimeFormat` ou calcular offset manualmente

### 02. `calcularIdade` — mescla UTC e local
- **Arquivo:** FuncionarioForm.jsx:28-34
- **Caminho:** Funcionários > Cadastro (cálculo automático de idade)
- **Ação:** `nasc = new Date(dataNascimento + 'T00:00:00')` (UTC) vs `hoje = getHojeBR()` (local)
- **Problema:** Pode errar idade em até 1 dia quando UTC ultrapassa meia-noite
- **Solução:** Usar mesmo timezone para ambas

### 03. `onRefresh` não passado para `Documentos360`
- **Arquivo:** Funcionarios360.jsx:141
- **Caminho:** Funcionários > 360 > Documentos
- **Ação:** Upload/exclusão de documento não reflete no cache do pai
- **Solução:** Adicionar `onRefresh={() => queryClient.invalidateQueries(...)}`

---

## 🟠 Altos

### 04. `canEdit = true` hardcoded
- **Arquivo:** Funcionarios.jsx:233
- **Caminho:** Funcionários > Lista
- **Ação:** Qualquer usuário pode editar/excluir — sem verificação de role
- **Solução:** Verificar `isAdmin || isRH` do `useUserRole`

### 05. `editing` sempre null em AdvertenciasTabContent
- **Arquivo:** Funcionarios.jsx:130
- **Caminho:** Funcionários > Aba Advertências
- **Ação:** `editing` state nunca é populado — edição de advertência não funciona
- **Solução:** Adicionar handler que seta `editing` ao clicar em editar

### 06. `Advertencias.delete` sem optional chaining
- **Arquivo:** Funcionarios.jsx:136
- **Caminho:** Funcionários > Aba Advertências > Excluir
- **Ação:** `client.entities.Advertencias.delete(id)` — se entidade for undefined, quebra
- **Solução:** `client.entities.Advertencias?.delete(id)`

### 07. 9 componentes STUB na Visão 360
- **Arquivo:** stub-components.jsx
- **Lista:** Advertencias360, Ferias360, BancoHoras360, Desempenho360, HistoricoSalario360, HistoricoFuncaoSetor360, Auditoria360, AnexosGerais360, Dashboard360.documentosVencendo
- **Status:** Todos mostram "Módulo será integrado" ou retornam `0`

### 08. ProfileHeader360 — componente morto (nunca importado)
### 09. InternalNavigation360 — componente morto (nunca importado)

---

## 🟡 Médios

### 10. `visivel_ao_funcionario` default inconsistente
- PastaDocumentos.jsx:56 → `false`
- DocumentosFuncionarioTab.jsx:156 → `true`
- Documentos360.jsx:48 → `false`
- **Ação:** Dependendo de onde o upload é feito, o documento fica visível ou não

### 11. FeriasBancoHorasTab — timezone: `new Date()` sem BRT
- **Arquivo:** FeriasBancoHorasTab.jsx:21
- **Ação:** `hoje = new Date()` usa timezone local do browser, não Brasília
- **Solução:** Usar `getHojeBR()` padronizado

### 12. Filtro "Todos com pendências" mostra todos os ativos
- **Arquivo:** FeriasBancoHorasTab.jsx:363
- **Ação:** `return situacao` retorna true para `{ todosConsumidos: true }` (férias em dia)
- **Solução:** `situacao && !situacao.todosConsumidos`

### 13. `fechamentos[0]` sem ordenação garantida
- **Arquivo:** Dashboard360.jsx:41
- **Caminho:** 360 > Dashboard > Último Fechamento
- **Ação:** Nenhum `.sort()` — o primeiro elemento depende da ordem do backend
- **Solução:** `.sort((a,b) => b.mes_referencia.localeCompare(a.mes_referencia))`

### 14. `documentosVencendo` sempre retorna 0 (stub)
- **Arquivo:** Dashboard360.jsx:36-39
- **Problema:** A lógica comentada diz "seria mais complexa" — `return false`

### 15. CPF oculto sem justificativa
- **Arquivo:** DadosPessoais360.jsx:32
- **Ação:** Exibe "Não disponível" mesmo tendo o campo `cpf` no banco

---

## 🔵 Baixos

### 16. `header` variável morta (Funcionarios.jsx:255)
### 17. `periodoMatch` — comparação de string ISO funcional mas frágil (Funcionarios.jsx:248)
### 18. Import morto `Download` (Funcionarios360.jsx:8)
### 19. Import morto `Switch` (Documentos360.jsx:7)
### 20. Prop `lancamentos` nunca usada em LinhaTempoInteligente360 (stub-components.jsx:262)
### 21. Emoticons como ícones em InternalNavigation360 (inconsistente com lucide-react)
### 22. `formatDate` não usado em ProfileHeader360 (formato manual)
### 23. Filtro de busca exibe apenas funcionários COM documentos (DocumentosFuncionarioTab.jsx:290-296)

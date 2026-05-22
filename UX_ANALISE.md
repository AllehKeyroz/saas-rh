# Análise de UX — Problemas Encontrados

## 🔴 Críticos

| # | Problema | Onde | Impacto |
|---|----------|------|---------|
| 1 | Nenhuma página trata erro de query | Todos os `useQuery` sem `error`/`isError` | Se o Firestore falhar, usuário vê skeleton infinito |
| 2 | CRUD sem feedback | Configurações, Advertências, Modelos | Usuário cria/altera/deleta e não sabe se funcionou |
| 3 | Role `consulta` bloqueada | App.jsx | Usuários consulta só veem 404 |

## 🟡 Altos

| # | Problema | Onde | Impacto |
|---|----------|------|---------|
| 4 | 16 `confirm()` nativos | Configurações, Comissões, Modelos | Quebra imersão do app |
| 5 | Textos em inglês | PageNotFound.jsx | App em português com página em inglês |
| 6 | Form sem `htmlFor`/`id` | Login, Register | Inacessível para leitores de tela |
| 7 | Carregamento sem feedback | AssinaturasDigitais, CentroControleRH | Tela branca enquanto carrega |

## 🟢 Médios

| # | Problema | Onde |
|---|----------|------|
| 8 | Componentes que retornam `null` sem mensagem | AlertBanner, AniversariantesCard, AlertaFinanceiro |
| 9 | Parâmetros de URL invisíveis | `?tab=`, `?tipo=` |
| 10 | Icon buttons sem `aria-label` | Vários formulários e tabelas |
| 11 | Imagens sem `alt` descritivo | Fotos de funcionários com `alt=""` |

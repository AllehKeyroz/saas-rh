# Auditoria de Código — rhdtalia

**Data:** 27/06/2026  
**Arquivos auditados:** ~120  
**Total de problemas:** ~150  

---

## Prioridade por Severidade

| Severidade | Qtde | Ação |
|---|---|---|
| 🔴 **Crítico** | 12 | Corrigir imediatamente (produção em risco) |
| 🟠 **Alto** | 25 | Corrigir nas próximas semanas |
| 🟡 **Médio** | 60 | Corrigir conforme disponibilidade |
| 🔵 **Baixo** | ~50 | Melhorias e refatorações |

---

## Top 10 Urgentes (ordem de impacto)

| # | Problema | Arquivo | Risco |
|---|---|---|---|
| 1 | Timezone: `new Date(l.data_lancamento)` interpreta ISO como UTC — TODOS os consignados (criados dia 1) aparecem no mês errado em UTC-3 | Lancamentos.jsx:81, Fechamento.jsx:160, +5 arquivos | **Dados incorretos** |
| 2 | `CreateFileSignedUrl` chamada mas não existe — backup quebra com TypeError | BackupsTab.jsx:62 | **Sistema de backup inoperante** |
| 3 | `onSaved` do ModeloForm/FinalidadeForm não retorna argumentos — auditoria registra `undefined` | ModelosTab.jsx:125, FinalidadesTab.jsx:100 | **Auditoria corrompida** |
| 4 | Reprocessar funcionário incrementa `parcelas_pagas` dos consignados novamente — contratos finalizados prematuramente | Fechamento.jsx:269-277 | **Dados financeiros incorretos** |
| 5 | `ResponderLoteModal` não chama `processarAprovacaoPix` — aprovação em lote de PIX não atualiza funcionário | Solicitacoes.jsx:196-223 | **Funcionalidade quebrada** |
| 6 | Selecionar mês no filtro não afeta consignados (mostra todos). Busca por nome no select de funcionário do Espelho não funciona em produção | Lancamentos.jsx:112-129, EspelhoPortal.jsx | **Filtro inconsistente** |
| 7 | DetalhesComissao/CorrigirComissaoDialog usam setores HARDCODED (salao/cozinha/etc) — incompatíveis com setores dinâmicos | DetalhesComissao.jsx:66-70, CorrigirComissaoDialog.jsx:28-37 | **Funcionalidade quebrada** |
| 8 | handleRecalcular em DetalhesComissao não respeita feature flag `exclusao_faltas_atestados` — sempre exclui | DetalhesComissao.jsx:57-101 | **Inconsistência de configuração** |
| 9 | ExtratoMensal exibe `ajuda_custo` como linha separada mesmo já inclusa em "Salário Base" — dupla contagem visual | ExtratoMensal.jsx:80-97 | **UX enganoso** |
| 10 | XLSX export usa `calcular` (recalculo vivo) enquanto PDF usa `calcularComFechado` (valores congelados) — números divergem | Fechamento.jsx:391 vs 394 | **Relatórios inconsistentes** |

---

## Problemas Sistêmicos (afetam múltiplos arquivos)

### Timezone (afeta 10+ arquivos)
`new Date("YYYY-MM-DD")` é interpretado como UTC midnight. `getMonth()/getFullYear()` retornam valores UTC. Em UTC-3 (Brasil), datas no dia 1 pertencem ao MÊS ANTERIOR.  
**Afeta:** Lancamentos.jsx, Fechamento.jsx, DetalhesFechamentoModal, pdfExport, xlsxExport, PortalFuncionario, RelatorioGeral

### Toast (2 sistemas concorrentes)
- `sonner` (usado em: Configuracoes, Usuarios, LancamentoForm, MeusDados, BackupsTab)
- `shadcn useToast` (usado em: LimiteValesTab, AssinaturaGovBRTab, MiniDRE, PortalFuncionario)  
**UX inconsistente**, duas APIs diferentes.

### Componentes Mortos (definidos mas nunca importados)
- `MobileNavigation.jsx`
- `ConsolidatedFinancialDashboard.jsx`
- `ProfileHeader360.jsx`
- `InternalNavigation360.jsx`
- `VidaFinanceiraPessoal.jsx` (provavelmente)

### Stubs (9 na Visão 360)
Advertencias360, Ferias360, BancoHoras360, Desempenho360, HistoricoSalario360, HistoricoFuncaoSetor360, Auditoria360, AnexosGerais360, documentosVencendo (Dashboard360)

---

## Próximos Passos

1. Corrigir timezone: criar helper `parseDateBR(str)` que usa `T12:00:00` para neutralizar UTC
2. Adicionar `CreateFileSignedUrl` em `client.integrations.Core`
3. Corrigir `onSaved` dos forms de modelo/finalidade para retornar dados
4. Adicionar guarda em `processarFuncionario` para não incrementar `parcelas_pagas` em reprocessamento
5. Adicionar `processarAprovacaoPix` no `ResponderLoteModal`

---

## Documentos por Área

| Documento | Escopo |
|---|---|
| `01-dashboard-rh.md` | DashboardRH, StatisticsGrid, IndicadoresFinanceiros |
| `02-funcionarios.md` | Funcionarios, 360, Ferias/BH |
| `03-lancamentos-fechamento.md` | Lancamentos, Fechamento, Export |
| `04-portal-funcionario.md` | Portal, Espelho, MeuSalario, Extrato |
| `05-comissoes-solicitacoes.md` | Comissoes, Solicitacoes, Documentos |
| `06-config-auth.md` | Configuracoes, Auth, Usuarios, Auditoria |

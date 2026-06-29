# Auditoria — Dashboard RH

## Arquivos: DashboardRH.jsx, StatisticsGrid.jsx, ClickableStatsCard.jsx, IndicadoresFinanceiros.jsx, MobileNavigation.jsx, ConsolidatedFinancialDashboard.jsx, dashboardRoutes.js

---

## 🔴 Críticos

### 01. `valesMes` inclui TODOS os descontos, não apenas vales
- **Arquivo:** DashboardRH.jsx:94-95
- **Caminho:** Dashboard > Card "Vales no Mês"
- **Ação:** O card `valesMes` soma `descontosList` que inclui `convenio`, `consumo`, `credito_consignado` — não apenas vales
- **Lógica esperada:** O card deveria se chamar "Descontos no Mês" ou filtrar apenas `['vale', 'vale_parcelado']`
- **Lógica implementada:** Soma tudo que está em `descontosList` (mergeTipos + defaults)
- **Solução:** Renomear o card para "Descontos no Mês" ou criar filtro específico

### 02. ConsolidatedFinancialDashboard — folha idêntica em todos os meses
- **Arquivo:** ConsolidatedFinancialDashboard.jsx:84
- **Caminho:** Dashboard Financeiro Consolidado (não usado atualmente)
- **Ação:** `folha: funcionarios.reduce(...)` calcula com TODOS os funcionários, sem filtro por mês
- **Lógica esperada:** Folha deveria variar por mês (admissões, demissões)
- **Lógica implementada:** Mesmo valor em todos os 6 meses — gráfico mostra linha reta
- **Nota:** Componente não importado (morto)

---

## 🟠 Altos

### 03. IndicadoresFinanceiros — `TIPOS_ADIANTAMENTO` diferente de DashboardRH
- **Arquivo:** IndicadoresFinanceiros.jsx:93-100
- **Caminho:** Dashboard > Indicadores Financeiros
- **Inconsistência:** IndicadoresFinanceiros usa `['vale', 'adiantamento', 'vale_parcelado']` + custom `categoria === 'desconto'`. DashboardRH usa `mergeTipos(..., 'desconto')` que inclui `convenio, consumo, credito_consignado`. Os valores divergem.

### 04. Comissão não distribuída por setor em IndicadoresFinanceiros
- **Arquivo:** IndicadoresFinanceiros.jsx:152-180
- **Caminho:** Dashboard > Indicadores > Gráfico por Setor
- **Ação:** `dadosPorSetor` não inclui `comissaoModulo`
- **Lógica esperada:** Breakdown por setor deveria incluir comissões para bater com total global
- **Solução:** Alocar comissão proporcionalmente aos setores

### 05. `feriasVencidas` — `periodo_aquisitivo` string vs number
- **Arquivo:** DashboardRH.jsx:75-77
- **Caminho:** Dashboard > Card "Férias Vencidas"
- **Ação:** `fc.periodo_aquisitivo` pode ser string ("1") mas `p` é number (1). Set comparação falha
- **Lógica implementada:** `consumidos.has(p)` — se backend retorna string, lookup sempre falha
- **Solução:** Converter `periodo_aquisitivo` para número: `Number(fc.periodo_aquisitivo)`

---

## 🟡 Médios

### 06. `MobileNavigation.jsx` — componente morto (nunca importado)
- **Arquivo:** MobileNavigation.jsx (componente inteiro)
- **Ação:** Não utilizado por nenhum outro componente

### 07. `ConsolidatedFinancialDashboard.jsx` — componente morto
- **Arquivo:** ConsolidatedFinancialDashboard.jsx (inteiro)
- Mesmo caso do MobileNavigation

### 08. Card "Em Férias" sem cursor-pointer/hover/keyboard
- **Arquivo:** ClickableStatsCard.jsx:56,65-66,69
- **Caminho:** Dashboard > Card "Em Férias"
- **Ação:** `onClick={onFeriasClick}` sem `route` → `tabIndex={-1}`, `cursor-default`, sem hover
- **Solução:** `ClickableStatsCard` precisa tratar `onClick` igual a `route` para interatividade

### 09. `IndicadoresFinanceiros` — imports mortos
- **Arquivo:** IndicadoresFinanceiros.jsx:6,12,14
- **Itens:** `Badge`, `parseISO`, `startOfMonth`, `endOfMonth`, `mergeTipos` — importados mas não usados

### 10. `vales` computado mas nunca renderizado
- **Arquivo:** IndicadoresFinanceiros.jsx:134-136,148
- **Ação:** Variável `vales` calculada no useMemo e retornada no objeto, mas nenhum JSX a consome

### 11. Férias — `prazoLimite` usava `+11` meses (CLT: +12)
- **Arquivo:** DashboardRH.jsx:84 (já corrigido)
- Já foi corrigido para `+ 12` na última sessão

### 12. DashboardRH.jsx — `funcionarios` duplicado nas deps do useMemo (linha 122)

---

## 🔵 Baixos

### 13. `colorClasses` (ClickableStatsCard.jsx:27-34) duplicado com `iconColorClasses` (linhas 36-43)
### 14. `feriasVencidas` e `docsVencendo` geram alertas, mas `solicitacoesPendentes` não (DashboardRH.jsx:126-129)
### 15. Filtro de demitidos: DashboardRH.jsx:134 usa `f.ativo !== false` mas NÃO checa `data_demissao`, ao contrário de stats (linha 65)

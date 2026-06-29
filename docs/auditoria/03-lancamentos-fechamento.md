# Auditoria — Lançamentos e Fechamento

## Arquivos: Lancamentos.jsx, Fechamento.jsx, LancamentoForm.jsx, TiposLancamentoForm.jsx, DetalhesFuncionarioModal.jsx, ImportarLancamentos.jsx, DetalhesFechamentoModal.jsx, FechamentoIndividualDialog.jsx, ExportarContrachequesMassaDialog.jsx, pdfExport.js, xlsxExport.js

---

## 🔴 Críticos

### 01. TIMEZONE SISTÊMICO — `new Date(l.data_lancamento)` em ISO string
- **Arquivos:** Lancamentos.jsx:81, Fechamento.jsx:160, DetalhesFechamentoModal.jsx:27, pdfExport.js:102-103, xlsxExport.js:22-23
- **Caminho:** TODOS os filtros por mês em lançamentos
- **Ação:** `new Date("2026-01-01")` = UTC midnight. No Brasil (UTC-3), `getMonth()` = 11 (Dezembro anterior)
- **Impacto:** Consignados são criados sempre com dia 01 → TODOS aparecem no mês errado
- **Solução:** Criar helper `parseDateBR(str)` que adiciona `T12:00:00` para neutralizar timezone

### 02. Reprocessamento incrementa `parcelas_pagas` novamente
- **Arquivo:** Fechamento.jsx:269-277
- **Caminho:** Fechamento > Reprocessar
- **Ação:** `processarFuncionario` incrementa `parcelas_pagas` SEMPRE, inclusive em reprocessamento
- **Impacto:** Reprocessar 10 vezes → contrato de 36 parcelas finaliza em 3 reprocessamentos
- **Solução:** Só incrementar se `!jafechado || reprocessMode` — mas verificar se já foi incrementado

### 03. XLSX export usa `calcular` (vivo), PDF usa `calcularComFechado` (congelado)
- **Arquivo:** Fechamento.jsx:391 vs 394
- **Caminho:** Fechamento > Exportar > PDF vs XLSX
- **Ação:** PDF passa `calcularComFechado`, XLSX passa `calcular`
- **Impacto:** Mesmo mês processado mostra valores DIFERENTES nos dois formatos
- **Solução:** XLSX também usar `calcularComFechado`

### 04. Lançamento comum (`else`) espalha campos de consignado no Firestore
- **Arquivo:** LancamentoForm.jsx:271
- **Ação:** `{ ...form }` inclui `numero_contrato`, `instituicao_financeira`, `mes_inicio_desconto`, etc. em FichaFinanceira
- **Impacto:** Polui dados. Campos sem sentido em lançamentos de vale, comissão, etc.

---

## 🟠 Altos

### 05. ImportarLancamentos — `TIPOS_VALIDOS` hardcoded (sem tipos customizados)
- **Arquivo:** ImportarLancamentos.jsx:9
- **Ação:** `['vale','adiantamento','convenio','consumo','adicional','ajuste','comissao']` — sem `credito_consignado`, sem custom tipos
- **Solução:** Carregar tipos do Firestore

### 06. `salarioLiquido` sem comissão — 3 locais
- **Arquivos:** Lancamentos.jsx:274, DetalhesFuncionarioModal.jsx:31, DetalhesFechamentoModal.jsx:35
- **Ação:** `base + ajuda_custo + adicionais - descontos` (SEM comissão)
- **Inconsistência:** Fechamento.jsx:220 inclui `comissaoGorjeta`
- **Solução:** Adicionar comissão ao cálculo

### 07. `DetalhesFuncionarioModal` exclui sem auditoria
- **Arquivo:** DetalhesFuncionarioModal.jsx:23-27
- **Caminho:** Lançamentos > Modal detalhes > Excluir
- **Ação:** `delete` sem `registrarAuditoria`
- **Solução:** Adicionar chamada de auditoria

### 08. `vale_parcelado` não aparece no RelatorioGeral
- **Arquivo:** RelatorioGeral.jsx:36-37
- **Ação:** `totalDescontos` não inclui `vale_parcelado` na lista de tipos
- **Impacto:** Lançamentos parcelados são invisíveis no relatório

### 09. FechamentoIndividual — `tipo` (mensal/rescisao/ferias) ignorado na lógica
- **Arquivo:** Fechamento.jsx:306-316
- **Ação:** A UI oferece os 3 tipos, mas `processarFuncionario` sempre executa a mesma lógica
- **Solução:** Implementar lógica diferente para rescisão/férias

---

## 🟡 Médios

### 10. LancamentoForm parcelado — perda de R$0,01 por arredondamento
- **Arquivo:** LancamentoForm.jsx:256
- **Ação:** `(100 / 3).toFixed(2)` = 33.33 × 3 = 99.99. Diferença de R$0,01
- **Solução:** Última parcela = total - soma das anteriores

### 11. `exportDemonstrativoPDF` faz fetch de `tiposLancamento` a cada chamada
- **Arquivo:** pdfExport.js:91
- **Ação:** Chamado para cada funcionário na exportação ZIP — multiplica requisições
- **Solução:** Receber `tiposLancamento` como parâmetro

### 12. Filtro demitidos: Lancamentos.jsx filtra `data_demissao`, Fechamento.jsx não
- **Arquivo:** Lancamentos.jsx:90 vs Fechamento.jsx:164
- **Inconsistência:** Demitidos aparecem no fechamento mas não nos lançamentos
- **Solução:** Padronizar filtro

### 13. `ExportarContrachequesMassaDialog` — `import('jspdf')` dentro do loop
- **Arquivo:** ExportarContrachequesMassaDialog.jsx:37
- **Ação:** Dynamic import a cada iteração (desnecessário)

### 14. `TiposLancamentoForm` — `comissao` em `ALL_DEFAULT_TIPOS` mas em `COLUNAS_FIXAS`
- **Arquivo:** TiposLancamentoForm.jsx:221-277
- **Ação:** Checkbox de visibilidade para `comissao` aparece mas NÃO tem efeito (Fechamento remove fixamente)
- **Solução:** Remover `comissao` dos tipos padrão exibidos com checkbox de coluna

---

## 🔵 Baixos

### 15. `CelulaLancamentos` sem proteção para `lancamentos` undefined (Fechamento.jsx:27)
### 16. `lancamentos` filter — limit 1000 pode perder dados (Lancamentos.jsx:39-42)
### 17. `handleSaved` não invalida `tipos-lancamento` (Lancamentos.jsx:131-134)
### 18. `calcular()` vs `calcularComFechado` — contagem de lançamentos diferentes (Fechamento.jsx:181 vs 222)
### 19. `TiposLancamentoForm` — refetch desnecessário de ConfiguracoesRH (linha 154)
### 20. Icone `Power` com cores contra-intuitivas (amarelo=ativo, verde=inativo — TiposLancamentoForm.jsx:318)

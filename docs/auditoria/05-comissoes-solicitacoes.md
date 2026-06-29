# Auditoria — Comissões, Solicitações, Documentos/Modelos, Relatórios

## Arquivos: Comissoes.jsx, Solicitacoes.jsx, Relatorios.jsx, LancarComissao.jsx, ConfigurarSetoresComissao.jsx, ConfigurarMetasComissao.jsx, DetalhesComissao.jsx, CorrigirComissaoDialog.jsx, ModeloForm.jsx, ModelosTab.jsx, FinalidadeForm.jsx, FinalidadesTab.jsx, RelatorioGeral.jsx, RelatorioIndividual.jsx, rhControl.js

---

## 🔴 Críticos

### 01. DetalhesComissao — setores HARDCODED (incompatível com setores dinâmicos)
- **Arquivo:** DetalhesComissao.jsx:66-70
- **Caminho:** Comissões > Detalhes > Recalcular
- **Ação:** Usa `{ salao: [], cozinha: [], copa_playground_caixa: [], limpeza_rh: [] }`
- **Impacto:** Se o cliente configurou setores personalizados, o recálculo ignora e distribui nos 4 fixos
- **Solução:** Ler setores de `SetoresComissao` collection

### 02. CorrigirComissaoDialog — percentuais HARDCODED
- **Arquivo:** CorrigirComissaoDialog.jsx:28-37
- **Caminho:** Comissões > Detalhes > Corrigir
- **Ação:** Usa percentuais fixos (salao=40%, cozinha=24%, copa=14%, limpeza=2%)
- **Impacto:** Inconsistente com `ConfigurarSetoresComissao.jsx` que permite percentuais customizados
- **Solução:** Ler percentuais dos setores configurados

### 03. `ResponderLoteModal` não chama `processarAprovacaoPix()`
- **Arquivo:** Solicitacoes.jsx:196-223
- **Caminho:** Solicitações > Responder em Lote
- **Ação:** O modal de lote não executa `processarAprovacaoPix`
- **Impacto:** Aprovações em lote de chave PIX nunca atualizam o funcionário
- **Solução:** Adicionar chamada no loop de aprovação

### 04. ModelosTab — `onSaved` não retorna dados (auditoria registra `undefined`)
- **Arquivo:** ModelosTab.jsx:125-136
- **Caminho:** Modelos > Salvar modelo
- **Ação:** `onSaved()` no ModeloForm é chamado sem argumentos, mas ModelosTab espera `(modelo, isNew)`
- **Solução:** `onSaved(modelo, isNew)` no ModeloForm
- **Mesmo problema:** FinalidadesTab.jsx:100-109

### 05. `vale_parcelado` não coberto no RelatorioGeral
- **Arquivo:** RelatorioGeral.jsx:36-37,89-102
- **Caminho:** Relatórios > Geral
- **Ação:** `totalDescontos` não inclui `vale_parcelado`. Nenhuma coluna o cobre
- **Impacto:** Lançamentos parcelados invisíveis no relatório

---

## 🟠 Altos

### 06. `handleRecalcular` não respeita feature flag `exclusao_faltas_atestados`
- **Arquivo:** DetalhesComissao.jsx:57-101
- **Ação:** Sempre exclui por falta/atestado, mesmo se a flag estiver desligada

### 07. ConfigurarMetasComissao — filtro de setor por substring `includes()`
- **Arquivo:** ConfigurarMetasComissao.jsx:121
- **Ação:** `f.setor?.toLowerCase().includes(m.setor.toLowerCase())`
- **Problema:** Setor "vendas" casa com "vendas internas" e "vendas externas". Inconsistente com `mapearSetorDinamico()` que usa `palavras_chave`

### 08. `ClickableValue` definido DENTRO do componente RelatorioGeral
- **Arquivo:** RelatorioGeral.jsx:63-75
- **Ação:** Nova função-componente criada a cada render (anti-pattern React)
- **Solução:** Mover para fora do componente

### 09. RelatorioGeral — `DrilldownModal` recebe `titulo=""` (sem contexto)
- **Arquivo:** RelatorioGeral.jsx:66
- **Ação:** `openDrill('', lancs)` — modal sem título

---

## 🟡 Médios

### 10. ConfigurarSetoresComissao — exclusão sem confirmação Dialog
- **Arquivo:** ConfigurarSetoresComissao.jsx:130-134
- **Ação:** Remove o setor do array local e salva — sem confirmação explícita

### 11. `Comissoes.jsx` — seletor de mês aparece na aba `metas` mas é ignorado
- **Arquivo:** Comissoes.jsx:58
- **Ação:** `tabsComSeletor` inclui `metas`, mas `ConfigurarMetasComissao` tem seu próprio seletor interno

### 12. `ModeloForm.jsx:108` — `pdf_base_url` sobrescrito com `undefined` se upload falhar
### 13. `FinalidadeForm.jsx:36-46` — falta validação client-side (e.preventDefault() quebra validação nativa)
### 14. `DetalhesComissao.jsx:86` — deleta registros um por um (ineficiente)
### 15. `CorrigirComissaoDialog.jsx:88-104` — recalculo linear ignora redistribuição proporcional

---

## 🔵 Baixos

### 16. `Comissoes.jsx:39-42` — 3 queries independentes que poderiam ser paralelizadas
### 17. `Solicitacoes.jsx:215` — `push_ativado: false` fixo no lote (diferente do modal individual que oferece toggle)
### 18. `Solicitacoes.jsx:479` — botão X descarta alertas sem persisti-los
### 19. `rhControl.js` — features desligadas por padrão (whitelist) — sem seed
### 20. `ConfigurarSetoresComissao.jsx:96-97` — `setSetores(null)` propenso a race condition durante salvamento

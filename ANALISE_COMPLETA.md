# Análise Completa do Aplicativo — RHDTalia

## Sumário de Problemas Encontrados

| Tipo | Quantidade |
|------|-----------|
| Dados Mockados/Hardcoded | 12 |
| Lógica Incompleta/Não Implementada | 8 |
| Componentes Stub/Vazios | 6 |
| Código Obsoleto/Lixo | 5 |
| Problemas de Firebase/API | 4 |
| Problemas de Roteamento/Navegação | 3 |

---

## 1. DASHBOARD RH (`/`)

### 1.1 Dados Mockados em `DashboardRH.jsx`

**Arquivo:** `src/pages/DashboardRH.jsx`

| Linha | Problema | Severidade |
|-------|----------|------------|
| `feriasVencidas` (linha ~37) | **Sempre retorna 0** — a lógica existe mas sempre faz `return false` | 🔴 Crítico |
| `docsVencendo: 3` | **Hardcoded** — deveria vir de `AssinaturaDigital.list()` filtrando por expiração | 🔴 Crítico |
| `valesMes: 5000` | **Hardcoded** — deveria calcular do mês atual somando lançamentos tipo vale | 🔴 Crítico |
| `consignadosAtivos: 12` | **Hardcoded** — deveria contar lançamentos tipo crédito consignado ativos | 🔴 Crítico |
| `custoFolha: 250000` | **Hardcoded** — deveria somar fechamentos do mês atual | 🔴 Crítico |
| `comissaoTotal: 15000`| **Hardcoded** — deveria somar comissões do mês | 🔴 Crítico |
| `dadosCustosPorSetor` | **Array hardcoded** — deveria agregar do banco | 🟡 Médio |
| `dadosEvolucaoFolha` | **Array hardcoded** — deveria calcular dos fechamentos mensais | 🟡 Médio |
| `dadosSolicitacoes` | **Array hardcoded** — deveria agregar solicitações por tipo | 🟡 Médio |
| Gráfico Absenteísmo | **Usa `dadosCustosPorSetor`** — está exibindo dados de custo como se fossem faltas | 🔴 Crítico |
| Alertas (`alerts`) | **Hardcoded** "João Silva tem férias vencidas há 30 dias" — deveria ser dinâmico | 🟡 Médio |

### 1.2 Componentes do Dashboard

**Arquivo:** `src/components/dashboard-rh/StatisticsGrid.jsx` — Verificar se aceita dados mockados corretamente  
**Arquivo:** `src/components/dashboard-rh/QuickActions.jsx` — Ações rápidas parecem ok  
**Arquivo:** `src/components/dashboard-rh/AlertBanner.jsx` — Alertas dinâmicos precisam ser implementados  
**Arquivo:** `src/components/dashboard-rh/IndicadoresFinanceiros.jsx` — Verificar se usa dados mockados

---

## 2. FUNCIONÁRIOS (`/funcionarios`)

### 2.1 OK — Sem problemas críticos

- CRUD completo implementado
- Importação em lote funcional
- Upload de foto funcional
- Permissões de portal funcional
- Pasta de documentos funcional

### 2.2 Issues Menores

| Problema | Local | Severidade |
|----------|-------|------------|
| `canEdit` sempre `true` | `Funcionarios.jsx:211` | 🟢 Leve — deveria vir do contexto de auth |
| Ordenação por admissão compara string, não data | `Funcionarios.jsx:239` | 🟢 Leve |

---

## 3. LANÇAMENTOS FINANCEIROS (`/lancamentos`)

### 3.1 OK — Completo e funcional

### 3.2 Issues

| Problema | Local | Severidade |
|----------|-------|------------|
| `LancamentoForm.jsx` importa `@/components/ui/use-toast` que pode não existir | Componente | 🟡 Médio — verificar se o toast está configurado |
| Upload de comprovante sem limites de tamanho/tipo | `LancamentoForm.jsx` | 🟢 Leve |

---

## 4. FECHAMENTO MENSAL (`/fechamento`)

**Arquivo:** `src/pages/Fechamento.jsx` (532 linhas)

### 4.1 Issues

| Problema | Local | Severidade |
|----------|-------|------------|
- [ ] Substituir todos os stats hardcoded por queries reais
- [ ] Calcular feriasVencidas corretamente
- [ ] Corrigir gráfico de absenteísmo
- [ ] Alertas dinâmicos baseados em dados reais

### Fase 3: Funcionarios360 (2 dias)
- [ ] Implementar cada aba stub com dados reais do Firestore

### Fase 4: Configurações e Serviços (2 dias)
- [ ] Verificar cada aba de config (Backups, GovBR, etc.)
- [ ] Deploy da Firebase Function de email
- [ ] Configurar FCM para push notifications

### Fase 5: Limpeza (1 dia)
- [ ] Remover código obsoleto
- [ ] Verificar importações quebradas
- [ ] Testar todas as rotas

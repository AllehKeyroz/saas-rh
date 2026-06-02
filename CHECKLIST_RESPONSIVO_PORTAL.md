# Checklist Responsivo — Portal do Funcionário

> Análise completa de todos os componentes do portal para garantir funcionamento perfeito em mobile, tablet e desktop.

---

## 🔴 Críticos (impedem o uso no mobile)

| # | Onde | O quê | Por que | Correção |
|---|------|-------|---------|----------|
| C1 | `PortalFuncionario.jsx:257,271` | Botões de navegação do mês com `w-7 h-7` (28px) | Abaixo do mínimo de 44px para toque | Mudar para `w-10 h-10` |
| C2 | `MeusVales.jsx:122` | Botão "ver comprovante" com `h-7 w-7 p-0` (28px) | Inatingível no celular | Mudar para `h-10 w-10 p-0` |
| C3 | `ExtratoMensal.jsx:116` | Mesmo botão "ver comprovante" (28px) | Inatingível no celular | Mudar para `h-10 w-10 p-0` |
| C4 | `AlertaLimiteVale.jsx:47-53` | Botão "X" de fechar — apenas `<X className="w-4 h-4" />` sem padding | 16px de área de toque | Adicionar `p-2` no botão |
| C5 | `MensagensPortal.jsx:128-129` | Botão "X" de fechar alerta — só `<X className="w-4 h-4" />` | 16px de área de toque | Adicionar `p-2` no botão |
| C6 | `MinhasSolicitacoes.jsx:280` | Grid `grid-cols-3 gap-3` para botões de nova solicitação | "Banco de Horas" e "Crédito Consignado" estouram 100px | Mudar para `grid-cols-2 sm:grid-cols-3` |

---

## 🟠 Graves (prejudicam a experiência)

| # | Onde | O quê | Por que | Correção |
|---|------|-------|---------|----------|
| G1 | `MeusVales.jsx:53` | `grid-cols-3` sem breakpoint nos cards de resumo | 3 colunas em 360px = ~100px cada, valores podem vazar | Adicionar `sm:grid-cols-3` ou `grid-cols-1 sm:grid-cols-3` |
| G2 | `ExtratoMensal.jsx:55` | `grid-cols-3` sem breakpoint nos stats (Créditos/Débitos/Saldo) | Mesmo problema — valores apertados | Adicionar `sm:grid-cols-3` |
| G3 | `MinhasComissoes.jsx:84` | `grid-cols-3` sem breakpoint nos dias | Labels "Dias do Mês", "Trabalhados", "Ausências" + números grandes | Adicionar `sm:grid-cols-3` |
| G4 | `MinhasComissoes.jsx:321-334` | `flex divide-x` com 3 painéis | Valores em moeda podem colapsar | Mudar para `grid grid-cols-3` |
| G5 | `MinhasComissoes.jsx:340` | Botão de detalhe com `h-7` (28px) | Abaixo do mínimo de toque | Mudar para `min-h-[44px]` |
| G6 | `PortalFuncionario.jsx:362-391` | Dialog de comprovante com `h-96` (384px) | Altura fixa muito grande no celular | Mudar para `h-[50vh] sm:h-96` |
| G7 | `AssinaturasPortal.jsx:83,92` | Botões com `h-9` (36px) | Abaixo de 44px | Adicionar `min-h-[44px]` |
| G8 | `AssinaturasPortal.jsx:128` | Botão "Baixar" com `size="sm" h-8` (32px) | Muito pequeno | Mudar para `h-9` ou `min-h-[44px]` |
| G9 | `AvisosCloudMobile.jsx:77` | Chips de mensagem com `py-1` (~20px altura) | Alvo de toque minúsculo | Mudar para `py-2 min-h-[44px]` |
| G10 | `MiniDRE.jsx:238-259` | Botões de exportar PDF/Excel com `size="sm"` (32px) | Pequenos para toque | Mudar para `size="default"` no mobile |
| G11 | Componente `button.jsx` (base) | `h-9` (default) e `h-8` (sm) | Padrão abaixo de 44px WCAG | Solução global ou override por caso |
| G12 | Componente `select.jsx` (base) | `h-9` no SelectTrigger | Mesmo problema de altura | Override com `min-h-[44px]` |

---

## 🟡 Leves (pequenos ajustes)

| # | Onde | O quê | Correção |
|---|------|-------|----------|
| L1 | `PortalFuncionario.jsx:240` | `px-6` no topbar | Mudar para `px-4 md:px-6` |
| L2 | `PortalSidebar.jsx:95` | Botão toggle com `w-10 h-10` (40px) | Mudar para `w-11 h-11` (44px) |
| L3 | `PortalSidebar.jsx:103-104` | Sidebar `w-64` fixo em mobile | Mudar para `w-[280px] max-w-[85vw]` |
| L4 | `MeuSalario.jsx:168-175` | Linhas de histórico com `flex items-center gap-3` | Mudar para `gap-1.5 sm:gap-3` |
| L5 | `PortalVidaFinanceira.jsx:312-321` | Abas com scroll horizontal e alvos pequenos | Adicionar `[&>button]:px-4 [&>button]:py-2.5` |
| L6 | `MinhasSolicitacoes.jsx:78,140` | `grid-cols-2` para inputs de data | Mudar para `grid-cols-1 sm:grid-cols-2` |
| L7 | `MiniDRE.jsx:234-237` | Header com `flex items-center justify-between` sem wrap | Adicionar `flex-wrap gap-2` |
| L8 | `MiniDRE.jsx:9` | Identação de `pl-4` em DRERow | Mudar para `pl-2 sm:pl-4` |

---

## ✅ Já está responsivo (não mexer)

| Componente | Motivo |
|------------|--------|
| `PortalSidebar.jsx` | Sidebar desktop 240px fixa, mobile overlay com toggle. Padrão correto. |
| `VisaoGeral.jsx` | Cards em `grid grid-cols-1 sm:grid-cols-2` — responsivo |
| `MeusDados.jsx` | Cards full-width, layout vertical — funciona em qualquer tela |
| `PortalVidaFinanceira.jsx` | StatCards: `grid-cols-1 sm:grid-cols-2 lg:grid-cols-3` — responsivo. Gráficos: `grid-cols-1 lg:grid-cols-2` |
| `AvisosPendentes.jsx` | Cards full-width, botões full-width — sem problemas |
| `AvisosCloudMobile.jsx` | Já é o componente MOBILE (só aparece em `md:hidden`) |
| `AvisosPendentes.jsx` | Dialog sem max-width override, usa default responsivo |
| `ExtratoMensal.jsx:80-88` | Linha do salário base — layout simples, sem quebra |

---

## 📋 Plano de execução sugerido

### Fase 1 — Críticos (sem risco de quebra)
1. Ajustar `w-7 h-7` → `w-10 h-10` nos botões de navegação do mês
2. Ajustar `h-7 w-7 p-0` → `h-10 w-10 p-0` nos botões "ver comprovante"
3. Adicionar `p-2` nos botões "X" de fechar
4. Ajustar `grid-cols-3` → `grid-cols-2 sm:grid-cols-3` nos botões de solicitação

### Fase 2 — Grids sem breakpoint
5. Adicionar breakpoints nos `grid-cols-3` de MeusVales, ExtratoMensal, MinhasComissoes
6. Ajustar `flex divide-x` em MinhasComissoes

### Fase 3 — Alturas de botão
7. Ajustar `h-9` → `min-h-[44px]` nos botões do portal
8. Ajustar `h-8` → `min-h-[44px]` nos size="sm"

### Fase 4 — Ajustes finos
9. `px-6` → `px-4 md:px-6` no topbar
10. Demais ajustes leves

---

> ⚠️ Nenhuma alteração estrutural (lógica, queries, hooks) é necessária — apenas classes CSS/Tailwind.

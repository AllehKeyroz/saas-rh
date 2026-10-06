# Checklist de Implementação — Pós-reunião (04/09/2026)

> Documento de trabalho: o que falta implementar, priorizado por **percepção do cliente**.
> Baseado na transcrição da reunião (Google Meet, 04/09) + estado atual do código.

## Legenda

| Símbolo | Significado |
|---|---|
| **P0** | Fazer agora (maior impacto percebido / regra cobrada) |
| **P1** | Em seguida |
| **P2** | Depois / depende de terceiros |
| 🔥 | Percepção do cliente (quanto "parece evolução") |
| Esforço | Baixo / Médio / Alto |

---

## Ordem de implementação (por percepção)

| Ordem | Item | Módulo | Prior. | Esforço | Percepção |
|---|---|---|---|---|---|
| 1 | Rateio de comissão entre **todos os setores** (ausente não recebe → redistribui) | Comissões | P0 | Médio | 🔥🔥🔥 |
| 2 | ~~Feriados marcados no calendário da **escala personalizada** + aviso de folga em feriado~~ ✅ | Escala de folga | — | — | — |
| 3 | ~~**Exportar** escala de folga (lista/PDF)~~ ✅ | Escala de folga | — | — | — |
| 4 | ~~Avisos de **fracionamento** + **intervalo entre períodos**~~ ✅ | Férias | — | — | — |
| 5 | **Rascunho → Consolidar** da escala de folga | Escala de folga | P1 | Médio | 🔥🔥 |
| 6 | **Portal do funcionário**: calendário de folga + pedido de alteração | Escala de folga / Portal | P1 | Médio-alto | 🔥🔥 |
| 7 | ~~**Faltas manual** no modal de férias~~ ✅ | Férias | — | — | — |
| 8 | **Comunicação via CRM/WhatsApp** (onboarding, aniversários, holerites, férias) | Integração | P2 | Alto | 🔥🔥🔥 |
| 9 | **Assinatura digital** (HighLevel / ICP) | Integração | P2 | Alto | 🔥🔥 |
| 10 | **Integração de ponto (Séculus)** | Integração | P2 | Alto | 🔥🔥 |

> Sugestão de recorte quando o tempo for curto: **itens 1 a 4** (P0) — é o maior "evoluiu bastante" por hora trabalhada.

---

## A) Férias

- [x] Calendário mensal/anual, atalho na linha, iniciais dos dias da semana
- [x] Saldo parcial real (gozados + programados + abono)
- [x] Feriados nacionais + municipais configuráveis
- [x] Resumo executivo no topo do calendário
- [x] Exportar escala de férias (CSV/PDF)
- [x] Comprovantes de férias/afastamento (subir depois, excluir, visibilidade)
- [x] Bloqueio de solicitação sem período aquisitivo
- [x] **Aviso de fracionamento** — regra legal **14/5** mantida (validada no modal)
- [x] **2 períodos simultâneos** bloqueados + **aviso de períodos emendados** (exigir 1 dia de trabalho entre períodos, soft)
- [x] **Faltas manual** no modal de férias (redução do art. 130, aplicada em todo o sistema)
- [ ] Mostrar/liberar na solicitação **apenas o próximo período aquisitivo** disponível *(portal — próximo ciclo)*
- [x] **Aviso 48h** antes de folga/feriado

## B) Comissões

- [x] Comissão individual (um por vez, combobox pesquisável)
- [x] Setores dinâmicos (dropdown; sem setores fixos mockados)
- [x] Ausente (férias/afastamento) **não recebe** por padrão; opção "recebe" com dias manuais
- [x] Relatório/histórico por setor real
- [ ] **Rateio entre TODOS os setores**: quando um ausente não recebe, o valor dele deve ser **redistribuído igualmente entre os demais setores** (não fica no setor)
- [ ] Ajustar a UI/aviso do lançamento para deixar essa regra clara

## C) Escala de folga

- [x] Tipos: fixa / ciclo (com offset) / personalizada (mini calendário)
- [x] Aplicar a um funcionário ou a todo o setor (rodízio)
- [x] Versionamento (não sobrescreve passado; fecha escala anterior)
- [x] Navegação por mês + feriados do mês + resumo executivo
- [x] Botão "Limpar escala" por período
- [x] **Feriados no calendário personalizado** + **aviso quando a folga cai em feriado**
- [x] **Exportar** escala (lista por funcionário/mês — Excel/PDF)
- [x] **Rascunho → Consolidar** (por funcionário + por mês) com revisão pré-publicação; consolidada travada (só via Reabrir); escalas consolidadas nunca são sobrescritas/apagadas
- [ ] **Portal do funcionário**: calendário de folga (só consolidadas) + **pedido de alteração** de folga (RH autoriza)
- [ ] Aviso quando o **período já tem escala programada** (sobreposição)
- [ ] Alerta de **1/3 de domingos** trabalhados/folgados
- [ ] (Opcional) visão **anual** da escala

## D) Comunicação / CRM (WhatsApp) — depende de setup externo

- [ ] Integração CRM → funcionário: onboarding, aniversários, aniversário de empresa, holerites, avisos de férias
- [ ] Notificações sistema → RH (ex.: concessão de férias vencendo)
- [ ] Definir número do RH (coexistente) ou CRM dedicado só do RH
- [ ] **Assinatura digital** via HighLevel (WhatsApp + certificação ICP) — confirmar API e custo
- [ ] Fluxo: gerar documento → enviar p/ assinar no WhatsApp → retorna assinado → salvar no sistema

## E) Integração de ponto (Séculus)

- [ ] Obter acesso (TI do cliente)
- [ ] Integrar: banco de horas, feriados trabalhados, faltas
- [ ] Alimentar cálculo de férias (redução por faltas) e comissões automaticamente

## F) Administrativo (dependências externas)

- [ ] Gerar novo **token da Meta** (ABM Propósito 01) e enviar ao Gedel
- [ ] Confirmar **API de assinatura** do HighLevel
- [ ] Cadastrar **cartão de faturamento** no CRM (WhatsApp/IA)
- [ ] Enviar e-mail com **notas da reunião + prioridades**
- [ ] Enviar **lista de comunicações** RH↔funcionário / sistema↔RH

---

## Decisões pendentes

1. ~~**Fracionamento**~~: definido — regra legal **14/5** (validada no modal).
2. **Rateio entre setores**: redistribuir **igualitariamente** entre todos os setores (confirmar)? *(deferido — cenário ainda não ocorre)*
3. **Master password** (autorização do proprietário p/ alterações críticas): implementar agora ou depois?
4. ~~**Faltas**~~: implementado manual (art. 130); integração de ponto depois.

---

## Já entregue (referência)

- [x] **App instalável (PWA)** — Android/iPhone/PC, discreto, só online *(deploy feito em 23/09)*
- [x] Módulo de férias completo (calendário, saldo, aviso, alertas, portal)
- [x] Módulo de comissões (individual + setores dinâmicos)
- [x] Escala de folga (base) + feriados + correções

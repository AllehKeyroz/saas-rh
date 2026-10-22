# Ajustes e Melhorias — RHDTalia

> Documento de acompanhamento dos ajustes feitos no sistema, em linguagem simples.
> Este documento é atualizado a cada ajuste concluído e serve para apresentação ao cliente.

---

## Módulo de Férias — Correções (03/09/2026)

### 1. O aviso de férias não some mais ✅ Concluído

**O que estava errado:** quando uma solicitação de férias era aprovada de novo (ou reprocessada), o sistema podia sobrescrever o registro e apagar o aviso digital de férias que já tinha sido gerado e enviado para assinatura.

**O que foi feito:** o sistema agora preserva as informações já gravadas. O aviso de férias continua vinculado ao registro mesmo que ele seja atualizado ou reprocessado.

---

### 2. Não dá mais para marcar mais férias do que a pessoa tem ✅ Concluído

**O que estava errado:** era possível programar um período de férias maior do que os 30 dias a que o funcionário tem direito (ou maior do que o saldo restante do período).

**O que foi feito:** ao programar férias, o sistema agora mostra quantos dias restam no período escolhido e **bloqueia** a programação se o intervalo passar desse saldo. A mesma trava foi aplicada no registro manual de férias ("Dar Baixa").

---

### 3. A mesma pessoa não fica de férias duas vezes no mesmo período ✅ Concluído

**O que estava errado:** era possível marcar férias de um funcionário em um período que já tinha férias marcadas, fazendo os dias serem contados em dobro.

**O que foi feito:** o sistema agora **impede** programar férias que se sobreponham a um período já registrado para a mesma pessoa — tanto na programação pela escala quanto no registro manual.

---

### 4. O fracionamento de férias agora é calculado certo ✅ Concluído

**O que estava errado:** quando o funcionário tira férias em partes (ex.: 10 + 10 + 10), o sistema misturava períodos diferentes na hora de validar e, em alguns casos, salvava o registro **sem dizer de qual período aquisitivo** aquela parte era. Isso deixava o saldo sem pé nem cabeça.

**O que foi feito:**
- Ao programar férias, agora é preciso **escolher o período aquisitivo** (o sistema mostra quantos dias restam em cada um).
- A validação do fracionamento considera apenas as partes do **mesmo período** (máximo 3 partes, uma com pelo menos 14 dias, as demais com pelo menos 5 — art. 134 §1º da CLT).
- Todo registro de férias agora é salvo **sempre com o período identificado** — não existe mais registro "órfão".

---

### 5. O saldo de férias agora mostra o número real ✅ Concluído

**O que estava errado:** o saldo era "tudo ou nada" — mostrava 30 dias ou 0. Se a pessoa já tivesse tirado 10 dias de um período, o sistema ainda mostrava o saldo cheio (ou já mostrava errado). O número que aparecia nas telas não era o real.

**O que foi feito:** o saldo agora é calculado de verdade: **30 dias do período − dias já tirados − dias já programados**. Esse número correto aparece em todas as telas:
- Painel do RH (calendário de férias e alertas)
- Ficha do funcionário (aba Férias)
- Portal do funcionário (Minhas Férias e saldo ao solicitar)

---

## Calendário de Férias — Atalho para agendar (03/09/2026)

### 6. Agendar férias direto pelo calendário, sem procurar a pessoa ✅ Concluído

**O que estava errado:** para agendar férias de alguém, era preciso clicar em "Programar Férias", procurar a pessoa na lista do modal e selecioná-la — mesmo que a pessoa já estivesse visível na tela do calendário.

**O que foi feito:** agora é só **clicar na linha do funcionário** no calendário (na visão mensal ou na escala anual). O modal abre **já com a pessoa selecionada** — você escolhe o período aquisitivo, preenche as datas e salva. O botão "Programar Férias" do topo continua funcionando para quem preferir escolher do zero.

---

## Comissões — Funcionários em férias (03/09/2026)

### 7. Férias agora contam no rateio de comissões ✅ Concluído

**O que estava errado:** o lançamento de comissões só enxergava **afastamentos** (atestado médico, suspensão). Quem estava de **férias** entrava no rateio como se tivesse trabalhado o período inteiro — recebia a comissão cheia, a menos que alguém do RH lembrasse de digitar os dias manualmente. Não havia aviso nem registro do motivo.

**O que foi feito:** férias agora são tratadas **igual ao afastamento** no lançamento de comissões:
- Se um funcionário estiver de férias em algum dia do período da comissão, ele aparece no painel de aviso com a escolha **"Recebe / Não recebe"** (padrão: Não recebe).
- Se **Recebe**, os dias de férias entram automaticamente como dias ausentes (comissão reduzida proporcionalmente e redistribuída aos presentes).
- Se **Não recebe**, ele sai do rateio e fica registrado com o motivo **"Férias no período"** (ou "Afastamento e férias no período", se os dois acontecerem).
- Os dias são contados em **união** — se afastamento e férias caírem nos mesmos dias, não contam em dobro.

---

## Cadastro de Funcionário — Setor em duas vias (03/09/2026)

### 8. Setor digitado no cadastro agora vale para comissões ✅ Concluído

**O que estava errado:** quando não havia nenhum setor cadastrado, o setor era digitado manualmente no cadastro do funcionário (ex.: "cozinha"). Mas o lançamento de comissões continuava avisando que **não havia setores cadastrados** — o setor digitado não era registrado para uso nas comissões. Só funcionava uma via: setor de comissão → aparecia no cadastro.

**O que foi feito:** agora funciona nas **duas vias**:
- Ao salvar um funcionário com um setor novo (digitado manualmente), o sistema **registra automaticamente** esse setor nas coleções de setores — inclusive na de **comissões** (com percentual 0, para você definir a divisão na aba "Setores").
- O setor passa a aparecer no dropdown do cadastro e no lançamento de comissões.
- Se o setor já existir, nada é duplicado (verificação por nome, ignorando maiúsculas/minúsculas).

---

## Comissões — Correção do padrão "Não recebe" (03/09/2026)

### 9. Ausente não aparece mais na lista de comissão por padrão ✅ Concluído

**O que estava errado:** quando um funcionário estava afastado ou de férias, o aviso já vinha com "Não recebe" selecionado (correto), mas a pessoa **ainda aparecia na lista com a divisão calculada** — como se fosse receber. Para tirá-la da lista, era preciso clicar em "Recebe" e depois voltar para "Não recebe". Isso causava **lançamentos acidentais** de comissão para quem estava ausente, porque quem lançava confiava que a pessoa não estava na lista.

**O que foi feito:** agora o padrão vale de verdade — quem está ausente (afastamento ou férias) **sai da lista de divisão automaticamente** e aparece apenas na lista de **excluídos** (com o motivo). Só entra na divisão se o RH marcar explicitamente **"Recebe"**.

---

## Cadastro de Funcionário — Criar setor/função pelo dropdown (03/09/2026)

### 10. Dá para criar setor e função novos direto no cadastro ✅ Concluído

**O que estava errado:** quando já existia pelo menos um setor ou função cadastrado, o campo virava um dropdown fechado — só dava para **escolher** uma opção existente, sem poder **digitar uma nova**. Para criar uma categoria nova era preciso sair do cadastro e ir em outra tela.

**O que foi feito:**
- O dropdown de **Setor** e de **Função** agora tem a opção **"＋ Criar novo..."** no final da lista.
- Ao escolher, o campo vira um campo de texto para digitar a nova categoria (com opção de voltar para a lista).
- A nova categoria é **registrada automaticamente** nas coleções (setor geral, setor de comissão e função) — então aparece nos dropdowns e no lançamento de comissões da próxima vez.

---

## Comprovantes de Férias e Afastamento (03/09/2026)

### 11. Comprovante vinculado a cada férias e afastamento ✅ Concluído

**O que estava errado:** os comprovantes ficavam espalhados e sem vínculo. O atestado anexado na solicitação ia para o afastamento, mas **não aparecia em lugar nenhum** (ficava invisível). Férias não tinham campo para comprovante avulso. Não dava para anexar documento depois do lançamento.

**O que foi feito:**
- **No RH:** cada **férias** e cada **afastamento** agora tem sua própria seção de **"Comprovantes"** no 360 e na aba do funcionário — com lista dos arquivos (abrir/baixar), botão **"Adicionar comprovante"** (dá para anexar **antes ou depois** do lançamento) e remoção.
- **Afastamento manual:** o formulário de registrar afastamento agora aceita comprovante já no momento do registro.
- **No portal do funcionário:** só os comprovantes de **férias** aparecem (em "Minhas Férias"), e apenas os que o RH marcar como **visíveis** (controle por arquivo, com o ícone de olho). Afastamento **não** tem tela no portal — documento de afastamento para o funcionário vai pela **pasta de documentos**.
- Os comprovantes antigos (formato `{nome, url}`) continuam funcionando — são tratados como ocultos do funcionário.

---

## Comprovantes — Correção de replicação (03/09/2026)

### 12. Comprovante da solicitação agora vai para o registro de férias ✅ Concluído

**O que estava errado:** quando o funcionário anexava um comprovante na **solicitação de férias** (no portal) e o RH aprovava, o comprovante ficava só na solicitação — **não era copiado para o registro de férias**. Por isso o documento não aparecia no 360 do funcionário ("não replicava"). O afastamento já copiava os anexos; as férias não.

**O que foi feito:**
- Ao aprovar uma solicitação de férias, os anexos agora são **copiados para o registro de férias** (mesmo comportamento do afastamento).
- O upload de comprovante no 360 agora mostra **mensagem de sucesso/erro** — se algo falhar, aparece o motivo (antes falhava em silêncio).

---

## Calendário de Férias — Feriados, resumo e exportação (03/09/2026)

### 13. Feriados nacionais no calendário + regra dos 48h ✅ Concluído

**O que foi feito:**
- Os **feriados nacionais** (fixos e móveis — Carnaval, Sexta-feira Santa, Corpus Christi, Natal, etc.) agora aparecem **destacados em vermelho** no calendário mensal, com o nome do feriado ao passar o mouse.
- Ao programar férias, o sistema **avisa** se o início cair nos **2 dias anteriores a um feriado** (art. 134 §3º da CLT) — ex.: "Férias não podem começar nos 2 dias anteriores a feriado: Natal em 25/12".

### 14. Resumo executivo no topo do calendário ✅ Concluído

**O que foi feito:** 4 cartões no topo do calendário com visão instantânea da equipe:
- **Em férias hoje** · **Programadas no mês** · **Aquisitivos pendentes** · **Concessões vencidas (dobra)**

### 15. Exportar a escala de férias ✅ Concluído

**O que foi feito:** botão **"Exportar"** no calendário gera a escala completa em **planilha (CSV/XLSX)** ou **PDF** — com funcionário, setor, período aquisitivo, datas, dias, status e pendência.

### Bônus — acabamento
- **Tooltip na visão mensal:** passar o mouse numa célula colorida mostra "Nome: 01/07 → 20/07" (a escala anual já tinha).

---

## Escala de Folga (03/09/2026)

### 16. Calendário de Escala de Folga ✅ Concluído (Fase 1)

**O que foi feito:** nova página **"Escala de Folga"** no menu (ao lado do Calendário de Férias), com:
- **Calendário mensal** funcionário × dias: dias de **folga (DSR)** em listras cinza, **férias** coloridas por cima, **feriados** em vermelho e domingo destacado — com tooltip ("Folga 6x1", "Férias: 01/07 → 20/07").
- **Rodapé "Total de folgas no dia"** — visão de cobertura da escala (quem está fora em cada dia).
- **Resumo executivo**: em folga hoje · folgas no mês · domingos de folga · sem escala definida.
- **Configuração por funcionário ou por setor**:
  - Tipos: **fixa semanal** (folga no mesmo dia) ou **ciclo/rodízio** (presets 6x1, 5x1, 5x2, 4x2, 2x2, 12x36 ou personalizado).
  - **Alternância automática**: ao aplicar a um setor, o sistema **distribui as folgas em dias diferentes** (deslocamento/offset) — resolve a dúvida de "todos precisam folgar em dias diferentes".
  - Ajuste individual de deslocamento, data base, cor e pré-visualização da folga da semana.

**Fase 2 (próxima):** integrar a folga/DSR na **regra dos 48h** do agendar de férias (art. 134 §3º completo), visão anual e exportação.

---

## Escala de Folga e Calendário de Férias — Ajustes visuais e feriados extras (03/09/2026)

### 17. Folga mais visível, iniciais dos dias e feriados municipais ✅ Concluído

**O que foi feito:**
- **Folga mais fácil de identificar**: o padrão de listras da folga ficou mais contrastado (nos dois calendários) e a legenda ganhou um quadrado maior.
- **Iniciais dos dias da semana**: o cabeçalho dos calendários (Escala de Folga **e** Calendário de Férias) agora mostra a inicial do dia (D, S, T, Q, Q, S, S) acima do número.
- **Feriados municipais/outros**: novo botão **"Feriados"** nos dois calendários — permite cadastrar feriados extras (ex.: aniversário da cidade), que aparecem destacados no calendário e entram na **regra dos 48h** do agendar de férias.

---

## Escala de Folga — Ajustes de configuração (03/09/2026)

### 18. Configuração mais coerente e atalho por linha ✅ Concluído

**O que foi feito:**
- **Modo setor = só rodízio**: ao aplicar a escala a um setor, a opção "fixa semanal" fica **desabilitada** (faria todos folgarem no mesmo dia, contradizendo as "folgas alternadas"). O deslocamento manual e a pré-visualização somem nesse modo — as folgas são distribuídas automaticamente em dias diferentes.
- **Clique na linha**: clicar em qualquer funcionário no calendário de escala abre o modal de configuração **já com a pessoa selecionada** (atalho, como no calendário de férias).

---

## Escala de Folga — Vale apenas presente/futuro (03/09/2026)

### 19. Escala não retroage ao passado ✅ Concluído

**O que estava errado:** a data base da escala era preenchida com a **data de admissão** (passado), então as folgas eram calculadas e exibidas também em meses passados.

**O que foi feito:**
- A **data base agora começa em hoje** (presente) — e o campo não permite escolher data no passado.
- A escala **vale apenas a partir da data base**: dias anteriores não exibem folga (nada retroage).

---

## Escala de Folga — Tipo personalizada (03/09/2026)

### 20. Escala personalizada: escolher os dias no calendário ✅ Concluído

**O que foi feito:** além de fixa e ciclo/rodízio, agora existe o tipo **"Personalizada"**:
- Abre um **mini calendário** no diálogo de configuração — clique nos dias para **marcar/desmarcar** as folgas (navega pelos meses, dias passados ficam bloqueados).
- Os dias escolhidos são salvos e aparecem como folga no calendário de escala.
- Disponível para **funcionário individual** (no modo setor continua só o rodízio, para manter as folgas alternadas).

---

## Escala de Folga — Data fim e histórico de escalas (03/09/2026)

### 21. Ciclo com data fim + alterações valem só a partir da data de início ✅ Concluído

**O que foi feito:**
- **Data fim obrigatória para ciclos**: a escala em ciclo agora tem início e fim — não fica valendo ao infinito. (Fixa e personalizada podem ter fim opcional.)
- **Histórico de escalas**: cada funcionário pode ter várias escalas ao longo do tempo. Ao alterar com uma **data de início** nova (ex.: trocar 5x1 por 6x1 a partir de 15/09):
  - A escala anterior é **fechada no dia anterior** (mantém 5x1 até 14/09).
  - A nova escala vale **a partir da data escolhida** (6x1 de 15/09 em diante).
  - **Nada é refeito desde a data atual** e **datas passadas não são alteradas**.
- O calendário mostra a escala **efetiva** de cada dia (a que vale naquele período).

---

## Feriados — Correção de salvamento (03/09/2026)

### 22. Feriado salvo agora aparece nos calendários ✅ Concluído

**O que estava errado:** ao salvar um feriado municipal/outro, ele não aparecia na escala de folga, nem no calendário de férias, nem na lista do diálogo.

**Causas corrigidas:**
- **Bug de sobrescrita**: se o feriado fosse adicionado antes da lista carregar, a edição era sobrescrita pela lista vazia e o save gravava nada. Agora a lista só é carregada uma vez por abertura e **não sobrescreve edições do usuário**.
- **Regra de permissão**: a gravação de configurações exigia perfil **admin** — usuários RH (`user`) eram bloqueados. Agora RH também pode salvar (feriados, limites por setor etc.).

---

## Fase 2 da Escala de Folga — Regra 48h completa (03/09/2026)

### 23. Regra dos 48h agora inclui folga/DSR no agendar de férias ✅ Concluído

**O que foi feito:** ao programar férias, o sistema agora avisa quando o início cai nos **2 dias anteriores à folga/DSR** do funcionário (art. 134 §3º CLT) — além do aviso de feriado que já existia. A regra usa a **escala efetiva** do funcionário na data escolhida (considera o histórico de escalas).

---

## Rastreio de formulário (LeadConnector External Tracking) (03/09/2026)

### 24. Formulário de cadastro de funcionário preparado para o script de rastreio ✅ Concluído

**O que foi feito:** o formulário de cadastro de funcionário agora atende aos requisitos do script de rastreio (LeadConnector/GoHighLevel):
- O `<form>` tem **identificador** (`id`/`name`/`data-formid`) para o script reconhecer.
- Os campos principais do cadastro ganharam **atributos `name`** (nome, e-mail, telefone, função, setor, datas, salário, ajuda de custo, limite de vales, comissão) — o script lê os campos pelo `name`.
- O campo de **e-mail** está presente (necessário para criação/vinculação de contato no CRM).
- Os campos ficam visíveis no DOM (aba ativa) — requisito do script.

**Sem impacto no funcionamento atual:** as mudanças são apenas atributos HTML adicionais; o estado, a validação e o salvamento do formulário continuam idênticos.

---

## Rastreio de formulário — Mapeamento dos campos no CRM (03/09/2026)

### 25. Campos renomeados para propriedades padrão do LeadConnector ✅ Concluído

**O que estava errado:** o script captura todos os campos, mas o CRM (LeadConnector) mapeia por **nome/label para propriedades padrão de contato** — só `email` batia com uma propriedade padrão. Os demais ficavam "não mapeados" e não chegavam no contato.

**O que foi feito:** os campos com equivalente padrão no GoHighLevel foram renomeados (apenas o atributo `name`, sem afetar o funcionamento do formulário):
- `nome` → **`firstName`**
- `email` → **`email`** (já era)
- `telefone` → **`phone`**
- `data_nascimento` → **`dateOfBirth`**

**Observação:** campos sem equivalente padrão (função, setor, salário, etc.) continuam sendo **capturados na submissão** (Forms → Submissions → External Forms), mas só aparecem no contato se existirem **campos personalizados** com esses nomes/labels no CRM.

---

## Revisão crítica — Correções de integridade de dados (03/09/2026)

### 26. Cinco furos críticos corrigidos ✅ Concluído

**1. Aprovação de férias sem criar registro:** quando o funcionário não tinha período aquisitivo, a solicitação ficava "aprovada" mas nenhum registro de férias era criado. Agora o RH recebe um **aviso** quando isso acontece.

**2. Re-aprovação mantinha registro cancelado:** ao re-aprovar uma solicitação antes recusada, o registro continuava `cancelada: true`. Agora a aprovação reativa o registro (`cancelada: false`).

**3. Abono não descontava do saldo:** era possível programar 30 dias + 10 de abono = 40 dias de um período de 30. Agora o **abono pecuniário consome o saldo** (art. 143) e o modal bloqueia quando `dias + abono` passa do restante.

**4. Versionamento de escala ignorava escala futura:** salvar uma escala com início antes de uma escala futura criava duplicata/sobreposição. Agora o versionamento considera a escala que vale na data de início e, se houver escala futura, **fecha a nova no dia anterior**.

**5. Retenção da empresa "vazava" para o grupo "Outros":** com retenção e funcionário em setor não mapeado, o valor retido era redistribuído ao grupo "Outros" (dupla contagem). Agora o residual de "Outros" é calculado sobre o **valor após a retenção**.

---

## Comissões — Comissão Individual por funcionário (03/09/2026)

### 27. Comissão individual (manual) além das gorjetas por setor ✅ Concluído

**O que foi feito:** nova modalidade de comissão **individual**, coexistindo com o rateio por setor (sem alterar o que já existia):
- Na aba **Lançar**, um seletor alterna entre **"Gorjetas por Setor"** (o modelo atual) e **"Comissão Individual"**.
- Na comissão individual, o RH informa o **período** e, para cada funcionário apto, o **valor manual** que ele vai receber (sem fórmula).
- Ao confirmar, grava em `ComissaoPorFuncionario` com `origem: 'individual'` — seguindo o **mesmo padrão** das gorjetas, o que faz a comissão **replicar automaticamente** na folha (Fechamento), Meu Salário, Vida Financeira, Metas, Espelho e 360.
- **Histórico**: cards do tipo "Individual" (período, total e valores por funcionário), separados das gorjetas.
- **Relatório**: seção dedicada "Comissão Individual" por funcionário — o **total por funcionário soma individual + gorjetas**.
- **Feature flag** `comissao_individual` no Centro de Controle do RH.

---

## Comissão Individual — Correções da revisão crítica (03/09/2026)

### 28. Correções de robustez e consistência ✅ Concluído

Após revisão crítica, foram corrigidos:
- **Relatório vazio em meses só com comissão individual**: a guarda agora considera também as comissões individuais — o relatório aparece mesmo sem gorjetas.
- **Individual não infla mais o agrupamento "Por setor"**: registros `origem: 'individual'` saem dos cards de setor (ficam só na seção própria).
- **Resumo coerente**: cards "Total Gorjetas", "Comissão Individual" e "Total Comissão" (soma dos dois), em vez de "Distribuído" ambíguo.
- **Rollback**: se o lançamento falhar após criar o registro-pai, o pai órfão é removido automaticamente.
- **Exclusão**: o card individual no Histórico ganhou botão **"Excluir"** (apaga pai + registros, com confirmação) — caminho para corrigir lançamentos errados.
- **Portal**: o "Resumo do Setor" não infla mais com comissões individuais de outros funcionários.

---

## Comissão Individual — Sem flag, seletor no topo (03/09/2026)

### 29. Lançamento individual direto na tela de comissões ✅ Concluído

**O que foi feito:**
- **Sem precisar ativar nada**: a flag `comissao_individual` foi removida — a comissão individual está sempre disponível.
- **Seletor no topo da tela de comissões**: `[ Comissão para o Setor ] [ Comissão Individual ]`, logo abaixo do título. Escolhendo o tipo, a aba **Lançar** mostra o formulário correspondente.
- **Critério de quem recebe**: continua sendo o mesmo de sempre — quem tem **"Apto para receber comissão"** no cadastro. Nada mudou no cadastro.
- **Nada que já funciona foi alterado**: o fluxo de gorjetas por setor segue intacto, e os dados antigos (sem o campo de origem) continuam lidos normalmente.

---

## Comissão Individual — Lançamento um por vez (03/09/2026)

### 30. Fluxo individual de verdade + remoção de setinhas nos valores ✅ Concluído

**O que foi feito:**
- **Um funcionário por vez**: a comissão individual agora usa um **seletor pesquisável** (digite para buscar) e um campo de valor — em vez de uma lista gigante. O funcionário é **adicionado** à lista de incluídos um a um (com opção de remover), e o total é calculado no resumo.
- **Sem setinhas/scroll nos valores**: o campo de valor não é mais `type="number"` com setinhas — é um campo de texto com teclado numérico, eliminando alterações acidentais por clique ou rolagem do mouse.

---

## Comissões — Remoção de setores fixos (mockados) (03/09/2026)

### 31. Só exibe setores criados no app — nada hardcoded ✅ Concluído

**O que estava errado:** havia setores fixos "de exemplo" (Salão 40%, Cozinha 24%, Copa/PG/Cx 14%) em lugares que não refletiam os setores reais configurados — um componente inteiro de percentuais com esses valores fixos, e o relatório agrupando setores por palavras-chave fixas.

**O que foi feito:**
- **Histórico de gorjetas**: os blocos fixos "Salão (40%)", "Cozinha (24%)", "Copa/PG/Cx (14%)" foram removidos — agora mostra o **total por setor real** (os setores criados no app), lidos dos registros de comissão.
- **Relatório**: removida a normalização por palavras-chave fixas (`normSetorKey`) — o relatório agora agrupa pelo **nome real** de cada setor criado.
- **Componente morto**: `PercentuaisComissaoTab.jsx` (com percentuais fixos 40/24/14/2%) foi **excluído** — não era usado em lugar nenhum.
- **Placeholders neutralizados**: "Ex: Salão" / "Ex: salão, garçom" viraram exemplos genéricos.

**Impacto:** nada quebra — os campos fixos não eram mais gravados por nenhum fluxo; a leitura deles apenas exibia R$ 0,00 por engano. Agora só aparecem setores **realmente criados** no app.

---

## Configuração de Setores — Seletor em vez de digitar (04/09/2026)

### 32. Nome do setor agora é um dropdown ✅ Concluído

**O que estava errado:** em "Comissões → Setores", o nome do setor era digitado à mão — mas essa informação já existe no sistema (definida no cadastro de funcionários e na coleção de setores).

**O que foi feito:**
- O campo **"Nome do Setor"** virou um **dropdown pesquisável**, que consulta automaticamente os setores que já existem:
  - da coleção **Setor** (criada no cadastro de funcionário);
  - do campo **setor** dos funcionários;
  - dos setores de **comissão** já cadastrados.
- Se o usuário digitar algo que não existe, aparece a opção **"Criar '...'"** para registrar um setor novo.

**Impacto:** o RH não precisa mais decorar/digitar nomes de setor — basta escolher de um seletor que já reflete o que está cadastrado. Reduz digitação e erros de digitação.

---

## Aplicativo instalável no celular (PWA) (23/09/2026)

### 33. Instalar o RHDTalia como app no Android e iPhone ✅ Concluído

**O que foi feito:** o sistema agora pode ser **instalado como aplicativo** no celular (Android e iPhone), criando um ícone na tela inicial que abre em tela cheia, como um app nativo.

**Como funciona:**
- Aparece um botão discreto **"Instalar"** no topo das telas (RH e Portal do Funcionário).
- **Android:** o botão abre a instalação nativa do navegador.
- **iPhone/iPad:** o botão mostra um passo a passo (Compartilhar → Adicionar à Tela de Início).
- O botão só aparece quando o app **não está instalado** e **há conexão** — some sozinho depois de instalado.

**Importante:** o app continua funcionando **somente online** (sem modo offline) — nenhum dado fica salvo no aparelho. É a mesma segurança de sempre, apenas com a conveniência do ícone/app.

---

## Escala de Folga — Feriados, aviso e exportação (23/09/2026)

### 34. Feriados no calendário, aviso de folga em feriado e exportação ✅ Concluído

**O que foi feito:**
- **Feriados marcados no calendário da escala personalizada** — ao escolher os dias de folga, os dias de feriado aparecem destacados (fundo vermelho + ponto), com o nome do feriado ao passar o mouse.
- **Aviso quando a folga cai em feriado** — o sistema mostra um alerta (sem bloquear) listando as folgas que caem em feriado, tanto no diálogo quanto ao salvar. É permitido — serve para o RH conferir se é intencional.
- **Exportar escala de folga** — novo botão **Exportar** (Planilha/Excel ou PDF), gerando a lista por funcionário e mês (ex.: "Gedel — Setembro — 1, 5, 8, 12…"). Dias que caem em feriado são marcados com `*`.

**Impacto:** a escala de folga fica completa para o RH conferir conflitos com feriados e entregar a lista (contabilidade/equipe) sem trabalho manual.

---

## Escala de Folga — Rascunho e Consolidação (RH) (23/09/2026)

### 35. Lançar folgas em rascunho e consolidar (publicar) depois ✅ Concluído

**O que foi feito:** a escala de folga agora tem o fluxo **rascunho → consolidar**, no mesmo espírito do "fechamento":
- Toda escala criada ou alterada nasce como **Rascunho** (ainda não publicada).
- O RH vê o **status por funcionário** (selo **Rascunho** / **Consolidada**) e pode **filtrar por status**.
- **Consolidar** — por funcionário (ícone na linha) ou **em lote pelo mês** (menu "Consolidar"), com uma **revisão antes de publicar** mostrando: quantas escalas serão consolidadas, quantos funcionários estão sem escala e quantas folgas caem em feriado.
- **Consolidada = travada**: para alterar depois, é preciso **Reabrir** (por funcionário ou pelo mês).
- **Proteção dos dados já existentes:** escalas consolidadas **nunca** são sobrescritas, apagadas ou truncadas. O "Limpar escala" **preserva** as consolidadas. **Sem migração** — as escalas antigas continuam exatamente como estão.

**Impacto:** o RH passa a decidir **quando publicar** a escala (exatamente o que o cliente pediu), com histórico preservado. O portal do funcionário virá numa próxima etapa, mostrando **apenas as escalas consolidadas**.

---

## Férias — Faltas (art. 130) e períodos emendados (23/09/2026)

### 36. Faltas reduzem o direito a férias + aviso de períodos emendados ✅ Concluído

**O que foi feito:**
- **Faltas injustificadas (art. 130 CLT):** no modal de programação, o RH informa a quantidade de faltas do período aquisitivo. O sistema reduz automaticamente os dias de direito — até 5 faltas → 30 dias · 6 a 14 → 24 · 15 a 23 → 18 · 24 a 32 → 12 · 33 ou mais → 0 (perde o direito). A redução vale em **todo o sistema**: calendário de férias, dashboard, ficha 360, portal do funcionário e exportação.
- **Aviso de férias emendadas:** quando a programação fica "colada" a outro período do mesmo funcionário (sem ao menos **1 dia de trabalho** entre eles), o sistema mostra um **alerta** — sem bloquear.

**Proteção dos dados:** campo **novo e aditivo**. Funcionário sem faltas registradas continua com **30 dias** — nada muda no que já existe.

**Impacto:** o saldo passa a respeitar a lei no caso de faltas, e o RH é avisado sobre emendar férias.

---

## Comissões — Rascunho e Publicação (RH) (20/10/2026)

### 37. Comissões em rascunho e publicação com conferência → Concluído

**O que foi feito:** o lançamento de comissão por setor agora tem o fluxo **pendente → publicar**:
- Ao calcular a divisão, o RH escolhe **Salvar como pendente** (rascunho) ou **Publicar agora**.
- Nova aba **Pendentes** (com contador), listando os lançamentos que aguardam conferência.
- **Conferência antes de publicar**: resumo de total, retido, valor a distribuir, aptos, excluídos, totais por setor e avisos (setor sem aptos, funcionários em "Outros", ausências no período).
- **Publicar uma ou várias juntas** — seleção por caixa e "Publicar selecionadas".
- **Editar / reprocessar** — reabre o lançamento no formulário com os dados salvos; ao salvar, a comissão é **reprocessada por inteiro** (não existe edição de um funcionário isolado).
- **Excluir** enquanto pendente.
- Nada é publicado pela metade: enquanto pendente não existem lançamentos por funcionário, então fechamento, dashboard, ficha 360 e portal do funcionário **não enxergam** a comissão.

**Proteção dos dados:** o campo `status` já existia (`confirmado`), então os registros antigos continuam válidos e visíveis. O rascunho guarda uma fotografia do cálculo em `rascunho`, removida no momento da publicação. Sem migração.

**Impacto:** o RH confere a comissão com calma antes de publicar, publica semanas em lote e corrige erros sem publicar nada por engano.

---

## Comissões — Crédito de Setor (RH) (20/10/2026)

### 38. Setor sem aptos vira crédito do setor → Concluído

**O que foi feito:** quando um setor fica sem ninguém apto a receber (todos afastados/em férias ou sem funcionário), o valor dele **não é mais redistribuído** na hora para os outros setores — isso causava inconsistência (as ausências dos outros setores podiam ainda não ter sido lançadas). Agora:
- O valor vira um **crédito do setor** (coleção `CreditoComissaoSetor`, status `disponível`).
- Nova aba **Créditos** no módulo de comissões, para ver os créditos, **conferir a origem** (período/mês do lançamento que os gerou), filtrar disponíveis/usados e **escolher quais usar**.
- No próximo lançamento, o RH vê os créditos disponíveis e **marca quais usar**; o valor é somado ao setor correspondente na divisão.
- Os créditos só são **consumidos ao publicar** (status `usado`). Enquanto rascunho, podem ser editados/excluídos sem perder o crédito.
- Tudo aparece na conferência (aba Pendentes): "crédito gerado" e "crédito usado".

**Proteção dos dados:** mudança **aditiva** — comissões antigas continuam exatamente como foram publicadas. Nova coleção `CreditoComissaoSetor` com a devida regra em `firestore.rules`.

**Impacto:** o RH decide quando usar o saldo de um setor que ficou vazio, sem distorcer a divisão do período.

**Correção (inapto por faltas):** se o funcionário **faltar o período inteiro** (dias ausentes = total de dias da comissão), ele é tratado como **inapto** — sai do rateio automaticamente e, se o setor ficar vazio, o valor vira **crédito do setor** (não evapora mais).

---

## Comissões — Débito de Comissão (RH) (20/10/2026)

### 39. Débito de comissão por setor e individual → Concluído

**O que foi feito:** opção de **débito** nos dois lançamentos:
- **Por setor** (aba Lançar): seção "Débitos do período" — escolhe o setor, informa valor e observação. O débito é **dividido igualmente entre quem não teve falta** no período (quem faltou não paga o débito), e o total aparece como "Débitos" no resumo.
- **Individual**: botão **Comissão (acrescentar) / Débito (descontar)** — ao escolher "Débito", o valor é lançado como negativo para aquele funcionário.
- Os débitos ficam registrados na comissão (`debitos` + `total_debitos`) e aparecem na conferência (aba Pendentes).

**Proteção dos dados:** aditivo — lançamentos antigos não mudam. Débito reduz o valor individual do funcionário (no rateio por setor, o piso é 0 — nunca fica negativo).

**Impacto:** o RH desconta prejuízos/erros (pratos quebrados, mesa não cobrada, extra de garçom) direto no lançamento, sem planilha paralela.

---

## Escala de Folga — Edição em massa (RH) (20/10/2026)

### 40. Edição em massa do calendário de folgas → Concluído

**O que foi feito:** na Escala de Folga, um botão **Editar** (lápis) liga o modo de edição em massa:
- Clica direto nas células (funcionário × dia) para **marcar/desmarcar a folga** de cada um, manualmente.
- A linha do rodapé ("Total de folgas no dia") atualiza em tempo real, para não concentrar folga demais num dia só.
- A coluna "Escala" mostra "Personalizada (N folgas)" conforme você marca.
- No fim, escolhe **Salvar rascunho** ou **Publicar** (consolida direto).
- Dias em férias não podem ser alterados (mostram a férias).

**Proteção dos dados:** escala **consolidada** nunca é sobrescrita — se o mês tem escala consolidada, o salvamento é bloqueado e pede para reabrir. Escalas rascunho que sobrepõem o mês são fechadas/ajustadas, preservando o passado.

**Impacto:** o RH monta o quadro de folgas do mês inteiro manualmente, funcionário a funcionário, e publica de uma vez.

---

## Escala de Folga — Aviso de domingos sem folga (RH) (20/10/2026)

### 41. Aviso de mais de 3 domingos sem folga → Concluído

**O que foi feito:** regra trabalhista (1 folga a cada 3 domingos). O sistema conta os domingos consecutivos sem folga de cada funcionário, considerando as escalas salvas (consolidadas e rascunho) **e** os dias que estão sendo editados no modo de edição:
- Aparece um selo vermelho **"⚠ N domingos"** na linha do funcionário quando passa de 3.
- No modo de edição, o aviso **atualiza em tempo real** conforme você marca/desmarca.
- A revisão de consolidação mostra "Funcionários com mais de 3 domingos sem folga".

**Apenas aviso — não bloqueia.**

---

## Funcionário 360 — Edição de cadastro (RH) (20/10/2026)

### 42. Editar qualquer informação direto no 360 → Concluído

**O que foi feito:** o 360 do funcionário ganhou acesso de edição:
- Botão **"Editar cadastro"** no cabeçalho e **"Editar dados"** na aba **Dados Pessoais**.
- Abre o **mesmo formulário completo** da tela de Funcionários (dados pessoais, documentos, endereço, dados bancários, benefícios, dados contratuais, dependentes, foto, demitir/recontratar).
- Ao salvar, o 360 atualiza na hora.
- A aba **Cargo & Salário** já tinha edição própria e continua funcionando.

**Impacto:** o RH resolve tudo dentro do 360, sem precisar sair para a lista de funcionários.

---

## Portal do Funcionário — Histórico limitado a 3 meses (20/10/2026)

### 43. Histórico de comissões e salário limitado a 3 meses → Concluído

**O que foi feito:** no portal do funcionário, o histórico de **comissões** e **salário** exibe no máximo os **últimos 3 meses** (mês atual + 2 anteriores):
- Aba **Minhas Comissões**: só lista os 3 meses mais recentes (individual e resumo do setor).
- Aba **Meu Salário**: histórico de salários limitado aos 3 meses mais recentes.
- O **seletor de mês** dessas duas abas também fica limitado a 3 meses (vales e extrato seguem com o histórico completo).

**Impacto:** o colaborador vê só o histórico recente, sem rolar meses muito antigos.

---

## Próximos ajustes

Este documento será atualizado conforme novos ajustes e melhorias forem concluídos.
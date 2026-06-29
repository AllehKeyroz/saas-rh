🔴 1 — TIMEZONE: Mês errado em TODOS os lançamentos
Onde: Filtro de mês em Lançamentos, Fechamento, Exportação, Portal  
Arquivos: Lancamentos.jsx, Fechamento.jsx, DetalhesFechamentoModal, pdfExport.js, xlsxExport.js
Problema:  
O sistema salva data como "2026-01-01". Quando o JavaScript lê isso, interpreta como meia-noite em Londres (UTC). O Brasil está 3 horas atrás (UTC-3). Então "2026-01-01" vira 31 de dezembro no Brasil — e o lançamento some do mês de janeiro.
Exemplo real:  
- RH lança um consignado em 01/01/2026  
- Sistema salva como "2026-01-01"  
- Filtro pergunta: "esse mês é janeiro?" → JavaScript responde "não, é 31 de dezembro"  
- O lançamento NÃO aparece no mês de janeiro  
- Todos os lançamentos de consignado (sempre criados no dia 1º) ficam no mês errado
Quem vê: RH no Fechamento, RH nos Lançamentos, Funcionário no Portal, Exportação PDF/XLSX
🔴 2 — BACKUP: Botão de exportar quebra o sistema
Onde: Configurações > Backups  
Arquivo: BackupsTab.jsx:62
Problema:  
O código chama uma função CreateFileSignedUrl que nunca foi criada. É como se o sistema dissesse "vou chamar o João" mas o João não existe.
Exemplo real:  
- Admin clica em "Exportar Backup"  
- Sistema tenta baixar os documentos  
- TypeError: CreateFileSignedUrl is not a function  
- O backup não funciona, o navegador mostra erro, nada é baixado
🔴 3 — REPROCESSAR: Contrato de consignado finaliza antes da hora
Onde: Fechamento > Reprocessar  
Arquivo: Fechamento.jsx:269-277
Problema:  
Toda vez que o RH reprocessa um funcionário, o sistema conta +1 parcela paga no contrato consignado. Se o RH reprocessar várias vezes (ex: ajustando valores), o contrato de 36 parcelas pode "finalizar" com apenas 3 meses reais.
Exemplo real:  
- Funcionário tem contrato consignado de 10 parcelas  
- RH processa mês 1 → parcelas_pagas = 1  
- RH precisa reprocessar (ajustou um valor) → parcelas_pagas = 2  
- RH reprocessa de novo → parcelas_pagas = 3  
- Em 3 meses de processamento real, o contrato já mostra "parcelas_pagas = 3"  
- Em 10 reprocessamentos, o contrato é marcado como "encerrado" mesmo sem ter pago nada
🔴 4 — APROVAÇÃO EM LOTE: Troca de chave PIX não funciona
Onde: Solicitações > Responder em Lote  
Arquivo: Solicitacoes.jsx:196-223
Problema:  
Quando o RH aprova uma solicitação de troca de chave PIX individualmente, a chave é atualizada no funcionário. Mas quando aprova VÁRIAS solicitações de uma vez (em lote), a chave PIX nunca é atualizada.
Exemplo real:  
- Funcionário solicita troca de chave PIX  
- RH vai em "Solicitações", seleciona várias, clica "Aprovar todas"  
- No sistema aparece como "aprovado"  
- Mas a chave PIX do funcionário CONTINUA a mesma de antes  
- Funcionário espera receber por uma chave que nunca foi atualizada
🔴 5 — AUDITORIA: Criar/editar modelo de documento registra "undefined"
Onde: Modelos > Salvar, Finalidades > Salvar  
Arquivos: ModelosTab.jsx:125, FinalidadesTab.jsx:100
Problema:  
Quando o RH cria ou edita um modelo de documento, o sistema tenta salvar no histórico de auditoria: "Modelo \"undefined\" criado." — o nome do modelo some.
Exemplo real:  
- RH cria modelo "Contrato de Experiência"  
- Sistema salva o modelo (funciona)  
- Mas no log de auditoria aparece: "Modelo \"undefined\" criado."  
- O RH não consegue saber no histórico qual modelo foi criado ou alterado
🔴 6 — SETORES FIXOS: Recálculo de comissão ignora setores personalizados
Onde: Comissões > Detalhes > Recalcular  
Arquivo: DetalhesComissao.jsx:66-70
Problema:  
O cliente pode criar setores personalizados (ex: "Vendas", "Marketing", "Administrativo"). Mas o botão "Recalcular" usa apenas 4 setores fixos escritos no código: Salão, Cozinha, Copa/Playground/Caixa, Limpeza/RH.
Exemplo real:  
- Cliente configurou setores: "Vendas" (60%) e "Suporte" (40%)  
- Lança uma comissão de R$ 10.000  
- Clica em "Recalcular" para corrigir  
- Sistema distribui: 40% para "Salão" (que nem existe) e 24% para "Cozinha"  
- Resultado: R$ 4.000 vão para um setor que não existe e os valores nos setores reais ficam errados
🔴 7 — MESMO PROBLEMA: Corrigir comissão também usa valores fixos
Onde: Comissões > Detalhes > Corrigir  
Arquivo: CorrigirComissaoDialog.jsx:28-37
Problema:  
Mesmo caso do item 6. O dialog de correção usa percentuais fixos escritos no código (salão=40%, cozinha=24%, copa=14%, limpeza=2%) em vez de ler os percentuais que o cliente configurou.
Exemplo real:  
- Cliente configurou "Vendas" com 70% e "Suporte" com 30%  
- Corrige uma comissão → sistema aplica 40% para salão, 24% para cozinha  
- Os valores da comissão ficam completamente errados
🔴 8 — DUPLICAÇÃO VISUAL: Ajuda de Custo aparece 2 vezes no extrato
Onde: Portal do Funcionário > Extrato Mensal  
Arquivo: ExtratoMensal.jsx:80-97
Problema:  
O salário base já inclui a ajuda de custo na soma. Depois o sistema exibe a ajuda de custo como uma linha separada. O funcionário vê o mesmo valor duas vezes e pensa que ganhou mais do que realmente ganhou.
Exemplo real:  
- Salário base: R$ 1.500  
- Ajuda de custo: R$ 200  
- Sistema mostra "Salário Base: R$ 1.700" (já com a ajuda incluída)  
- E logo abaixo "Ajuda de Custo: + R$ 200"  
- Funcionário acha que o total é R$ 1.900, mas na verdade é R$ 1.700
🔴 9 — CONSIGNADO PARCELADO: Valor da parcela some no mês
Onde: Relatórios > Geral  
Arquivo: RelatorioGeral.jsx:36-37
Problema:  
Lançamentos do tipo vale_parcelado (vale pago em parcelas) não são incluídos em nenhuma coluna do relatório geral. Eles simplesmente somem.
Exemplo real:  
- Funcionário tem vale de R$ 300 parcelado em 3x de R$ 100  
- Relatório Geral mostra: Vales = R$ 0, Adiantamentos = R$ 0, Descontos = R$ 0  
- Mas o funcionário está pagando R$ 100 por mês  
- O relatório não mostra de onde está saindo esse dinheiro
🔴 10 — REGISTRO DE EMPRESA: ID do tenant vira campo solto
Onde: Cadastro de nova empresa (Register)  
Arquivo: Register.jsx:112-119
Problema:  
Quando alguém cadastra uma nova empresa, o sistema gera um ID pra ela, mas salva esse ID como um CAMPO qualquer dentro do documento, não como o identificador real. Os convites e referências podem apontar pro lugar errado.
Exemplo real:  
- Nova empresa "Supermercado XYZ" se cadastra  
- Sistema gera o ID "empresa_abc123"  
- Salva no Firestore com ID automático "doc_xyz789"  
- O campo id dentro do documento é "empresa_abc123"  
- Os convites apontam para "empresa_abc123"  
- Mas o documento REAL tem ID "doc_xyz789"  
- O convite não encontra a empresa
🔴 11 — REATIVAR USUÁRIO: Perde permissão de admin
Onde: Admin > Usuários > Inativar/Reativar  
Arquivo: Usuarios.jsx:124-133
Problema:  
Quando um admin é colocado como "inativo" e depois reativado, ele volta como "user" comum (RH), perdendo o acesso de administrador.
Exemplo real:  
- João é admin (pode tudo: configurar, excluir, gerenciar)  
- RH marca João como "inativo" (desligado)  
- 6 meses depois, João volta pra empresa  
- RH reativa João  
- João agora é "user" (RH simples) — perdeu acesso de admin  
- João não consegue mais acessar configurações, auditoria, usuários
🔴 12 — AUTENTICAÇÃO: Dados do Firestore podem sobrescrever permissão
Onde: Sistema inteiro (login)  
Arquivo: auth.js:27-36
Problema:  
Quando o usuário loga, o sistema carrega os dados do Firebase Authentication (que são seguros) e DEPOIS sobrescreve com os dados do Firestore (que podem ser alterados). Se alguém conseguir acesso ao Firestore (mesmo limitado), pode se tornar admin.
Exemplo real:  
- Maria é usuária normal (role: "user")  
- Alguém com acesso ao Firestore (ex: estagiário do RH) altera o campo role de Maria para "admin"  
- No próximo login, Maria vira admin  
- Maria agora pode: criar usuários, acessar auditoria, configurar tudo
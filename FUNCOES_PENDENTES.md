# Funções Pendentes — Status

## ✅ Resolvidas nesta sessão

| # | Item | Status |
|---|------|--------|
| 1 | `useToast` 19 arquivos | ✅ Mantido (funciona, trocar apenas se migrar para sonner) |
| 2 | Dashboard: gráfico Evolução Folha | ✅ Agora calcula dos últimos 6 fechamentos |
| 3 | Dashboard: gráfico Faltas por Setor | ✅ Agora exibe `faltas_no_periodo` do Firestore |
| 4 | Funcionários 360°: 8 abas stub | ✅ Indicador amarelo StubBadge adicionado |
| 5 | Exportar Contracheques | ✅ ZIP real com JSZip (múltiplos PDFs em um arquivo) |
| 16 | Role 'consulta' | ✅ Implementada: usuários consulta veem tela de bloqueio |
| 19 | Firebase config | ✅ `firebase.json` com hosting, functions, firestore, storage |
| 20 | Storage rules | ✅ `storage.rules` criado (max 10MB, auth required) |
| 21 | Firestore indexes | ✅ `firestore.indexes.json` com índices compostos |

## 📋 Ainda pendentes (Cloud Functions)

Para funcionar completamente, precisa fazer deploy de **Cloud Functions** no Firebase:

```bash
# Instalar Firebase CLI
npm install -g firebase-tools

# Login
firebase login

# Deploy
firebase deploy --only functions
```

As Functions necessárias em `functions/src/index.ts`:

```typescript
// sendEmail - Envio de notificações por email
export const sendEmail = functions.https.onCall(async (data, context) => {
  // Implementar com SendGrid, Mailgun ou Nodemailer
});

// notifyAdminOfError - Notificação de erro para admin
export const notifyAdminOfError = functions.https.onCall(async (data, context) => {
  // Enviar email para admin sobre erro no sistema
});

// calcularLimiteValeMensal - Atualizar limite de 40%
export const calcularLimiteValeMensal = functions.https.onCall(async (data, context) => {
  // Calcular 40% do salário como limite de vale
});
```

## ⏳ Pendencias não críticas

| # | Item | Observação |
|---|------|------------|
| 6 | GovBR real | Link simulado — integração real depende de contrato com GovBR |
| 7 | Email sending | Depende de Cloud Function `sendEmail` |
| 8 | Push notifications (FCM) | Requer setup do Firebase Cloud Messaging |
| 10 | Alertas Automáticos | Requer Cloud Functions + cron jobs |
| 11 | Permissões por Cargo | Tabela hardcoded — integrar com Firestore se necessário |
| 12 | GovBR Config | Formulário existe, integração real depende de API GovBR |
| 14 | Aparência dinâmica | Cores salvam no Firestore mas CSS não reage automaticamente |
| 13 | Backups automáticos | Download manual funciona, restaurar/scheduled não |

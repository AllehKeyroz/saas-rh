import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    // Apenas admin pode invocar
    if (user?.role !== 'admin') {
      return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    const body = await req.json();
    const { errorId } = body;

    if (!errorId) {
      return Response.json({ error: 'errorId is required' }, { status: 400 });
    }

    // Buscar o erro
    const errors = await base44.asServiceRole.entities.ApplicationError.filter({ id: errorId });
    if (!errors.length) {
      return Response.json({ error: 'Error not found' }, { status: 404 });
    }

    const appError = errors[0];

    // Buscar email do admin (assumindo que o user atual é admin)
    const adminEmail = user.email;

    // Enviar email de notificação
    const emailSubject = `🚨 Erro Detectado - ${appError.component}`;
    const emailBody = `
Olá,

Um erro foi detectado no sistema:

**Componente:** ${appError.component}
**Contexto:** ${appError.context}
**Mensagem:** ${appError.error_message}
**Severidade:** ${appError.severity}
**Data/Hora:** ${new Date(appError.created_date).toLocaleString('pt-BR')}

${appError.funcionario_id ? `**Funcionário Afetado:** ${appError.funcionario_id}` : ''}

${appError.stack_trace ? `**Stack Trace:**\n\`\`\`\n${appError.stack_trace}\n\`\`\`` : ''}

Acesse a página de Logs Financeiros para mais detalhes.

---
Sistema de Monitoramento de Erros
    `.trim();

    await base44.integrations.Core.SendEmail({
      to: adminEmail,
      subject: emailSubject,
      body: emailBody,
      from_name: 'Sistema de Monitoramento',
    });

    // Marcar como notificado
    await base44.asServiceRole.entities.ApplicationError.update(errorId, { notificado: true });

    return Response.json({ success: true, message: 'Admin notified' });
  } catch (error) {
    console.error('Erro ao notificar admin:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});
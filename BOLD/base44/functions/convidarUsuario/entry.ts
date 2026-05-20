import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: 'Não autorizado' }, { status: 401 });
    }
    if (user.role !== 'admin') {
      return Response.json({ error: 'Apenas administradores podem convidar usuários' }, { status: 403 });
    }

    const { email, role } = await req.json();
    if (!email || !role) {
      return Response.json({ error: 'E-mail e permissão são obrigatórios' }, { status: 400 });
    }

    await base44.auth.inviteUser(email, role);

    return Response.json({ success: true });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});
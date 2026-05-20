import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    // Fuso horário America/Cuiaba (UTC-4)
    const agora = new Date(new Date().toLocaleString('en-US', { timeZone: 'America/Cuiaba' }));
    const mesAtual = agora.getMonth() + 1;
    const diaAtual = agora.getDate();

    // Busca configuração ativa para aniversário
    const configs = await base44.asServiceRole.entities.ConfiguracaoNotificacao.filter({
      evento: 'aniversario_funcionario',
      ativo: true
    });

    if (!configs || configs.length === 0) {
      return Response.json({ message: 'Notificação de aniversário não configurada ou inativa.' });
    }

    const config = configs[0];

    // Busca todos os funcionários ativos com data de nascimento e e-mail
    const funcionarios = await base44.asServiceRole.entities.Funcionarios.filter({ ativo: true });

    const aniversariantes = funcionarios.filter(f => {
      if (!f.data_nascimento || !f.email) return false;
      const nascimento = new Date(f.data_nascimento);
      return nascimento.getMonth() + 1 === mesAtual && nascimento.getDate() === diaAtual;
    });

    if (aniversariantes.length === 0) {
      return Response.json({ message: 'Nenhum aniversariante hoje.' });
    }

    const enviados = [];

    for (const func of aniversariantes) {
      const idade = agora.getFullYear() - new Date(func.data_nascimento).getFullYear();

      const assuntoDefault = `🎂 Feliz Aniversário, ${func.nome}!`;
      const corpoDefault = `Olá, ${func.nome}!\n\nA equipe deseja a você um feliz aniversário de ${idade} anos! 🎉\n\nQue este dia seja repleto de alegrias e realizações.\n\nAtenciosamente,\nEquipe RH`;

      const assunto = (config.mensagem_assunto || assuntoDefault)
        .replace(/\{nome\}/g, func.nome)
        .replace(/\{idade\}/g, String(idade));

      const corpo = (config.mensagem_corpo || corpoDefault)
        .replace(/\{nome\}/g, func.nome)
        .replace(/\{idade\}/g, String(idade));

      // Destinatários: funcionário + extras configurados
      const destinatarios = [func.email];
      if (config.destinatarios) {
        config.destinatarios.split(',').map(e => e.trim()).filter(Boolean).forEach(e => {
          if (!destinatarios.includes(e)) destinatarios.push(e);
        });
      }

      for (const dest of destinatarios) {
        await base44.asServiceRole.integrations.Core.SendEmail({
          to: dest,
          subject: assunto,
          body: corpo
        });
      }

      await base44.asServiceRole.entities.LogNotificacao.create({
        evento: 'aniversario_funcionario',
        destinatario_email: func.email,
        destinatario_nome: func.nome,
        canal: 'email',
        status: 'enviado',
        mensagem: `Mensagem de aniversário enviada (${idade} anos)`
      });

      enviados.push(func.nome);
    }

    return Response.json({
      success: true,
      aniversariantes: enviados
    });

  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});
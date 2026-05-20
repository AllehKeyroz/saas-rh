import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

const NIVEIS = [
  { percentual: 50, evento: 'limite_vale_50_atingido', assuntoPadrao: '📊 Você usou 50% do seu limite de vale' },
  { percentual: 80, evento: 'limite_vale_80_atingido', assuntoPadrao: '⚠️ Você usou 80% do seu limite de vale' },
  { percentual: 100, evento: 'limite_vale_atingido',   assuntoPadrao: '🚫 Limite de vale atingido' },
];

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const payload = await req.json();
    const { data: lancamento } = payload;

    if (!lancamento || !['vale', 'adiantamento'].includes(lancamento.tipo_lancamento)) {
      return Response.json({ message: 'Não é vale/adiantamento, ignorado.' });
    }

    const funcionarioId = lancamento.funcionario_id;
    const funcionarios = await base44.asServiceRole.entities.Funcionarios.filter({ id: funcionarioId });
    const funcionario = funcionarios[0];

    if (!funcionario || !funcionario.limite_vales || !funcionario.email) {
      return Response.json({ message: 'Funcionário sem limite ou e-mail cadastrado.' });
    }

    // Calcula total de vales/adiantamentos do mês do lançamento
    const dataLancamento = new Date(lancamento.data_lancamento);
    const mes = dataLancamento.getMonth() + 1;
    const ano = dataLancamento.getFullYear();
    const mesRef = `${String(mes).padStart(2, '0')}/${ano}`;

    const todosLancamentos = await base44.asServiceRole.entities.FichaFinanceira.filter({
      funcionario_id: funcionarioId
    });

    const lancamentosDoMes = todosLancamentos.filter(l => {
      if (!['vale', 'adiantamento'].includes(l.tipo_lancamento)) return false;
      const d = new Date(l.data_lancamento);
      return d.getMonth() + 1 === mes && d.getFullYear() === ano;
    });

    const totalUsado = lancamentosDoMes.reduce((sum, l) => sum + (l.valor || 0), 0);
    const limite = funcionario.limite_vales;
    const percentual = (totalUsado / limite) * 100;

    // Busca logs de notificações já enviadas este mês para este funcionário
    const logsExistentes = await base44.asServiceRole.entities.LogNotificacao.filter({
      destinatario_email: funcionario.email
    });

    const logsDoMes = logsExistentes.filter(log => {
      const d = new Date(log.created_date);
      return d.getMonth() + 1 === mes && d.getFullYear() === ano;
    });

    const eventosJaEnviados = new Set(logsDoMes.map(l => l.evento));

    const resultados = [];

    for (const nivel of NIVEIS) {
      // Só dispara se o percentual atingiu este nível e ainda não foi enviado este mês
      if (percentual < nivel.percentual) continue;
      if (eventosJaEnviados.has(nivel.evento)) continue;

      // Busca configuração de notificação ativa para este evento
      const configs = await base44.asServiceRole.entities.ConfiguracaoNotificacao.filter({
        evento: nivel.evento,
        ativo: true
      });

      if (!configs || configs.length === 0) continue;
      const config = configs[0];

      const replaceVars = (text) => text
        .replace(/\{nome\}/g, funcionario.nome)
        .replace(/\{funcionario\}/g, funcionario.nome)
        .replace(/\{total_usado\}/g, totalUsado.toFixed(2))
        .replace(/\{limite\}/g, limite.toFixed(2))
        .replace(/\{percentual\}/g, percentual.toFixed(0))
        .replace(/\{mes_referencia\}/g, mesRef);

      const assunto = replaceVars(config.mensagem_assunto || nivel.assuntoPadrao);

      const corpoDefault = `Olá, ${funcionario.nome}!\n\nVocê utilizou ${percentual.toFixed(0)}% (R$ ${totalUsado.toFixed(2)}) do seu limite mensal de vales de R$ ${limite.toFixed(2)} referente ao mês ${mesRef}.\n\nAtenciosamente,\nSistema RH`;

      const corpo = replaceVars(config.mensagem_corpo || corpoDefault);

      // Destinatários: funcionário + extras configurados
      const destinatarios = [funcionario.email];
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
        evento: nivel.evento,
        destinatario_email: funcionario.email,
        destinatario_nome: funcionario.nome,
        canal: 'email',
        status: 'enviado',
        mensagem: `${nivel.percentual}% do limite atingido: R$ ${totalUsado.toFixed(2)} / R$ ${limite.toFixed(2)} (${mesRef})`
      });

      resultados.push(`${nivel.percentual}% → ${destinatarios.join(', ')}`);
    }

    return Response.json({
      success: true,
      percentual: percentual.toFixed(1),
      totalUsado,
      limite,
      notificacoes: resultados
    });

  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});
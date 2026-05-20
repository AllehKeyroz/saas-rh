import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    // Permite chamada por automação agendada (sem usuário) ou por admin
    let user = null;
    try {
      user = await base44.auth.me();
    } catch (_) {
      // chamada por automação agendada sem sessão de usuário — ok
    }

    if (user && user.role !== 'admin') {
      return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    const agora = new Date();
    // Mês anterior
    const mesAnterior = new Date(agora.getFullYear(), agora.getMonth() - 1, 1);
    const mesAnt = String(mesAnterior.getMonth() + 1).padStart(2, '0');
    const anoAnt = mesAnterior.getFullYear();
    const mesRefAnterior = `${mesAnt}/${anoAnt}`;

    // Buscar todos os funcionários ativos
    const funcionarios = await base44.asServiceRole.entities.Funcionarios.list();
    const ativos = funcionarios.filter(f => f.ativo !== false && !f.data_demissao);

    // Buscar todos os lançamentos
    const lancamentos = await base44.asServiceRole.entities.FichaFinanceira.list('-created_date', 2000);

    let atualizados = 0;
    const erros = [];

    for (const func of ativos) {
      try {
        // Comissões do mês anterior
        const comissoesMesAnt = lancamentos.filter(l => {
          if (l.funcionario_id !== func.id) return false;
          if (l.tipo_lancamento !== 'comissao') return false;
          if (!l.data_lancamento) return false;
          const d = new Date(l.data_lancamento);
          const m = String(d.getMonth() + 1).padStart(2, '0');
          const y = d.getFullYear();
          return `${m}/${y}` === mesRefAnterior;
        });

        const totalComissao = comissoesMesAnt.reduce((s, l) => s + (l.valor || 0), 0);
        const salarioBase = func.salario_base || 0;

        // Regra: 40% de (salário base + comissão do mês anterior)
        const novoLimite = Math.round(((salarioBase + totalComissao) * 0.4) * 100) / 100;

        await base44.asServiceRole.entities.Funcionarios.update(func.id, {
          limite_vales: novoLimite
        });

        atualizados++;
      } catch (err) {
        erros.push({ funcionario: func.nome, erro: err.message });
      }
    }

    return Response.json({
      sucesso: true,
      mes_referencia_comissao: mesRefAnterior,
      total_funcionarios: ativos.length,
      atualizados,
      erros
    });

  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});
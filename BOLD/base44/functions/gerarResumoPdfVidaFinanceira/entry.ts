import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';
import jsPDF from 'npm:jspdf@4.2.1';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { mes_referencia, salario, comissao, receita_extra, gastos_fixos, gastos_variaveis, investimentos, saldo, meta } = await req.json();

    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    let yPosition = 20;

    // Título
    doc.setFontSize(18);
    doc.setTextColor(59, 130, 246);
    doc.text('Resumo Financeiro Mensal', pageWidth / 2, yPosition, { align: 'center' });
    yPosition += 15;

    // Cabeçalho
    doc.setFontSize(11);
    doc.setTextColor(100, 100, 100);
    doc.text(`Funcionário: ${user.full_name}`, 20, yPosition);
    yPosition += 7;
    doc.text(`Período: ${mes_referencia}`, 20, yPosition);
    yPosition += 15;

    // Função para adicionar seção
    const addSection = (title, items) => {
      if (yPosition > pageHeight - 40) {
        doc.addPage();
        yPosition = 20;
      }

      doc.setFontSize(12);
      doc.setTextColor(0, 0, 0);
      doc.setFont(undefined, 'bold');
      doc.text(title, 20, yPosition);
      yPosition += 10;

      doc.setFont(undefined, 'normal');
      doc.setFontSize(10);

      items.forEach(item => {
        if (yPosition > pageHeight - 20) {
          doc.addPage();
          yPosition = 20;
        }
        doc.text(`${item.label}:`, 25, yPosition);
        doc.setTextColor(0, 100, 0);
        doc.text(item.value, pageWidth - 30, yPosition, { align: 'right' });
        doc.setTextColor(0, 0, 0);
        yPosition += 8;
      });

      yPosition += 5;
    };

    // Receitas
    const receitas = [
      { label: 'Salário Base', value: `R$ ${salario.toFixed(2)}` },
    ];
    if (comissao > 0) {
      receitas.push({ label: 'Comissão', value: `R$ ${comissao.toFixed(2)}` });
    }
    if (receita_extra > 0) {
      receitas.push({ label: 'Receitas Extras', value: `R$ ${receita_extra.toFixed(2)}` });
    }
    receitas.push({ label: 'Total Receitas', value: `R$ ${(salario + comissao + receita_extra).toFixed(2)}` });
    addSection('RECEITAS', receitas);

    // Despesas
    const despesas = [];
    if (gastos_fixos > 0) despesas.push({ label: 'Gastos Fixos', value: `R$ ${gastos_fixos.toFixed(2)}` });
    if (gastos_variaveis > 0) despesas.push({ label: 'Gastos Variáveis', value: `R$ ${gastos_variaveis.toFixed(2)}` });
    if (investimentos > 0) despesas.push({ label: 'Investimentos', value: `R$ ${investimentos.toFixed(2)}` });
    despesas.push({ label: 'Total Despesas', value: `R$ ${(gastos_fixos + gastos_variaveis + investimentos).toFixed(2)}` });
    addSection('DESPESAS', despesas);

    // Resultado
    const totalReceitas = salario + comissao + receita_extra;
    const totalDespesas = gastos_fixos + gastos_variaveis + investimentos;
    const resultado = totalReceitas - totalDespesas;

    if (yPosition > pageHeight - 40) {
      doc.addPage();
      yPosition = 20;
    }

    doc.setFontSize(12);
    doc.setFont(undefined, 'bold');
    if (resultado >= 0) {
      doc.setTextColor(0, 100, 0);
    } else {
      doc.setTextColor(200, 0, 0);
    }
    doc.text('RESULTADO DO MÊS', 20, yPosition);
    yPosition += 10;

    doc.setFontSize(14);
    doc.text(`R$ ${resultado.toFixed(2)}`, 20, yPosition);
    yPosition += 15;

    // Meta (se existir)
    if (meta && meta > 0) {
      doc.setFontSize(11);
      doc.setTextColor(0, 0, 0);
      doc.setFont(undefined, 'normal');
      doc.text(`Meta de Economia: R$ ${meta.toFixed(2)}`, 20, yPosition);
      yPosition += 7;

      const percentualMeta = (resultado / meta) * 100;
      doc.text(`Progresso: ${percentualMeta.toFixed(0)}%`, 20, yPosition);
    }

    const pdfBytes = doc.output('arraybuffer');

    return new Response(pdfBytes, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename=resumo_financeiro_${mes_referencia.replace('/', '-')}.pdf`,
      },
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});
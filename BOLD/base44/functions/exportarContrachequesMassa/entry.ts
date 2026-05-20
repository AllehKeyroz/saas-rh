import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';
import JSZip from 'npm:jszip@3.10.1';
import jsPDF from 'npm:jspdf@4.2.1';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    const { mesRef, funcionarioIds } = await req.json();

    if (!mesRef) {
      return Response.json({ error: 'mesRef is required' }, { status: 400 });
    }

    const [mesNum, anoStr] = mesRef.split('/');
    const mes = parseInt(mesNum) - 1;
    const ano = parseInt(anoStr);

    // Fetch data
    const [funcionarios, lancamentos, fechamentos] = await Promise.all([
      base44.entities.Funcionarios.list(),
      base44.entities.FichaFinanceira.list('-created_date', 2000),
      base44.entities.FechamentoMensal.list()
    ]);

    // Filter by funcionarioIds if provided
    const funcsToExport = funcionarioIds && funcionarioIds.length > 0
      ? funcionarios.filter(f => funcionarioIds.includes(f.id))
      : funcionarios.filter(f => f.ativo !== false);

    const fechamentosMes = fechamentos.filter(f => f.mes_referencia === mesRef);
    const zip = new JSZip();

    // Generate PDF for each employee
    for (const func of funcsToExport) {
      const fechado = fechamentosMes.find(f => f.funcionario_id === func.id);
      
      if (!fechado) continue; // Skip unfiled employees

      const funcLanc = lancamentos.filter(l => {
        if (!l.data_lancamento) return false;
        const d = new Date(l.data_lancamento);
        return d.getMonth() === mes && d.getFullYear() === ano && l.funcionario_id === func.id;
      });

      // Create PDF
      const doc = new jsPDF();
      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();
      let y = 20;

      // Header
      doc.setFontSize(16);
      doc.text('CONTRACHEQUE', pageWidth / 2, y, { align: 'center' });
      y += 10;

      doc.setFontSize(10);
      doc.text(`Período: ${mesRef}`, 20, y);
      y += 8;

      // Employee info
      doc.setFontSize(11);
      doc.text(`Funcionário: ${func.nome}`, 20, y);
      y += 6;
      doc.setFontSize(9);
      doc.text(`Função: ${func.funcao || 'N/A'}`, 20, y);
      y += 5;
      doc.text(`Setor: ${func.setor || 'N/A'}`, 20, y);
      y += 10;

      // Salary breakdown
      doc.setFontSize(10);
      doc.setFont(undefined, 'bold');
      doc.text('PROVENTOS', 20, y);
      y += 6;

      doc.setFont(undefined, 'normal');
      doc.text('Salário Base:', 20, y);
      doc.text(`R$ ${(fechado.salario_base || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`, 150, y, { align: 'right' });
      y += 5;

      if (fechado.total_adicionais > 0) {
        doc.text('Adicionais:', 20, y);
        doc.text(`R$ ${fechado.total_adicionais.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`, 150, y, { align: 'right' });
        y += 5;
      }

      // Deductions
      if (fechado.total_descontos > 0) {
        y += 3;
        doc.setFont(undefined, 'bold');
        doc.text('DESCONTOS', 20, y);
        y += 6;
        doc.setFont(undefined, 'normal');
        doc.text('Total Descontos:', 20, y);
        doc.text(`R$ ${fechado.total_descontos.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`, 150, y, { align: 'right' });
        y += 5;
      }

      // Net salary
      y += 5;
      doc.setFont(undefined, 'bold');
      doc.setFontSize(11);
      doc.text('SALÁRIO LÍQUIDO:', 20, y);
      doc.text(`R$ ${fechado.salario_liquido.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`, 150, y, { align: 'right' });
      y += 10;

      // Transactions detail (if any)
      if (funcLanc.length > 0) {
        doc.setFontSize(10);
        doc.setFont(undefined, 'bold');
        doc.text('LANÇAMENTOS DETALHADOS', 20, y);
        y += 6;

        doc.setFont(undefined, 'normal');
        doc.setFontSize(8);

        for (const lanc of funcLanc.slice(0, 10)) {
          if (y > pageHeight - 20) {
            doc.addPage();
            y = 20;
          }
          const descricao = lanc.descricao || lanc.tipo_lancamento;
          doc.text(`${descricao}:`, 20, y);
          doc.text(`R$ ${(lanc.valor || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`, 150, y, { align: 'right' });
          y += 4;
        }
      }

      // Footer
      y = pageHeight - 15;
      doc.setFontSize(8);
      doc.text(`Gerado em ${new Date().toLocaleDateString('pt-BR')}`, pageWidth / 2, y, { align: 'center' });

      // Add to ZIP
      const pdfBuffer = doc.output('arraybuffer');
      const fileName = `${func.nome.replace(/\s+/g, '_')}_${mesRef}.pdf`;
      zip.file(fileName, pdfBuffer);
    }

    // Generate ZIP
    const zipBuffer = await zip.generateAsync({ type: 'arraybuffer' });

    return new Response(zipBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/zip',
        'Content-Disposition': `attachment; filename=contracheques_${mesRef}.zip`
      }
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});
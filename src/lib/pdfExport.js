import jsPDF from 'jspdf';
import { formatCurrency, formatDate, TIPO_LABELS, mergeTipos, parseDateLocal, getMesRef } from './formatters';
import { ref, getBytes } from '@firebase/storage';
import { storage } from '@/firebase/config';
import { client } from '@/api/client';

const BRAND_COLOR = [37, 99, 235]; // blue-600
const GRAY = [100, 116, 139];
const LIGHT_GRAY = [241, 245, 249];
const RED = [220, 38, 38];
const GREEN = [22, 163, 74];
const BLUE = [37, 99, 235];
const EMERALD = [5, 150, 105];
const BLACK = [15, 23, 42];

function addPageHeader(doc, title, subtitle, pageWidth) {
  // Header bar
  doc.setFillColor(...BRAND_COLOR);
  doc.rect(0, 0, pageWidth, 22, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(13);
  doc.setFont('helvetica', 'bold');
  doc.text(title, 14, 14);
  if (subtitle) {
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.text(subtitle, pageWidth - 14, 14, { align: 'right' });
  }
  doc.setTextColor(...BLACK);
}

function addSectionTitle(doc, text, y) {
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...BRAND_COLOR);
  doc.text(text, 14, y);
  doc.setDrawColor(...BRAND_COLOR);
  doc.setLineWidth(0.4);
  doc.line(14, y + 1.5, 196, y + 1.5);
  doc.setTextColor(...BLACK);
  return y + 7;
}

function addTable(doc, headers, rows, startY, pageWidth) {
  const colCount = headers.length;
  const colWidth = (pageWidth - 28) / colCount;
  let y = startY;

  // Header row
  doc.setFillColor(...LIGHT_GRAY);
  doc.rect(14, y - 5, pageWidth - 28, 8, 'F');
  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...GRAY);
  headers.forEach((h, i) => {
    doc.text(h.label, 16 + i * colWidth + (h.align === 'right' ? colWidth - 4 : 0), y, { align: h.align || 'left' });
  });
  y += 5;

  // Data rows
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  rows.forEach((row, ri) => {
    if (y > 270) {
      doc.addPage();
      y = 20;
    }
    if (ri % 2 === 0) {
      doc.setFillColor(248, 250, 252);
      doc.rect(14, y - 4.5, pageWidth - 28, 7.5, 'F');
    }
    row.forEach((cell, i) => {
      const x = 16 + i * colWidth + (headers[i].align === 'right' ? colWidth - 4 : 0);
      if (cell.color) doc.setTextColor(...cell.color);
      else doc.setTextColor(...BLACK);
      doc.setFont('helvetica', cell.bold ? 'bold' : 'normal');
      doc.text(String(cell.value ?? ''), x, y, { align: headers[i].align || 'left' });
    });
    y += 7.5;
  });

  doc.setDrawColor(226, 232, 240);
  doc.setLineWidth(0.2);
  doc.line(14, y, pageWidth - 14, y);

  return y + 4;
}

// ─── EXPORT: Demonstrativo Individual ───────────────────────────────────────
export async function exportDemonstrativoPDF(funcionario, lancamentos, fechamentos, mesRef) {
  const tiposLancamento = await client.entities.TipoLancamento.list().catch(() => []);
  const descontosList = mergeTipos(tiposLancamento, 'desconto');

  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  const pageWidth = doc.internal.pageSize.getWidth();

  const funcLanc = lancamentos
    .filter(l => {
      if (!mesRef) return l.funcionario_id === funcionario.id;
      return l.funcionario_id === funcionario.id &&
        getMesRef(l.data_lancamento) === mesRef;
    })
    .sort((a, b) => (b.data_lancamento || '').localeCompare(a.data_lancamento || ''));

  const fechMes = fechamentos.find(f => f.funcionario_id === funcionario.id && f.mes_referencia === mesRef);

  addPageHeader(
    doc,
    `Demonstrativo — ${funcionario.nome}`,
    mesRef ? `Competência: ${mesRef}` : new Date().toLocaleDateString('pt-BR'),
    pageWidth
  );

  // Employee info box
  let y = 32;
  doc.setFillColor(...LIGHT_GRAY);
  doc.roundedRect(14, y, pageWidth - 28, 22, 2, 2, 'F');
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.text(funcionario.nome, 20, y + 8);
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...GRAY);
  doc.text(`${funcionario.funcao || '—'}  •  ${funcionario.setor || '—'}`, 20, y + 14);
  doc.text(`Admissão: ${formatDate(funcionario.data_admissao) || '—'}`, 20, y + 19.5);

  // Salary summary box
  if (fechMes) {
    const boxX = pageWidth - 90;
    doc.setTextColor(...GRAY);
    doc.setFontSize(8);
    doc.text('Salário Base', boxX, y + 4);
    doc.text('Ajuda Custo', boxX + 30, y + 4);
    doc.text('Descontos', boxX + 60, y + 4);
    doc.text('Líquido', boxX + 90, y + 4);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...BLACK);
    doc.text(formatCurrency(fechMes.salario_base), boxX, y + 11);
    doc.setTextColor(...BLUE);
    doc.text(formatCurrency(funcionario.ajuda_custo || 0), boxX + 30, y + 11);
    doc.setTextColor(...RED);
    doc.text(formatCurrency(fechMes.total_descontos), boxX + 60, y + 11);
    doc.setTextColor(...GREEN);
    doc.text(formatCurrency(fechMes.salario_liquido), boxX + 90, y + 11);
  }
  doc.setTextColor(...BLACK);

  y += 28;

  // Lançamentos table
  y = addSectionTitle(doc, 'Lançamentos do Período', y);
  const headers = [
    { label: 'Data' },
    { label: 'Tipo' },
    { label: 'Descrição' },
    { label: 'Valor', align: 'right' },
  ];
  const rows = funcLanc.map(l => [
    { value: formatDate(l.data_lancamento) },
    { value: TIPO_LABELS[l.tipo_lancamento] || l.tipo_lancamento },
    { value: l.descricao || '—' },
    {
      value: formatCurrency(l.valor),
      align: 'right',
      bold: true,
      color: descontosList.includes(l.tipo_lancamento) ? RED : GREEN,
    },
  ]);
  y = addTable(doc, headers, rows, y, pageWidth);

  // Comprovantes / thumbnails
  const comImagem = funcLanc.filter(l => l.comprovante_data || l.comprovante);
  if (comImagem.length > 0) {
    y += 4;
    if (y > 240) { doc.addPage(); y = 20; }
    y = addSectionTitle(doc, 'Comprovantes (miniaturas)', y);

    let thumbX = 14;
    const thumbSize = 40;
    const gap = 6;

    for (const l of comImagem) {
      if (thumbX + thumbSize > pageWidth - 14) {
        thumbX = 14;
        y += thumbSize + gap + 10;
      }
      if (y + thumbSize + 14 > 280) {
        doc.addPage();
        y = 20;
        thumbX = 14;
      }

      let imgData = null;
      if (l.comprovante_data) {
        const format = l.comprovante_data.startsWith('data:image/png') ? 'PNG' : 'JPEG';
        imgData = { data: l.comprovante_data, format };
      } else if (l.comprovante) {
        imgData = await loadImageAsBase64(l.comprovante);
      }
      if (imgData) {
        doc.setDrawColor(200, 200, 200);
        doc.setLineWidth(0.3);
        doc.rect(thumbX, y, thumbSize, thumbSize);
        doc.addImage(imgData.data, imgData.format, thumbX, y, thumbSize, thumbSize, undefined, 'FAST');
        doc.setFontSize(7);
        doc.setTextColor(...GRAY);
        const label = `${TIPO_LABELS[l.tipo_lancamento]} — ${formatDate(l.data_lancamento)}`;
        doc.text(label, thumbX, y + thumbSize + 4, { maxWidth: thumbSize });
      }
      thumbX += thumbSize + gap;
    }
    y += thumbSize + 14;
  }

  // Summary box at bottom
  if (fechMes) {
    if (y > 255) { doc.addPage(); y = 20; }
    y += 4;
    doc.setFillColor(...BRAND_COLOR);
    doc.roundedRect(14, y, pageWidth - 28, 18, 2, 2, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.text('SALÁRIO LÍQUIDO A RECEBER', pageWidth / 2, y + 7, { align: 'center' });
    doc.setFontSize(16);
    doc.text(formatCurrency(fechMes.salario_liquido), pageWidth / 2, y + 14.5, { align: 'center' });
  }

  // Footer
  doc.setFontSize(7.5);
  doc.setTextColor(...GRAY);
  doc.setFont('helvetica', 'normal');
  doc.text(`Gerado em ${new Date().toLocaleString('pt-BR')}`, 14, 290);
  doc.text('Documento gerado automaticamente pelo sistema de RH', pageWidth / 2, 290, { align: 'center' });

  doc.save(`demonstrativo_${funcionario.nome.replace(/\s+/g, '_')}_${mesRef?.replace('/', '-') || 'completo'}.pdf`);
}

// ─── EXPORT: Fechamento Mensal (resumo geral) ────────────────────────────────
export function exportFechamentoPDF(funcionarios, calcular, mesRef) {
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
  const pageWidth = doc.internal.pageSize.getWidth();

  addPageHeader(doc, `Fechamento Mensal — ${mesRef}`, `Gerado em ${new Date().toLocaleDateString('pt-BR')}`, pageWidth);

  let y = 32;
  y = addSectionTitle(doc, 'Resumo da Folha de Pagamento', y);

  const headers = [
    { label: 'Funcionário' },
    { label: 'Salário Base', align: 'right' },
    { label: 'Descontos', align: 'right' },
    { label: 'Adicionais', align: 'right' },
    { label: 'Comissão', align: 'right' },
    { label: 'Salário Líquido', align: 'right' },
    { label: 'Lanç.', align: 'right' },
  ];

  let totalBase = 0, totalDesc = 0, totalAdi = 0, totalComissao = 0, totalLiq = 0;

  const rows = funcionarios.map(func => {
    const calc = calcular(func.id);
    totalBase += calc.salarioBase;
    totalDesc += calc.totalDescontos;
    totalAdi += calc.totalAdicionais - (calc.detalhes.comissao || 0);
    totalComissao += calc.detalhes.comissao || 0;
    totalLiq += calc.salarioLiquido;
    return [
      { value: func.nome },
      { value: formatCurrency(calc.salarioBase), align: 'right' },
      { value: formatCurrency(calc.totalDescontos), align: 'right', color: RED },
      { value: formatCurrency(calc.totalAdicionais - (calc.detalhes.comissao || 0)), align: 'right', color: GREEN },
      { value: formatCurrency(calc.detalhes.comissao || 0), align: 'right', color: EMERALD },
      { value: formatCurrency(calc.salarioLiquido), align: 'right', bold: true },
      { value: calc.lancamentos, align: 'right' },
    ];
  });

  y = addTable(doc, headers, rows, y, pageWidth);

  // Totals row
  if (y > 170) { doc.addPage(); y = 20; }
  y += 2;
  doc.setFillColor(...BRAND_COLOR);
  doc.rect(14, y, pageWidth - 28, 9, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  const colW = (pageWidth - 28) / 7;
  doc.text('TOTAIS', 16, y + 6);
  doc.text(formatCurrency(totalBase), 16 + colW + colW - 4, y + 6, { align: 'right' });
  doc.text(formatCurrency(totalDesc), 16 + colW * 2 + colW - 4, y + 6, { align: 'right' });
  doc.text(formatCurrency(totalAdi), 16 + colW * 3 + colW - 4, y + 6, { align: 'right' });
  doc.text(formatCurrency(totalComissao), 16 + colW * 4 + colW - 4, y + 6, { align: 'right' });
  doc.text(formatCurrency(totalLiq), 16 + colW * 5 + colW - 4, y + 6, { align: 'right' });

  doc.setFontSize(7.5);
  doc.setTextColor(...GRAY);
  doc.setFont('helvetica', 'normal');
  doc.text(`Gerado em ${new Date().toLocaleString('pt-BR')}`, 14, 200);

  doc.save(`fechamento_${mesRef.replace('/', '-')}.pdf`);
}

// ─── Helper: load image as base64 via Firebase Storage SDK ──────────────
async function loadImageAsBase64(url) {
  try {
    const u = new URL(url);
    const pathMatch = u.pathname.match(/\/o\/(.+)/);
    if (!pathMatch) return null;
    const path = decodeURIComponent(pathMatch[1]);
    const storageRef = ref(storage, path);
    const bytes = await getBytes(storageRef);
    const blob = new Blob([bytes], { type: 'image/jpeg' });
    return await new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = () => {
        const format = blob.type?.includes('png') ? 'PNG' : 'JPEG';
        resolve({ data: reader.result, format });
      };
      reader.onerror = () => resolve(null);
      reader.readAsDataURL(blob);
    });
  } catch (e) {
    return null;
  }
}
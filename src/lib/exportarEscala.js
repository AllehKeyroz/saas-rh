// Exportação da escala de férias (planilha CSV/XLSX e PDF).
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import { getStatusFerias, FERIAS_STATUS, calcularSaldoFerias } from '@/lib/ferias';
import { getFolgasDoMes } from '@/lib/escalaFolga';
import { formatDate } from '@/lib/formatters';

const STATUS_LABEL = {
  [FERIAS_STATUS.PROGRAMADA]: 'Programada',
  [FERIAS_STATUS.EM_ANDAMENTO]: 'Em andamento',
  [FERIAS_STATUS.CONCLUIDA]: 'Concluída',
  [FERIAS_STATUS.CANCELADA]: 'Cancelada',
};

function montarLinhas(funcionarios, todasFerias) {
  const linhas = [];
  for (const f of funcionarios || []) {
    const feriasFunc = (todasFerias || []).filter(x => x.funcionario_id === f.id && x.cancelada !== true);
    const saldo = calcularSaldoFerias(f, feriasFunc);
    const pendentes = (saldo?.periodos || []).filter(p => p.saldoRestante > 0).length;
    const pendencia = pendentes > 0 ? `${pendentes} pendente(s)` : 'Em dia';

    if (feriasFunc.length === 0) {
      linhas.push({
        Funcionário: f.nome || '',
        Setor: f.setor || '',
        'Período aquisitivo': '',
        Início: '',
        Fim: '',
        Dias: '',
        Status: 'Sem férias',
        Pendência: pendencia,
      });
    } else {
      for (const r of feriasFunc) {
        linhas.push({
          Funcionário: f.nome || '',
          Setor: f.setor || '',
          'Período aquisitivo': r.periodo_aquisitivo ? `${r.periodo_aquisitivo}º` : '',
          Início: r.data_inicio ? formatDate(r.data_inicio) : '',
          Fim: r.data_fim ? formatDate(r.data_fim) : '',
          Dias: r.dias_gozados || '',
          Status: STATUS_LABEL[getStatusFerias(r)] || getStatusFerias(r) || '',
          Pendência: pendencia,
        });
      }
    }
  }
  return linhas;
}

function nomeArquivo() {
  return `escala_ferias_${new Date().toISOString().split('T')[0]}`;
}

export function exportarEscalaCSV(funcionarios, todasFerias) {
  const linhas = montarLinhas(funcionarios, todasFerias);
  const ws = XLSX.utils.json_to_sheet(linhas);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Escala de Férias');
  XLSX.writeFile(wb, `${nomeArquivo()}.xlsx`);
}

export function exportarEscalaPDF(funcionarios, todasFerias) {
  const linhas = montarLinhas(funcionarios, todasFerias);
  const doc = new jsPDF({ orientation: 'landscape' });
  const pageWidth = doc.internal.pageSize.getWidth();

  // Cabeçalho
  doc.setFillColor(15, 118, 110);
  doc.rect(0, 0, pageWidth, 20, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(13);
  doc.setFont('helvetica', 'bold');
  doc.text('Escala de Férias', 14, 13);
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.text(`Gerado em ${new Date().toLocaleDateString('pt-BR')}`, pageWidth - 14, 13, { align: 'right' });
  doc.setTextColor(15, 23, 42);

  const headers = ['Funcionário', 'Setor', 'Período', 'Início', 'Fim', 'Dias', 'Status', 'Pendência'];
  const colWidth = (pageWidth - 28) / headers.length;
  let y = 28;

  // Cabeçalho da tabela
  doc.setFillColor(241, 245, 249);
  doc.rect(14, y - 5, pageWidth - 28, 8, 'F');
  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(100, 116, 139);
  headers.forEach((h, i) => doc.text(h, 16 + i * colWidth, y));
  y += 5;

  // Linhas
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  linhas.forEach((row, ri) => {
    if (y > 195) {
      doc.addPage();
      y = 20;
    }
    if (ri % 2 === 0) {
      doc.setFillColor(248, 250, 252);
      doc.rect(14, y - 4.5, pageWidth - 28, 7.5, 'F');
    }
    doc.setTextColor(15, 23, 42);
    const valores = [row.Funcionário, row.Setor, row['Período aquisitivo'], row.Início, row.Fim, row.Dias, row.Status, row.Pendência];
    valores.forEach((v, i) => doc.text(String(v ?? ''), 16 + i * colWidth, y));
    y += 7.5;
  });

  doc.save(`${nomeArquivo()}.pdf`);
}

// ─── Escala de Folga (DSR) ──────────────────────────────────────────────────

const MESES_FOLGA = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];

// Uma linha por funcionário/mês com folgas. Dias que caem em feriado recebem "*".
function montarLinhasFolga(funcionarios, escalas, feriados, ano) {
  const feriadoMap = new Map((feriados || []).map(f => [f.data, f.nome]));
  const linhas = [];
  for (const f of funcionarios || []) {
    const escalasFunc = (escalas || []).filter(e => e.funcionario_id === f.id);
    for (let mes = 0; mes < 12; mes++) {
      const dias = getFolgasDoMes(escalasFunc, ano, mes);
      if (dias.length === 0) continue;
      linhas.push({
        Funcionário: f.nome || '',
        Setor: f.setor || '',
        Mês: MESES_FOLGA[mes],
        Total: dias.length,
        'Dias de folga': dias.map(iso => {
          const dia = Number(iso.slice(8, 10));
          return feriadoMap.has(iso) ? `${dia}*` : `${dia}`;
        }).join(', '),
      });
    }
  }
  return linhas;
}

export function exportarFolgaCSV(funcionarios, escalas, feriados, ano) {
  const linhas = montarLinhasFolga(funcionarios, escalas, feriados, ano);
  const ws = XLSX.utils.json_to_sheet(linhas);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, `Escala de Folga ${ano}`);
  XLSX.writeFile(wb, `escala_folga_${ano}.xlsx`);
}

export function exportarFolgaPDF(funcionarios, escalas, feriados, ano) {
  const linhas = montarLinhasFolga(funcionarios, escalas, feriados, ano);
  const doc = new jsPDF({ orientation: 'landscape' });
  const pageWidth = doc.internal.pageSize.getWidth();

  doc.setFillColor(90, 100, 162);
  doc.rect(0, 0, pageWidth, 20, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(13);
  doc.setFont('helvetica', 'bold');
  doc.text(`Escala de Folga — ${ano}`, 14, 13);
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.text(`Gerado em ${new Date().toLocaleDateString('pt-BR')}`, pageWidth - 14, 13, { align: 'right' });
  doc.setTextColor(15, 23, 42);

  const headers = ['Funcionário', 'Setor', 'Mês', 'Total', 'Dias de folga'];
  const larguras = [0.26, 0.18, 0.13, 0.07, 0.36].map(p => p * (pageWidth - 28));
  let y = 30;

  doc.setFillColor(241, 245, 249);
  doc.rect(14, y - 5, pageWidth - 28, 8, 'F');
  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(100, 116, 139);
  let x = 16;
  headers.forEach((h, i) => { doc.text(h, x, y); x += larguras[i]; });
  y += 6;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  linhas.forEach((row, ri) => {
    if (y > 195) { doc.addPage(); y = 20; }
    if (ri % 2 === 0) {
      doc.setFillColor(248, 250, 252);
      doc.rect(14, y - 4.5, pageWidth - 28, 7.5, 'F');
    }
    doc.setTextColor(15, 23, 42);
    const valores = [row.Funcionário, row.Setor, row.Mês, String(row.Total), row['Dias de folga']];
    let xx = 16;
    valores.forEach((v, i) => { doc.text(String(v ?? ''), xx, y); xx += larguras[i]; });
    y += 7.5;
  });

  y += 4;
  if (y > 190) { doc.addPage(); y = 20; }
  doc.setFontSize(7.5);
  doc.setTextColor(100, 116, 139);
  doc.text('* dia de folga que cai em feriado.', 14, y);

  doc.save(`escala_folga_${ano}.pdf`);
}
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Download, FileText, Loader2 } from 'lucide-react';
import { format } from 'date-fns';
import { jsPDF } from 'jspdf';
import * as XLSX from 'xlsx';

const TIPO_LABELS = {
  ferias: 'Férias',
  vale: 'Vale',
  banco_horas: 'Banco de Horas',
  atestado: 'Atestado',
  documento: 'Documento',
  outro: 'Outro',
};

const STATUS_LABELS = {
  pendente: 'Pendente',
  aprovado: 'Aprovado',
  recusado: 'Recusado',
};

function formatDate(str) {
  if (!str) return '';
  try { return format(new Date(str), 'dd/MM/yyyy'); } catch { return str; }
}

function formatDateTime(str) {
  if (!str) return '';
  try { return format(new Date(str), 'dd/MM/yyyy HH:mm'); } catch { return str; }
}

function getAnexosTexto(s) {
  const lista = s.anexos_urls || (s.comprovante_url ? [{ nome: 'Arquivo', url: s.comprovante_url }] : []);
  return lista.map(a => a.url).join('\n');
}

export default function ExportarSolicitacoes({ solicitacoes, labelPeriodo }) {
  const [loading, setLoading] = useState(null);

  const exportarExcel = () => {
    setLoading('xlsx');
    const rows = solicitacoes.map(s => ({
      'Funcionário': s.funcionario_nome || '',
      'Tipo': TIPO_LABELS[s.tipo_solicitacao] || s.tipo_solicitacao,
      'Status': STATUS_LABELS[s.status] || s.status,
      'Título': s.titulo || '',
      'Descrição': s.descricao || '',
      'Valor (R$)': s.valor_solicitado || '',
      'Período início': formatDate(s.periodo_inicio),
      'Período fim': formatDate(s.periodo_fim),
      'Data solicitada': formatDate(s.data_solicitada),
      'Tipo documento': s.tipo_documento || '',
      'Data envio': formatDateTime(s.created_date),
      'Resposta RH': s.resposta_rh || '',
      'Respondido por': s.respondido_por || '',
      'Data resposta': formatDateTime(s.data_resposta),
      'Anexos (URLs)': getAnexosTexto(s),
    }));

    const ws = XLSX.utils.json_to_sheet(rows);
    // Ajustar largura das colunas
    ws['!cols'] = [
      { wch: 22 }, { wch: 14 }, { wch: 12 }, { wch: 20 }, { wch: 30 },
      { wch: 12 }, { wch: 14 }, { wch: 14 }, { wch: 14 }, { wch: 18 },
      { wch: 18 }, { wch: 35 }, { wch: 22 }, { wch: 18 }, { wch: 50 },
    ];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Solicitações');
    XLSX.writeFile(wb, `solicitacoes_${labelPeriodo || format(new Date(), 'dd-MM-yyyy')}.xlsx`);
    setLoading(null);
  };

  const exportarPDF = () => {
    setLoading('pdf');
    const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
    const pageW = doc.internal.pageSize.getWidth();
    const margin = 14;
    let y = 20;

    // Cabeçalho
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.text('Relatório de Solicitações', margin, y);
    y += 7;
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(100);
    doc.text(`Gerado em ${format(new Date(), 'dd/MM/yyyy HH:mm')}${labelPeriodo ? `  |  Período: ${labelPeriodo}` : ''}  |  Total: ${solicitacoes.length}`, margin, y);
    y += 10;
    doc.setTextColor(0);

    // Para cada solicitação, um bloco
    for (const s of solicitacoes) {
      if (y > 175) { doc.addPage(); y = 20; }

      const statusColor = { aprovado: [22, 163, 74], recusado: [220, 38, 38], pendente: [202, 138, 4] }[s.status] || [100, 100, 100];
      doc.setFillColor(248, 250, 252);
      doc.roundedRect(margin, y, pageW - margin * 2, 38, 2, 2, 'F');

      // Status badge
      doc.setFillColor(...statusColor);
      doc.roundedRect(pageW - margin - 24, y + 3, 22, 6, 1, 1, 'F');
      doc.setFontSize(7);
      doc.setTextColor(255);
      doc.setFont('helvetica', 'bold');
      doc.text(STATUS_LABELS[s.status] || s.status, pageW - margin - 13, y + 7.5, { align: 'center' });
      doc.setTextColor(0);

      // Nome + tipo
      doc.setFontSize(10);
      doc.setFont('helvetica', 'bold');
      doc.text(`${s.funcionario_nome || '—'}`, margin + 3, y + 8);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      doc.setTextColor(80);
      doc.text(TIPO_LABELS[s.tipo_solicitacao] || s.tipo_solicitacao, margin + 3, y + 14);
      doc.setTextColor(0);

      // Detalhes linha 1
      const col2 = margin + 70;
      const col3 = margin + 140;
      doc.setFontSize(8);
      let linha = y + 20;
      if (s.created_date) { doc.setTextColor(100); doc.text('Enviado:', margin + 3, linha); doc.setTextColor(0); doc.text(formatDateTime(s.created_date), margin + 18, linha); }
      if (s.valor_solicitado) { doc.setTextColor(100); doc.text('Valor:', col2, linha); doc.setTextColor(0); doc.text(`R$ ${Number(s.valor_solicitado).toFixed(2)}`, col2 + 12, linha); }
      if (s.periodo_inicio) { doc.setTextColor(100); doc.text('Período:', col3, linha); doc.setTextColor(0); doc.text(`${formatDate(s.periodo_inicio)}${s.periodo_fim ? ` → ${formatDate(s.periodo_fim)}` : ''}`, col3 + 16, linha); }

      // Linha 2 — descrição
      linha += 6;
      if (s.descricao) {
        doc.setTextColor(60);
        const truncated = s.descricao.length > 110 ? s.descricao.slice(0, 107) + '...' : s.descricao;
        doc.text(`Obs: ${truncated}`, margin + 3, linha);
        doc.setTextColor(0);
      }

      // Linha 3 — resposta RH
      linha += 6;
      if (s.resposta_rh) {
        doc.setFillColor(230, 244, 255);
        doc.roundedRect(margin + 3, linha - 3.5, pageW - margin * 2 - 6, 6, 1, 1, 'F');
        doc.setFontSize(7.5);
        doc.setTextColor(30, 80, 160);
        const truncResposta = s.resposta_rh.length > 120 ? s.resposta_rh.slice(0, 117) + '...' : s.resposta_rh;
        doc.text(`RH: ${truncResposta}`, margin + 5, linha + 0.8);
        doc.setTextColor(0);
        doc.setFontSize(8);
      }

      // Anexos
      const totalAnexos = (s.anexos_urls?.length || 0) + (s.comprovante_url && !s.anexos_urls?.length ? 1 : 0);
      if (totalAnexos > 0) {
        doc.setFontSize(7);
        doc.setTextColor(100);
        doc.text(`📎 ${totalAnexos} anexo(s)`, pageW - margin - 30, y + 14);
        doc.setTextColor(0);
      }

      y += 43;
    }

    // Rodapé em cada página
    const totalPages = doc.internal.getNumberOfPages();
    for (let i = 1; i <= totalPages; i++) {
      doc.setPage(i);
      doc.setFontSize(7);
      doc.setTextColor(150);
      doc.text(`Página ${i} de ${totalPages}`, pageW / 2, doc.internal.pageSize.getHeight() - 6, { align: 'center' });
    }

    doc.save(`solicitacoes_${labelPeriodo || format(new Date(), 'dd-MM-yyyy')}.pdf`);
    setLoading(null);
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2 h-9" disabled={solicitacoes.length === 0}>
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
          Exportar ({solicitacoes.length})
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={exportarPDF} className="gap-2 cursor-pointer">
          <FileText className="w-4 h-4 text-red-500" />
          Exportar como PDF
        </DropdownMenuItem>
        <DropdownMenuItem onClick={exportarExcel} className="gap-2 cursor-pointer">
          <Download className="w-4 h-4 text-green-600" />
          Exportar como Excel
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
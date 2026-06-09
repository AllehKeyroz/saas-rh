import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Download, Loader2, FileJson } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { formatCurrency, formatDate } from '@/lib/formatters';

export default function ExportHistoricoFinanceiro({ funcionario, lancamentos, fechamentos }) {
  const [dialogAberto, setDialogAberto] = useState(false);
  const [exportando, setExportando] = useState(false);
  const { toast } = useToast();

  if (!funcionario) return null;

  const funcLanc = lancamentos
    .filter(l => l.funcionario_id === funcionario.id)
    .sort((a, b) => new Date(b.data_lancamento) - new Date(a.data_lancamento));

  const funcFech = fechamentos
    .filter(f => f.funcionario_id === funcionario.id)
    .sort((a, b) => b.mes_referencia.localeCompare(a.mes_referencia));

  const exportarPDF = async () => {
    setExportando(true);
    try {
      const { jsPDF } = await import('jspdf');
      const doc = new jsPDF();

      doc.setFontSize(16);
      doc.text('Relatório de Movimentações Financeiras', 20, 15);

      doc.setFontSize(10);
      doc.setFont(undefined, 'normal');
      doc.text(`Funcionário: ${funcionario.nome}`, 20, 25);
      doc.text(`Função: ${funcionario.funcao || 'N/A'}`, 20, 31);
      doc.text(`Setor: ${funcionario.setor || 'N/A'}`, 20, 37);
      doc.text(`Data de Geração: ${new Date().toLocaleDateString('pt-BR')}`, 20, 43);

      let yPos = 55;
      const pageHeight = doc.internal.pageSize.height;
      const lineHeight = 5;

      // Seção de Fechamentos
      doc.setFont(undefined, 'bold');
      doc.setFontSize(11);
      doc.text('HISTÓRICO DE FECHAMENTOS', 20, yPos);
      yPos += 7;

      doc.setFontSize(9);
      doc.setFont(undefined, 'normal');
      const colWidths = [30, 30, 30, 30, 30, 30];
      const headers = ['Mês Ref.', 'Sal. Base', 'Ajuda Custo', 'Descontos', 'Adicionais', 'Sal. Líquido'];
      let xPos = 20;

      headers.forEach((header, idx) => {
        doc.setFont(undefined, 'bold');
        doc.text(header, xPos, yPos);
        xPos += colWidths[idx];
      });

      yPos += 6;
      doc.setFont(undefined, 'normal');

      funcFech.forEach(fech => {
        if (yPos + lineHeight > pageHeight - 20) {
          doc.addPage();
          yPos = 20;
        }

        xPos = 20;
        doc.text(fech.mes_referencia, xPos, yPos);
        xPos += colWidths[0];
        doc.text(formatCurrency(fech.salario_base), xPos, yPos);
        xPos += colWidths[1];
        const ajudaCustoVal = (funcionario.ajuda_custo || 0);
        doc.text(formatCurrency(ajudaCustoVal), xPos, yPos);
        xPos += colWidths[2];
        doc.text(formatCurrency(fech.total_descontos), xPos, yPos);
        xPos += colWidths[3];
        doc.text(formatCurrency(fech.total_adicionais), xPos, yPos);
        xPos += colWidths[4];
        doc.setFont(undefined, 'bold');
        doc.text(formatCurrency(fech.salario_liquido), xPos, yPos);
        doc.setFont(undefined, 'normal');
        yPos += lineHeight;
      });

      yPos += 8;

      // Seção de Lançamentos
      doc.setFont(undefined, 'bold');
      doc.setFontSize(11);
      doc.text('LANÇAMENTOS DETALHADOS', 20, yPos);
      yPos += 7;

      doc.setFontSize(9);
      const lancColWidths = [20, 25, 60, 25];
      const lancHeaders = ['Data', 'Tipo', 'Descrição', 'Valor'];
      xPos = 20;

      lancHeaders.forEach((header, idx) => {
        doc.setFont(undefined, 'bold');
        doc.text(header, xPos, yPos);
        xPos += lancColWidths[idx];
      });

      yPos += 6;
      doc.setFont(undefined, 'normal');

      funcLanc.forEach(lanc => {
        if (yPos + lineHeight > pageHeight - 20) {
          doc.addPage();
          yPos = 20;
        }

        xPos = 20;
        doc.text(formatDate(lanc.data_lancamento), xPos, yPos);
        xPos += lancColWidths[0];
        doc.text(lanc.tipo_lancamento, xPos, yPos);
        xPos += lancColWidths[1];
        
        const descricao = (lanc.descricao || '-').substring(0, 40);
        doc.text(descricao, xPos, yPos);
        xPos += lancColWidths[2];
        
        doc.setFont(undefined, 'bold');
        doc.text(formatCurrency(lanc.valor), xPos, yPos);
        doc.setFont(undefined, 'normal');
        yPos += lineHeight;
      });

      doc.save(`Relatorio_${funcionario.nome}_${new Date().toISOString().split('T')[0]}.pdf`);
      toast({ title: '✅ PDF exportado com sucesso!' });
    } catch (error) {
      toast({ title: 'Erro ao exportar PDF', description: error.message, variant: 'destructive' });
    } finally {
      setExportando(false);
    }
  };

  const exportarExcel = async () => {
    setExportando(true);
    try {
      const xlsx = await import('xlsx');

      // Aba 1: Fechamentos
      const fechDataWS = [
        ['FECHAMENTOS MENSAIS'],
        ['Funcionário:', funcionario.nome],
        ['Função:', funcionario.funcao || 'N/A'],
        ['Setor:', funcionario.setor || 'N/A'],
        [],
        ['Mês Ref.', 'Salário Base', 'Ajuda Custo', 'Descontos', 'Adicionais', 'Salário Líquido'],
        ...funcFech.map(f => [f.mes_referencia, f.salario_base, funcionario.ajuda_custo || 0, f.total_descontos, f.total_adicionais, f.salario_liquido]),
      ];

      // Aba 2: Lançamentos
      const lancDataWS = [
        ['LANÇAMENTOS DETALHADOS'],
        ['Funcionário:', funcionario.nome],
        [],
        ['Data', 'Tipo', 'Descrição', 'Valor'],
        ...funcLanc.map(l => [formatDate(l.data_lancamento), l.tipo_lancamento, l.descricao || '-', l.valor]),
      ];

      const wsFech = xlsx.utils.aoa_to_sheet(fechDataWS);
      const wsLanc = xlsx.utils.aoa_to_sheet(lancDataWS);

      const wb = xlsx.utils.book_new();
      xlsx.utils.book_append_sheet(wb, wsFech, 'Fechamentos');
      xlsx.utils.book_append_sheet(wb, wsLanc, 'Lançamentos');

      // Formatação básica
      wsFech['!cols'] = [15, 15, 15, 15, 15];
      wsLanc['!cols'] = [15, 20, 50, 15];

      xlsx.writeFile(wb, `Relatorio_${funcionario.nome}_${new Date().toISOString().split('T')[0]}.xlsx`);
      toast({ title: '✅ Excel exportado com sucesso!' });
    } catch (error) {
      toast({ title: 'Erro ao exportar Excel', description: error.message, variant: 'destructive' });
    } finally {
      setExportando(false);
    }
  };

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        onClick={() => setDialogAberto(true)}
        className="gap-2"
      >
        <Download className="w-4 h-4" />
        Exportar Histórico
      </Button>

      <Dialog open={dialogAberto} onOpenChange={setDialogAberto}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Exportar Histórico Financeiro</DialogTitle>
            <DialogDescription>
              Selecione o formato para exportar o relatório consolidado de {funcionario.nome}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3">
            <Button
              onClick={exportarPDF}
              disabled={exportando}
              className="w-full gap-2"
              variant="outline"
            >
              {exportando ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileJson className="w-4 h-4" />}
              Exportar em PDF
            </Button>

            <Button
              onClick={exportarExcel}
              disabled={exportando}
              className="w-full gap-2"
              variant="outline"
            >
              {exportando ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileJson className="w-4 h-4" />}
              Exportar em Excel
            </Button>

            <div className="text-xs text-muted-foreground pt-2 border-t">
              <p><strong>Contém:</strong></p>
              <ul className="list-disc list-inside mt-1 space-y-0.5">
                <li>Histórico de fechamentos mensais</li>
                <li>Todos os lançamentos ordenados por data</li>
                <li>Dados consolidados do funcionário</li>
              </ul>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
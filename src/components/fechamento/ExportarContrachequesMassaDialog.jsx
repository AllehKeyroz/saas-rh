import React, { useState } from 'react';
import { client } from '@/api/client';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Loader2, Download } from 'lucide-react';
import { toast } from 'sonner';

export default function ExportarContrachequesMassaDialog({
  open,
  onOpenChange,
  mesRef,
  funcionarios,
  fechamentosMes,
}) {
  const [loading, setLoading] = useState(false);

  const funcionariosComFechamento = funcionarios.filter(f =>
    fechamentosMes.some(fech => fech.funcionario_id === f.id)
  );

  const handleExport = async () => {
    setLoading(true);
    try {
      const JSZip = (await import('jszip')).default
      const zip = new JSZip()

      for (const func of funcionariosComFechamento) {
        const fechamento = fechamentosMes.find(f => f.funcionario_id === func.id)
        const { jsPDF } = await import('jspdf')
        const doc = new jsPDF()
        doc.setFontSize(16)
        doc.text('Contracheque', 20, 20)
        doc.setFontSize(11)
        doc.text(`Funcionário: ${func.nome}`, 20, 32)
        doc.text(`Mês: ${mesRef}`, 20, 40)
        doc.text(`Salário Base: R$ ${Number(func.salario_base || 0).toFixed(2)}`, 20, 50)
        if (func.ajuda_custo) {
          doc.text(`Ajuda de Custo: R$ ${Number(func.ajuda_custo || 0).toFixed(2)}`, 20, 58)
        }
        const yOffset = func.ajuda_custo ? 66 : 58
        if (fechamento) {
          doc.text(`Descontos: R$ ${Number(fechamento.total_descontos || 0).toFixed(2)}`, 20, yOffset)
          doc.text(`Adicionais: R$ ${Number(fechamento.total_adicionais || 0).toFixed(2)}`, 20, yOffset + 8)
          doc.text(`Salário Líquido: R$ ${Number(fechamento.salario_liquido || 0).toFixed(2)}`, 20, yOffset + 16)
        }
        const pdfBlob = doc.output('blob')
        zip.file(`contracheque_${func.nome.replace(/\s+/g, '_')}_${mesRef.replace('/', '-')}.pdf`, pdfBlob)
      }

      const zipBlob = await zip.generateAsync({ type: 'blob' })
      const url = URL.createObjectURL(zipBlob)
      const a = document.createElement('a')
      a.href = url
      a.download = `contracheques_${mesRef.replace('/', '-')}.zip`
      document.body.appendChild(a)
      a.click()
      URL.revokeObjectURL(url)
      document.body.removeChild(a)

      toast.success(`${funcionariosComFechamento.length} contracheques exportados em ZIP!`);
      onOpenChange(false);
    } catch (error) {
      toast.error(`Erro ao exportar: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            <Download className="w-5 h-5" />
            Exportar Contracheques em Massa
          </AlertDialogTitle>
          <AlertDialogDescription>
            Será gerado um arquivo ZIP contendo {funcionariosComFechamento.length} contracheque(s) do período {mesRef}.
            {funcionariosComFechamento.length === 0 && (
              <span className="text-amber-600 font-medium block mt-2">
                ⚠️ Nenhum funcionário com fechamento processado neste período.
              </span>
            )}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={loading}>Cancelar</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleExport}
            disabled={loading || funcionariosComFechamento.length === 0}
            className="gap-2"
          >
            {loading && <Loader2 className="w-4 h-4 animate-spin" />}
            {loading ? 'Exportando...' : 'Exportar ZIP'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
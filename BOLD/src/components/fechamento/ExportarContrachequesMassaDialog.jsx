import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
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
      const response = await base44.functions.invoke('exportarContrachequesMassa', {
        mesRef,
        funcionarioIds: funcionariosComFechamento.map(f => f.id),
      });

      // Download ZIP
      const blob = new Blob([response.data], { type: 'application/zip' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `contracheques_${mesRef.replace('/', '-')}.zip`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      toast.success(`${funcionariosComFechamento.length} contracheques exportados com sucesso!`);
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
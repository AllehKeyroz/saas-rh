import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Download, Loader2, CheckCircle2, AlertCircle } from 'lucide-react';

export default function BackupModal360({ isOpen, onClose, funcionario }) {
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState(null);

  const handleBackup = async (type) => {
    setLoading(true);
    try {
      // Simular geração de backup
      await new Promise(resolve => setTimeout(resolve, 2000));
      setStatus({ type: 'success', message: `${type} gerado com sucesso!` });
      setTimeout(() => setStatus(null), 3000);
    } catch (error) {
      setStatus({ type: 'error', message: 'Erro ao gerar backup' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Backup do Funcionário</DialogTitle>
          <DialogDescription>
            {funcionario?.nome || 'Funcionário'}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {status && (
            <div className={`p-4 rounded-lg flex items-center gap-3 ${
              status.type === 'success'
                ? 'bg-green-50 text-green-700'
                : 'bg-red-50 text-red-700'
            }`}>
              {status.type === 'success' ? (
                <CheckCircle2 className="w-5 h-5 shrink-0" />
              ) : (
                <AlertCircle className="w-5 h-5 shrink-0" />
              )}
              <span className="text-sm">{status.message}</span>
            </div>
          )}

          <div className="space-y-3">
            <Button
              onClick={() => handleBackup('PDF')}
              disabled={loading}
              className="w-full justify-start h-auto py-3 px-4"
              variant="outline"
            >
              {loading ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Download className="w-4 h-4 mr-2" />
              )}
              <div className="text-left">
                <p className="font-medium">Baixar PDF</p>
                <p className="text-xs text-muted-foreground">Relatório completo em PDF</p>
              </div>
            </Button>

            <Button
              onClick={() => handleBackup('Dados Internos')}
              disabled={loading}
              className="w-full justify-start h-auto py-3 px-4"
              variant="outline"
            >
              {loading ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Download className="w-4 h-4 mr-2" />
              )}
              <div className="text-left">
                <p className="font-medium">Baixar Dados JSON</p>
                <p className="text-xs text-muted-foreground">Todos os dados internos do sistema</p>
              </div>
            </Button>

            <Button
              onClick={() => handleBackup('Nuvem')}
              disabled={loading}
              className="w-full justify-start h-auto py-3 px-4"
              variant="outline"
            >
              {loading ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Download className="w-4 h-4 mr-2" />
              )}
              <div className="text-left">
                <p className="font-medium">Enviar para Nuvem</p>
                <p className="text-xs text-muted-foreground">Salvar cópia na nuvem segura</p>
              </div>
            </Button>
          </div>
        </div>

        <div className="flex gap-2">
          <Button variant="outline" className="flex-1" onClick={onClose}>
            Cancelar
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
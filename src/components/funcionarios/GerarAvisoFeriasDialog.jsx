import React, { useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Loader2, FileText, Send } from 'lucide-react';
import { toast } from 'sonner';
import { montarHtmlAviso, gerarAvisoFerias } from '@/lib/avisoFerias';

export default function GerarAvisoFeriasDialog({ open, onClose, funcionario, ferias, onGerado }) {
  const [gerando, setGerando] = useState(false);

  const previewHtml = useMemo(
    () => (funcionario && ferias ? montarHtmlAviso(funcionario, ferias) : ''),
    [funcionario, ferias]
  );

  const handleGerar = async () => {
    setGerando(true);
    try {
      const assinatura = await gerarAvisoFerias(funcionario, ferias);
      if (assinatura) {
        toast.success('Aviso de Férias gerado e enviado para assinatura!');
        onGerado?.(assinatura);
        onClose();
      } else {
        toast.error('Não foi possível gerar o aviso de férias.');
      }
    } finally {
      setGerando(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-primary" />
            Aviso de Férias {ferias?.periodo_aquisitivo ? `— ${ferias.periodo_aquisitivo}º período` : ''}
          </DialogTitle>
        </DialogHeader>

        {previewHtml && (
          <div className="border rounded-xl bg-white p-4">
            <p className="text-xs text-muted-foreground mb-3 uppercase tracking-wide">Pré-visualização</p>
            <div className="rounded-lg border overflow-hidden" dangerouslySetInnerHTML={{ __html: previewHtml }} />
          </div>
        )}

        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 flex gap-2 text-xs text-blue-700">
          <Send className="w-4 h-4 shrink-0 mt-0.5" />
          <p>
            O aviso será gerado em PDF e enviado ao portal do funcionário como documento
            de assinatura digital (art. 135 CLT — antecedência mínima de 30 dias).
          </p>
        </div>

        <div className="flex justify-end gap-3 pt-1">
          <Button variant="outline" onClick={onClose} disabled={gerando}>Cancelar</Button>
          <Button onClick={handleGerar} disabled={gerando || !funcionario || !ferias} className="gap-2">
            {gerando ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            {gerando ? 'Gerando...' : 'Gerar e Enviar para Assinatura'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

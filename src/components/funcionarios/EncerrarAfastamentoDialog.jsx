import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { AlertTriangle, CheckCircle2, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { formatDate } from '@/lib/formatters';
import { getHojeISO } from '@/lib/afastamento';

/**
 * Modal de confirmação para encerrar um afastamento.
 * Exige justificativa quando o encerramento ocorre antes da data prevista.
 */
export default function EncerrarAfastamentoDialog({ afastamento, open, onClose, onConfirm }) {
  const [justificativa, setJustificativa] = useState('');
  const [saving, setSaving] = useState(false);

  const hoje = getHojeISO();
  const encerrandoAntesDoPrevisto = !afastamento?.data_fim || afastamento.data_fim > hoje;
  const precisaJustificativa = encerrandoAntesDoPrevisto;

  useEffect(() => {
    if (open) setJustificativa('');
  }, [open]);

  if (!afastamento) return null;

  const handleConfirm = async () => {
    if (precisaJustificativa && !justificativa.trim()) {
      toast.error('Informe a justificativa para o encerramento antecipado');
      return;
    }
    setSaving(true);
    try {
      await onConfirm(justificativa.trim());
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {encerrandoAntesDoPrevisto ? (
              <AlertTriangle className="w-5 h-5 text-amber-600" />
            ) : (
              <CheckCircle2 className="w-5 h-5 text-green-600" />
            )}
            Encerrar Afastamento
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="bg-muted/40 rounded-lg px-4 py-3 space-y-1 text-sm">
            <p>
              <span className="text-muted-foreground">Período:</span>{' '}
              <span className="font-medium">
                {afastamento.data_inicio ? formatDate(afastamento.data_inicio) : '—'} →{' '}
                {afastamento.data_fim ? formatDate(afastamento.data_fim) : 'em aberto'}
              </span>
            </p>
            {encerrandoAntesDoPrevisto && (
              <p className="text-amber-700 text-xs flex items-center gap-1.5">
                <AlertTriangle className="w-3.5 h-3.5" />
                Este afastamento será encerrado antes da data prevista (hoje: {formatDate(hoje)}).
              </p>
            )}
          </div>

          {precisaJustificativa ? (
            <div>
              <Label>Justificativa do encerramento antecipado *</Label>
              <Textarea
                value={justificativa}
                onChange={e => setJustificativa(e.target.value)}
                placeholder="Ex: Alta médica antecipada, retorno ao trabalho, decisão do RH..."
                rows={3}
                autoFocus
              />
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              Deseja realmente encerrar este afastamento? O registro será marcado como encerrado na data de hoje.
            </p>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" type="button" onClick={onClose} disabled={saving}>
            Cancelar
          </Button>
          <Button variant={encerrandoAntesDoPrevisto ? 'destructive' : 'default'} onClick={handleConfirm} disabled={saving}>
            {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            Confirmar Encerramento
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

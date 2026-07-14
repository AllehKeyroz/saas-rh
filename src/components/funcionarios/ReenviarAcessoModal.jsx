import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Copy, Check, ExternalLink, Send, Mail } from 'lucide-react';
import { toast } from 'sonner';

export default function ReenviarAcessoModal({ open, onClose, funcionario }) {
  const [copied, setCopied] = useState(false);

  if (!funcionario) return null;

  const registerUrl = `${window.location.origin}/register`;
  const email = funcionario.email || '—';

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(registerUrl);
      setCopied(true);
      toast.success('Link copiado!');
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error('Erro ao copiar. Selecione e copie manualmente.');
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Mail className="w-5 h-5 text-primary" />
            Reenviar Acesso
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <p className="text-sm">
            Convite gerado para <strong>{funcionario.nome}</strong>.
            Repasse as instruções abaixo para o funcionário criar o acesso dele.
          </p>

          <div className="bg-muted/50 rounded-lg p-4 space-y-3">
            <div>
              <Label className="text-xs text-muted-foreground">Email do funcionário</Label>
              <p className="text-sm font-medium">{email}</p>
            </div>

            <div>
              <Label className="text-xs text-muted-foreground">Link de cadastro</Label>
              <div className="flex gap-2 mt-1">
                <Input value={registerUrl} readOnly className="text-xs font-mono" />
                <Button size="icon" variant="outline" onClick={handleCopy} title="Copiar link">
                  {copied ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
                </Button>
              </div>
            </div>
          </div>

          <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-xs text-amber-800 space-y-1">
            <p className="font-semibold flex items-center gap-1">
              <ExternalLink className="w-3 h-3" /> Instruções para o funcionário:
            </p>
            <ol className="list-decimal list-inside space-y-0.5 text-amber-700">
              <li>Acesse o link acima</li>
              <li>Digite o email: <strong>{email}</strong></li>
              <li>Preencha seus dados e crie sua senha</li>
              <li>Pronto! Você terá acesso ao portal</li>
            </ol>
          </div>

          <p className="text-xs text-muted-foreground">
            Se o funcionário já tiver cadastro, o convite será ignorado e ele pode fazer login normalmente.
          </p>
        </div>

        <div className="flex justify-end">
          <Button onClick={onClose}>Fechar</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

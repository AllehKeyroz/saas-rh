import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Loader2, ShieldCheck } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';

const PERMISSOES = [
  { key: 'ver_funcao', label: 'Ver função/cargo' },
  { key: 'ver_setor', label: 'Ver setor' },
  { key: 'ver_data_admissao', label: 'Ver data de admissão' },
  { key: 'ver_salario', label: 'Ver salário base' },
  { key: 'ver_limite_vales', label: 'Ver limite de vales e barra de progresso' },
  { key: 'ver_extrato_vales', label: 'Ver extrato de vales do mês' },
  { key: 'ver_extrato_completo', label: 'Ver extrato financeiro completo' },
];

export default function PermissoesPortalDialog({ open, onClose, funcionario, onSaved }) {
  const [perm, setPerm] = useState(funcionario?.permissoes_portal || {});
  const [emailPortal, setEmailPortal] = useState(funcionario?.user_email_portal || funcionario?.email || '');
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  const toggle = (key) => setPerm(prev => ({ ...prev, [key]: !prev[key] }));

  const handleSave = async () => {
    setSaving(true);
    await base44.entities.Funcionarios.update(funcionario.id, {
      permissoes_portal: perm,
      user_email_portal: emailPortal.trim() || null,
    });
    toast({ title: 'Permissões salvas com sucesso!' });
    onSaved();
    onClose();
    setSaving(false);
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-primary" />
            Permissões do Portal — {funcionario?.nome}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-5">
          <div>
            <Label className="text-sm font-medium">E-mail do usuário no portal</Label>
            <p className="text-xs text-muted-foreground mb-1">
              Informe o e-mail com que este funcionário acessa o sistema (pode ser diferente do e-mail de notificações).
            </p>
            <Input
              type="email"
              value={emailPortal}
              onChange={e => setEmailPortal(e.target.value)}
              placeholder="funcionario@empresa.com"
            />
          </div>

          <div>
            <p className="text-sm font-medium mb-1">O que este funcionário pode visualizar no portal?</p>
            <p className="text-xs text-muted-foreground mb-3">
              Por padrão, nome, data de nascimento e e-mail são sempre visíveis.
            </p>
            <div className="space-y-3">
              {PERMISSOES.map(({ key, label }) => (
                <div key={key} className="flex items-center justify-between">
                  <Label className="text-sm font-normal cursor-pointer">{label}</Label>
                  <Switch checked={!!perm[key]} onCheckedChange={() => toggle(key)} />
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-3 pt-2">
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            Salvar Permissões
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
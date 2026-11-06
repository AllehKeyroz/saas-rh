import React, { useState } from 'react';
import { client } from '@/api/client';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Loader2, ShieldCheck } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { SECOES_PORTAL } from '@/lib/portalSecoes';

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
  // Seções LIBERADAS para o funcionário. Padrão: nenhuma (só a Visão Geral).
  const [visiveis, setVisiveis] = useState(
    Array.isArray(funcionario?.permissoes_portal?.secoes_visiveis)
      ? funcionario.permissoes_portal.secoes_visiveis
      : []
  );
  const [emailPortal, setEmailPortal] = useState(funcionario?.user_email_portal || funcionario?.email || '');
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  const toggle = (key) => setPerm(prev => ({ ...prev, [key]: !prev[key] }));
  const toggleSecao = (id) => setVisiveis(prev =>
    prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
  );
  const secoesMarcaveis = SECOES_PORTAL.filter(s => !s.sempre);

  const handleSave = async () => {
    setSaving(true);
    await client.entities.Funcionarios.update(funcionario.id, {
      permissoes_portal: { ...perm, secoes_visiveis: visiveis },
      user_email_portal: emailPortal.toLowerCase().trim() || null,
    });
    toast({ title: 'Permissões salvas com sucesso!' });
    onSaved();
    onClose();
    setSaving(false);
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
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
              onChange={e => setEmailPortal(e.target.value.toLowerCase())}
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

          <div>
            <div className="flex items-start justify-between gap-3 mb-1">
              <p className="text-sm font-medium">Seções do menu</p>
              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => setVisiveis(secoesMarcaveis.map(s => s.id))}
                  className="text-xs text-primary hover:underline"
                >
                  Marcar todas
                </button>
                <span className="text-muted-foreground/40">|</span>
                <button
                  type="button"
                  onClick={() => setVisiveis([])}
                  className="text-xs text-muted-foreground hover:underline"
                >
                  Limpar
                </button>
              </div>
            </div>
            <p className="text-xs text-muted-foreground mb-3">
              Marque o que este funcionário pode ver. Por padrão <strong>nada aparece</strong> além da
              Visão Geral — a seção só é liberada depois que o RH marcar aqui.
            </p>
            <div className="space-y-3">
              {SECOES_PORTAL.map(({ id, label, sempre }) => (
                <div key={id} className="flex items-center justify-between">
                  <Label className={`text-sm font-normal ${sempre ? 'text-muted-foreground' : 'cursor-pointer'}`}>
                    {label}
                  </Label>
                  <Switch
                    checked={sempre || visiveis.includes(id)}
                    disabled={sempre}
                    onCheckedChange={() => !sempre && toggleSecao(id)}
                  />
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
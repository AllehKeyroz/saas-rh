import React, { useState, useEffect } from 'react';
import { client } from '@/api/client';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Loader2 } from 'lucide-react';

const CORES_PRESET = ['#3b82f6','#10b981','#f59e0b','#ef4444','#8b5cf6','#06b6d4','#f97316','#6b7280'];

const FINALIDADES_EXEMPLO = [
  'Contrato de Trabalho', 'Advertência', 'Aviso de Férias', 'Atestado',
  'Termos Gerais', 'Aditivo Contratual', 'Rescisão', 'Declaração'
];

export default function FinalidadeForm({ open, onClose, finalidade, onSaved }) {
  const [form, setForm] = useState({
    nome: '', descricao: '', pasta_padrao: '', exige_assinatura: false, ativo: true, cor: '#3b82f6'
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (finalidade) {
      setForm({
        nome: finalidade.nome || '',
        descricao: finalidade.descricao || '',
        pasta_padrao: finalidade.pasta_padrao || '',
        exige_assinatura: finalidade.exige_assinatura || false,
        ativo: finalidade.ativo !== false,
        cor: finalidade.cor || '#3b82f6',
      });
    } else {
      setForm({ nome: '', descricao: '', pasta_padrao: '', exige_assinatura: false, ativo: true, cor: '#3b82f6' });
    }
  }, [finalidade, open]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    if (finalidade?.id) {
      await client.entities.FinalidadeDocumento.update(finalidade.id, form);
    } else {
      await client.entities.FinalidadeDocumento.create(form);
    }
    setSaving(false);
    onSaved();
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{finalidade?.id ? 'Editar Finalidade' : 'Nova Finalidade'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1">
            <Label>Nome *</Label>
            <Input
              value={form.nome}
              onChange={e => setForm(p => ({ ...p, nome: e.target.value }))}
              placeholder="Ex: Contrato de Trabalho"
              required
              list="finalidades-sugestoes"
            />
            <datalist id="finalidades-sugestoes">
              {FINALIDADES_EXEMPLO.map(s => <option key={s} value={s} />)}
            </datalist>
          </div>
          <div className="space-y-1">
            <Label>Descrição (opcional)</Label>
            <Input value={form.descricao} onChange={e => setForm(p => ({ ...p, descricao: e.target.value }))} placeholder="Descrição breve" />
          </div>
          <div className="space-y-1">
            <Label>Pasta de Destino</Label>
            <Input value={form.pasta_padrao} onChange={e => setForm(p => ({ ...p, pasta_padrao: e.target.value }))} placeholder="Ex: Contratos, Advertências..." />
            <p className="text-xs text-muted-foreground">Documentos assinados serão salvos nesta pasta no perfil 360° do funcionário</p>
          </div>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">Exige Assinatura GovBR</p>
              <p className="text-xs text-muted-foreground">Documentos desta finalidade serão enviados para assinatura</p>
            </div>
            <Switch checked={form.exige_assinatura} onCheckedChange={v => setForm(p => ({ ...p, exige_assinatura: v }))} />
          </div>
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium">Ativa</p>
            <Switch checked={form.ativo} onCheckedChange={v => setForm(p => ({ ...p, ativo: v }))} />
          </div>
          <div className="space-y-2">
            <Label>Cor de Identificação</Label>
            <div className="flex gap-2 flex-wrap">
              {CORES_PRESET.map(c => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setForm(p => ({ ...p, cor: c }))}
                  className={`w-7 h-7 rounded-full border-2 transition-all ${form.cor === c ? 'border-foreground scale-110' : 'border-transparent'}`}
                  style={{ backgroundColor: c }}
                />
              ))}
            </div>
          </div>
          <div className="flex justify-end gap-3 pt-1">
            <Button type="button" variant="outline" onClick={onClose} disabled={saving}>Cancelar</Button>
            <Button type="submit" disabled={saving}>
              {saving && <Loader2 className="w-4 h-4 animate-spin mr-1" />}
              {finalidade?.id ? 'Salvar' : 'Criar'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
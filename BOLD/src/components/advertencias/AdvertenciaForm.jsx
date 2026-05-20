import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { Wand2 } from 'lucide-react';

const TIPO_LABELS = { advertencia: 'Advertência', suspensao: 'Suspensão', ocorrencia: 'Ocorrência' };

export default function AdvertenciaForm({ open, onClose, funcionarios = [], advertencia, onSaved }) {
  const [form, setForm] = useState(advertencia || {
    funcionario_id: '',
    tipo: 'advertencia',
    descricao: '',
    data_advertencia: new Date().toISOString().split('T')[0]
  });
  const [saving, setSaving] = useState(false);

  const { data: modelos = [] } = useQuery({
    queryKey: ['modelosAdvertencia'],
    queryFn: () => base44.entities.ModeloAdvertencia.list(),
  });

  const modelosAtivos = modelos.filter(m => m.ativo !== false);

  const handleAplicarModelo = (modeloId) => {
    const m = modelos.find(m => m.id === modeloId);
    if (!m) return;
    setForm(f => ({ ...f, tipo: m.tipo, descricao: m.descricao }));
  };

  const handleSave = async () => {
    if (!form.funcionario_id) {
      toast.error('Selecione um funcionário');
      return;
    }
    if (!form.descricao.trim()) {
      toast.error('Informe a descrição');
      return;
    }

    setSaving(true);
    try {
      if (advertencia?.id) {
        await base44.entities.Advertencias.update(advertencia.id, form);
      } else {
        await base44.entities.Advertencias.create(form);
      }
      toast.success('Advertência salva!');
      onSaved();
    } catch (e) {
      toast.error(`Erro: ${e.message}`);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{advertencia ? 'Editar Advertência' : 'Nova Advertência'}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          {modelosAtivos.length > 0 && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 space-y-2">
              <div className="flex items-center gap-2">
                <Wand2 className="w-4 h-4 text-blue-600" />
                <Label className="text-sm font-medium text-blue-800">Usar modelo pré-configurado</Label>
              </div>
              <Select onValueChange={handleAplicarModelo}>
                <SelectTrigger className="bg-white">
                  <SelectValue placeholder="Selecione um modelo para preencher automaticamente..." />
                </SelectTrigger>
                <SelectContent>
                  {modelosAtivos.map(m => (
                    <SelectItem key={m.id} value={m.id}>
                      <span className="flex items-center gap-2">
                        {m.titulo}
                        <Badge variant="outline" className="text-xs">{TIPO_LABELS[m.tipo]}</Badge>
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-blue-600">Ao selecionar um modelo, tipo e descrição serão preenchidos automaticamente.</p>
            </div>
          )}

          <div>
            <Label className="text-sm">Funcionário</Label>
            <Select value={form.funcionario_id} onValueChange={v => setForm(f => ({ ...f, funcionario_id: v }))}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione..." />
              </SelectTrigger>
              <SelectContent>
                {funcionarios.filter(f => f.ativo !== false).map(f => (
                  <SelectItem key={f.id} value={f.id}>{f.nome}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-sm">Tipo</Label>
            <Select value={form.tipo} onValueChange={v => setForm(f => ({ ...f, tipo: v }))}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="advertencia">Advertência</SelectItem>
                <SelectItem value="suspensao">Suspensão</SelectItem>
                <SelectItem value="ocorrencia">Ocorrência</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-sm">Data</Label>
            <Input
              type="date"
              value={form.data_advertencia}
              onChange={e => setForm(f => ({ ...f, data_advertencia: e.target.value }))}
            />
          </div>
          <div>
            <Label className="text-sm">Descrição</Label>
            <Textarea
              placeholder="Motivo da advertência..."
              value={form.descricao}
              onChange={e => setForm(f => ({ ...f, descricao: e.target.value }))}
              className="min-h-24"
            />
          </div>
          <div className="flex gap-2 justify-end">
            <Button variant="outline" onClick={onClose}>Cancelar</Button>
            <Button onClick={handleSave} disabled={saving}>{saving ? 'Salvando...' : 'Salvar'}</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
import React, { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { client } from '@/api/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Switch } from '@/components/ui/switch';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Plus, Pencil, Trash2, Loader2, FileWarning } from 'lucide-react';

const TIPO_LABELS = {
  advertencia: { label: 'Advertência', color: 'bg-yellow-100 text-yellow-800' },
  suspensao: { label: 'Suspensão', color: 'bg-red-100 text-red-800' },
  ocorrencia: { label: 'Ocorrência', color: 'bg-blue-100 text-blue-800' },
};

function ModeloForm({ open, onClose, modelo, onSaved }) {
  const [form, setForm] = useState(modelo || { titulo: '', tipo: 'advertencia', descricao: '', ativo: true });
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    if (modelo?.id) {
      await client.entities.ModeloAdvertencia.update(modelo.id, form);
    } else {
      await client.entities.ModeloAdvertencia.create(form);
    }
    setSaving(false);
    onSaved();
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{modelo?.id ? 'Editar Modelo' : 'Novo Modelo'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label>Título *</Label>
            <Input
              value={form.titulo}
              onChange={e => setForm(p => ({ ...p, titulo: e.target.value }))}
              placeholder="Ex: Atraso Injustificado"
              required
            />
          </div>
          <div>
            <Label>Tipo *</Label>
            <Select value={form.tipo} onValueChange={v => setForm(p => ({ ...p, tipo: v }))}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="advertencia">Advertência</SelectItem>
                <SelectItem value="suspensao">Suspensão</SelectItem>
                <SelectItem value="ocorrencia">Ocorrência</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Texto do Formulário *</Label>
            <Textarea
              value={form.descricao}
              onChange={e => setForm(p => ({ ...p, descricao: e.target.value }))}
              placeholder="Texto padrão que será preenchido automaticamente ao usar este modelo..."
              className="min-h-28"
              required
            />
          </div>
          <div className="flex items-center gap-3">
            <Switch checked={form.ativo !== false} onCheckedChange={v => setForm(p => ({ ...p, ativo: v }))} />
            <Label>Modelo ativo</Label>
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="outline" onClick={onClose}>Cancelar</Button>
            <Button type="submit" disabled={saving}>
              {saving && <Loader2 className="w-4 h-4 animate-spin" />}
              {modelo?.id ? 'Salvar' : 'Criar'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export default function ModelosAdvertenciaTab() {
  const queryClient = useQueryClient();
  const [modeloForm, setModeloForm] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);

  const { data: modelos = [], isLoading } = useQuery({
    queryKey: ['modelosAdvertencia'],
    queryFn: () => client.entities.ModeloAdvertencia.list(),
  });

  const handleDelete = async () => {
    if (!deleteTarget) return;
    await client.entities.ModeloAdvertencia.delete(deleteTarget);
    queryClient.invalidateQueries({ queryKey: ['modelosAdvertencia'] });
    setDeleteTarget(null);
  };

  return (
    <div className="space-y-3">
      <div className="flex justify-between items-center">
        <p className="text-sm text-muted-foreground">{modelos.length} modelo(s) cadastrado(s)</p>
        <Button size="sm" onClick={() => setModeloForm({})}>
          <Plus className="w-4 h-4" /> Novo Modelo
        </Button>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>
      ) : modelos.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <FileWarning className="w-10 h-10 mx-auto mb-2 opacity-30" />
          <p>Nenhum modelo cadastrado</p>
          <p className="text-xs mt-1">Crie modelos para agilizar o preenchimento de advertências</p>
        </div>
      ) : (
        <div className="divide-y border rounded-lg overflow-hidden bg-card">
          {modelos.map(m => {
            const tipo = TIPO_LABELS[m.tipo] || TIPO_LABELS.advertencia;
            return (
              <div key={m.id} className="px-4 py-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-medium text-sm">{m.titulo}</p>
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${tipo.color}`}>{tipo.label}</span>
                      {m.ativo === false && <Badge variant="secondary" className="text-xs">Inativo</Badge>}
                    </div>
                    {m.descricao && (
                      <p className="text-xs text-muted-foreground mt-1 truncate">{m.descricao}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => setModeloForm(m)}>
                      <Pencil className="w-3.5 h-3.5" />
                    </Button>
                    <Button size="icon" variant="ghost" className="h-8 w-8 text-destructive hover:text-destructive" onClick={() => setDeleteTarget(m.id)}>
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir este modelo?</AlertDialogTitle>
            <AlertDialogDescription>Esta ação não pode ser desfeita.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setDeleteTarget(null)}>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete}>Excluir</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {modeloForm !== null && (
        <ModeloForm
          open
          modelo={modeloForm?.id ? modeloForm : null}
          onClose={() => setModeloForm(null)}
          onSaved={() => {
            queryClient.invalidateQueries({ queryKey: ['modelosAdvertencia'] });
            setModeloForm(null);
          }}
        />
      )}
    </div>
  );
}
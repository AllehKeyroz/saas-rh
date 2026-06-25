import React, { useState, useEffect } from 'react';
import { client } from '@/api/client';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Plus, Pencil, Trash2, Loader2, Tag, Power } from 'lucide-react';
import { TIPO_LABELS, TIPO_COLORS } from '@/lib/formatters';
import { toast } from 'sonner';

const CORES_PRESET = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#f97316', '#6b7280'];

const HARDCODED_KEYS = Object.keys(TIPO_LABELS);

function TipoLancamentoFormDialog({ open, onClose, tipo, onSaved }) {
  const [form, setForm] = useState({ nome: '', categoria: 'desconto', descricao: '', ativo: true, cor: '#3b82f6' });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (tipo) {
      setForm({
        nome: tipo.nome || '',
        categoria: tipo.categoria || 'desconto',
        descricao: tipo.descricao || '',
        ativo: tipo.ativo !== false,
        cor: tipo.cor || '#3b82f6',
      });
    } else {
      setForm({ nome: '', categoria: 'desconto', descricao: '', ativo: true, cor: '#3b82f6' });
    }
  }, [tipo, open]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (HARDCODED_KEYS.includes(form.nome)) {
      toast.error(`"${form.nome}" é um tipo interno e não pode ser recriado. Escolha outro nome.`);
      return;
    }
    setSaving(true);
    if (tipo?.id) {
      await client.entities.TipoLancamento.update(tipo.id, form);
    } else {
      await client.entities.TipoLancamento.create(form);
    }
    setSaving(false);
    onSaved();
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>{tipo?.id ? 'Editar Tipo de Lançamento' : 'Novo Tipo de Lançamento'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label>Nome *</Label>
            <Input value={form.nome} onChange={e => setForm(p => ({ ...p, nome: e.target.value }))} placeholder="Ex: Vale Transporte" required />
          </div>
          <div>
            <Label>Categoria *</Label>
            <Select value={form.categoria} onValueChange={v => setForm(p => ({ ...p, categoria: v }))}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="desconto">Desconto</SelectItem>
                <SelectItem value="adicional">Adicional</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Descrição</Label>
            <Input value={form.descricao || ''} onChange={e => setForm(p => ({ ...p, descricao: e.target.value }))} placeholder="Descrição opcional" />
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
          <div className="flex items-center gap-3">
            <Switch checked={form.ativo} onCheckedChange={v => setForm(p => ({ ...p, ativo: v }))} />
            <Label>Ativo</Label>
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="outline" onClick={onClose} disabled={saving}>Cancelar</Button>
            <Button type="submit" disabled={saving}>
              {saving && <Loader2 className="w-4 h-4 animate-spin" />}
              {tipo?.id ? 'Salvar' : 'Criar'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export default function GerenciarTiposLancamento({ open, onClose }) {
  const [tipos, setTipos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [formOpen, setFormOpen] = useState(false);
  const [editando, setEditando] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);

  const carregar = async () => {
    setLoading(true);
    const data = await client.entities.TipoLancamento.list();
    setTipos(data);
    setLoading(false);
  };

  useEffect(() => {
    if (open) carregar();
  }, [open]);

  const handleToggle = async (t) => {
    await client.entities.TipoLancamento.update(t.id, { ativo: !t.ativo });
    await carregar();
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    await client.entities.TipoLancamento.delete(deleteTarget.id);
    toast.success('Tipo excluído');
    setDeleteTarget(null);
    await carregar();
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onClose}>
        <DialogContent className="max-w-xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Tag className="w-5 h-5 text-primary" />
              Gerenciar Tipos de Lançamento
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">{tipos.length} tipo(s) personalizado(s)</p>
              <Button size="sm" onClick={() => { setEditando(null); setFormOpen(true); }} className="gap-2">
                <Plus className="w-4 h-4" />Novo Tipo
              </Button>
            </div>

            {loading ? (
              <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>
            ) : tipos.length === 0 ? (
              <div className="text-center py-16 text-muted-foreground border-2 border-dashed border-border rounded-xl">
                <Tag className="w-10 h-10 mx-auto mb-2 opacity-30" />
                <p className="font-medium">Nenhum tipo personalizado</p>
                <p className="text-xs mt-1">Crie tipos como "Vale Transporte", "Plano de Saúde", etc.</p>
              </div>
            ) : (
              <div className="divide-y border border-border rounded-xl overflow-hidden bg-card">
                {tipos.map(t => {
                  const corStyle = t.cor ? { backgroundColor: t.cor + '20', color: t.cor } : {};
                  return (
                    <div key={t.id} className="flex items-center justify-between px-4 py-3 hover:bg-muted/30 transition-colors">
                      <div className="flex items-center gap-3">
                        {t.cor && <div className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: t.cor }} />}
                        <div>
                          <p className="font-medium text-sm">{t.nome}</p>
                          <Badge variant="outline" className="text-xs">{t.categoria === 'desconto' ? 'Desconto' : 'Adicional'}</Badge>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant={t.ativo !== false ? 'default' : 'secondary'} className="text-xs">
                          {t.ativo !== false ? 'Ativo' : 'Inativo'}
                        </Badge>
                        <Button size="icon" variant="ghost" className={`h-8 w-8 ${t.ativo !== false ? 'text-yellow-600' : 'text-green-600'}`}
                          onClick={() => handleToggle(t)} title={t.ativo !== false ? 'Desativar' : 'Ativar'}>
                          <Power className="w-3.5 h-3.5" />
                        </Button>
                        <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => { setEditando(t); setFormOpen(true); }}>
                          <Pencil className="w-3.5 h-3.5" />
                        </Button>
                        <Button size="icon" variant="ghost" className="h-8 w-8 text-destructive hover:text-destructive" onClick={() => setDeleteTarget(t)}>
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir tipo?</AlertDialogTitle>
            <AlertDialogDescription>
              Excluir "{deleteTarget?.nome}"? Lançamentos existentes com este tipo não serão afetados.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setDeleteTarget(null)}>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete}>Excluir</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {formOpen && (
        <TipoLancamentoFormDialog
          open={formOpen}
          onClose={() => setFormOpen(false)}
          tipo={editando}
          onSaved={carregar}
        />
      )}
    </>
  );
}

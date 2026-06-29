import React, { useState, useEffect } from 'react';
import { client } from '@/api/client';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Plus, Pencil, Trash2, Loader2, Tag, Power, Eye, EyeOff, Palette } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { TIPO_LABELS, TIPO_COLORS, TIPOS_DESCONTO_DEFAULT, TIPOS_ADICIONAL_DEFAULT } from '@/lib/formatters';
import { toast } from 'sonner';

const CORES_PRESET = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#f97316', '#6b7280'];

const HARDCODED_KEYS = Object.keys(TIPO_LABELS);
const ALL_DEFAULT_TIPOS = [...TIPOS_DESCONTO_DEFAULT, ...TIPOS_ADICIONAL_DEFAULT];

function TipoLancamentoFormDialog({ open, onClose, tipo, onSaved }) {
  const [form, setForm] = useState({ nome: '', categoria: 'desconto', descricao: '', ativo: true, mostrar_coluna: true, cor: '#3b82f6' });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (tipo) {
      setForm({
        nome: tipo.nome || '',
        categoria: tipo.categoria || 'desconto',
        descricao: tipo.descricao || '',
        ativo: tipo.ativo !== false,
        mostrar_coluna: tipo.mostrar_coluna !== false,
        cor: tipo.cor || '#3b82f6',
      });
    } else {
      setForm({ nome: '', categoria: 'desconto', descricao: '', ativo: true, mostrar_coluna: true, cor: '#3b82f6' });
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
          <div className="flex items-center gap-3">
            <Checkbox id="mostrar-coluna-form" checked={form.mostrar_coluna} onCheckedChange={v => setForm(p => ({ ...p, mostrar_coluna: !!v }))} />
            <Label htmlFor="mostrar-coluna-form" className="cursor-pointer">Mostrar coluna no Fechamento</Label>
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
  const [configColunas, setConfigColunas] = useState({});
  const [loading, setLoading] = useState(true);
  const [formOpen, setFormOpen] = useState(false);
  const [editando, setEditando] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [savingCol, setSavingCol] = useState(false);

  const carregar = async () => {
    setLoading(true);
    const [data, configs] = await Promise.all([
      client.entities.TipoLancamento.list(),
      client.entities.ConfiguracoesRH.list(),
    ]);
    setTipos(data);
    const cfgDoc = configs.find(c => c.chave === 'colunas_fechamento');
    setConfigColunas(cfgDoc?.valor || {});
    setLoading(false);
  };

  useEffect(() => {
    if (open) carregar();
  }, [open]);

  const getVal = (tipo) => {
    const v = configColunas[tipo];
    if (v === true || v === false) return { visivel: v !== false, cor: null };
    return { visivel: v?.visivel !== false, cor: v?.cor || null };
  };

  const toggleColunaDefault = async (tipo) => {
    setSavingCol(true);
    const atual = getVal(tipo);
    const novaConf = { ...configColunas, [tipo]: { visivel: !atual.visivel, cor: atual.cor } };
    setConfigColunas(novaConf);
    const cfgDoc = await client.entities.ConfiguracoesRH.list().then(list => list.find(c => c.chave === 'colunas_fechamento'));
    if (cfgDoc) {
      await client.entities.ConfiguracoesRH.update(cfgDoc.id, { valor: novaConf });
    } else {
      await client.entities.ConfiguracoesRH.create({ chave: 'colunas_fechamento', valor: novaConf, ativa: true });
    }
    setSavingCol(false);
  };

  const mudarCorDefault = async (tipo, cor) => {
    setSavingCol(true);
    const atual = getVal(tipo);
    const novaConf = { ...configColunas, [tipo]: { visivel: atual.visivel, cor } };
    setConfigColunas(novaConf);
    const cfgDoc = await client.entities.ConfiguracoesRH.list().then(list => list.find(c => c.chave === 'colunas_fechamento'));
    if (cfgDoc) {
      await client.entities.ConfiguracoesRH.update(cfgDoc.id, { valor: novaConf });
    } else {
      await client.entities.ConfiguracoesRH.create({ chave: 'colunas_fechamento', valor: novaConf, ativa: true });
    }
    setSavingCol(false);
  };

  const toggleColunaCustom = async (t) => {
    await client.entities.TipoLancamento.update(t.id, { mostrar_coluna: t.mostrar_coluna === false ? true : false });
    await carregar();
  };

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

  const categoriaLabel = (nome) => {
    if (TIPOS_DESCONTO_DEFAULT.includes(nome)) return 'Desconto';
    if (TIPOS_ADICIONAL_DEFAULT.includes(nome)) return 'Adicional';
    return '';
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onClose}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Tag className="w-5 h-5 text-primary" />
              Gerenciar Tipos de Lançamento
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-6">
            {/* Tipos Padrão do Sistema */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <p className="text-sm font-semibold text-muted-foreground">TIPOS PADRÃO DO SISTEMA</p>
              </div>
              {loading ? (
                <div className="flex justify-center py-8"><Loader2 className="w-5 h-5 animate-spin text-muted-foreground" /></div>
              ) : (
                <div className="divide-y border border-border rounded-xl overflow-hidden bg-card">
                  {ALL_DEFAULT_TIPOS.map(tipo => {
                    const val = getVal(tipo);
                    const isDesc = TIPOS_DESCONTO_DEFAULT.includes(tipo);
                    return (
                      <div key={tipo} className="flex items-center justify-between px-4 py-2.5 hover:bg-muted/30 transition-colors">
                        <div className="flex items-center gap-3">
                          <Checkbox
                            id={`col-${tipo}`}
                            checked={val.visivel}
                            onCheckedChange={() => toggleColunaDefault(tipo)}
                            disabled={savingCol}
                          />
                          <label htmlFor={`col-${tipo}`} className="flex items-center gap-2 cursor-pointer text-sm">
                            {val.visivel ? <Eye className="w-3.5 h-3.5 text-primary" /> : <EyeOff className="w-3.5 h-3.5 text-muted-foreground" />}
                            <span>{TIPO_LABELS[tipo] || tipo}</span>
                            <Badge variant="outline" className="text-xs ml-1">{isDesc ? 'Desconto' : 'Adicional'}</Badge>
                          </label>
                        </div>
                        <div className="flex items-center gap-1">
                          <Popover>
                            <PopoverTrigger asChild>
                              <Button size="icon" variant="ghost" className="h-7 w-7" title="Escolher cor da coluna">
                                {val.cor ? (
                                  <div className="w-4 h-4 rounded-full border" style={{ backgroundColor: val.cor }} />
                                ) : (
                                  <Palette className="w-3.5 h-3.5 text-muted-foreground" />
                                )}
                              </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-48 p-3" align="end">
                              <p className="text-xs font-medium text-muted-foreground mb-2">Cor da coluna</p>
                              <div className="flex gap-2 flex-wrap">
                                {CORES_PRESET.map(c => (
                                  <button
                                    key={c}
                                    type="button"
                                    onClick={() => {
                                      mudarCorDefault(tipo, val.cor === c ? null : c);
                                      // close popover via click on trigger
                                      document.getElementById(`col-${tipo}`)?.focus();
                                    }}
                                    className={`w-6 h-6 rounded-full border-2 transition-all ${val.cor === c ? 'border-foreground scale-110' : 'border-transparent hover:scale-110'}`}
                                    style={{ backgroundColor: c }}
                                  />
                                ))}
                              </div>
                              {val.cor && (
                                <Button size="sm" variant="ghost" className="text-xs mt-2 w-full" onClick={() => mudarCorDefault(tipo, null)}>
                                  Remover cor
                                </Button>
                              )}
                            </PopoverContent>
                          </Popover>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Tipos Personalizados */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <p className="text-sm font-semibold text-muted-foreground">TIPOS PERSONALIZADOS</p>
                <Button size="sm" onClick={() => { setEditando(null); setFormOpen(true); }} className="gap-2">
                  <Plus className="w-4 h-4" />Novo Tipo
                </Button>
              </div>
              {loading ? (
                <div className="flex justify-center py-8"><Loader2 className="w-5 h-5 animate-spin text-muted-foreground" /></div>
              ) : tipos.length === 0 ? (
                <div className="text-center py-10 text-muted-foreground border-2 border-dashed border-border rounded-xl">
                  <Tag className="w-8 h-8 mx-auto mb-2 opacity-30" />
                  <p className="text-sm">Nenhum tipo personalizado criado</p>
                  <p className="text-xs mt-1">Clique em "Novo Tipo" para criar, ex: "Vale Transporte", "Plano de Saúde"</p>
                </div>
              ) : (
                <div className="divide-y border border-border rounded-xl overflow-hidden bg-card">
                  {tipos.map(t => {
                    const visivel = t.mostrar_coluna !== false;
                    return (
                      <div key={t.id} className="flex items-center justify-between px-4 py-2.5 hover:bg-muted/30 transition-colors">
                        <div className="flex items-center gap-3 flex-1 min-w-0">
                          <Checkbox
                            id={`col-custom-${t.id}`}
                            checked={visivel}
                            onCheckedChange={() => toggleColunaCustom(t)}
                          />
                          <label htmlFor={`col-custom-${t.id}`} className="flex items-center gap-2 cursor-pointer text-sm min-w-0">
                            {t.cor && <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: t.cor }} />}
                            {visivel ? <Eye className="w-3.5 h-3.5 text-primary shrink-0" /> : <EyeOff className="w-3.5 h-3.5 text-muted-foreground shrink-0" />}
                            <span className="truncate">{t.nome}</span>
                            <Badge variant="outline" className="text-xs shrink-0">{t.categoria === 'desconto' ? 'Desconto' : 'Adicional'}</Badge>
                          </label>
                        </div>
                        <div className="flex items-center gap-1 shrink-0">
                          <Button size="icon" variant="ghost" className={`h-7 w-7 ${t.ativo !== false ? 'text-yellow-600' : 'text-green-600'}`}
                            onClick={() => handleToggle(t)} title={t.ativo !== false ? 'Desativar' : 'Ativar'}>
                            <Power className="w-3 h-3" />
                          </Button>
                          <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => { setEditando(t); setFormOpen(true); }}>
                            <Pencil className="w-3 h-3" />
                          </Button>
                          <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive hover:text-destructive" onClick={() => setDeleteTarget(t)}>
                            <Trash2 className="w-3 h-3" />
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
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

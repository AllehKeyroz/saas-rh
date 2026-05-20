import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useSearchParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Pencil, Plus, Trash2, Loader2, Building2, Tags, HardDrive, Bell, Palette, Power, FileWarning, Briefcase, PenLine, LayoutTemplate } from 'lucide-react';
import BackupsTab from '@/components/configuracoes/BackupsTab';
import NotificacoesTab from '@/components/configuracoes/NotificacoesTab';
import AparenciaTab from '@/components/configuracoes/AparenciaTab';
import AssinaturaGovBRTab from '@/components/configuracoes/AssinaturaGovBRTab';
import ModelosAdvertenciaTab from '@/components/configuracoes/ModelosAdvertenciaTab';
import ModelosDocumentosTab from '@/components/configuracoes/ModelosDocumentosTab';
import LimiteValesTab from '@/components/configuracoes/LimiteValesTab';
import { Switch } from '@/components/ui/switch';

// ─── Setor Form ───────────────────────────────────────────────────────────────
function SetorForm({ open, onClose, setor, onSaved }) {
  const [form, setForm] = useState(setor || { nome: '', descricao: '', ativo: true });
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    if (setor) {
      await base44.entities.Setor.update(setor.id, form);
    } else {
      await base44.entities.Setor.create(form);
    }
    setSaving(false);
    onSaved();
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>{setor ? 'Editar Setor' : 'Novo Setor'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label>Nome *</Label>
            <Input value={form.nome} onChange={e => setForm(p => ({ ...p, nome: e.target.value }))} placeholder="Ex: Produção" required />
          </div>
          <div>
            <Label>Descrição</Label>
            <Input value={form.descricao || ''} onChange={e => setForm(p => ({ ...p, descricao: e.target.value }))} placeholder="Descrição opcional" />
          </div>
          <div className="flex items-center gap-3">
            <Switch checked={form.ativo !== false} onCheckedChange={v => setForm(p => ({ ...p, ativo: v }))} />
            <Label>Setor ativo</Label>
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="outline" onClick={onClose}>Cancelar</Button>
            <Button type="submit" disabled={saving}>
              {saving && <Loader2 className="w-4 h-4 animate-spin" />}
              {setor ? 'Salvar' : 'Criar'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ─── TipoLancamento Form ───────────────────────────────────────────────────────
function TipoLancamentoForm({ open, onClose, tipo, onSaved }) {
  const [form, setForm] = useState(tipo || { nome: '', categoria: 'desconto', descricao: '', ativo: true });
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    if (tipo) {
      await base44.entities.TipoLancamento.update(tipo.id, form);
    } else {
      await base44.entities.TipoLancamento.create(form);
    }
    setSaving(false);
    onSaved();
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>{tipo ? 'Editar Tipo de Lançamento' : 'Novo Tipo de Lançamento'}</DialogTitle>
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
          <div className="flex items-center gap-3">
            <Switch checked={form.ativo !== false} onCheckedChange={v => setForm(p => ({ ...p, ativo: v }))} />
            <Label>Ativo</Label>
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="outline" onClick={onClose}>Cancelar</Button>
            <Button type="submit" disabled={saving}>
              {saving && <Loader2 className="w-4 h-4 animate-spin" />}
              {tipo ? 'Salvar' : 'Criar'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ─── Funcao Form ───────────────────────────────────────────────────────────────
function FuncaoForm({ open, onClose, funcao, onSaved }) {
  const [form, setForm] = useState(funcao || { nome: '', descricao: '', ativo: true });
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    if (funcao) {
      await base44.entities.Funcao.update(funcao.id, form);
    } else {
      await base44.entities.Funcao.create(form);
    }
    setSaving(false);
    onSaved();
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>{funcao ? 'Editar Função' : 'Nova Função'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label>Nome *</Label>
            <Input value={form.nome} onChange={e => setForm(p => ({ ...p, nome: e.target.value }))} placeholder="Ex: Garçom" required />
          </div>
          <div>
            <Label>Descrição</Label>
            <Input value={form.descricao || ''} onChange={e => setForm(p => ({ ...p, descricao: e.target.value }))} placeholder="Descrição opcional" />
          </div>
          <div className="flex items-center gap-3">
            <Switch checked={form.ativo !== false} onCheckedChange={v => setForm(p => ({ ...p, ativo: v }))} />
            <Label>Função ativa</Label>
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="outline" onClick={onClose}>Cancelar</Button>
            <Button type="submit" disabled={saving}>
              {saving && <Loader2 className="w-4 h-4 animate-spin" />}
              {funcao ? 'Salvar' : 'Criar'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ─── Main Page ─────────────────────────────────────────────────────────────────
const TAB_TITLES = {
  setores: 'Setores',
  funcoes: 'Funções',
  tipos: 'Tipos de Lançamento',
  aparencia: 'Aparência',
  notificacoes: 'Notificações',
  'modelos-advertencia': 'Modelos de Advertência',
  'modelos-documentos': 'Modelos de Documentos',
  govbr: 'Assinatura GovBR',
  backups: 'Backups',
  'limite-vales': 'Limite de Vales (40%)',
};

export default function Configuracoes() {
  const queryClient = useQueryClient();
  const [searchParams] = useSearchParams();
  const activeTab = searchParams.get('tab') || 'setores';
  const [setorForm, setSetorForm] = useState(null);
  const [tipoForm, setTipoForm] = useState(null);
  const [funcaoForm, setFuncaoForm] = useState(null);

  const { data: setores = [], isLoading: loadingSetores } = useQuery({
    queryKey: ['setores'],
    queryFn: () => base44.entities.Setor.list(),
  });

  const { data: tipos = [], isLoading: loadingTipos } = useQuery({
    queryKey: ['tiposLancamento'],
    queryFn: () => base44.entities.TipoLancamento.list(),
  });

  const { data: funcoes = [], isLoading: loadingFuncoes } = useQuery({
    queryKey: ['funcoes'],
    queryFn: () => base44.entities.Funcao.list(),
  });

  const handleDeleteFuncao = async (id) => {
    if (!confirm('Excluir esta função?')) return;
    await base44.entities.Funcao.delete(id);
    queryClient.invalidateQueries({ queryKey: ['funcoes'] });
  };

  const handleDeleteSetor = async (id) => {
    if (!confirm('Excluir este setor? Esta ação não pode ser desfeita.')) return;
    await base44.entities.Setor.delete(id);
    queryClient.invalidateQueries({ queryKey: ['setores'] });
  };

  const handleToggleSetor = async (setor) => {
    await base44.entities.Setor.update(setor.id, { ativo: !setor.ativo });
    queryClient.invalidateQueries({ queryKey: ['setores'] });
  };

  const handleDeleteTipo = async (id) => {
    if (!confirm('Excluir este tipo de lançamento?')) return;
    await base44.entities.TipoLancamento.delete(id);
    queryClient.invalidateQueries({ queryKey: ['tiposLancamento'] });
  };

  return (
    <div className="p-6 max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">{TAB_TITLES[activeTab] || 'Configurações'}</h1>
      </div>

      {/* ── SETORES ── */}
      {activeTab === 'setores' && (
        <div className="space-y-3">
          <div className="flex justify-between items-center">
            <p className="text-sm text-muted-foreground">{setores.length} setor(es) cadastrado(s)</p>
            <Button size="sm" onClick={() => setSetorForm({})}>
              <Plus className="w-4 h-4" /> Novo Setor
            </Button>
          </div>

          {loadingSetores ? (
            <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>
          ) : setores.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Building2 className="w-10 h-10 mx-auto mb-2 opacity-30" />
              <p>Nenhum setor cadastrado</p>
            </div>
          ) : (
            <div className="divide-y border rounded-lg overflow-hidden bg-card">
              {setores.map(s => (
                <div key={s.id} className="flex items-center justify-between px-4 py-3">
                  <div>
                    <p className="font-medium text-sm">{s.nome}</p>
                    {s.descricao && <p className="text-xs text-muted-foreground">{s.descricao}</p>}
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={s.ativo !== false ? 'default' : 'secondary'} className="text-xs">
                      {s.ativo !== false ? 'Ativo' : 'Inativo'}
                    </Badge>
                    <Button
                      size="icon" variant="ghost" className={`h-8 w-8 ${s.ativo !== false ? 'text-yellow-600 hover:text-yellow-700' : 'text-green-600 hover:text-green-700'}`}
                      title={s.ativo !== false ? 'Inativar' : 'Ativar'}
                      onClick={() => handleToggleSetor(s)}
                    >
                      <Power className="w-3.5 h-3.5" />
                    </Button>
                    <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => setSetorForm(s)}>
                      <Pencil className="w-3.5 h-3.5" />
                    </Button>
                    <Button size="icon" variant="ghost" className="h-8 w-8 text-destructive hover:text-destructive" onClick={() => handleDeleteSetor(s.id)}>
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── FUNÇÕES ── */}
      {activeTab === 'funcoes' && (
        <div className="space-y-3">
          <div className="flex justify-between items-center">
            <p className="text-sm text-muted-foreground">{funcoes.length} função(ões) cadastrada(s)</p>
            <Button size="sm" onClick={() => setFuncaoForm({})}>
              <Plus className="w-4 h-4" /> Nova Função
            </Button>
          </div>
          {loadingFuncoes ? (
            <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>
          ) : funcoes.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Briefcase className="w-10 h-10 mx-auto mb-2 opacity-30" />
              <p>Nenhuma função cadastrada</p>
            </div>
          ) : (
            <div className="divide-y border rounded-lg overflow-hidden bg-card">
              {funcoes.map(f => (
                <div key={f.id} className="flex items-center justify-between px-4 py-3">
                  <div>
                    <p className="font-medium text-sm">{f.nome}</p>
                    {f.descricao && <p className="text-xs text-muted-foreground">{f.descricao}</p>}
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={f.ativo !== false ? 'default' : 'secondary'} className="text-xs">
                      {f.ativo !== false ? 'Ativa' : 'Inativa'}
                    </Badge>
                    <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => setFuncaoForm(f)}>
                      <Pencil className="w-3.5 h-3.5" />
                    </Button>
                    <Button size="icon" variant="ghost" className="h-8 w-8 text-destructive hover:text-destructive" onClick={() => handleDeleteFuncao(f.id)}>
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── TIPOS DE LANÇAMENTO ── */}
      {activeTab === 'tipos' && (
        <div className="space-y-3">
          <div className="flex justify-between items-center">
            <p className="text-sm text-muted-foreground">{tipos.length} tipo(s) cadastrado(s)</p>
            <Button size="sm" onClick={() => setTipoForm({})}>
              <Plus className="w-4 h-4" /> Novo Tipo
            </Button>
          </div>
          {loadingTipos ? (
            <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>
          ) : tipos.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Tags className="w-10 h-10 mx-auto mb-2 opacity-30" />
              <p>Nenhum tipo de lançamento cadastrado</p>
            </div>
          ) : (
            <div className="divide-y border rounded-lg overflow-hidden bg-card">
              {tipos.map(t => (
                <div key={t.id} className="flex items-center justify-between px-4 py-3">
                  <div>
                    <p className="font-medium text-sm">{t.nome}</p>
                    {t.descricao && <p className="text-xs text-muted-foreground">{t.descricao}</p>}
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={t.categoria === 'adicional' ? 'default' : 'secondary'} className="text-xs">
                      {t.categoria === 'adicional' ? '+ Adicional' : '– Desconto'}
                    </Badge>
                    <Badge variant={t.ativo !== false ? 'outline' : 'secondary'} className="text-xs">
                      {t.ativo !== false ? 'Ativo' : 'Inativo'}
                    </Badge>
                    <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => setTipoForm(t)}>
                      <Pencil className="w-3.5 h-3.5" />
                    </Button>
                    <Button size="icon" variant="ghost" className="h-8 w-8 text-destructive hover:text-destructive" onClick={() => handleDeleteTipo(t.id)}>
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {activeTab === 'backups' && <BackupsTab />}
      {activeTab === 'notificacoes' && <NotificacoesTab />}
      {activeTab === 'aparencia' && <AparenciaTab />}
      {activeTab === 'modelos-advertencia' && <ModelosAdvertenciaTab />}
      {activeTab === 'modelos-documentos' && <ModelosDocumentosTab />}
      {activeTab === 'govbr' && <AssinaturaGovBRTab />}
      {activeTab === 'limite-vales' && <LimiteValesTab />}

      {/* Modais */}
      {setorForm !== null && (
        <SetorForm
          open
          setor={setorForm?.id ? setorForm : null}
          onClose={() => setSetorForm(null)}
          onSaved={() => queryClient.invalidateQueries({ queryKey: ['setores'] })}
        />
      )}
      {tipoForm !== null && (
        <TipoLancamentoForm
          open
          tipo={tipoForm?.id ? tipoForm : null}
          onClose={() => setTipoForm(null)}
          onSaved={() => queryClient.invalidateQueries({ queryKey: ['tiposLancamento'] })}
        />
      )}
      {funcaoForm !== null && (
        <FuncaoForm
          open
          funcao={funcaoForm?.id ? funcaoForm : null}
          onClose={() => setFuncaoForm(null)}
          onSaved={() => queryClient.invalidateQueries({ queryKey: ['funcoes'] })}
        />
      )}
    </div>
  );
}
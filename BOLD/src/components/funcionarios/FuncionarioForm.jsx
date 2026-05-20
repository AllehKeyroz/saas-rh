import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { registrarAuditoria } from '@/lib/audit';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Upload, Loader2 } from 'lucide-react';

export default function FuncionarioForm({ open, onClose, funcionario, onSaved }) {
  const isEdit = !!funcionario;
  const [form, setForm] = useState(funcionario || {
    nome: '', email: '', telefone: '', funcao: '', setor: '', data_admissao: '', data_demissao: '', data_nascimento: '', salario_base: '', limite_vales: '', ativo: true, foto: '', apto_comissao: false, data_inicio_comissao: ''
  });
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  const { data: setores = [] } = useQuery({
    queryKey: ['setores'],
    queryFn: () => base44.entities.Setor.list(),
  });

  const { data: funcoes = [] } = useQuery({
    queryKey: ['funcoes'],
    queryFn: () => base44.entities.Funcao.list(),
  });

  // Verifica se comissão está ativa pela data programada
  const hoje = new Date().toISOString().split('T')[0];
  const comissaoAtivaByData = form.data_inicio_comissao && form.data_inicio_comissao <= hoje;

  const handleChange = (field, value) => setForm(prev => ({ ...prev, [field]: value }));

  const handlePhoto = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    const { file_url } = await base44.integrations.Core.UploadFile({ file });
    handleChange('foto', file_url);
    setUploading(false);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.nome.trim()) return;
    setSaving(true);
    const data = {
      ...form,
      salario_base: form.salario_base ? Number(form.salario_base) : null,
      limite_vales: form.limite_vales ? Number(form.limite_vales) : null,
      // Se preencheu data de demissão, marca como inativo automaticamente
      ativo: form.data_demissao ? false : form.ativo,
    };
    if (isEdit) {
      await base44.entities.Funcionarios.update(funcionario.id, data);
      await registrarAuditoria({
        acao: 'editar',
        modulo: 'funcionario',
        entidade_id: funcionario.id,
        descricao: `Funcionário "${data.nome}" atualizado`,
        dados_anteriores: funcionario,
        dados_novos: data,
      });
    } else {
      const criado = await base44.entities.Funcionarios.create(data);
      await registrarAuditoria({
        acao: 'criar',
        modulo: 'funcionario',
        entidade_id: criado?.id,
        descricao: `Funcionário "${data.nome}" cadastrado`,
        dados_novos: data,
      });
    }
    setSaving(false);
    onSaved();
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Editar Funcionário' : 'Novo Funcionário'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="flex items-center gap-4">
            <div className="w-20 h-20 rounded-2xl bg-muted flex items-center justify-center overflow-hidden shrink-0">
              {form.foto ? (
                <img src={form.foto} alt="" className="w-full h-full object-cover" />
              ) : (
                <Upload className="w-6 h-6 text-muted-foreground" />
              )}
            </div>
            <div className="flex-1">
              <Label>Foto (opcional)</Label>
              <Input type="file" accept="image/*" onChange={handlePhoto} disabled={uploading} />
              {uploading && <p className="text-xs text-muted-foreground mt-1">Enviando...</p>}
            </div>
          </div>

          <div>
            <Label>Nome *</Label>
            <Input value={form.nome} onChange={e => handleChange('nome', e.target.value)} placeholder="Nome completo" required />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>E-mail</Label>
              <Input type="email" value={form.email || ''} onChange={e => handleChange('email', e.target.value)} placeholder="funcionario@empresa.com" />
            </div>
            <div>
              <Label>Telefone / WhatsApp</Label>
              <Input type="tel" value={form.telefone || ''} onChange={e => handleChange('telefone', e.target.value)} placeholder="11999998888" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Função</Label>
              {funcoes.length > 0 ? (
                <Select value={form.funcao || ''} onValueChange={v => handleChange('funcao', v)}>
                  <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                  <SelectContent>
                    {funcoes.filter(f => f.ativo !== false).map(f => (
                      <SelectItem key={f.id} value={f.nome}>{f.nome}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <Input value={form.funcao || ''} onChange={e => handleChange('funcao', e.target.value)} placeholder="Ex: Operador" />
              )}
            </div>
            <div>
              <Label>Setor</Label>
              {setores.length > 0 ? (
                <Select value={form.setor || ''} onValueChange={v => handleChange('setor', v)}>
                  <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                  <SelectContent>
                    {setores.filter(s => s.ativo !== false).map(s => (
                      <SelectItem key={s.id} value={s.nome}>{s.nome}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <Input value={form.setor || ''} onChange={e => handleChange('setor', e.target.value)} placeholder="Ex: Produção" />
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Data de Nascimento</Label>
              <Input type="date" value={form.data_nascimento || ''} onChange={e => handleChange('data_nascimento', e.target.value)} />
            </div>
            <div>
              <Label>Data Admissão</Label>
              <Input type="date" value={form.data_admissao || ''} onChange={e => handleChange('data_admissao', e.target.value)} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Data Demissão</Label>
              <Input type="date" value={form.data_demissao || ''} onChange={e => handleChange('data_demissao', e.target.value)} />
              {form.data_demissao && (
                <p className="text-xs text-amber-600 mt-1">Funcionário será marcado como inativo</p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Salário Base</Label>
              <Input type="number" step="0.01" min="0" value={form.salario_base || ''} onChange={e => handleChange('salario_base', e.target.value)} placeholder="0,00" />
            </div>
            <div>
              <Label>Limite de Vales</Label>
              <Input type="number" step="0.01" min="0" value={form.limite_vales || ''} onChange={e => handleChange('limite_vales', e.target.value)} placeholder="Sem limite" />
            </div>
          </div>

          {!form.data_demissao && (
            <div className="flex items-center gap-3">
              <Switch checked={form.ativo !== false} onCheckedChange={v => handleChange('ativo', v)} />
              <Label>Funcionário ativo</Label>
            </div>
          )}

          <div className="border rounded-lg p-4 space-y-3 bg-muted/30">
            <p className="text-sm font-medium">Comissões</p>
            <div className="flex items-center gap-3">
              <Switch
                checked={form.apto_comissao === true}
                onCheckedChange={v => handleChange('apto_comissao', v)}
              />
              <Label className="text-sm">Apto para receber comissão</Label>
            </div>
            {!form.apto_comissao && (
              <div>
                <Label className="text-xs text-muted-foreground">Data programada para início da comissão</Label>
                <Input
                  type="date"
                  value={form.data_inicio_comissao || ''}
                  onChange={e => handleChange('data_inicio_comissao', e.target.value)}
                />
                {comissaoAtivaByData && (
                  <p className="text-xs text-amber-600 mt-1">⚠️ A data programada já passou — considere marcar como apto manualmente.</p>
                )}
                {form.data_inicio_comissao && !comissaoAtivaByData && (
                  <p className="text-xs text-blue-600 mt-1">ℹ️ Funcionário passará a receber comissão em {form.data_inicio_comissao}.</p>
                )}
              </div>
            )}
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="outline" onClick={onClose}>Cancelar</Button>
            <Button type="submit" disabled={saving}>
              {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              {isEdit ? 'Salvar' : 'Cadastrar'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
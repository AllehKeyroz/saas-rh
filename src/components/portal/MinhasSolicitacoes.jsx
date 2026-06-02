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
import { useToast } from '@/components/ui/use-toast';
import { Loader2, Palmtree, Wallet, Clock, FileText, Package, PlusCircle, CheckCircle2, XCircle, AlertCircle, Upload, X } from 'lucide-react';
import { format } from 'date-fns';
import { useRHControl } from '@/lib/rhControl';

const STATUS_CONFIG = {
  pendente: { label: 'Pendente', icon: AlertCircle, color: 'bg-yellow-100 text-yellow-800' },
  aprovado: { label: 'Aprovado', icon: CheckCircle2, color: 'bg-green-100 text-green-800' },
  recusado: { label: 'Recusado', icon: XCircle, color: 'bg-red-100 text-red-800' },
};

const TIPO_CONFIG = {
  ferias: { label: 'Férias', icon: Palmtree, color: 'text-green-600', bg: 'bg-green-50', key: 'solicitacoes_ferias' },
  vale: { label: 'Vale', icon: Wallet, color: 'text-blue-600', bg: 'bg-blue-50', key: 'solicitacoes_vale' },
  banco_horas: { label: 'Banco de Horas', icon: Clock, color: 'text-purple-600', bg: 'bg-purple-50', key: 'solicitacoes_banco_horas' },
  atestado: { label: 'Atestado', icon: FileText, color: 'text-orange-600', bg: 'bg-orange-50', key: 'solicitacoes_atestado' },
  documento: { label: 'Documento', icon: Package, color: 'text-slate-600', bg: 'bg-slate-50', key: 'solicitacoes_documentos' },
  outro: { label: 'Outra', icon: PlusCircle, color: 'text-pink-600', bg: 'bg-pink-50', key: 'solicitacoes_outros' },
};

function AnexoUpload({ form, setForm }) {
  const [uploading, setUploading] = useState(false);

  const handleUpload = async (e) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;
    setUploading(true);
    const urls = form.anexos_urls || [];
    for (const file of files) {
      const { file_url } = await client.integrations.Core.UploadFile({ file });
      urls.push({ nome: file.name, url: file_url });
    }
    setForm(p => ({ ...p, anexos_urls: [...urls] }));
    setUploading(false);
    e.target.value = '';
  };

  const remover = (idx) => {
    const copia = [...(form.anexos_urls || [])];
    copia.splice(idx, 1);
    setForm(p => ({ ...p, anexos_urls: copia }));
  };

  return (
    <div>
      <Label>Anexos (fotos, PDFs)</Label>
      <div className="space-y-2">
        {(form.anexos_urls || []).map((a, idx) => (
          <div key={idx} className="flex items-center gap-2 bg-muted/50 rounded-lg p-2 text-sm">
            <FileText className="w-4 h-4 text-primary shrink-0" />
            <a href={a.url} target="_blank" rel="noopener noreferrer" className="flex-1 truncate text-primary hover:underline text-xs">{a.nome}</a>
            <button type="button" onClick={() => remover(idx)} className="text-destructive shrink-0"><X className="w-4 h-4" /></button>
          </div>
        ))}
        <label className="flex items-center gap-2 border-2 border-dashed rounded-lg px-4 py-2 cursor-pointer hover:bg-muted/50 transition-colors">
          {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4 text-muted-foreground" />}
          <span className="text-sm text-muted-foreground">{uploading ? 'Enviando...' : 'Adicionar arquivo'}</span>
          <input type="file" className="hidden" accept="image/*,.pdf" multiple onChange={handleUpload} disabled={uploading} />
        </label>
      </div>
    </div>
  );
}

function FormFerias({ form, setForm }) {
  return (
    <>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label>Data de início *</Label>
          <Input type="date" value={form.periodo_inicio || ''} onChange={e => setForm(p => ({ ...p, periodo_inicio: e.target.value }))} required />
        </div>
        <div>
          <Label>Data de fim *</Label>
          <Input type="date" value={form.periodo_fim || ''} onChange={e => setForm(p => ({ ...p, periodo_fim: e.target.value }))} required />
        </div>
      </div>
      <div>
        <Label>Observação</Label>
        <Textarea value={form.descricao || ''} onChange={e => setForm(p => ({ ...p, descricao: e.target.value }))} placeholder="Informações adicionais..." rows={2} />
      </div>
      <AnexoUpload form={form} setForm={setForm} />
    </>
  );
}

function FormVale({ form, setForm }) {
  return (
    <>
      <div>
        <Label>Valor solicitado (R$) *</Label>
        <Input type="number" min="0" step="0.01" value={form.valor_solicitado || ''} onChange={e => setForm(p => ({ ...p, valor_solicitado: parseFloat(e.target.value) || 0 }))} placeholder="0,00" required />
      </div>
      <div>
        <Label>Data desejada</Label>
        <Input type="date" value={form.data_solicitada || ''} onChange={e => setForm(p => ({ ...p, data_solicitada: e.target.value }))} />
      </div>
      <div>
        <Label>Motivo</Label>
        <Textarea value={form.descricao || ''} onChange={e => setForm(p => ({ ...p, descricao: e.target.value }))} placeholder="Descreva o motivo..." rows={2} />
      </div>
      <AnexoUpload form={form} setForm={setForm} />
    </>
  );
}

function FormBancoHoras({ form, setForm }) {
  return (
    <>
      <div>
        <Label>Data *</Label>
        <Input type="date" value={form.data_solicitada || ''} onChange={e => setForm(p => ({ ...p, data_solicitada: e.target.value }))} required />
      </div>
      <div>
        <Label>Horas a compensar *</Label>
        <Input type="number" min="0" step="0.5" value={form.horas_compensar || ''} onChange={e => setForm(p => ({ ...p, horas_compensar: parseFloat(e.target.value) || 0 }))} placeholder="Ex: 8" required />
      </div>
      <div>
        <Label>Motivo</Label>
        <Textarea value={form.descricao || ''} onChange={e => setForm(p => ({ ...p, descricao: e.target.value }))} placeholder="Descreva o motivo..." rows={2} />
      </div>
      <AnexoUpload form={form} setForm={setForm} />
    </>
  );
}

function FormAtestado({ form, setForm }) {
  return (
    <>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label>Data início *</Label>
          <Input type="date" value={form.periodo_inicio || ''} onChange={e => setForm(p => ({ ...p, periodo_inicio: e.target.value }))} required />
        </div>
        <div>
          <Label>Data fim *</Label>
          <Input type="date" value={form.periodo_fim || ''} onChange={e => setForm(p => ({ ...p, periodo_fim: e.target.value }))} required />
        </div>
      </div>
      <AnexoUpload form={form} setForm={setForm} />
      <div>
        <Label>Observação</Label>
        <Textarea value={form.descricao || ''} onChange={e => setForm(p => ({ ...p, descricao: e.target.value }))} placeholder="Informações adicionais..." rows={2} />
      </div>
    </>
  );
}

function FormDocumento({ form, setForm }) {
  return (
    <>
      <div>
        <Label>Tipo de documento *</Label>
        <Input value={form.tipo_documento || ''} onChange={e => setForm(p => ({ ...p, tipo_documento: e.target.value }))} placeholder="Ex: Declaração de vínculo, Holerite..." required />
      </div>
      <div>
        <Label>Prazo desejado</Label>
        <Input type="date" value={form.data_solicitada || ''} onChange={e => setForm(p => ({ ...p, data_solicitada: e.target.value }))} />
      </div>
      <div>
        <Label>Observação</Label>
        <Textarea value={form.descricao || ''} onChange={e => setForm(p => ({ ...p, descricao: e.target.value }))} placeholder="Informações adicionais..." rows={2} />
      </div>
      <AnexoUpload form={form} setForm={setForm} />
    </>
  );
}

function FormOutro({ form, setForm }) {
  return (
    <>
      <div>
        <Label>Título *</Label>
        <Input value={form.titulo || ''} onChange={e => setForm(p => ({ ...p, titulo: e.target.value }))} placeholder="Título da solicitação" required />
      </div>
      <div>
        <Label>Descrição *</Label>
        <Textarea value={form.descricao || ''} onChange={e => setForm(p => ({ ...p, descricao: e.target.value }))} placeholder="Descreva sua solicitação em detalhes..." rows={3} required />
      </div>
      <AnexoUpload form={form} setForm={setForm} />
    </>
  );
}

function SolicitacaoModal({ tipo, funcionario, onClose, onSaved }) {
  const { toast } = useToast();
  const [form, setForm] = useState({ tipo_solicitacao: tipo });
  const [saving, setSaving] = useState(false);
  const cfg = TIPO_CONFIG[tipo];

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await client.entities.SolicitacoesFuncionario.create({
        ...form,
        funcionario_id: funcionario.id,
        funcionario_nome: funcionario.nome,
        status: 'pendente',
        push_enviado: false,
      });
      toast({ title: `✅ Solicitação de ${cfg.label} enviada!`, description: 'O RH será notificado em breve.' });
      onSaved();
    } catch (e) {
      toast({ title: 'Erro ao enviar', description: e.message, variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {cfg && React.createElement(cfg.icon, { className: `w-5 h-5 ${cfg.color}` })}
            Solicitar {cfg?.label}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          {tipo === 'ferias' && <FormFerias form={form} setForm={setForm} />}
          {tipo === 'vale' && <FormVale form={form} setForm={setForm} />}
          {tipo === 'banco_horas' && <FormBancoHoras form={form} setForm={setForm} />}
          {tipo === 'atestado' && <FormAtestado form={form} setForm={setForm} />}
          {tipo === 'documento' && <FormDocumento form={form} setForm={setForm} />}
          {tipo === 'outro' && <FormOutro form={form} setForm={setForm} />}
          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="outline" onClick={onClose}>Cancelar</Button>
            <Button type="submit" disabled={saving}>
              {saving && <Loader2 className="w-4 h-4 animate-spin" />}
              Enviar Solicitação
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export default function MinhasSolicitacoes({ funcionario }) {
  const { isAtiva } = useRHControl();
  const queryClient = useQueryClient();
  const [tipoForm, setTipoForm] = useState(null);

  const { data: solicitacoes = [], isLoading } = useQuery({
    queryKey: ['minhas_solicitacoes', funcionario?.id],
    queryFn: () => client.entities.SolicitacoesFuncionario.filter({ funcionario_id: funcionario?.id }),
    enabled: !!funcionario?.id,
  });

  const botoes = Object.entries(TIPO_CONFIG).filter(([tipo]) => isAtiva(TIPO_CONFIG[tipo].key));
  // Se nenhum está configurado individualmente, mostrar todos (fallback)
  const botoesVisiveis = botoes.length > 0 ? botoes : Object.entries(TIPO_CONFIG);

  const pendentes = solicitacoes.filter(s => s.status === 'pendente').length;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-bold text-lg">Minhas Solicitações</h2>
        {pendentes > 0 && (
          <p className="text-sm text-muted-foreground">{pendentes} aguardando resposta</p>
        )}
      </div>

      {/* Botões rápidos */}
      {true && (
        <div>
          <p className="text-xs font-medium text-muted-foreground mb-3 uppercase tracking-wide">Nova Solicitação</p>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {botoesVisiveis.map(([tipo, cfg]) => {
              const Icon = cfg.icon;
              return (
                <button
                  key={tipo}
                  onClick={() => setTipoForm(tipo)}
                  className={`flex flex-col items-center gap-2 p-4 rounded-xl border-2 border-transparent ${cfg.bg} hover:border-current hover:shadow-sm transition-all`}
                >
                  <Icon className={`w-6 h-6 ${cfg.color}`} />
                  <span className={`text-xs font-medium ${cfg.color}`}>{cfg.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Lista */}
      <div>
        <p className="text-xs font-medium text-muted-foreground mb-3 uppercase tracking-wide">Histórico</p>
        {isLoading ? (
          <div className="flex justify-center py-8"><Loader2 className="w-5 h-5 animate-spin text-muted-foreground" /></div>
        ) : solicitacoes.length === 0 ? (
          <div className="text-center py-10 text-muted-foreground">
            <FileText className="w-10 h-10 mx-auto mb-2 opacity-30" />
            <p className="text-sm">Nenhuma solicitação enviada</p>
          </div>
        ) : (
          <div className="space-y-3">
            {[...solicitacoes].sort((a, b) => new Date(b.created_date) - new Date(a.created_date)).map(s => {
              const st = STATUS_CONFIG[s.status] || STATUS_CONFIG.pendente;
              const StIcon = st.icon;
              const tipoCfg = TIPO_CONFIG[s.tipo_solicitacao];
              const TipoIcon = tipoCfg?.icon || FileText;
              return (
                <div key={s.id} className="bg-card border rounded-xl p-4 space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <TipoIcon className={`w-4 h-4 ${tipoCfg?.color || 'text-muted-foreground'}`} />
                      <span className="font-medium text-sm">{tipoCfg?.label || s.tipo_solicitacao}</span>
                      {s.titulo && <span className="text-muted-foreground text-sm">— {s.titulo}</span>}
                    </div>
                    <Badge className={`text-xs flex items-center gap-1 ${st.color}`}>
                      <StIcon className="w-3 h-3" />{st.label}
                    </Badge>
                  </div>
                  {s.descricao && <p className="text-xs text-muted-foreground">{s.descricao}</p>}
                  <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                    {s.valor_solicitado && <span>R$ {s.valor_solicitado.toFixed(2)}</span>}
                    {s.periodo_inicio && <span>{format(new Date(s.periodo_inicio), 'dd/MM/yyyy')}{s.periodo_fim ? ` → ${format(new Date(s.periodo_fim), 'dd/MM/yyyy')}` : ''}</span>}
                    {s.created_date && <span>{format(new Date(s.created_date), 'dd/MM/yyyy')}</span>}
                  </div>
                  {s.anexos_urls?.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {s.anexos_urls.map((a, idx) => (
                        <a key={idx} href={a.url} target="_blank" rel="noopener noreferrer"
                          className="flex items-center gap-1 text-xs text-primary hover:underline bg-primary/5 rounded px-2 py-1">
                          <FileText className="w-3 h-3" />{a.nome}
                        </a>
                      ))}
                    </div>
                  )}
                  {s.resposta_rh && (
                    <div className={`rounded-lg px-3 py-2 text-xs border ${s.status === 'aprovado' ? 'bg-green-50 border-green-200 text-green-800' : 'bg-red-50 border-red-200 text-red-800'}`}>
                      <span className="font-medium">RH: </span>{s.resposta_rh}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {tipoForm && (
        <SolicitacaoModal
          tipo={tipoForm}
          funcionario={funcionario}
          onClose={() => setTipoForm(null)}
          onSaved={() => { setTipoForm(null); queryClient.invalidateQueries({ queryKey: ['minhas_solicitacoes', funcionario?.id] }); }}
        />
      )}
    </div>
  );
}
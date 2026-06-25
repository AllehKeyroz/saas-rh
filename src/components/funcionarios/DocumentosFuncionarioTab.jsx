import React, { useState, useRef, useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { client } from '@/api/client';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Search, User, FileText, ChevronRight, ChevronDown, Download, FolderOpen, Eye, EyeOff, Upload, Settings, Loader2, X } from 'lucide-react';
import { toast } from 'sonner';
import FinalidadesTab from '@/components/modelos/FinalidadesTab';

const CATEGORIA_CONFIG_LEGACY = {
  admissional: { label: 'Admissional', color: 'bg-green-100 text-green-700' },
  demissional: { label: 'Demissional', color: 'bg-red-100 text-red-700' },
  contrato: { label: 'Contrato', color: 'bg-blue-100 text-blue-700' },
  atestado: { label: 'Atestado', color: 'bg-yellow-100 text-yellow-700' },
  outros: { label: 'Outros', color: 'bg-gray-100 text-gray-600' },
};

function getCatConfig(categoria, finalidades) {
  if (!categoria || categoria === 'outros') return CATEGORIA_CONFIG_LEGACY.outros;
  const f = finalidades?.find(fi => fi.nome === categoria);
  if (f) return { label: f.nome, cor: f.cor };
  return CATEGORIA_CONFIG_LEGACY[categoria] || CATEGORIA_CONFIG_LEGACY.outros;
}

function CategoriaBadge({ categoria, finalidades }) {
  const cfg = getCatConfig(categoria, finalidades);
  if (cfg.cor) {
    return (
      <Badge className="text-xs border-0" style={{ backgroundColor: cfg.cor + '20', color: cfg.cor }}>
        {cfg.label}
      </Badge>
    );
  }
  return <Badge className={`text-xs ${cfg.color} border-0`}>{cfg.label}</Badge>;
}

function agruparPorCategoria(docs) {
  const grupos = {};
  for (const doc of docs) {
    const cat = doc.categoria || 'outros';
    if (!grupos[cat]) grupos[cat] = [];
    grupos[cat].push(doc);
  }
  return grupos;
}

function DocumentoItem({ doc, finalidades }) {
  const [loadingUrl, setLoadingUrl] = useState(false);

  const handleDownload = () => {
    setLoadingUrl(true);
    window.open(doc.file_uri, '_blank');
    setLoadingUrl(false);
  };

  return (
    <div className="flex items-center justify-between px-3 py-2.5 hover:bg-muted/40 rounded-lg group">
      <div className="flex items-center gap-3 min-w-0">
        <FileText className="w-4 h-4 text-muted-foreground shrink-0" />
        <div className="min-w-0">
          <p className="text-sm font-medium truncate">{doc.nome_arquivo}</p>
          {doc.descricao && <p className="text-xs text-muted-foreground truncate">{doc.descricao}</p>}
        </div>
      </div>
      <div className="flex items-center gap-2 shrink-0 ml-2">
        {doc.visivel_ao_funcionario ? (
          <Eye className="w-3 h-3 text-green-500" title="Visível ao funcionário" />
        ) : (
          <EyeOff className="w-3 h-3 text-muted-foreground" title="Oculto do funcionário" />
        )}
        <CategoriaBadge categoria={doc.categoria} finalidades={finalidades} />
        <Button size="icon" variant="ghost" className="h-7 w-7 opacity-0 group-hover:opacity-100" onClick={handleDownload} disabled={loadingUrl}>
          <Download className="w-3.5 h-3.5" />
        </Button>
      </div>
    </div>
  );
}

function FuncionarioDocumentosRow({ func, docs, finalidades }) {
  const [aberto, setAberto] = useState(false);
  const grupos = agruparPorCategoria(docs);
  const total = docs.length;

  return (
    <div className="border rounded-xl overflow-hidden bg-card">
      <button
        onClick={() => setAberto(!aberto)}
        className="w-full flex items-center gap-4 px-4 py-3 hover:bg-muted/30 transition-colors"
      >
        <div className="w-9 h-9 rounded-xl bg-muted flex items-center justify-center shrink-0 overflow-hidden">
          {func.foto ? <img src={func.foto} alt="" className="w-full h-full object-cover" /> : <User className="w-4 h-4 text-muted-foreground" />}
        </div>
        <div className="flex-1 text-left min-w-0">
          <p className="font-semibold text-sm truncate">{func.nome}</p>
          <p className="text-xs text-muted-foreground">{func.funcao || func.setor || ''}</p>
        </div>
        <Badge variant="secondary" className="text-xs shrink-0">{total} doc{total !== 1 ? 's' : ''}</Badge>
        {aberto ? <ChevronDown className="w-4 h-4 text-muted-foreground shrink-0" /> : <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" />}
      </button>

      {aberto && (
        <div className="border-t divide-y">
          {Object.entries(grupos).map(([cat, docsCat]) => {
            const cfg = getCatConfig(cat, finalidades);
            return (
              <div key={cat} className="px-2 py-2">
                {cfg.cor ? (
                  <p className="text-xs font-semibold px-2 py-1 rounded mb-1 w-fit" style={{ backgroundColor: cfg.cor + '20', color: cfg.cor }}>{cfg.label}</p>
                ) : (
                  <p className={`text-xs font-semibold px-2 py-1 rounded mb-1 w-fit ${cfg.color}`}>{cfg.label}</p>
                )}
                {docsCat.map(doc => <DocumentoItem key={doc.id} doc={doc} finalidades={finalidades} />)}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function UploadDocumentoModal({ open, onClose, funcionarios, finalidades, onSaved }) {
  const [funcId, setFuncId] = useState('');
  const [categoria, setCategoria] = useState('outros');
  const [descricao, setDescricao] = useState('');
  const [file, setFile] = useState(null);
  const [saving, setSaving] = useState(false);
  const fileRef = useRef(null);

  const categorias = useMemo(() => {
    const ativas = (finalidades || []).filter(f => f.ativo !== false).map(f => ({ value: f.nome, label: f.nome, cor: f.cor }));
    return [...ativas, { value: 'outros', label: 'Outros', cor: null }];
  }, [finalidades]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!funcId || !file) { toast.error('Selecione o funcionário e o arquivo'); return; }
    setSaving(true);
    try {
      const func = funcionarios.find(f => f.id === funcId);
      const { file_url } = await client.integrations.Core.UploadFile({ file });
      await client.entities.DocumentoFuncionario.create({
        funcionario_id: funcId,
        funcionario_nome: func?.nome || '',
        nome_arquivo: file.name,
        descricao,
        categoria,
        file_uri: file_url,
        file_type: file.type,
        visivel_ao_funcionario: true,
      });
      toast.success('Documento enviado com sucesso!');
      onSaved();
      onClose();
    } catch (err) {
      toast.error('Erro ao enviar documento');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Upload className="w-5 h-5 text-primary" />
            Enviar Documento
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label>Funcionário *</Label>
            <Select value={funcId} onValueChange={setFuncId}>
              <SelectTrigger><SelectValue placeholder="Selecione o funcionário" /></SelectTrigger>
              <SelectContent>
                {funcionarios.map(f => <SelectItem key={f.id} value={f.id}>{f.nome}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Categoria</Label>
            <Select value={categoria} onValueChange={setCategoria}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {categorias.map(cat => (
                  <SelectItem key={cat.value} value={cat.value}>
                    <span className="flex items-center gap-2">
                      {cat.cor && <span className="w-2 h-2 rounded-full inline-block" style={{ backgroundColor: cat.cor }} />}
                      {cat.label}
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Descrição (opcional)</Label>
            <Input value={descricao} onChange={e => setDescricao(e.target.value)} placeholder="Descrição do documento" />
          </div>
          <div>
            <Label>Arquivo *</Label>
            <div
              onClick={() => fileRef.current?.click()}
              className="border-2 border-dashed rounded-lg p-4 text-center cursor-pointer hover:bg-muted/50 transition-colors"
            >
              {file ? (
                <div className="flex items-center justify-center gap-2">
                  <FileText className="w-5 h-5 text-primary" />
                  <span className="text-sm font-medium truncate max-w-[200px]">{file.name}</span>
                  <button type="button" onClick={(e) => { e.stopPropagation(); setFile(null); }} className="text-destructive hover:text-destructive/80">
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <div className="text-muted-foreground">
                  <Upload className="w-6 h-6 mx-auto mb-1" />
                  <p className="text-sm">Clique para selecionar um arquivo</p>
                  <p className="text-xs">PDF, imagens, etc.</p>
                </div>
              )}
              <input ref={fileRef} type="file" className="hidden" onChange={e => setFile(e.target.files?.[0] || null)} />
            </div>
          </div>
          <div className="flex justify-end gap-3">
            <Button type="button" variant="outline" onClick={onClose} disabled={saving}>Cancelar</Button>
            <Button type="submit" disabled={saving || !funcId || !file}>
              {saving ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : <Upload className="w-4 h-4 mr-1" />}
              {saving ? 'Enviando...' : 'Enviar'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function GerenciarCategoriasDialog({ open, onClose }) {
  const queryClient = useQueryClient();
  const { data: finalidades = [], isLoading } = useQuery({
    queryKey: ['finalidades-documento'],
    queryFn: () => client.entities.FinalidadeDocumento.list(),
  });

  const handleRefresh = () => queryClient.invalidateQueries({ queryKey: ['finalidades-documento'] });

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Settings className="w-5 h-5 text-primary" />
            Gerenciar Categorias de Documentos
          </DialogTitle>
        </DialogHeader>
        <FinalidadesTab finalidades={finalidades} loading={isLoading} onRefresh={handleRefresh} />
      </DialogContent>
    </Dialog>
  );
}

export default function DocumentosFuncionarioTab({ funcionarios }) {
  const [search, setSearch] = useState('');
  const [uploadOpen, setUploadOpen] = useState(false);
  const [categoriasOpen, setCategoriasOpen] = useState(false);
  const queryClient = useQueryClient();

  const { data: documentos = [], isLoading } = useQuery({
    queryKey: ['documentos-funcionarios'],
    queryFn: () => client.entities.DocumentoFuncionario.list(),
  });

  const { data: finalidades = [] } = useQuery({
    queryKey: ['finalidades-documento-tab'],
    queryFn: () => client.entities.FinalidadeDocumento.list(),
  });

  const docsPorFuncionario = {};
  for (const doc of documentos) {
    if (!docsPorFuncionario[doc.funcionario_id]) docsPorFuncionario[doc.funcionario_id] = [];
    docsPorFuncionario[doc.funcionario_id].push(doc);
  }

  const lista = funcionarios
    .filter(f => {
      const temDoc = !!docsPorFuncionario[f.id];
      const match = !search || f.nome?.toLowerCase().includes(search.toLowerCase());
      return temDoc && match;
    })
    .sort((a, b) => (a.nome || '').localeCompare(b.nome || ''));

  if (isLoading) return (
    <div className="space-y-3">
      {[1, 2, 3].map(i => <Skeleton key={i} className="h-16 rounded-xl" />)}
    </div>
  );

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <h2 className="text-lg font-bold flex items-center gap-2">
          Documentos por Funcionário
          <button onClick={() => setCategoriasOpen(true)} className="text-muted-foreground hover:text-foreground transition-colors text-sm flex items-center gap-1" title="Gerenciar categorias">
            <Settings className="w-4 h-4" /> Gerenciar Categorias
          </button>
        </h2>
        <Button size="sm" onClick={() => setUploadOpen(true)}>
          <Upload className="w-4 h-4 mr-1" />Enviar Documento
        </Button>
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input placeholder="Buscar funcionário..." value={search} onChange={e => setSearch(e.target.value)} className="pl-10" />
      </div>

      {lista.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <FolderOpen className="w-12 h-12 mx-auto mb-2 opacity-30" />
          <p className="font-medium">Nenhum documento encontrado</p>
          <p className="text-xs mt-1">Clique em "Enviar Documento" para adicionar o primeiro</p>
        </div>
      ) : (
        <div className="space-y-3">
          {lista.map(func => (
            <FuncionarioDocumentosRow
              key={func.id}
              func={func}
              docs={docsPorFuncionario[func.id] || []}
              finalidades={finalidades}
            />
          ))}
        </div>
      )}

      <UploadDocumentoModal
        open={uploadOpen}
        onClose={() => setUploadOpen(false)}
        funcionarios={funcionarios}
        finalidades={finalidades}
        onSaved={() => queryClient.invalidateQueries({ queryKey: ['documentos-funcionarios'] })}
      />

      <GerenciarCategoriasDialog
        open={categoriasOpen}
        onClose={() => setCategoriasOpen(false)}
      />
    </div>
  );
}

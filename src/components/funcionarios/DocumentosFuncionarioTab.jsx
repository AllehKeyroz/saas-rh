import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { client } from '@/api/client';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Search, User, FileText, ChevronRight, ChevronDown, Download, FolderOpen, Eye, EyeOff } from 'lucide-react';

const CATEGORIA_CONFIG = {
  admissional: { label: 'Admissional', color: 'bg-green-100 text-green-700' },
  demissional:  { label: 'Demissional', color: 'bg-red-100 text-red-700' },
  contrato:     { label: 'Contrato', color: 'bg-blue-100 text-blue-700' },
  atestado:     { label: 'Atestado', color: 'bg-yellow-100 text-yellow-700' },
  outros:       { label: 'Outros', color: 'bg-gray-100 text-gray-600' },
};

// Agrupa documentos por categoria
function agruparPorCategoria(docs) {
  const grupos = {};
  for (const doc of docs) {
    const cat = doc.categoria || 'outros';
    if (!grupos[cat]) grupos[cat] = [];
    grupos[cat].push(doc);
  }
  return grupos;
}

function DocumentoItem({ doc }) {
  const [loadingUrl, setLoadingUrl] = useState(false);
  const cfg = CATEGORIA_CONFIG[doc.categoria] || CATEGORIA_CONFIG.outros;

  const handleDownload = async () => {
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
        <Badge className={`text-xs ${cfg.color} border-0`}>{cfg.label}</Badge>
        <Button size="icon" variant="ghost" className="h-7 w-7 opacity-0 group-hover:opacity-100" onClick={handleDownload} disabled={loadingUrl}>
          <Download className="w-3.5 h-3.5" />
        </Button>
      </div>
    </div>
  );
}

function FuncionarioDocumentosRow({ func, docs }) {
  const [aberto, setAberto] = useState(false);
  const grupos = agruparPorCategoria(docs);
  const total = docs.length;

  return (
    <div className="border rounded-xl overflow-hidden bg-card">
      {/* Header do funcionário */}
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

      {/* Documentos agrupados por categoria */}
      {aberto && (
        <div className="border-t divide-y">
          {Object.entries(grupos).map(([cat, docsCat]) => {
            const cfg = CATEGORIA_CONFIG[cat] || CATEGORIA_CONFIG.outros;
            return (
              <div key={cat} className="px-2 py-2">
                <p className={`text-xs font-semibold px-2 py-1 rounded mb-1 w-fit ${cfg.color}`}>{cfg.label}</p>
                {docsCat.map(doc => <DocumentoItem key={doc.id} doc={doc} />)}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default function DocumentosFuncionarioTab({ funcionarios }) {
  const [search, setSearch] = useState('');

  const { data: documentos = [], isLoading } = useQuery({
    queryKey: ['documentos-funcionarios'],
    queryFn: () => client.entities.DocumentoFuncionario.list(),
  });

  // Agrupar docs por funcionario_id
  const docsPorFuncionario = {};
  for (const doc of documentos) {
    if (!docsPorFuncionario[doc.funcionario_id]) docsPorFuncionario[doc.funcionario_id] = [];
    docsPorFuncionario[doc.funcionario_id].push(doc);
  }

  // Filtrar funcionários que têm documentos
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
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input placeholder="Buscar funcionário..." value={search} onChange={e => setSearch(e.target.value)} className="pl-10" />
      </div>

      {lista.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <FolderOpen className="w-12 h-12 mx-auto mb-2 opacity-30" />
          <p className="font-medium">Nenhum documento encontrado</p>
          <p className="text-xs mt-1">Os documentos dos funcionários aparecerão aqui</p>
        </div>
      ) : (
        <div className="space-y-3">
          {lista.map(func => (
            <FuncionarioDocumentosRow
              key={func.id}
              func={func}
              docs={docsPorFuncionario[func.id] || []}
            />
          ))}
        </div>
      )}
    </div>
  );
}
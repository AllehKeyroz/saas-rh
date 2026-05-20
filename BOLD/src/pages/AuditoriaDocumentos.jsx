import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { ShieldCheck, Search, Globe, FileText, User, Settings, Layers } from 'lucide-react';
import AuditoriaDetalheModal from '@/components/auditoria/AuditoriaDetalheModal';

const ORIGEM_CONFIG = {
  govbr:       { label: 'GovBR',       color: 'bg-blue-100 text-blue-800' },
  sistema:     { label: 'Sistema',      color: 'bg-gray-100 text-gray-700' },
  api:         { label: 'API',          color: 'bg-purple-100 text-purple-800' },
  rh:          { label: 'RH',           color: 'bg-green-100 text-green-800' },
  colaborador: { label: 'Colaborador',  color: 'bg-amber-100 text-amber-800' },
};

const MODULO_CONFIG = {
  assinatura: { label: 'Assinatura',  color: 'bg-indigo-100 text-indigo-800',  icon: FileText },
  modelo:     { label: 'Modelo',      color: 'bg-teal-100 text-teal-800',      icon: Layers },
  finalidade: { label: 'Finalidade',  color: 'bg-cyan-100 text-cyan-800',      icon: Settings },
  documento:  { label: 'Documento',   color: 'bg-orange-100 text-orange-800',  icon: FileText },
  sistema:    { label: 'Sistema',     color: 'bg-gray-100 text-gray-700',      icon: Globe },
};

function fmtDt(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' });
}

export default function AuditoriaDocumentos() {
  const [search, setSearch]         = useState('');
  const [filtroOrigem, setFiltroOrigem] = useState('todos');
  const [filtroModulo, setFiltroModulo] = useState('todos');
  const [filtroAcao, setFiltroAcao]   = useState('');
  const [detalhe, setDetalhe]         = useState(null);

  const { data: logs = [], isLoading } = useQuery({
    queryKey: ['auditoria-documentos'],
    queryFn: () => base44.entities.AuditoriaDocumentos.list('-created_date', 500),
    refetchInterval: 30000,
  });

  // Ações únicas presentes nos logs para o filtro
  const acoesDisponiveis = useMemo(() => {
    const set = new Set(logs.map(l => l.acao).filter(Boolean));
    return [...set].sort();
  }, [logs]);

  const filtered = useMemo(() => {
    return logs.filter(l => {
      if (filtroOrigem !== 'todos' && l.origem !== filtroOrigem) return false;
      if (filtroModulo !== 'todos' && l.modulo !== filtroModulo) return false;
      if (filtroAcao && l.acao !== filtroAcao) return false;
      if (search) {
        const q = search.toLowerCase();
        return (
          l.descricao?.toLowerCase().includes(q) ||
          l.nome_documento?.toLowerCase().includes(q) ||
          l.funcionario_nome?.toLowerCase().includes(q) ||
          l.usuario_nome?.toLowerCase().includes(q) ||
          l.usuario_email?.toLowerCase().includes(q) ||
          l.acao?.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [logs, filtroOrigem, filtroModulo, filtroAcao, search]);

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <ShieldCheck className="w-6 h-6 text-primary" />
            Auditoria de Documentos
          </h1>
          <p className="text-sm text-muted-foreground">
            Rastreabilidade completa de todas as ações sobre documentos, modelos, finalidades e assinaturas GovBR.
          </p>
        </div>
        <Badge variant="outline" className="text-sm shrink-0">{filtered.length} registros</Badge>
      </div>

      {/* Filtros */}
      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Buscar documento, funcionário, usuário..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>

        <Select value={filtroModulo} onValueChange={setFiltroModulo}>
          <SelectTrigger className="w-40"><SelectValue placeholder="Módulo" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos os módulos</SelectItem>
            <SelectItem value="assinatura">Assinatura</SelectItem>
            <SelectItem value="modelo">Modelo</SelectItem>
            <SelectItem value="finalidade">Finalidade</SelectItem>
            <SelectItem value="documento">Documento</SelectItem>
            <SelectItem value="sistema">Sistema</SelectItem>
          </SelectContent>
        </Select>

        <Select value={filtroOrigem} onValueChange={setFiltroOrigem}>
          <SelectTrigger className="w-40"><SelectValue placeholder="Origem" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todas as origens</SelectItem>
            <SelectItem value="rh">RH</SelectItem>
            <SelectItem value="colaborador">Colaborador</SelectItem>
            <SelectItem value="govbr">GovBR</SelectItem>
            <SelectItem value="sistema">Sistema</SelectItem>
            <SelectItem value="api">API</SelectItem>
          </SelectContent>
        </Select>

        {acoesDisponiveis.length > 0 && (
          <Select value={filtroAcao || 'todos'} onValueChange={v => setFiltroAcao(v === 'todos' ? '' : v)}>
            <SelectTrigger className="w-52"><SelectValue placeholder="Ação" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todas as ações</SelectItem>
              {acoesDisponiveis.map(a => (
                <SelectItem key={a} value={a}>{a}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </div>

      {/* Tabela */}
      {isLoading ? (
        <div className="space-y-2">
          {[1,2,3,4,5].map(i => <Skeleton key={i} className="h-14 rounded-xl" />)}
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-20 text-muted-foreground border-2 border-dashed border-border rounded-xl">
          <ShieldCheck className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p className="font-medium">Nenhum registro de auditoria encontrado</p>
          <p className="text-xs mt-1">Os eventos serão registrados automaticamente conforme as ações forem realizadas</p>
        </div>
      ) : (
        <div className="overflow-x-auto border border-border rounded-xl bg-card">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-muted/50 text-xs text-muted-foreground uppercase tracking-wide border-b border-border">
                <th className="px-4 py-3 text-left">Data/Hora</th>
                <th className="px-4 py-3 text-left">Usuário</th>
                <th className="px-4 py-3 text-left">Ação</th>
                <th className="px-4 py-3 text-left">Módulo</th>
                <th className="px-4 py-3 text-left">Documento</th>
                <th className="px-4 py-3 text-left">Descrição</th>
                <th className="px-4 py-3 text-left">Origem</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(log => {
                const origemCfg = ORIGEM_CONFIG[log.origem] || ORIGEM_CONFIG.sistema;
                const moduloCfg = MODULO_CONFIG[log.modulo] || MODULO_CONFIG.sistema;
                const ModuloIcon = moduloCfg.icon;
                return (
                  <tr
                    key={log.id}
                    className="border-b border-border hover:bg-muted/30 transition-colors cursor-pointer"
                    onClick={() => setDetalhe(log)}
                  >
                    <td className="px-4 py-3 text-xs text-muted-foreground whitespace-nowrap">
                      {fmtDt(log.created_date)}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1.5 text-xs">
                        <User className="w-3 h-3 text-muted-foreground" />
                        <span>{log.usuario_nome || log.usuario_email || 'Sistema'}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className="font-mono text-xs bg-muted px-1.5 py-0.5 rounded">{log.acao}</span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${moduloCfg.color}`}>
                        <ModuloIcon className="w-3 h-3" />
                        {moduloCfg.label}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs text-foreground max-w-[160px] truncate">
                      {log.nome_documento || log.funcionario_nome || '—'}
                    </td>
                    <td className="px-4 py-3 text-xs text-muted-foreground max-w-[240px] truncate">
                      {log.descricao}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border ${
                        log.origem === 'govbr'       ? 'bg-blue-100 text-blue-800 border-blue-200' :
                        log.origem === 'rh'          ? 'bg-green-100 text-green-800 border-green-200' :
                        log.origem === 'colaborador' ? 'bg-amber-100 text-amber-800 border-amber-200' :
                        log.origem === 'api'         ? 'bg-purple-100 text-purple-800 border-purple-200' :
                                                       'bg-gray-100 text-gray-600 border-gray-200'
                      }`}>
                        {origemCfg.label}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <AuditoriaDetalheModal log={detalhe} onClose={() => setDetalhe(null)} />
    </div>
  );
}
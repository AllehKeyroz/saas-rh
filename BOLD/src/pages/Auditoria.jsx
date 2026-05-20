import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Search, ShieldCheck, User, FileText, Pencil, Plus, Trash2 } from 'lucide-react';
import { formatDate } from '@/lib/formatters';

const ACAO_CONFIG = {
  criar:  { label: 'Criação',  color: 'bg-green-100 text-green-700',  icon: Plus },
  editar: { label: 'Edição',   color: 'bg-blue-100 text-blue-700',    icon: Pencil },
  excluir:{ label: 'Exclusão', color: 'bg-red-100 text-red-700',      icon: Trash2 },
};

const MODULO_CONFIG = {
  funcionario: { label: 'Funcionário', icon: User,     color: 'bg-purple-100 text-purple-700' },
  lancamento:  { label: 'Lançamento',  icon: FileText, color: 'bg-amber-100 text-amber-700'   },
  comissao:    { label: 'Comissão',    icon: FileText, color: 'bg-green-100 text-green-700'    },
};

function formatDateTime(iso) {
  if (!iso) return '-';
  const d = new Date(iso);
  return d.toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' });
}

export default function Auditoria() {
  const [search, setSearch] = useState('');
  const [filtroAcao, setFiltroAcao] = useState('todos');
  const [filtroModulo, setFiltroModulo] = useState('todos');
  const [expandido, setExpandido] = useState(null);

  const { data: logs = [], isLoading } = useQuery({
    queryKey: ['auditoria'],
    queryFn: () => base44.entities.LogAuditoria.list('-created_date', 500),
  });

  const filtered = useMemo(() => {
    return logs.filter(l => {
      if (filtroAcao !== 'todos' && l.acao !== filtroAcao) return false;
      if (filtroModulo !== 'todos' && l.modulo !== filtroModulo) return false;
      if (search) {
        const q = search.toLowerCase();
        return (
          l.descricao?.toLowerCase().includes(q) ||
          l.usuario_email?.toLowerCase().includes(q) ||
          l.usuario_nome?.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [logs, filtroAcao, filtroModulo, search]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <ShieldCheck className="w-8 h-8 text-primary" />
            Auditoria
          </h1>
          <p className="text-muted-foreground mt-1">Histórico de todas as alterações realizadas no sistema</p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="text-sm">{filtered.length} registros</Badge>
        </div>
      </div>

      {/* Filtros */}
      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por usuário ou descrição..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={filtroModulo} onValueChange={setFiltroModulo}>
          <SelectTrigger className="w-44"><SelectValue placeholder="Módulo" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos os módulos</SelectItem>
            <SelectItem value="funcionario">Funcionário</SelectItem>
            <SelectItem value="lancamento">Lançamento</SelectItem>
            <SelectItem value="comissao">Comissão</SelectItem>
          </SelectContent>
        </Select>
        <Select value={filtroAcao} onValueChange={setFiltroAcao}>
          <SelectTrigger className="w-40"><SelectValue placeholder="Ação" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todas as ações</SelectItem>
            <SelectItem value="criar">Criação</SelectItem>
            <SelectItem value="editar">Edição</SelectItem>
            <SelectItem value="excluir">Exclusão</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Lista */}
      {isLoading ? (
        <div className="space-y-3">
          {[1,2,3,4,5].map(i => <Skeleton key={i} className="h-20" />)}
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-20 text-muted-foreground">
          <ShieldCheck className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p>Nenhum registro de auditoria encontrado</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map(log => {
            const acao = ACAO_CONFIG[log.acao] || {};
            const modulo = MODULO_CONFIG[log.modulo] || {};
            const AcaoIcon = acao.icon || Pencil;
            const ModuloIcon = modulo.icon || FileText;
            const isOpen = expandido === log.id;
            const temDetalhes = log.dados_anteriores || log.dados_novos;

            return (
              <Card
                key={log.id}
                className={`transition-all ${temDetalhes ? 'cursor-pointer hover:shadow-md hover:border-primary/30' : ''}`}
                onClick={() => temDetalhes && setExpandido(isOpen ? null : log.id)}
              >
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    {/* Ícone da ação */}
                    <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 mt-0.5 ${acao.color}`}>
                      <AcaoIcon className="w-4 h-4" />
                    </div>

                    {/* Conteúdo */}
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2 mb-1">
                        <Badge className={acao.color + ' border-0 text-xs'}>{acao.label}</Badge>
                        <Badge className={modulo.color + ' border-0 text-xs flex items-center gap-1'}>
                          <ModuloIcon className="w-3 h-3" />
                          {modulo.label}
                        </Badge>
                      </div>
                      <p className="text-sm font-medium">{log.descricao}</p>
                      <div className="flex flex-wrap items-center gap-3 mt-1 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <User className="w-3 h-3" />
                          {log.usuario_nome || log.usuario_email}
                        </span>
                        <span>{formatDateTime(log.created_date)}</span>
                      </div>
                    </div>

                    {temDetalhes && (
                      <span className="text-xs text-muted-foreground shrink-0 mt-1">{isOpen ? '▲ fechar' : '▼ detalhes'}</span>
                    )}
                  </div>

                  {/* Detalhes expandidos */}
                  {isOpen && temDetalhes && (
                    <div className="mt-3 pt-3 border-t grid grid-cols-1 md:grid-cols-2 gap-3">
                      {log.dados_anteriores && (
                        <div>
                          <p className="text-xs font-semibold text-muted-foreground mb-1.5">Antes</p>
                          <pre className="bg-muted rounded-lg p-3 text-xs overflow-auto max-h-48 whitespace-pre-wrap">
                            {JSON.stringify(log.dados_anteriores, null, 2)}
                          </pre>
                        </div>
                      )}
                      {log.dados_novos && (
                        <div>
                          <p className="text-xs font-semibold text-muted-foreground mb-1.5">Depois</p>
                          <pre className="bg-muted rounded-lg p-3 text-xs overflow-auto max-h-48 whitespace-pre-wrap">
                            {JSON.stringify(log.dados_novos, null, 2)}
                          </pre>
                        </div>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, Mail, CheckCircle2, XCircle, Search, BellOff } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const EVENTOS_LABEL = {
  limite_vale_atingido: 'Limite de vale atingido',
  backup_gerado: 'Backup gerado',
  backup_falhou: 'Backup falhou',
  fechamento_processado: 'Fechamento processado',
};

const CANAL_ICON = {
  email: <Mail className="w-3.5 h-3.5" />,
  sms: <span className="text-xs font-bold">SMS</span>,
};

export default function LogNotificacoesTab() {
  const [search, setSearch] = useState('');
  const [filtroStatus, setFiltroStatus] = useState('todos');
  const [filtroEvento, setFiltroEvento] = useState('todos');

  const { data: logs = [], isLoading } = useQuery({
    queryKey: ['log-notificacoes'],
    queryFn: () => base44.entities.LogNotificacao.list('-created_date', 200),
  });

  const filtered = logs.filter(l => {
    const matchSearch = !search ||
      l.destinatario_email?.toLowerCase().includes(search.toLowerCase()) ||
      l.destinatario_nome?.toLowerCase().includes(search.toLowerCase()) ||
      l.mensagem?.toLowerCase().includes(search.toLowerCase());
    const matchStatus = filtroStatus === 'todos' || l.status === filtroStatus;
    const matchEvento = filtroEvento === 'todos' || l.evento === filtroEvento;
    return matchSearch && matchStatus && matchEvento;
  });

  const totalEnviados = logs.filter(l => l.status === 'enviado').length;
  const totalErros = logs.filter(l => l.status === 'erro').length;

  return (
    <div className="space-y-4">
      {/* Resumo */}
      <div className="grid grid-cols-3 gap-3">
        <div className="rounded-lg border bg-card p-3 text-center">
          <p className="text-2xl font-bold">{logs.length}</p>
          <p className="text-xs text-muted-foreground mt-0.5">Total de envios</p>
        </div>
        <div className="rounded-lg border bg-green-50 border-green-200 p-3 text-center">
          <p className="text-2xl font-bold text-green-700">{totalEnviados}</p>
          <p className="text-xs text-green-600 mt-0.5">Enviados com sucesso</p>
        </div>
        <div className="rounded-lg border bg-red-50 border-red-200 p-3 text-center">
          <p className="text-2xl font-bold text-red-700">{totalErros}</p>
          <p className="text-xs text-red-600 mt-0.5">Com erro</p>
        </div>
      </div>

      {/* Filtros */}
      <div className="flex flex-col sm:flex-row gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-2.5 top-2.5 w-4 h-4 text-muted-foreground" />
          <Input
            className="pl-8"
            placeholder="Buscar por destinatário ou mensagem..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <Select value={filtroEvento} onValueChange={setFiltroEvento}>
          <SelectTrigger className="w-full sm:w-52">
            <SelectValue placeholder="Evento" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos os eventos</SelectItem>
            {Object.entries(EVENTOS_LABEL).map(([k, v]) => (
              <SelectItem key={k} value={k}>{v}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={filtroStatus} onValueChange={setFiltroStatus}>
          <SelectTrigger className="w-full sm:w-36">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos</SelectItem>
            <SelectItem value="enviado">Enviado</SelectItem>
            <SelectItem value="erro">Erro</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Lista */}
      {isLoading ? (
        <div className="flex justify-center py-10">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-14 text-muted-foreground">
          <BellOff className="w-10 h-10 mx-auto mb-2 opacity-30" />
          <p className="font-medium">Nenhum registro encontrado</p>
          <p className="text-xs mt-1">Os envios de notificações aparecerão aqui automaticamente</p>
        </div>
      ) : (
        <div className="divide-y border rounded-lg overflow-hidden bg-card">
          {filtered.map(log => (
            <div key={log.id} className="flex items-start justify-between px-4 py-3 gap-3 hover:bg-muted/30 transition-colors">
              <div className="flex items-start gap-3 min-w-0">
                <div className={`mt-0.5 shrink-0 ${log.status === 'enviado' ? 'text-green-500' : 'text-destructive'}`}>
                  {log.status === 'enviado'
                    ? <CheckCircle2 className="w-4 h-4" />
                    : <XCircle className="w-4 h-4" />
                  }
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-sm font-medium truncate">
                      {log.destinatario_nome || log.destinatario_email}
                    </p>
                    <Badge variant="outline" className="text-xs flex items-center gap-1 shrink-0">
                      {CANAL_ICON[log.canal]}
                      {log.canal?.toUpperCase()}
                    </Badge>
                    <Badge variant="secondary" className="text-xs shrink-0">
                      {EVENTOS_LABEL[log.evento] || log.evento}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5 truncate">{log.destinatario_email}</p>
                  {log.mensagem && (
                    <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">{log.mensagem}</p>
                  )}
                  {log.erro_detalhes && (
                    <p className="text-xs text-destructive mt-0.5">{log.erro_detalhes}</p>
                  )}
                </div>
              </div>
              <div className="text-xs text-muted-foreground shrink-0 text-right">
                {log.created_date
                  ? format(new Date(log.created_date), "dd/MM/yy HH:mm", { locale: ptBR })
                  : '—'}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
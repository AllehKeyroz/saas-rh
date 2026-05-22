import React, { useState, useEffect, useRef } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { client } from '@/api/client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { Switch } from '@/components/ui/switch';
import { Checkbox } from '@/components/ui/checkbox';
import { Loader2, ClipboardList, CheckCircle2, XCircle, Clock, MessageSquare, Bell, AlertTriangle, FileText, X, Paperclip, ExternalLink, SquareCheck } from 'lucide-react';
import { format } from 'date-fns';
import { registrarAuditoria } from '@/lib/audit';
import FiltrosAvancados from '@/components/solicitacoes/FiltrosAvancados';
import ExportarSolicitacoes from '@/components/solicitacoes/ExportarSolicitacoes';

const TIPO_LABELS = {
  ferias: 'Férias',
  vale: 'Vale',
  banco_horas: 'Banco de Horas',
  atestado: 'Atestado',
  documento: 'Documento',
  outro: 'Outro',
};

const STATUS_CONFIG = {
  pendente: { label: 'Pendente', icon: Clock, color: 'bg-yellow-100 text-yellow-800 border-yellow-200' },
  aprovado: { label: 'Aprovado', icon: CheckCircle2, color: 'bg-green-100 text-green-800 border-green-200' },
  recusado: { label: 'Recusado', icon: XCircle, color: 'bg-red-100 text-red-800 border-red-200' },
};

const TIPOS_URGENTES = ['atestado', 'documento'];

// Exibe os anexos de uma solicitação
function AnexosView({ solicitacao }) {
  const anexos = solicitacao.anexos_urls || [];
  // retrocompatibilidade com comprovante_url simples
  const legado = solicitacao.comprovante_url && !anexos.length
    ? [{ nome: 'Arquivo anexado', url: solicitacao.comprovante_url }]
    : [];
  const todos = [...anexos, ...legado];
  if (!todos.length) return null;

  return (
    <div className="flex flex-wrap gap-2 mt-1">
      {todos.map((a, idx) => (
        <a key={idx} href={a.url} target="_blank" rel="noopener noreferrer"
          className="flex items-center gap-1.5 text-xs bg-primary/5 text-primary border border-primary/20 rounded-md px-2 py-1 hover:bg-primary/10 transition-colors">
          <Paperclip className="w-3 h-3 shrink-0" />
          <span className="max-w-[120px] truncate">{a.nome}</span>
          <ExternalLink className="w-3 h-3 shrink-0 opacity-60" />
        </a>
      ))}
    </div>
  );
}

function ResponderModal({ solicitacao, onClose, onSaved, meUser }) {
  const [status, setStatus] = useState(solicitacao.status === 'pendente' ? 'aprovado' : solicitacao.status);
  const [resposta, setResposta] = useState(solicitacao.resposta_rh || '');
  const [enviarPush, setEnviarPush] = useState(false);
  const [saving, setSaving] = useState(false);
  const queryClient = useQueryClient();

  const handleSalvar = async () => {
    setSaving(true);
    const agora = new Date().toISOString();
    await client.entities.SolicitacoesFuncionario.update(solicitacao.id, {
      status,
      resposta_rh: resposta,
      respondido_por: meUser?.email || '',
      data_resposta: agora,
      push_enviado: enviarPush,
    });

    const tipoLabel = TIPO_LABELS[solicitacao.tipo_solicitacao] || 'solicitação';
    await client.entities.MensagensRH.create({
      titulo: `Sua solicitação de ${tipoLabel} foi ${status === 'aprovado' ? 'aprovada' : 'recusada'}`,
      mensagem: resposta || `Sua solicitação de ${tipoLabel} foi ${status === 'aprovado' ? 'aprovada' : 'recusada'} pelo RH.`,
      tipo: status === 'aprovado' ? 'comunicado' : 'aviso',
      data_envio: agora,
      enviado_por: meUser?.email || '',
      publico_alvo: 'funcionario',
      funcionario_id_alvo: solicitacao.funcionario_id,
      push_ativado: enviarPush,
      lidas_por: [],
    });

    await registrarAuditoria({
      acao: 'editar',
      modulo: 'lancamento',
      descricao: `Solicitação de ${tipoLabel} de ${solicitacao.funcionario_nome} foi ${status} por ${meUser?.email}`,
      dados_anteriores: { status: solicitacao.status },
      dados_novos: { status, resposta_rh: resposta },
    });

    queryClient.invalidateQueries({ queryKey: ['solicitacoes_rh'] });
    toast.success(`Solicitação ${status === 'aprovado' ? 'aprovada' : 'recusada'} com sucesso!`);
    setSaving(false);
    onSaved();
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Responder Solicitação</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="bg-muted/50 rounded-lg p-3 space-y-1.5 text-sm">
            <p><span className="text-muted-foreground">Funcionário:</span> <span className="font-medium">{solicitacao.funcionario_nome}</span></p>
            <p><span className="text-muted-foreground">Tipo:</span> <span className="font-medium">{TIPO_LABELS[solicitacao.tipo_solicitacao]}</span></p>
            {solicitacao.descricao && <p><span className="text-muted-foreground">Descrição:</span> {solicitacao.descricao}</p>}
            {solicitacao.valor_solicitado && <p><span className="text-muted-foreground">Valor:</span> R$ {solicitacao.valor_solicitado.toFixed(2)}</p>}
            {solicitacao.horas_compensar && <p><span className="text-muted-foreground">Horas a compensar:</span> {solicitacao.horas_compensar}h</p>}
            {solicitacao.periodo_inicio && (
              <p><span className="text-muted-foreground">Período:</span> {format(new Date(solicitacao.periodo_inicio), 'dd/MM/yyyy')}
                {solicitacao.periodo_fim ? ` → ${format(new Date(solicitacao.periodo_fim), 'dd/MM/yyyy')}` : ''}
              </p>
            )}
            {solicitacao.tipo_documento && <p><span className="text-muted-foreground">Documento:</span> {solicitacao.tipo_documento}</p>}
            <AnexosView solicitacao={solicitacao} />
          </div>

          <div>
            <Label>Decisão</Label>
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="aprovado">✅ Aprovar</SelectItem>
                <SelectItem value="recusado">❌ Recusar</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label>Resposta do RH</Label>
            <Textarea value={resposta} onChange={e => setResposta(e.target.value)} placeholder="Escreva a resposta para o funcionário..." rows={3} />
          </div>

          <div className="flex items-center gap-3 bg-muted/50 rounded-lg px-4 py-3">
            <Bell className="w-4 h-4 text-muted-foreground" />
            <div className="flex-1">
              <p className="text-sm font-medium">Enviar Push</p>
              <p className="text-xs text-muted-foreground">Notificar funcionário sobre a resposta</p>
            </div>
            <Switch checked={enviarPush} onCheckedChange={setEnviarPush} />
          </div>

          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={onClose}>Cancelar</Button>
            <Button onClick={handleSalvar} disabled={saving}>
              {saving && <Loader2 className="w-4 h-4 animate-spin" />}
              Salvar Resposta
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// Modal para resposta em lote
function ResponderLoteModal({ selecionadas, solicitacoes, onClose, onSaved, meUser }) {
  const [status, setStatus] = useState('aprovado');
  const [resposta, setResposta] = useState('');
  const [saving, setSaving] = useState(false);
  const queryClient = useQueryClient();

  const items = solicitacoes.filter(s => selecionadas.includes(s.id));

  const handleSalvar = async () => {
    setSaving(true);
    const agora = new Date().toISOString();
    await Promise.all(items.map(async (s) => {
      const tipoLabel = TIPO_LABELS[s.tipo_solicitacao] || 'solicitação';
      await client.entities.SolicitacoesFuncionario.update(s.id, {
        status,
        resposta_rh: resposta,
        respondido_por: meUser?.email || '',
        data_resposta: agora,
      });
      await client.entities.MensagensRH.create({
        titulo: `Sua solicitação de ${tipoLabel} foi ${status === 'aprovado' ? 'aprovada' : 'recusada'}`,
        mensagem: resposta || `Sua solicitação de ${tipoLabel} foi ${status === 'aprovado' ? 'aprovada' : 'recusada'} pelo RH.`,
        tipo: status === 'aprovado' ? 'comunicado' : 'aviso',
        data_envio: agora,
        enviado_por: meUser?.email || '',
        publico_alvo: 'funcionario',
        funcionario_id_alvo: s.funcionario_id,
        push_ativado: false,
        lidas_por: [],
      });
    }));
    queryClient.invalidateQueries({ queryKey: ['solicitacoes_rh'] });
    toast.success(`${items.length} solicitação(ões) ${status === 'aprovado' ? 'aprovadas' : 'recusadas'}!`);
    setSaving(false);
    onSaved();
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <SquareCheck className="w-5 h-5 text-primary" />
            Responder em Lote ({items.length})
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="bg-muted/50 rounded-lg p-3 space-y-1 max-h-40 overflow-y-auto">
            {items.map(s => (
              <div key={s.id} className="flex items-center gap-2 text-sm">
                <span className="font-medium truncate">{s.funcionario_nome}</span>
                <Badge variant="outline" className="text-xs shrink-0">{TIPO_LABELS[s.tipo_solicitacao]}</Badge>
              </div>
            ))}
          </div>

          <div>
            <Label>Decisão para todas</Label>
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="aprovado">✅ Aprovar todas</SelectItem>
                <SelectItem value="recusado">❌ Recusar todas</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label>Mensagem de resposta (mesma para todas)</Label>
            <Textarea value={resposta} onChange={e => setResposta(e.target.value)} placeholder="Escreva uma resposta para os funcionários..." rows={3} />
          </div>

          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={onClose}>Cancelar</Button>
            <Button onClick={handleSalvar} disabled={saving}>
              {saving && <Loader2 className="w-4 h-4 animate-spin" />}
              Confirmar Respostas
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function AlertasUrgentes({ solicitacoes, onResponder }) {
  const urgentes = solicitacoes.filter(s => s.status === 'pendente' && TIPOS_URGENTES.includes(s.tipo_solicitacao));
  if (urgentes.length === 0) return null;

  return (
    <div className="bg-orange-50 border border-orange-200 rounded-xl p-4 space-y-3">
      <div className="flex items-center gap-2 text-orange-800">
        <AlertTriangle className="w-5 h-5" />
        <span className="font-semibold text-sm">{urgentes.length} solicitação(ões) urgente(s) aguardando atenção</span>
      </div>
      <div className="space-y-2">
        {urgentes.map(s => (
          <div key={s.id} className="flex items-center justify-between bg-white rounded-lg px-3 py-2 border border-orange-100">
            <div className="flex items-center gap-2 text-sm flex-wrap">
              <FileText className="w-4 h-4 text-orange-600" />
              <span className="font-medium">{s.funcionario_nome}</span>
              <span className="text-muted-foreground">— {TIPO_LABELS[s.tipo_solicitacao]}</span>
              {s.created_date && <span className="text-xs text-muted-foreground">({format(new Date(s.created_date), 'dd/MM HH:mm')})</span>}
              {(s.anexos_urls?.length > 0 || s.comprovante_url) && (
                <span className="flex items-center gap-0.5 text-xs text-orange-600">
                  <Paperclip className="w-3 h-3" />
                  {s.anexos_urls?.length || 1} anexo(s)
                </span>
              )}
            </div>
            <Button size="sm" variant="outline" className="border-orange-300 text-orange-700 hover:bg-orange-50 text-xs shrink-0" onClick={() => onResponder(s)}>
              Responder
            </Button>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function Solicitacoes() {
  const [filtros, setFiltros] = useState({ status: 'todos', tipo: 'todos', funcionario: '', dataInicio: '', dataFim: '' });
  const [respondendo, setRespondendo] = useState(null);
  const [novasAlertas, setNovasAlertas] = useState([]);
  const [respostaInline, setRespostaInline] = useState({});
  const [expandidoId, setExpandidoId] = useState(null);
  const [savingInline, setSavingInline] = useState(null);
  const [selecionadas, setSelecionadas] = useState([]);
  const [loteModalOpen, setLoteModalOpen] = useState(false);
  const queryClient = useQueryClient();
  const isFirstLoad = useRef(true);

  const { data: solicitacoes = [], isLoading } = useQuery({
    queryKey: ['solicitacoes_rh'],
    queryFn: () => client.entities.SolicitacoesFuncionario.list('-created_date', 200),
  });

  const { data: meUser } = useQuery({
    queryKey: ['me_user'],
    queryFn: () => client.auth.me(),
  });

  useEffect(() => {
    const unsubscribe = client.entities.SolicitacoesFuncionario.subscribe((event) => {
      if (event.type === 'create') {
        if (isFirstLoad.current) return;
        const nova = event.data;
        queryClient.invalidateQueries({ queryKey: ['solicitacoes_rh'] });
        const tipoLabel = TIPO_LABELS[nova.tipo_solicitacao] || nova.tipo_solicitacao;
        const isUrgente = TIPOS_URGENTES.includes(nova.tipo_solicitacao);
        const msg = `${nova.funcionario_nome || 'Funcionário'} enviou uma nova solicitação.${isUrgente ? ' ⚠️ Requer atenção!' : ''}`;
        if (isUrgente) {
          toast.error(`Nova solicitação de ${tipoLabel}: ${msg}`);
        } else {
          toast.success(`Nova solicitação de ${tipoLabel}: ${msg}`);
        }
        if (nova.status === 'pendente') setNovasAlertas(prev => [nova, ...prev]);
      }
      if (event.type === 'update') queryClient.invalidateQueries({ queryKey: ['solicitacoes_rh'] });
    });
    const timer = setTimeout(() => { isFirstLoad.current = false; }, 2000);
    return () => { unsubscribe(); clearTimeout(timer); };
    }, [queryClient]);

  const filtradas = solicitacoes.filter(s => {
    const okStatus = filtros.status === 'todos' || s.status === filtros.status;
    const okTipo = filtros.tipo === 'todos' || s.tipo_solicitacao === filtros.tipo;
    const okNome = !filtros.funcionario || (s.funcionario_nome || '').toLowerCase().includes(filtros.funcionario.toLowerCase());
    const dataEnvio = s.created_date ? new Date(s.created_date) : null;
    const okDataInicio = !filtros.dataInicio || (dataEnvio && dataEnvio >= new Date(filtros.dataInicio));
    const okDataFim = !filtros.dataFim || (dataEnvio && dataEnvio <= new Date(filtros.dataFim + 'T23:59:59'));
    return okStatus && okTipo && okNome && okDataInicio && okDataFim;
  });

  const labelPeriodo = filtros.dataInicio && filtros.dataFim
    ? `${filtros.dataInicio}_${filtros.dataFim}`
    : filtros.dataInicio ? `de_${filtros.dataInicio}`
    : filtros.dataFim ? `ate_${filtros.dataFim}` : '';

  const pendentes = solicitacoes.filter(s => s.status === 'pendente').length;
  const pendentesUrgentes = solicitacoes.filter(s => s.status === 'pendente' && TIPOS_URGENTES.includes(s.tipo_solicitacao)).length;
  const pendentesFiltradas = filtradas.filter(s => s.status === 'pendente');

  const toggleSelecionada = (id) => {
    setSelecionadas(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  const toggleTodos = () => {
    const idsPendentes = pendentesFiltradas.map(s => s.id);
    const todosSelecionados = idsPendentes.length > 0 && idsPendentes.every(id => selecionadas.includes(id));
    setSelecionadas(todosSelecionados ? selecionadas.filter(id => !idsPendentes.includes(id)) : [...new Set([...selecionadas, ...idsPendentes])]);
  };

  const handleFiltrosChange = (novosFiltros) => {
    setFiltros(novosFiltros);
    setSelecionadas([]);
  };

  const handleResponderInline = async (s, novoStatus) => {
    setSavingInline(s.id);
    const agora = new Date().toISOString();
    const texto = respostaInline[s.id] || '';
    await client.entities.SolicitacoesFuncionario.update(s.id, {
      status: novoStatus,
      resposta_rh: texto,
      respondido_por: meUser?.email || '',
      data_resposta: agora,
    });
    const tipoLabel = TIPO_LABELS[s.tipo_solicitacao] || 'solicitação';
    await client.entities.MensagensRH.create({
      titulo: `Sua solicitação de ${tipoLabel} foi ${novoStatus === 'aprovado' ? 'aprovada' : 'recusada'}`,
      mensagem: texto || `Sua solicitação de ${tipoLabel} foi ${novoStatus === 'aprovado' ? 'aprovada' : 'recusada'} pelo RH.`,
      tipo: novoStatus === 'aprovado' ? 'comunicado' : 'aviso',
      data_envio: agora,
      enviado_por: meUser?.email || '',
      publico_alvo: 'funcionario',
      funcionario_id_alvo: s.funcionario_id,
      push_ativado: false,
      lidas_por: [],
    });
    queryClient.invalidateQueries({ queryKey: ['solicitacoes_rh'] });
    setExpandidoId(null);
    setRespostaInline(prev => { const n = { ...prev }; delete n[s.id]; return n; });
    toast.success(`Solicitação ${novoStatus === 'aprovado' ? 'aprovada' : 'recusada'}!`);
    setSavingInline(null);
  };

  const handleAprovarRapido = async (s, novoStatus) => {
    const agora = new Date().toISOString();
    await client.entities.SolicitacoesFuncionario.update(s.id, {
      status: novoStatus,
      respondido_por: meUser?.email || '',
      data_resposta: agora,
    });
    const tipoLabel = TIPO_LABELS[s.tipo_solicitacao] || 'solicitação';
    await client.entities.MensagensRH.create({
      titulo: `Sua solicitação de ${tipoLabel} foi ${novoStatus === 'aprovado' ? 'aprovada' : 'recusada'}`,
      mensagem: `Sua solicitação de ${tipoLabel} foi ${novoStatus === 'aprovado' ? 'aprovada' : 'recusada'} pelo RH.`,
      tipo: novoStatus === 'aprovado' ? 'comunicado' : 'aviso',
      data_envio: agora,
      enviado_por: meUser?.email || '',
      publico_alvo: 'funcionario',
      funcionario_id_alvo: s.funcionario_id,
      push_ativado: false,
      lidas_por: [],
    });
    queryClient.invalidateQueries({ queryKey: ['solicitacoes_rh'] });
    toast.success(`Solicitação ${novoStatus === 'aprovado' ? 'aprovada' : 'recusada'}!`);
    };

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold">Solicitações dos Funcionários</h1>
          <p className="text-muted-foreground text-sm">Gerencie e responda as solicitações</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {pendentesUrgentes > 0 && (
            <Badge className="bg-orange-100 text-orange-800 border-orange-200 text-sm px-3 py-1">
              <AlertTriangle className="w-3.5 h-3.5 mr-1" />{pendentesUrgentes} urgente(s)
            </Badge>
          )}
          {pendentes > 0 && (
            <Badge className="bg-yellow-100 text-yellow-800 border-yellow-200 text-sm px-3 py-1">
              <Clock className="w-3.5 h-3.5 mr-1" />{pendentes} pendente(s)
            </Badge>
          )}
          <ExportarSolicitacoes solicitacoes={filtradas} labelPeriodo={labelPeriodo} />
        </div>
      </div>

      <AlertasUrgentes solicitacoes={solicitacoes} onResponder={setRespondendo} />

      {novasAlertas.length > 0 && (
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2 text-blue-800">
              <Bell className="w-4 h-4" />
              <span className="font-semibold text-sm">{novasAlertas.length} nova(s) solicitação(ões) recebida(s)</span>
            </div>
            <button onClick={() => setNovasAlertas([])} className="text-blue-400 hover:text-blue-600">
              <X className="w-4 h-4" />
            </button>
          </div>
          <div className="space-y-1">
            {novasAlertas.map(s => (
              <div key={s.id} className="flex items-center justify-between text-sm">
                <span className="text-blue-700">{s.funcionario_nome} — {TIPO_LABELS[s.tipo_solicitacao]}</span>
                <Button size="sm" variant="ghost" className="text-blue-700 h-7 text-xs" onClick={() => { setRespondendo(s); setNovasAlertas(prev => prev.filter(a => a.id !== s.id)); }}>
                  Ver
                </Button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Filtros avançados */}
      <FiltrosAvancados
        filtros={filtros}
        onChange={handleFiltrosChange}
        totalFiltradas={filtradas.length}
        totalGeral={solicitacoes.length}
      />

      {/* Barra de seleção em lote */}
      {pendentesFiltradas.length > 0 && (
        <div className="flex items-center gap-2">
          <button
            onClick={toggleTodos}
            className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <Checkbox
              checked={pendentesFiltradas.length > 0 && pendentesFiltradas.every(s => selecionadas.includes(s.id))}
              className="w-4 h-4"
            />
            Selecionar pendentes
          </button>
          {selecionadas.length > 0 && (
            <Button size="sm" className="gap-1.5" onClick={() => setLoteModalOpen(true)}>
              <SquareCheck className="w-4 h-4" />
              Responder {selecionadas.length} em lote
            </Button>
          )}
        </div>
      )}

      {isLoading ? (
        <div className="flex justify-center py-16"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>
      ) : filtradas.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <ClipboardList className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p className="font-medium">Nenhuma solicitação encontrada</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtradas.map(s => {
            const st = STATUS_CONFIG[s.status] || STATUS_CONFIG.pendente;
            const StatusIcon = st.icon;
            const isUrgente = TIPOS_URGENTES.includes(s.tipo_solicitacao) && s.status === 'pendente';
            const isSelecionada = selecionadas.includes(s.id);
            const temAnexos = (s.anexos_urls?.length > 0) || !!s.comprovante_url;

            return (
              <div key={s.id} className={`bg-card border rounded-xl p-4 transition-colors ${isUrgente ? 'border-orange-300 bg-orange-50/30' : ''} ${isSelecionada ? 'ring-2 ring-primary/40 border-primary/40' : ''}`}>
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-3 flex-1 min-w-0">
                    {/* Checkbox para seleção (apenas pendentes) */}
                    {s.status === 'pendente' && (
                      <div className="pt-0.5 shrink-0">
                        <Checkbox
                          checked={isSelecionada}
                          onCheckedChange={() => toggleSelecionada(s.id)}
                        />
                      </div>
                    )}
                    <div className="flex-1 space-y-2 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        {isUrgente && <AlertTriangle className="w-4 h-4 text-orange-500 shrink-0" />}
                        <span className="font-semibold text-sm">{s.funcionario_nome || 'Funcionário'}</span>
                        <Badge variant="outline" className="text-xs">{TIPO_LABELS[s.tipo_solicitacao] || s.tipo_solicitacao}</Badge>
                        <Badge className={`text-xs flex items-center gap-1 ${st.color}`}>
                          <StatusIcon className="w-3 h-3" />{st.label}
                        </Badge>
                        {temAnexos && (
                          <span className="flex items-center gap-1 text-xs text-muted-foreground">
                            <Paperclip className="w-3 h-3" />
                            {s.anexos_urls?.length || 1}
                          </span>
                        )}
                      </div>
                      {s.titulo && <p className="text-sm font-medium">{s.titulo}</p>}
                      {s.descricao && <p className="text-sm text-muted-foreground">{s.descricao}</p>}
                      <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                        {s.valor_solicitado && <span>Valor: R$ {s.valor_solicitado.toFixed(2)}</span>}
                        {s.periodo_inicio && <span>Início: {format(new Date(s.periodo_inicio), 'dd/MM/yyyy')}</span>}
                        {s.periodo_fim && <span>Fim: {format(new Date(s.periodo_fim), 'dd/MM/yyyy')}</span>}
                        {s.tipo_documento && <span>Doc: {s.tipo_documento}</span>}
                        {s.created_date && <span>Enviado: {format(new Date(s.created_date), 'dd/MM/yyyy HH:mm')}</span>}
                      </div>
                      <AnexosView solicitacao={s} />
                      {s.resposta_rh && (
                        <div className="bg-muted/50 rounded-lg px-3 py-2 text-xs">
                          <span className="font-medium">Resposta RH: </span>{s.resposta_rh}
                          {s.respondido_por && <span className="text-muted-foreground ml-1">— {s.respondido_por}</span>}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex flex-col gap-2 shrink-0">
                    {s.status === 'pendente' ? (
                      <>
                        <Button size="sm" className="bg-green-600 hover:bg-green-700 text-white gap-1 text-xs h-8"
                          onClick={() => setExpandidoId(expandidoId === s.id ? null : s.id)}>
                          <CheckCircle2 className="w-3.5 h-3.5" /> Responder
                        </Button>
                        <Button size="sm" variant="outline" className="border-red-300 text-red-600 hover:bg-red-50 gap-1 text-xs h-8"
                          onClick={() => handleAprovarRapido(s, 'recusado')}>
                          <XCircle className="w-3.5 h-3.5" /> Recusar
                        </Button>
                      </>
                    ) : (
                      <Button size="sm" variant="outline" onClick={() => setRespondendo(s)} className="gap-2">
                        <MessageSquare className="w-3.5 h-3.5" /> Editar
                      </Button>
                    )}
                  </div>
                </div>

                {/* Painel de resposta inline */}
                {expandidoId === s.id && s.status === 'pendente' && (
                  <div className="mt-3 pt-3 border-t space-y-3">
                    <div>
                      <Label className="text-xs text-muted-foreground mb-1 block">Mensagem de resposta ao funcionário (opcional)</Label>
                      <Textarea
                        rows={3}
                        placeholder="Escreva uma mensagem para o funcionário..."
                        value={respostaInline[s.id] || ''}
                        onChange={e => setRespostaInline(prev => ({ ...prev, [s.id]: e.target.value }))}
                        className="text-sm"
                      />
                    </div>
                    <div className="flex gap-2 justify-end">
                      <Button size="sm" variant="ghost" className="text-xs" onClick={() => setExpandidoId(null)}>
                        Cancelar
                      </Button>
                      <Button size="sm" variant="outline" className="border-red-300 text-red-600 hover:bg-red-50 gap-1 text-xs"
                        disabled={savingInline === s.id}
                        onClick={() => handleResponderInline(s, 'recusado')}>
                        {savingInline === s.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <XCircle className="w-3.5 h-3.5" />}
                        Recusar
                      </Button>
                      <Button size="sm" className="bg-green-600 hover:bg-green-700 text-white gap-1 text-xs"
                        disabled={savingInline === s.id}
                        onClick={() => handleResponderInline(s, 'aprovado')}>
                        {savingInline === s.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
                        Aprovar
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {respondendo && (
        <ResponderModal
          solicitacao={respondendo}
          meUser={meUser}
          onClose={() => setRespondendo(null)}
          onSaved={() => setRespondendo(null)}
        />
      )}

      {loteModalOpen && (
        <ResponderLoteModal
          selecionadas={selecionadas}
          solicitacoes={solicitacoes}
          meUser={meUser}
          onClose={() => setLoteModalOpen(false)}
          onSaved={() => { setLoteModalOpen(false); setSelecionadas([]); }}
        />
      )}
    </div>
  );
}
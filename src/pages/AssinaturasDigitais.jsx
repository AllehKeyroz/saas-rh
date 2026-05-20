import React, { useState } from 'react';
import { client } from '@/api/client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Send, Clock, CheckCircle2, FileText, History, XCircle, Download, RotateCcw, LayoutDashboard, ShieldCheck } from 'lucide-react';
import AuditoriaDocumentoDrawer from '@/components/auditoria/AuditoriaDocumentoDrawer';
import EnviarDocumentoDialog from '@/components/assinaturas/EnviarDocumentoDialog';
import PainelResumoFuncionarios from '@/components/assinaturas/PainelResumoFuncionarios';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { registrarAuditoria, ACOES } from '@/lib/auditoriaDocumentos';

const STATUS_CONFIG = {
  aguardando: { label: 'Aguardando', color: 'bg-yellow-100 text-yellow-800 border-yellow-200', icon: Clock },
  assinado:   { label: 'Assinado',   color: 'bg-green-100 text-green-800 border-green-200',   icon: CheckCircle2 },
  recusado:   { label: 'Recusado',   color: 'bg-red-100 text-red-800 border-red-200',          icon: XCircle },
  expirado:   { label: 'Expirado',   color: 'bg-gray-100 text-gray-600 border-gray-200',       icon: Clock },
  cancelado:  { label: 'Cancelado',  color: 'bg-gray-100 text-gray-500 border-gray-200',       icon: XCircle },
};

function StatusBadge({ status }) {
  const cfg = STATUS_CONFIG[status] || STATUS_CONFIG.aguardando;
  const Icon = cfg.icon;
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${cfg.color}`}>
      <Icon className="w-3 h-3" />
      {cfg.label}
    </span>
  );
}

function AssinaturaRow({ doc, onReenviar, onCancelar, onVerAuditoria }) {
  const fmtDate = (d) => d ? format(new Date(d), 'dd/MM/yyyy HH:mm', { locale: ptBR }) : '—';

  return (
    <tr className="border-b border-border hover:bg-muted/30 transition-colors">
      <td className="px-4 py-3">
        <div>
          <p className="font-medium text-sm text-foreground">{doc.nome_documento}</p>
          {doc.descricao && <p className="text-xs text-muted-foreground mt-0.5">{doc.descricao}</p>}
        </div>
      </td>
      <td className="px-4 py-3 text-sm text-foreground">{doc.funcionario_nome}</td>
      <td className="px-4 py-3 text-xs text-muted-foreground">{fmtDate(doc.data_envio)}</td>
      <td className="px-4 py-3 text-xs text-muted-foreground">{fmtDate(doc.data_assinatura)}</td>
      <td className="px-4 py-3"><StatusBadge status={doc.status} /></td>
      <td className="px-4 py-3">
        <div className="flex items-center gap-1">
          {doc.documento_url && (
            <a href={doc.documento_url} target="_blank" rel="noopener noreferrer">
              <Button size="sm" variant="ghost" className="h-8 px-2 text-xs gap-1">
                <FileText className="w-3.5 h-3.5" />Original
              </Button>
            </a>
          )}
          {doc.documento_assinado_url && (
            <a href={doc.documento_assinado_url} target="_blank" rel="noopener noreferrer">
              <Button size="sm" variant="ghost" className="h-8 px-2 text-xs gap-1 text-green-700">
                <Download className="w-3.5 h-3.5" />Assinado
              </Button>
            </a>
          )}
          {doc.status === 'aguardando' && (
            <>
              <Button size="sm" variant="ghost" className="h-8 px-2 text-xs gap-1 text-blue-700" onClick={() => onReenviar(doc)}>
                <RotateCcw className="w-3.5 h-3.5" />Reenviar
              </Button>
              <Button size="sm" variant="ghost" className="h-8 px-2 text-xs gap-1 text-destructive" onClick={() => onCancelar(doc)}>
                <XCircle className="w-3.5 h-3.5" />Cancelar
              </Button>
            </>
          )}
          <Button size="sm" variant="ghost" className="h-8 px-2 text-xs gap-1 text-muted-foreground" onClick={() => onVerAuditoria(doc)}>
            <ShieldCheck className="w-3.5 h-3.5" />Auditoria
          </Button>
        </div>
      </td>
    </tr>
  );
}

function StatsCard({ icon: Icon, label, value, color }) {
  return (
    <div className="bg-card border border-border rounded-xl p-4 flex items-center gap-4">
      <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${color}`}>
        <Icon className="w-6 h-6 text-white" />
      </div>
      <div>
        <p className="text-2xl font-bold text-foreground">{value}</p>
        <p className="text-xs text-muted-foreground">{label}</p>
      </div>
    </div>
  );
}

export default function AssinaturasDigitais() {
  const queryClient = useQueryClient();
  const [enviarOpen, setEnviarOpen] = useState(false);
  const [tab, setTab] = useState('painel');
  const [auditoriaDoc, setAuditoriaDoc] = useState(null);

  const { data: assinaturas = [], isLoading } = useQuery({
    queryKey: ['assinaturas'],
    queryFn: () => client.entities.AssinaturaDigital.list('-data_envio'),
  });

  const { data: funcionarios = [] } = useQuery({
    queryKey: ['funcionarios'],
    queryFn: () => client.entities.Funcionarios.filter({ ativo: true }),
  });

  const aguardando = assinaturas.filter(a => a.status === 'aguardando');
  const assinados  = assinaturas.filter(a => a.status === 'assinado');
  const outros     = assinaturas.filter(a => !['aguardando','assinado'].includes(a.status));

  const handleCancelar = async (doc) => {
    if (!confirm(`Cancelar a solicitação de assinatura de "${doc.nome_documento}"?`)) return;
    await client.entities.AssinaturaDigital.update(doc.id, { status: 'cancelado' });
    await registrarAuditoria({
      acao: ACOES.CANCELAR_ASSINATURA, modulo: 'assinatura', origem: 'rh',
      descricao: `Solicitação de assinatura de "${doc.nome_documento}" cancelada para ${doc.funcionario_nome}.`,
      documento_id: doc.id, funcionario_id: doc.funcionario_id, funcionario_nome: doc.funcionario_nome,
      nome_documento: doc.nome_documento, dados_antes: { status: doc.status }, dados_depois: { status: 'cancelado' },
    });
    queryClient.invalidateQueries({ queryKey: ['assinaturas'] });
  };

  const handleReenviar = async (doc) => {
    await client.entities.AssinaturaDigital.update(doc.id, { data_envio: new Date().toISOString() });
    await registrarAuditoria({
      acao: ACOES.REENVIAR_LINK, modulo: 'assinatura', origem: 'rh',
      descricao: `Link de assinatura reenviado para ${doc.funcionario_nome} — documento "${doc.nome_documento}".`,
      documento_id: doc.id, funcionario_id: doc.funcionario_id, funcionario_nome: doc.funcionario_nome,
      nome_documento: doc.nome_documento,
    });
    queryClient.invalidateQueries({ queryKey: ['assinaturas'] });
    alert('Notificação reenviada para ' + doc.funcionario_nome);
  };

  const handleEnviadoComSucesso = () => {
    queryClient.invalidateQueries({ queryKey: ['assinaturas'] });
    setEnviarOpen(false);
    setTab('acompanhar');
  };

  const TableView = ({ rows }) => (
    <div className="overflow-x-auto border border-border rounded-xl bg-card">
      {rows.length === 0 ? (
        <div className="py-16 text-center text-muted-foreground">
          <FileText className="w-10 h-10 mx-auto mb-2 opacity-30" />
          <p className="text-sm">Nenhum documento aqui</p>
        </div>
      ) : (
        <table className="w-full">
          <thead>
            <tr className="bg-muted/50 text-xs text-muted-foreground uppercase tracking-wide">
              <th className="px-4 py-3 text-left">Documento</th>
              <th className="px-4 py-3 text-left">Funcionário</th>
              <th className="px-4 py-3 text-left">Enviado em</th>
              <th className="px-4 py-3 text-left">Assinado em</th>
              <th className="px-4 py-3 text-left">Status</th>
              <th className="px-4 py-3 text-left">Ações</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(doc => (
              <AssinaturaRow key={doc.id} doc={doc} onReenviar={handleReenviar} onCancelar={handleCancelar} onVerAuditoria={d => setAuditoriaDoc(d)} />
            ))}
          </tbody>
        </table>
      )}
    </div>
  );

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Assinaturas Digitais</h1>
          <p className="text-sm text-muted-foreground">Envie e acompanhe documentos para assinatura via GovBR</p>
        </div>
        <Button onClick={() => setEnviarOpen(true)} className="gap-2 shrink-0">
          <Send className="w-4 h-4" />
          Enviar Documento
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <StatsCard icon={FileText}     label="Total"      value={assinaturas.length} color="bg-blue-500" />
        <StatsCard icon={Clock}        label="Aguardando" value={aguardando.length}  color="bg-yellow-500" />
        <StatsCard icon={CheckCircle2} label="Assinados"  value={assinados.length}   color="bg-green-500" />
        <StatsCard icon={XCircle}      label="Outros"     value={outros.length}       color="bg-gray-400" />
      </div>

      {/* Tabs */}
      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="painel" className="gap-2"><LayoutDashboard className="w-4 h-4" />Painel</TabsTrigger>
          <TabsTrigger value="acompanhar" className="gap-2"><Clock className="w-4 h-4" />Aguardando ({aguardando.length})</TabsTrigger>
          <TabsTrigger value="assinados" className="gap-2"><CheckCircle2 className="w-4 h-4" />Assinados ({assinados.length})</TabsTrigger>
          <TabsTrigger value="historico" className="gap-2"><History className="w-4 h-4" />Histórico</TabsTrigger>
        </TabsList>

        <TabsContent value="painel" className="mt-4">
          <PainelResumoFuncionarios assinaturas={assinaturas} filtro={null} />
        </TabsContent>
        <TabsContent value="acompanhar" className="mt-4">
          <TableView rows={aguardando} />
        </TabsContent>
        <TabsContent value="assinados" className="mt-4">
          <TableView rows={assinados} />
        </TabsContent>
        <TabsContent value="historico" className="mt-4">
          <TableView rows={assinaturas} />
        </TabsContent>
      </Tabs>

      <AuditoriaDocumentoDrawer
        open={!!auditoriaDoc}
        onClose={() => setAuditoriaDoc(null)}
        documentoId={auditoriaDoc?.id}
        nomeDocumento={auditoriaDoc?.nome_documento}
      />

      <EnviarDocumentoDialog
        open={enviarOpen}
        onClose={() => setEnviarOpen(false)}
        funcionarios={funcionarios}
        onSucesso={handleEnviadoComSucesso}
      />
    </div>
  );
}
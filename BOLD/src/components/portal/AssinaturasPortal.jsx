import React from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Clock, CheckCircle2, XCircle, FileText, Download, ExternalLink, PenLine } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const STATUS_CONFIG = {
  aguardando: { label: 'Aguardando Assinatura', color: 'bg-yellow-100 text-yellow-800 border-yellow-200', icon: Clock },
  assinado:   { label: 'Assinado',              color: 'bg-green-100 text-green-800 border-green-200',   icon: CheckCircle2 },
  recusado:   { label: 'Recusado',              color: 'bg-red-100 text-red-800 border-red-200',          icon: XCircle },
  expirado:   { label: 'Expirado',              color: 'bg-gray-100 text-gray-600 border-gray-200',       icon: Clock },
  cancelado:  { label: 'Cancelado',             color: 'bg-gray-100 text-gray-500 border-gray-200',       icon: XCircle },
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

export default function AssinaturasPortal({ funcionario }) {
  const { data: assinaturas = [], isLoading } = useQuery({
    queryKey: ['assinaturas-portal', funcionario?.id],
    queryFn: () => base44.entities.AssinaturaDigital.filter({ funcionario_id: funcionario.id }, '-data_envio'),
    enabled: !!funcionario?.id,
  });

  const pendentes  = assinaturas.filter(a => a.status === 'aguardando');
  const assinados  = assinaturas.filter(a => a.status === 'assinado');
  const historico  = assinaturas.filter(a => !['aguardando'].includes(a.status));

  const fmtDate = (d) => d ? format(new Date(d), 'dd/MM/yyyy', { locale: ptBR }) : '—';

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20 text-muted-foreground">
        <div className="w-6 h-6 border-2 border-muted border-t-primary rounded-full animate-spin mr-2" />
        Carregando...
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-bold text-foreground">Assinaturas Digitais</h2>
        <p className="text-sm text-muted-foreground">Documentos enviados pelo RH para sua assinatura</p>
      </div>

      {/* Pendentes */}
      {pendentes.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-yellow-500 animate-pulse" />
            <h3 className="font-semibold text-sm text-foreground">Aguardando sua assinatura ({pendentes.length})</h3>
          </div>
          <div className="space-y-3">
            {pendentes.map(doc => (
              <div key={doc.id} className="bg-yellow-50 border border-yellow-200 rounded-xl p-4 space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-lg bg-yellow-100 flex items-center justify-center shrink-0">
                      <FileText className="w-5 h-5 text-yellow-700" />
                    </div>
                    <div>
                      <p className="font-semibold text-sm text-foreground">{doc.nome_documento}</p>
                      {doc.descricao && <p className="text-xs text-muted-foreground mt-0.5">{doc.descricao}</p>}
                      <p className="text-xs text-muted-foreground mt-1">Enviado em {fmtDate(doc.data_envio)} · Expira em {fmtDate(doc.data_expiracao)}</p>
                    </div>
                  </div>
                  <StatusBadge status={doc.status} />
                </div>
                <div className="flex gap-2 flex-wrap">
                  {doc.link_assinatura && (
                    <a href={doc.link_assinatura} target="_blank" rel="noopener noreferrer">
                      <Button className="gap-2 bg-blue-700 hover:bg-blue-800 text-white h-9 text-sm">
                        <PenLine className="w-4 h-4" />
                        Assinar com GovBR
                        <ExternalLink className="w-3.5 h-3.5" />
                      </Button>
                    </a>
                  )}
                  {doc.documento_url && (
                    <a href={doc.documento_url} target="_blank" rel="noopener noreferrer">
                      <Button variant="outline" className="gap-2 h-9 text-sm">
                        <FileText className="w-4 h-4" />
                        Ver Documento
                      </Button>
                    </a>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Assinados */}
      {assinados.length > 0 && (
        <div className="space-y-3">
          <h3 className="font-semibold text-sm text-foreground flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-green-600" />
            Documentos Assinados ({assinados.length})
          </h3>
          <div className="space-y-2">
            {assinados.map(doc => (
              <div key={doc.id} className="bg-card border border-border rounded-xl p-4 flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-green-100 flex items-center justify-center shrink-0">
                    <FileText className="w-4 h-4 text-green-700" />
                  </div>
                  <div>
                    <p className="font-medium text-sm text-foreground">{doc.nome_documento}</p>
                    <p className="text-xs text-muted-foreground">Assinado em {fmtDate(doc.data_assinatura)}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <StatusBadge status={doc.status} />
                  {doc.documento_assinado_url && (
                    <a href={doc.documento_assinado_url} target="_blank" rel="noopener noreferrer">
                      <Button size="sm" variant="outline" className="gap-1.5 h-8 text-xs">
                        <Download className="w-3.5 h-3.5" />Baixar
                      </Button>
                    </a>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Histórico outros */}
      {historico.filter(a => a.status !== 'assinado').length > 0 && (
        <div className="space-y-3">
          <h3 className="font-semibold text-sm text-muted-foreground">Histórico</h3>
          <div className="space-y-2">
            {historico.filter(a => a.status !== 'assinado').map(doc => (
              <div key={doc.id} className="bg-card border border-border rounded-xl p-4 flex items-center justify-between gap-3 opacity-70">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-muted flex items-center justify-center shrink-0">
                    <FileText className="w-4 h-4 text-muted-foreground" />
                  </div>
                  <div>
                    <p className="font-medium text-sm text-foreground">{doc.nome_documento}</p>
                    <p className="text-xs text-muted-foreground">Enviado em {fmtDate(doc.data_envio)}</p>
                  </div>
                </div>
                <StatusBadge status={doc.status} />
              </div>
            ))}
          </div>
        </div>
      )}

      {assinaturas.length === 0 && (
        <div className="text-center py-16 text-muted-foreground">
          <PenLine className="w-12 h-12 mx-auto mb-3 opacity-20" />
          <p className="font-medium">Nenhum documento para assinar</p>
          <p className="text-xs mt-1">Quando o RH enviar documentos para sua assinatura, eles aparecerão aqui.</p>
        </div>
      )}
    </div>
  );
}
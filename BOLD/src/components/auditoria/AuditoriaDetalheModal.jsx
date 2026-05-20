import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { ShieldCheck, User, Clock, Globe, FileText, Hash, Award } from 'lucide-react';

function fmtDt(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'medium' });
}

function JsonBlock({ label, data }) {
  if (!data) return null;
  return (
    <div>
      <p className="text-xs font-semibold text-muted-foreground mb-1.5">{label}</p>
      <pre className="bg-muted rounded-lg p-3 text-xs overflow-auto max-h-48 whitespace-pre-wrap text-foreground">
        {JSON.stringify(data, null, 2)}
      </pre>
    </div>
  );
}

const ORIGEM_COLOR = {
  govbr:       'bg-blue-100 text-blue-800 border-blue-200',
  sistema:     'bg-gray-100 text-gray-700 border-gray-200',
  api:         'bg-purple-100 text-purple-800 border-purple-200',
  rh:          'bg-green-100 text-green-800 border-green-200',
  colaborador: 'bg-amber-100 text-amber-800 border-amber-200',
};

export default function AuditoriaDetalheModal({ log, onClose }) {
  if (!log) return null;
  const origemColor = ORIGEM_COLOR[log.origem] || ORIGEM_COLOR.sistema;

  return (
    <Dialog open={!!log} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base">
            <ShieldCheck className="w-5 h-5 text-primary" />
            Detalhes do Evento de Auditoria
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-5 mt-2">
          {/* Resumo */}
          <div className="bg-muted/40 rounded-xl p-4 space-y-2">
            <div className="flex flex-wrap gap-2 items-center">
              <Badge className="font-mono text-xs">{log.acao}</Badge>
              <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border ${origemColor}`}>
                <Globe className="w-3 h-3" />
                {log.origem?.toUpperCase()}
              </span>
            </div>
            <p className="text-sm font-medium text-foreground">{log.descricao}</p>
            <div className="flex flex-wrap gap-4 text-xs text-muted-foreground">
              <span className="flex items-center gap-1"><User className="w-3 h-3" />{log.usuario_nome || log.usuario_email || 'Sistema'}</span>
              <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{fmtDt(log.created_date)}</span>
              {log.ip && <span className="flex items-center gap-1"><Globe className="w-3 h-3" />{log.ip}</span>}
            </div>
          </div>

          {/* Documento / Funcionário */}
          {(log.nome_documento || log.funcionario_nome) && (
            <div className="grid grid-cols-2 gap-3">
              {log.nome_documento && (
                <div className="flex items-start gap-2 p-3 border border-border rounded-lg">
                  <FileText className="w-4 h-4 text-muted-foreground shrink-0 mt-0.5" />
                  <div>
                    <p className="text-xs text-muted-foreground">Documento</p>
                    <p className="text-sm font-medium">{log.nome_documento}</p>
                  </div>
                </div>
              )}
              {log.funcionario_nome && (
                <div className="flex items-start gap-2 p-3 border border-border rounded-lg">
                  <User className="w-4 h-4 text-muted-foreground shrink-0 mt-0.5" />
                  <div>
                    <p className="text-xs text-muted-foreground">Funcionário</p>
                    <p className="text-sm font-medium">{log.funcionario_nome}</p>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Hash / Certificado */}
          {(log.hash_documento || log.certificado_url) && (
            <div className="space-y-2">
              {log.hash_documento && (
                <div className="flex items-start gap-2 p-3 border border-border rounded-lg bg-muted/20">
                  <Hash className="w-4 h-4 text-muted-foreground shrink-0 mt-0.5" />
                  <div className="min-w-0">
                    <p className="text-xs text-muted-foreground">Hash de Validação</p>
                    <p className="text-xs font-mono break-all">{log.hash_documento}</p>
                  </div>
                </div>
              )}
              {log.certificado_url && (
                <div className="flex items-start gap-2 p-3 border border-border rounded-lg bg-muted/20">
                  <Award className="w-4 h-4 text-muted-foreground shrink-0 mt-0.5" />
                  <div className="min-w-0">
                    <p className="text-xs text-muted-foreground">Certificado Digital</p>
                    <a href={log.certificado_url} target="_blank" rel="noopener noreferrer"
                      className="text-xs text-primary underline break-all">
                      {log.certificado_url}
                    </a>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Diffs */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <JsonBlock label="Estado Anterior (Antes)" data={log.dados_antes} />
            <JsonBlock label="Estado Posterior (Depois)" data={log.dados_depois} />
          </div>

          {/* GovBR Payload */}
          <JsonBlock label="Payload GovBR" data={log.govbr_payload} />

          {/* JSON completo */}
          <details>
            <summary className="text-xs text-muted-foreground cursor-pointer hover:text-foreground select-none">
              Ver JSON completo do evento
            </summary>
            <pre className="mt-2 bg-muted rounded-lg p-3 text-xs overflow-auto max-h-64 whitespace-pre-wrap">
              {JSON.stringify(log, null, 2)}
            </pre>
          </details>
        </div>
      </DialogContent>
    </Dialog>
  );
}
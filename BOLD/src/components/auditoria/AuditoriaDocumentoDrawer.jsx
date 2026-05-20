/**
 * Painel lateral com histórico de auditoria de um documento específico.
 * Usado na tela 360° do funcionário.
 */
import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Skeleton } from '@/components/ui/skeleton';
import { ShieldCheck, Globe, User, Clock } from 'lucide-react';
import AuditoriaDetalheModal from './AuditoriaDetalheModal';
import { useState } from 'react';

const ORIGEM_COLOR = {
  govbr:       'bg-blue-100 text-blue-800',
  rh:          'bg-green-100 text-green-800',
  colaborador: 'bg-amber-100 text-amber-800',
  sistema:     'bg-gray-100 text-gray-700',
  api:         'bg-purple-100 text-purple-800',
};

function fmtDt(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' });
}

export default function AuditoriaDocumentoDrawer({ open, onClose, documentoId, nomeDocumento }) {
  const [detalhe, setDetalhe] = useState(null);

  const { data: logs = [], isLoading } = useQuery({
    queryKey: ['auditoria-doc', documentoId],
    queryFn: () => base44.entities.AuditoriaDocumentos.filter({ documento_id: documentoId }, '-created_date', 100),
    enabled: open && !!documentoId,
  });

  return (
    <>
      <Sheet open={open} onOpenChange={onClose}>
        <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
          <SheetHeader>
            <SheetTitle className="flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-primary" />
              Auditoria do Documento
            </SheetTitle>
            {nomeDocumento && <p className="text-sm text-muted-foreground">{nomeDocumento}</p>}
          </SheetHeader>

          <div className="mt-4 space-y-2">
            {isLoading ? (
              <div className="space-y-2">
                {[1,2,3].map(i => <Skeleton key={i} className="h-16 rounded-xl" />)}
              </div>
            ) : logs.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <ShieldCheck className="w-10 h-10 mx-auto mb-2 opacity-30" />
                <p className="text-sm">Nenhum evento de auditoria para este documento</p>
              </div>
            ) : (
              logs.map(log => {
                const origemColor = ORIGEM_COLOR[log.origem] || ORIGEM_COLOR.sistema;
                return (
                  <div
                    key={log.id}
                    className="border border-border rounded-xl p-3 cursor-pointer hover:bg-muted/30 transition-colors"
                    onClick={() => setDetalhe(log)}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <span className="font-mono text-xs bg-muted px-1.5 py-0.5 rounded">{log.acao}</span>
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${origemColor}`}>
                        <Globe className="w-3 h-3" />
                        {log.origem?.toUpperCase()}
                      </span>
                    </div>
                    <p className="text-xs text-foreground mt-1.5">{log.descricao}</p>
                    <div className="flex items-center gap-3 mt-1.5 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <User className="w-3 h-3" />
                        {log.usuario_nome || log.usuario_email || 'Sistema'}
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {fmtDt(log.created_date)}
                      </span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </SheetContent>
      </Sheet>

      <AuditoriaDetalheModal log={detalhe} onClose={() => setDetalhe(null)} />
    </>
  );
}
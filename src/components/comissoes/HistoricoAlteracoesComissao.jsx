import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { client } from '@/api/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { formatCurrency } from '@/lib/formatters';
import { History, ChevronDown, ChevronUp } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export default function HistoricoAlteracoesComissao({ comissaoId }) {
  const [expandido, setExpandido] = useState(null);

  const { data: historico = [], isLoading } = useQuery({
    queryKey: ['historicoAlteracoes', comissaoId],
    queryFn: () => client.entities.HistoricoAlteracaoComissao.filter({ comissao_id: comissaoId }, '-created_date'),
    enabled: !!comissaoId,
  });

  if (isLoading) return <div className="text-sm text-muted-foreground">Carregando histórico...</div>;
  if (historico.length === 0) return null;

  const getTipoBadge = (tipo) => {
    const tipos = {
      valor_total: { label: 'Valor Total', color: 'bg-blue-100 text-blue-700' },
      distribuicao_setores: { label: 'Distribuição', color: 'bg-purple-100 text-purple-700' },
      ausencias: { label: 'Ausências', color: 'bg-orange-100 text-orange-700' },
      observacoes: { label: 'Observações', color: 'bg-gray-100 text-gray-700' },
    };
    return tipos[tipo] || { label: tipo, color: 'bg-gray-100 text-gray-700' };
  };

  return (
    <Card className="border-l-4 border-l-history">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm flex items-center gap-2">
          <History className="w-4 h-4" />
          Histórico de Alterações
          <Badge variant="secondary" className="ml-auto">{historico.length}</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {historico.map((h) => {
          const isExpanded = expandido === h.id;
          const badge = getTipoBadge(h.tipo_alteracao);

          return (
            <div key={h.id} className="border rounded-lg overflow-hidden">
              <button
                onClick={() => setExpandido(isExpanded ? null : h.id)}
                className="w-full flex items-center justify-between p-3 hover:bg-muted/50 transition-colors"
              >
                <div className="flex items-center gap-2 flex-1 text-left">
                  <Badge className={badge.color} variant="secondary">
                    {badge.label}
                  </Badge>
                  <div className="flex-1">
                    <p className="text-sm font-medium">{h.usuario_nome}</p>
                    <p className="text-xs text-muted-foreground">
                      {h.created_date ? format(new Date(h.created_date), "dd 'de' MMMM 'às' HH:mm", { locale: ptBR }) : 'Data indisponível'}
                    </p>
                  </div>
                </div>
                {isExpanded ? (
                  <ChevronUp className="w-4 h-4 text-muted-foreground" />
                ) : (
                  <ChevronDown className="w-4 h-4 text-muted-foreground" />
                )}
              </button>

              {isExpanded && (
                <div className="bg-muted/30 p-3 border-t space-y-2 text-sm">
                  {h.motivo && (
                    <div>
                      <p className="text-xs font-semibold text-muted-foreground">Motivo</p>
                      <p className="text-sm">{h.motivo}</p>
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-3">
                    <div className="bg-red-50 rounded p-2">
                      <p className="text-xs font-semibold text-red-700 mb-1">Valor Anterior</p>
                      <div className="space-y-0.5 text-xs">
                        {typeof h.valor_anterior === 'object' && h.valor_anterior !== null ? (
                          Object.entries(h.valor_anterior).map(([k, v]) => (
                            <div key={k} className="flex justify-between">
                              <span className="text-red-600">{k}:</span>
                              <span className="font-mono font-semibold">
                                {typeof v === 'number' ? formatCurrency(v) : String(v)}
                              </span>
                            </div>
                          ))
                        ) : (
                          <span className="text-red-600">{String(h.valor_anterior)}</span>
                        )}
                      </div>
                    </div>

                    <div className="bg-green-50 rounded p-2">
                      <p className="text-xs font-semibold text-green-700 mb-1">Valor Novo</p>
                      <div className="space-y-0.5 text-xs">
                        {typeof h.valor_novo === 'object' && h.valor_novo !== null ? (
                          Object.entries(h.valor_novo).map(([k, v]) => (
                            <div key={k} className="flex justify-between">
                              <span className="text-green-600">{k}:</span>
                              <span className="font-mono font-semibold">
                                {typeof v === 'number' ? formatCurrency(v) : String(v)}
                              </span>
                            </div>
                          ))
                        ) : (
                          <span className="text-green-600">{String(h.valor_novo)}</span>
                        )}
                      </div>
                    </div>
                  </div>

                  <p className="text-xs text-muted-foreground pt-1 border-t">
                    Por <span className="font-semibold">{h.usuario_email}</span>
                  </p>
                </div>
              )}
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
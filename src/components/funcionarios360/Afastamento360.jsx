import React, { useMemo, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { client } from '@/api/client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { formatDate } from '@/lib/formatters';
import { getTipoAfastamento, getHojeISO, isAfastamentoAtivo } from '@/lib/afastamento';
import { FileText, Plus, Ban, Stethoscope, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';
import EncerrarAfastamentoDialog from '@/components/funcionarios/EncerrarAfastamentoDialog';

const TIPO_ICONS = {
  atestado_medico: Stethoscope,
  suspensao: Ban,
  outro: FileText,
};

export default function Afastamento360({ funcionario, onRegistrar }) {
  const queryClient = useQueryClient();
  const [encerrando, setEncerrando] = useState(null);
  const hoje = getHojeISO();

  const { data: afastamentos = [], isLoading } = useQuery({
    queryKey: ['afastamentos_360', funcionario?.id],
    queryFn: () => funcionario?.id
      ? client.entities.Afastamento.filter({ funcionario_id: funcionario.id })
      : [],
    enabled: !!funcionario?.id,
  });

  const ordenados = useMemo(() => {
    return [...afastamentos].sort((a, b) => {
      const ativoA = isAfastamentoAtivo(a, hoje) ? 0 : 1;
      const ativoB = isAfastamentoAtivo(b, hoje) ? 0 : 1;
      if (ativoA !== ativoB) return ativoA - ativoB;
      return (b.created_date || '').localeCompare(a.created_date || '');
    });
  }, [afastamentos, hoje]);

  const handleEncerrar = async (a, justificativa) => {
    try {
      await client.entities.Afastamento.update(a.id, { status: 'encerrado', data_encerramento: hoje, justificativa_encerramento: justificativa || null });
      toast.success('Afastamento encerrado!');
      queryClient.invalidateQueries({ queryKey: ['afastamentos_360', funcionario?.id] });
      setEncerrando(null);
    } catch (err) {
      toast.error(err?.message || 'Erro ao encerrar afastamento');
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Histórico de Afastamentos</h3>
        <Button size="sm" onClick={onRegistrar}>
          <Plus className="w-3.5 h-3.5 mr-1.5" />Registrar
        </Button>
      </div>

      {isLoading ? (
        <p className="text-muted-foreground text-center py-8">Carregando...</p>
      ) : ordenados.length === 0 ? (
        <Card>
          <CardContent className="text-center py-8 text-muted-foreground">
            <p>Nenhum afastamento registrado para este funcionário</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {ordenados.map(a => {
            const cfg = getTipoAfastamento(a.tipo);
            const Icon = TIPO_ICONS[a.tipo] || FileText;
            const ativo = isAfastamentoAtivo(a, hoje);
            return (
              <Card key={a.id} className={ativo ? 'border-red-200' : ''}>
                <CardContent className="p-4 space-y-2">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <span className={`w-8 h-8 rounded-lg flex items-center justify-center ${cfg.color}`}>
                        <Icon className="w-4 h-4" />
                      </span>
                      <Badge className={`${cfg.color} border-0`}>{cfg.label}</Badge>
                    </div>
                    {ativo ? (
                      <Badge className="bg-red-100 text-red-700 border-0">Em afastamento</Badge>
                    ) : (
                      <Badge variant="secondary" className="text-xs flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3" />
                        Encerrado{a.data_encerramento ? ` em ${formatDate(a.data_encerramento)}` : ''}
                      </Badge>
                    )}
                  </div>

                  <div className="flex flex-wrap gap-x-6 gap-y-1 text-sm">
                    <span className="text-muted-foreground">
                      Período:{' '}
                      <span className="font-medium text-foreground">
                        {a.data_inicio ? formatDate(a.data_inicio) : '—'} → {a.data_fim ? formatDate(a.data_fim) : 'em aberto'}
                      </span>
                    </span>
                    {a.data_encerramento && a.data_fim && a.data_encerramento !== a.data_fim && (
                      <span className="text-xs text-amber-600">
                        Encerrado antes do previsto ({formatDate(a.data_encerramento)})
                      </span>
                    )}
                    {a.origem === 'solicitacao' && (
                      <span className="text-xs text-muted-foreground">Via solicitação do funcionário</span>
                    )}
                  </div>

                  {a.motivo && <p className="text-sm text-muted-foreground">{a.motivo}</p>}

                  {a.justificativa_encerramento && (
                    <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                      Justificativa do encerramento: {a.justificativa_encerramento}
                    </p>
                  )}

                  {ativo && (
                    <div className="flex justify-end">
                      <Button size="sm" variant="outline" className="text-destructive" onClick={() => setEncerrando(a)}>
                        Encerrar
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <EncerrarAfastamentoDialog
        afastamento={encerrando}
        open={!!encerrando}
        onClose={() => setEncerrando(null)}
        onConfirm={(justificativa) => handleEncerrar(encerrando, justificativa)}
      />
    </div>
  );
}

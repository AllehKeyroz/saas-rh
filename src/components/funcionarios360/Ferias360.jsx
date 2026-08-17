import React, { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { client } from '@/api/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';
import {
  CalendarDays, CheckCircle2, XCircle, Send, Loader2,
} from 'lucide-react';
import { formatDate } from '@/lib/formatters';
import {
  calcularSaldoFerias, getStatusFerias, FERIAS_STATUS, getDiaRetorno, FERIAS_ORIGEM,
} from '@/lib/ferias';
import GerarAvisoFeriasDialog from '@/components/funcionarios/GerarAvisoFeriasDialog';

const STATUS_BADGE = {
  [FERIAS_STATUS.PROGRAMADA]: 'bg-blue-100 text-blue-700',
  [FERIAS_STATUS.EM_ANDAMENTO]: 'bg-amber-100 text-amber-700',
  [FERIAS_STATUS.CONCLUIDA]: 'bg-green-100 text-green-700',
  [FERIAS_STATUS.CANCELADA]: 'bg-red-100 text-red-700',
};

const STATUS_LABEL = {
  [FERIAS_STATUS.PROGRAMADA]: 'Programada',
  [FERIAS_STATUS.EM_ANDAMENTO]: 'Em andamento',
  [FERIAS_STATUS.CONCLUIDA]: 'Concluída',
  [FERIAS_STATUS.CANCELADA]: 'Cancelada',
};

const ORIGEM_LABEL = {
  [FERIAS_ORIGEM.SOLICITACAO]: 'Solicitação',
  [FERIAS_ORIGEM.MANUAL]: 'Manual',
  [FERIAS_ORIGEM.ESCALA]: 'Escala',
};

export default function Ferias360({ funcionario }) {
  const queryClient = useQueryClient();
  const [avisoFerias, setAvisoFerias] = useState(null);
  const [cancelando, setCancelando] = useState(null);

  const { data: ferias = [], isLoading } = useQuery({
    queryKey: ['ferias360', funcionario?.id],
    queryFn: () => funcionario?.id ? client.entities.Ferias.filter({ funcionario_id: funcionario.id }) : [],
    enabled: !!funcionario?.id,
  });

  const { data: assinaturas = [] } = useQuery({
    queryKey: ['assinaturas-ferias360', funcionario?.id],
    queryFn: () => funcionario?.id ? client.entities.AssinaturaDigital.filter({ funcionario_id: funcionario.id }) : [],
    enabled: !!funcionario?.id,
  });

  const saldo = calcularSaldoFerias(funcionario, ferias);
  const avisoMap = new Map(assinaturas.map(a => [a.id, a]));

  const handleCancelar = async (f) => {
    if (!window.confirm(`Cancelar o registro de férias do ${f.periodo_aquisitivo || '—'}º período?`)) return;
    setCancelando(f.id);
    try {
      await client.entities.Ferias.update(f.id, { cancelada: true });
      toast.success('Registro de férias cancelado.');
      queryClient.invalidateQueries({ queryKey: ['ferias360', funcionario?.id] });
      queryClient.invalidateQueries({ queryKey: ['ferias_consumidas'] });
      queryClient.invalidateQueries({ queryKey: ['ferias_dashboard'] });
    } catch (e) {
      toast.error(e?.message || 'Erro ao cancelar férias');
    } finally {
      setCancelando(null);
    }
  };

  if (isLoading) {
    return <div className="space-y-3">{[1, 2].map(i => <Skeleton key={i} className="h-32 rounded-xl" />)}</div>;
  }

  const ordenadas = [...ferias].sort((a, b) => (a.data_inicio || '').localeCompare(b.data_inicio || ''));

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <CalendarDays className="w-5 h-5 text-primary" />
            Férias
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="bg-muted/40 rounded-xl p-4 text-center">
              <p className="text-2xl font-bold">{saldo.diasDisponiveis}</p>
              <p className="text-xs text-muted-foreground">dias disponíveis</p>
            </div>
            <div className="bg-muted/40 rounded-xl p-4 text-center">
              <p className="text-2xl font-bold">{saldo.diasGozados}</p>
              <p className="text-xs text-muted-foreground">dias gozados</p>
            </div>
            <div className="bg-muted/40 rounded-xl p-4 text-center">
              <p className="text-2xl font-bold">{saldo.diasProgramados}</p>
              <p className="text-xs text-muted-foreground">dias programados</p>
            </div>
            <div className="bg-muted/40 rounded-xl p-4 text-center">
              <p className="text-2xl font-bold">{saldo.totalPeriodos}</p>
              <p className="text-xs text-muted-foreground">períodos aquisitivos</p>
            </div>
          </div>

          {saldo.periodos.length === 0 && (
            <p className="text-sm text-muted-foreground mt-4">
              Funcionário ainda não completou 12 meses de trabalho (período aquisitivo).
            </p>
          )}
          {saldo.periodos.length > 0 && (
            <div className="mt-4 space-y-1">
              {saldo.periodos.map(p => (
                <div key={p.numero} className="flex items-center justify-between text-xs bg-muted/30 rounded-lg px-3 py-2">
                  <span className="font-medium">{p.numero}º período ({formatDate(p.inicio.toISOString())} — {formatDate(p.fim.toISOString())})</span>
                  <span>
                    {p.estado === 'disponivel' && (
                      p.concessaoVencida
                        ? <Badge className="bg-red-100 text-red-700">Concessão vencida — dobra</Badge>
                        : p.vencido
                          ? <Badge className="bg-amber-300/60 text-amber-900 ring-1 ring-amber-500">Aquisitivo pendente</Badge>
                          : p.diasParaVencer <= 120
                            ? <Badge className="bg-orange-100 text-orange-700">Concessão em {p.diasParaVencer} dias</Badge>
                            : <Badge className="bg-green-100 text-green-700">Disponível</Badge>
                    )}
                    {p.estado === 'gozado' && <Badge className="bg-green-100 text-green-700">Gozado ({p.diasGozados} dias)</Badge>}
                    {p.estado === 'programado' && <Badge className="bg-blue-100 text-blue-700">Programado ({p.diasProgramados} dias)</Badge>}
                    {p.estado === 'em_andamento' && <Badge className="bg-amber-100 text-amber-700">Em andamento</Badge>}
                  </span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {ordenadas.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <CalendarDays className="w-12 h-12 mx-auto mb-2 opacity-30" />
          <p className="font-medium">Nenhum registro de férias</p>
          <p className="text-xs mt-1">Use "Dar Baixa", a escala de férias ou aprove solicitações para registrar gozo.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {ordenadas.map(f => {
            const status = getStatusFerias(f);
            const aviso = f.aviso_id ? avisoMap.get(f.aviso_id) : null;
            return (
              <div key={f.id} className="border rounded-xl bg-card p-4 space-y-2">
                <div className="flex items-start justify-between gap-3 flex-wrap">
                  <div className="flex items-center gap-2">
                    <Badge className={STATUS_BADGE[status] || 'bg-slate-100 text-slate-700'}>
                      {STATUS_LABEL[status] || status}
                    </Badge>
                    <span className="font-semibold text-sm">{f.periodo_aquisitivo || '—'}º período aquisitivo</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-xs">{ORIGEM_LABEL[f.origem] || f.origem || '—'}</Badge>
                    {status !== FERIAS_STATUS.CANCELADA && (
                      <>
                        <Button size="sm" variant="outline" className="text-xs h-8" onClick={() => setAvisoFerias(f)}>
                          <Send className="w-3.5 h-3.5 mr-1" />
                          {aviso ? 'Reenviar Aviso' : 'Gerar Aviso'}
                        </Button>
                        {status === FERIAS_STATUS.PROGRAMADA && (
                          <Button size="sm" variant="ghost" className="text-xs h-8 text-red-600" disabled={cancelando === f.id}
                            onClick={() => handleCancelar(f)}>
                            {cancelando === f.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <XCircle className="w-3.5 h-3.5" />}
                            Cancelar
                          </Button>
                        )}
                      </>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs text-muted-foreground">
                  <div className="bg-muted/30 rounded-lg px-3 py-2">
                    <p className="font-medium text-foreground">{formatDate(f.data_inicio)} → {formatDate(f.data_fim)}</p>
                    <p>Período de gozo</p>
                  </div>
                  <div className="bg-muted/30 rounded-lg px-3 py-2">
                    <p className="font-medium text-foreground">{formatDate(getDiaRetorno(f.data_fim)?.toISOString())}</p>
                    <p>Retorno</p>
                  </div>
                  <div className="bg-muted/30 rounded-lg px-3 py-2">
                    <p className="font-medium text-foreground">{f.dias_gozados} dias{f.dias_abono > 0 ? ` + ${f.dias_abono} abono` : ''}</p>
                    <p>Duração</p>
                  </div>
                  <div className="bg-muted/30 rounded-lg px-3 py-2">
                    {aviso ? (
                      <span className="flex items-center gap-1 text-green-700">
                        <CheckCircle2 className="w-3.5 h-3.5" /> Aviso {aviso.status === 'assinado' ? 'assinado' : 'pendente'}
                      </span>
                    ) : (
                      <span className="text-muted-foreground">Sem aviso emitido</span>
                    )}
                    <p>Aviso de Férias</p>
                  </div>
                </div>

                {f.observacao && <p className="text-xs text-muted-foreground">{f.observacao}</p>}
              </div>
            );
          })}
        </div>
      )}

      <GerarAvisoFeriasDialog
        open={!!avisoFerias}
        onClose={() => setAvisoFerias(null)}
        funcionario={funcionario}
        ferias={avisoFerias}
        onGerado={() => queryClient.invalidateQueries({ queryKey: ['ferias360', funcionario?.id] })}
      />
    </div>
  );
}

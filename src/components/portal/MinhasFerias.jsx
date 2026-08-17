import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { client } from '@/api/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import {
  CalendarDays, Palmtree, CheckCircle2, FileText, AlertCircle, PenLine,
} from 'lucide-react';
import { formatDate } from '@/lib/formatters';
import {
  calcularSaldoFerias, getStatusFerias, FERIAS_STATUS, getDiaRetorno,
} from '@/lib/ferias';

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

export default function MinhasFerias({ funcionario, onVerAssinaturas }) {
  const { data: ferias = [], isLoading } = useQuery({
    queryKey: ['minhas_ferias', funcionario?.id],
    queryFn: () => funcionario?.id ? client.entities.Ferias.filter({ funcionario_id: funcionario.id }) : [],
    enabled: !!funcionario?.id,
  });

  const { data: assinaturas = [] } = useQuery({
    queryKey: ['assinaturas-portal', funcionario?.id],
    queryFn: () => funcionario?.id ? client.entities.AssinaturaDigital.filter({ funcionario_id: funcionario.id }, '-data_envio') : [],
    enabled: !!funcionario?.id,
  });

  if (isLoading) {
    return <div className="space-y-3">{[1, 2].map(i => <Skeleton key={i} className="h-32 rounded-xl" />)}</div>;
  }

  const saldo = calcularSaldoFerias(funcionario, ferias);
  const naoCanceladas = ferias.filter(f => f.cancelada !== true);
  const proximas = naoCanceladas
    .filter(f => getStatusFerias(f) === FERIAS_STATUS.PROGRAMADA)
    .sort((a, b) => (a.data_inicio || '').localeCompare(b.data_inicio || ''))[0];
  const emAndamento = naoCanceladas.find(f => getStatusFerias(f) === FERIAS_STATUS.EM_ANDAMENTO);
  const historico = [...naoCanceladas].sort((a, b) => (a.data_inicio || '').localeCompare(b.data_inicio || '')).reverse();

  const avisoPendente = assinaturas.find(a => a.status === 'aguardando' && a.finalidade_nome === 'Aviso de Férias');
  const todasFeriasAvizos = naoCanceladas.filter(f => f.aviso_id);
  const avisosAssinados = todasFeriasAvizos.map(f => ({ f, assinatura: assinaturas.find(a => a.id === f.aviso_id) }));

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
          <Palmtree className="w-5 h-5 text-primary" />
          Minhas Férias
        </h2>
        <p className="text-sm text-muted-foreground">Saldo, períodos aquisitivos e histórico de férias</p>
      </div>

      {/* Aviso de férias pendente de assinatura */}
      {avisoPendente && (
        <div className="rounded-xl border border-yellow-200 bg-yellow-50 p-4 space-y-2">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-5 h-5 text-yellow-700" />
            <p className="font-semibold text-sm text-yellow-800">Você tem um Aviso de Férias aguardando sua assinatura</p>
          </div>
          <p className="text-xs text-yellow-700">{avisoPendente.nome_documento}</p>
          <Button size="sm" className="gap-1.5" onClick={onVerAssinaturas}>
            <PenLine className="w-4 h-4" />Assinar agora
          </Button>
        </div>
      )}

      {/* Saldo */}
      <div className="grid grid-cols-3 gap-3">
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
      </div>

      {/* Próximas férias */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader><CardTitle className="text-sm flex items-center gap-2"><CalendarDays className="w-4 h-4 text-primary" />Próximas férias</CardTitle></CardHeader>
          <CardContent>
            {emAndamento ? (
              <div className="space-y-1 text-sm">
                <Badge className="bg-amber-100 text-amber-700">Em andamento</Badge>
                <p className="font-medium mt-1">{formatDate(emAndamento.data_inicio)} → {formatDate(emAndamento.data_fim)}</p>
                <p className="text-xs text-muted-foreground">Retorno: {formatDate(getDiaRetorno(emAndamento.data_fim)?.toISOString())}</p>
              </div>
            ) : proximas ? (
              <div className="space-y-1 text-sm">
                <Badge className="bg-blue-100 text-blue-700">Programada</Badge>
                <p className="font-medium mt-1">{formatDate(proximas.data_inicio)} → {formatDate(proximas.data_fim)}</p>
                <p className="text-xs text-muted-foreground">Retorno: {formatDate(getDiaRetorno(proximas.data_fim)?.toISOString())}</p>
                {avisosAssinados.find(x => x.f.id === proximas.id)?.assinatura?.status === 'assinado' && (
                  <p className="text-xs text-green-700 flex items-center gap-1"><CheckCircle2 className="w-3 h-3" />Aviso assinado</p>
                )}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">Nenhuma férias programada.</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-sm flex items-center gap-2"><FileText className="w-4 h-4 text-primary" />Períodos aquisitivos</CardTitle></CardHeader>
          <CardContent className="space-y-1">
            {saldo.periodos.length === 0 && <p className="text-sm text-muted-foreground">Ainda não completou 12 meses de trabalho.</p>}
            {saldo.periodos.map(p => (
              <div key={p.numero} className="flex items-center justify-between text-xs bg-muted/30 rounded-lg px-3 py-2">
                <span className="font-medium">{p.numero}º período ({formatDate(p.inicio.toISOString())} — {formatDate(p.fim.toISOString())})</span>
                <span>
                  {p.estado === 'disponivel' && (
                    p.concessaoVencida
                      ? <Badge className="bg-red-100 text-red-700">Concessão vencida</Badge>
                      : p.vencido
                        ? <Badge className="bg-amber-300/60 text-amber-900 ring-1 ring-amber-500">Aquisitivo pendente</Badge>
                        : p.diasParaVencer <= 120
                          ? <Badge className="bg-orange-100 text-orange-700">Concessão em {p.diasParaVencer} dias</Badge>
                          : <Badge className="bg-green-100 text-green-700">Disponível</Badge>
                  )}
                  {p.estado === 'gozado' && <Badge className="bg-green-100 text-green-700">Gozado</Badge>}
                  {p.estado === 'programado' && <Badge className="bg-blue-100 text-blue-700">Programado</Badge>}
                  {p.estado === 'em_andamento' && <Badge className="bg-amber-100 text-amber-700">Em andamento</Badge>}
                </span>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      {/* Histórico */}
      {historico.length > 0 && (
        <Card>
          <CardHeader><CardTitle className="text-sm">Histórico de férias</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {historico.map(f => {
              const status = getStatusFerias(f);
              const aviso = avisosAssinados.find(x => x.f.id === f.id);
              return (
                <div key={f.id} className="flex items-center justify-between gap-3 border rounded-lg px-3 py-2 text-sm">
                  <div>
                    <p className="font-medium">
                      {f.periodo_aquisitivo || '—'}º período · {formatDate(f.data_inicio)} → {formatDate(f.data_fim)}
                      {f.dias_abono > 0 && <span className="text-muted-foreground text-xs"> (+{f.dias_abono} abono)</span>}
                    </p>
                    {f.origem === 'solicitacao' && <p className="text-xs text-muted-foreground">Concedida via solicitação</p>}
                  </div>
                  <div className="flex items-center gap-2">
                    {aviso?.assinatura && (
                      aviso.assinatura.status === 'assinado'
                        ? <Badge className="bg-green-100 text-green-700 flex items-center gap-1"><CheckCircle2 className="w-3 h-3" />Aviso assinado</Badge>
                        : <Badge className="bg-yellow-100 text-yellow-700">Aviso pendente</Badge>
                    )}
                    <Badge className={STATUS_BADGE[status]}>{STATUS_LABEL[status] || status}</Badge>
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

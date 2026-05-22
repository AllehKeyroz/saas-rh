import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { client } from '@/api/client';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Search, User, Calendar, Clock, AlertTriangle, CheckCircle2, XCircle } from 'lucide-react';
import { differenceInDays, addDays, addMonths, format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';

// CLT: funcionário tem direito a férias após 12 meses de trabalho.
// O prazo máximo para gozar as férias é 11 meses após adquirir o direito (23 meses de empresa).
// Banco de horas: usamos as solicitações do tipo banco_horas aprovadas.

function calcularSituacaoFerias(dataAdmissao) {
  if (!dataAdmissao) return null;
  const admissao = parseISO(dataAdmissao);
  const hoje = new Date();
  const diasTrabalhados = differenceInDays(hoje, admissao);
  const mesesTrabalhados = diasTrabalhados / 30.44;

  // Período aquisitivo completado a cada 12 meses
  const periodoAquisitivo = Math.floor(mesesTrabalhados / 12);
  // Se não completou nenhum período aquisitivo OU a admissão é futura
  if (periodoAquisitivo === 0 || diasTrabalhados < 0) return null;

  // Data de fim do último período aquisitivo completo (admissão + periodoAquisitivo * 12 meses)
  const fimUltimoPeriodo = addDays(admissao, periodoAquisitivo * 365);
  // Prazo limite CLT: 11 meses após o fim do período aquisitivo
  const prazoLimite = addMonths(fimUltimoPeriodo, 11);
  const diasParaVencer = differenceInDays(prazoLimite, hoje);

  return {
    periodoAquisitivo,
    diasParaVencer,
    prazoLimite,
    vencido: diasParaVencer < 0,
    urgente: diasParaVencer >= 0 && diasParaVencer <= 60,
    atencao: diasParaVencer > 60 && diasParaVencer <= 120,
  };
}

function StatusBadgeFerias({ situacao }) {
  if (!situacao) return <Badge variant="secondary" className="text-xs">Em período aquisitivo</Badge>;
  if (situacao.vencido) return (
    <Badge className="text-xs bg-red-100 text-red-700 border-0 gap-1">
      <XCircle className="w-3 h-3" />Vencido há {Math.abs(situacao.diasParaVencer)} dias
    </Badge>
  );
  if (situacao.urgente) return (
    <Badge className="text-xs bg-orange-100 text-orange-700 border-0 gap-1">
      <AlertTriangle className="w-3 h-3" />Vence em {situacao.diasParaVencer} dias
    </Badge>
  );
  if (situacao.atencao) return (
    <Badge className="text-xs bg-yellow-100 text-yellow-700 border-0 gap-1">
      <AlertTriangle className="w-3 h-3" />Atenção: {situacao.diasParaVencer} dias
    </Badge>
  );
  return (
    <Badge className="text-xs bg-green-100 text-green-700 border-0 gap-1">
      <CheckCircle2 className="w-3 h-3" />OK · Vence em {situacao.diasParaVencer} dias
    </Badge>
  );
}

function FuncionarioFeriasRow({ func, solicitacoesFerias, solicitacoesBH }) {
  const situacao = calcularSituacaoFerias(func.data_admissao);
  const temDireitoFerias = !!situacao;

  // Banco de horas: saldo (horas aprovadas e ainda não tiradas)
  const horasAcumuladas = solicitacoesBH
    .filter(s => s.status === 'pendente' || s.status === 'aprovado')
    .reduce((acc, s) => acc + (s.horas_compensar || 0), 0);

  const feriasAprovadas = solicitacoesFerias.filter(s => s.status === 'aprovado');
  const feriasPendentes = solicitacoesFerias.filter(s => s.status === 'pendente');

  return (
    <div className="border rounded-xl bg-card px-4 py-3 space-y-2">
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-xl bg-muted flex items-center justify-center shrink-0 overflow-hidden">
          {func.foto ? <img src={func.foto} alt="" className="w-full h-full object-cover" /> : <User className="w-4 h-4 text-muted-foreground" />}
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-sm truncate">{func.nome}</p>
          <p className="text-xs text-muted-foreground">
            {func.funcao || ''}{func.funcao && func.setor ? ' · ' : ''}{func.setor || ''}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        {/* Férias */}
        <div className="bg-muted/30 rounded-lg px-3 py-2 space-y-1">
          <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
            <Calendar className="w-3.5 h-3.5" />Férias
          </div>
          {!temDireitoFerias ? (
            <p className="text-xs text-muted-foreground">Período aquisitivo em andamento</p>
          ) : (
            <>
              <StatusBadgeFerias situacao={situacao} />
              {situacao && (
                <p className="text-xs text-muted-foreground">
                  Prazo CLT: {format(situacao.prazoLimite, 'dd/MM/yyyy')}
                </p>
              )}
              {feriasPendentes.length > 0 && (
                <p className="text-xs text-yellow-700">⏳ {feriasPendentes.length} solicitação(ões) pendente(s)</p>
              )}
              {feriasAprovadas.length > 0 && (
                <p className="text-xs text-green-700">✓ {feriasAprovadas.length} aprovada(s)</p>
              )}
            </>
          )}
          {func.data_admissao && (
            <p className="text-xs text-muted-foreground">Admissão: {format(parseISO(func.data_admissao), 'dd/MM/yyyy')}</p>
          )}
        </div>

        {/* Banco de Horas */}
        <div className="bg-muted/30 rounded-lg px-3 py-2 space-y-1">
          <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
            <Clock className="w-3.5 h-3.5" />Banco de Horas
          </div>
          {horasAcumuladas > 0 ? (
            <>
              <Badge className="text-xs bg-blue-100 text-blue-700 border-0">
                {horasAcumuladas}h acumuladas
              </Badge>
              <p className="text-xs text-muted-foreground">Disponíveis para compensação</p>
            </>
          ) : (
            <p className="text-xs text-muted-foreground">Sem horas acumuladas</p>
          )}
        </div>
      </div>
    </div>
  );
}

export default function FeriasBancoHorasTab({ funcionarios }) {
  const [search, setSearch] = useState('');
  const [filtro, setFiltro] = useState('todos'); // todos | vencendo | vencido | bh_disponivel

  const { data: solicitacoes = [], isLoading } = useQuery({
    queryKey: ['solicitacoes-ferias-bh'],
    queryFn: () => client.entities.SolicitacoesFuncionario.list(),
  });

  const solFerias = solicitacoes.filter(s => s.tipo_solicitacao === 'ferias');
  const solBH = solicitacoes.filter(s => s.tipo_solicitacao === 'banco_horas');

  const lista = useMemo(() => {
    return funcionarios
      .filter(f => !f.data_demissao && f.ativo !== false)
      .filter(f => {
        const match = !search || f.nome?.toLowerCase().includes(search.toLowerCase());
        if (!match) return false;

        const situacao = calcularSituacaoFerias(f.data_admissao);
        const horasBH = solBH.filter(s => s.funcionario_id === f.id && (s.status === 'pendente' || s.status === 'aprovado'))
          .reduce((acc, s) => acc + (s.horas_compensar || 0), 0);

        if (filtro === 'vencendo') return situacao && !situacao.vencido && (situacao.urgente || situacao.atencao);
        if (filtro === 'vencido') return situacao?.vencido;
        if (filtro === 'bh_disponivel') return horasBH > 0;
        return situacao || horasBH > 0; // "todos" = só mostra quem tem algo
      })
      .sort((a, b) => {
        // Ordena por urgência: vencido > urgente > atenção > normal
        const sa = calcularSituacaoFerias(a.data_admissao);
        const sb = calcularSituacaoFerias(b.data_admissao);
        const score = (s) => {
          if (!s) return 100;
          if (s.vencido) return 0;
          if (s.urgente) return 1;
          if (s.atencao) return 2;
          return 3;
        };
        return score(sa) - score(sb);
      });
  }, [funcionarios, search, filtro, solBH]);

  if (isLoading) return (
    <div className="space-y-3">{[1,2,3].map(i => <Skeleton key={i} className="h-32 rounded-xl" />)}</div>
  );

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-3 items-center">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Buscar funcionário..." value={search} onChange={e => setSearch(e.target.value)} className="pl-10" />
        </div>
        <Select value={filtro} onValueChange={setFiltro}>
          <SelectTrigger className="w-52">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos com pendências</SelectItem>
            <SelectItem value="vencendo">⚠️ Vencendo em breve (até 120 dias)</SelectItem>
            <SelectItem value="vencido">🔴 Férias vencidas</SelectItem>
            <SelectItem value="bh_disponivel">🕐 Banco de horas disponível</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Legenda CLT */}
      <div className="bg-blue-50 border border-blue-200 rounded-xl px-4 py-3 text-xs text-blue-700 space-y-0.5">
        <p className="font-semibold">📋 Regras CLT:</p>
        <p>• Direito a 30 dias de férias após 12 meses trabalhados (período aquisitivo)</p>
        <p>• Prazo máximo para concessão: até 11 meses após o fim do período aquisitivo</p>
        <p>• <span className="font-medium text-orange-600">Atenção:</span> férias vencidas geram multa de 1/3 extra ao empregador</p>
      </div>

      {lista.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <Calendar className="w-12 h-12 mx-auto mb-2 opacity-30" />
          <p className="font-medium">Nenhum funcionário com pendências</p>
          <p className="text-xs mt-1">Ajuste o filtro para ver outros casos</p>
        </div>
      ) : (
        <div className="space-y-3">
          {lista.map(func => (
            <FuncionarioFeriasRow
              key={func.id}
              func={func}
              solicitacoesFerias={solFerias.filter(s => s.funcionario_id === func.id)}
              solicitacoesBH={solBH.filter(s => s.funcionario_id === func.id)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
import React, { useState, useMemo, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { client } from '@/api/client';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { differenceInDays, addDays, addMonths, format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Search, User, Calendar, Clock, AlertTriangle, CheckCircle2, XCircle, Plus, History, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { getCurrentTenantId } from '@/firebase/auth';

/** Calcula a situação do período aquisitivo de férias considerando períodos já gozados. */
function calcularSituacaoFerias(dataAdmissao, feriasConsumidas = []) {
  if (!dataAdmissao) return null;
  const admissao = parseISO(dataAdmissao);
  const hoje = new Date();
  const diasTrabalhados = differenceInDays(hoje, admissao);
  const mesesTrabalhados = diasTrabalhados / 30.44;

  const totalPeriodos = Math.floor(mesesTrabalhados / 12);
  if (totalPeriodos === 0 || diasTrabalhados < 0) return null;

  const periodosConsumidos = new Set(feriasConsumidas.map(f => f.periodo_aquisitivo));

  // Encontra o primeiro período aquisitivo não consumido
  let periodoPendente = null;
  for (let p = 1; p <= totalPeriodos; p++) {
    if (!periodosConsumidos.has(p)) {
      periodoPendente = p;
      break;
    }
  }

  if (!periodoPendente) {
    return { todosConsumidos: true, totalPeriodos, periodosConsumidos: feriasConsumidas.length };
  }

  const fimPeriodo = addDays(admissao, periodoPendente * 365);
  const prazoLimite = addMonths(fimPeriodo, 11);
  const diasParaVencer = differenceInDays(prazoLimite, hoje);

  return {
    periodoAquisitivo: periodoPendente,
    totalPeriodos,
    periodosConsumidos: feriasConsumidas.length,
    periodosPendentes: totalPeriodos - feriasConsumidas.length,
    diasParaVencer,
    prazoLimite,
    vencido: diasParaVencer < 0,
    urgente: diasParaVencer >= 0 && diasParaVencer <= 60,
    atencao: diasParaVencer > 60 && diasParaVencer <= 120,
  };
}

function StatusBadgeFerias({ situacao }) {
  if (!situacao) return <Badge variant="secondary" className="text-xs">Em período aquisitivo</Badge>;
  if (situacao.todosConsumidos) return (
    <Badge className="text-xs bg-green-100 text-green-700 border-0 gap-1">
      <CheckCircle2 className="w-3 h-3" />Todas em dia
    </Badge>
  );
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

function DarBaixaModal({ open, onClose, funcionarios, feriasConsumidas, onSaved, selectedFunc }) {
  const queryClient = useQueryClient();
  const [funcId, setFuncId] = useState('');

  useEffect(() => {
    if (open && selectedFunc?.id) {
      setFuncId(selectedFunc.id);
    } else if (!open) {
      setFuncId('');
    }
  }, [open, selectedFunc]);

  const [periodo, setPeriodo] = useState('');
  const [dataInicio, setDataInicio] = useState('');
  const [dataFim, setDataFim] = useState('');
  const [diasAbono, setDiasAbono] = useState('');
  const [observacao, setObservacao] = useState('');
  const [saving, setSaving] = useState(false);

  const func = funcionarios.find(f => f.id === funcId);
  const consumidos = feriasConsumidas.filter(f => f.funcionario_id === funcId);
  const consumidosSet = new Set(consumidos.map(f => f.periodo_aquisitivo));

  const periodosDisponiveis = useMemo(() => {
    if (!func?.data_admissao) return [];
    const admissao = parseISO(func.data_admissao);
    const meses = differenceInDays(new Date(), admissao) / 30.44;
    const total = Math.floor(meses / 12);
    const ops = [];
    for (let p = 1; p <= total; p++) {
      if (!consumidosSet.has(p)) {
        ops.push(p);
      }
    }
    return ops;
  }, [func, consumidosSet]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!funcId || !periodo || !dataInicio || !dataFim) {
      toast.error('Preencha todos os campos obrigatórios');
      return;
    }
    if (new Date(dataFim) < new Date(dataInicio)) {
      toast.error('Data fim não pode ser anterior à data início');
      return;
    }
    setSaving(true);
    try {
      const diasGozados = differenceInDays(parseISO(dataFim), parseISO(dataInicio)) + 1;
      await client.entities.Ferias.create({
        funcionario_id: funcId,
        periodo_aquisitivo: Number(periodo),
        data_inicio: dataInicio,
        data_fim: dataFim,
        dias_gozados: diasGozados,
        dias_abono: diasAbono ? Number(diasAbono) : 0,
        observacao: observacao || '',
        tenant_id: getCurrentTenantId(),
      });
      toast.success(`Férias do período ${periodo} registradas com sucesso!`);
      queryClient.invalidateQueries({ queryKey: ['ferias_consumidas'] });
      queryClient.invalidateQueries({ queryKey: ['solicitacoes-ferias-bh'] });
      onSaved();
      onClose();
      setFuncId(''); setPeriodo(''); setDataInicio(''); setDataFim('');
      setDiasAbono(''); setObservacao('');
    } catch (err) {
      toast.error(err?.message || 'Erro ao registrar férias');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Plus className="w-5 h-5" />Dar Baixa em Férias
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 py-2">
          <div>
            <Label>Funcionário *</Label>
            <Select value={funcId} onValueChange={setFuncId}>
              <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
              <SelectContent>
                {funcionarios
                  .filter(f => !f.data_demissao && f.ativo !== false)
                  .sort((a, b) => (a.nome || '').localeCompare(b.nome || ''))
                  .map(f => (
                    <SelectItem key={f.id} value={f.id}>{f.nome}</SelectItem>
                  ))}
              </SelectContent>
            </Select>
          </div>
          {func && (
            <div>
              <Label>Período Aquisitivo *</Label>
              <Select value={periodo} onValueChange={setPeriodo} disabled={periodosDisponiveis.length === 0}>
                <SelectTrigger><SelectValue placeholder={periodosDisponiveis.length === 0 ? 'Todos já gozados' : 'Selecione...'} /></SelectTrigger>
                <SelectContent>
                  {periodosDisponiveis.map(p => (
                    <SelectItem key={p} value={String(p)}>{p}º período ({format(addDays(parseISO(func.data_admissao), (p - 1) * 365), 'dd/MM/yyyy')} — {format(addDays(parseISO(func.data_admissao), p * 365 - 1), 'dd/MM/yyyy')})</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Data Início *</Label>
              <Input type="date" value={dataInicio} onChange={e => setDataInicio(e.target.value)} />
            </div>
            <div>
              <Label>Data Fim *</Label>
              <Input type="date" value={dataFim} onChange={e => setDataFim(e.target.value)} />
            </div>
          </div>
          {dataInicio && dataFim && new Date(dataFim) >= new Date(dataInicio) && (
            <p className="text-xs text-muted-foreground">
              Total: {differenceInDays(parseISO(dataFim), parseISO(dataInicio)) + 1} dias
            </p>
          )}
          <div>
            <Label>Abono (dias, até 10)</Label>
            <Input type="number" min="0" max="10" value={diasAbono} onChange={e => setDiasAbono(e.target.value)} placeholder="0" />
          </div>
          <div>
            <Label>Observação</Label>
            <Input value={observacao} onChange={e => setObservacao(e.target.value)} placeholder="Opcional" />
          </div>
          <DialogFooter>
            <Button variant="outline" type="button" onClick={onClose}>Cancelar</Button>
            <Button type="submit" disabled={saving}>
              {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Registrar
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function FuncionarioFeriasRow({ func, solicitacoesFerias, solicitacoesBH, feriasConsumidas, onDarBaixa }) {
  const situacao = calcularSituacaoFerias(func.data_admissao, feriasConsumidas);
  const temDireitoFerias = !!situacao;

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
        <Button size="sm" variant="outline" onClick={() => onDarBaixa(func)}>
          <Plus className="w-3.5 h-3.5 mr-1" />Dar Baixa
        </Button>
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
              {!situacao.todosConsumidos && situacao && (
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
          {feriasConsumidas.length > 0 && (
            <div className="pt-1 border-t border-muted-foreground/20 mt-1">
              <p className="text-xs font-medium text-muted-foreground mb-0.5 flex items-center gap-1">
                <History className="w-3 h-3" />{feriasConsumidas.length} período(s) gozado(s)
              </p>
              {feriasConsumidas.slice(-2).map(f => (
                <p key={f.id} className="text-[11px] text-muted-foreground">
                  {f.periodo_aquisitivo}º período: {f.data_inicio && format(parseISO(f.data_inicio), 'dd/MM/yy')} a {f.data_fim && format(parseISO(f.data_fim), 'dd/MM/yy')} ({f.dias_gozados} dias)
                </p>
              ))}
              {feriasConsumidas.length > 2 && (
                <p className="text-[11px] text-muted-foreground">+ {feriasConsumidas.length - 2} período(s) anterior(es)</p>
              )}
            </div>
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
  const [filtro, setFiltro] = useState('todos');
  const [showDarBaixa, setShowDarBaixa] = useState(false);
  const [selectedFunc, setSelectedFunc] = useState(null);
  const queryClient = useQueryClient();

  const { data: solicitacoes = [], isLoading: loadingSol } = useQuery({
    queryKey: ['solicitacoes-ferias-bh'],
    queryFn: () => client.entities.SolicitacoesFuncionario.list(),
  });

  const { data: feriasConsumidas = [], isLoading: loadingFerias } = useQuery({
    queryKey: ['ferias_consumidas'],
    queryFn: () => client.entities.Ferias.list(),
  });

  const solFerias = solicitacoes.filter(s => s.tipo_solicitacao === 'ferias');
  const solBH = solicitacoes.filter(s => s.tipo_solicitacao === 'banco_horas');

  const lista = useMemo(() => {
    return funcionarios
      .filter(f => !f.data_demissao && f.ativo !== false)
      .filter(f => {
        const match = !search || f.nome?.toLowerCase().includes(search.toLowerCase());
        if (!match) return false;

        const funcFerias = feriasConsumidas.filter(fc => fc.funcionario_id === f.id);
        const situacao = calcularSituacaoFerias(f.data_admissao, funcFerias);
        const horasBH = solBH.filter(s => s.funcionario_id === f.id && (s.status === 'pendente' || s.status === 'aprovado'))
          .reduce((acc, s) => acc + (s.horas_compensar || 0), 0);

        if (filtro === 'vencendo') return situacao && !situacao.vencido && !situacao.todosConsumidos && (situacao.urgente || situacao.atencao);
        if (filtro === 'vencido') return situacao?.vencido && !situacao.todosConsumidos;
        if (filtro === 'bh_disponivel') return horasBH > 0;
        return situacao || horasBH > 0;
      })
      .sort((a, b) => {
        const sa = calcularSituacaoFerias(a.data_admissao, feriasConsumidas.filter(fc => fc.funcionario_id === a.id));
        const sb = calcularSituacaoFerias(b.data_admissao, feriasConsumidas.filter(fc => fc.funcionario_id === b.id));
        const score = (s) => {
          if (!s || s.todosConsumidos) return 100;
          if (s.vencido) return 0;
          if (s.urgente) return 1;
          if (s.atencao) return 2;
          return 3;
        };
        return score(sa) - score(sb);
      });
  }, [funcionarios, search, filtro, solBH, feriasConsumidas]);

  const handleDarBaixa = (func) => {
    setSelectedFunc(func);
    setShowDarBaixa(true);
  };

  const isLoading = loadingSol || loadingFerias;

  if (isLoading) return (
    <div className="space-y-3">{[1,2,3].map(i => <Skeleton key={i} className="h-36 rounded-xl" />)}</div>
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
        <Button onClick={() => { setSelectedFunc(null); setShowDarBaixa(true); }}>
          <Plus className="w-4 h-4 mr-2" />Dar Baixa
        </Button>
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-xl px-4 py-3 text-xs text-blue-700 space-y-0.5">
        <p className="font-semibold">📋 Regras CLT:</p>
        <p>• Direito a 30 dias de férias após 12 meses trabalhados (período aquisitivo)</p>
        <p>• Prazo máximo para concessão: até 11 meses após o fim do período aquisitivo</p>
        <p>• <span className="font-medium text-orange-600">Atenção:</span> férias vencidas geram multa de 1/3 extra ao empregador</p>
        <p>• Os períodos já gozados são descontados automaticamente do cálculo</p>
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
              feriasConsumidas={feriasConsumidas.filter(fc => fc.funcionario_id === func.id)}
              onDarBaixa={handleDarBaixa}
            />
          ))}
        </div>
      )}

      <DarBaixaModal
        open={showDarBaixa}
        onClose={() => { setShowDarBaixa(false); setSelectedFunc(null); }}
        funcionarios={funcionarios}
        feriasConsumidas={feriasConsumidas}
        selectedFunc={selectedFunc}
        onSaved={() => queryClient.invalidateQueries({ queryKey: ['ferias_consumidas'] })}
      />
    </div>
  );
}

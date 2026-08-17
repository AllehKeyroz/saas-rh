import React, { useMemo, useState, useRef } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { client } from '@/api/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';
import {
  CalendarDays, CalendarRange, Search, Plus, ChevronLeft, ChevronRight, AlertTriangle, Settings2,
} from 'lucide-react';
import { differenceInDays } from 'date-fns';
import {
  parseDataLocal, getStatusFerias, FERIAS_STATUS, calcularSaldoFerias,
  getFeriasSobrepostas, validarFracionamento, abonoMaximo, getHojeISO, getMarcosFuturos,
} from '@/lib/ferias';
import { formatDate } from '@/lib/formatters';
import { getCurrentTenantId } from '@/firebase/auth';

const MESES = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
const MESES_COMPLETOS = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
const LIMITE_AUSENCIAS_PADRAO = 2;

// Paleta determinística por setor (escala anual)
const SETOR_COLORS = [
  'bg-blue-500', 'bg-emerald-500', 'bg-amber-500', 'bg-purple-500', 'bg-rose-500',
  'bg-cyan-500', 'bg-orange-500', 'bg-teal-500', 'bg-fuchsia-500', 'bg-indigo-500',
  'bg-lime-500', 'bg-pink-500', 'bg-sky-500', 'bg-violet-500',
];

const STATUS_CELL = {
  [FERIAS_STATUS.PROGRAMADA]: 'bg-blue-500',
  [FERIAS_STATUS.EM_ANDAMENTO]: 'bg-amber-500',
  [FERIAS_STATUS.CONCLUIDA]: 'bg-slate-400',
};

function setorColorIndex(setor, setores) {
  const idx = setores.indexOf(setor);
  return idx >= 0 ? idx % SETOR_COLORS.length : setores.length % SETOR_COLORS.length;
}

// Indicador de pendência de férias por funcionário (aparece no calendário mesmo sem gozo lançado).
// Mostra o resumo por período: programados × pendentes (e concessão vencida, se houver).
// - Aquisitivo pendente: período aquisitivo fechado e férias não concedidas (âmbar, destaque)
// - Concessão vencida: prazo de concessão expirado → dobra (vermelho, mais crítico)
function PendenciaBadge({ func, feriasFunc }) {
  const saldo = calcularSaldoFerias(func, feriasFunc);
  const periodos = saldo?.periodos || [];
  if (periodos.length === 0) return <span className="inline-flex items-center text-[10px] text-muted-foreground whitespace-nowrap">Aquisitivo</span>;

  const pendentes = periodos.filter(p => p.estado === 'disponivel');
  const programados = periodos.filter(p => p.estado === 'programado' || p.estado === 'em_andamento');

  if (pendentes.length === 0) return <span className="inline-flex items-center text-[10px] text-green-700 whitespace-nowrap">Em dia</span>;

  const concessaoVencida = pendentes.filter(p => p.concessaoVencida).length;
  const partes = [];
  if (programados.length > 0) {
    partes.push(`${programados.length} programado${programados.length > 1 ? 's' : ''}`);
  }
  partes.push(`${pendentes.length} pendente${pendentes.length > 1 ? 's' : ''}`);
  if (concessaoVencida > 0) partes.push('dobra');

  const cls = concessaoVencida > 0
    ? 'bg-red-100 text-red-700'
    : 'bg-amber-300/60 text-amber-900 ring-1 ring-amber-500';
  return (
    <span className={`inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px] font-bold whitespace-nowrap ${cls}`}>
      <AlertTriangle className="w-3 h-3 shrink-0" />
      {partes.join(' · ')}
    </span>
  );
}

function celulaDiaMes(func, feriasLista, dia, mesIdx, ano, limiteSetor, ausenciasPorDia) {
  // Retorna { classe, conflito } para o dia de um funcionário na visão mensal.
  // Conflito = ausências do MESMO SETOR do funcionário >= limite do setor.
  if (!func) return { classe: '', conflito: false };
  const diaISO = `${ano}-${String(mesIdx + 1).padStart(2, '0')}-${String(dia).padStart(2, '0')}`;
  const diaDate = parseDataLocal(diaISO);
  const registros = feriasLista.filter(f => f.funcionario_id === func.id && f.cancelada !== true);
  for (const r of registros) {
    if (!r.data_inicio || !r.data_fim) continue;
    const ini = parseDataLocal(r.data_inicio);
    const fim = parseDataLocal(r.data_fim);
    if (isNaN(ini.getTime()) || isNaN(fim.getTime())) continue;
    if (diaDate >= ini && diaDate <= fim) {
      // Status baseado na data REAL de hoje (não no dia renderizado) para
      // manter consistência: programada=azul, em andamento=âmbar, concluída=cinza
      const status = getStatusFerias(r);
      const ausenciasDoSetor = (ausenciasPorDia?.get(diaISO)?.[func.setor]) || 0;
      const limite = limiteSetor?.[func.setor] ?? LIMITE_AUSENCIAS_PADRAO;
      const conflito = ausenciasDoSetor >= limite;
      return { classe: STATUS_CELL[status] || 'bg-slate-300', conflito };
    }
  }
  return { classe: '', conflito: false };
}

function VisaoMensal({ funcionarios, todasFerias, mesIdx, ano, limiteSetor }) {
  const diasNoMes = new Date(ano, mesIdx + 1, 0).getDate();

  // Conta ausências por setor/dia para marcar conflitos
  const ausenciasPorDia = useMemo(() => {
    const mapa = new Map();
    for (let d = 1; d <= diasNoMes; d++) {
      const diaISO = `${ano}-${String(mesIdx + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      const porSetor = {};
      for (const f of funcionarios) {
        if (!f.setor) continue;
        const registros = todasFerias.filter(x => x.funcionario_id === f.id && x.cancelada !== true && x.data_inicio && x.data_fim);
        for (const r of registros) {
          const ini = parseDataLocal(r.data_inicio);
          const fim = parseDataLocal(r.data_fim);
          const dDate = parseDataLocal(diaISO);
          if (isNaN(ini.getTime()) || isNaN(fim.getTime())) continue;
          if (dDate >= ini && dDate <= fim) {
            porSetor[f.setor] = (porSetor[f.setor] || 0) + 1;
          }
        }
      }
      mapa.set(diaISO, porSetor);
    }
    return mapa;
  }, [funcionarios, todasFerias, diasNoMes, mesIdx, ano]);

  // colunas do dia com conflito (nº ausências >= limite do setor)
  const diasConflito = useMemo(() => {
    const set = new Set();
    ausenciasPorDia.forEach((porSetor, diaISO) => {
      Object.entries(porSetor).forEach(([setor, n]) => {
        if (n >= (limiteSetor?.[setor] ?? LIMITE_AUSENCIAS_PADRAO)) set.add(diaISO);
      });
    });
    return set;
  }, [ausenciasPorDia, limiteSetor]);

  // Total de funcionários em férias por dia (soma de todos os setores)
  const totalAusenciasPorDia = useMemo(() => {
    const m = new Map();
    ausenciasPorDia.forEach((porSetor, diaISO) => {
      m.set(diaISO, Object.values(porSetor).reduce((s, n) => s + n, 0));
    });
    return m;
  }, [ausenciasPorDia]);

  const hojeISO = getHojeISO();
  const bodyRef = useRef(null);
  const footerRef = useRef(null);

  // Sincroniza o scroll horizontal entre o corpo e o rodapé de totais
  const syncBodyToFooter = () => {
    if (footerRef.current && bodyRef.current) footerRef.current.scrollLeft = bodyRef.current.scrollLeft;
  };
  const syncFooterToBody = () => {
    if (bodyRef.current && footerRef.current) bodyRef.current.scrollLeft = footerRef.current.scrollLeft;
  };

  const dias = Array.from({ length: diasNoMes }, (_, i) => i + 1);

  return (
    <div className="flex flex-col rounded-xl border overflow-hidden h-[calc(100vh-360px)] min-h-[220px]">
      {/* Corpo rolável (vertical e horizontal) */}
      <div ref={bodyRef} onScroll={syncBodyToFooter} className="flex-1 overflow-auto">
        <table className="border-collapse min-w-full">
          <thead>
            <tr>
              <th className="sticky left-0 bg-card z-10 px-3 py-2 text-left text-xs font-semibold text-muted-foreground border-b min-w-[180px]">
                Funcionário
              </th>
              {dias.map(d => {
                const diaISO = `${ano}-${String(mesIdx + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
                const conflito = diasConflito.has(diaISO);
                const isHoje = diaISO === hojeISO;
                return (
                  <th key={d} className={`border-b border-l px-0 py-1 text-center text-[10px] font-medium w-[22px] ${isHoje ? 'bg-primary/10' : ''}`}>
                    <div className="flex flex-col items-center">
                      <span className={conflito ? 'text-red-600 font-bold' : 'text-muted-foreground'}>{d}</span>
                      {conflito && <AlertTriangle className="w-2.5 h-2.5 text-red-500" />}
                    </div>
                  </th>
                );
              })}
              <th className="border-b border-l px-2 py-1 text-left text-[10px] font-semibold text-muted-foreground min-w-[90px]">
                Pendência
              </th>
            </tr>
          </thead>
          <tbody>
            {funcionarios.map(func => {
              const feriasFunc = todasFerias.filter(f => f.funcionario_id === func.id);
              return (
                <tr key={func.id} className="border-b last:border-0">
                  <td className="sticky left-0 bg-card z-10 px-3 py-1 text-xs font-medium whitespace-nowrap">
                    <div className="flex items-center gap-1.5 truncate">
                      <span className={`w-2 h-2 rounded-full shrink-0 ${SETOR_COLORS[setorColorIndex(func.setor, [...new Set(funcionarios.map(f => f.setor))])]}`} />
                      <span className="truncate">{func.nome}</span>
                      {func.setor && <span className="text-[10px] text-muted-foreground truncate">· {func.setor}</span>}
                    </div>
                  </td>
                  {dias.map(d => {
                    const diaISO = `${ano}-${String(mesIdx + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
                    const { classe, conflito } = celulaDiaMes(func, todasFerias, d, mesIdx, ano, limiteSetor, ausenciasPorDia);
                    return (
                      <td key={d} className={`border-l p-0.5 h-6 ${classe ? classe + ' rounded-sm' : ''} ${conflito ? 'ring-2 ring-red-500 ring-inset rounded-sm' : ''} ${diaISO === hojeISO ? 'bg-primary/5' : ''}`} />
                    );
                  })}
                  <td className="border-l px-2 py-1 align-middle">
                    <PendenciaBadge func={func} feriasFunc={feriasFunc} />
                  </td>
                </tr>
              );
            })}
            {funcionarios.length === 0 && (
              <tr><td colSpan={diasNoMes + 2} className="text-center py-10 text-muted-foreground text-sm">
                Nenhum funcionário para exibir
              </td></tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Rodapé fixo — Total ausentes no dia (sempre visível, sem rolar) */}
      <div ref={footerRef} onScroll={syncFooterToBody} className="shrink-0 overflow-x-auto border-t-2 border-border bg-muted">
        <table className="border-collapse min-w-full">
          <tfoot>
            <tr>
              <td className="sticky left-0 bg-muted z-10 px-3 py-2 text-xs font-bold text-foreground border-r align-middle min-w-[180px]">
                Total ausentes no dia
              </td>
              {dias.map(d => {
                const diaISO = `${ano}-${String(mesIdx + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
                const total = totalAusenciasPorDia.get(diaISO) || 0;
                return (
                  <td key={d} className={`border-l px-0 py-2 text-center align-middle w-[22px] ${total >= 2 ? 'text-red-600' : total > 0 ? 'text-amber-700' : 'text-transparent'}`}>
                    {total > 0 ? total : ''}
                  </td>
                );
              })}
              <td className="border-l px-2 py-2 align-middle min-w-[90px]" />
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
}

function VisaoAnual({ funcionarios, todasFerias, ano, limiteSetor }) {
  const setores = [...new Set(funcionarios.map(f => f.setor).filter(Boolean))];

  // Setores com ausências simultâneas >= limite em cada mês (visão aproximada por sobreposição no mês)
  const setorOverMes = useMemo(() => {
    const map = {};
    for (let m = 0; m < 12; m++) {
      const first = new Date(ano, m, 1);
      const last = new Date(ano, m + 1, 0);
      const counts = {};
      for (const f of funcionarios) {
        if (!f.setor) continue;
        const tem = (todasFerias || []).some(r => {
          if (r.funcionario_id !== f.id || r.cancelada === true || !r.data_inicio || !r.data_fim) return false;
          const ini = parseDataLocal(r.data_inicio);
          const fim = parseDataLocal(r.data_fim);
          if (isNaN(ini.getTime()) || isNaN(fim.getTime())) return false;
          return ini <= last && fim >= first;
        });
        if (tem) counts[f.setor] = (counts[f.setor] || 0) + 1;
      }
      map[m] = new Set(
        Object.entries(counts)
          .filter(([s, n]) => n >= (limiteSetor?.[s] ?? LIMITE_AUSENCIAS_PADRAO))
          .map(([s]) => s)
      );
    }
    return map;
  }, [funcionarios, todasFerias, ano, limiteSetor]);

  // Marcadores de prazo (período concessivo / aquisição) — ano atual e próximo, apenas meses futuros
  const anoAtual = new Date().getFullYear();
  const ehAnoComMarcos = ano === anoAtual || ano === anoAtual + 1;
  const mesAtual = ano === anoAtual ? new Date().getMonth() : 0;

  return (
    <div className="overflow-x-auto rounded-xl border">
      <table className="border-collapse min-w-full">
        <thead>
          <tr>
            <th className="sticky left-0 bg-card z-10 px-3 py-2 text-left text-xs font-semibold text-muted-foreground border-b min-w-[180px]">
              Funcionário
            </th>
            {MESES.map((m, i) => (
              <th key={m} className="border-b border-l px-1 py-2 text-center text-[10px] font-medium text-muted-foreground w-14">
                {m}
              </th>
            ))}
            <th className="border-b border-l px-2 py-2 text-left text-[10px] font-semibold text-muted-foreground min-w-[90px]">
              Pendência
            </th>
          </tr>
        </thead>
        <tbody>
          {funcionarios.map(func => {
            const feriasFunc = todasFerias.filter(f => f.funcionario_id === func.id && f.cancelada !== true);
            const cor = SETOR_COLORS[setorColorIndex(func.setor, setores)];
            const marcos = ehAnoComMarcos ? (getMarcosFuturos(func.data_admissao, feriasFunc, ano, mesAtual).porMes || {}) : {};
            return (
              <tr key={func.id} className="border-b last:border-0">
                <td className="sticky left-0 bg-card z-10 px-3 py-1 text-xs font-medium whitespace-nowrap">
                  <div className="flex items-center gap-1.5 truncate">
                    <span className={`w-2 h-2 rounded-full shrink-0 ${cor}`} />
                    <span className="truncate">{func.nome}</span>
                    {func.setor && <span className="text-[10px] text-muted-foreground truncate">· {func.setor}</span>}
                  </div>
                </td>
                {MESES.map((_, mesIdx) => {
                  const doMes = feriasFunc.filter(r => {
                    if (!r.data_inicio || !r.data_fim) return false;
                    const ini = parseDataLocal(r.data_inicio);
                    const fim = parseDataLocal(r.data_fim);
                    if (isNaN(ini.getTime()) || isNaN(fim.getTime())) return false;
                    const alvo = new Date(ano, mesIdx, 1);
                    const first = new Date(ano, mesIdx, 1);
                    const last = new Date(ano, mesIdx + 1, 0);
                    return ini <= last && fim >= first && alvo >= new Date(ini.getFullYear(), ini.getMonth(), 1) && alvo <= new Date(fim.getFullYear(), fim.getMonth(), 1);
                  });
                  const status = doMes[0] ? getStatusFerias(doMes[0]) : null;
                  const conflito = doMes[0] && setorOverMes[mesIdx]?.has(func.setor);
                  const marcador = marcos[mesIdx] || null;
                  const titulo = doMes[0]
                    ? `${func.nome}: ${formatDate(doMes[0].data_inicio)} → ${formatDate(doMes[0].data_fim)}${conflito ? ' (conflito de setor)' : ''}`
                    : `${func.nome}: sem férias em ${MESES_COMPLETOS[mesIdx]}/${ano}`;
                  const tituloPrazo = marcador
                    ? `${titulo}${marcador.aquisicao ? ' · aquisição de direito' : ''}${marcador.concessao ? (marcador.limite ? ' · LIMITE da concessão' : ' · janela de concessão') : ''}`
                    : titulo;
                  return (
                    <td key={mesIdx} className="relative border-l p-0.5 h-6" title={tituloPrazo}>
                      {doMes[0] && (
                        <div className={`h-full rounded-sm ${STATUS_CELL[status] || cor} ${conflito ? 'ring-2 ring-red-500 ring-inset' : ''}`} />
                      )}
                      {marcador?.aquisicao && (
                        <span className="absolute top-0 left-1/2 -translate-x-1/2 w-1.5 h-1.5 rounded-full bg-cyan-500" />
                      )}
                      {marcador?.concessao && (
                        <span className={`absolute bottom-0 left-0 right-0 h-[3px] ${marcador.limite ? 'bg-red-500' : 'bg-teal-500'}`} />
                      )}
                    </td>
                  );
                })}
                <td className="border-l px-2 py-1 align-middle">
                  <PendenciaBadge func={func} feriasFunc={feriasFunc} />
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function ProgramarModal({ open, onClose, funcionarios, todasFerias, limiteSetor, onSaved }) {
  const [funcId, setFuncId] = useState('');
  const [dataInicio, setDataInicio] = useState('');
  const [dataFim, setDataFim] = useState('');
  const [abono, setAbono] = useState(0);
  const [saving, setSaving] = useState(false);
  const queryClient = useQueryClient();

  const func = funcionarios.find(f => f.id === funcId);
  const feriasFunc = todasFerias.filter(f => f.funcionario_id === funcId && f.cancelada !== true);
  const saldo = calcularSaldoFerias(func, feriasFunc);
  const periodoPendente = saldo.periodos.find(p => p.estado === 'disponivel');

  const dias = dataInicio && dataFim && new Date(dataFim) >= new Date(dataInicio)
    ? differenceInDays(parseDataLocal(dataFim), parseDataLocal(dataInicio)) + 1
    : 0;

  const conflitos = useMemo(() => {
    if (!func || !dataInicio || !dataFim) return [];
    return getFeriasSobrepostas({
      setor: func.setor,
      dataInicio,
      dataFim,
      todasFerias,
      funcionarios,
      excluirFuncionarioId: func.id,
    });
  }, [func, dataInicio, dataFim, todasFerias, funcionarios]);

  const fracionamento = validarFracionamento([...feriasFunc.filter(r => getStatusFerias(r) === FERIAS_STATUS.CONCLUIDA || getStatusFerias(r) === FERIAS_STATUS.PROGRAMADA).map(r => ({ dias: r.dias_gozados })), { dias }]);

  const abonoMax = abonoMaximo(30);
  const podeSalvar = !!func && !!dataInicio && !!dataFim && new Date(dataFim) >= new Date(dataInicio) && !saving;

  const handleSave = async () => {
    setSaving(true);
    try {
      if (abono > abonoMax) {
        toast.error(`Abono máximo permitido: ${abonoMax} dias (art. 143 CLT)`);
        setSaving(false);
        return;
      }
      const periodoAquisitivo = periodoPendente?.numero ?? null;
      await client.entities.Ferias.create({
        funcionario_id: func.id,
        funcionario_nome: func.nome || '',
        periodo_aquisitivo: periodoAquisitivo,
        data_inicio: dataInicio,
        data_fim: dataFim,
        dias_gozados: dias,
        dias_abono: abono || 0,
        observacao: 'Programação pela escala de férias',
        origem: 'escala',
        tenant_id: getCurrentTenantId(),
      });
      toast.success(`Férias de ${func.nome} programadas!`);
      queryClient.invalidateQueries({ queryKey: ['ferias'] });
      queryClient.invalidateQueries({ queryKey: ['ferias_dashboard'] });
      queryClient.invalidateQueries({ queryKey: ['ferias_consumidas'] });
      onSaved?.();
      onClose();
    } catch (e) {
      toast.error(e?.message || 'Erro ao programar férias');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o && !saving) onClose(); }}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CalendarRange className="w-5 h-5 text-primary" />
            Programar Férias
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label>Funcionário *</Label>
            <Select value={funcId} onValueChange={setFuncId}>
              <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
              <SelectContent>
                {[...funcionarios].sort((a, b) => (a.nome || '').localeCompare(b.nome || '')).map(f => (
                  <SelectItem key={f.id} value={f.id}>{f.nome}{f.setor ? ` — ${f.setor}` : ''}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {func && (
            <div className="rounded-lg border border-green-200 bg-green-50 px-3 py-2 text-xs text-green-800 space-y-0.5">
              <p className="font-semibold">Saldo: {saldo.diasDisponiveis} dias disponíveis</p>
              {periodoPendente && (
                <p>
                  {periodoPendente.numero}º período aquisitivo ({formatDate(periodoPendente.inicio.toISOString())} — {formatDate(periodoPendente.fim.toISOString())})
                  {periodoPendente.concessaoVencida && <span className="font-semibold text-red-700"> · prazo de concessão VENCIDO (dobra)</span>}
                  {!periodoPendente.concessaoVencida && <span className="font-semibold text-red-700"> · férias vencida — conceda</span>}
                </p>
              )}
              {!periodoPendente && <p className="text-red-700 font-medium">Sem período aquisitivo pendente para este funcionário.</p>}
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Data início *</Label>
              <Input type="date" value={dataInicio} onChange={e => setDataInicio(e.target.value)} />
            </div>
            <div>
              <Label>Data fim *</Label>
              <Input type="date" value={dataFim} onChange={e => setDataFim(e.target.value)} />
            </div>
          </div>
          {dias > 0 && <p className="text-xs text-muted-foreground">Total: {dias} dias</p>}

          <div>
            <Label>Abono pecuniário (até {abonoMax} dias)</Label>
            <Input type="number" min="0" max={abonoMax} value={abono} onChange={e => setAbono(Number(e.target.value) || 0)} />
          </div>

          {conflitos.length > 0 && (
            <div className="rounded-lg border border-orange-200 bg-orange-50 px-3 py-2 space-y-1">
              <p className="text-xs font-semibold text-orange-800 flex items-center gap-1">
                <AlertTriangle className="w-3.5 h-3.5" />
                {conflitos.length} funcionário(s) do setor com férias no período:
              </p>
              {conflitos.slice(0, 5).map((c, i) => (
                <p key={i} className="text-xs text-orange-700">
                  • {c.funcionario?.nome || '—'} ({formatDate(c.ferias.data_inicio)} → {formatDate(c.ferias.data_fim)})
                </p>
              ))}
            </div>
          )}

          {dias > 0 && fracionamento && !fracionamento.valido && (
            <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
              {fracionamento.erros.map((erro, i) => <p key={i}>• {erro}</p>)}
            </div>
          )}

          {!func?.setor && (
            <p className="text-xs text-muted-foreground">
              Funcionário sem setor definido — não haverá verificação de conflito por setor.
            </p>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={onClose} disabled={saving}>Cancelar</Button>
            <Button onClick={handleSave} disabled={!podeSalvar}>
              {saving ? 'Salvando...' : 'Programar'}
            </Button>
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function LimitesSetorDialog({ open, onClose, setores, limiteSetor, onSaved }) {
  const [valores, setValores] = useState(limiteSetor);
  const [saving, setSaving] = useState(false);
  const queryClient = useQueryClient();

  const handleSave = async () => {
    setSaving(true);
    try {
      const payload = { chave: 'limite_ausencias_setor', valor: valores, ativa: true };
      const existente = await client.entities.ConfiguracoesRH.filter({ chave: 'limite_ausencias_setor' });
      if (existente[0]) {
        await client.entities.ConfiguracoesRH.update(existente[0].id, { valor: valores });
      } else {
        await client.entities.ConfiguracoesRH.create(payload);
      }
      toast.success('Limites por setor salvos!');
      queryClient.invalidateQueries({ queryKey: ['limite_ausencias_setor'] });
      onSaved?.();
      onClose();
    } catch (e) {
      toast.error(e?.message || 'Erro ao salvar limites');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o && !saving) onClose(); }}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Settings2 className="w-5 h-5 text-primary" />
            Limite de ausências por setor
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <p className="text-xs text-muted-foreground">
            Número máximo de funcionários do setor em férias simultâneas antes do alerta de conflito.
          </p>
          {setores.map(s => (
            <div key={s} className="flex items-center justify-between gap-3">
              <Label className="flex-1">{s}</Label>
              <Input
                type="number"
                min="1"
                className="w-20 text-center"
                value={valores[s] ?? LIMITE_AUSENCIAS_PADRAO}
                onChange={e => setValores(prev => ({ ...prev, [s]: Number(e.target.value) || 1 }))}
              />
            </div>
          ))}
          {setores.length === 0 && <p className="text-sm text-muted-foreground">Nenhum setor cadastrado.</p>}
          <DialogFooter>
            <Button variant="outline" onClick={onClose} disabled={saving}>Cancelar</Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? 'Salvando...' : 'Salvar'}
            </Button>
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default function FeriasCalendario() {
  const [view, setView] = useState('mensal');
  const hoje = new Date();
  const [mesIdx, setMesIdx] = useState(hoje.getMonth());
  const [ano, setAno] = useState(hoje.getFullYear());
  const [setorFiltro, setSetorFiltro] = useState('todos');
  const [pendFiltro, setPendFiltro] = useState('todas');
  const [search, setSearch] = useState('');
  const [programarOpen, setProgramarOpen] = useState(false);
  const [limitesOpen, setLimitesOpen] = useState(false);
  const queryClient = useQueryClient();

  const { data: funcionarios = [], isLoading: loadingFunc } = useQuery({
    queryKey: ['funcionarios'],
    queryFn: () => client.entities.Funcionarios.list(),
  });

  const { data: todasFerias = [], isLoading: loadingFerias } = useQuery({
    queryKey: ['ferias'],
    queryFn: () => client.entities.Ferias.list(),
  });

  const { data: configs = [] } = useQuery({
    queryKey: ['limite_ausencias_setor'],
    queryFn: () => client.entities.ConfiguracoesRH.filter({ chave: 'limite_ausencias_setor' }),
  });
  const limiteSetor = configs[0]?.valor || {};

  const ativos = useMemo(() =>
    funcionarios.filter(f => f.ativo !== false && !f.data_demissao),
  [funcionarios]);

  const setores = useMemo(() => [...new Set(ativos.map(f => f.setor).filter(Boolean))], [ativos]);

  const filtrados = useMemo(() => {
    return ativos
      .filter(f => setorFiltro === 'todos' || f.setor === setorFiltro)
      .filter(f => !search || f.nome?.toLowerCase().includes(search.toLowerCase()))
      .filter(f => {
        if (pendFiltro === 'todas') return true;
        const saldo = calcularSaldoFerias(f, todasFerias.filter(x => x.funcionario_id === f.id));
        const pendentes = (saldo?.periodos || []).filter(p => p.estado === 'disponivel');
        if (pendentes.length === 0) return false;
        if (pendFiltro === 'concessao') return pendentes.some(p => p.concessaoVencida);
        if (pendFiltro === 'aquisitivo') return !pendentes.some(p => p.concessaoVencida);
        return true;
      })
      .sort((a, b) => (a.nome || '').localeCompare(b.nome || ''));
  }, [ativos, setorFiltro, search, pendFiltro, todasFerias]);

  const navegarMes = (dir) => {
    let m = mesIdx + dir;
    let y = ano;
    if (m < 0) { m = 11; y--; }
    if (m > 11) { m = 0; y++; }
    setMesIdx(m);
    setAno(y);
  };

  const isLoading = loadingFunc || loadingFerias;

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <CalendarDays className="w-6 h-6 text-primary" />
            Calendário de Férias
          </h1>
          <p className="text-muted-foreground text-sm">Escala anual e visão mensal das férias da equipe</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => setLimitesOpen(true)}>
            <Settings2 className="w-4 h-4 mr-2" />Limites por Setor
          </Button>
          <Button onClick={() => setProgramarOpen(true)}>
            <Plus className="w-4 h-4 mr-2" />Programar Férias
          </Button>
        </div>
      </div>

      {/* Controles */}
      <div className="flex flex-wrap gap-3 items-center bg-card border rounded-xl p-3">
        <div className="flex rounded-lg border overflow-hidden">
          <button
            onClick={() => setView('mensal')}
            className={`px-3 py-1.5 text-xs font-medium transition-colors ${view === 'mensal' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-muted'}`}
          >
            Mensal
          </button>
          <button
            onClick={() => setView('anual')}
            className={`px-3 py-1.5 text-xs font-medium transition-colors ${view === 'anual' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-muted'}`}
          >
            Escala Anual
          </button>
        </div>

        {view === 'mensal' && (
          <div className="flex items-center gap-1">
            <Button variant="outline" size="sm" onClick={() => navegarMes(-1)}><ChevronLeft className="w-4 h-4" /></Button>
            <span className="text-sm font-semibold w-40 text-center">{MESES_COMPLETOS[mesIdx]} {ano}</span>
            <Button variant="outline" size="sm" onClick={() => navegarMes(1)}><ChevronRight className="w-4 h-4" /></Button>
          </div>
        )}

        {view === 'anual' && (
          <div className="flex items-center gap-1">
            <Button variant="outline" size="sm" onClick={() => setAno(a => a - 1)}><ChevronLeft className="w-4 h-4" /></Button>
            <span className="text-sm font-semibold w-14 text-center">{ano}</span>
            <Button variant="outline" size="sm" onClick={() => setAno(a => a + 1)}><ChevronRight className="w-4 h-4" /></Button>
          </div>
        )}

        <div className="relative flex-1 min-w-[160px] max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Buscar funcionário..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9 h-9 text-sm" />
        </div>

        <Select value={setorFiltro} onValueChange={setSetorFiltro}>
          <SelectTrigger className="w-48 h-9 text-sm"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos os setores</SelectItem>
            {setores.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
          </SelectContent>
        </Select>

        <Select value={pendFiltro} onValueChange={setPendFiltro}>
          <SelectTrigger className="w-52 h-9 text-sm"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="todas">Todas as pendências</SelectItem>
            <SelectItem value="aquisitivo">🟠 Aquisitivo pendente</SelectItem>
            <SelectItem value="concessao">🔴 Concessão vencida</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Legenda */}
      <div className="flex flex-wrap gap-3 text-xs text-muted-foreground items-center">
        <span className="font-medium text-foreground">Legenda:</span>
        <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-sm bg-blue-500 inline-block" /> Programada</span>
        <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-sm bg-amber-500 inline-block" /> Em andamento</span>
        <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-sm bg-slate-400 inline-block" /> Concluída</span>
        <span className="flex items-center gap-1"><span className="w-3 h-[3px] bg-teal-500 inline-block" /> Janela de concessão</span>
        <span className="flex items-center gap-1"><span className="w-3 h-[3px] bg-red-500 inline-block" /> Limite da concessão (dobra)</span>
        <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-cyan-500 inline-block" /> Aquisição de direito</span>
        <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-sm ring-2 ring-red-500 inline-block" /> Conflito de setor (≥ limite)</span>
        <span className="flex items-center gap-1"><AlertTriangle className="w-3.5 h-3.5 text-red-500" /> Dia com ausências excessivas</span>
      </div>

      {isLoading ? (
        <div className="space-y-3">{[1, 2, 3].map(i => <Skeleton key={i} className="h-10 rounded-xl" />)}</div>
      ) : view === 'mensal' ? (
        <VisaoMensal funcionarios={filtrados} todasFerias={todasFerias} mesIdx={mesIdx} ano={ano} limiteSetor={limiteSetor} />
      ) : (
        <VisaoAnual funcionarios={filtrados} todasFerias={todasFerias} ano={ano} limiteSetor={limiteSetor} />
      )}

      <ProgramarModal
        open={programarOpen}
        onClose={() => setProgramarOpen(false)}
        funcionarios={filtrados}
        todasFerias={todasFerias}
        limiteSetor={limiteSetor}
        onSaved={() => queryClient.invalidateQueries({ queryKey: ['ferias'] })}
      />

      <LimitesSetorDialog
        open={limitesOpen}
        onClose={() => setLimitesOpen(false)}
        setores={setores}
        limiteSetor={limiteSetor}
      />
    </div>
  );
}

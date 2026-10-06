import React, { useMemo, useState, useRef, useEffect } from 'react';
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
  Download, FileSpreadsheet, FileText, CalendarX2,
} from 'lucide-react';
import { differenceInDays } from 'date-fns';
import {
  parseDataLocal, getStatusFerias, FERIAS_STATUS, calcularSaldoFerias, isFeriasAtiva,
  getFeriasSobrepostas, getSobreposicaoFuncionario, validarFracionamento, abonoMaximo, getHojeISO, getMarcosFuturos,
  getFeriasEmendadas, diasFeriasPorFaltas,
} from '@/lib/ferias';
import { getFeriadosCompletos, verificarRegra48h } from '@/lib/feriados';
import { getEscalaEfetiva, verificarRegra48hFolga } from '@/lib/escalaFolga';
import { exportarEscalaCSV, exportarEscalaPDF } from '@/lib/exportarEscala';
import FeriadosDialog from '@/components/feriados/FeriadosDialog';
import { formatDate } from '@/lib/formatters';
import { getCurrentTenantId } from '@/firebase/auth';

const MESES = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
const MESES_COMPLETOS = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
const DIA_INICIAIS = ['D', 'S', 'T', 'Q', 'Q', 'S', 'S'];
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

  const pendentes = periodos.filter(p => p.saldoRestante > 0);
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
  // Retorna { classe, conflito, titulo } para o dia de um funcionário na visão mensal.
  // Conflito = ausências do MESMO SETOR do funcionário >= limite do setor.
  if (!func) return { classe: '', conflito: false, titulo: '' };
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
      return {
        classe: STATUS_CELL[status] || 'bg-slate-300',
        conflito,
        titulo: `${func.nome}: ${formatDate(r.data_inicio)} → ${formatDate(r.data_fim)}`,
      };
    }
  }
  return { classe: '', conflito: false, titulo: '' };
}

function VisaoMensal({ funcionarios, todasFerias, mesIdx, ano, limiteSetor, onProgramar, feriadosExtras }) {
  const diasNoMes = new Date(ano, mesIdx + 1, 0).getDate();

  // Feriados do mês exibido (nacionais + extras) para destaque visual
  const feriadosDoMes = useMemo(() => {
    const prefixo = `${ano}-${String(mesIdx + 1).padStart(2, '0')}-`;
    return getFeriadosCompletos(ano, feriadosExtras).filter(f => f.data.startsWith(prefixo));
  }, [ano, mesIdx, feriadosExtras]);

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
                const feriado = feriadosDoMes.find(f => f.data === diaISO);
                const dow = new Date(diaISO + 'T00:00:00').getDay();
                return (
                  <th key={d} title={feriado ? `Feriado: ${feriado.nome}` : undefined}
                    className={`border-b border-l px-0 py-1 text-center text-[10px] font-medium w-[22px] ${isHoje ? 'bg-primary/10' : ''} ${feriado ? 'bg-red-50' : ''}`}>
                    <div className="flex flex-col items-center leading-none">
                      <span className={`text-[8px] ${feriado ? 'text-red-500' : 'text-muted-foreground/60'}`}>{DIA_INICIAIS[dow]}</span>
                      <span className={`mt-0.5 ${feriado ? 'text-red-600 font-bold' : conflito ? 'text-red-600 font-bold' : 'text-muted-foreground'}`}>{d}</span>
                      {feriado && <span className="w-1 h-1 rounded-full bg-red-500 mt-0.5" />}
                      {conflito && !feriado && <AlertTriangle className="w-2.5 h-2.5 text-red-500 mt-0.5" />}
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
<tr key={func.id} onClick={() => onProgramar?.(func)} title={`Clique para programar férias de ${func.nome}`} className="border-b last:border-0 cursor-pointer hover:bg-muted/40 transition-colors">
                  <td className="sticky left-0 bg-card z-10 px-3 py-1 text-xs font-medium whitespace-nowrap">
                    <div className="flex items-center gap-1.5 truncate">
                      <span className={`w-2 h-2 rounded-full shrink-0 ${SETOR_COLORS[setorColorIndex(func.setor, [...new Set(funcionarios.map(f => f.setor))])]}`} />
                      <span className="truncate">{func.nome}</span>
                      {func.setor && <span className="text-[10px] text-muted-foreground truncate">· {func.setor}</span>}
                    </div>
                  </td>
                  {dias.map(d => {
                    const diaISO = `${ano}-${String(mesIdx + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
                    const { classe, conflito, titulo } = celulaDiaMes(func, todasFerias, d, mesIdx, ano, limiteSetor, ausenciasPorDia);
                    return (
                      <td key={d} title={titulo || undefined} className={`border-l p-0.5 h-6 ${classe ? classe + ' rounded-sm' : ''} ${conflito ? 'ring-2 ring-red-500 ring-inset rounded-sm' : ''} ${diaISO === hojeISO ? 'bg-primary/5' : ''}`} />
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

function VisaoAnual({ funcionarios, todasFerias, ano, limiteSetor, onProgramar }) {
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
              <tr key={func.id} onClick={() => onProgramar?.(func)} title={`Clique para programar férias de ${func.nome}`} className="border-b last:border-0 cursor-pointer hover:bg-muted/40 transition-colors">
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

function ProgramarModal({ open, onClose, funcionarios, todasFerias, limiteSetor, onSaved, funcionarioInicial, feriadosExtras }) {
  const [funcId, setFuncId] = useState('');
  const [periodoNum, setPeriodoNum] = useState('');
  const [dataInicio, setDataInicio] = useState('');
  const [dataFim, setDataFim] = useState('');
  const [abono, setAbono] = useState(0);
  const [faltas, setFaltas] = useState(0);
  const [saving, setSaving] = useState(false);
  const queryClient = useQueryClient();

  // Ao abrir, pré-seleciona o funcionário clicado no calendário (atalho) e limpa o estado anterior
  useEffect(() => {
    if (open) {
      setFuncId(funcionarioInicial?.id || '');
      setPeriodoNum('');
      setDataInicio('');
      setDataFim('');
      setAbono(0);
      setFaltas(0);
    }
  }, [open, funcionarioInicial]);

  // Carrega as faltas registradas do período selecionado (art. 130)
  useEffect(() => {
    const f = funcionarios.find(x => x.id === funcId);
    const n = Number(periodoNum);
    if (!f || !n) { setFaltas(0); return; }
    setFaltas(Number(f.faltas_por_periodo?.[n]) || 0);
  }, [funcId, periodoNum, funcionarios]);

  const func = funcionarios.find(f => f.id === funcId);
  const feriasFunc = todasFerias.filter(f => f.funcionario_id === funcId && f.cancelada !== true);
  const saldo = calcularSaldoFerias(func, feriasFunc);

  // Períodos com saldo restante (disponíveis para programar)
  const periodosComSaldo = (saldo?.periodos || []).filter(p => p.saldoRestante > 0);
  const periodoSelecionado = saldo?.periodos?.find(p => p.numero === Number(periodoNum)) || null;
  const saldoRestante = periodoSelecionado?.saldoRestante || 0;

  const dias = dataInicio && dataFim && new Date(dataFim) >= new Date(dataInicio)
    ? differenceInDays(parseDataLocal(dataFim), parseDataLocal(dataInicio)) + 1
    : 0;

  // Regra do art. 134 §3º: férias não podem começar nos 2 dias anteriores a feriado
  const viola48h = dataInicio
    ? verificarRegra48h(dataInicio, getFeriadosCompletos(new Date(dataInicio + 'T00:00:00').getFullYear(), feriadosExtras))
    : null;

  // Regra do art. 134 §3º: também não podem começar 2 dias antes da folga/DSR do funcionário
  const { data: escalasFunc = [] } = useQuery({
    queryKey: ['escala_folga_func', funcId],
    queryFn: () => funcId ? client.entities.EscalaFolga.filter({ funcionario_id: funcId }) : [],
    enabled: !!funcId,
  });
  const escalaEfetiva = dataInicio ? getEscalaEfetiva(escalasFunc, dataInicio) : null;
  const viola48hFolga = dataInicio ? verificarRegra48hFolga(escalaEfetiva, dataInicio) : null;

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

  // Sobreposição do MESMO funcionário → bloqueia (evita dupla contagem de dias)
  const sobreposicao = useMemo(() => {
    if (!func || !dataInicio || !dataFim) return [];
    return getSobreposicaoFuncionario(func.id, dataInicio, dataFim, feriasFunc);
  }, [func, dataInicio, dataFim, feriasFunc]);

  // Fracionamento: apenas as partes do MESMO período selecionado + o candidato
  const partesDoPeriodo = periodoSelecionado
    ? feriasFunc
        .filter(r => r.periodo_aquisitivo === periodoSelecionado.numero)
        .map(r => ({ dias: r.dias_gozados }))
    : [];
  const fracionamento = dias > 0 && periodoSelecionado
    ? validarFracionamento([...partesDoPeriodo, { dias }])
    : null;

  // Férias "emendadas" (sem ao menos 1 dia de trabalho entre períodos) — aviso soft
  const emendadas = func && dataInicio && dataFim
    ? getFeriasEmendadas(func.id, dataInicio, dataFim, feriasFunc)
    : [];

  // Total de dias de direito do período conforme as faltas informadas (art. 130)
  const totalPeriodoFaltas = diasFeriasPorFaltas(faltas);

  const abonoMax = abonoMaximo(30);
  const excedeSaldo = dias > saldoRestante;
  // Abono pecuniário também consome o saldo (art. 143) — gozo + abono não podem passar do restante
  const excedeComAbono = dias + abono > saldoRestante;
  const podeSalvar = !!func && !!periodoSelecionado && !!dataInicio && !!dataFim
    && new Date(dataFim) >= new Date(dataInicio)
    && dias > 0 && !excedeSaldo && !excedeComAbono
    && sobreposicao.length === 0
    && (!fracionamento || fracionamento.valido)
    && !saving;

  // Motivos que impedem salvar (exibidos de forma clara perto do botão)
  const motivosBloqueio = [];
  if (!func) motivosBloqueio.push('Selecione o funcionário.');
  if (func && !periodoSelecionado) motivosBloqueio.push('Selecione o período aquisitivo.');
  if (func && periodoSelecionado && !dataInicio) motivosBloqueio.push('Informe a data de início.');
  if (func && periodoSelecionado && !dataFim) motivosBloqueio.push('Informe a data de fim.');
  if (dataInicio && dataFim && new Date(dataFim) < new Date(dataInicio)) motivosBloqueio.push('A data fim não pode ser anterior à data início.');
  if (excedeSaldo) motivosBloqueio.push(`Você pediu ${dias} dia(s), mas o período tem apenas ${saldoRestante} dia(s) de saldo (máximo ${totalPeriodoFaltas} por período). Reduza o intervalo.`);
  if (!excedeSaldo && excedeComAbono) motivosBloqueio.push(`Gozo (${dias}) + abono (${abono}) = ${dias + abono} dia(s), acima do saldo de ${saldoRestante} dia(s) do período (o abono consome o saldo — art. 143).`);
  if (sobreposicao.length > 0) motivosBloqueio.push('Este funcionário já tem férias nesse período (sobreposição).');
  if (fracionamento && !fracionamento.valido) motivosBloqueio.push(`Fracionamento inválido: ${fracionamento.erros.join(' ')}`);

  const handleSave = async () => {
    setSaving(true);
    try {
      if (abono > abonoMax) {
        toast.error(`Abono máximo permitido: ${abonoMax} dias (art. 143 CLT)`);
        setSaving(false);
        return;
      }
      // Persiste as faltas do período (art. 130) no cadastro do funcionário, se mudou
      const faltasAtuais = Number(func.faltas_por_periodo?.[periodoSelecionado.numero]) || 0;
      if (faltas !== faltasAtuais) {
        await client.entities.Funcionarios.update(func.id, {
          faltas_por_periodo: { ...(func.faltas_por_periodo || {}), [periodoSelecionado.numero]: faltas },
        });
        queryClient.invalidateQueries({ queryKey: ['funcionarios'] });
      }
      await client.entities.Ferias.create({
        funcionario_id: func.id,
        funcionario_nome: func.nome || '',
        periodo_aquisitivo: periodoSelecionado.numero,
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
            <Select value={funcId} onValueChange={(v) => { setFuncId(v); setPeriodoNum(''); }}>
              <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
              <SelectContent>
                {[...funcionarios].sort((a, b) => (a.nome || '').localeCompare(b.nome || '')).map(f => (
                  <SelectItem key={f.id} value={f.id}>{f.nome}{f.setor ? ` — ${f.setor}` : ''}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {func && (
            <div>
              <Label>Período aquisitivo *</Label>
              <Select value={periodoNum} onValueChange={setPeriodoNum} disabled={periodosComSaldo.length === 0}>
                <SelectTrigger><SelectValue placeholder={periodosComSaldo.length === 0 ? 'Sem saldo disponível' : 'Selecione o período...'} /></SelectTrigger>
                <SelectContent>
                  {periodosComSaldo.map(p => (
                    <SelectItem key={p.numero} value={String(p.numero)}>
                      {p.numero}º período ({formatDate(p.inicio.toISOString())} — {formatDate(p.fim.toISOString())}) · {p.saldoRestante} dias restantes
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {func && (
            <div className="rounded-lg border border-green-200 bg-green-50 px-3 py-2 text-xs text-green-800 space-y-0.5">
              <p className="font-semibold">Saldo: {saldo.diasDisponiveis} dias disponíveis</p>
              {periodoSelecionado && (
                <p>
                  {periodoSelecionado.numero}º período aquisitivo ({formatDate(periodoSelecionado.inicio.toISOString())} — {formatDate(periodoSelecionado.fim.toISOString())})
                  {' · '}<span className="font-semibold">{saldoRestante} dias restantes</span>
                  {periodoSelecionado.concessaoVencida && <span className="font-semibold text-red-700"> · prazo de concessão VENCIDO (dobra)</span>}
                </p>
              )}
              {!periodoSelecionado && periodosComSaldo.length === 0 && (
                <p className="text-red-700 font-medium">Sem período aquisitivo com saldo para este funcionário.</p>
              )}
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

          {periodoSelecionado && (
            <div>
              <Label>Faltas injustificadas no período (art. 130)</Label>
              <Input
                type="number" min="0"
                value={faltas}
                onChange={e => setFaltas(Math.max(0, Number(e.target.value) || 0))}
              />
              <p className={`text-xs mt-1 ${totalPeriodoFaltas < 30 ? 'text-amber-700' : 'text-muted-foreground'}`}>
                Com <strong>{faltas}</strong> falta(s), o período dá direito a <strong>{totalPeriodoFaltas}</strong> dias
                {totalPeriodoFaltas === 0
                  ? ' — perde o direito a férias.'
                  : totalPeriodoFaltas < 30 ? ' — reduzido (art. 130 CLT).' : '.'}
              </p>
            </div>
          )}

          {excedeSaldo && (
            <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
              O período selecionado tem apenas <span className="font-semibold">{saldoRestante} dia(s) restantes</span>
              {totalPeriodoFaltas < 30 && <> (reduzido por faltas — máximo {totalPeriodoFaltas} no período)</>}. Reduza o intervalo.
            </div>
          )}

          {!excedeSaldo && excedeComAbono && (
            <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
              O total de <span className="font-semibold">{dias} dias de gozo + {abono} de abono</span> ({dias + abono} dias) ultrapassa o saldo restante de <span className="font-semibold">{saldoRestante} dias</span> do período (art. 143 CLT — o abono consome o saldo).
            </div>
          )}

          {viola48h && (
            <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
              <AlertTriangle className="w-3.5 h-3.5 inline mr-1" />
              Férias não podem começar nos 2 dias anteriores a feriado (art. 134 §3º CLT): <strong>{viola48h.nome}</strong> em {formatDate(viola48h.data)}.
            </div>
          )}

          {viola48hFolga && (
            <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
              <AlertTriangle className="w-3.5 h-3.5 inline mr-1" />
              Férias não podem começar nos 2 dias anteriores à folga/DSR do funcionário (art. 134 §3º CLT): folga em {formatDate(viola48hFolga)}.
            </div>
          )}

          {sobreposicao.length > 0 && (
            <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 space-y-1">
              <p className="text-xs font-semibold text-red-800 flex items-center gap-1">
                <AlertTriangle className="w-3.5 h-3.5" />
                Este funcionário já tem férias no período:
              </p>
              {sobreposicao.slice(0, 5).map((r, i) => (
                <p key={i} className="text-xs text-red-700">
                  • {formatDate(r.data_inicio)} → {formatDate(r.data_fim)} ({r.dias_gozados} dias)
                </p>
              ))}
            </div>
          )}

          {emendadas.length > 0 && (
            <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
              <AlertTriangle className="w-3.5 h-3.5 inline mr-1" />
              Atenção: férias <strong>emendadas</strong> — sem ao menos 1 dia de trabalho entre os períodos:
              {emendadas.slice(0, 3).map((r, i) => (
                <span key={i}> {formatDate(r.data_inicio)} → {formatDate(r.data_fim)}{i < Math.min(emendadas.length, 3) - 1 ? ',' : ''}</span>
              ))}. Recomenda-se manter 1 dia de trabalho entre períodos.
            </div>
          )}

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

          <DialogFooter className="flex-col sm:flex-col items-stretch gap-2">
            {!podeSalvar && motivosBloqueio.length > 0 && (
              <div className="w-full rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700 space-y-0.5">
                <p className="font-semibold flex items-center gap-1">
                  <AlertTriangle className="w-3.5 h-3.5" />
                  Não é possível programar ainda:
                </p>
                {motivosBloqueio.map((m, i) => <p key={i}>• {m}</p>)}
              </div>
            )}
            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={onClose} disabled={saving}>Cancelar</Button>
              <Button onClick={handleSave} disabled={!podeSalvar}>
                {saving ? 'Salvando...' : 'Programar'}
              </Button>
            </div>
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
  const [programarFunc, setProgramarFunc] = useState(null);
  const [limitesOpen, setLimitesOpen] = useState(false);
  const [exportOpen, setExportOpen] = useState(false);
  const [feriadosOpen, setFeriadosOpen] = useState(false);
  const queryClient = useQueryClient();

  const abrirProgramar = (func) => {
    setProgramarFunc(func || null);
    setProgramarOpen(true);
  };

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

  const { data: configsFeriados = [] } = useQuery({
    queryKey: ['feriados_especificos'],
    queryFn: () => client.entities.ConfiguracoesRH.filter({ chave: 'feriados_especificos' }),
  });
  const feriadosExtras = configsFeriados[0]?.valor || [];

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
        const pendentes = (saldo?.periodos || []).filter(p => p.saldoRestante > 0);
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

  // Resumo executivo do calendário (cards no topo)
  const resumo = useMemo(() => {
    const hoje = new Date();
    const emFeriasHoje = ativos.filter(f =>
      todasFerias.some(x => x.funcionario_id === f.id && isFeriasAtiva(x, hoje))
    ).length;

    const programadasMes = todasFerias.filter(x => {
      if (x.cancelada === true || !x.data_inicio) return false;
      const d = parseDataLocal(x.data_inicio);
      return d.getFullYear() === ano && d.getMonth() === mesIdx && getStatusFerias(x) === FERIAS_STATUS.PROGRAMADA;
    }).length;

    let pendentes = 0;
    let dobra = 0;
    for (const f of ativos) {
      const saldo = calcularSaldoFerias(f, todasFerias.filter(x => x.funcionario_id === f.id));
      const periodos = saldo?.periodos || [];
      if (periodos.some(p => p.saldoRestante > 0)) pendentes++;
      if (periodos.some(p => p.concessaoVencida)) dobra++;
    }

    return { emFeriasHoje, programadasMes, pendentes, dobra };
  }, [ativos, todasFerias, ano, mesIdx]);

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
          <div className="relative">
            <Button variant="outline" onClick={() => setExportOpen(o => !o)}>
              <Download className="w-4 h-4 mr-2" />Exportar
            </Button>
            {exportOpen && (
              <div className="absolute right-0 mt-1 z-20 w-44 rounded-lg border bg-card shadow-lg overflow-hidden">
                <button
                  className="w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-muted/50 transition-colors"
                  onClick={() => { exportarEscalaCSV(ativos, todasFerias); setExportOpen(false); }}
                >
                  <FileSpreadsheet className="w-4 h-4 text-green-600" />Planilha (CSV)
                </button>
                <button
                  className="w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-muted/50 transition-colors"
                  onClick={() => { exportarEscalaPDF(ativos, todasFerias); setExportOpen(false); }}
                >
                  <FileText className="w-4 h-4 text-red-600" />PDF
                </button>
              </div>
            )}
          </div>
          <Button variant="outline" onClick={() => setFeriadosOpen(true)}>
            <CalendarX2 className="w-4 h-4 mr-2" />Feriados
          </Button>
          <Button variant="outline" onClick={() => setLimitesOpen(true)}>
            <Settings2 className="w-4 h-4 mr-2" />Limites por Setor
          </Button>
          <Button onClick={() => abrirProgramar(null)}>
            <Plus className="w-4 h-4 mr-2" />Programar Férias
          </Button>
        </div>
      </div>

      {/* Resumo executivo */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="rounded-xl border bg-card p-4">
          <p className="text-2xl font-bold text-primary">{resumo.emFeriasHoje}</p>
          <p className="text-xs text-muted-foreground">Em férias hoje</p>
        </div>
        <div className="rounded-xl border bg-card p-4">
          <p className="text-2xl font-bold text-blue-600">{resumo.programadasMes}</p>
          <p className="text-xs text-muted-foreground">Programadas no mês</p>
        </div>
        <div className="rounded-xl border bg-card p-4">
          <p className="text-2xl font-bold text-amber-600">{resumo.pendentes}</p>
          <p className="text-xs text-muted-foreground">Aquisitivos pendentes</p>
        </div>
        <div className="rounded-xl border bg-card p-4">
          <p className="text-2xl font-bold text-red-600">{resumo.dobra}</p>
          <p className="text-xs text-muted-foreground">Concessões vencidas (dobra)</p>
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
        <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-sm bg-red-100 border border-red-400 inline-block" /> Feriado nacional</span>
      </div>

      {isLoading ? (
        <div className="space-y-3">{[1, 2, 3].map(i => <Skeleton key={i} className="h-10 rounded-xl" />)}</div>
      ) : view === 'mensal' ? (
        <VisaoMensal funcionarios={filtrados} todasFerias={todasFerias} mesIdx={mesIdx} ano={ano} limiteSetor={limiteSetor} onProgramar={abrirProgramar} feriadosExtras={feriadosExtras} />
      ) : (
        <VisaoAnual funcionarios={filtrados} todasFerias={todasFerias} ano={ano} limiteSetor={limiteSetor} onProgramar={abrirProgramar} />
      )}

      <ProgramarModal
        open={programarOpen}
        onClose={() => setProgramarOpen(false)}
        funcionarios={filtrados}
        todasFerias={todasFerias}
        limiteSetor={limiteSetor}
        funcionarioInicial={programarFunc}
        feriadosExtras={feriadosExtras}
        onSaved={() => queryClient.invalidateQueries({ queryKey: ['ferias'] })}
      />

      <LimitesSetorDialog
        open={limitesOpen}
        onClose={() => setLimitesOpen(false)}
        setores={setores}
        limiteSetor={limiteSetor}
      />

      <FeriadosDialog
        open={feriadosOpen}
        onClose={() => setFeriadosOpen(false)}
        ano={ano}
      />
    </div>
  );
}

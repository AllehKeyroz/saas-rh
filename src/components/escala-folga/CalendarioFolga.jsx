import React, { useMemo, useState } from 'react';
import { CalendarDays, Users, Palmtree, ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { ehDiaFolga, getEscalaEfetiva, rotuloEscala } from '@/lib/escalaFolga';
import { getStatusFerias, FERIAS_STATUS, parseDataLocal } from '@/lib/ferias';

const DIAS_SEMANA = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

const CORES_SETOR = [
  'bg-rose-500', 'bg-sky-500', 'bg-emerald-500', 'bg-amber-500',
  'bg-violet-500', 'bg-cyan-500', 'bg-orange-500', 'bg-teal-500',
];

const STATUS_FERIAS_CLASSE = {
  [FERIAS_STATUS.PROGRAMADA]: 'text-blue-600 bg-blue-50 border-blue-200',
  [FERIAS_STATUS.EM_ANDAMENTO]: 'text-amber-700 bg-amber-50 border-amber-200',
  [FERIAS_STATUS.CONCLUIDA]: 'text-slate-600 bg-slate-50 border-slate-200',
};

function iso(ano, mesIdx, dia) {
  return `${ano}-${String(mesIdx + 1).padStart(2, '0')}-${String(dia).padStart(2, '0')}`;
}

function corSetor(setor, setores) {
  const idx = setores.indexOf(setor);
  return CORES_SETOR[(idx >= 0 ? idx : setores.length) % CORES_SETOR.length];
}

/**
 * Visão de calendário da escala de folga.
 * Grade do mês com quem folga em cada dia + painel lateral com a lista completa
 * do dia selecionado (agrupada por setor).
 * Somente leitura — a edição continua na visão em tabela.
 */
export default function CalendarioFolga({
  ano,
  mesIdx,
  funcionarios = [],
  escalasPorFunc,
  ferias = [],
  feriados = [],
  hojeISO,
}) {
  const setores = useMemo(
    () => [...new Set(funcionarios.map(f => f.setor).filter(Boolean))],
    [funcionarios],
  );

  const diasNoMes = new Date(ano, mesIdx + 1, 0).getDate();
  const primeiroDiaSemana = new Date(ano, mesIdx, 1).getDay();

  // Mapa dia ISO -> [{ funcionario, escala, ferias }]
  const folgasPorDia = useMemo(() => {
    const mapa = new Map();
    for (const f of funcionarios) {
      const escalasFunc = escalasPorFunc?.get(f.id) || [];
      const feriasFunc = ferias.filter(x => x.funcionario_id === f.id && x.cancelada !== true);
      for (let d = 1; d <= diasNoMes; d++) {
        const diaISO = iso(ano, mesIdx, d);
        const escala = getEscalaEfetiva(escalasFunc, diaISO);
        if (!escala || !ehDiaFolga(escala, diaISO)) continue;
        const emFerias = feriasFunc.find(r => {
          if (!r.data_inicio || !r.data_fim) return false;
          return diaISO >= r.data_inicio && diaISO <= r.data_fim;
        });
        const lista = mapa.get(diaISO) || [];
        lista.push({ funcionario: f, escala, emFerias });
        mapa.set(diaISO, lista);
      }
    }
    for (const lista of mapa.values()) {
      lista.sort((a, b) => (a.funcionario.nome || '').localeCompare(b.funcionario.nome || ''));
    }
    return mapa;
  }, [funcionarios, escalasPorFunc, ferias, ano, mesIdx, diasNoMes]);

  // Dia selecionado: hoje (se estiver no mês) ou o primeiro dia com folga
  const [diaSelecionado, setDiaSelecionado] = useState(() => {
    if (hojeISO && hojeISO.startsWith(`${ano}-${String(mesIdx + 1).padStart(2, '0')}`)) {
      return Number(hojeISO.slice(-2));
    }
    return 1;
  });

  // Mantém a seleção dentro do mês exibido após navegar
  const [mesAnterior, setMesAnterior] = useState(`${ano}-${mesIdx}`);
  if (`${ano}-${mesIdx}` !== mesAnterior) {
    setMesAnterior(`${ano}-${mesIdx}`);
    setDiaSelecionado(hojeISO && hojeISO.startsWith(`${ano}-${String(mesIdx + 1).padStart(2, '0')}`) ? Number(hojeISO.slice(-2)) : 1);
  }

  const celulas = useMemo(() => {
    const vazias = Array.from({ length: primeiroDiaSemana }, () => null);
    const dias = Array.from({ length: diasNoMes }, (_, i) => i + 1);
    return [...vazias, ...dias];
  }, [primeiroDiaSemana, diasNoMes]);

  const diaISOSelecionado = iso(ano, mesIdx, diaSelecionado);
  const listaSelecionada = folgasPorDia.get(diaISOSelecionado) || [];
  const feriadoSelecionado = feriados.find(f => f.data === diaISOSelecionado);

  const porSetor = useMemo(() => {
    const mapa = new Map();
    for (const item of listaSelecionada) {
      const setor = item.funcionario.setor || 'Sem setor';
      if (!mapa.has(setor)) mapa.set(setor, []);
      mapa.get(setor).push(item);
    }
    return [...mapa.entries()].sort((a, b) => a[0].localeCompare(b[0]));
  }, [listaSelecionada]);

  const totalFolgasMes = useMemo(
    () => [...folgasPorDia.values()].reduce((s, l) => s + l.length, 0),
    [folgasPorDia],
  );

  const navegarDia = (dir) => {
    const novo = diaSelecionado + dir;
    if (novo >= 1 && novo <= diasNoMes) setDiaSelecionado(novo);
  };

  const dataSelecionadaBR = `${String(diaSelecionado).padStart(2, '0')}/${String(mesIdx + 1).padStart(2, '0')}/${ano}`;
  const semanaSelecionada = DIAS_SEMANA[parseDataLocal(diaISOSelecionado).getDay()];

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[1fr_340px] gap-4">
      {/* Grade do calendário */}
      <div className="rounded-xl border bg-card overflow-hidden">
        <div className="grid grid-cols-7 border-b bg-muted/40">
          {DIAS_SEMANA.map(d => (
            <div key={d} className="px-2 py-2 text-center text-[11px] font-semibold text-muted-foreground">
              {d}
            </div>
          ))}
        </div>

        <div className="grid grid-cols-7">
          {celulas.map((dia, idx) => {
            if (dia === null) return <div key={`vazio-${idx}`} className="min-h-[104px] border-b border-r bg-muted/10" />;

            const diaISO = iso(ano, mesIdx, dia);
            const lista = folgasPorDia.get(diaISO) || [];
            const feriado = feriados.find(f => f.data === diaISO);
            const dow = new Date(diaISO + 'T00:00:00').getDay();
            const isDomingo = dow === 0;
            const isHoje = diaISO === hojeISO;
            const selecionado = dia === diaSelecionado;

            return (
              <button
                type="button"
                key={diaISO}
                onClick={() => setDiaSelecionado(dia)}
                title={feriado ? `Feriado: ${feriado.nome}` : undefined}
                className={cn(
                  'min-h-[104px] border-b border-r p-1.5 text-left align-top transition-colors flex flex-col gap-1',
                  isDomingo && 'bg-muted/30',
                  feriado && 'bg-red-50/60',
                  selecionado && 'ring-2 ring-inset ring-primary',
                  !selecionado && 'hover:bg-muted/40',
                )}
              >
                <div className="flex items-center justify-between gap-1">
                  <span className={cn(
                    'inline-flex items-center justify-center w-6 h-6 rounded-full text-xs font-bold',
                    isHoje && 'bg-primary text-primary-foreground',
                    !isHoje && feriado && 'text-red-600',
                    !isHoje && !feriado && (isDomingo ? 'text-foreground' : 'text-muted-foreground'),
                  )}>
                    {dia}
                  </span>
                  {lista.length > 0 && (
                    <span className={cn(
                      'rounded px-1.5 py-0.5 text-[10px] font-bold',
                      lista.length >= 4 ? 'bg-red-100 text-red-700' : 'bg-emerald-100 text-emerald-700',
                    )}>
                      {lista.length}
                    </span>
                  )}
                </div>

                {feriado && (
                  <span className="text-[10px] text-red-600 truncate leading-tight">{feriado.nome}</span>
                )}

                <div className="flex flex-col gap-0.5 min-w-0">
                  {lista.slice(0, 3).map(({ funcionario }) => (
                    <span key={funcionario.id} className="flex items-center gap-1 min-w-0">
                      <span className={cn('w-1.5 h-1.5 rounded-full shrink-0', corSetor(funcionario.setor, setores))} />
                      <span className="text-[11px] leading-tight truncate">{funcionario.nome}</span>
                    </span>
                  ))}
                  {lista.length > 3 && (
                    <span className="text-[10px] text-muted-foreground font-medium">+{lista.length - 3} folgando</span>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Painel do dia */}
      <div className="rounded-xl border bg-card flex flex-col overflow-hidden h-fit lg:sticky lg:top-4">
        <div className="flex items-center justify-between gap-2 border-b bg-muted/40 px-3 py-2">
          <div className="min-w-0">
            <p className="text-sm font-semibold truncate">Quem folga — {semanaSelecionada}, {dataSelecionadaBR}</p>
            <p className="text-[11px] text-muted-foreground">
              {listaSelecionada.length === 0 ? 'Ninguém de folga' : `${listaSelecionada.length} pessoa(s) de folga`}
            </p>
          </div>
          <div className="flex items-center gap-1 shrink-0">
            <button type="button" onClick={() => navegarDia(-1)} disabled={diaSelecionado <= 1}
              className="w-7 h-7 rounded-lg border flex items-center justify-center disabled:opacity-40 hover:bg-muted">
              <ChevronLeft className="w-3.5 h-3.5" />
            </button>
            <button type="button" onClick={() => navegarDia(1)} disabled={diaSelecionado >= diasNoMes}
              className="w-7 h-7 rounded-lg border flex items-center justify-center disabled:opacity-40 hover:bg-muted">
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        <div className="p-3 space-y-3 max-h-[60vh] overflow-y-auto">
          {feriadoSelecionado && (
            <div className="rounded-lg border border-red-200 bg-red-50 px-2.5 py-1.5 text-[11px] text-red-700">
              Feriado: <strong>{feriadoSelecionado.nome}</strong>
            </div>
          )}

          {listaSelecionada.length === 0 ? (
            <div className="flex flex-col items-center gap-2 py-8 text-center">
              <CalendarDays className="w-7 h-7 text-muted-foreground/50" />
              <p className="text-xs text-muted-foreground">Nenhum funcionário de folga neste dia.</p>
            </div>
          ) : porSetor.map(([setor, itens]) => (
            <div key={setor}>
              <p className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground mb-1.5">
                <span className={cn('w-2 h-2 rounded-full', corSetor(setor, setores))} />
                {setor}
                <span className="font-normal normal-case">({itens.length})</span>
              </p>
              <div className="space-y-1">
                {itens.map(({ funcionario, escala, emFerias }) => (
                  <div key={funcionario.id} className="flex items-center justify-between gap-2 rounded-lg border px-2.5 py-1.5">
                    <div className="min-w-0">
                      <p className="text-xs font-medium truncate">{funcionario.nome}</p>
                      <p className="text-[10px] text-muted-foreground truncate">
                        {funcionario.funcao || '—'} · {rotuloEscala(escala)}
                      </p>
                    </div>
                    {emFerias && (
                      <span className={cn(
                        'shrink-0 inline-flex items-center gap-1 rounded border px-1.5 py-0.5 text-[10px] font-medium',
                        STATUS_FERIAS_CLASSE[getStatusFerias(emFerias)] || 'text-slate-600 bg-slate-50 border-slate-200',
                      )}>
                        <Palmtree className="w-3 h-3" />
                        Férias
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        <div className="border-t bg-muted/30 px-3 py-2 flex items-center justify-between text-[11px] text-muted-foreground">
          <span className="flex items-center gap-1"><Users className="w-3.5 h-3.5" />{funcionarios.length} funcionário(s)</span>
          <span>{totalFolgasMes} folgas no mês</span>
        </div>
      </div>
    </div>
  );
}

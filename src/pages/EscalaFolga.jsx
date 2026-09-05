import React, { useMemo, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { client } from '@/api/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { CalendarClock, ChevronLeft, ChevronRight, Search, Settings2, CalendarX2 } from 'lucide-react';
import { getFeriadosCompletos } from '@/lib/feriados';
import { parseDataLocal, getStatusFerias, FERIAS_STATUS, getHojeISO } from '@/lib/ferias';
import { ehDiaFolga, rotuloEscala, getEscalaEfetiva } from '@/lib/escalaFolga';
import { formatDate } from '@/lib/formatters';
import ConfigurarEscalaDialog from '@/components/escala-folga/ConfigurarEscalaDialog';
import FeriadosDialog from '@/components/feriados/FeriadosDialog';

const MESES_COMPLETOS = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];

const SETOR_COLORS = [
  'bg-blue-500', 'bg-emerald-500', 'bg-amber-500', 'bg-purple-500', 'bg-rose-500',
  'bg-cyan-500', 'bg-orange-500', 'bg-teal-500', 'bg-fuchsia-500', 'bg-indigo-500',
];

const FOLGA_CELL = 'bg-[repeating-linear-gradient(45deg,#94a3b8,#94a3b8_3px,#e2e8f0_3px,#e2e8f0_6px)]';

const DIA_INICIAIS = ['D', 'S', 'T', 'Q', 'Q', 'S', 'S'];

const STATUS_CELL = {
  [FERIAS_STATUS.PROGRAMADA]: 'bg-blue-500',
  [FERIAS_STATUS.EM_ANDAMENTO]: 'bg-amber-500',
  [FERIAS_STATUS.CONCLUIDA]: 'bg-slate-400',
};

function setorColorIndex(setor, setores) {
  const idx = setores.indexOf(setor);
  return idx >= 0 ? idx % SETOR_COLORS.length : setores.length % SETOR_COLORS.length;
}

export default function EscalaFolga() {
  const hoje = new Date();
  const [mesIdx, setMesIdx] = useState(hoje.getMonth());
  const [ano, setAno] = useState(hoje.getFullYear());
  const [setorFiltro, setSetorFiltro] = useState('todos');
  const [search, setSearch] = useState('');
  const [configOpen, setConfigOpen] = useState(false);
  const [configFunc, setConfigFunc] = useState(null);
  const [feriadosOpen, setFeriadosOpen] = useState(false);
  const queryClient = useQueryClient();

  const abrirConfig = (func) => {
    setConfigFunc(func || null);
    setConfigOpen(true);
  };

  const { data: funcionarios = [], isLoading: loadingFunc } = useQuery({
    queryKey: ['funcionarios'],
    queryFn: () => client.entities.Funcionarios.list(),
  });

  const { data: todasFerias = [], isLoading: loadingFerias } = useQuery({
    queryKey: ['ferias'],
    queryFn: () => client.entities.Ferias.list(),
  });

  const { data: escalas = [], isLoading: loadingEscalas } = useQuery({
    queryKey: ['escala_folga'],
    queryFn: () => client.entities.EscalaFolga.list(),
  });

  const { data: configsFeriados = [] } = useQuery({
    queryKey: ['feriados_especificos'],
    queryFn: () => client.entities.ConfiguracoesRH.filter({ chave: 'feriados_especificos' }),
  });
  const feriadosExtras = configsFeriados[0]?.valor || [];

  const escalasPorFunc = useMemo(() => {
    const m = new Map();
    for (const e of escalas) {
      const lista = m.get(e.funcionario_id) || [];
      lista.push(e);
      m.set(e.funcionario_id, lista);
    }
    return m;
  }, [escalas]);

  const ativos = useMemo(() =>
    funcionarios.filter(f => f.ativo !== false && !f.data_demissao),
  [funcionarios]);

  const setores = useMemo(() => [...new Set(ativos.map(f => f.setor).filter(Boolean))], [ativos]);

  const filtrados = useMemo(() => {
    return ativos
      .filter(f => setorFiltro === 'todos' || f.setor === setorFiltro)
      .filter(f => !search || f.nome?.toLowerCase().includes(search.toLowerCase()))
      .sort((a, b) => (a.nome || '').localeCompare(b.nome || ''));
  }, [ativos, setorFiltro, search]);

  const diasNoMes = new Date(ano, mesIdx + 1, 0).getDate();
  const hojeISO = getHojeISO();

  const feriadosDoMes = useMemo(() => {
    const prefixo = `${ano}-${String(mesIdx + 1).padStart(2, '0')}-`;
    return getFeriadosCompletos(ano, feriadosExtras).filter(f => f.data.startsWith(prefixo));
  }, [ano, mesIdx, feriadosExtras]);

  // Total de folgas por dia (rodapé de cobertura)
  const folgasPorDia = useMemo(() => {
    const m = new Map();
    for (const f of filtrados) {
      const escalasFunc = escalasPorFunc.get(f.id) || [];
      for (let d = 1; d <= diasNoMes; d++) {
        const iso = `${ano}-${String(mesIdx + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
        const escala = getEscalaEfetiva(escalasFunc, iso);
        if (escala && ehDiaFolga(escala, iso)) m.set(iso, (m.get(iso) || 0) + 1);
      }
    }
    return m;
  }, [filtrados, escalasPorFunc, ano, mesIdx, diasNoMes]);

  // Resumo executivo
  const resumo = useMemo(() => {
    let folgasHoje = 0;
    let folgasMes = 0;
    let domingosFolga = 0;
    const hojeISO2 = getHojeISO();
    for (const f of filtrados) {
      const escalasFunc = escalasPorFunc.get(f.id) || [];
      for (let d = 1; d <= diasNoMes; d++) {
        const iso = `${ano}-${String(mesIdx + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
        const escala = getEscalaEfetiva(escalasFunc, iso);
        if (!escala || !ehDiaFolga(escala, iso)) continue;
        folgasMes++;
        if (iso === hojeISO2) folgasHoje++;
        const dow = new Date(iso + 'T00:00:00').getDay();
        if (dow === 0) domingosFolga++;
      }
    }
    const semEscala = filtrados.filter(f => !getEscalaEfetiva(escalasPorFunc.get(f.id) || [], hojeISO2)).length;
    return { folgasHoje, folgasMes, domingosFolga, semEscala };
  }, [filtrados, escalasPorFunc, ano, mesIdx, diasNoMes]);

  const navegarMes = (dir) => {
    let m = mesIdx + dir;
    let y = ano;
    if (m < 0) { m = 11; y--; }
    if (m > 11) { m = 0; y++; }
    setMesIdx(m);
    setAno(y);
  };

  const isLoading = loadingFunc || loadingFerias || loadingEscalas;

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <CalendarClock className="w-6 h-6 text-primary" />
            Escala de Folga
          </h1>
          <p className="text-muted-foreground text-sm">Dias de folga (DSR) e rodízio da equipe</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => setFeriadosOpen(true)}>
            <CalendarX2 className="w-4 h-4 mr-2" />Feriados
          </Button>
<Button onClick={() => abrirConfig(null)}>
            <Settings2 className="w-4 h-4 mr-2" />Configurar Escala
          </Button>
        </div>
      </div>

      {/* Resumo executivo */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="rounded-xl border bg-card p-4">
          <p className="text-2xl font-bold text-primary">{resumo.folgasHoje}</p>
          <p className="text-xs text-muted-foreground">Em folga hoje</p>
        </div>
        <div className="rounded-xl border bg-card p-4">
          <p className="text-2xl font-bold text-blue-600">{resumo.folgasMes}</p>
          <p className="text-xs text-muted-foreground">Folgas no mês</p>
        </div>
        <div className="rounded-xl border bg-card p-4">
          <p className="text-2xl font-bold text-green-600">{resumo.domingosFolga}</p>
          <p className="text-xs text-muted-foreground">Domingos de folga no mês</p>
        </div>
        <div className="rounded-xl border bg-card p-4">
          <p className="text-2xl font-bold text-amber-600">{resumo.semEscala}</p>
          <p className="text-xs text-muted-foreground">Sem escala definida</p>
        </div>
      </div>

      {/* Controles */}
      <div className="flex flex-wrap gap-3 items-center bg-card border rounded-xl p-3">
        <div className="flex items-center gap-1">
          <Button variant="outline" size="sm" onClick={() => navegarMes(-1)}><ChevronLeft className="w-4 h-4" /></Button>
          <span className="text-sm font-semibold w-40 text-center">{MESES_COMPLETOS[mesIdx]} {ano}</span>
          <Button variant="outline" size="sm" onClick={() => navegarMes(1)}><ChevronRight className="w-4 h-4" /></Button>
        </div>
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
      </div>

      {/* Legenda */}
      <div className="flex flex-wrap gap-3 text-xs text-muted-foreground items-center">
        <span className="font-medium text-foreground">Legenda:</span>
        <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-sm bg-blue-500 inline-block" /> Férias programada</span>
        <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-sm bg-amber-500 inline-block" /> Férias em andamento</span>
        <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-sm bg-slate-400 inline-block" /> Férias concluída</span>
        <span className="flex items-center gap-1"><span className="w-4 h-4 rounded-sm bg-[repeating-linear-gradient(45deg,#94a3b8,#94a3b8_3px,#e2e8f0_3px,#e2e8f0_6px)] inline-block" /> Folga (DSR)</span>
        <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-sm bg-red-100 border border-red-400 inline-block" /> Feriado nacional</span>
        <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-sm bg-red-100 border border-red-400 ring-1 ring-red-500 inline-block" /> Feriado municipal/outro</span>
      </div>

      {isLoading ? (
        <div className="space-y-3">{[1, 2, 3].map(i => <Skeleton key={i} className="h-10 rounded-xl" />)}</div>
      ) : (
        <div className="flex flex-col rounded-xl border overflow-hidden h-[calc(100vh-360px)] min-h-[220px]">
          <div className="flex-1 overflow-auto">
            <table className="border-collapse min-w-full">
              <thead>
                <tr>
                  <th className="sticky left-0 bg-card z-10 px-3 py-2 text-left text-xs font-semibold text-muted-foreground border-b min-w-[180px]">
                    Funcionário
                  </th>
                  {Array.from({ length: diasNoMes }, (_, i) => i + 1).map(d => {
                    const diaISO = `${ano}-${String(mesIdx + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
                    const feriado = feriadosDoMes.find(f => f.data === diaISO);
                    const dow = new Date(diaISO + 'T00:00:00').getDay();
                    const isDomingo = dow === 0;
                    const isHoje = diaISO === hojeISO;
                    return (
                      <th key={d} title={feriado ? `Feriado: ${feriado.nome}` : undefined}
                        className={`border-b border-l px-0 py-1 text-center text-[10px] font-medium w-[22px] ${isHoje ? 'bg-primary/10' : ''} ${feriado ? 'bg-red-50' : isDomingo ? 'bg-muted/40' : ''}`}>
                        <div className="flex flex-col items-center leading-none">
                          <span className={`text-[8px] ${feriado ? 'text-red-500' : isDomingo ? 'text-foreground' : 'text-muted-foreground/60'}`}>{DIA_INICIAIS[dow]}</span>
                          <span className={`mt-0.5 ${feriado ? 'text-red-600 font-bold' : isDomingo ? 'text-foreground font-semibold' : 'text-muted-foreground'}`}>{d}</span>
                          {feriado && <span className="w-1 h-1 rounded-full bg-red-500 mt-0.5" />}
                        </div>
                      </th>
                    );
                  })}
                  <th className="border-b border-l px-2 py-1 text-left text-[10px] font-semibold text-muted-foreground min-w-[90px]">
                    Escala
                  </th>
                </tr>
              </thead>
              <tbody>
                {filtrados.map(func => {
                  const escalasFunc = escalasPorFunc.get(func.id) || [];
                  const escalaAtual = getEscalaEfetiva(escalasFunc, hojeISO);
                  const feriasFunc = todasFerias.filter(x => x.funcionario_id === func.id && x.cancelada !== true);
                  return (
                    <tr key={func.id} onClick={() => abrirConfig(func)} title={`Clique para configurar a escala de ${func.nome}`} className="border-b last:border-0 cursor-pointer hover:bg-muted/40 transition-colors">
                      <td className="sticky left-0 bg-card z-10 px-3 py-1 text-xs font-medium whitespace-nowrap">
                        <div className="flex items-center gap-1.5 truncate">
                          <span className={`w-2 h-2 rounded-full shrink-0 ${escalaAtual?.cor || SETOR_COLORS[setorColorIndex(func.setor, setores)]}`} />
                          <span className="truncate">{func.nome}</span>
                          {func.setor && <span className="text-[10px] text-muted-foreground truncate">· {func.setor}</span>}
                        </div>
                      </td>
                      {Array.from({ length: diasNoMes }, (_, i) => i + 1).map(d => {
                        const diaISO = `${ano}-${String(mesIdx + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
                        const diaDate = parseDataLocal(diaISO);
                        const registro = feriasFunc.find(r => {
                          if (!r.data_inicio || !r.data_fim) return false;
                          const ini = parseDataLocal(r.data_inicio);
                          const fim = parseDataLocal(r.data_fim);
                          return diaDate >= ini && diaDate <= fim;
                        });
                        const escala = getEscalaEfetiva(escalasFunc, diaISO);
                        const folga = escala ? ehDiaFolga(escala, diaISO) : false;
                        let classe = '';
                        let titulo = '';
                        if (registro) {
                          classe = STATUS_CELL[getStatusFerias(registro)] || 'bg-slate-300';
                          titulo = `Férias: ${formatDate(registro.data_inicio)} → ${formatDate(registro.data_fim)}`;
                        } else if (folga) {
                          classe = FOLGA_CELL;
                          titulo = `Folga (${rotuloEscala(escala)})`;
                        }
                        return (
                          <td key={d} title={titulo || undefined}
                            className={`border-l p-0.5 h-6 ${classe ? classe + ' rounded-sm' : ''} ${diaISO === hojeISO ? 'bg-primary/5' : ''}`} />
                        );
                      })}
                      <td className="border-l px-2 py-1 align-middle">
                        <span className={`inline-flex items-center rounded px-1.5 py-0.5 text-[10px] font-bold whitespace-nowrap ${escalaAtual ? 'bg-blue-100 text-blue-700' : 'bg-muted text-muted-foreground'}`}>
                          {escalaAtual ? rotuloEscala(escalaAtual) : 'Sem escala'}
                        </span>
                      </td>
                    </tr>
                  );
                })}
                {filtrados.length === 0 && (
                  <tr><td colSpan={diasNoMes + 2} className="text-center py-10 text-muted-foreground text-sm">
                    Nenhum funcionário para exibir
                  </td></tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Rodapé fixo — Total de folgas no dia */}
          <div className="shrink-0 overflow-x-auto border-t-2 border-border bg-muted">
            <table className="border-collapse min-w-full">
              <tfoot>
                <tr>
                  <td className="sticky left-0 bg-muted z-10 px-3 py-2 text-xs font-bold text-foreground border-r align-middle min-w-[180px]">
                    Total de folgas no dia
                  </td>
                  {Array.from({ length: diasNoMes }, (_, i) => i + 1).map(d => {
                    const diaISO = `${ano}-${String(mesIdx + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
                    const total = folgasPorDia.get(diaISO) || 0;
                    return (
                      <td key={d} className={`border-l px-0 py-2 text-center align-middle w-[22px] ${total >= 3 ? 'text-red-600' : total > 0 ? 'text-amber-700' : 'text-transparent'}`}>
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
      )}

      <ConfigurarEscalaDialog
        open={configOpen}
        onClose={() => setConfigOpen(false)}
        funcionarios={ativos}
        escalas={escalas}
        funcionarioInicial={configFunc}
        onSaved={() => queryClient.invalidateQueries({ queryKey: ['escala_folga'] })}
      />

      <FeriadosDialog
        open={feriadosOpen}
        onClose={() => setFeriadosOpen(false)}
        ano={ano}
      />
    </div>
  );
}
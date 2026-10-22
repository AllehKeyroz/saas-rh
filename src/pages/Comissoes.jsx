import React, { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { client } from '@/api/client';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { usePersistedFilter } from '@/lib/usePersistedFilter';
import { getMesesOptions, getMesReferenciaAtual } from '@/lib/formatters';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle } from 'lucide-react';
import LancarComissao from '@/components/comissoes/LancarComissao';
import PendentesComissoes from '@/components/comissoes/PendentesComissoes';
import CreditosSetor from '@/components/comissoes/CreditosSetor';
import ComissaoIndividual from '@/components/comissoes/ComissaoIndividual';
import RelatorioComissoes from '@/components/comissoes/RelatorioComissoes';
import HistoricoComissoes from '@/components/comissoes/HistoricoComissoes';
import ConfigurarSetoresComissao from '@/components/comissoes/ConfigurarSetoresComissao';
import ConfigurarMetasComissao from '@/components/comissoes/ConfigurarMetasComissao';
import { isComissaoPendente } from '@/lib/comissoes';
import { useRHControl } from '@/lib/rhControl';
import FuncionalidadeBloqueada from '@/components/FuncionalidadeBloqueada';

const VALID_TABS_COMISSOES = ['lancar', 'pendentes', 'creditos', 'relatorio', 'historico', 'metas', 'setores'];

export default function Comissoes() {
  const urlParams = new URLSearchParams(window.location.search);
  const tabFromUrl = urlParams.get('tab');
  const [tab, setTab] = useState(VALID_TABS_COMISSOES.includes(tabFromUrl) ? tabFromUrl : 'lancar');
  const [modoLancamento, setModoLancamento] = useState('setor'); // 'setor' | 'individual'
  const [rascunhoEmEdicao, setRascunhoEmEdicao] = useState(null);
  const [creditosPreselecionados, setCreditosPreselecionados] = useState([]);
  const [creditosSeed, setCreditosSeed] = useState(0);
  const [mesRef, setMesRef] = usePersistedFilter('rh_filtro_mes_comissoes', getMesReferenciaAtual());
  const queryClient = useQueryClient();
  const { isAtiva, isLoading: loadingRH } = useRHControl();

  const { data: funcionarios = [], isLoading: lf } = useQuery({
    queryKey: ['funcionarios'],
    queryFn: () => client.entities.Funcionarios.list(),
  });

  const { data: comissoes = [], isLoading: lc } = useQuery({
    queryKey: ['comissoes_gorjetas'],
    queryFn: () => client.entities.ComissoesGorjetas.list('-created_date', 200),
  });

  const { data: comissoesFuncionarios = [], isLoading: lcf } = useQuery({
    queryKey: ['comissoes_funcionarios'],
    queryFn: () => client.entities.ComissaoPorFuncionario.list('-created_date', 2000),
  });

  const { data: comissoesIndividual = [] } = useQuery({
    queryKey: ['comissoes_individual'],
    queryFn: () => client.entities.ComissaoIndividual.list('-created_date', 200),
  });

  const { data: setoresComissao = [] } = useQuery({
    queryKey: ['setores-comissao-page'],
    queryFn: () => client.entities.SetoresComissao.list(),
  });

  const { data: creditosSetor = [] } = useQuery({
    queryKey: ['creditos_comissao_setor_all'],
    queryFn: () => client.entities.CreditoComissaoSetor.list('-created_date', 200),
  });

  const isLoading = lf || lc || lcf || loadingRH;

  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: ['comissoes_gorjetas'] });
    queryClient.invalidateQueries({ queryKey: ['comissoes_funcionarios'] });
    queryClient.invalidateQueries({ queryKey: ['comissoes_individual'] });
    queryClient.invalidateQueries({ queryKey: ['creditos_comissao_setor'] });
    queryClient.invalidateQueries({ queryKey: ['creditos_comissao_setor_all'] });
  };

  const onSaved = async (status) => {
    await queryClient.refetchQueries({ queryKey: ['comissoes_gorjetas'] });
    await queryClient.refetchQueries({ queryKey: ['comissoes_funcionarios'] });
    await queryClient.refetchQueries({ queryKey: ['comissoes_individual'] });
    await queryClient.refetchQueries({ queryKey: ['creditos_comissao_setor'] });
    await queryClient.refetchQueries({ queryKey: ['creditos_comissao_setor_all'] });
    setRascunhoEmEdicao(null);
    setTab(status === 'pendente' ? 'pendentes' : 'historico');
  };

  const usarCreditosNoLancamento = (ids) => {
    setRascunhoEmEdicao(null);
    setModoLancamento('setor');
    setCreditosPreselecionados(ids || []);
    setCreditosSeed(s => s + 1);
    setTab('lancar');
  };

  const comissoesMesAtual = comissoes.filter(c => c.mes_referencia === getMesReferenciaAtual() && c.status === 'confirmado');
  const pendentes = comissoes.filter(isComissaoPendente);
  const tabsComSeletor = ['relatorio', 'historico', 'metas'];

  if (isLoading) return (
    <div className="space-y-6">
      <Skeleton className="h-10 w-64" />
      <Skeleton className="h-96" />
    </div>
  );

  // Guard principal: módulo de comissões precisa estar ativo
  if (!isAtiva('comissoes_por_periodo')) {
    return (
      <div className="space-y-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Comissões de Gorjetas</h1>
          <p className="text-muted-foreground mt-1">Divisão automática por setor com controle por período e metas</p>
        </div>
        <FuncionalidadeBloqueada nome="Comissões por Período" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Comissões</h1>
        <p className="text-muted-foreground mt-1">Gorjetas por setor e comissão individual, com controle por período e metas</p>
      </div>

      {/* Seletor do tipo de lançamento */}
      <div className="flex rounded-lg border overflow-hidden w-full sm:w-fit">
        <button
          onClick={() => setModoLancamento('setor')}
          className={`flex-1 sm:flex-none px-5 py-2.5 text-sm font-medium transition-colors ${modoLancamento === 'setor' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-muted'}`}
        >
          Comissão para o Setor
        </button>
        <button
          onClick={() => { setModoLancamento('individual'); setRascunhoEmEdicao(null); }}
          className={`flex-1 sm:flex-none px-5 py-2.5 text-sm font-medium transition-colors ${modoLancamento === 'individual' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-muted'}`}
        >
          Comissão Individual
        </button>
      </div>

      {comissoesMesAtual.length > 0 && (
        <div className="flex items-start gap-3 bg-yellow-50 border border-yellow-200 rounded-xl p-4">
          <AlertTriangle className="w-5 h-5 text-yellow-600 shrink-0 mt-0.5" />
          <p className="text-sm text-yellow-800">
            <strong>{comissoesMesAtual.length} período(s)</strong> lançado(s) para {getMesReferenciaAtual()}.
            Para incluir no Fechamento Mensal, processe o fechamento do mês.
          </p>
        </div>
      )}

      <Tabs value={tab} onValueChange={setTab}>
        <div className="flex flex-col sm:flex-row sm:items-center gap-4">
          <TabsList className="flex-wrap h-auto gap-1">
            <TabsTrigger value="lancar">Lançar</TabsTrigger>
            <TabsTrigger value="pendentes">
              Pendentes
              {pendentes.length > 0 && <Badge className="ml-1.5 bg-amber-500/20 text-amber-700 text-xs px-1.5">{pendentes.length}</Badge>}
            </TabsTrigger>
            <TabsTrigger value="creditos">
              Créditos
              {creditosSetor.filter(c => c.status !== 'usado').length > 0 && (
                <Badge className="ml-1.5 bg-emerald-500/20 text-emerald-700 text-xs px-1.5">{creditosSetor.filter(c => c.status !== 'usado').length}</Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="relatorio">
              Relatório
              {comissoesMesAtual.length > 0 && <Badge className="ml-1.5 bg-primary/20 text-primary text-xs px-1.5">{comissoesMesAtual.length}</Badge>}
            </TabsTrigger>
            <TabsTrigger value="historico">Histórico</TabsTrigger>
            <TabsTrigger value="metas">Metas</TabsTrigger>
            <TabsTrigger value="setores">Setores</TabsTrigger>
          </TabsList>
          <div className="flex items-center gap-2">
            {tabsComSeletor.includes(tab) && (
              <Select value={mesRef} onValueChange={setMesRef}>
                <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {getMesesOptions().map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}
                </SelectContent>
              </Select>
            )}
          </div>
        </div>

        <TabsContent value="lancar" className="mt-6">
          {modoLancamento === 'individual' ? (
            <ComissaoIndividual funcionarios={funcionarios} onSaved={onSaved} />
          ) : (
            <LancarComissao
              key={rascunhoEmEdicao?.id || `novo-${creditosSeed}`}
              funcionarios={funcionarios}
              onSaved={onSaved}
              comissaoEmEdicao={rascunhoEmEdicao}
              creditosIniciais={creditosPreselecionados}
              onCancelarEdicao={() => { setRascunhoEmEdicao(null); setCreditosPreselecionados([]); }}
            />
          )}
        </TabsContent>

        <TabsContent value="pendentes" className="mt-6">
          <PendentesComissoes
            pendentes={pendentes}
            onRefresh={refresh}
            onEditar={(c) => { setRascunhoEmEdicao(c); setModoLancamento('setor'); setMesRef(c.mes_referencia || mesRef); setTab('lancar'); }}
          />
        </TabsContent>

        <TabsContent value="creditos" className="mt-6">
          <CreditosSetor
            creditos={creditosSetor}
            onUsarNoLancamento={usarCreditosNoLancamento}
          />
        </TabsContent>

        <TabsContent value="relatorio" className="mt-6">
          {isAtiva('relatorios_comissao')
            ? <RelatorioComissoes funcionarios={funcionarios} comissoes={comissoes} comissoesFuncionarios={comissoesFuncionarios} mesRef={mesRef} />
            : <FuncionalidadeBloqueada nome="Relatórios de Comissão" />
          }
        </TabsContent>

        <TabsContent value="historico" className="mt-6">
          <HistoricoComissoes
            comissoes={comissoes.filter(c => c.mes_referencia === mesRef && c.status !== 'pendente')}
            comissoesFuncionarios={comissoesFuncionarios}
            funcionarios={funcionarios}
            setoresComissao={setoresComissao}
            comissoesIndividual={comissoesIndividual.filter(c => c.mes_referencia === mesRef)}
            onRefresh={refresh}
          />
        </TabsContent>

        <TabsContent value="metas" className="mt-6">
          {isAtiva('metas_comissao')
            ? <ConfigurarMetasComissao funcionarios={funcionarios} comissoesFuncionarios={comissoesFuncionarios} />
            : <FuncionalidadeBloqueada nome="Metas de Comissão" />
          }
        </TabsContent>

        <TabsContent value="setores" className="mt-6">
          <ConfigurarSetoresComissao />
        </TabsContent>
      </Tabs>
    </div>
  );
}
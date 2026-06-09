import React, { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { client } from '@/api/client';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { getMesesOptions, getMesReferenciaAtual } from '@/lib/formatters';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle, Settings } from 'lucide-react';
import LancarComissao from '@/components/comissoes/LancarComissao';
import RelatorioComissoes from '@/components/comissoes/RelatorioComissoes';
import HistoricoComissoes from '@/components/comissoes/HistoricoComissoes';
import ConfigurarSetoresComissao from '@/components/comissoes/ConfigurarSetoresComissao';
import ConfigurarMetasComissao from '@/components/comissoes/ConfigurarMetasComissao';
import { useRHControl } from '@/lib/rhControl';
import FuncionalidadeBloqueada from '@/components/FuncionalidadeBloqueada';

const VALID_TABS_COMISSOES = ['lancar', 'relatorio', 'historico', 'metas', 'setores'];

export default function Comissoes() {
  const urlParams = new URLSearchParams(window.location.search);
  const tabFromUrl = urlParams.get('tab');
  const [tab, setTab] = useState(VALID_TABS_COMISSOES.includes(tabFromUrl) ? tabFromUrl : 'lancar');
  const [mesRef, setMesRef] = useState(getMesReferenciaAtual());
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

  const isLoading = lf || lc || lcf || loadingRH;

  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: ['comissoes_gorjetas'] });
    queryClient.invalidateQueries({ queryKey: ['comissoes_funcionarios'] });
  };

  const onSaved = async () => {
    await queryClient.refetchQueries({ queryKey: ['comissoes_gorjetas'] });
    await queryClient.refetchQueries({ queryKey: ['comissoes_funcionarios'] });
    setTab('historico');
  };

  const comissoesMesAtual = comissoes.filter(c => c.mes_referencia === getMesReferenciaAtual() && c.status === 'confirmado');
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
        <h1 className="text-3xl font-bold tracking-tight">Comissões de Gorjetas</h1>
        <p className="text-muted-foreground mt-1">Divisão automática por setor com controle por período e metas</p>
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
            <TabsTrigger value="relatorio">
              Relatório
              {comissoesMesAtual.length > 0 && <Badge className="ml-1.5 bg-primary/20 text-primary text-xs px-1.5">{comissoesMesAtual.length}</Badge>}
            </TabsTrigger>
            <TabsTrigger value="historico">Histórico</TabsTrigger>
            <TabsTrigger value="metas">Metas</TabsTrigger>
            <TabsTrigger value="setores">Setores</TabsTrigger>
          </TabsList>
          <div className="flex items-center gap-2">
            {tab === 'lancar' && isAtiva('setores_configuráveis') && (
              <Button variant="outline" size="sm" onClick={() => setTab('setores')}>
                <Settings className="w-3.5 h-3.5 mr-1" />Configurar Setores
              </Button>
            )}
          </div>
          {tabsComSeletor.includes(tab) && (
            <Select value={mesRef} onValueChange={setMesRef}>
              <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
              <SelectContent>
                {getMesesOptions().map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}
              </SelectContent>
            </Select>
          )}
        </div>

        <TabsContent value="lancar" className="mt-6">
          <LancarComissao funcionarios={funcionarios} onSaved={onSaved} />
        </TabsContent>

        <TabsContent value="relatorio" className="mt-6">
          {isAtiva('relatorios_comissao')
            ? <RelatorioComissoes funcionarios={funcionarios} comissoes={comissoes} comissoesFuncionarios={comissoesFuncionarios} mesRef={mesRef} />
            : <FuncionalidadeBloqueada nome="Relatórios de Comissão" />
          }
        </TabsContent>

        <TabsContent value="historico" className="mt-6">
          <HistoricoComissoes
            comissoes={comissoes.filter(c => c.mes_referencia === mesRef)}
            comissoesFuncionarios={comissoesFuncionarios}
            funcionarios={funcionarios}
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
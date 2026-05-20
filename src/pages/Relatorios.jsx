import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { client } from '@/api/client';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { getMesesOptions, getMesReferenciaAtual } from '@/lib/formatters';
import { Skeleton } from '@/components/ui/skeleton';
import RelatorioGeral from '@/components/relatorios/RelatorioGeral';
import RelatorioIndividual from '@/components/relatorios/RelatorioIndividual';
import RelatorioComparativo from '@/components/relatorios/RelatorioComparativo';
import RelatorioLimites from '@/components/relatorios/RelatorioLimites';

export default function Relatorios() {
  const [mesRef, setMesRef] = useState(getMesReferenciaAtual());
  const [funcSelecionado, setFuncSelecionado] = useState('');
  const [tab, setTab] = useState('geral');

  const { data: funcionarios = [], isLoading: lf } = useQuery({
    queryKey: ['funcionarios'],
    queryFn: () => client.entities.Funcionarios.list(),
  });

  const { data: lancamentos = [], isLoading: ll } = useQuery({
    queryKey: ['lancamentos'],
    queryFn: () => client.entities.FichaFinanceira.list('-created_date', 2000),
  });

  const { data: fechamentos = [], isLoading: lfech } = useQuery({
    queryKey: ['fechamentos'],
    queryFn: () => client.entities.FechamentoMensal.list(),
  });

  const isLoading = lf || ll || lfech;
  const funcObj = funcionarios.find(f => f.id === funcSelecionado);

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-96" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Relatórios</h1>
        <p className="text-muted-foreground mt-1">Análises financeiras e de folha</p>
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <div className="flex flex-col sm:flex-row sm:items-center gap-4">
          <TabsList>
            <TabsTrigger value="geral">Geral do Mês</TabsTrigger>
            <TabsTrigger value="individual">Individual</TabsTrigger>
            <TabsTrigger value="comparativo">Comparativo</TabsTrigger>
            <TabsTrigger value="limites">Limites de Adiantamento</TabsTrigger>
          </TabsList>

          <div className="flex items-center gap-3">
            {tab !== 'comparativo' && (
              <Select value={mesRef} onValueChange={setMesRef}>
                <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {getMesesOptions().map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}
                </SelectContent>
              </Select>
            )}
            {tab === 'individual' && (
              <Select value={funcSelecionado} onValueChange={setFuncSelecionado}>
                <SelectTrigger className="w-52"><SelectValue placeholder="Selecione funcionário" /></SelectTrigger>
                <SelectContent>
                  {funcionarios.map(f => <SelectItem key={f.id} value={f.id}>{f.nome}</SelectItem>)}
                </SelectContent>
              </Select>
            )}
          </div>
        </div>

        <TabsContent value="geral" className="mt-6">
          <RelatorioGeral
            fechamentos={fechamentos}
            lancamentos={lancamentos}
            funcionarios={funcionarios}
            mesRef={mesRef}
          />
        </TabsContent>

        <TabsContent value="individual" className="mt-6">
          {funcObj ? (
            <RelatorioIndividual
              funcionario={funcObj}
              lancamentos={lancamentos}
              fechamentos={fechamentos}
              mesRef={mesRef}
            />
          ) : (
            <div className="text-center py-16 text-muted-foreground">
              Selecione um funcionário para ver o relatório individual
            </div>
          )}
        </TabsContent>

        <TabsContent value="comparativo" className="mt-6">
          <RelatorioComparativo lancamentos={lancamentos} fechamentos={fechamentos} />
        </TabsContent>

        <TabsContent value="limites" className="mt-6">
          <RelatorioLimites
            funcionarios={funcionarios}
            lancamentos={lancamentos}
            mesRef={mesRef}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
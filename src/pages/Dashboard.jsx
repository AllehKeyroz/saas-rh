import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { client } from '@/api/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Users, FileText, Calculator, TrendingDown, TrendingUp, DollarSign } from 'lucide-react';
import { formatCurrency, getMesReferenciaAtual, TIPOS_DESCONTO, TIPOS_ADICIONAL } from '@/lib/formatters';
import { Skeleton } from '@/components/ui/skeleton';
import AniversariantesCard from '@/components/dashboard/AniversariantesCard';
import PainelValesCard from '@/components/dashboard/PainelValesCard';
import FolhaMensalChart from '@/components/dashboard/FolhaMensalChart';
import GastosPorSetorChart from '@/components/dashboard/GastosPorSetorChart';

function StatCard({ title, value, icon: Icon, color, subtitle }) {
  /* Icon is destructured above */
  return (
    <Card className="relative overflow-hidden">
      <div className={`absolute top-0 right-0 w-24 h-24 -translate-y-6 translate-x-6 rounded-full opacity-10 ${color}`} />
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <p className="text-sm font-medium text-muted-foreground">{title}</p>
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${color} bg-opacity-10`}>
            <Icon className="w-5 h-5 text-primary" />
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <p className="text-2xl font-bold">{value}</p>
        {subtitle && <p className="text-xs text-muted-foreground mt-1">{subtitle}</p>}
      </CardContent>
    </Card>
  );
}

export default function Dashboard() {
  const mesAtual = getMesReferenciaAtual();

  const { data: funcionarios = [], isLoading: loadingFunc } = useQuery({
    queryKey: ['funcionarios'],
    queryFn: () => client.entities.Funcionarios.list(),
  });

  const { data: lancamentos = [], isLoading: loadingLanc } = useQuery({
    queryKey: ['lancamentos'],
    queryFn: () => client.entities.FichaFinanceira.list(),
  });

  const { data: fechamentos = [], isLoading: loadingFech } = useQuery({
    queryKey: ['fechamentos'],
    queryFn: () => client.entities.FechamentoMensal.list(),
  });

  const ativos = funcionarios.filter(f => f.ativo !== false);
  
  const lancamentosMes = lancamentos.filter(l => {
    if (!l.data_lancamento) return false;
    const d = new Date(l.data_lancamento);
    const mr = `${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
    return mr === mesAtual;
  });

  const totalDescontosMes = lancamentosMes
    .filter(l => TIPOS_DESCONTO.includes(l.tipo_lancamento))
    .reduce((s, l) => s + (l.valor || 0), 0);

  const totalAdicionaisMes = lancamentosMes
    .filter(l => TIPOS_ADICIONAL.includes(l.tipo_lancamento))
    .reduce((s, l) => s + (l.valor || 0), 0);

  const fechamentosMes = fechamentos.filter(f => f.mes_referencia === mesAtual);
  const totalFolha = fechamentosMes.reduce((s, f) => s + (f.salario_liquido || 0), 0);

  const isLoading = loadingFunc || loadingLanc || loadingFech;

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-64" />
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
          {[1,2,3,4].map(i => <Skeleton key={i} className="h-32" />)}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Painel</h1>
        <p className="text-muted-foreground mt-1">Visão geral do mês {mesAtual}</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        <StatCard
          title="Funcionários Ativos"
          value={ativos.length}
          icon={Users}
          color="bg-primary"
          subtitle={`${funcionarios.length} total cadastrados`}
        />
        <StatCard
          title="Custo Total da Folha"
          value={formatCurrency(totalFolha || ativos.reduce((s, f) => s + (f.salario_base || 0), 0))}
          icon={DollarSign}
          color="bg-accent"
          subtitle={`${fechamentosMes.length > 0 ? 'Salários líquidos processados' : 'Salários base estimados'} — ${mesAtual}`}
        />
        <StatCard
          title="Total Descontos"
          value={formatCurrency(totalDescontosMes)}
          icon={TrendingDown}
          color="bg-destructive"
          subtitle="Vales, adiantamentos, convênios, consumos"
        />
        <StatCard
          title="Total Adicionais"
          value={formatCurrency(totalAdicionaisMes)}
          icon={TrendingUp}
          color="bg-chart-2"
          subtitle="Adicionais e ajustes"
        />
      </div>

      <PainelValesCard funcionarios={funcionarios} lancamentos={lancamentos} mesAtual={mesAtual} />

      <AniversariantesCard funcionarios={funcionarios} />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <FolhaMensalChart fechamentos={fechamentos} />
        <GastosPorSetorChart fechamentos={fechamentos} funcionarios={funcionarios} mesRef={mesAtual} />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Fechamentos do Mês</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center">
                <Calculator className="w-7 h-7 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">{fechamentosMes.length}</p>
                <p className="text-sm text-muted-foreground">de {ativos.length} funcionários processados</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Custo da Folha</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-2xl bg-accent/10 flex items-center justify-center">
                <DollarSign className="w-7 h-7 text-accent" />
              </div>
              <div>
                <p className="text-2xl font-bold">{formatCurrency(totalFolha)}</p>
                <p className="text-sm text-muted-foreground">Salários líquidos {mesAtual}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
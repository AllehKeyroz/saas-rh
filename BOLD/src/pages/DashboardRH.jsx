import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import StatisticsGrid from '@/components/dashboard-rh/StatisticsGrid';
import QuickActions from '@/components/dashboard-rh/QuickActions';
import AlertBanner from '@/components/dashboard-rh/AlertBanner';
import IndicadoresFinanceiros from '@/components/dashboard-rh/IndicadoresFinanceiros';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Skeleton } from '@/components/ui/skeleton';

export default function DashboardRH() {
  const navigate = useNavigate();
  const { data: funcionarios, isLoading: loadingFuncionarios } = useQuery({
    queryKey: ['funcionarios'],
    queryFn: () => base44.entities.Funcionarios.list(),
  });

  const { data: solicitacoes } = useQuery({
    queryKey: ['solicitacoes'],
    queryFn: () => base44.entities.SolicitacoesFuncionario.list(),
  });

  const { data: lanamentos } = useQuery({
    queryKey: ['lancamentos'],
    queryFn: () => base44.entities.FichaFinanceira.list(),
  });

  // Calcular estatísticas
  const stats = React.useMemo(() => {
    if (!funcionarios) return {};

    const ativas = funcionarios.filter(f => f.ativo).length;
    const pendentes = solicitacoes?.filter(s => s.status === 'pendente').length || 0;
    const feriasVencidas = funcionarios.filter(f => {
      // Lógica de férias vencidas
      return false;
    }).length;

    return {
      funcionariosAtivos: ativas,
      solicitacoesPendentes: pendentes,
      feriasVencidas: feriasVencidas,
      docsVencendo: 3,
      valesMes: 5000,
      consignadosAtivos: 12,
      custoFolha: 250000,
      comissaoTotal: 15000
    };
  }, [funcionarios, solicitacoes]);

  const alerts = [
    {
      type: 'warning',
      title: 'Férias vencidas',
      description: 'João Silva tem férias vencidas há 30 dias',
      action: 'Verificar',
      onAction: () => navigate('/funcionarios?tab=ferias')
    },
    {
      type: 'error',
      title: 'Documentos vencendo',
      description: '3 documentos vencerão nos próximos 5 dias',
      action: 'Gerenciar',
      onAction: () => navigate('/assinaturas-digitais')
    }
  ];

  const dadosCustosPorSetor = [
    { setor: 'Salão', custo: 45000 },
    { setor: 'Cozinha', custo: 35000 },
    { setor: 'Administrativo', custo: 25000 },
    { setor: 'Limpeza', custo: 15000 },
    { setor: 'Segurança', custo: 20000 }
  ];

  const dadosEvolucaoFolha = [
    { mes: 'Jan', custo: 200000 },
    { mes: 'Fev', custo: 210000 },
    { mes: 'Mar', custo: 215000 },
    { mes: 'Abr', custo: 225000 },
    { mes: 'Mai', custo: 235000 },
    { mes: 'Jun', custo: 250000 }
  ];

  const dadosSolicitacoes = [
    { name: 'Férias', value: 35 },
    { name: 'Vales', value: 25 },
    { name: 'Atestados', value: 20 },
    { name: 'Outros', value: 20 }
  ];

  const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444'];

  if (loadingFuncionarios) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Alerts */}
      <AlertBanner alerts={alerts} />

      {/* Statistics Grid */}
      <StatisticsGrid stats={stats} />

      {/* Indicadores Financeiros */}
      <IndicadoresFinanceiros />

      {/* Quick Actions */}
      <QuickActions />

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* Custos por Setor */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Custos por Setor</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart
                data={dadosCustosPorSetor}
                layout="vertical"
                margin={{ top: 5, right: 30, left: 120, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis type="number" />
                <YAxis dataKey="setor" type="category" width={110} />
                <Tooltip />
                <Bar dataKey="custo" fill="#3b82f6" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Evolução da Folha */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Evolução da Folha (6 meses)</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={dadosEvolucaoFolha}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="mes" />
                <YAxis />
                <Tooltip
                  formatter={(value) => `R$ ${value.toLocaleString('pt-BR')}`}
                />
                <Line type="monotone" dataKey="custo" stroke="#3b82f6" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Second Row Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Solicitações por Tipo */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Solicitações por Tipo</CardTitle>
          </CardHeader>
          <CardContent className="flex items-center justify-center">
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={dadosSolicitacoes}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, value }) => `${name}: ${value}%`}
                  outerRadius={100}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {dadosSolicitacoes.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Absenteísmo por Setor */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Absenteísmo por Setor</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={dadosCustosPorSetor}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="setor" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="custo" fill="#ef4444" name="Faltas %" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
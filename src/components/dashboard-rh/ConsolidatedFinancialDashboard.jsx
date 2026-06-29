import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts';
import { client } from '@/api/client';
import { DollarSign, TrendingUp, Users } from 'lucide-react';
import { parseDateLocal, getMesRef } from '@/lib/formatters';

const COLORS = ['#1A73E8', '#2ECC71', '#FF8C42', '#8E44AD', '#00B8D9', '#F1C40F'];

export default function ConsolidatedFinancialDashboard() {
  const [departmentCosts, setDepartmentCosts] = useState([]);
  const [monthlyCosts, setMonthlyCosts] = useState([]);
  const [costBreakdown, setCostBreakdown] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchFinancialData();
  }, []);

  const fetchFinancialData = async () => {
    try {
      const [funcionarios, lancamentos] = await Promise.all([
        client.entities.Funcionarios.list(),
        client.entities.FichaFinanceira.list()
      ]);

      // Custos por departamento
      const costByDept = {};
      funcionarios.forEach(func => {
        if (func.setor) {
          if (!costByDept[func.setor]) {
            costByDept[func.setor] = { name: func.setor, folha: 0, adiantamentos: 0, total: 0 };
          }
          costByDept[func.setor].folha += (func.salario_base || 0) + (func.ajuda_custo || 0);
        }
      });

      // Adiantamentos por departamento
      lancamentos
        .filter(l => l.tipo_lancamento === 'vale' || l.tipo_lancamento === 'adiantamento')
        .forEach(l => {
          const func = funcionarios.find(f => f.id === l.funcionario_id);
          if (func?.setor && costByDept[func.setor]) {
            costByDept[func.setor].adiantamentos += l.valor || 0;
          }
        });

      // Calcular totais
      Object.keys(costByDept).forEach(dept => {
        costByDept[dept].total = costByDept[dept].folha + costByDept[dept].adiantamentos;
      });

      const deptData = Object.values(costByDept).sort((a, b) => b.total - a.total);
      setDepartmentCosts(deptData);

      // Custos mensais (últimos 6 meses)
      const monthlyData = generateMonthlyData(funcionarios, lancamentos);
      setMonthlyCosts(monthlyData);

      // Breakdown folha vs adiantamentos
      const totalFolha = deptData.reduce((sum, d) => sum + d.folha, 0);
      const totalAdiantamentos = deptData.reduce((sum, d) => sum + d.adiantamentos, 0);
      setCostBreakdown([
        { name: 'Folha de Pagamento', value: totalFolha },
        { name: 'Adiantamentos/Vales', value: totalAdiantamentos }
      ]);
    } catch (error) {
      console.error('Erro ao buscar dados financeiros:', error);
    } finally {
      setLoading(false);
    }
  };

  const generateMonthlyData = (funcionarios, lancamentos) => {
    const months = [];
    for (let i = 5; i >= 0; i--) {
      const date = new Date();
      date.setMonth(date.getMonth() - i);
      months.push({
        mes: date.toLocaleDateString('pt-BR', { month: 'short', year: '2-digit' }),
        folha: funcionarios.reduce((sum, f) => sum + (f.salario_base || 0) + (f.ajuda_custo || 0), 0),
        adiantamentos: lancamentos
          .filter(l => {
            const lDate = parseDateLocal(l.data_lancamento);
            return lDate.getMonth() === date.getMonth() && 
                   lDate.getFullYear() === date.getFullYear() &&
                   (l.tipo_lancamento === 'vale' || l.tipo_lancamento === 'adiantamento');
          })
          .reduce((sum, l) => sum + (l.valor || 0), 0)
      });
    }
    return months;
  };

  if (loading) {
    return <div className="h-96 flex items-center justify-center">Carregando...</div>;
  }

  const totalFolha = departmentCosts.reduce((sum, d) => sum + d.folha, 0);
  const totalAdiantamentos = departmentCosts.reduce((sum, d) => sum + d.adiantamentos, 0);
  const totalCosts = totalFolha + totalAdiantamentos;

  return (
    <Tabs defaultValue="overview" className="space-y-4">
      <TabsList>
        <TabsTrigger value="overview">Visão Geral</TabsTrigger>
        <TabsTrigger value="departments">Por Departamento</TabsTrigger>
        <TabsTrigger value="monthly">Mensal</TabsTrigger>
      </TabsList>

      {/* Overview */}
      <TabsContent value="overview" className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="border shadow-sm rounded-lg">
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-primary/10 rounded-md">
                  <DollarSign className="w-6 h-6 text-primary" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground font-medium">Total Folha</p>
                  <p className="text-2xl font-bold text-foreground">
                    R$ {(totalFolha / 1000).toFixed(1)}k
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border shadow-sm rounded-lg">
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-accent/10 rounded-md">
                  <TrendingUp className="w-6 h-6 text-accent" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground font-medium">Adiantamentos</p>
                  <p className="text-2xl font-bold text-foreground">
                    R$ {(totalAdiantamentos / 1000).toFixed(1)}k
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border shadow-sm rounded-lg">
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-success/10 rounded-md">
                  <Users className="w-6 h-6 text-success" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground font-medium">Total Custos</p>
                  <p className="text-2xl font-bold text-foreground">
                    R$ {(totalCosts / 1000).toFixed(1)}k
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <Card className="border shadow-sm rounded-lg">
          <CardHeader>
            <CardTitle className="text-lg text-foreground font-bold">Distribuição de Custos</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={costBreakdown}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, value }) => `${name}: R$ ${(value / 1000).toFixed(1)}k`}
                  outerRadius={100}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {costBreakdown.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(value) => `R$ ${(value / 1000).toFixed(1)}k`} />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </TabsContent>

      {/* Por Departamento */}
      <TabsContent value="departments" className="space-y-4">
        <Card className="border shadow-sm rounded-lg">
          <CardHeader>
            <CardTitle className="text-lg text-foreground font-bold">Custos por Departamento</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={400}>
              <BarChart data={departmentCosts}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip formatter={(value) => `R$ ${(value / 1000).toFixed(1)}k`} />
                <Legend />
                <Bar dataKey="folha" stackId="a" fill="#1A73E8" name="Folha de Pagamento" radius={[4, 4, 0, 0]} />
                <Bar dataKey="adiantamentos" stackId="a" fill="#FF8C42" name="Adiantamentos" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="border shadow-sm rounded-lg">
          <CardContent className="pt-6">
            <div className="space-y-3">
              {departmentCosts.map((dept) => (
                <div key={dept.name} className="flex items-center justify-between p-3 bg-secondary/30 rounded-md border border-border">
                  <span className="font-medium">{dept.name}</span>
                  <div className="text-right">
                    <p className="text-sm text-muted-foreground">
                      R$ {(dept.total / 1000).toFixed(1)}k
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Folha: R$ {(dept.folha / 1000).toFixed(1)}k | Adiant: R$ {(dept.adiantamentos / 1000).toFixed(1)}k
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </TabsContent>

      {/* Mensal */}
      <TabsContent value="monthly" className="space-y-4">
        <Card className="border shadow-sm rounded-lg">
          <CardHeader>
            <CardTitle className="text-lg text-foreground font-bold">Evolução Mensal</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={400}>
              <LineChart data={monthlyCosts}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="mes" />
                <YAxis />
                <Tooltip formatter={(value) => `R$ ${(value / 1000).toFixed(1)}k`} />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="folha"
                  stroke="#1A73E8"
                  name="Folha de Pagamento"
                  strokeWidth={2}
                  dot={{ fill: '#1A73E8', r: 4 }}
                />
                <Line
                  type="monotone"
                  dataKey="adiantamentos"
                  stroke="#FF8C42"
                  name="Adiantamentos"
                  strokeWidth={2}
                  dot={{ fill: '#FF8C42', r: 4 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </TabsContent>
    </Tabs>
  );
}
import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { TrendingUp, TrendingDown, DollarSign, PiggyBank, Wallet } from 'lucide-react';
import { PieChart, Pie, Cell, LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { formatCurrency, getMesReferenciaAtual, getMesesOptions } from '@/lib/formatters';
import { calcularResumoMensal, calcularAlerta, calcularProgressoMeta, filtrarGastosPorMes, TIPO_COLORS } from '@/lib/vidaFinanceira';
import AlertaFinanceiro from '@/components/vidafinanceira/AlertaFinanceiro';
import { calcularComissaoMensal } from '@/lib/comissoes';
import { useRHControl } from '@/lib/rhControl';

// eslint-disable-next-line no-unused-vars
function StatCard({ icon: Icon, label, value, colorClass = 'text-foreground' }) {
  return (
    <div className="bg-card rounded-xl border p-4 flex items-center gap-3">
      <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
        <Icon className="w-5 h-5 text-primary" />
      </div>
      <div>
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className={`text-base font-bold ${colorClass}`}>{value}</p>
      </div>
    </div>
  );
}

export default function MinhaVidaFinanceira({ funcionarioId, salarioBase, comissoesFuncionarios = [] }) {
  const mesAtual = getMesReferenciaAtual();
  const meses = getMesesOptions(12);
  const [mesSelecionado, setMesSelecionado] = useState(mesAtual);
  const [salarioManual, setSalarioManual] = useState('');
  const { isAtiva } = useRHControl();

  const { data: gastos = [] } = useQuery({
    queryKey: ['gastos_pessoais', funcionarioId],
    queryFn: () => base44.entities.GastosPessoais.filter({ funcionario_id: funcionarioId }),
    enabled: !!funcionarioId,
  });

  const { data: metas = [] } = useQuery({
    queryKey: ['metas_financeiras', funcionarioId],
    queryFn: () => base44.entities.MetaFinanceira.filter({ funcionario_id: funcionarioId }),
    enabled: !!funcionarioId,
  });

  const metaMes = metas.find(m => m.mes_referencia === mesSelecionado);
  const salario = salarioBase || metaMes?.salario_pessoal || parseFloat(salarioManual) || 0;
  const comissaoMes = isAtiva('integracao_vida_financeira')
    ? calcularComissaoMensal(comissoesFuncionarios, funcionarioId, mesSelecionado)
    : 0;
  const receitaTotal = salario + comissaoMes;

  const gastosMes = filtrarGastosPorMes(gastos, mesSelecionado);
  const { gastoFixo, gastoVariavel, investimento, totalGastos } = calcularResumoMensal(gastosMes, receitaTotal);
  const saldoPessoal = receitaTotal - totalGastos;
  const alerta = calcularAlerta(totalGastos, receitaTotal);
  const progresso = calcularProgressoMeta(saldoPessoal, metaMes?.meta_mensal);

  // Gráfico de pizza
  const pieData = [
    { name: 'Gastos Fixos', value: gastoFixo, color: TIPO_COLORS.gasto_fixo.chart },
    { name: 'Gastos Variáveis', value: gastoVariavel, color: TIPO_COLORS.gasto_variavel.chart },
    { name: 'Investimentos', value: investimento, color: TIPO_COLORS.investimento.chart },
  ].filter(d => d.value > 0);

  // Gráfico de linha (últimos 6 meses)
  const ultimos6 = meses.slice(0, 6).reverse();
  const lineData = ultimos6.map(mes => {
    const g = filtrarGastosPorMes(gastos, mes);
    const r = calcularResumoMensal(g, salario);
    return { mes: mes.substring(0, 5), gastos: r.totalGastos, saldo: r.saldoPessoal };
  });

  return (
    <div className="space-y-4">
      <div className="flex gap-2 items-center flex-wrap">
        <Select value={mesSelecionado} onValueChange={setMesSelecionado}>
          <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
          <SelectContent>
            {meses.map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {/* Salário manual se não vier do RH */}
      {!salarioBase && (
        <Card>
          <CardContent className="pt-4">
            <p className="text-sm text-muted-foreground mb-2">Seu salário não está disponível via RH. Informe manualmente:</p>
            <div className="flex gap-2">
              <Input
                type="number"
                placeholder="R$ 0,00"
                value={salarioManual}
                onChange={e => setSalarioManual(e.target.value)}
                className="flex-1"
              />
              {metaMes?.salario_pessoal && (
                <Button variant="outline" size="sm" onClick={() => setSalarioManual(metaMes.salario_pessoal.toString())}>
                  Usar salvo ({formatCurrency(metaMes.salario_pessoal)})
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Alertas */}
      <AlertaFinanceiro alerta={alerta} progresso={progresso} metaMensal={metaMes?.meta_mensal} />

      {/* Cards de resumo */}
      <div className="grid grid-cols-2 gap-3">
        <StatCard icon={DollarSign} label="Salário" value={formatCurrency(salario)} />
        {isAtiva('integracao_vida_financeira') && comissaoMes > 0 && (
          <StatCard icon={TrendingUp} label="Comissão do Mês" value={formatCurrency(comissaoMes)} colorClass="text-green-600" />
        )}
        <StatCard icon={Wallet} label="Saldo Pessoal" value={formatCurrency(saldoPessoal)} colorClass={saldoPessoal >= 0 ? 'text-green-600' : 'text-red-600'} />
        <StatCard icon={TrendingDown} label="Gastos Fixos" value={formatCurrency(gastoFixo)} colorClass="text-red-600" />
        <StatCard icon={TrendingDown} label="Gastos Variáveis" value={formatCurrency(gastoVariavel)} colorClass="text-orange-600" />
        <StatCard icon={PiggyBank} label="Investimentos" value={formatCurrency(investimento)} colorClass="text-green-600" />
        <StatCard icon={TrendingUp} label="Total Gasto" value={formatCurrency(totalGastos)} colorClass="text-destructive" />
      </div>

      {/* Meta */}
      {metaMes?.meta_mensal && (
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium">Meta de Economia</span>
              <span className="text-sm font-bold text-primary">{formatCurrency(metaMes.meta_mensal)}</span>
            </div>
            {progresso !== null && (
              <>
                <div className="w-full h-2.5 rounded-full bg-muted overflow-hidden">
                  <div
                    className={`h-full rounded-full ${progresso >= 100 ? 'bg-green-500' : 'bg-primary'}`}
                    style={{ width: `${Math.min(Math.max(progresso, 0), 100)}%` }}
                  />
                </div>
                <p className={`text-xs mt-1 font-medium ${progresso >= 100 ? 'text-green-600' : 'text-muted-foreground'}`}>
                  {progresso.toFixed(0)}% atingido
                </p>
              </>
            )}
          </CardContent>
        </Card>
      )}

      {/* Gráfico pizza */}
      {pieData.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Distribuição dos Gastos</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie data={pieData} cx="50%" cy="50%" outerRadius={70} dataKey="value" label={({ name, value }) => `${name}: ${formatCurrency(value)}`} labelLine={false}>
                  {pieData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                </Pie>
                <Tooltip formatter={(v) => formatCurrency(v)} />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {/* Gráfico linha */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Evolução — Últimos 6 meses</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={lineData}>
              <XAxis dataKey="mes" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} tickFormatter={v => `R$${(v/1000).toFixed(0)}k`} />
              <Tooltip formatter={(v) => formatCurrency(v)} />
              <Legend />
              <Line type="monotone" dataKey="gastos" stroke="#ef4444" name="Gastos" strokeWidth={2} dot={false} />
              <Line type="monotone" dataKey="saldo" stroke="#22c55e" name="Saldo" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  );
}
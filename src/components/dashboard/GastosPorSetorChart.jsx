import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell
} from 'recharts';
import { formatCurrency } from '@/lib/formatters';
import { Building2 } from 'lucide-react';

const COLORS = [
  'hsl(var(--chart-1))',
  'hsl(var(--chart-2))',
  'hsl(var(--chart-3))',
  'hsl(var(--chart-4))',
  'hsl(var(--chart-5))',
];

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-card border border-border rounded-lg shadow-lg p-3">
      <p className="font-semibold text-sm mb-1">{label}</p>
      <p className="text-sm" style={{ color: payload[0]?.fill }}>{formatCurrency(payload[0]?.value || 0)}</p>
    </div>
  );
};

export default function GastosPorSetorChart({ fechamentos, funcionarios, mesRef }) {
  // Para o mês selecionado, soma o salario_liquido de cada funcionário agrupado por setor
  const fechamentosMes = fechamentos.filter(f => f.mes_referencia === mesRef);

  const setorMap = {};
  fechamentosMes.forEach(f => {
    const func = funcionarios.find(fu => fu.id === f.funcionario_id);
    const setor = func?.setor || 'Sem setor';
    if (!setorMap[setor]) setorMap[setor] = 0;
    setorMap[setor] += f.salario_liquido || 0;
  });

  const dados = Object.entries(setorMap)
    .map(([setor, total]) => ({ setor, total }))
    .sort((a, b) => b.total - a.total);

  if (dados.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Building2 className="w-5 h-5 text-accent" />
            Gasto por Setor
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[220px] flex items-center justify-center text-muted-foreground text-sm">
            Nenhum fechamento para {mesRef}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <Building2 className="w-5 h-5 text-accent" />
          Gasto por Setor — {mesRef}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={dados} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
            <XAxis
              dataKey="setor"
              tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
              tickLine={false}
              axisLine={false}
            />
            <YAxis
              tickFormatter={v => v === 0 ? '0' : `R$${(v / 1000).toFixed(0)}k`}
              tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
              tickLine={false}
              axisLine={false}
              width={55}
            />
            <Tooltip content={<CustomTooltip />} cursor={{ fill: 'hsl(var(--muted))', radius: 4 }} />
            <Bar dataKey="total" radius={[6, 6, 0, 0]} maxBarSize={60}>
              {dados.map((_, i) => (
                <Cell key={i} fill={COLORS[i % COLORS.length]} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
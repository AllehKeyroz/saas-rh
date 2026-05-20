import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from 'recharts';
import { formatCurrency } from '@/lib/formatters';
import { TrendingUp } from 'lucide-react';

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-card border border-border rounded-lg shadow-lg p-3">
      <p className="font-semibold text-sm mb-1">{label}</p>
      <p className="text-sm text-primary">{formatCurrency(payload[0]?.value || 0)}</p>
    </div>
  );
};

export default function FolhaMensalChart({ fechamentos }) {
  // Agrupa fechamentos por mês e soma salários líquidos
  const mesesMap = {};
  fechamentos.forEach(f => {
    if (!f.mes_referencia) return;
    if (!mesesMap[f.mes_referencia]) mesesMap[f.mes_referencia] = 0;
    mesesMap[f.mes_referencia] += f.salario_liquido || 0;
  });

  // Últimos 6 meses em ordem cronológica
  const hoje = new Date();
  const dados = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date(hoje.getFullYear(), hoje.getMonth() - i, 1);
    const key = `${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
    dados.push({ mes: key, total: mesesMap[key] || 0 });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <TrendingUp className="w-5 h-5 text-primary" />
          Evolução Mensal da Folha
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={220}>
          <AreaChart data={dados} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="folhaGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.18} />
                <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
            <XAxis
              dataKey="mes"
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
            <Tooltip content={<CustomTooltip />} />
            <Area
              type="monotone"
              dataKey="total"
              stroke="hsl(var(--primary))"
              strokeWidth={2.5}
              fill="url(#folhaGradient)"
              dot={{ r: 4, fill: 'hsl(var(--primary))', strokeWidth: 0 }}
              activeDot={{ r: 6, fill: 'hsl(var(--primary))', strokeWidth: 0 }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
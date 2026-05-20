import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { formatCurrency, TIPO_LABELS } from '@/lib/formatters';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';

export default function RelatorioComparativo({ lancamentos, fechamentos }) {
  const mesesSet = new Set();
  lancamentos.forEach(l => {
    if (!l.data_lancamento) return;
    const d = new Date(l.data_lancamento);
    mesesSet.add(`${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`);
  });
  fechamentos.forEach(f => mesesSet.add(f.mes_referencia));

  const meses = Array.from(mesesSet).sort();

  const chartData = meses.map(mes => {
    const [mesNum, anoStr] = mes.split('/');
    const m = parseInt(mesNum) - 1;
    const a = parseInt(anoStr);

    const lancMes = lancamentos.filter(l => {
      if (!l.data_lancamento) return false;
      const d = new Date(l.data_lancamento);
      return d.getMonth() === m && d.getFullYear() === a;
    });

    const byTipo = (tipo) => lancMes.filter(l => l.tipo_lancamento === tipo).reduce((s, l) => s + (l.valor || 0), 0);
    const fechMes = fechamentos.filter(f => f.mes_referencia === mes);
    const custoFolha = fechMes.reduce((s, f) => s + (f.salario_liquido || 0), 0);

    return {
      mes,
      Vales: byTipo('vale'),
      Adiantamentos: byTipo('adiantamento'),
      'Convênios': byTipo('convenio'),
      Consumos: byTipo('consumo'),
      Adicionais: byTipo('adicional') + byTipo('ajuste'),
      'Custo Folha': custoFolha,
    };
  });

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Comparativo Mês a Mês</CardTitle>
        </CardHeader>
        <CardContent>
          {chartData.length > 0 ? (
            <ResponsiveContainer width="100%" height={400}>
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                <XAxis dataKey="mes" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} tickFormatter={(v) => `R$${(v/1000).toFixed(0)}k`} />
                <Tooltip formatter={(v) => formatCurrency(v)} />
                <Legend />
                <Bar dataKey="Vales" fill="hsl(0, 84%, 60%)" radius={[4, 4, 0, 0]} />
                <Bar dataKey="Adiantamentos" fill="hsl(30, 84%, 60%)" radius={[4, 4, 0, 0]} />
                <Bar dataKey="Convênios" fill="hsl(45, 84%, 60%)" radius={[4, 4, 0, 0]} />
                <Bar dataKey="Consumos" fill="hsl(330, 84%, 60%)" radius={[4, 4, 0, 0]} />
                <Bar dataKey="Adicionais" fill="hsl(140, 60%, 45%)" radius={[4, 4, 0, 0]} />
                <Bar dataKey="Custo Folha" fill="hsl(221, 83%, 53%)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-center text-muted-foreground py-12">Sem dados para exibir</p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Resumo por Mês</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-3 px-2 font-medium">Mês</th>
                  <th className="text-right py-3 px-2 font-medium">Vales</th>
                  <th className="text-right py-3 px-2 font-medium">Adiant.</th>
                  <th className="text-right py-3 px-2 font-medium">Conv.</th>
                  <th className="text-right py-3 px-2 font-medium">Cons.</th>
                  <th className="text-right py-3 px-2 font-medium">Adicionais</th>
                  <th className="text-right py-3 px-2 font-medium">Custo Folha</th>
                </tr>
              </thead>
              <tbody>
                {chartData.map((d, i) => (
                  <tr key={i} className="border-b last:border-0">
                    <td className="py-2 px-2 font-medium">{d.mes}</td>
                    <td className="text-right py-2 px-2 text-red-600">{formatCurrency(d.Vales)}</td>
                    <td className="text-right py-2 px-2 text-red-600">{formatCurrency(d.Adiantamentos)}</td>
                    <td className="text-right py-2 px-2 text-red-600">{formatCurrency(d['Convênios'])}</td>
                    <td className="text-right py-2 px-2 text-red-600">{formatCurrency(d.Consumos)}</td>
                    <td className="text-right py-2 px-2 text-green-600">{formatCurrency(d.Adicionais)}</td>
                    <td className="text-right py-2 px-2 font-bold">{formatCurrency(d['Custo Folha'])}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
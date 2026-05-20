import React, { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { formatCurrency, getMesReferenciaAtual } from '@/lib/formatters';
import { filtrarGastosPorMes, calcularResumoMensal } from '@/lib/vidaFinanceira';
import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer, BarChart, Bar, XAxis, YAxis } from 'recharts';
import { DollarSign, TrendingDown, CreditCard, Tv, Target, Wallet, Lightbulb } from 'lucide-react';

const COLORS = ['#ef4444', '#f97316', '#8b5cf6', '#3b82f6', '#22c55e'];

function StatCard({ icon: Icon, label, value, sub, colorClass = 'text-foreground', bgClass = 'bg-primary/10', iconColorClass = 'text-primary' }) {
  return (
    <div className="bg-card rounded-xl border p-4 flex items-center gap-3">
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${bgClass}`}>
        <Icon className={`w-5 h-5 ${iconColorClass}`} />
      </div>
      <div className="min-w-0">
        <p className="text-xs text-muted-foreground truncate">{label}</p>
        <p className={`text-base font-bold ${colorClass}`}>{value}</p>
        {sub && <p className="text-xs text-muted-foreground">{sub}</p>}
      </div>
    </div>
  );
}

export default function DashboardFinanceiro({ funcionarioId, salarioBase = 0, lancamentosRH = [] }) {
  const mesAtual = getMesReferenciaAtual();

  const { data: gastos = [] } = useQuery({
    queryKey: ['gastos_pessoais', funcionarioId],
    queryFn: () => base44.entities.GastosPessoais.filter({ funcionario_id: funcionarioId }),
    enabled: !!funcionarioId,
  });

  const { data: assinaturas = [] } = useQuery({
    queryKey: ['assinaturas_pessoais', funcionarioId],
    queryFn: () => base44.entities.AssinaturasPessoais.filter({ funcionario_id: funcionarioId }),
    enabled: !!funcionarioId,
  });

  const { data: dividas = [] } = useQuery({
    queryKey: ['dividas_pessoais', funcionarioId],
    queryFn: () => base44.entities.DividasPessoais.filter({ funcionario_id: funcionarioId }),
    enabled: !!funcionarioId,
  });

  const { data: metas = [] } = useQuery({
    queryKey: ['metas_objetivos', funcionarioId],
    queryFn: () => base44.entities.MetasObjetivos.filter({ funcionario_id: funcionarioId }),
    enabled: !!funcionarioId,
  });

  const gastosMes = filtrarGastosPorMes(gastos, mesAtual);
  const { gastoFixo, gastoVariavel, totalGastos } = calcularResumoMensal(gastosMes, salarioBase);

  const totalAssinaturas = assinaturas.filter(a => a.ativa).reduce((s, a) => s + (a.valor || 0), 0);
  const totalParcelas = dividas.filter(d => d.ativa).reduce((s, d) => s + (d.valor_parcela || 0), 0);
  const totalDevido = dividas.filter(d => d.ativa).reduce((s, d) => {
    const rest = (d.parcelas_total || 0) - (d.parcelas_pagas || 0);
    return s + (d.valor_parcela || 0) * Math.max(rest, 0);
  }, 0);

  // Descontos do RH no mês
  const descontosRH = lancamentosRH
    .filter(l => {
      if (!l.data_lancamento) return false;
      const d = new Date(l.data_lancamento);
      const mr = `${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
      return mr === mesAtual && ['vale', 'adiantamento', 'convenio', 'consumo', 'credito_consignado'].includes(l.tipo_lancamento);
    })
    .reduce((s, l) => s + (l.valor || 0), 0);

  const salarioLiquido = salarioBase - descontosRH;
  const totalCompromissos = totalGastos + totalAssinaturas + totalParcelas;
  const sobra = salarioLiquido - totalCompromissos;

  const pieData = [
    { name: 'Gastos Fixos', value: gastoFixo },
    { name: 'Gastos Variáveis', value: gastoVariavel },
    { name: 'Assinaturas', value: totalAssinaturas },
    { name: 'Parcelas', value: totalParcelas },
    { name: 'Sobra', value: Math.max(sobra, 0) },
  ].filter(d => d.value > 0);

  const metasAtivas = metas.filter(m => !m.concluida);
  const totalMetasGuardado = metasAtivas.reduce((s, m) => s + (m.valor_guardado || 0), 0);
  const totalMetasObjetivo = metasAtivas.reduce((s, m) => s + (m.valor_total || 0), 0);

  // Insights automáticos
  const insights = useMemo(() => {
    const lista = [];
    if (salarioBase > 0) {
      const pctAssinaturas = (totalAssinaturas / salarioBase) * 100;
      if (pctAssinaturas > 15) lista.push({ cor: 'text-red-700 bg-red-50 border-red-200', texto: `Você gasta ${pctAssinaturas.toFixed(0)}% do salário em assinaturas. Considere cancelar as não essenciais.` });
      const pctParcelas = (totalParcelas / salarioBase) * 100;
      if (pctParcelas > 30) lista.push({ cor: 'text-orange-700 bg-orange-50 border-orange-200', texto: `Suas parcelas comprometem ${pctParcelas.toFixed(0)}% do salário (recomendado: até 30%).` });
      if (sobra < 0) lista.push({ cor: 'text-red-700 bg-red-50 border-red-200', texto: `Seus compromissos superam o salário líquido em ${formatCurrency(Math.abs(sobra))}. Atenção!` });
      else if (sobra < salarioBase * 0.1) lista.push({ cor: 'text-yellow-700 bg-yellow-50 border-yellow-200', texto: `Sua margem de sobra está baixa (${formatCurrency(sobra)}). Tente reduzir gastos variáveis.` });
      else lista.push({ cor: 'text-green-700 bg-green-50 border-green-200', texto: `Sobram ${formatCurrency(sobra)} este mês. Que tal guardar uma parte para suas metas? 🎯` });
    }
    if (assinaturas.filter(a => a.ativa && !a.essencial).length > 3) {
      lista.push({ cor: 'text-purple-700 bg-purple-50 border-purple-200', texto: `Você tem ${assinaturas.filter(a => a.ativa && !a.essencial).length} assinaturas marcadas como não essenciais. Revise se todas são necessárias.` });
    }
    return lista;
  }, [salarioBase, totalAssinaturas, totalParcelas, sobra, assinaturas]);

  return (
    <div className="space-y-4">
      <p className="text-xs text-muted-foreground">📅 {mesAtual}</p>

      {/* Cards principais */}
      <div className="grid grid-cols-1 gap-3">
        <StatCard icon={DollarSign} label="Salário Líquido (após descontos RH)" value={formatCurrency(salarioLiquido)} bgClass="bg-green-100" iconColorClass="text-green-600" colorClass="text-green-700" sub={salarioBase > 0 ? `Base: ${formatCurrency(salarioBase)} · Descontos: ${formatCurrency(descontosRH)}` : undefined} />
        <div className="grid grid-cols-2 gap-3">
          <StatCard icon={TrendingDown} label="Gastos" value={formatCurrency(totalGastos)} bgClass="bg-red-100" iconColorClass="text-red-600" colorClass="text-red-700" />
          <StatCard icon={Tv} label="Assinaturas" value={formatCurrency(totalAssinaturas)} bgClass="bg-purple-100" iconColorClass="text-purple-600" colorClass="text-purple-700" />
          <StatCard icon={CreditCard} label="Parcelas" value={formatCurrency(totalParcelas)} bgClass="bg-orange-100" iconColorClass="text-orange-600" colorClass="text-orange-700" />
          <StatCard icon={Wallet} label="Sobra do mês" value={formatCurrency(sobra)} bgClass={sobra >= 0 ? 'bg-green-100' : 'bg-red-100'} iconColorClass={sobra >= 0 ? 'text-green-600' : 'text-red-600'} colorClass={sobra >= 0 ? 'text-green-700' : 'text-red-700'} />
        </div>
        {metasAtivas.length > 0 && (
          <StatCard icon={Target} label={`Metas (${metasAtivas.length} ativas)`} value={formatCurrency(totalMetasGuardado)} sub={`de ${formatCurrency(totalMetasObjetivo)} planejados`} bgClass="bg-blue-100" iconColorClass="text-blue-600" />
        )}
      </div>

      {/* Dívidas totais */}
      {totalDevido > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3">
          <p className="text-xs text-red-600 font-medium">Total devedor (dívidas ativas)</p>
          <p className="text-xl font-bold text-red-800">{formatCurrency(totalDevido)}</p>
        </div>
      )}

      {/* Insights */}
      {insights.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2"><Lightbulb className="w-4 h-4 text-yellow-500" />Insights Automáticos</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {insights.map((ins, i) => (
              <div key={i} className={`rounded-xl border px-3 py-2 text-sm ${ins.cor}`}>{ins.texto}</div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Gráfico pizza */}
      {pieData.length > 1 && (
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm">Distribuição do Orçamento</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie data={pieData} cx="50%" cy="50%" outerRadius={70} dataKey="value">
                  {pieData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
                <Tooltip formatter={v => formatCurrency(v)} />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {/* Gráfico barras categorias */}
      {pieData.length > 1 && (
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm">Comparativo por Categoria</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={pieData} layout="vertical">
                <XAxis type="number" tick={{ fontSize: 10 }} tickFormatter={v => `R$${(v / 1000).toFixed(0)}k`} />
                <YAxis dataKey="name" type="category" tick={{ fontSize: 10 }} width={90} />
                <Tooltip formatter={v => formatCurrency(v)} />
                <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                  {pieData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
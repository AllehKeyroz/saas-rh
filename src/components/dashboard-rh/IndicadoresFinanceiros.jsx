import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { client } from '@/api/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts';
import { DollarSign, TrendingUp, Wallet, Building2, CreditCard } from 'lucide-react';
import { format, subMonths, parseISO, startOfMonth, endOfMonth } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { mergeTipos, parseDateLocal, getMesRef } from '@/lib/formatters';

const fmt = (val) => `R$ ${Number(val).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const fmtK = (val) => `R$ ${(val / 1000).toFixed(1)}k`;

// Gera lista dos últimos 12 meses no formato MM/YYYY
function gerarMeses(n = 12) {
  const hoje = new Date();
  return Array.from({ length: n }, (_, i) => {
    const d = subMonths(hoje, i);
    return format(d, 'MM/yyyy');
  });
}

const TIPOS_ADIANTAMENTO_DEFAULT = ['vale', 'adiantamento', 'vale_parcelado'];
const TIPOS_EXTRAS_DEFAULT = ['adicional', 'ajuste', 'comissao'];

function StatCard({ icon: Icon, label, value, color, sub }) {
  return (
    <Card className="border shadow-sm">
      <CardContent className="pt-5 pb-4">
        <div className="flex items-start gap-3">
          <div className={`p-2.5 rounded-xl ${color}`}>
            <Icon className="w-5 h-5" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs text-muted-foreground font-medium mb-0.5">{label}</p>
            <p className="text-xl font-bold truncate">{value}</p>
            {sub && <p className="text-xs text-muted-foreground mt-0.5">{sub}</p>}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-card border rounded-xl shadow-lg p-3 text-xs space-y-1 min-w-[160px]">
      <p className="font-semibold text-sm mb-2">{label}</p>
      {payload.map(p => (
        <div key={p.name} className="flex justify-between gap-4">
          <span style={{ color: p.color }}>{p.name}</span>
          <span className="font-medium">{fmtK(p.value)}</span>
        </div>
      ))}
      <div className="border-t pt-1 mt-1 flex justify-between">
        <span className="text-muted-foreground">Total</span>
        <span className="font-bold">{fmtK(payload.reduce((s, p) => s + p.value, 0))}</span>
      </div>
    </div>
  );
};

export default function IndicadoresFinanceiros() {
  const [mesSelecionado, setMesSelecionado] = useState(format(new Date(), 'MM/yyyy'));
  const meses = gerarMeses(12);

  const { data: funcionarios = [], isLoading: loadingF } = useQuery({
    queryKey: ['funcionarios'],
    queryFn: () => client.entities.Funcionarios.list(),
  });

  const { data: lancamentos = [], isLoading: loadingL } = useQuery({
    queryKey: ['lancamentos'],
    queryFn: () => client.entities.FichaFinanceira.list(),
  });

  const { data: comissoesFunc = [] } = useQuery({
    queryKey: ['comissoes-func-indicadores'],
    queryFn: () => client.entities.ComissaoPorFuncionario.list('-created_date', 2000),
  });

  const { data: tiposLancamento = [] } = useQuery({
    queryKey: ['tipos-lancamento-indicadores'],
    queryFn: () => client.entities.TipoLancamento.list(),
  });

  const TIPOS_ADIANTAMENTO = useMemo(() => {
    const custom = (tiposLancamento || []).filter(t => t.ativo !== false && t.categoria === 'desconto').map(t => t.nome);
    return [...new Set([...TIPOS_ADIANTAMENTO_DEFAULT, ...custom])];
  }, [tiposLancamento]);
  const TIPOS_EXTRAS = useMemo(() => {
    const custom = (tiposLancamento || []).filter(t => t.ativo !== false && t.categoria === 'adicional').map(t => t.nome);
    return [...new Set([...TIPOS_EXTRAS_DEFAULT, ...custom])];
  }, [tiposLancamento]);

  const isLoading = loadingF || loadingL;

  // Filtra lançamentos do mês selecionado
  const lancamentosMes = useMemo(() => {
    if (!mesSelecionado) return lancamentos;
    const [mm, yyyy] = mesSelecionado.split('/');
    const inicio = new Date(Number(yyyy), Number(mm) - 1, 1);
    const fim = new Date(Number(yyyy), Number(mm), 0);
    return lancamentos.filter(l => {
      if (!l.data_lancamento) return false;
      const d = parseDateLocal(l.data_lancamento);
      return d >= inicio && d <= fim;
    });
  }, [lancamentos, mesSelecionado]);

  // Map funcionário id → setor
  const funcMap = useMemo(() => {
    const m = {};
    funcionarios.forEach(f => { m[f.id] = f; });
    return m;
  }, [funcionarios]);

  // Totais globais do mês
  const totais = useMemo(() => {
    const salarios = funcionarios
      .filter(f => f.ativo !== false && !f.data_demissao)
      .reduce((s, f) => s + (f.salario_base || 0) + (f.ajuda_custo || 0), 0);

    const adiantamentos = lancamentosMes
      .filter(l => TIPOS_ADIANTAMENTO.includes(l.tipo_lancamento))
      .reduce((s, l) => s + (l.valor || 0), 0);

    const vales = lancamentosMes
      .filter(l => l.tipo_lancamento === 'vale' || l.tipo_lancamento === 'vale_parcelado')
      .reduce((s, l) => s + (l.valor || 0), 0);

    const extras = lancamentosMes
      .filter(l => TIPOS_EXTRAS.includes(l.tipo_lancamento))
      .reduce((s, l) => s + (l.valor || 0), 0);

    // Comissões do módulo de comissões (ComissaoPorFuncionario) para o mês
    const [mm, yyyy] = mesSelecionado.split('/');
    const comissaoModulo = comissoesFunc
      .filter(c => c.mes_referencia === mesSelecionado && c.apto)
      .reduce((s, c) => s + (c.valor_individual_final ?? c.valor_individual ?? 0), 0);

    return { salarios, adiantamentos, vales, extras: extras + comissaoModulo, total: salarios + adiantamentos + extras + comissaoModulo };
  }, [funcionarios, lancamentosMes, mesSelecionado, comissoesFunc, TIPOS_EXTRAS]);

  // Dados por setor
  const dadosPorSetor = useMemo(() => {
    const setores = {};

    // Salários por setor
    funcionarios
      .filter(f => f.ativo !== false && !f.data_demissao && f.setor)
      .forEach(f => {
        if (!setores[f.setor]) setores[f.setor] = { setor: f.setor, salarios: 0, adiantamentos: 0, extras: 0 };
        setores[f.setor].salarios += (f.salario_base || 0) + (f.ajuda_custo || 0);
      });

    // Lançamentos por setor
    lancamentosMes.forEach(l => {
      const func = funcMap[l.funcionario_id];
      const setor = func?.setor;
      if (!setor) return;
      if (!setores[setor]) setores[setor] = { setor, salarios: 0, adiantamentos: 0, extras: 0 };

      if (TIPOS_ADIANTAMENTO.includes(l.tipo_lancamento)) {
        setores[setor].adiantamentos += l.valor || 0;
      } else if (TIPOS_EXTRAS.includes(l.tipo_lancamento)) {
        setores[setor].extras += l.valor || 0;
      }
    });

    return Object.values(setores)
      .map(s => ({ ...s, total: s.salarios + s.adiantamentos + s.extras }))
      .sort((a, b) => b.total - a.total);
  }, [funcionarios, lancamentosMes, funcMap, TIPOS_ADIANTAMENTO, TIPOS_EXTRAS]);

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-48" />
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[1,2,3,4].map(i => <Skeleton key={i} className="h-24 rounded-xl" />)}
        </div>
        <Skeleton className="h-72 rounded-xl" />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Header + Seletor de mês */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold flex items-center gap-2">
            <DollarSign className="w-5 h-5 text-primary" />
            Indicadores Financeiros
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5">Adiantamentos, vales e salários por setor</p>
        </div>
        <Select value={mesSelecionado} onValueChange={setMesSelecionado}>
          <SelectTrigger className="w-44">
            <SelectValue placeholder="Mês de referência" />
          </SelectTrigger>
          <SelectContent>
            {meses.map(m => {
              const [mm, yyyy] = m.split('/');
              const label = format(new Date(Number(yyyy), Number(mm) - 1, 1), 'MMMM yyyy', { locale: ptBR });
              return (
                <SelectItem key={m} value={m}>
                  {label.charAt(0).toUpperCase() + label.slice(1)}
                </SelectItem>
              );
            })}
          </SelectContent>
        </Select>
      </div>

      {/* Cards de totais */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          icon={Wallet}
          label="Total Salários"
          value={fmtK(totais.salarios)}
          color="bg-blue-100 text-blue-600"
          sub={`${funcionarios.filter(f => f.ativo !== false && !f.data_demissao).length} ativos`}
        />
        <StatCard
          icon={CreditCard}
          label="Vales / Adiant."
          value={fmtK(totais.adiantamentos)}
          color="bg-orange-100 text-orange-600"
          sub={`${lancamentosMes.filter(l => TIPOS_ADIANTAMENTO.includes(l.tipo_lancamento)).length} lanç. + ${comissoesFunc.filter(c => c.mes_referencia === mesSelecionado && c.apto).length} comiss.`}
        />
        <StatCard
          icon={TrendingUp}
          label="Extras / Comissões"
          value={fmtK(totais.extras)}
          color="bg-green-100 text-green-600"
          sub={`${lancamentosMes.filter(l => TIPOS_EXTRAS.includes(l.tipo_lancamento)).length} lanç. + ${comissoesFunc.filter(c => c.mes_referencia === mesSelecionado && c.apto).length} comiss.`}
        />
        <StatCard
          icon={DollarSign}
          label="Custo Total"
          value={fmtK(totais.total)}
          color="bg-primary/10 text-primary"
          sub="salários + adiant. + extras"
        />
      </div>

      {/* Gráfico por setor */}
      {dadosPorSetor.length > 0 ? (
        <Card className="border shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Building2 className="w-4 h-4 text-muted-foreground" />
              Gastos por Setor
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={dadosPorSetor} margin={{ top: 4, right: 16, left: 0, bottom: 4 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis dataKey="setor" tick={{ fontSize: 12 }} />
                <YAxis tickFormatter={v => `${(v/1000).toFixed(0)}k`} tick={{ fontSize: 11 }} width={48} />
                <Tooltip content={<CustomTooltip />} />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Bar dataKey="salarios" stackId="a" fill="#3b82f6" name="Salários" radius={[0,0,0,0]} />
                <Bar dataKey="adiantamentos" stackId="a" fill="#f97316" name="Adiant./Vales" radius={[0,0,0,0]} />
                <Bar dataKey="extras" stackId="a" fill="#22c55e" name="Extras/Comis." radius={[4,4,0,0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      ) : null}

      {/* Tabela por setor */}
      {dadosPorSetor.length > 0 && (
        <Card className="border shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Detalhamento por Setor</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/30">
                    <th className="text-left px-4 py-2.5 font-semibold text-muted-foreground">Setor</th>
                    <th className="text-right px-4 py-2.5 font-semibold text-blue-600">Salários</th>
                    <th className="text-right px-4 py-2.5 font-semibold text-orange-600">Adiant./Vales</th>
                    <th className="text-right px-4 py-2.5 font-semibold text-green-600">Extras</th>
                    <th className="text-right px-4 py-2.5 font-semibold">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {dadosPorSetor.map((s, i) => (
                    <tr key={s.setor} className={i % 2 === 0 ? 'bg-white' : 'bg-muted/10'}>
                      <td className="px-4 py-2.5 font-medium">{s.setor}</td>
                      <td className="px-4 py-2.5 text-right text-blue-700">{fmt(s.salarios)}</td>
                      <td className="px-4 py-2.5 text-right text-orange-700">{fmt(s.adiantamentos)}</td>
                      <td className="px-4 py-2.5 text-right text-green-700">{fmt(s.extras)}</td>
                      <td className="px-4 py-2.5 text-right font-semibold">{fmt(s.total)}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="border-t bg-muted/30 font-bold">
                    <td className="px-4 py-2.5">Total geral</td>
                    <td className="px-4 py-2.5 text-right text-blue-700">{fmt(totais.salarios)}</td>
                    <td className="px-4 py-2.5 text-right text-orange-700">{fmt(totais.adiantamentos)}</td>
                    <td className="px-4 py-2.5 text-right text-green-700">{fmt(totais.extras)}</td>
                    <td className="px-4 py-2.5 text-right">{fmt(totais.total)}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {dadosPorSetor.length === 0 && (
        <div className="text-center py-10 text-muted-foreground">
          <DollarSign className="w-10 h-10 mx-auto mb-2 opacity-20" />
          <p>Nenhum dado financeiro para o período selecionado</p>
        </div>
      )}
    </div>
  );
}
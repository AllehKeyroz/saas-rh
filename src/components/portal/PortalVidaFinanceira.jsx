import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { client } from '@/api/client';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { getMesReferenciaAtual, getMesesOptions, formatCurrency } from '@/lib/formatters';
import { calcularResumoMensal, calcularAlerta, calcularProgressoMeta, filtrarGastosPorMes, TIPO_COLORS } from '@/lib/vidaFinanceira';
import { calcularComissaoMensal } from '@/lib/comissoes';
import { useRHControl } from '@/lib/rhControl';
import { useFinancialDataLogger } from '@/hooks/useFinancialDataLogger';
import AlertaFinanceiro from '@/components/vidafinanceira/AlertaFinanceiro';
import MeusGastos from '@/components/vidafinanceira/MeusGastos';
import MinhasAssinaturas from '@/components/vidafinanceira/MinhasAssinaturas';
import MinhasDividas from '@/components/vidafinanceira/MinhasDividas';
import MetasObjetivos from '@/components/vidafinanceira/MetasObjetivos';
import SimuladoresFinanceiros from '@/components/vidafinanceira/SimuladoresFinanceiros';
import EducacaoFinanceira from '@/components/vidafinanceira/EducacaoFinanceira';
import MiniDRE from '@/components/portal/MiniDRE';
import ResumoSalarioCard from '@/components/vidafinanceira/ResumoSalarioCard';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { DollarSign, TrendingDown, TrendingUp, Wallet, List, LayoutDashboard, Download, Tv, CreditCard, Target, Calculator, BookOpen, PiggyBank } from 'lucide-react';
import { PieChart, Pie, Cell, LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from 'recharts';

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

const TABS = [
  { id: 'dashboard', label: 'Visão Geral', icon: LayoutDashboard },
  { id: 'gastos', label: 'Meus Gastos', icon: List },
  { id: 'assinaturas', label: 'Assinaturas', icon: Tv },
  { id: 'dividas', label: 'Dívidas', icon: CreditCard },
  { id: 'metas', label: 'Metas', icon: Target },
  { id: 'simuladores', label: 'Simular', icon: Calculator },
  { id: 'educacao', label: 'Aprender', icon: BookOpen },
];

export default function PortalVidaFinanceira({ funcionario, lancamentosFunc, comissoesFuncionarios = [], mesSelecionado, setMesSelecionado }) {
  const [tab, setTab] = useState('dashboard');
  const [salarioManual, setSalarioManual] = useState('');
  const { isAtiva, isLoading: loadingRH } = useRHControl();
  const { logError } = useFinancialDataLogger('PortalVidaFinanceira');
  const [downloadingPdf, setDownloadingPdf] = useState(false);
  const funcionarioId = funcionario?.id;
  const salarioBase = funcionario?.salario_base;
  const mesAtual = getMesReferenciaAtual();
  const meses = getMesesOptions(12);

  const handleDownloadPdf = async () => {
    setDownloadingPdf(true);
    try {
      const { jsPDF } = await import('jspdf')
      const doc = new jsPDF()
      doc.setFontSize(16)
      doc.text('Resumo Financeiro', 20, 20)
      doc.setFontSize(11)
      doc.text(`Mês: ${mesSelecionado}`, 20, 32)
      doc.text(`Salário: R$ ${Number(salario || 0).toFixed(2)}`, 20, 42)
      doc.text(`Comissão: R$ ${Number(comissaoMesAtual || 0).toFixed(2)}`, 20, 50)
      doc.text(`Receita Extra: R$ ${Number(receitaExtra || 0).toFixed(2)}`, 20, 58)
      doc.text(`Gastos Fixos: R$ ${Number(gastoFixo || 0).toFixed(2)}`, 20, 68)
      doc.text(`Gastos Variáveis: R$ ${Number(gastoVariavel || 0).toFixed(2)}`, 20, 76)
      doc.text(`Investimentos: R$ ${Number(investimento || 0).toFixed(2)}`, 20, 84)
      doc.text(`Saldo: R$ ${Number(saldoPessoal || 0).toFixed(2)}`, 20, 94)
      doc.save(`resumo_financeiro_${mesSelecionado.replace('/', '-')}.pdf`)
    } catch (e) {
      console.error('Erro ao gerar PDF:', e)
    } finally {
      setDownloadingPdf(false)
    }
  };

  const { data: gastos = [], error: gastosError } = useQuery({
    queryKey: ['gastos_pessoais', funcionarioId],
    queryFn: () => client.entities.GastosPessoais.filter({ funcionario_id: funcionarioId }),
    enabled: !!funcionarioId,
  });

  if (gastosError) logError(gastosError, 'Erro ao carregar gastos pessoais');

  const { data: metas = [], error: metasError } = useQuery({
    queryKey: ['metas_financeiras', funcionarioId],
    queryFn: () => client.entities.MetaFinanceira.filter({ funcionario_id: funcionarioId }),
    enabled: !!funcionarioId,
  });

  if (metasError) logError(metasError, 'Erro ao carregar metas financeiras');

  const { data: assinaturas = [] } = useQuery({
    queryKey: ['assinaturas_pessoais_vf', funcionarioId],
    queryFn: () => client.entities.AssinaturasPessoais.filter({ funcionario_id: funcionarioId }),
    enabled: !!funcionarioId,
  });

  const { data: dividas = [] } = useQuery({
    queryKey: ['dividas_pessoais_vf', funcionarioId],
    queryFn: () => client.entities.DividasPessoais.filter({ funcionario_id: funcionarioId }),
    enabled: !!funcionarioId,
  });

  // ─── GASTOS DO MÊS + PROJEÇÃO DE RECORRENTES ───
  const gastosMes = filtrarGastosPorMes(gastos, mesSelecionado);

  // Projeta gastos fixos recorrentes de meses anteriores para este mês
  const mesData = (() => {
    const [m, a] = mesSelecionado.split('/');
    return new Date(parseInt(a), parseInt(m) - 1, 1);
  })();
  const categoriasNoMes = new Set(gastosMes.filter(g => g.categoria_tipo === 'gasto_fixo').map(g => g.categoria_nome));
  const gastosProjetados = [];
  for (const g of gastos) {
    if (!g.recorrente || g.categoria_tipo !== 'gasto_fixo') continue;
    const dataGasto = new Date(g.data_lancamento + 'T12:00:00');
    if (dataGasto <= mesData && !categoriasNoMes.has(g.categoria_nome)) {
      gastosProjetados.push({ ...g, projetado: true });
      categoriasNoMes.add(g.categoria_nome);
    }
  }
  const gastosMesCompletos = [...gastosMes, ...gastosProjetados];

  const { gastoFixo, gastoVariavel, investimento, receitaExtra = 0, totalGastos } = calcularResumoMensal(gastosMesCompletos, 0);

  // ─── ASSINATURAS E DÍVIDAS (SEMPRE ATIVAS, INDEPENDENTE DO MÊS) ───
  const assinaturasAtivas = assinaturas.filter(a => a.ativa);
  const dividasAtivas = dividas.filter(d => d.ativa);
  const totalAssinaturas = assinaturasAtivas.reduce((s, a) => s + (a.valor || 0), 0);
  const totalParcelas = dividasAtivas.reduce((s, d) => s + (d.valor_parcela || 0), 0);

  const metaMes = metas.find(m => m.mes_referencia === mesSelecionado);
  const salario = salarioBase || metaMes?.salario_pessoal || parseFloat(salarioManual) || 0;

  const comissaoMesAtual = isAtiva('exibir_comissao_vida_financeira')
    ? calcularComissaoMensal(comissoesFuncionarios, funcionarioId, mesSelecionado) : 0;

  const mesAnterior = meses.find(m => m === mesSelecionado)
    ? meses[meses.indexOf(mesSelecionado) + 1] || null : null;
  const comissaoMesAnterior = isAtiva('exibir_comissao_vida_financeira') && mesAnterior
    ? calcularComissaoMensal(comissoesFuncionarios, funcionarioId, mesAnterior) : 0;

  const rendaBase = isAtiva('renda_base_inicial') ? salario + comissaoMesAnterior : salario;
  const receitaTotal = rendaBase + comissaoMesAtual;

  const totalCompromissos = totalGastos + totalAssinaturas + totalParcelas;

  const saldoPessoal = receitaTotal + receitaExtra - totalCompromissos;
  const rendaTotal = receitaTotal + receitaExtra;
  const alerta = calcularAlerta(totalCompromissos, rendaTotal);
  const progresso = calcularProgressoMeta(saldoPessoal, metaMes?.meta_mensal);

  const lancamentosMes = lancamentosFunc.filter(l => {
    if (!l.data_lancamento) return false;
    const d = new Date(l.data_lancamento);
    const mr = `${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
    return mr === mesSelecionado;
  });

  const pieData = [
    { name: 'Gastos Fixos', value: gastoFixo, color: TIPO_COLORS.gasto_fixo.chart },
    { name: 'Gastos Variáveis', value: gastoVariavel, color: TIPO_COLORS.gasto_variavel.chart },
    { name: 'Investimentos', value: investimento, color: TIPO_COLORS.investimento.chart },
    { name: 'Assinaturas', value: totalAssinaturas, color: '#8b5cf6' },
    { name: 'Parcelas', value: totalParcelas, color: '#f43f5e' },
    { name: 'Receitas Extras', value: receitaExtra, color: TIPO_COLORS.receita_extra.chart },
  ].filter(d => d.value > 0);

  const ultimos6 = meses.slice(0, 6).reverse();
  const lineData = ultimos6.map(mes => {
    const g = filtrarGastosPorMes(gastos, mes);
    const r = calcularResumoMensal(g, salario);
    const comMs = isAtiva('exibir_comissao_vida_financeira') ? calcularComissaoMensal(comissoesFuncionarios, funcionarioId, mes) : 0;
    return {
      mes: mes.substring(0, 5),
      gastos: r.totalGastos,
      saldo: r.saldoPessoal + comMs,
      receitas_extras: isAtiva('receitas_extras_graficos') ? (r.receitaExtra || 0) : 0,
      comissao: isAtiva('exibir_comissao_vida_financeira') ? comMs : 0,
    };
  });

  if (loadingRH) return null;

  const renderDashboard = () => (
    <div className="space-y-4">
      {!salarioBase && (
        <Card>
          <CardContent className="pt-4">
            <p className="text-sm text-muted-foreground mb-2">Informe seu salário manualmente:</p>
            <div className="flex gap-2">
              <Input type="number" placeholder="R$ 0,00" value={salarioManual} onChange={e => setSalarioManual(e.target.value)} className="flex-1" />
              {metaMes?.salario_pessoal && (
                <Button variant="outline" size="sm" onClick={() => setSalarioManual(metaMes.salario_pessoal.toString())}>Usar salvo</Button>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      <AlertaFinanceiro alerta={alerta} progresso={progresso} metaMensal={metaMes?.meta_mensal} />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {isAtiva('exibir_comissao_vida_financeira') ? (
          <>
            <ResumoSalarioCard label="Salário + Comissão (mês ant.)" valor={salario + comissaoMesAnterior} salarioBase={salario} comissao={comissaoMesAnterior} tipo="medio" />
            <ResumoSalarioCard label="Salário + Comissão (atual)" valor={salario + comissaoMesAtual} salarioBase={salario} comissao={comissaoMesAtual} tipo="corrente" />
          </>
        ) : (
          <StatCard icon={DollarSign} label="Salário (Contrato)" value={formatCurrency(salario)} />
        )}
        {isAtiva('receitas_extras_vida_financeira') && receitaExtra > 0 && (
          <StatCard icon={TrendingUp} label="Receitas Extras" value={formatCurrency(receitaExtra)} colorClass="text-blue-600" />
        )}
        <StatCard icon={PiggyBank} label="Renda Total" value={formatCurrency(receitaTotal)} colorClass="text-primary" />
        {totalAssinaturas > 0 && <StatCard icon={Tv} label="Assinaturas" value={formatCurrency(totalAssinaturas)} colorClass="text-purple-600" />}
        {totalParcelas > 0 && <StatCard icon={CreditCard} label="Parcelas" value={formatCurrency(totalParcelas)} colorClass="text-rose-600" />}
        <StatCard icon={TrendingDown} label="Total Compromissos" value={formatCurrency(totalCompromissos)} colorClass="text-destructive" />
        <StatCard icon={Wallet} label="Saldo Pessoal" value={formatCurrency(saldoPessoal)} colorClass={saldoPessoal >= 0 ? 'text-green-600' : 'text-red-600'} />
      </div>

      <MiniDRE mesSelecionado={mesSelecionado} salarioBase={salario} comissaoMes={comissaoMesAtual}
        receitaExtra={isAtiva('receitas_extras_vida_financeira') ? receitaExtra : 0}
        gastoFixo={gastoFixo} gastoVariavel={gastoVariavel} investimento={investimento}
        gastosFixosLista={gastosMesCompletos.filter(g => g.categoria_tipo === 'gasto_fixo')}
        gastosVariaveisLista={gastosMesCompletos.filter(g => g.categoria_tipo === 'gasto_variavel')}
        investimentosLista={gastosMesCompletos.filter(g => g.categoria_tipo === 'investimento')}
        assinaturasLista={assinaturasAtivas}
        dividasLista={dividasAtivas}
        lancamentosMes={lancamentosMes} />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {pieData.length > 0 && (
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm">Distribuição dos Gastos</CardTitle></CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie data={pieData} cx="50%" cy="50%" outerRadius={80} dataKey="value" labelLine={false}>
                    {pieData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                  </Pie>
                  <Tooltip formatter={(v) => formatCurrency(v)} />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm">Evolução — Últimos 6 meses</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={lineData}>
                <XAxis dataKey="mes" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} tickFormatter={v => `R$${(v / 1000).toFixed(0)}k`} />
                <Tooltip formatter={(v) => formatCurrency(v)} />
                <Legend />
                <Line type="monotone" dataKey="gastos" stroke="#ef4444" name="Gastos" strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="saldo" stroke="#22c55e" name="Saldo" strokeWidth={2} dot={false} />
                {isAtiva('exibir_comissao_vida_financeira') && <Line type="monotone" dataKey="comissao" stroke="#f59e0b" name="Comissão" strokeWidth={2} dot={false} />}
                {isAtiva('receitas_extras_graficos') && <Line type="monotone" dataKey="receitas_extras" stroke="#3b82f6" name="Receitas Extras" strokeWidth={2} dot={false} />}
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {metaMes?.meta_mensal && (
        <Card>
          <CardContent className="pt-4 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Meta de Economia</span>
              <span className="text-sm font-bold text-primary">{formatCurrency(metaMes.meta_mensal)}</span>
            </div>
            {progresso !== null && (
              <>
                <div className="w-full h-2.5 rounded-full bg-muted overflow-hidden">
                  <div className={`h-full rounded-full ${progresso >= 100 ? 'bg-green-500' : 'bg-primary'}`} style={{ width: `${Math.min(Math.max(progresso, 0), 100)}%` }} />
                </div>
                <p className={`text-xs font-medium ${progresso >= 100 ? 'text-green-600' : 'text-muted-foreground'}`}>{progresso.toFixed(0)}% atingido</p>
              </>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );

  return (
    <div className="space-y-4">
      <div className="flex gap-2 items-center flex-wrap">
        <Select value={mesSelecionado} onValueChange={setMesSelecionado}>
          <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
          <SelectContent>
            {meses.map(m => <SelectItem key={m} value={m}>{m}{m === mesAtual ? ' ●' : ''}</SelectItem>)}
          </SelectContent>
        </Select>
        <Button onClick={handleDownloadPdf} disabled={downloadingPdf} variant="outline" size="sm" className="gap-2">
          <Download className="w-4 h-4" />{downloadingPdf ? 'Gerando...' : 'Baixar PDF'}
        </Button>
      </div>

      <div className="flex flex-wrap justify-center gap-1 bg-muted/50 rounded-xl p-1.5">
        {TABS.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={`flex items-center gap-2 px-3 py-2 text-xs sm:text-sm font-medium rounded-lg whitespace-nowrap transition-all ${
              tab === t.id ? 'bg-card shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground'
            }`}>
            <t.icon className="w-4 h-4" />{t.label}
          </button>
        ))}
      </div>

      {tab === 'dashboard' && renderDashboard()}
      {tab === 'gastos' && <MeusGastos funcionarioId={funcionarioId} />}
      {tab === 'assinaturas' && <MinhasAssinaturas funcionarioId={funcionarioId} salarioBase={funcionario?.salario_base || 0} />}
      {tab === 'dividas' && <MinhasDividas funcionarioId={funcionarioId} salarioBase={funcionario?.salario_base || 0} />}
      {tab === 'metas' && <MetasObjetivos funcionarioId={funcionarioId} />}
      {tab === 'simuladores' && <SimuladoresFinanceiros />}
      {tab === 'educacao' && <EducacaoFinanceira />}
    </div>
  );
}

import React, { useState, useEffect, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { client } from '@/api/client';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { getMesReferenciaAtual, formatCurrency, parseDateLocal, getMesRef } from '@/lib/formatters';
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
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from 'recharts';

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

export default function PortalVidaFinanceira({ funcionario, lancamentosFunc, comissoesFuncionarios = [], fechamentosFuncionario = [], mesSelecionado, setMesSelecionado, tiposPersonalizados = [] }) {
  const [tab, setTab] = useState('dashboard');
  const [salarioManual, setSalarioManual] = useState('');
  const { isAtiva, isLoading: loadingRH } = useRHControl();
  const { logError } = useFinancialDataLogger('PortalVidaFinanceira');
  const [downloadingPdf, setDownloadingPdf] = useState(false);
  const funcionarioId = funcionario?.id;
  const salarioBase = Number(funcionario?.salario_base) || 0;
  const ajudaCusto = Number(funcionario?.ajuda_custo) || 0;
  const mesAtual = getMesReferenciaAtual();

  // Range de meses: da admissão até o mês atual + lançamentos futuros
  const meses = useMemo(() => {
    const mesesArr = [];
    let minMes = mesAtual;
    if (funcionario?.data_admissao) {
      try {
        const d = parseDateLocal(funcionario.data_admissao);
        if (d && !isNaN(d.getTime())) {
          minMes = `${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
        }
      } catch { /* data inválida */ }
    }
    // Estende ao futuro se houver lançamentos
    let maxMes = mesAtual;
    if (lancamentosFunc?.length > 0) {
      const mRecente = lancamentosFunc.reduce((m, l) => {
        if (!l.data_lancamento) return m;
        return l.data_lancamento > m ? l.data_lancamento : m;
      }, '0000-00-00');
      if (mRecente !== '0000-00-00') {
        try {
          const d = parseDateLocal(mRecente);
          if (d && !isNaN(d.getTime())) maxMes = `${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
        } catch { /* data inválida */ }
      }
    }
    const [mMin, aMin] = minMes.split('/').map(Number);
    const [mMax, aMax] = maxMes.split('/').map(Number);
    let ano = aMin, mes = mMin;
    while (ano < aMax || (ano === aMax && mes <= mMax)) {
      mesesArr.push(`${String(mes).padStart(2, '0')}/${ano}`);
      mes++;
      if (mes > 12) { mes = 1; ano++; }
    }
    return mesesArr.length > 0 ? mesesArr : [mesAtual];
  }, [funcionario, lancamentosFunc, mesAtual]);

  // Garante que mesSelecionado está no range
  useEffect(() => {
    if (meses.length > 0 && !meses.includes(mesSelecionado)) {
      setMesSelecionado(meses[meses.length - 1] || mesAtual);
    }
  }, [meses, mesSelecionado, mesAtual, setMesSelecionado]);

  const handleDownloadPdf = async () => {
    setDownloadingPdf(true);
    try {
      const { jsPDF } = await import('jspdf')
      const doc = new jsPDF()
      doc.setFontSize(16)
      doc.text('Resumo Financeiro', 20, 20)
      doc.setFontSize(11)
      doc.text(`Mês: ${mesSelecionado}`, 20, 32)
      doc.text(`Salário + Ajuda: R$ ${salario.toFixed(2)}`, 20, 42)
      doc.text(`Comissão: R$ ${comissaoMesAtual.toFixed(2)}`, 20, 50)
      doc.text(`Receita Extra: R$ ${receitaExtra.toFixed(2)}`, 20, 58)
      doc.text(`Gastos Fixos: R$ ${gastoFixo.toFixed(2)}`, 20, 68)
      doc.text(`Gastos Variáveis: R$ ${gastoVariavel.toFixed(2)}`, 20, 76)
      doc.text(`Investimentos: R$ ${investimento.toFixed(2)}`, 20, 84)
      doc.text(`Saldo: R$ ${saldoPessoal.toFixed(2)}`, 20, 94)
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
    queryKey: ['assinaturas_pessoais', funcionarioId],
    queryFn: () => client.entities.AssinaturasPessoais.filter({ funcionario_id: funcionarioId }),
    enabled: !!funcionarioId,
  });

  const { data: dividas = [] } = useQuery({
    queryKey: ['dividas_pessoais', funcionarioId],
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
  const salario = salarioBase + ajudaCusto || metaMes?.salario_pessoal || parseFloat(salarioManual) || 0;

  const comissaoMesAtual = isAtiva('exibir_comissao_vida_financeira')
    ? calcularComissaoMensal(comissoesFuncionarios, funcionarioId, mesSelecionado) : 0;

  // Lançamentos do RH apenas para adicionais (créditos)
  const lancamentosMes = lancamentosFunc.filter(l => {
    if (!l.data_lancamento) return false;
    const mr = getMesRef(l.data_lancamento);
    return mr === mesSelecionado;
  });

  // Adicionais do RH (créditos que o funcionário recebeu além do salário) — padrão + custom
  const adicionaisRH = lancamentosMes
    .filter(l => (['adicional', 'ajuste'].includes(l.tipo_lancamento) || tiposPersonalizados.some(t => t.ativo !== false && t.categoria === 'adicional' && t.nome === l.tipo_lancamento)) || l.parcelado)
    .reduce((s, l) => s + (l.valor || 0), 0);

  const receitaTotal = salario + comissaoMesAtual + adicionaisRH;

  const totalCompromissos = totalGastos + totalAssinaturas + totalParcelas;

  const saldoPessoal = receitaTotal + receitaExtra - totalCompromissos;
  const rendaTotal = receitaTotal + receitaExtra;
  const alerta = calcularAlerta(totalCompromissos, rendaTotal);
  const progresso = calcularProgressoMeta(saldoPessoal, metaMes?.meta_mensal);

  const pieData = [
    { name: 'Gastos Fixos', value: gastoFixo, color: TIPO_COLORS.gasto_fixo.chart },
    { name: 'Gastos Variáveis', value: gastoVariavel, color: TIPO_COLORS.gasto_variavel.chart },
    { name: 'Investimentos', value: investimento, color: TIPO_COLORS.investimento.chart },
    { name: 'Assinaturas', value: totalAssinaturas, color: '#8b5cf6' },
    { name: 'Parcelas', value: totalParcelas, color: '#f43f5e' },
    { name: 'Receitas Extras', value: receitaExtra, color: TIPO_COLORS.receita_extra.chart },
  ].filter(d => d.value > 0);

  if (loadingRH) return null;

  const renderDashboard = () => (
    <div className="space-y-4">
      {!salarioBase && (
        <Card>
          <CardContent className="pt-4">
            <p className="text-sm text-muted-foreground mb-2">Informe seu salário {ajudaCusto > 0 ? '+ ajuda de custo' : ''} manualmente:</p>
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
            <ResumoSalarioCard label="Salário + Comissão" valor={salario + comissaoMesAtual} salarioBase={salarioBase || salario} ajudaCusto={salarioBase > 0 ? ajudaCusto : 0} comissao={comissaoMesAtual} tipo="corrente" />
        ) : (
          <StatCard icon={DollarSign} label={ajudaCusto > 0 ? 'Salário + Ajuda de Custo' : 'Salário (Contrato)'} value={formatCurrency(salario)} />
        )}
        {isAtiva('receitas_extras_vida_financeira') && receitaExtra > 0 && (
          <StatCard icon={TrendingUp} label="Receitas Extras" value={formatCurrency(receitaExtra)} colorClass="text-blue-600" />
        )}
        <StatCard icon={PiggyBank} label="Renda Total" value={formatCurrency(rendaTotal)} colorClass="text-primary" />
        {totalAssinaturas > 0 && <StatCard icon={Tv} label="Assinaturas" value={formatCurrency(totalAssinaturas)} colorClass="text-purple-600" />}
        {totalParcelas > 0 && <StatCard icon={CreditCard} label="Parcelas" value={formatCurrency(totalParcelas)} colorClass="text-rose-600" />}
        <StatCard icon={TrendingDown} label="Total Compromissos" value={formatCurrency(totalCompromissos)} colorClass="text-destructive" />
        <StatCard icon={Wallet} label="Saldo Pessoal" value={formatCurrency(saldoPessoal)} colorClass={saldoPessoal >= 0 ? 'text-green-600' : 'text-red-600'} />
      </div>

      {pieData.length > 1 && (
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

      <MiniDRE mesSelecionado={mesSelecionado} salarioBase={salarioBase} ajudaCusto={ajudaCusto} salarioEfetivo={salario} comissaoMes={comissaoMesAtual}
        receitaExtra={isAtiva('receitas_extras_vida_financeira') ? receitaExtra : 0}
        gastoFixo={gastoFixo} gastoVariavel={gastoVariavel} investimento={investimento}
        gastosFixosLista={gastosMesCompletos.filter(g => g.categoria_tipo === 'gasto_fixo')}
        gastosVariaveisLista={gastosMesCompletos.filter(g => g.categoria_tipo === 'gasto_variavel')}
        investimentosLista={gastosMesCompletos.filter(g => g.categoria_tipo === 'investimento')}
        assinaturasLista={assinaturasAtivas}
        dividasLista={dividasAtivas.filter(d => d.tipo !== 'consignado')}
        lancamentosMes={lancamentosMes}
        tiposPersonalizados={tiposPersonalizados} />

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

      <nav className="flex flex-nowrap overflow-x-auto justify-start gap-1 bg-muted/50 rounded-xl p-1.5">
        {TABS.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium rounded-lg whitespace-nowrap transition-all ${
              tab === t.id ? 'bg-card shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground'
            }`}>
            <t.icon className="w-3.5 h-3.5" />{t.label}
          </button>
        ))}
      </nav>

      {tab === 'dashboard' && renderDashboard()}
      {tab === 'gastos' && <MeusGastos funcionarioId={funcionarioId} mesSelecionado={mesSelecionado} lancamentosMes={lancamentosMes} />}
      {tab === 'assinaturas' && <MinhasAssinaturas funcionarioId={funcionarioId} salarioBase={salario} />}
      {tab === 'dividas' && <MinhasDividas funcionarioId={funcionarioId} salarioBase={salario} />}
      {tab === 'metas' && <MetasObjetivos funcionarioId={funcionarioId} mesSelecionado={mesSelecionado} />}
      {tab === 'simuladores' && <SimuladoresFinanceiros />}
      {tab === 'educacao' && <EducacaoFinanceira />}
    </div>
  );
}

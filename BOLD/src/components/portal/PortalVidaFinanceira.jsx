import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { getMesReferenciaAtual, getMesesOptions, formatCurrency } from '@/lib/formatters';
import { calcularResumoMensal, calcularAlerta, calcularProgressoMeta, filtrarGastosPorMes, TIPO_COLORS } from '@/lib/vidaFinanceira';
import { calcularComissaoMensal } from '@/lib/comissoes';
import { useRHControl } from '@/lib/rhControl';
import { useFinancialDataLogger } from '@/hooks/useFinancialDataLogger';
import AlertaFinanceiro from '@/components/vidafinanceira/AlertaFinanceiro';
import MeusGastos from '@/components/vidafinanceira/MeusGastos';
import MiniDRE from '@/components/portal/MiniDRE';
import ResumoSalarioCard from '@/components/vidafinanceira/ResumoSalarioCard';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { DollarSign, TrendingDown, TrendingUp, PiggyBank, Wallet, List, LayoutDashboard, Download } from 'lucide-react';
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
    try {
      setDownloadingPdf(true);
      const response = await base44.functions.invoke('gerarResumoPdfVidaFinanceira', {
        mes_referencia: mesSelecionado,
        salario,
        comissao: isAtiva('exibir_comissao_vida_financeira') ? comissaoMesAtual : 0,
        receita_extra: isAtiva('receitas_extras_vida_financeira') ? receitaExtra : 0,
        gastos_fixos: gastoFixo,
        gastos_variaveis: gastoVariavel,
        investimentos: investimento,
        saldo: saldoPessoal,
        meta: metaMes?.meta_mensal || 0,
      });

      const blob = new Blob([response.data], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `resumo_financeiro_${mesSelecionado.replace('/', '-')}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      logError(error, 'Erro ao baixar PDF');
    } finally {
      setDownloadingPdf(false);
    }
  };

  const { data: gastos = [], error: gastosError } = useQuery({
    queryKey: ['gastos_pessoais', funcionarioId],
    queryFn: () => base44.entities.GastosPessoais.filter({ funcionario_id: funcionarioId }),
    enabled: !!funcionarioId,
  });

  if (gastosError) {
    logError(gastosError, 'Erro ao carregar gastos pessoais');
  }

  const { data: metas = [], error: metasError } = useQuery({
    queryKey: ['metas_financeiras', funcionarioId],
    queryFn: () => base44.entities.MetaFinanceira.filter({ funcionario_id: funcionarioId }),
    enabled: !!funcionarioId,
  });

  if (metasError) {
    logError(metasError, 'Erro ao carregar metas financeiras');
  }

  const metaMes = metas.find(m => m.mes_referencia === mesSelecionado);
  const salario = salarioBase || metaMes?.salario_pessoal || parseFloat(salarioManual) || 0;
  
  // Calcular comissão do mês selecionado e do mês anterior
  const comissaoMesAtual = isAtiva('exibir_comissao_vida_financeira')
    ? calcularComissaoMensal(comissoesFuncionarios, funcionarioId, mesSelecionado)
    : 0;
  
  // Mês anterior para exibir comissão passada
  const mesAnterior = meses.find(m => m === mesSelecionado) 
    ? meses[meses.indexOf(mesSelecionado) + 1] || null
    : null;
  const comissaoMesAnterior = isAtiva('exibir_comissao_vida_financeira') && mesAnterior
    ? calcularComissaoMensal(comissoesFuncionarios, funcionarioId, mesAnterior)
    : 0;
  
  // Renda base inicial (antes do fechamento) = salário + comissão anterior
  const rendaBase = isAtiva('renda_base_inicial') 
    ? salario + comissaoMesAnterior
    : salario;
  
  // Renda total = rendaBase + comissão do mês (após fechamento)
  const receitaTotal = rendaBase + comissaoMesAtual;

  const gastosMes = filtrarGastosPorMes(gastos, mesSelecionado);
  const { gastoFixo, gastoVariavel, investimento, receitaExtra = 0, totalGastos } = calcularResumoMensal(gastosMes, receitaTotal);
  const saldoPessoal = receitaTotal + receitaExtra - totalGastos;
  const rendaTotal = receitaTotal + receitaExtra;
  const alerta = calcularAlerta(totalGastos, rendaTotal);
  const progresso = calcularProgressoMeta(saldoPessoal, metaMes?.meta_mensal);

  // Lançamentos RH do mês (para o MiniDRE)
  const lancamentosMes = lancamentosFunc.filter(l => {
    if (!l.data_lancamento) return false;
    const d = new Date(l.data_lancamento);
    const mr = `${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
    return mr === mesSelecionado;
  });

  // Gráfico pizza
  const pieData = [
    { name: 'Gastos Fixos', value: gastoFixo, color: TIPO_COLORS.gasto_fixo.chart },
    { name: 'Gastos Variáveis', value: gastoVariavel, color: TIPO_COLORS.gasto_variavel.chart },
    { name: 'Investimentos', value: investimento, color: TIPO_COLORS.investimento.chart },
    { name: 'Receitas Extras', value: receitaExtra, color: TIPO_COLORS.receita_extra.chart },
  ].filter(d => d.value > 0);

  // Gráfico linha
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

  return (
    <div className="space-y-4">
      {/* Seletor de mês e botão de download */}
      <div className="flex gap-2 items-center flex-wrap">
        <Select value={mesSelecionado} onValueChange={setMesSelecionado}>
          <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
          <SelectContent>
            {meses.map(m => <SelectItem key={m} value={m}>{m}{m === mesAtual ? ' ●' : ''}</SelectItem>)}
          </SelectContent>
        </Select>
        <Button 
          onClick={handleDownloadPdf} 
          disabled={downloadingPdf}
          variant="outline"
          size="sm"
          className="gap-2"
        >
          <Download className="w-4 h-4" />
          {downloadingPdf ? 'Gerando...' : 'Baixar PDF'}
        </Button>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-muted/50 rounded-xl p-1">
        {TABS.map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`flex-1 flex items-center justify-center gap-2 py-2 text-sm font-medium rounded-lg transition-all ${
              tab === t.id ? 'bg-card shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <t.icon className="w-4 h-4" />
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'gastos' && (
        <MeusGastos funcionarioId={funcionarioId} />
      )}

      {tab === 'dashboard' && (
        <div className="space-y-4">
          {/* Salário manual */}
          {!salarioBase && (
            <Card>
              <CardContent className="pt-4">
                <p className="text-sm text-muted-foreground mb-2">Informe seu salário manualmente:</p>
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
                      Usar salvo
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Alertas */}
          <AlertaFinanceiro alerta={alerta} progresso={progresso} metaMensal={metaMes?.meta_mensal} />

          {/* Cards resumo */}
          <div className="grid grid-cols-1 gap-3">
            {isAtiva('exibir_comissao_vida_financeira') ? (
              <>
                <ResumoSalarioCard 
                  label="Salário Médio (Contrato + Última Comissão)" 
                  valor={salario + comissaoMesAnterior}
                  salarioBase={salario}
                  comissao={comissaoMesAnterior}
                  tipo="medio"
                />
                <ResumoSalarioCard 
                  label="Salário Referente ao Mês Corrente" 
                  valor={salario + comissaoMesAtual}
                  salarioBase={salario}
                  comissao={comissaoMesAtual}
                  tipo="corrente"
                />
              </>
            ) : (
              <StatCard icon={DollarSign} label="Salário (Contrato)" value={formatCurrency(salario)} />
            )}
            {isAtiva('receitas_extras_vida_financeira') && receitaExtra > 0 && (
              <StatCard icon={TrendingUp} label="Receitas Extras" value={formatCurrency(receitaExtra)} colorClass="text-blue-600" />
            )}
            <StatCard icon={DollarSign} label="Renda Total" value={formatCurrency(receitaTotal)} colorClass="text-primary" />
            <StatCard icon={Wallet} label="Saldo Pessoal" value={formatCurrency(saldoPessoal)} colorClass={saldoPessoal >= 0 ? 'text-green-600' : 'text-red-600'} />
            <StatCard icon={TrendingDown} label="Total Gastos" value={formatCurrency(totalGastos)} colorClass="text-destructive" />
          </div>

          {/* Mini DRE */}
          <MiniDRE
            mesSelecionado={mesSelecionado}
            salarioBase={salario}
            comissaoMes={comissaoMesAtual}
            receitaExtra={isAtiva('receitas_extras_vida_financeira') ? receitaExtra : 0}
            gastoFixo={gastoFixo}
            gastoVariavel={gastoVariavel}
            investimento={investimento}
            lancamentosMes={lancamentosMes}
          />

          {/* Receitas extras — histórico resumido */}
          {isAtiva('receitas_extras_vida_financeira') && receitaExtra > 0 && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-blue-700">💰 Receitas Extras — {mesSelecionado}</CardTitle>
              </CardHeader>
              <CardContent>
                {gastosMes.filter(g => g.categoria_tipo === 'receita_extra').sort((a, b) => (b.data_lancamento || '').localeCompare(a.data_lancamento || '')).map(g => (
                  <div key={g.id} className="flex items-center justify-between py-1.5 border-b last:border-b-0">
                    <div>
                      <span className="text-sm font-medium">{g.categoria_nome}</span>
                      {g.descricao && <span className="text-xs text-muted-foreground ml-1">— {g.descricao}</span>}
                    </div>
                    <span className="text-sm font-bold text-blue-600">+ {formatCurrency(g.valor)}</span>
                  </div>
                ))}
                <div className="flex justify-between pt-2 mt-1 border-t">
                  <span className="text-sm font-bold">Total</span>
                  <span className="text-sm font-bold text-blue-600">+ {formatCurrency(receitaExtra)}</span>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Meta */}
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
                      <div
                        className={`h-full rounded-full ${progresso >= 100 ? 'bg-green-500' : 'bg-primary'}`}
                        style={{ width: `${Math.min(Math.max(progresso, 0), 100)}%` }}
                      />
                    </div>
                    <p className={`text-xs font-medium ${progresso >= 100 ? 'text-green-600' : 'text-muted-foreground'}`}>
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
                    <Pie data={pieData} cx="50%" cy="50%" outerRadius={70} dataKey="value" labelLine={false}>
                      {pieData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                    </Pie>
                    <Tooltip formatter={(v) => formatCurrency(v)} />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          )}

          {/* Evolução */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Evolução — Últimos 6 meses</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={200}>
                <LineChart data={lineData}>
                  <XAxis dataKey="mes" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} tickFormatter={v => `R$${(v / 1000).toFixed(0)}k`} />
                  <Tooltip formatter={(v) => formatCurrency(v)} />
                  <Legend />
                  <Line type="monotone" dataKey="gastos" stroke="#ef4444" name="Gastos" strokeWidth={2} dot={false} />
                  <Line type="monotone" dataKey="saldo" stroke="#22c55e" name="Saldo" strokeWidth={2} dot={false} />
                  {isAtiva('exibir_comissao_vida_financeira') && (
                    <Line type="monotone" dataKey="comissao" stroke="#f59e0b" name="Comissão" strokeWidth={2} dot={false} />
                  )}
                  {isAtiva('receitas_extras_graficos') && (
                    <Line type="monotone" dataKey="receitas_extras" stroke="#3b82f6" name="Receitas Extras" strokeWidth={2} dot={false} />
                  )}
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { DollarSign, TrendingUp, TrendingDown, Info, AlertTriangle, LineChart } from 'lucide-react';
import { formatCurrency, getMesReferenciaAtual, getMesesOptions } from '@/lib/formatters';
import { calcularComissaoMensal } from '@/lib/comissoes';
import ResumoSalarioCard from '@/components/vidafinanceira/ResumoSalarioCard';
import { LineChart as RechartLineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from 'recharts';

function StatRow({ label, value, colorClass = 'text-foreground', bold = false }) {
  return (
    <div className="flex items-center justify-between py-2.5 border-b last:border-b-0">
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className={`text-sm font-${bold ? 'bold' : 'medium'} ${colorClass}`}>{value}</span>
    </div>
  );
}

export default function MeuSalario({ funcionario, lancamentosFuncionario, comissoesFuncionarios, mesSelecionado }) {
   const perm = funcionario?.permissoes_portal || {};
   const TIPOS_LIMITE = ['vale', 'adiantamento', 'convenio', 'consumo', 'credito_consignado'];

   if (!perm.ver_salario) {
     return (
       <Card>
         <CardContent className="pt-6 flex flex-col items-center gap-3 py-10 text-center">
           <AlertTriangle className="w-8 h-8 text-muted-foreground" />
           <p className="text-muted-foreground text-sm">Você não tem permissão para ver informações de salário.</p>
         </CardContent>
       </Card>
     );
   }

   const mesesOpts = getMesesOptions(6);

   // Calcula por mês
   function calcMes(mes) {
     const lancs = lancamentosFuncionario.filter(l => {
       if (!l.data_lancamento) return false;
       const d = new Date(l.data_lancamento);
       const mr = `${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
       return mr === mes;
     });
     const descontos = lancs.filter(l => TIPOS_LIMITE.includes(l.tipo_lancamento)).reduce((s, l) => s + (l.valor || 0), 0);
     const adicionais = lancs.filter(l => ['adicional', 'ajuste'].includes(l.tipo_lancamento)).reduce((s, l) => s + (l.valor || 0), 0);
     const comissao = calcularComissaoMensal(comissoesFuncionarios, funcionario?.id, mes);
     const liquido = (funcionario?.salario_base || 0) + comissao + adicionais - descontos;
     return { descontos, adicionais, comissao, liquido };
   }

   const dadosMes = calcMes(mesSelecionado);
   const mesesIndice = getMesesOptions(12);
   const indiceAtual = mesesIndice.findIndex(m => m === mesSelecionado);
   const mesPosterior = indiceAtual > 0 ? mesesIndice[indiceAtual - 1] : null;
   const comissaoMesAnterior = mesPosterior ? calcularComissaoMensal(comissoesFuncionarios, funcionario?.id, mesPosterior) : 0;

   const limite40 = funcionario?.salario_base ? funcionario.salario_base * 0.4 : null;
   const percentualDesconto = limite40 ? (dadosMes.descontos / limite40) * 100 : null;

   // Dados para gráfico de comissão evolutiva
   const lineData = mesesOpts.slice(0, 6).reverse().map(mes => {
     const d = calcMes(mes);
     return {
       mes: mes.substring(0, 5),
       comissao: d.comissao,
       liquido: d.liquido,
     };
   });

  return (
    <div className="space-y-5">
      {/* Cards de salário médio e salário corrente */}
      {dadosMes.comissao > 0 || comissaoMesAnterior > 0 ? (
        <>
          <ResumoSalarioCard 
            label="Salário Médio (Contrato + Última Comissão)" 
            valor={(funcionario?.salario_base || 0) + comissaoMesAnterior}
            salarioBase={funcionario?.salario_base || 0}
            comissao={comissaoMesAnterior}
            tipo="medio"
          />
          <ResumoSalarioCard 
            label="Salário Referente ao Mês Corrente" 
            valor={(funcionario?.salario_base || 0) + dadosMes.comissao}
            salarioBase={funcionario?.salario_base || 0}
            comissao={dadosMes.comissao}
            tipo="corrente"
          />
        </>
      ) : (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <DollarSign className="w-4 h-4 text-primary" />
              Salário Base
            </CardTitle>
          </CardHeader>
          <CardContent>
            <StatRow label="Salário base" value={formatCurrency(funcionario?.salario_base)} colorClass="text-foreground" bold />
          </CardContent>
        </Card>
      )}

      {/* Resumo do mês com descontos */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <DollarSign className="w-4 h-4 text-primary" />
            Resumo Salarial — {mesSelecionado}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <StatRow label="Salário base" value={formatCurrency(funcionario?.salario_base)} colorClass="text-foreground" />
          {dadosMes.comissao > 0 && (
            <StatRow label="Comissão do mês" value={formatCurrency(dadosMes.comissao)} colorClass="text-green-600" />
          )}
          {dadosMes.adicionais > 0 && (
            <StatRow label="Adicionais/Ajustes" value={formatCurrency(dadosMes.adicionais)} colorClass="text-green-600" />
          )}
          <StatRow label="Total de descontos" value={`- ${formatCurrency(dadosMes.descontos)}`} colorClass="text-destructive" />
          <StatRow label="Salário líquido estimado" value={formatCurrency(dadosMes.liquido)} colorClass={dadosMes.liquido >= 0 ? 'text-primary' : 'text-destructive'} bold />
        </CardContent>
      </Card>

      {/* Limite 40% */}
      {limite40 && (
        <Card>
          <CardContent className="pt-4 space-y-3">
            <div className="flex items-start gap-2 bg-blue-50 border border-blue-200 rounded-lg px-3 py-2">
              <Info className="w-4 h-4 text-blue-500 mt-0.5 shrink-0" />
              <p className="text-xs text-blue-700">
                O limite de <strong>40%</strong> do salário para descontos é <strong>{formatCurrency(limite40)}</strong>.
              </p>
            </div>
            {percentualDesconto !== null && (
              <div className="space-y-1.5">
                <div className="flex justify-between text-xs">
                  <span className="text-muted-foreground">Utilização do limite</span>
                  <span className={`font-bold ${percentualDesconto >= 100 ? 'text-destructive' : percentualDesconto >= 80 ? 'text-yellow-600' : 'text-green-600'}`}>
                    {percentualDesconto.toFixed(0)}%
                  </span>
                </div>
                <div className="w-full h-2.5 rounded-full bg-muted overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all ${percentualDesconto >= 100 ? 'bg-destructive' : percentualDesconto >= 80 ? 'bg-yellow-500' : 'bg-green-500'}`}
                    style={{ width: `${Math.min(percentualDesconto, 100)}%` }}
                  />
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Histórico 6 meses */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-primary" />
            Histórico — Últimos 6 meses
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {mesesOpts.slice(0, 6).map(mes => {
              const d = calcMes(mes);
              return (
                <div key={mes} className={`flex items-center justify-between rounded-lg px-3 py-2 text-sm ${mes === mesSelecionado ? 'bg-primary/5 border border-primary/20' : 'bg-muted/40'}`}>
                  <span className="font-medium">{mes}</span>
                  <div className="flex items-center gap-3 text-xs">
                    {d.comissao > 0 && <span className="text-green-600 font-semibold">+{formatCurrency(d.comissao)}</span>}
                    <span className="text-destructive">- {formatCurrency(d.descontos)}</span>
                    <span className={`font-bold ${d.liquido >= 0 ? 'text-primary' : 'text-destructive'}`}>{formatCurrency(d.liquido)}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Comissão evolutiva */}
      {lineData.some(d => d.comissao > 0) && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <LineChart className="w-4 h-4 text-primary" />
              Comissão Evolutiva — Últimos 6 meses
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={200}>
              <RechartLineChart data={lineData}>
                <XAxis dataKey="mes" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} tickFormatter={v => `R$${(v / 1000).toFixed(0)}k`} />
                <Tooltip formatter={(v) => formatCurrency(v)} />
                <Legend />
                <Line type="monotone" dataKey="comissao" stroke="#22c55e" name="Comissão" strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="liquido" stroke="#2563eb" name="Sal. Líquido" strokeWidth={2} dot={false} />
              </RechartLineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}
      </div>
      );
}
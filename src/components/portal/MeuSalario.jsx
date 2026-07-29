import React, { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { DollarSign, TrendingUp, Info, AlertTriangle } from 'lucide-react';
import { formatCurrency, getMesReferenciaAtual, LIMITE_PERCENTUAL, parseDateLocal, getMesRef } from '@/lib/formatters';
import { calcularComissaoMensal } from '@/lib/comissoes';
import ResumoSalarioCard from '@/components/vidafinanceira/ResumoSalarioCard';
import LimiteProgressBar from '@/components/ui/LimiteProgressBar';

function StatRow({ label, value, colorClass = 'text-foreground', bold = false }) {
  return (
    <div className="flex items-center justify-between py-2.5 border-b last:border-b-0">
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className={`text-sm font-${bold ? 'bold' : 'medium'} ${colorClass}`}>{value}</span>
    </div>
  );
}

export default function MeuSalario({ funcionario, lancamentosFuncionario, comissoesFuncionarios, fechamentosFuncionario = [], mesSelecionado, tiposPersonalizados = [] }) {
   const perm = funcionario?.permissoes_portal || {};

   const TIPOS_LIMITE = useMemo(() => {
     const padrao = ['vale', 'vale_parcelado', 'adiantamento', 'convenio', 'consumo', 'credito_consignado'];
     const custom = tiposPersonalizados
       .filter(t => t.ativo !== false && t.categoria === 'desconto')
       .map(t => t.nome);
     return [...padrao, ...custom];
   }, [tiposPersonalizados]);

   // Apenas Vale e Vale Parcelado consomem o limite de 40%
   const TIPOS_LIMITE_VALE = useMemo(() => ['vale', 'vale_parcelado'], []);

   const TIPOS_ADICIONAIS = useMemo(() => {
     const padrao = ['adicional', 'ajuste'];
     const custom = tiposPersonalizados
       .filter(t => t.ativo !== false && t.categoria === 'adicional')
       .map(t => t.nome);
     return [...padrao, ...custom];
   }, [tiposPersonalizados]);

   const mesAtual = useMemo(() => getMesReferenciaAtual(), []);

   // Index de fechamentos por mes_referencia (O(1) em vez de O(n))
   const fechamentosIndex = useMemo(() => {
     const map = {};
     for (const f of fechamentosFuncionario) {
       if (f.mes_referencia) map[f.mes_referencia] = f;
     }
     return map;
   }, [fechamentosFuncionario]);

   // Busca salario base PURO (sem ajuda_custo) do fechamento ou do cadastro
   function salarioBasePuro(mes) {
     const fechado = fechamentosIndex[mes];
     if (fechado) return fechado.salario_base || 0;
     return funcionario?.salario_base || 0;
   }

   function ajudaCustoMes(mes) {
     const fechado = fechamentosIndex[mes];
     if (fechado) return fechado.ajuda_custo || 0;
     return funcionario?.ajuda_custo || 0;
   }

   // Soma para cálculos internos (líquido, limite, etc.)
   function salarioTotalMes(mes) {
     return salarioBasePuro(mes) + ajudaCustoMes(mes);
   }

   // Gera range de meses baseado na data de admissão + dados existentes
   const mesesOpts = useMemo(() => {
     const meses = [];
     let minAno = Infinity, minMesNum = Infinity;

     // Ponto de partida: data de admissão
     if (funcionario?.data_admissao) {
       try {
         const d = parseDateLocal(funcionario.data_admissao);
         if (d && !isNaN(d.getTime())) {
           minAno = d.getFullYear();
           minMesNum = d.getMonth() + 1;
         }
       } catch { /* ignora formato inválido */ }
     }

     // Se não tem admissão válida, começa do mês atual
     if (minAno === Infinity) {
       const [mAt, aAt] = mesAtual.split('/').map(Number);
       minAno = aAt;
       minMesNum = mAt;
     }

      // Busca o lançamento mais antigo apenas quando NÃO há data de admissão.
      // Com data_admissao, o piso é a admissão — lançamentos pré-admissão são ignorados.
      if (!funcionario?.data_admissao && lancamentosFuncionario.length > 0) {
       const maisAntigo = lancamentosFuncionario.reduce((menor, l) => {
         if (!l.data_lancamento) return menor;
         // Guarda a data ISO para comparação correta
         return l.data_lancamento < menor ? l.data_lancamento : menor;
       }, '9999-99-99');

       if (maisAntigo !== '9999-99-99') {
         try {
           const d = parseDateLocal(maisAntigo);
           if (d && !isNaN(d.getTime())) {
             const anoLanc = d.getFullYear();
             const mesLanc = d.getMonth() + 1;
             // Comparação numérica correta: data mais antiga pode puxar minMes para trás
             if (anoLanc < minAno || (anoLanc === minAno && mesLanc < minMesNum)) {
               minAno = anoLanc;
               minMesNum = mesLanc;
             }
           }
         } catch { /* ignora */ }
       }
     }

     // Gera sequência de meses
     const [mAtual, aAtual] = mesAtual.split('/').map(Number);
     let ano = minAno, mes = minMesNum;
     while (ano < aAtual || (ano === aAtual && mes <= mAtual)) {
       meses.push(`${String(mes).padStart(2, '0')}/${ano}`);
       mes++;
       if (mes > 12) { mes = 1; ano++; }
     }
     return meses.length > 0 ? meses : [mesAtual];
   }, [funcionario, lancamentosFuncionario, mesAtual]);

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

   // Calcula por mês
   function calcMes(mes) {
     const lancs = lancamentosFuncionario.filter(l => {
       if (!l.data_lancamento) return false;
       const mr = getMesRef(l.data_lancamento);
       return mr === mes;
     });
     const base = salarioBasePuro(mes);
     const ajuda = ajudaCustoMes(mes);
     const totalSalario = base + ajuda;
     const descontos = lancs
       .filter(l => TIPOS_LIMITE.includes(l.tipo_lancamento) && !l.parcelado)
       .reduce((s, l) => s + (l.valor || 0), 0);
     const adicionais = lancs
       .filter(l => TIPOS_ADICIONAIS.includes(l.tipo_lancamento) || l.parcelado)
       .reduce((s, l) => s + (l.valor || 0), 0);
     const comissao = calcularComissaoMensal(comissoesFuncionarios, funcionario?.id, mes);
     const liquido = totalSalario + comissao + adicionais - descontos;
     return { salarioBase: base, ajudaCusto: ajuda, descontos, adicionais, comissao, liquido };
   }

   const dadosMes = calcMes(mesSelecionado);
   const indiceAtual = mesesOpts.indexOf(mesSelecionado);
   const mesAnterior = indiceAtual > 0 ? mesesOpts[indiceAtual - 1] : null;
   const comissaoMesAnterior = mesAnterior ? calcularComissaoMensal(comissoesFuncionarios, funcionario?.id, mesAnterior) : 0;

   const baseLimite = salarioBasePuro(mesSelecionado) + ajudaCustoMes(mesSelecionado);
   const limite40 = baseLimite ? baseLimite * 0.4 : null;
   const descontosLimite = lancamentosFuncionario
     .filter(l => {
       if (!l.data_lancamento) return false;
       const mr = getMesRef(l.data_lancamento);
       return mr === mesSelecionado;
     })
     .filter(l => TIPOS_LIMITE_VALE.includes(l.tipo_lancamento) && !l.parcelado)
     .reduce((s, l) => s + (l.valor || 0), 0);
   const percentualDesconto = limite40 ? (descontosLimite / limite40) * 100 : null;

   return (
    <div className="space-y-5">
      {/* Cards de salário médio e salário corrente */}
      {dadosMes.comissao > 0 || comissaoMesAnterior > 0 ? (
        <>
            <ResumoSalarioCard 
              label="Salário Médio (Contrato + Última Comissão)" 
              valor={dadosMes.salarioBase + dadosMes.ajudaCusto + comissaoMesAnterior}
              salarioBase={dadosMes.salarioBase + dadosMes.ajudaCusto}
              comissao={comissaoMesAnterior}
              tipo="medio"
            />
            <ResumoSalarioCard 
              label="Salário Referente ao Mês Corrente" 
              valor={dadosMes.salarioBase + dadosMes.ajudaCusto + dadosMes.comissao}
              salarioBase={dadosMes.salarioBase + dadosMes.ajudaCusto}
              comissao={dadosMes.comissao}
              tipo="corrente"
            />
        </>
      ) : (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <DollarSign className="w-4 h-4 text-primary" />
            Remuneração
          </CardTitle>
        </CardHeader>
        <CardContent>
          <StatRow label="Salário base" value={formatCurrency(dadosMes.salarioBase)} colorClass="text-foreground" bold />
          {dadosMes.ajudaCusto > 0 && (
            <StatRow label="Ajuda de custo" value={formatCurrency(dadosMes.ajudaCusto)} colorClass="text-blue-600" />
          )}
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
          <StatRow label="Salário base" value={formatCurrency(dadosMes.salarioBase)} colorClass="text-foreground" />
          {dadosMes.ajudaCusto > 0 && (
            <StatRow label="Ajuda de custo" value={formatCurrency(dadosMes.ajudaCusto)} colorClass="text-blue-600" />
          )}
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
                O limite de <strong>{LIMITE_PERCENTUAL}%</strong> do salário para descontos é <strong>{formatCurrency(limite40)}</strong>.
              </p>
            </div>
            {percentualDesconto !== null && (
              <LimiteProgressBar percentual={percentualDesconto} />
            )}
          </CardContent>
        </Card>
      )}

      {/* Histórico completo */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-primary" />
            Histórico de Salários
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {mesesOpts.slice(-3).map(mes => {
              const d = calcMes(mes);
              return (
                <div key={mes} className={`flex items-center justify-between rounded-lg px-3 py-2 text-sm ${mes === mesSelecionado ? 'bg-primary/5 border border-primary/20' : 'bg-muted/40'}`}>
                  <span className="font-medium w-14 shrink-0">{mes}</span>
                  <div className="flex items-center gap-3 text-xs">
                    <span className="text-muted-foreground">{formatCurrency(d.salarioBase + d.ajudaCusto)}</span>
                    {d.comissao > 0 && <span className="text-green-600 font-semibold">+{formatCurrency(d.comissao)}</span>}
                    {d.descontos > 0 && <span className="text-destructive">-{formatCurrency(d.descontos)}</span>}
                    <span className={`font-bold ${d.liquido >= 0 ? 'text-primary' : 'text-destructive'}`}>{formatCurrency(d.liquido)}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      </div>
      );
}

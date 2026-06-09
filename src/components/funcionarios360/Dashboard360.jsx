import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Users, AlertCircle, Clock, TrendingUp, FileText, Wallet } from 'lucide-react';
import { formatCurrency, formatDate } from '@/lib/formatters';

const IndicadorCard = ({ icon: Icon, label, valor, sublabel, variant = 'default' }) => {
  const cores = {
    default: 'bg-blue-50 border-blue-200',
    warning: 'bg-yellow-50 border-yellow-200',
    danger: 'bg-red-50 border-red-200',
    success: 'bg-green-50 border-green-200',
  };

  return (
    <div className={`border rounded-lg p-4 ${cores[variant]}`}>
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs text-muted-foreground">{label}</p>
          <p className="text-lg font-bold mt-1">{valor}</p>
          {sublabel && <p className="text-xs text-muted-foreground mt-1">{sublabel}</p>}
        </div>
        <Icon className="w-4 h-4 text-muted-foreground" />
      </div>
    </div>
  );
};

export default function Dashboard360({ funcionario, lancamentos, vales, comissoes, solicitacoes, documentos, fechamentos }) {
  const totalVales = vales.reduce((acc, v) => acc + (v.valor || 0), 0);
  const mediaComissao = comissoes.length > 0 
    ? comissoes.reduce((acc, c) => acc + (c.valor_individual_final || 0), 0) / comissoes.length 
    : 0;

  const solicitacoesPendentes = solicitacoes.filter(s => s.status === 'pendente').length;
  const documentosVencendo = documentos.filter(d => {
    // lógica de vencimento seria mais complexa
    return false;
  }).length;

  const ultimoFechamento = fechamentos.length > 0 ? fechamentos[0] : null;
  const absenteismo = funcionario.faltas_no_periodo || 0;

  return (
    <div className="space-y-4">
      {/* Cards de Indicadores */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <IndicadorCard
            icon={TrendingUp}
            label="Evolução Salarial"
            valor={formatCurrency((funcionario.salario_base || 0) + (funcionario.ajuda_custo || 0))}
            sublabel={funcionario.ajuda_custo > 0 ? `Base: ${formatCurrency(funcionario.salario_base || 0)} + Ajuda: ${formatCurrency(funcionario.ajuda_custo)}` : 'Salário base'}
          />

        <IndicadorCard
          icon={Wallet}
          label="Média de Comissão"
          valor={formatCurrency(mediaComissao)}
          sublabel={`${comissoes.length} períodos`}
          variant={mediaComissao > 0 ? 'success' : 'default'}
        />

        <IndicadorCard
          icon={Clock}
          label="Média de Vales"
          valor={formatCurrency(totalVales / Math.max(vales.length, 1))}
          sublabel={`${vales.length} saques`}
          variant={totalVales > funcionario.limite_vales ? 'warning' : 'default'}
        />

        <IndicadorCard
          icon={Users}
          label="Absenteísmo"
          valor={`${absenteismo} dias`}
          sublabel="Período atual"
          variant={absenteismo > 5 ? 'warning' : 'default'}
        />
      </div>

      {/* Cards de Alertas */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <IndicadorCard
          icon={AlertCircle}
          label="Solicitações Pendentes"
          valor={solicitacoesPendentes}
          variant={solicitacoesPendentes > 0 ? 'warning' : 'success'}
        />

        <IndicadorCard
          icon={FileText}
          label="Documentos Vencendo"
          valor={documentosVencendo}
          variant={documentosVencendo > 0 ? 'danger' : 'success'}
        />

        {ultimoFechamento && (
          <IndicadorCard
            icon={TrendingUp}
            label="Último Fechamento"
            valor={ultimoFechamento.mes_referencia}
            sublabel={`Líquido: ${formatCurrency(ultimoFechamento.salario_liquido)}`}
          />
        )}
      </div>

      {/* Resumo dos Últimos 6 Fechamentos */}
      {fechamentos.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Últimos Fechamentos</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {fechamentos.slice(0, 6).map(f => (
                <div key={f.id} className="flex justify-between items-center py-2 border-b last:border-0">
                  <span className="text-sm font-medium">{f.mes_referencia}</span>
                  <div className="text-right">
                    <p className="text-sm font-bold">{formatCurrency(f.salario_liquido)}</p>
                    <p className="text-xs text-muted-foreground">
                      Base: {formatCurrency(f.salario_base)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
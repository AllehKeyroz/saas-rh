import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { formatCurrency } from '@/lib/formatters';
import { SETOR_LABELS, formatPeriodo } from '@/lib/comissoes';
import { Users, AlertTriangle, TrendingUp, Calendar, CalendarMinus } from 'lucide-react';

function normSetorKey(setor) {
  if (!setor) return 'outros';
  const s = setor.toLowerCase();
  if (s.includes('salão') || s.includes('salao') || s.includes('garçom') || s.includes('atendimento')) return 'salao';
  if (s.includes('cozinha')) return 'cozinha';
  if (s.includes('copa') || s.includes('playground') || s.includes('caixa')) return 'copa_playground_caixa';
  if (s.includes('limpeza') || s.includes('rh')) return 'limpeza_rh';
  return setor;
}

export default function RelatorioComissoes({ funcionarios, comissoes, comissoesFuncionarios, mesRef }) {
  const comissoesMes = comissoesFuncionarios.filter(c => c.mes_referencia === mesRef);
  const comissoesPeriodosMes = comissoes.filter(c => c.mes_referencia === mesRef && c.status === 'confirmado');

  if (comissoesPeriodosMes.length === 0) {
    return <div className="text-center py-16 text-muted-foreground">Nenhuma comissão lançada para {mesRef}</div>;
  }

  const totalDistribuido = comissoesMes.filter(c => c.apto).reduce((s, c) => s + (c.valor_individual_final ?? c.valor_individual ?? 0), 0);
  const totalGorjetas = comissoesPeriodosMes.reduce((s, c) => s + (c.valor_total_periodo || 0), 0);
  const aptoCount = comissoesMes.filter(c => c.apto).length;
  const exclCount = comissoesMes.filter(c => !c.apto).length;

  // Por setor
  const setores = {};
  comissoesMes.forEach(c => {
    const sk = normSetorKey(c.setor);
    if (!setores[sk]) setores[sk] = { aptos: [], excluidos: [] };
    if (c.apto) setores[sk].aptos.push(c);
    else setores[sk].excluidos.push(c);
  });

  // Acúmulo por funcionário
  const porFunc = {};
  comissoesMes.filter(c => c.apto).forEach(c => {
    if (!porFunc[c.funcionario_id]) porFunc[c.funcionario_id] = { nome: c.funcionario_nome, total: 0, totalCheio: 0, periodos: 0, temReducao: false };
    const vFinal = c.valor_individual_final ?? c.valor_individual ?? 0;
    const vCheio = c.valor_individual_cheio ?? c.valor_individual ?? 0;
    porFunc[c.funcionario_id].total += vFinal;
    porFunc[c.funcionario_id].totalCheio += vCheio;
    porFunc[c.funcionario_id].periodos += 1;
    if (c.dias_ausentes_no_periodo > 0) porFunc[c.funcionario_id].temReducao = true;
  });

  return (
    <div className="space-y-5">
      {/* Resumo */}
      <Card>
        <CardHeader><CardTitle className="text-sm flex items-center gap-2"><TrendingUp className="w-4 h-4 text-primary" />Resumo Mensal — {mesRef}</CardTitle></CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="bg-muted/50 rounded-xl p-3"><p className="text-xs text-muted-foreground">Total Gorjetas</p><p className="text-lg font-bold">{formatCurrency(totalGorjetas)}</p></div>
            <div className="bg-blue-50 rounded-xl p-3"><p className="text-xs text-muted-foreground">Períodos</p><p className="text-lg font-bold text-blue-700">{comissoesPeriodosMes.length}</p></div>
            <div className="bg-green-50 rounded-xl p-3"><p className="text-xs text-muted-foreground">Distribuído</p><p className="text-lg font-bold text-green-700">{formatCurrency(totalDistribuido)}</p></div>
            <div className="bg-red-50 rounded-xl p-3"><p className="text-xs text-muted-foreground">Excluídos</p><p className="text-lg font-bold text-red-700">{exclCount}</p></div>
          </div>
        </CardContent>
      </Card>

      {/* Períodos do mês */}
      <Card>
        <CardHeader><CardTitle className="text-sm flex items-center gap-2"><Calendar className="w-4 h-4 text-primary" />Períodos Lançados</CardTitle></CardHeader>
        <CardContent className="space-y-2">
          {comissoesPeriodosMes.map(c => (
            <div key={c.id} className="flex items-center justify-between text-sm py-2 border-b last:border-0">
              <span className="font-medium">{formatPeriodo(c.periodo_inicio, c.periodo_fim)}</span>
              <span className="font-bold">{formatCurrency(c.valor_total_periodo)}</span>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Por setor */}
      {Object.entries(setores).map(([setor, { aptos, excluidos }]) => (
        <Card key={setor}>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center justify-between">
              <span className="flex items-center gap-2"><Users className="w-4 h-4 text-primary" />{SETOR_LABELS[setor] || setor}</span>
              <Badge variant="outline">{aptos.length} aptos</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-1">
            {/* Acúmulo por funcionário */}
            {Object.values(
              aptos.reduce((acc, c) => {
                if (!acc[c.funcionario_id]) acc[c.funcionario_id] = { nome: c.funcionario_nome, total: 0, totalCheio: 0, maxDiasAusentes: 0, diasTrabalhados: null, diasTotais: null, proporcao: null };
                acc[c.funcionario_id].total += c.valor_individual_final ?? c.valor_individual ?? 0;
                acc[c.funcionario_id].totalCheio += c.valor_individual_cheio ?? c.valor_individual ?? 0;
                acc[c.funcionario_id].maxDiasAusentes = Math.max(acc[c.funcionario_id].maxDiasAusentes, c.dias_ausentes_no_periodo || 0);
                if (c.dias_trabalhados != null) acc[c.funcionario_id].diasTrabalhados = (acc[c.funcionario_id].diasTrabalhados || 0) + c.dias_trabalhados;
                if (c.dias_totais != null) acc[c.funcionario_id].diasTotais = (acc[c.funcionario_id].diasTotais || 0) + c.dias_totais;
                return acc;
              }, {})
            ).map((f, i) => {
              const temReducao = f.maxDiasAusentes > 0;
              return (
                <div key={i} className="py-1.5 border-b last:border-0">
                  <div className="flex justify-between text-sm">
                    <span className="font-medium">{f.nome}</span>
                    <div className="text-right">
                      {temReducao && <p className="text-xs text-muted-foreground line-through">{formatCurrency(f.totalCheio)}</p>}
                      <span className={`font-bold ${temReducao ? 'text-amber-600' : 'text-green-600'}`}>{formatCurrency(f.total)}</span>
                    </div>
                  </div>
                  {temReducao && (
                    <div className="flex items-center gap-1 mt-0.5">
                      <CalendarMinus className="w-3 h-3 text-amber-500" />
                      <span className="text-xs text-amber-700">
                        {f.maxDiasAusentes} dia(s) ausente(s) · {f.diasTrabalhados}/{f.diasTotais} dias trabalhados
                      </span>
                    </div>
                  )}
                </div>
              );
            })}
            {excluidos.length > 0 && (
              <div className="bg-red-50 rounded-lg p-2 mt-1 space-y-1">
                <p className="text-xs font-semibold text-red-700 flex items-center gap-1 mb-1"><AlertTriangle className="w-3 h-3" />Excluídos</p>
                {[...new Set(excluidos.map(e => e.funcionario_id))].map(fid => {
                  const e = excluidos.find(x => x.funcionario_id === fid);
                  return (
                    <div key={fid} className="flex justify-between text-sm">
                      <span className="text-red-800">{e.funcionario_nome}</span>
                      <span className="text-xs text-red-600">{e.motivo_exclusao}</span>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      ))}

      {/* Total acumulado por funcionário */}
      {Object.keys(porFunc).length > 0 && (
        <Card>
          <CardHeader><CardTitle className="text-sm">Total Acumulado por Funcionário — {mesRef}</CardTitle></CardHeader>
          <CardContent className="space-y-1">
            {Object.values(porFunc).sort((a, b) => b.total - a.total).map((f, i) => (
              <div key={i} className="py-2 border-b last:border-0">
                <div className="flex items-center justify-between text-sm">
                  <span className="font-medium">{f.nome}</span>
                  <div className="flex items-center gap-3">
                    <span className="text-xs text-muted-foreground">{f.periodos} período(s)</span>
                    <div className="text-right">
                      {f.temReducao && <p className="text-xs text-muted-foreground line-through">{formatCurrency(f.totalCheio)}</p>}
                      <span className={`font-bold ${f.temReducao ? 'text-amber-600' : 'text-green-600'}`}>{formatCurrency(f.total)}</span>
                    </div>
                  </div>
                </div>
                {f.temReducao && (
                  <div className="flex items-center gap-1 mt-0.5">
                    <CalendarMinus className="w-3 h-3 text-amber-500" />
                    <span className="text-xs text-amber-700">Redução proporcional por dias ausentes</span>
                  </div>
                )}
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { formatCurrency } from '@/lib/formatters';
import { formatPeriodo } from '@/lib/comissoes';
import { Calendar, CheckCircle2, Eye, Trash2, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { client } from '@/api/client';
import DetalhesComissao from './DetalhesComissao';

export default function HistoricoComissoes({ comissoes, comissoesFuncionarios, funcionarios, setoresComissao, comissoesIndividual = [], onRefresh }) {
  const [detalhes, setDetalhes] = useState(null);
  const [excluindo, setExcluindo] = useState(null);
  const sorted = [...comissoes].sort((a, b) => (b.periodo_inicio || '').localeCompare(a.periodo_inicio || ''));
  const sortedIndividual = [...comissoesIndividual].sort((a, b) => (b.periodo_inicio || '').localeCompare(a.periodo_inicio || ''));

  const handleExcluirIndividual = async (c) => {
    if (!window.confirm(`Excluir esta comissão individual de ${formatPeriodo(c.periodo_inicio, c.periodo_fim)}? Esta ação não pode ser desfeita.`)) return;
    setExcluindo(c.id);
    try {
      const registros = comissoesFuncionarios.filter(cf => cf.comissao_id === c.id);
      for (const r of registros) {
        await client.entities.ComissaoPorFuncionario.delete(r.id);
      }
      await client.entities.ComissaoIndividual.delete(c.id);
      toast.success('Comissão individual excluída.');
      onRefresh?.();
    } catch (e) {
      toast.error(e?.message || 'Erro ao excluir comissão individual');
    } finally {
      setExcluindo(null);
    }
  };

  if (sorted.length === 0 && sortedIndividual.length === 0) {
    return <div className="text-center py-16 text-muted-foreground">Nenhuma comissão lançada ainda.</div>;
  }

  return (
    <>
      <div className="space-y-3">
        {sortedIndividual.map(c => {
          const registros = comissoesFuncionarios.filter(cf => cf.comissao_id === c.id);
          return (
            <Card key={c.id}>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center justify-between">
                  <span className="flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-primary" />
                    {formatPeriodo(c.periodo_inicio, c.periodo_fim)}
                    <span className="text-muted-foreground font-normal text-xs">— {c.mes_referencia}</span>
                    <Badge variant="outline" className="text-xs text-purple-700 border-purple-200">Individual</Badge>
                  </span>
                  <Badge variant="default" className="bg-green-100 text-green-700 border-0 text-xs">
                    <CheckCircle2 className="w-3 h-3 mr-1" />Confirmado
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs text-muted-foreground">Total da comissão individual</span>
                  <span className="font-bold text-purple-700">{formatCurrency(c.valor_total || 0)}</span>
                </div>
                {registros.length > 0 && (
                  <div className="space-y-1 mb-3">
                    {registros.map(r => (
                      <div key={r.id} className="flex justify-between text-sm py-1 border-b last:border-0">
                        <span>{r.funcionario_nome}</span>
                        <span className="font-semibold text-green-600">{formatCurrency(r.valor_individual_final ?? r.valor_individual ?? 0)}</span>
                      </div>
                    ))}
                  </div>
                )}
                {c.observacao && <p className="text-xs text-muted-foreground italic mb-2">"{c.observacao}"</p>}
                <Button size="sm" variant="ghost" className="text-red-600 hover:text-red-700" disabled={excluindo === c.id} onClick={() => handleExcluirIndividual(c)}>
                  {excluindo === c.id ? <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5 mr-1.5" />}
                  Excluir
                </Button>
              </CardContent>
            </Card>
          );
        })}

        {sorted.map(c => {
          const funcsComissao = comissoesFuncionarios.filter(cf => cf.comissao_id === c.id);
          const aptos = funcsComissao.filter(cf => cf.apto).length;
          const excluidos = funcsComissao.filter(cf => !cf.apto).length;
          // Setores reais (criados no app) com o total distribuído em cada um
          const porSetor = {};
          funcsComissao.filter(cf => cf.apto).forEach(cf => {
            const s = cf.setor || 'Sem setor';
            porSetor[s] = (porSetor[s] || 0) + (cf.valor_individual_final ?? cf.valor_individual ?? 0);
          });
          const setores = Object.entries(porSetor).sort((a, b) => b[1] - a[1]);
          return (
            <Card key={c.id}>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center justify-between">
                  <span className="flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-primary" />
                    {formatPeriodo(c.periodo_inicio, c.periodo_fim)}
                    <span className="text-muted-foreground font-normal text-xs">— {c.mes_referencia}</span>
                  </span>
                  <Badge variant="default" className="bg-green-100 text-green-700 border-0 text-xs">
                    <CheckCircle2 className="w-3 h-3 mr-1" />Confirmado
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 text-sm mb-3">
                  <div><p className="text-xs text-muted-foreground">Total Gorjetas</p><p className="font-bold">{formatCurrency(c.valor_total_periodo)}</p></div>
                  {setores.map(([s, v]) => (
                    <div key={s}><p className="text-xs text-muted-foreground truncate">{s}</p><p className="font-semibold">{formatCurrency(v)}</p></div>
                  ))}
                  <div><p className="text-xs text-muted-foreground">Aptos</p><p className="font-semibold text-green-600">{aptos}</p></div>
                  <div><p className="text-xs text-muted-foreground">Excluídos</p><p className="font-semibold text-red-600">{excluidos}</p></div>
                </div>
                {c.observacao && <p className="text-xs text-muted-foreground italic mb-2">"{c.observacao}"</p>}
                <Button size="sm" variant="outline" onClick={() => setDetalhes(c)}>
                  <Eye className="w-3.5 h-3.5 mr-1.5" />Ver Detalhes
                </Button>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <DetalhesComissao
        comissao={detalhes}
        comissoesFuncionarios={comissoesFuncionarios}
        funcionarios={funcionarios}
        setoresComissao={setoresComissao}
        onClose={() => setDetalhes(null)}
        onRefresh={onRefresh}
      />
    </>
  );
}
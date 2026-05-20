import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { formatCurrency } from '@/lib/formatters';
import { formatPeriodo } from '@/lib/comissoes';
import { Calendar, CheckCircle2, Eye } from 'lucide-react';
import DetalhesComissao from './DetalhesComissao';

export default function HistoricoComissoes({ comissoes, comissoesFuncionarios, funcionarios, onRefresh }) {
  const [detalhes, setDetalhes] = useState(null);
  const sorted = [...comissoes].sort((a, b) => (b.periodo_inicio || '').localeCompare(a.periodo_inicio || ''));

  if (sorted.length === 0) {
    return <div className="text-center py-16 text-muted-foreground">Nenhuma comissão lançada ainda.</div>;
  }

  return (
    <>
      <div className="space-y-3">
        {sorted.map(c => {
          const funcsComissao = comissoesFuncionarios.filter(cf => cf.comissao_id === c.id);
          const aptos = funcsComissao.filter(cf => cf.apto).length;
          const excluidos = funcsComissao.filter(cf => !cf.apto).length;
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
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm mb-3">
                  <div><p className="text-xs text-muted-foreground">Total Gorjetas</p><p className="font-bold">{formatCurrency(c.valor_total_periodo)}</p></div>
                  <div><p className="text-xs text-muted-foreground">Salão (40%)</p><p className="font-semibold">{formatCurrency(c.valor_salao)}</p></div>
                  <div><p className="text-xs text-muted-foreground">Cozinha (24%)</p><p className="font-semibold">{formatCurrency(c.valor_cozinha)}</p></div>
                  <div><p className="text-xs text-muted-foreground">Copa/PG/Cx (14%)</p><p className="font-semibold">{formatCurrency(c.valor_copa_playground_caixa)}</p></div>
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
        onClose={() => setDetalhes(null)}
        onRefresh={onRefresh}
      />
    </>
  );
}
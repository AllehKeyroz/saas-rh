import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { formatCurrency } from '@/lib/formatters';
import { formatPeriodo } from '@/lib/comissoes';
import { Users } from 'lucide-react';
import DetalheComissaoTooltip from './DetalheComissaoTooltip';
import HistoricoAlteracoesComissao from './HistoricoAlteracoesComissao';

export default function DetalhesComissao({ comissao, comissoesFuncionarios, setoresComissao = [], onClose }) {
  if (!comissao) return null;

  const registros = comissoesFuncionarios.filter(c => c.comissao_id === comissao.id);
  const aptos = registros.filter(r => r.apto);
  const excluidos = registros.filter(r => !r.apto);

  // Agrupar por setor
  const porSetor = {};
  registros.forEach(r => {
    const sk = normalizarSetorKey(r.setor);
    if (!porSetor[sk]) porSetor[sk] = { aptos: [], excluidos: [], valorSetor: r.valor_setor || 0 };
    if (r.apto) porSetor[sk].aptos.push(r);
    else porSetor[sk].excluidos.push(r);
  });

  return (
    <Dialog open={!!comissao} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Detalhes da Comissão — {formatPeriodo(comissao.periodo_inicio, comissao.periodo_fim)}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Resumo */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            <div className="bg-muted/50 rounded-xl p-3"><p className="text-xs text-muted-foreground">Total Gorjetas</p><p className="text-lg font-bold">{formatCurrency(comissao.valor_total_periodo)}</p></div>
            <div className="bg-blue-50 rounded-xl p-3"><p className="text-xs text-muted-foreground">Mês Ref.</p><p className="text-lg font-bold text-blue-700">{comissao.mes_referencia}</p></div>
            <div className="bg-green-50 rounded-xl p-3"><p className="text-xs text-muted-foreground">Aptos</p><p className="text-lg font-bold text-green-700">{aptos.length}</p></div>
            <div className="bg-red-50 rounded-xl p-3"><p className="text-xs text-muted-foreground">Excluídos</p><p className="text-lg font-bold text-red-700">{excluidos.length}</p></div>
          </div>

          {comissao.valor_empresa > 0 && (
            <div className="bg-slate-100 border border-slate-200 rounded-xl p-3 flex items-center justify-between">
              <span className="text-sm font-medium text-slate-600">Retido (Empresa){comissao.percentual_retencao ? ` — ${comissao.percentual_retencao}%` : ''}</span>
              <span className="font-bold text-slate-500">{formatCurrency(comissao.valor_empresa)}</span>
            </div>
          )}

          {/* Por setor */}
          {Object.entries(porSetor).map(([setor, { aptos: a, excluidos: e, valorSetor }]) => (
            <div key={setor} className="border rounded-xl p-3 space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-medium text-sm flex items-center gap-1.5"><Users className="w-4 h-4 text-primary" />{setor}</span>
                <span className="text-xs text-muted-foreground">{formatCurrency(valorSetor)}</span>
              </div>
              {a.map(r => (
                <div key={r.id} className="flex justify-between text-sm py-1 border-b last:border-0">
                  <span>{r.funcionario_nome}</span>
                  <DetalheComissaoTooltip
                    valorBase={r.valor_individual_cheio || r.valor_individual || 0}
                    perda={r.perda_faltas_proprias || 0}
                    bonus={r.bonus_faltas_terceiros || 0}
                    diasAusentes={r.dias_ausentes_no_periodo || 0}
                  >
                    <span className="font-semibold text-green-600">{formatCurrency(r.valor_individual)}</span>
                  </DetalheComissaoTooltip>
                </div>
              ))}
              {e.length > 0 && (
                <div className="bg-red-50 rounded-lg p-2 space-y-1">
                  {e.map(r => (
                    <div key={r.id} className="flex justify-between text-sm">
                      <span className="text-red-800">{r.funcionario_nome}</span>
                      <span className="text-xs text-red-600">{r.motivo_exclusao}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}

          {comissao.observacao && <p className="text-sm text-muted-foreground italic">"{comissao.observacao}"</p>}

          <HistoricoAlteracoesComissao comissaoId={comissao.id} />
        </div>
      </DialogContent>
    </Dialog>
  );
}

function normalizarSetorKey(setor) {
  return setor || 'outros';
}

import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { formatCurrency } from '@/lib/formatters';
import { SETOR_LABELS, formatPeriodo } from '@/lib/comissoes';
import { AlertTriangle, RefreshCw, Trash2, Users, Loader2, Edit2 } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { toast } from 'sonner';
import { registrarAuditoria } from '@/lib/audit';
import HistoricoAlteracoesComissao from './HistoricoAlteracoesComissao';
import CorrigirComissaoDialog from './CorrigirComissaoDialog';

export default function DetalhesComissao({ comissao, comissoesFuncionarios, funcionarios, onClose, onRefresh }) {
  const [loading, setLoading] = useState(false);
  const [corrigindoAberto, setCorrigindoAberto] = useState(false);

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

  const handleExcluir = async () => {
    if (!confirm('Excluir esta comissão e todos os registros associados?')) return;
    setLoading(true);
    try {
      for (const r of registros) await base44.entities.ComissaoPorFuncionario.delete(r.id);
      await base44.entities.ComissoesGorjetas.delete(comissao.id);
      await registrarAuditoria({
        acao: 'excluir', modulo: 'comissao',
        descricao: `Comissão excluída: ${comissao.periodo_inicio} a ${comissao.periodo_fim} — ${formatCurrency(comissao.valor_total_periodo)}`,
        dados_anteriores: { valor_total: comissao.valor_total_periodo },
      });
      toast.success('Comissão excluída com sucesso');
      onClose();
      onRefresh();
      } catch (e) {
      toast.error(`Erro ao excluir: ${e.message}`);
      } finally {
      setLoading(false);
      }
      };

  const handleRecalcular = async () => {
    if (!funcionarios || funcionarios.length === 0) return;
    setLoading(true);
    try {
      // Deletar registros existentes
      for (const r of registros) await base44.entities.ComissaoPorFuncionario.delete(r.id);

      // Recalcular divisão
      const v = comissao.valor_total_periodo;
      const setoresGrupos = { salao: [], cozinha: [], copa_playground_caixa: [], limpeza_rh: [] };
      funcionarios.filter(f => f.ativo !== false).forEach(f => {
        const sk = normalizarSetorKey(f.setor);
        const mapped = sk === 'outros' ? null : sk;
        if (mapped && setoresGrupos[mapped]) setoresGrupos[mapped].push(f);
      });

      const novosRegistros = [];
      const valorMap = { salao: comissao.valor_salao, cozinha: comissao.valor_cozinha, copa_playground_caixa: comissao.valor_copa_playground_caixa, limpeza_rh: comissao.valor_limpeza_rh };
      for (const [setor, funcs] of Object.entries(setoresGrupos)) {
        const aptosFuncs = funcs.filter(f => !f.faltas_no_periodo && !f.atestados_no_periodo);
        const excl = funcs.filter(f => f.faltas_no_periodo || f.atestados_no_periodo);
        const vs = valorMap[setor] || 0;
        const vi = aptosFuncs.length > 0 ? vs / aptosFuncs.length : 0;
        for (const f of aptosFuncs) {
          novosRegistros.push({ funcionario_id: f.id, funcionario_nome: f.nome, comissao_id: comissao.id, setor: f.setor || setor, periodo_inicio: comissao.periodo_inicio, periodo_fim: comissao.periodo_fim, mes_referencia: comissao.mes_referencia, valor_setor: vs, valor_individual: vi, apto: true });
        }
        for (const f of excl) {
          novosRegistros.push({ funcionario_id: f.id, funcionario_nome: f.nome, comissao_id: comissao.id, setor: f.setor || setor, periodo_inicio: comissao.periodo_inicio, periodo_fim: comissao.periodo_fim, mes_referencia: comissao.mes_referencia, valor_setor: vs, valor_individual: 0, apto: false, motivo_exclusao: f.faltas_no_periodo ? `${f.faltas_no_periodo} falta(s)` : `${f.atestados_no_periodo} atestado(s)` });
        }
      }
      if (novosRegistros.length > 0) await base44.entities.ComissaoPorFuncionario.bulkCreate(novosRegistros);

      await registrarAuditoria({
        acao: 'editar', modulo: 'comissao',
        descricao: `Comissão recalculada: ${comissao.periodo_inicio} a ${comissao.periodo_fim}`,
      });
      toast.success('Comissão recalculada com sucesso!');
      onClose();
      onRefresh();
      } catch (e) {
      toast.error(`Erro ao recalcular: ${e.message}`);
      } finally {
      setLoading(false);
      }
      };

  return (
    <>
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

          {/* Divisão setores */}
          <div className="grid grid-cols-2 gap-2 text-sm">
            {[
              { k: 'valor_empresa', label: 'Empresa (20%)', v: comissao.valor_empresa },
              { k: 'valor_salao', label: 'Salão (40%)', v: comissao.valor_salao },
              { k: 'valor_cozinha', label: 'Cozinha (24%)', v: comissao.valor_cozinha },
              { k: 'valor_copa_playground_caixa', label: 'Copa/PG/Cx (14%)', v: comissao.valor_copa_playground_caixa },
              { k: 'valor_limpeza_rh', label: 'Limpeza/RH (2%)', v: comissao.valor_limpeza_rh },
            ].map(({ k, label, v }) => (
              <div key={k} className="bg-muted/30 rounded-lg px-3 py-2">
                <p className="text-xs text-muted-foreground">{label}</p>
                <p className="font-semibold">{formatCurrency(v || 0)}</p>
              </div>
            ))}
          </div>

          {/* Por setor */}
          {Object.entries(porSetor).map(([setor, { aptos: a, excluidos: e, valorSetor }]) => (
            <div key={setor} className="border rounded-xl p-3 space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-medium text-sm flex items-center gap-1.5"><Users className="w-4 h-4 text-primary" />{SETOR_LABELS[setor] || setor}</span>
                <span className="text-xs text-muted-foreground">{formatCurrency(valorSetor)}</span>
              </div>
              {a.map(r => (
                <div key={r.id} className="flex justify-between text-sm py-1 border-b last:border-0">
                  <span>{r.funcionario_nome}</span>
                  <span className="font-semibold text-green-600">{formatCurrency(r.valor_individual)}</span>
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

          {/* Histórico de alterações */}
          <HistoricoAlteracoesComissao comissaoId={comissao.id} />

          <div className="flex gap-3 pt-2">
           <Button onClick={() => setCorrigindoAberto(true)} variant="secondary">
             <Edit2 className="w-4 h-4 mr-2" />Corrigir Valores
           </Button>
           <Button variant="outline" onClick={handleRecalcular} disabled={loading}>
             {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4 mr-2" />}Recalcular
           </Button>
           <Button variant="destructive" onClick={handleExcluir} disabled={loading}>
             <Trash2 className="w-4 h-4 mr-2" />Excluir Comissão
           </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>

    <CorrigirComissaoDialog
      aberto={corrigindoAberto}
      comissao={comissao}
      onClose={() => setCorrigindoAberto(false)}
      onRefresh={onRefresh}
    />
    </>
  );
}

function normalizarSetorKey(setor) {
  if (!setor) return 'outros';
  const s = setor.toLowerCase();
  if (s.includes('salão') || s.includes('salao') || s.includes('garçom') || s.includes('atendimento')) return 'salao';
  if (s.includes('cozinha')) return 'cozinha';
  if (s.includes('copa') || s.includes('playground') || s.includes('caixa')) return 'copa_playground_caixa';
  if (s.includes('limpeza') || s.includes('rh')) return 'limpeza_rh';
  return setor;
}
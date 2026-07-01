import React, { useState, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { formatCurrency } from '@/lib/formatters';
import { Loader2 } from 'lucide-react';
import { client } from '@/api/client';
import { toast } from 'sonner';
import { registrarAuditoria } from '@/lib/audit';

export default function CorrigirComissaoDialog({ 
  aberto, 
  comissao, 
  setoresComissao = [], 
  onClose, 
  onRefresh 
}) {
  const [loading, setLoading] = useState(false);
  const [valores, setValores] = useState({});
  const [motivo, setMotivo] = useState('');

  const totalCalculado = useMemo(() => {
    if (!valores.valor_total_periodo) return comissao?.valor_total_periodo || 0;
    return parseFloat(valores.valor_total_periodo) || comissao?.valor_total_periodo || 0;
  }, [valores, comissao]);

  // Distribuição dinâmica baseada nos setores configurados
  const distribuicao = useMemo(() => {
    const total = totalCalculado;
    const setoresAtivos = (setoresComissao || []).filter(s => s.ativo !== false);
    const retencaoPct = Number(comissao?.percentual_retencao || 0) / 100;
    const dist = { valor_empresa: total * retencaoPct };
    const valorLiquido = total - dist.valor_empresa;
    const somaPct = setoresAtivos.reduce((s, set) => s + Number(set.percentual || 0), 0);
    const norm = somaPct > 0 ? somaPct : 1;
    for (const s of setoresAtivos) {
      dist['setor_' + s.nome_do_setor] = valorLiquido * (Number(s.percentual || 0) / norm);
    }
    return dist;
  }, [totalCalculado, setoresComissao, comissao]);

  if (!comissao) return null;

  const handleChange = (field, value) => {
    setValores(prev => ({ ...prev, [field]: value }));
  };

  const handleSalvar = async () => {
    setLoading(true);
    try {
      const user = await client.auth.me();
      
      const dadosAntigos = {
        valor_total_periodo: comissao.valor_total_periodo,
        valor_empresa: comissao.valor_empresa,
      };

      const novoValorTotal = totalCalculado;
      const dadosNovos = {
        valor_total_periodo: novoValorTotal,
        ...distribuicao,
      };

      // Atualizar comissão
      await client.entities.ComissoesGorjetas.update(comissao.id, {
        valor_total_periodo: novoValorTotal,
        valor_empresa: distribuicao.valor_empresa,
      });

      // Registrar no histórico de alterações
      await client.entities.HistoricoAlteracaoComissao.create({
        comissao_id: comissao.id,
        mes_referencia: comissao.mes_referencia,
        tipo_alteracao: 'valor_total',
        campo_alterado: 'valor_total_periodo',
        valor_anterior: dadosAntigos,
        valor_novo: dadosNovos,
        usuario_email: user.email,
        usuario_nome: user.full_name,
        motivo: motivo || null,
      });

      // Recalcular ComissaoPorFuncionario
      const cfPorComissao = await client.entities.ComissaoPorFuncionario.filter({ comissao_id: comissao.id });
      const diferenca = novoValorTotal - comissao.valor_total_periodo;
      const proporcaoDiferenca = comissao.valor_total_periodo > 0 ? diferenca / comissao.valor_total_periodo : 0;

      for (const cf of cfPorComissao) {
        if (cf.apto) {
          const fator = 1 + proporcaoDiferenca;
          const novoValorFinal = (cf.valor_individual_final || cf.valor_individual || 0) * fator;
          const novoCheio = (cf.valor_individual_cheio || cf.valor_individual || 0) * fator;
          const novaPerda = (cf.perda_faltas_proprias || 0) * fator;
          const novoBonus = (cf.bonus_faltas_terceiros || 0) * fator;
          await client.entities.ComissaoPorFuncionario.update(cf.id, {
            valor_individual_cheio: novoCheio,
            valor_individual: novoValorFinal,
            valor_individual_final: novoValorFinal,
            perda_faltas_proprias: novaPerda,
            bonus_faltas_terceiros: novoBonus,
          });
        }
      }

      // Registrar auditoria geral
      await registrarAuditoria({
        acao: 'editar',
        modulo: 'comissao',
        descricao: `Comissão corrigida: ${comissao.mes_referencia} — De ${formatCurrency(comissao.valor_total_periodo)} para ${formatCurrency(novoValorTotal)}`,
        dados_anteriores: dadosAntigos,
        dados_novos: dadosNovos,
      });

      toast.success('Comissão corrigida e histórico registrado!');
      onClose();
      onRefresh();
    } catch (e) {
      toast.error(`Erro ao corrigir: ${e.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={aberto} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Corrigir Comissão — {comissao.mes_referencia}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Comparação antes/depois */}
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div className="bg-red-50 rounded-lg p-3 border border-red-200">
              <p className="text-xs font-semibold text-red-700 mb-2">Valor Atual</p>
              <p className="text-lg font-bold text-red-700">
                {formatCurrency(comissao.valor_total_periodo)}
              </p>
            </div>
            <div className="bg-green-50 rounded-lg p-3 border border-green-200">
              <p className="text-xs font-semibold text-green-700 mb-2">Novo Valor</p>
              <p className="text-lg font-bold text-green-700">
                {formatCurrency(totalCalculado)}
              </p>
            </div>
          </div>

          {/* Input de valor */}
          <div className="space-y-2">
            <Label>Valor Total de Gorjetas</Label>
            <Input
              type="number"
              step="0.01"
              placeholder={String(comissao.valor_total_periodo)}
              value={valores.valor_total_periodo || ''}
              onChange={(e) => handleChange('valor_total_periodo', e.target.value)}
              disabled={loading}
            />
          </div>

          {/* Distribuição automática */}
          <div className="bg-muted/50 rounded-lg p-3 space-y-2 text-sm">
            <p className="font-semibold text-xs">Distribuição Automática:</p>
            <div className="grid grid-cols-2 gap-2">
              {comissao?.percentual_retencao > 0 && (
                <div>
                  <span className="text-muted-foreground">Empresa ({comissao.percentual_retencao}%):</span><br/>
                  <span className="font-semibold">{formatCurrency(distribuicao.valor_empresa)}</span>
                </div>
              )}
              {setoresComissao.filter(s => s.ativo !== false).map(s => (
                <div key={s.id}>
                  <span className="text-muted-foreground">{s.nome_do_setor} ({s.percentual}%):</span><br/>
                  <span className="font-semibold">{formatCurrency(distribuicao['setor_' + s.nome_do_setor] || 0)}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Motivo */}
          <div className="space-y-2">
            <Label>Motivo da Correção</Label>
            <Textarea
              placeholder="Descreva o motivo da correção (ex: valor digitado incorretamente, gorjeta não registrada corretamente)"
              value={motivo}
              onChange={(e) => setMotivo(e.target.value)}
              disabled={loading}
              rows={3}
            />
          </div>

          {/* Botões */}
          <div className="flex gap-2 justify-end pt-4">
            <Button 
              variant="outline" 
              onClick={() => {
                setValores({});
                setMotivo('');
                onClose?.();
              }} 
              disabled={loading}
            >
              Cancelar
            </Button>
            <Button onClick={handleSalvar} disabled={loading || !valores.valor_total_periodo}>
              {loading && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
              Salvar Correção
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
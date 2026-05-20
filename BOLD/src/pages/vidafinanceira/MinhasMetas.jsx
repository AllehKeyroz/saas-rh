import React, { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Target, TrendingUp, CheckCircle2, AlertTriangle } from 'lucide-react';
import { formatCurrency, getMesReferenciaAtual, getMesesOptions } from '@/lib/formatters';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { filtrarGastosPorMes, calcularResumoMensal, calcularProgressoMeta } from '@/lib/vidaFinanceira';
import { useToast } from '@/components/ui/use-toast';

export default function MinhasMetas({ funcionarioId, salarioBase }) {
  const { toast } = useToast();
  const qc = useQueryClient();
  const mesAtual = getMesReferenciaAtual();
  const meses = getMesesOptions(12);
  const [mesSelecionado, setMesSelecionado] = useState(mesAtual);
  const [metaInput, setMetaInput] = useState('');
  const [saving, setSaving] = useState(false);

  const { data: gastos = [] } = useQuery({
    queryKey: ['gastos_pessoais', funcionarioId],
    queryFn: () => base44.entities.GastosPessoais.filter({ funcionario_id: funcionarioId }),
    enabled: !!funcionarioId,
  });

  const { data: metas = [] } = useQuery({
    queryKey: ['metas_financeiras', funcionarioId],
    queryFn: () => base44.entities.MetaFinanceira.filter({ funcionario_id: funcionarioId }),
    enabled: !!funcionarioId,
  });

  const metaMes = metas.find(m => m.mes_referencia === mesSelecionado);
  const salario = salarioBase || metaMes?.salario_pessoal || 0;
  const gastosMes = filtrarGastosPorMes(gastos, mesSelecionado);
  const { saldoPessoal } = calcularResumoMensal(gastosMes, salario);
  const progresso = calcularProgressoMeta(saldoPessoal, metaMes?.meta_mensal);

  const handleSalvarMeta = async () => {
    const v = parseFloat(metaInput);
    if (isNaN(v) || v <= 0) {
      toast({ title: 'Informe uma meta válida', variant: 'destructive' });
      return;
    }
    setSaving(true);
    if (metaMes) {
      await base44.entities.MetaFinanceira.update(metaMes.id, { meta_mensal: v });
    } else {
      await base44.entities.MetaFinanceira.create({ funcionario_id: funcionarioId, mes_referencia: mesSelecionado, meta_mensal: v });
    }
    qc.invalidateQueries({ queryKey: ['metas_financeiras'] });
    setSaving(false);
    setMetaInput('');
    toast({ title: 'Meta salva com sucesso!' });
  };

  return (
    <div className="space-y-4">
      <div className="flex gap-2 items-center">
        <Select value={mesSelecionado} onValueChange={setMesSelecionado}>
          <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
          <SelectContent>
            {meses.map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {/* Definir meta */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <Target className="w-4 h-4 text-primary" />
            Meta de Economia — {mesSelecionado}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {metaMes?.meta_mensal && (
            <div className="flex items-center justify-between bg-primary/5 rounded-lg px-4 py-3">
              <span className="text-sm text-muted-foreground">Meta atual</span>
              <span className="text-lg font-bold text-primary">{formatCurrency(metaMes.meta_mensal)}</span>
            </div>
          )}
          <div className="flex gap-2">
            <Input
              type="number"
              min="0"
              step="0.01"
              placeholder={metaMes?.meta_mensal ? 'Nova meta...' : 'Definir meta de economia...'}
              value={metaInput}
              onChange={e => setMetaInput(e.target.value)}
              className="flex-1"
            />
            <Button onClick={handleSalvarMeta} disabled={saving}>
              {saving ? 'Salvando...' : metaMes?.meta_mensal ? 'Atualizar' : 'Definir'}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Progresso */}
      {metaMes?.meta_mensal && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-primary" />
              Progresso da Meta
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-muted rounded-xl p-3 text-center">
                <p className="text-xs text-muted-foreground">Meta</p>
                <p className="font-bold text-primary">{formatCurrency(metaMes.meta_mensal)}</p>
              </div>
              <div className={`rounded-xl p-3 text-center ${saldoPessoal >= 0 ? 'bg-green-50' : 'bg-red-50'}`}>
                <p className="text-xs text-muted-foreground">Economia Real</p>
                <p className={`font-bold ${saldoPessoal >= 0 ? 'text-green-700' : 'text-red-700'}`}>{formatCurrency(saldoPessoal)}</p>
              </div>
            </div>

            {progresso !== null && (
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Progresso</span>
                  <span className={`font-bold ${progresso >= 100 ? 'text-green-600' : progresso >= 0 ? 'text-primary' : 'text-red-600'}`}>
                    {progresso.toFixed(0)}%
                  </span>
                </div>
                <div className="w-full h-3 rounded-full bg-muted overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all ${progresso >= 100 ? 'bg-green-500' : progresso >= 50 ? 'bg-primary' : 'bg-orange-500'}`}
                    style={{ width: `${Math.min(Math.max(progresso, 0), 100)}%` }}
                  />
                </div>
              </div>
            )}

            {progresso !== null && (
              <div className={`flex items-center gap-3 rounded-xl px-4 py-3 ${progresso >= 100 ? 'bg-green-50 border border-green-200' : saldoPessoal < 0 ? 'bg-red-50 border border-red-200' : 'bg-blue-50 border border-blue-200'}`}>
                {progresso >= 100 ? (
                  <CheckCircle2 className="w-5 h-5 text-green-600 shrink-0" />
                ) : (
                  <AlertTriangle className="w-5 h-5 text-orange-500 shrink-0" />
                )}
                <p className={`text-sm font-medium ${progresso >= 100 ? 'text-green-700' : saldoPessoal < 0 ? 'text-red-700' : 'text-blue-700'}`}>
                  {progresso >= 100
                    ? 'Parabéns! Você atingiu sua meta! 🎉'
                    : saldoPessoal < 0
                    ? 'Seus gastos ultrapassaram o salário. Revise as despesas.'
                    : `Faltam ${formatCurrency(metaMes.meta_mensal - saldoPessoal)} para atingir a meta.`}
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
import React, { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { client } from '@/api/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { DIVISAO_DEFAULT } from '@/lib/comissoes';
import { Percent, Save, RotateCcw, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

const CHAVE_PERCENTUAIS = 'percentuais_comissao';

const CAMPOS = [
  { key: 'empresa', label: 'Empresa' },
  { key: 'salao', label: 'Salão' },
  { key: 'cozinha', label: 'Cozinha' },
  { key: 'copa_playground_caixa', label: 'Copa / Playground / Caixa' },
  { key: 'limpeza_rh', label: 'Limpeza / RH' },
];

export default function PercentuaisComissaoTab() {
  const queryClient = useQueryClient();
  const [saving, setSaving] = useState(false);

  const { data: configs = [] } = useQuery({
    queryKey: ['config_percentuais'],
    queryFn: () => client.entities.ConfiguracoesRH.filter({ chave: CHAVE_PERCENTUAIS }),
  });

  const config = configs[0];
  const [percentuais, setPercentuais] = useState(config?.valor || DIVISAO_DEFAULT);

  const total = Object.values(percentuais).reduce((s, v) => s + (parseFloat(v) || 0), 0);
  const valido = Math.abs(total - 1.0) < 0.001;

  const handleSalvar = async () => {
    if (!valido) {
      toast.error(`Total deve ser 100%. Atual: ${(total * 100).toFixed(1)}%`);
      return;
    }
    setSaving(true);
    try {
      if (config) {
        await client.entities.ConfiguracoesRH.update(config.id, { valor: percentuais });
      } else {
        await client.entities.ConfiguracoesRH.create({
          chave: CHAVE_PERCENTUAIS,
          descricao: 'Percentuais de divisão de comissão por setor',
          valor: percentuais,
          ativa: true,
        });
      }
      queryClient.invalidateQueries({ queryKey: ['config_percentuais'] });
      toast.success('Percentuais salvos com sucesso!');
    } catch (e) {
      toast.error(e.message || 'Erro ao salvar');
    } finally {
      setSaving(false);
    }
  };

  const handleReset = async () => {
    setPercentuais(DIVISAO_DEFAULT);
    if (config) {
      try {
        await client.entities.ConfiguracoesRH.update(config.id, { valor: DIVISAO_DEFAULT });
        queryClient.invalidateQueries({ queryKey: ['config_percentuais'] });
        toast.success('Percentuais redefinidos para o padrão');
      } catch (e) {
        toast.error(e.message || 'Erro ao redefinir');
      }
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <Percent className="w-4 h-4 text-primary" />
          Percentuais de Divisão por Setor
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground">
          Define como o valor total das gorjetas é dividido. A soma deve ser exatamente 100%.
          Os valores são salvos no banco e compartilhados com toda a equipe.
        </p>
        <div className="space-y-3">
          {CAMPOS.map(({ key, label }) => (
            <div key={key} className="flex items-center gap-3">
              <Label className="w-48 shrink-0 text-sm">{label}</Label>
              <div className="flex items-center gap-2">
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  max="1"
                  value={percentuais[key] || 0}
                  onChange={e => setPercentuais(p => ({ ...p, [key]: parseFloat(e.target.value) || 0 }))}
                  className="w-24"
                />
                <span className="text-sm text-muted-foreground w-12">
                  = {((parseFloat(percentuais[key]) || 0) * 100).toFixed(0)}%
                </span>
              </div>
            </div>
          ))}
        </div>
        <div className={`text-sm font-medium ${valido ? 'text-green-600' : 'text-red-600'}`}>
          Total: {(total * 100).toFixed(1)}% {valido ? '✓' : '— deve ser 100%'}
        </div>
        <div className="flex gap-3">
          <Button onClick={handleSalvar} disabled={!valido || saving}>
            {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            <Save className="w-4 h-4 mr-2" />Salvar
          </Button>
          <Button variant="outline" onClick={handleReset}>
            <RotateCcw className="w-4 h-4 mr-2" />Redefinir Padrão
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

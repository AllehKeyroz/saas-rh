import React, { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Save, Wallet, Info, Loader2 } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';

const CHAVE = 'limite_vale_tipos';

const TIPOS_DISPONIVEIS = [
  { key: 'vale', label: 'Vale', descricao: 'Vale comum solicitado pelo funcionário' },
  { key: 'vale_parcelado', label: 'Vale Parcelado', descricao: 'Vale dividido em parcelas mensais' },
  { key: 'adiantamento', label: 'Adiantamento', descricao: 'Adiantamento de salário' },
  { key: 'convenio', label: 'Convênio', descricao: 'Descontos de convênios (farmácia, plano, etc.)' },
  { key: 'consumo', label: 'Consumo', descricao: 'Consumo interno (cantina, refeição, etc.)' },
  { key: 'credito_consignado', label: 'Crédito Consignado', descricao: 'Empréstimos consignados em folha' },
];

// Tipos padrão (legado — o que o portal usa se não houver config salva)
const TIPOS_PADRAO = ['vale', 'adiantamento', 'convenio', 'consumo', 'credito_consignado'];

export default function LimiteValesTab() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [saving, setSaving] = useState(false);

  const { data: configs = [], isLoading } = useQuery({
    queryKey: ['config_rh_limite_vale'],
    queryFn: () => base44.entities.ConfiguracoesRH.filter({ chave: CHAVE }),
  });

  const configAtual = configs[0];
  const tiposSalvos = configAtual?.ativa
    ? (configAtual?.descricao ? JSON.parse(configAtual.descricao) : TIPOS_PADRAO)
    : TIPOS_PADRAO;

  const [selecionados, setSelecionados] = useState(null);
  const tipos = selecionados ?? tiposSalvos;

  const toggle = (key) => {
    setSelecionados(prev => {
      const base = prev ?? tiposSalvos;
      return base.includes(key) ? base.filter(k => k !== key) : [...base, key];
    });
  };

  const handleSalvar = async () => {
    if (tipos.length === 0) {
      toast({ title: 'Selecione ao menos um tipo de desconto.', variant: 'destructive' });
      return;
    }
    setSaving(true);
    const payload = {
      chave: CHAVE,
      descricao: JSON.stringify(tipos),
      ativa: true,
      data_ativacao: new Date().toISOString(),
    };
    if (configAtual) {
      await base44.entities.ConfiguracoesRH.update(configAtual.id, payload);
    } else {
      await base44.entities.ConfiguracoesRH.create(payload);
    }
    setSaving(false);
    queryClient.invalidateQueries({ queryKey: ['config_rh_limite_vale'] });
    toast({ title: 'Configuração salva com sucesso!' });
  };

  if (isLoading) {
    return <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>;
  }

  return (
    <div className="space-y-5">
      {/* Info */}
      <div className="flex items-start gap-3 bg-blue-50 border border-blue-200 rounded-xl px-4 py-3">
        <Info className="w-5 h-5 text-blue-500 mt-0.5 shrink-0" />
        <div className="text-sm text-blue-700">
          <p className="font-semibold mb-0.5">Regra dos 40% do salário</p>
          <p>Selecione quais tipos de desconto devem ser somados para verificar se o funcionário atingiu o limite de <strong>40%</strong> do salário base. Essa configuração afeta o alerta no portal do funcionário e a validação ao lançar novos descontos.</p>
        </div>
      </div>

      {/* Checkboxes */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <Wallet className="w-4 h-4 text-primary" />
            Tipos de Desconto que Compõem o Limite
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {TIPOS_DISPONIVEIS.map(({ key, label, descricao }) => (
            <div
              key={key}
              className={`flex items-start gap-3 rounded-lg border px-4 py-3 cursor-pointer transition-colors ${tipos.includes(key) ? 'bg-primary/5 border-primary/30' : 'bg-card hover:bg-muted/40'}`}
              onClick={() => toggle(key)}
            >
              <Checkbox
                id={key}
                checked={tipos.includes(key)}
                onCheckedChange={() => toggle(key)}
                className="mt-0.5"
              />
              <div className="flex-1">
                <Label htmlFor={key} className="font-semibold text-sm cursor-pointer">{label}</Label>
                <p className="text-xs text-muted-foreground mt-0.5">{descricao}</p>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Resumo */}
      <div className="text-sm text-muted-foreground">
        <span className="font-medium text-foreground">{tipos.length}</span> tipo(s) selecionado(s): {tipos.map(k => TIPOS_DISPONIVEIS.find(t => t.key === k)?.label).filter(Boolean).join(', ') || '—'}
      </div>

      <Button onClick={handleSalvar} disabled={saving}>
        {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
        Salvar Configuração
      </Button>
    </div>
  );
}
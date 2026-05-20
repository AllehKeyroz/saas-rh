import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { DIVISAO_DEFAULT } from '@/lib/comissoes';
import { Percent, Save, RotateCcw } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';

const STORAGE_KEY = 'comissoes_percentuais';

const CAMPOS = [
  { key: 'empresa', label: 'Empresa' },
  { key: 'salao', label: 'Salão' },
  { key: 'cozinha', label: 'Cozinha' },
  { key: 'copa_playground_caixa', label: 'Copa / Playground / Caixa' },
  { key: 'limpeza_rh', label: 'Limpeza / RH' },
];

function carregarPercentuais() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) return JSON.parse(saved);
  } catch {}
  return DIVISAO_DEFAULT;
}

export default function PercentuaisComissaoTab() {
  const { toast } = useToast();
  const [percentuais, setPercentuais] = useState(carregarPercentuais);

  const total = Object.values(percentuais).reduce((s, v) => s + (parseFloat(v) || 0), 0);
  const valido = Math.abs(total - 1.0) < 0.001;

  const handleSalvar = () => {
    if (!valido) {
      toast({ title: `Total deve ser 100%. Atual: ${(total * 100).toFixed(1)}%`, variant: 'destructive' });
      return;
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(percentuais));
    toast({ title: 'Percentuais salvos com sucesso!' });
  };

  const handleReset = () => {
    setPercentuais(DIVISAO_DEFAULT);
    localStorage.removeItem(STORAGE_KEY);
    toast({ title: 'Percentuais redefinidos para o padrão' });
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
          <Button onClick={handleSalvar} disabled={!valido}>
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
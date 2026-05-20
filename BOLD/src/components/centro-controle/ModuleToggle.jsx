import React, { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Info } from 'lucide-react';

const modules = [
  {
    id: 'vida-financeira',
    name: 'Vida Financeira',
    description: 'Acesso dos colaboradores ao controle financeiro pessoal',
    icon: '💰',
    recommended: true
  },
  {
    id: 'vales',
    name: 'Sistema de Vales',
    description: 'Controle de solicitação e limite de vales',
    icon: '💳',
    recommended: true
  },
  {
    id: 'ferias',
    name: 'Gestão de Férias',
    description: 'Solicitação e controle de períodos de férias',
    icon: '🏖️',
    recommended: true
  },
  {
    id: 'banco-horas',
    name: 'Banco de Horas',
    description: 'Registro e controle de horas extras',
    icon: '⏰',
    recommended: false
  },
  {
    id: 'comissoes',
    name: 'Gestão de Comissões',
    description: 'Visualização de comissões e histórico',
    icon: '🏆',
    recommended: true
  },
  {
    id: 'metas',
    name: 'Metas Financeiras',
    description: 'Estabelecimento e acompanhamento de metas',
    icon: '🎯',
    recommended: false
  }
];

export default function ModuleToggle() {
  const [activeModules, setActiveModules] = useState(
    modules.map(m => ({ ...m, active: m.recommended }))
  );

  const handleToggle = (id) => {
    setActiveModules(activeModules.map(m =>
      m.id === id ? { ...m, active: !m.active } : m
    ));
  };

  return (
    <div className="space-y-3">
      {activeModules.map(module => (
        <Card key={module.id} className="hover:shadow-sm transition-shadow">
          <CardContent className="p-4">
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-start gap-3 flex-1">
                <span className="text-2xl">{module.icon}</span>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <Label className="text-sm font-semibold text-foreground cursor-pointer">
                      {module.name}
                    </Label>
                    {module.recommended && (
                      <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full">
                        Recomendado
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground mb-2">{module.description}</p>
                </div>
              </div>
              <Switch
                checked={module.active}
                onCheckedChange={() => handleToggle(module.id)}
                className="mt-1"
              />
            </div>
          </CardContent>
        </Card>
      ))}

      {/* Info Box */}
      <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg flex gap-3">
        <Info className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
        <div className="text-xs text-blue-900">
          <p className="font-semibold mb-1">Dica</p>
          <p>Desativar um módulo não apaga dados já coletados. Use para simplificar a experiência dos colaboradores.</p>
        </div>
      </div>
    </div>
  );
}
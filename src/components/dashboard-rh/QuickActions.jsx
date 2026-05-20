import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  AlertCircle, MessageSquare, ClipboardList, Calculator,
  Award, Sliders, User, Plus
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const getActions = (navigate) => [
  {
    icon: AlertCircle,
    label: 'Advertência',
    color: 'bg-red-100 text-red-600',
    action: () => {
      try {
        navigate('/advertencias');
      } catch (e) {
        console.error('[QuickActions] Erro ao navegar:', e);
      }
    }
  },
  {
    icon: MessageSquare,
    label: 'Enviar Mensagem',
    color: 'bg-blue-100 text-blue-600',
    action: () => {
      try {
        navigate('/comunicacao');
      } catch (e) {
        console.error('[QuickActions] Erro ao navegar:', e);
      }
    }
  },
  {
    icon: ClipboardList,
    label: 'Solicitações',
    color: 'bg-purple-100 text-purple-600',
    action: () => {
      try {
        navigate('/solicitacoes');
      } catch (e) {
        console.error('[QuickActions] Erro ao navegar:', e);
      }
    }
  },
  {
    icon: Calculator,
    label: 'Fechamento',
    color: 'bg-green-100 text-green-600',
    action: () => {
      try {
        navigate('/fechamento');
      } catch (e) {
        console.error('[QuickActions] Erro ao navegar:', e);
      }
    }
  },
  {
    icon: Award,
    label: 'Comissões',
    color: 'bg-orange-100 text-orange-600',
    action: () => {
      try {
        navigate('/comissoes');
      } catch (e) {
        console.error('[QuickActions] Erro ao navegar:', e);
      }
    }
  },
  {
    icon: Sliders,
    label: 'Centro de Controle',
    color: 'bg-indigo-100 text-indigo-600',
    action: () => {
      try {
        navigate('/centro-controle-rh');
      } catch (e) {
        console.error('[QuickActions] Erro ao navegar:', e);
      }
    }
  }
];

export default function QuickActions() {
  const navigate = useNavigate();
  const actions = getActions(navigate);

  return (
    <Card className="mb-6">
      <CardContent className="p-6">
        <h3 className="font-semibold text-foreground mb-4">Ações Rápidas</h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {actions.map((action, idx) => {
            const Icon = action.icon;
            return (
              <Button
                key={idx}
                variant="ghost"
                className="h-auto flex flex-col items-center gap-2 py-4 hover:bg-accent rounded-lg transition-colors"
                onClick={action.action}
              >
                <div className={`w-10 h-10 rounded-lg ${action.color} flex items-center justify-center`}>
                  <Icon className="w-5 h-5" />
                </div>
                <span className="text-xs text-center text-muted-foreground">{action.label}</span>
              </Button>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
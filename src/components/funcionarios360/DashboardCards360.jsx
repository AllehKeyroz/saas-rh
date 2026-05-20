import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { TrendingDown, AlertCircle, Calendar, DollarSign, FileText, Clock } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function DashboardCards360({ funcionario, stats = {} }) {
  const cards = [
    {
      title: 'Absenteísmo',
      value: stats.absenteismo || '0%',
      icon: TrendingDown,
      color: stats.absenteismo > 10 ? 'red' : 'green'
    },
    {
      title: 'Comissão Média',
      value: stats.comissaoMedia || 'R$ 0,00',
      icon: DollarSign,
      color: 'green'
    },
    {
      title: 'Vales no Mês',
      value: stats.valesMes || 'R$ 0,00',
      icon: AlertCircle,
      color: stats.valesMes > funcionario.limite_vales ? 'red' : 'blue'
    },
    {
      title: 'Férias Vencidas',
      value: stats.feriasVencidas || '0 dias',
      icon: Calendar,
      color: stats.feriasVencidas > 0 ? 'red' : 'green'
    },
    {
      title: 'Documentos Vencendo',
      value: stats.docsVencendo || '0',
      icon: FileText,
      color: stats.docsVencendo > 0 ? 'orange' : 'green'
    },
    {
      title: 'Banco de Horas',
      value: stats.bancoHoras || '0h',
      icon: Clock,
      color: stats.bancoHoras < 0 ? 'red' : 'green'
    }
  ];

  const colorMap = {
    red: 'bg-red-50 border-red-200 text-red-600',
    green: 'bg-green-50 border-green-200 text-green-600',
    blue: 'bg-blue-50 border-blue-200 text-blue-600',
    orange: 'bg-orange-50 border-orange-200 text-orange-600'
  };

  const iconColorMap = {
    red: 'bg-red-100 text-red-600',
    green: 'bg-green-100 text-green-600',
    blue: 'bg-blue-100 text-blue-600',
    orange: 'bg-orange-100 text-orange-600'
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
      {cards.map((card, idx) => {
        const Icon = card.icon;
        return (
          <Card key={idx} className={cn("border-l-4", colorMap[card.color])}>
            <CardContent className="p-4">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <p className="text-xs font-medium text-muted-foreground mb-1">{card.title}</p>
                  <p className="text-2xl font-bold text-foreground">{card.value}</p>
                </div>
                <div className={cn("w-10 h-10 rounded-lg flex items-center justify-center", iconColorMap[card.color])}>
                  <Icon className="w-5 h-5" />
                </div>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
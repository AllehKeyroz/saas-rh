import React from 'react';
import { Card } from '@/components/ui/card';
import {
  FileText, DollarSign, Award, AlertCircle, Calendar,
  Users, Clock, CheckCircle2
} from 'lucide-react';
import { cn } from '@/lib/utils';

const timelineEvents = [
  {
    date: '2024-01-15',
    type: 'admission',
    title: 'Admissão',
    description: 'Funcionário admitido como Garçom',
    icon: Users,
    color: 'bg-green-100 text-green-600'
  },
  {
    date: '2024-02-20',
    type: 'document',
    title: 'Documentos Enviados',
    description: '3 documentos enviados para análise',
    icon: FileText,
    color: 'bg-blue-100 text-blue-600'
  },
  {
    date: '2024-03-10',
    type: 'commission',
    title: 'Comissão Recebida',
    description: 'Comissão de R$ 1.500,00 creditada',
    icon: Award,
    color: 'bg-purple-100 text-purple-600'
  },
  {
    date: '2024-04-05',
    type: 'warning',
    title: 'Advertência',
    description: 'Advertência por atraso repetido',
    icon: AlertCircle,
    color: 'bg-red-100 text-red-600'
  },
  {
    date: '2024-05-01',
    type: 'vacation',
    title: 'Férias Aprovadas',
    description: 'Período de férias de 15 dias aprovado',
    icon: Calendar,
    color: 'bg-orange-100 text-orange-600'
  },
  {
    date: '2024-05-30',
    type: 'closing',
    title: 'Fechamento Mensal',
    description: 'Folha processada com sucesso',
    icon: CheckCircle2,
    color: 'bg-green-100 text-green-600'
  }
];

export default function TimelineView360() {
  const sorted = [...timelineEvents].sort((a, b) => new Date(b.date) - new Date(a.date));

  return (
    <div className="space-y-4">
      {sorted.map((event, idx) => {
        const Icon = event.icon;
        const isFirst = idx === 0;
        const isLast = idx === sorted.length - 1;

        return (
          <div key={idx} className="flex gap-4">
            {/* Timeline line */}
            <div className="flex flex-col items-center">
              <div className={cn("w-10 h-10 rounded-full flex items-center justify-center", event.color)}>
                <Icon className="w-5 h-5" />
              </div>
              {!isLast && (
                <div className="w-0.5 h-16 bg-border mt-2"></div>
              )}
            </div>

            {/* Content */}
            <Card className="flex-1 p-4 hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between mb-2">
                <div>
                  <h3 className="font-semibold text-foreground">{event.title}</h3>
                  <p className="text-sm text-muted-foreground mt-1">{event.description}</p>
                </div>
                <span className="text-xs text-muted-foreground whitespace-nowrap ml-2">
                  {new Date(event.date).toLocaleDateString('pt-BR')}
                </span>
              </div>
            </Card>
          </div>
        );
      })}
    </div>
  );
}
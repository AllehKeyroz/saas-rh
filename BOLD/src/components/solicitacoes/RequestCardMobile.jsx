import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ChevronRight, Clock, CheckCircle2, XCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

const typeColors = {
  ferias: { bg: 'bg-blue-50', text: 'text-blue-600', label: '🏖️ Férias' },
  vale: { bg: 'bg-purple-50', text: 'text-purple-600', label: '💳 Vale' },
  banco_horas: { bg: 'bg-orange-50', text: 'text-orange-600', label: '⏰ Banco de Horas' },
  atestado: { bg: 'bg-red-50', text: 'text-red-600', label: '🏥 Atestado' },
  documento: { bg: 'bg-green-50', text: 'text-green-600', label: '📄 Documento' },
  outro: { bg: 'bg-gray-50', text: 'text-gray-600', label: '📋 Outro' }
};

const statusIcons = {
  pendente: <Clock className="w-4 h-4 text-orange-600" />,
  aprovado: <CheckCircle2 className="w-4 h-4 text-green-600" />,
  recusado: <XCircle className="w-4 h-4 text-red-600" />
};

export default function RequestCardMobile({ request, onRespond }) {
  const typeColor = typeColors[request.tipo_solicitacao] || typeColors.outro;

  return (
    <Card className={cn("mb-3", typeColor.bg)}>
      <CardContent className="p-4">
        <div className="flex items-start justify-between mb-3">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <span className={cn("text-xs font-semibold px-2 py-1 rounded-full", typeColor.text)}>
                {typeColor.label}
              </span>
              <span className="text-xs text-muted-foreground">
                {new Date(request.created_date).toLocaleDateString('pt-BR')}
              </span>
            </div>
            <h3 className="font-semibold text-foreground mb-1">
              {request.funcionario_nome}
            </h3>
            <p className="text-sm text-muted-foreground line-clamp-2">
              {request.descricao || 'Sem descrição'}
            </p>
          </div>
          <div className="flex items-center gap-2 ml-2">
            {statusIcons[request.status]}
            <span className="text-xs font-medium text-foreground">
              {request.status === 'pendente' ? 'Pendente' : 
               request.status === 'aprovado' ? 'Aprovada' : 'Recusada'}
            </span>
          </div>
        </div>

        {/* SLA Badge */}
        {request.status === 'pendente' && (
          <div className="mb-3 p-2 bg-white/50 rounded text-xs text-muted-foreground">
            SLA: 3 dias restantes
          </div>
        )}

        {/* Action buttons */}
        {request.status === 'pendente' && (
          <div className="flex gap-2">
            <Button
              size="sm"
              variant="default"
              className="flex-1"
              onClick={() => onRespond?.(request.id, 'approved')}
            >
              Aprovar
            </Button>
            <Button
              size="sm"
              variant="destructive"
              className="flex-1"
              onClick={() => onRespond?.(request.id, 'rejected')}
            >
              Recusar
            </Button>
          </div>
        )}

        {request.status !== 'pendente' && (
          <Button
            size="sm"
            variant="outline"
            className="w-full"
            onClick={() => onRespond?.(request.id)}
          >
            Ver Detalhes
            <ChevronRight className="w-4 h-4 ml-2" />
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
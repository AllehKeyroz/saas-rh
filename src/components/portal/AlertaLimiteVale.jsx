import React, { useState } from 'react';
import { AlertTriangle, Info, X, ChevronRight } from 'lucide-react';
import { formatCurrency } from '@/lib/formatters';

export default function AlertaLimiteVale({ totalValesMes, limite, onVerDetalhes }) {
  const [dispensado, setDispensado] = useState(false);

  if (!limite || dispensado) return null;

  const percentual = (totalValesMes / limite) * 100;

  if (percentual < 50) return null;

  const config = percentual >= 100
    ? {
        bg: 'bg-red-50 border-red-200',
        icon: <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5 text-red-500" />,
        textColor: 'text-red-700',
        msg: `Limite de vales atingido! Você utilizou ${formatCurrency(totalValesMes)} de ${formatCurrency(limite)}.`,
      }
    : percentual >= 80
    ? {
        bg: 'bg-yellow-50 border-yellow-200',
        icon: <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5 text-yellow-600" />,
        textColor: 'text-yellow-700',
        msg: `Atenção: ${percentual.toFixed(0)}% do limite utilizado (${formatCurrency(totalValesMes)} de ${formatCurrency(limite)}).`,
      }
    : {
        bg: 'bg-blue-50 border-blue-200',
        icon: <Info className="w-5 h-5 shrink-0 mt-0.5 text-blue-500" />,
        textColor: 'text-blue-700',
        msg: `${percentual.toFixed(0)}% do limite de vales utilizado (${formatCurrency(totalValesMes)} de ${formatCurrency(limite)}).`,
      };

  return (
    <div className={`flex items-start gap-3 rounded-xl px-4 py-3 border ${config.bg}`}>
      {config.icon}
      <div className="flex-1 min-w-0">
        <p className={`text-sm font-medium ${config.textColor}`}>{config.msg}</p>
        <button
          onClick={onVerDetalhes}
          className={`mt-1 flex items-center gap-1 text-xs font-semibold underline-offset-2 hover:underline ${config.textColor}`}
        >
          Ver Detalhes <ChevronRight className="w-3 h-3" />
        </button>
      </div>
      <button
        onClick={() => setDispensado(true)}
        className={`${config.textColor} opacity-60 hover:opacity-100 transition-opacity shrink-0 p-2`}
        aria-label="Dispensar"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
}
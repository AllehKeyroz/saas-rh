import React from 'react';
import { AlertTriangle, TrendingDown, TrendingUp, CheckCircle2 } from 'lucide-react';

export default function AlertaFinanceiro({ alerta, progresso, metaMensal }) {
  const alerts = [];

  if (alerta) {
    const configs = {
      vermelho: { bg: 'bg-red-50 border-red-300', text: 'text-red-700', icon: TrendingDown },
      laranja: { bg: 'bg-orange-50 border-orange-300', text: 'text-orange-700', icon: AlertTriangle },
      amarelo: { bg: 'bg-yellow-50 border-yellow-300', text: 'text-yellow-700', icon: AlertTriangle },
    };
    const c = configs[alerta.nivel];
    if (c) {
      alerts.push({ ...c, msg: alerta.msg });
    }
  }

  if (progresso !== null && progresso !== undefined) {
    if (progresso >= 100) {
      alerts.push({
        bg: 'bg-green-50 border-green-300',
        text: 'text-green-700',
        icon: CheckCircle2,
        msg: 'Parabéns! Você atingiu sua meta de economia! 🎉',
      });
    } else if (progresso < 50 && progresso >= 0) {
      alerts.push({
        bg: 'bg-blue-50 border-blue-300',
        text: 'text-blue-700',
        icon: TrendingUp,
        msg: `Você está a ${(100 - progresso).toFixed(0)}% de atingir sua meta mensal.`,
      });
    }
  }

  if (alerts.length === 0) return null;

  return (
    <div className="space-y-2">
      {alerts.map((a, i) => (
        <div key={i} className={`flex items-start gap-3 border rounded-xl px-4 py-3 ${a.bg}`}>
          <a.icon className={`w-4 h-4 mt-0.5 shrink-0 ${a.text}`} />
          <p className={`text-sm font-medium ${a.text}`}>{a.msg}</p>
        </div>
      ))}
    </div>
  );
}
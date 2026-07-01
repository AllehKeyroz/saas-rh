import React from 'react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { formatCurrency } from '@/lib/formatters';

export default function DetalheComissaoTooltip({ children, valorBase, perda, bonus, diasAusentes, contribuicoes = [] }) {
  if (!contribuicoes?.length && !perda && !bonus) {
    return <>{children}</>;
  }

  const valorFinal = valorBase - perda + bonus;

  return (
    <TooltipProvider delayDuration={300}>
      <Tooltip>
        <TooltipTrigger asChild>{children}</TooltipTrigger>
        <TooltipContent side="left" align="center" className="text-xs space-y-0.5 p-3 min-w-[200px]">
          <div className="font-semibold border-b pb-1 mb-1">Detalhamento</div>
          <div className="flex justify-between gap-4">
            <span>Cota base</span>
            <span>{formatCurrency(valorBase)}</span>
          </div>
          {perda > 0 && (
            <div className="flex justify-between gap-4 text-red-300">
              <span>— Faltas próprias ({diasAusentes}d)</span>
              <span>-{formatCurrency(perda)}</span>
            </div>
          )}
          {bonus > 0 && contribuicoes.length > 0 && (
            <>
              <div className="border-t pt-1 mt-1 text-green-300 text-[10px] uppercase tracking-wide font-semibold">
                + Bônus de faltas de terceiros
              </div>
              {contribuicoes.map((c, i) => (
                <div key={i} className="flex justify-between gap-4 text-green-300 pl-2">
                  <span className="truncate max-w-[160px]">{c.nome} ({c.diasAusentes}d)</span>
                  <span>+{formatCurrency(c.bonusGeradoPorPessoa)}</span>
                </div>
              ))}
            </>
          )}
          {bonus > 0 && !contribuicoes.length && (
            <div className="flex justify-between gap-4 text-green-300">
              <span>+ Bônus faltas terceiros</span>
              <span>+{formatCurrency(bonus)}</span>
            </div>
          )}
          <div className="flex justify-between gap-4 font-semibold border-t pt-1 mt-1">
            <span>Valor final</span>
            <span>{formatCurrency(valorFinal)}</span>
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

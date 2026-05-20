import React from 'react';
import { Lock } from 'lucide-react';

/**
 * Exibe aviso quando uma funcionalidade está desativada no Centro de Controle.
 * Props:
 *   nome: string — nome da funcionalidade
 *   compact: bool — versão menor (para inline)
 */
export default function FuncionalidadeBloqueada({ nome, compact = false }) {
  if (compact) {
    return (
      <div className="flex items-center gap-2 text-muted-foreground text-sm py-2">
        <Lock className="w-4 h-4 shrink-0" />
        <span>"{nome}" não está ativada no Centro de Controle do RH.</span>
      </div>
    );
  }
  return (
    <div className="flex flex-col items-center justify-center py-16 gap-3 text-center">
      <div className="w-14 h-14 rounded-2xl bg-muted flex items-center justify-center">
        <Lock className="w-7 h-7 text-muted-foreground" />
      </div>
      <div>
        <p className="font-semibold text-foreground">Funcionalidade desativada</p>
        <p className="text-sm text-muted-foreground max-w-xs mt-1">
          "<strong>{nome}</strong>" ainda não está ativada no{' '}
          <strong>Centro de Controle do RH</strong>.<br />
          Acesse Configurações → Centro de Controle para ativá-la.
        </p>
      </div>
    </div>
  );
}
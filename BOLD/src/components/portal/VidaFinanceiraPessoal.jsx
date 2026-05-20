import React, { useState } from 'react';
import { Tv, CreditCard, Target, Calculator, BookOpen, ChevronDown, ChevronUp } from 'lucide-react';
import MinhasAssinaturas from '@/components/vidafinanceira/MinhasAssinaturas';
import MinhasDividas from '@/components/vidafinanceira/MinhasDividas';
import MetasObjetivos from '@/components/vidafinanceira/MetasObjetivos';
import SimuladoresFinanceiros from '@/components/vidafinanceira/SimuladoresFinanceiros';
import EducacaoFinanceira from '@/components/vidafinanceira/EducacaoFinanceira';

const MODULOS = [
  { id: 'assinaturas', label: 'Minhas Assinaturas', icon: Tv, color: 'text-purple-600', bg: 'bg-purple-50 border-purple-200' },
  { id: 'dividas',     label: 'Minhas Dívidas',     icon: CreditCard, color: 'text-red-600', bg: 'bg-red-50 border-red-200' },
  { id: 'metas',       label: 'Metas e Objetivos',  icon: Target, color: 'text-green-600', bg: 'bg-green-50 border-green-200' },
  { id: 'simuladores', label: 'Simuladores',         icon: Calculator, color: 'text-blue-600', bg: 'bg-blue-50 border-blue-200' },
  { id: 'educacao',    label: 'Educação Financeira', icon: BookOpen, color: 'text-amber-600', bg: 'bg-amber-50 border-amber-200' },
];

export default function VidaFinanceiraPessoal({ funcionario }) {
  const [aberto, setAberto] = useState(null);

  return (
    <div className="space-y-2">
      <p className="text-xs text-muted-foreground font-semibold uppercase tracking-wide px-1">Módulos Pessoais</p>

      {MODULOS.map(mod => {
        const Icon = mod.icon;
        const isOpen = aberto === mod.id;
        return (
          <div key={mod.id} className={`border rounded-xl overflow-hidden transition-all ${isOpen ? mod.bg : 'border-border'}`}>
            <button
              onClick={() => setAberto(isOpen ? null : mod.id)}
              className="w-full flex items-center justify-between px-4 py-3 hover:bg-muted/40 transition-colors"
            >
              <div className="flex items-center gap-3">
                <Icon className={`w-4 h-4 ${mod.color}`} />
                <span className="font-medium text-sm">{mod.label}</span>
              </div>
              {isOpen
                ? <ChevronUp className="w-4 h-4 text-muted-foreground" />
                : <ChevronDown className="w-4 h-4 text-muted-foreground" />
              }
            </button>

            {isOpen && (
              <div className="px-2 pb-3 pt-1 bg-background border-t">
                {mod.id === 'assinaturas' && (
                  <MinhasAssinaturas funcionarioId={funcionario?.id} salarioBase={funcionario?.salario_base || 0} />
                )}
                {mod.id === 'dividas' && (
                  <MinhasDividas funcionarioId={funcionario?.id} salarioBase={funcionario?.salario_base || 0} />
                )}
                {mod.id === 'metas' && (
                  <MetasObjetivos funcionarioId={funcionario?.id} />
                )}
                {mod.id === 'simuladores' && (
                  <SimuladoresFinanceiros />
                )}
                {mod.id === 'educacao' && (
                  <EducacaoFinanceira />
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
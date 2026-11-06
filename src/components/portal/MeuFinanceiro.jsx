import React from 'react';
import { cn } from '@/lib/utils';
import { SUBABAS_FINANCEIRO } from '@/lib/portalSecoes';

import MeuSalario from '@/components/portal/MeuSalario';
import MeusVales from '@/components/portal/MeusVales';
import ExtratoMensal from '@/components/portal/ExtratoMensal';
import MinhasComissoes from '@/components/portal/MinhasComissoes';
import PortalMetas from '@/components/portal/PortalMetas';

/**
 * Agrupa Salário, Vales, Comissões e Extrato em uma única seção do portal
 * ("Meu Financeiro"). As sub-abas reutilizam os componentes originais sem
 * alteração de conteúdo — só a navegação mudou.
 */
export default function MeuFinanceiro({
  funcionario,
  subAba = 'salario',
  onSubAbaChange,
  mesSelecionado,
  // Salário
  lancamentosFuncionario = [],
  comissoesFuncionarios = [],
  fechamentosFuncionario = [],
  tiposPersonalizados = [],
  // Vales
  lancamentosLimiteMes = [],
  totalValesMes = 0,
  totalValesLimite = 0,
  // Extrato
  lancamentosMes = [],
  receitasExtras = [],
  comissaoMes = 0,
  // Comissões (espelho do RH passa exibirResumoSetor)
  exibirResumoSetor = false,
  // Metas
  salarioBase = 0,
  ajudaCusto = 0,
  setMesSelecionado,
  onVerComprovante,
}) {
  const ativa = SUBABAS_FINANCEIRO.some(s => s.id === subAba) ? subAba : 'salario';

  return (
    <div className="space-y-4">
      <div
        role="tablist"
        aria-label="Seções financeiras"
        className="flex flex-wrap gap-2 rounded-xl border bg-card p-1.5"
      >
        {SUBABAS_FINANCEIRO.map(sub => (
          <button
            key={sub.id}
            role="tab"
            aria-selected={ativa === sub.id}
            onClick={() => onSubAbaChange?.(sub.id)}
            className={cn(
              'flex-1 min-w-[6rem] px-3 py-2 rounded-lg text-sm font-medium transition-colors',
              ativa === sub.id
                ? 'bg-primary text-primary-foreground shadow-sm'
                : 'text-muted-foreground hover:bg-muted hover:text-foreground'
            )}
          >
            {sub.label}
          </button>
        ))}
      </div>

      {ativa === 'salario' && (
        <MeuSalario
          funcionario={funcionario}
          lancamentosFuncionario={lancamentosFuncionario}
          comissoesFuncionarios={comissoesFuncionarios}
          fechamentosFuncionario={fechamentosFuncionario}
          mesSelecionado={mesSelecionado}
          tiposPersonalizados={tiposPersonalizados}
        />
      )}

      {ativa === 'vales' && (
        <MeusVales
          funcionario={funcionario}
          lancamentosLimiteMes={lancamentosLimiteMes}
          totalValesMes={totalValesMes}
          totalValesLimite={totalValesLimite}
          mesSelecionado={mesSelecionado}
          onVerComprovante={onVerComprovante}
        />
      )}

      {ativa === 'comissoes' && (
        <MinhasComissoes
          funcionarioId={funcionario?.id}
          funcionarioSetor={funcionario?.setor}
          mesSelecionado={mesSelecionado}
          exibirResumoSetor={exibirResumoSetor}
        />
      )}

      {ativa === 'extrato' && (
        <ExtratoMensal
          funcionario={funcionario}
          lancamentosMes={lancamentosMes}
          mesSelecionado={mesSelecionado}
          onVerComprovante={onVerComprovante}
          receitasExtras={receitasExtras}
          tiposPersonalizados={tiposPersonalizados}
          comissaoMes={comissaoMes}
        />
      )}

      {ativa === 'metas' && (
        <PortalMetas
          funcionarioId={funcionario?.id}
          funcionarioSetor={funcionario?.setor}
          salarioBase={salarioBase}
          ajudaCusto={ajudaCusto}
          comissoesFuncionarios={comissoesFuncionarios}
          mesSelecionado={mesSelecionado}
          setMesSelecionado={setMesSelecionado}
        />
      )}
    </div>
  );
}

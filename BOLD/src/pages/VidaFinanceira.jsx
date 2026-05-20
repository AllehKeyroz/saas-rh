import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { useRHControl } from '@/lib/rhControl';
import { Button } from '@/components/ui/button';
import { User, LogOut, LayoutDashboard, List, Target, Tv, CreditCard, Calculator, BookOpen, ChevronLeft, ChevronRight, Menu, X } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import DashboardFinanceiro from '@/components/vidafinanceira/DashboardFinanceiro';
import MeusGastos from './vidafinanceira/MeusGastos';
import MinhasMetas from './vidafinanceira/MinhasMetas';
import MinhasAssinaturas from '@/components/vidafinanceira/MinhasAssinaturas';
import MinhasDividas from '@/components/vidafinanceira/MinhasDividas';
import MetasObjetivos from '@/components/vidafinanceira/MetasObjetivos';
import SimuladoresFinanceiros from '@/components/vidafinanceira/SimuladoresFinanceiros';
import EducacaoFinanceira from '@/components/vidafinanceira/EducacaoFinanceira';

const TABS = [
  { id: 'dashboard', label: 'Painel', icon: LayoutDashboard },
  { id: 'gastos', label: 'Gastos', icon: List },
  { id: 'assinaturas', label: 'Assinaturas', icon: Tv },
  { id: 'dividas', label: 'Dívidas', icon: CreditCard },
  { id: 'metas', label: 'Metas', icon: Target },
  { id: 'simuladores', label: 'Simular', icon: Calculator },
  { id: 'educacao', label: 'Aprender', icon: BookOpen },
];

export default function VidaFinanceira() {
  const [meUser, setMeUser] = useState(null);
  const [tab, setTab] = useState('dashboard');
  const [menuOpen, setMenuOpen] = useState(false);
  const { isAtiva } = useRHControl();

  useEffect(() => {
    base44.auth.me().then(setMeUser);
  }, []);

  const { data: funcionarios = [], isLoading } = useQuery({
    queryKey: ['funcionarios'],
    queryFn: () => base44.entities.Funcionarios.list(),
    enabled: !!meUser,
  });

  const funcionario = funcionarios.find(
    f => f.user_email_portal === meUser?.email || f.email === meUser?.email
  );

  const { data: lancamentosRH = [] } = useQuery({
    queryKey: ['ficha_financeira_vf', funcionario?.id],
    queryFn: () => base44.entities.FichaFinanceira.filter({ funcionario_id: funcionario.id }),
    enabled: !!funcionario?.id,
  });

  const { data: comissoesFuncionarios = [] } = useQuery({
    queryKey: ['comissoes_funcionario_vf', funcionario?.id],
    queryFn: () => base44.entities.ComissaoPorFuncionario.filter({ funcionario_id: funcionario.id }),
    enabled: !!funcionario?.id && isAtiva('integracao_vida_financeira'),
  });

  if (!meUser || isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-6">
        <div className="w-full max-w-lg space-y-4">
          <Skeleton className="h-32" />
          <Skeleton className="h-48" />
        </div>
      </div>
    );
  }

  const tabAtual = TABS.find(t => t.id === tab);

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="bg-sidebar text-sidebar-foreground px-4 py-3 flex items-center justify-between sticky top-0 z-20">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
            <LayoutDashboard className="w-4 h-4 text-primary-foreground" />
          </div>
          <div>
            <span className="font-bold text-base">Minha Vida Financeira</span>
            {funcionario && <p className="text-xs text-sidebar-foreground/60">{funcionario.nome}</p>}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" className="text-sidebar-foreground/70 hover:text-sidebar-foreground h-8 w-8" onClick={() => setMenuOpen(!menuOpen)}>
            {menuOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
          </Button>
          <Button variant="ghost" size="icon" className="text-sidebar-foreground/70 hover:text-sidebar-foreground h-8 w-8" onClick={() => base44.auth.logout()}>
            <LogOut className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Menu lateral/dropdown */}
      {menuOpen && (
        <div className="bg-sidebar text-sidebar-foreground border-b border-sidebar-border">
          <div className="max-w-lg mx-auto px-4 py-2 grid grid-cols-4 gap-1">
            {TABS.map(t => (
              <button
                key={t.id}
                onClick={() => { setTab(t.id); setMenuOpen(false); }}
                className={`flex flex-col items-center gap-1 py-3 px-2 rounded-xl text-xs font-medium transition-colors ${
                  tab === t.id
                    ? 'bg-primary/20 text-sidebar-foreground'
                    : 'text-sidebar-foreground/60 hover:text-sidebar-foreground hover:bg-sidebar-accent'
                }`}
              >
                <t.icon className="w-5 h-5" />
                {t.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Tab bar (horizontal scroll) */}
      <div className="bg-card border-b sticky top-[57px] z-10 overflow-x-auto scrollbar-hide">
        <div className="flex min-w-max px-4">
          {TABS.map(t => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`flex items-center gap-1.5 px-3 py-3 text-xs font-medium whitespace-nowrap border-b-2 transition-colors ${
                tab === t.id
                  ? 'border-primary text-primary'
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              }`}
            >
              <t.icon className="w-3.5 h-3.5" />
              {t.label}
            </button>
          ))}
        </div>
      </div>

      <div className="max-w-lg mx-auto p-4 pb-8">
        {!funcionario && (
          <div className="flex flex-col items-center justify-center py-16 gap-3">
            <User className="w-12 h-12 text-muted-foreground" />
            <p className="text-center text-muted-foreground text-sm">
              Cadastro não encontrado. Entre em contato com o RH.
            </p>
          </div>
        )}

        {funcionario && tab === 'dashboard' && (
          <DashboardFinanceiro
            funcionarioId={funcionario.id}
            salarioBase={funcionario.salario_base || 0}
            lancamentosRH={lancamentosRH}
          />
        )}
        {funcionario && tab === 'gastos' && (
          <MeusGastos funcionarioId={funcionario.id} />
        )}
        {funcionario && tab === 'assinaturas' && (
          <MinhasAssinaturas funcionarioId={funcionario.id} salarioBase={funcionario.salario_base || 0} />
        )}
        {funcionario && tab === 'dividas' && (
          <MinhasDividas funcionarioId={funcionario.id} salarioBase={funcionario.salario_base || 0} />
        )}
        {funcionario && tab === 'metas' && (
          <div className="space-y-6">
            <MetasObjetivos funcionarioId={funcionario.id} />
            <div className="border-t pt-4">
              <p className="text-xs text-muted-foreground mb-3 font-medium uppercase tracking-wide">Meta de Economia Mensal</p>
              <MinhasMetas funcionarioId={funcionario.id} salarioBase={funcionario.salario_base} />
            </div>
          </div>
        )}
        {funcionario && tab === 'simuladores' && (
          <SimuladoresFinanceiros />
        )}
        {tab === 'educacao' && (
          <EducacaoFinanceira />
        )}
      </div>
    </div>
  );
}
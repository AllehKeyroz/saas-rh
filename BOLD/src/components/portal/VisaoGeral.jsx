import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  User, DollarSign, Wallet, FileText, BarChart2, Award, Target, ChevronRight
} from 'lucide-react';
import { formatCurrency, formatDate } from '@/lib/formatters';
import AlertaLimiteVale from '@/components/portal/AlertaLimiteVale';

function QuickCard({ icon: Icon, title, subtitle, color = 'bg-primary/10 text-primary', onClick }) {
  return (
    <button
      onClick={onClick}
      className="flex items-center gap-3 bg-card border rounded-xl p-4 hover:shadow-md transition-all text-left w-full"
    >
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${color}`}>
        <Icon className="w-5 h-5" />
      </div>
      <div className="flex-1 overflow-hidden">
        <p className="font-semibold text-sm">{title}</p>
        <p className="text-xs text-muted-foreground truncate">{subtitle}</p>
      </div>
      <ChevronRight className="w-4 h-4 text-muted-foreground" />
    </button>
  );
}

export default function VisaoGeral({ funcionario, totalValesMes, mesSelecionado, setAba }) {
  const perm = funcionario?.permissoes_portal || {};

  return (
    <div className="space-y-6">
      {/* Alerta de limite de vales */}
      {(perm.ver_limite_vales || perm.ver_extrato_vales) && (
        <AlertaLimiteVale
          totalValesMes={totalValesMes}
          limite={funcionario?.limite_vales}
          onVerDetalhes={() => setAba('meus-vales')}
        />
      )}
      {/* Perfil resumido */}
      <Card>
        <CardContent className="pt-5">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-2xl bg-muted flex items-center justify-center overflow-hidden shrink-0">
              {funcionario?.foto ? (
                <img src={funcionario.foto} alt="" className="w-full h-full object-cover" />
              ) : (
                <User className="w-7 h-7 text-muted-foreground" />
              )}
            </div>
            <div>
              <h2 className="text-xl font-bold">{funcionario?.nome}</h2>
              {perm.ver_funcao && funcionario?.funcao && (
                <p className="text-sm text-muted-foreground">{funcionario.funcao}</p>
              )}
              {perm.ver_setor && funcionario?.setor && (
                <Badge variant="secondary" className="mt-1">{funcionario.setor}</Badge>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Atalhos rápidos */}
      <div>
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Acesso rápido</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <QuickCard
            icon={User}
            title="Meus Dados"
            subtitle="Informações pessoais"
            color="bg-blue-100 text-blue-600"
            onClick={() => setAba('meus-dados')}
          />
          {perm.ver_salario && (
            <QuickCard
              icon={DollarSign}
              title="Meu Salário"
              subtitle={perm.ver_salario ? formatCurrency(funcionario?.salario_base) : '••••••'}
              color="bg-green-100 text-green-600"
              onClick={() => setAba('meu-salario')}
            />
          )}
          {(perm.ver_limite_vales || perm.ver_extrato_vales) && (
            <QuickCard
              icon={Wallet}
              title="Meus Vales"
              subtitle={`${mesSelecionado} · ${formatCurrency(totalValesMes)} utilizado`}
              color="bg-orange-100 text-orange-600"
              onClick={() => setAba('meus-vales')}
            />
          )}
          {perm.ver_extrato_completo && (
            <QuickCard
              icon={FileText}
              title="Extrato Mensal"
              subtitle={mesSelecionado}
              color="bg-purple-100 text-purple-600"
              onClick={() => setAba('extrato')}
            />
          )}
          <QuickCard
            icon={BarChart2}
            title="Vida Financeira"
            subtitle="Gastos e metas pessoais"
            color="bg-indigo-100 text-indigo-600"
            onClick={() => setAba('vida-financeira')}
          />
          {perm.ver_comissoes !== false && (
            <QuickCard
              icon={Award}
              title="Minhas Comissões"
              subtitle="Gorjetas por período"
              color="bg-yellow-100 text-yellow-600"
              onClick={() => setAba('comissoes')}
            />
          )}
          <QuickCard
            icon={Target}
            title="Minhas Metas"
            subtitle="Economia e comissão"
            color="bg-teal-100 text-teal-600"
            onClick={() => setAba('metas')}
          />
        </div>
      </div>
    </div>
  );
}
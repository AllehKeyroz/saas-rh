import React from 'react';
import ClickableStatsCard from './ClickableStatsCard';
import { DASHBOARD_CARD_ROUTES } from '@/lib/dashboardRoutes';
import {
  Users, Clock, FileText, AlertCircle, DollarSign,
  TrendingUp, Calculator, Award
} from 'lucide-react';

export default function StatisticsGrid({ stats = {} }) {
  const defaultStats = {
    funcionariosAtivos: 0,
    solicitacoesPendentes: 0,
    feriasVencidas: 0,
    docsVencendo: 0,
    valesMes: 0,
    consignadosAtivos: 0,
    custoFolha: 0,
    comissaoTotal: 0,
    ...stats
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
      <ClickableStatsCard
        title="Funcionários Ativos"
        value={defaultStats.funcionariosAtivos}
        icon={Users}
        color="blue"
        route={DASHBOARD_CARD_ROUTES.funcionariosAtivos.path}
        tooltip={DASHBOARD_CARD_ROUTES.funcionariosAtivos.label}
      />
      <ClickableStatsCard
        title="Solicitações Pendentes"
        value={defaultStats.solicitacoesPendentes}
        icon={Clock}
        color="orange"
        route={DASHBOARD_CARD_ROUTES.solicitacoesPendentes.path}
        tooltip={DASHBOARD_CARD_ROUTES.solicitacoesPendentes.label}
      />
      <ClickableStatsCard
        title="Férias Vencidas"
        value={defaultStats.feriasVencidas}
        icon={AlertCircle}
        color={defaultStats.feriasVencidas > 0 ? "red" : "green"}
        route={DASHBOARD_CARD_ROUTES.feriasVencidas.path}
        tooltip={DASHBOARD_CARD_ROUTES.feriasVencidas.label}
      />
      <ClickableStatsCard
        title="Documentos Vencendo"
        value={defaultStats.docsVencendo}
        icon={FileText}
        color={defaultStats.docsVencendo > 0 ? "orange" : "green"}
        route={DASHBOARD_CARD_ROUTES.docsVencendo.path}
        tooltip={DASHBOARD_CARD_ROUTES.docsVencendo.label}
      />
      <ClickableStatsCard
        title="Vales no Mês"
        value={`R$ ${defaultStats.valesMes.toLocaleString('pt-BR', {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2
        })}`}
        icon={DollarSign}
        color="blue"
        route={DASHBOARD_CARD_ROUTES.valesMes.path}
        tooltip={DASHBOARD_CARD_ROUTES.valesMes.label}
      />
      <ClickableStatsCard
        title="Consignados Ativos"
        value={defaultStats.consignadosAtivos}
        icon={TrendingUp}
        color="purple"
        route={DASHBOARD_CARD_ROUTES.consignadosAtivos.path}
        tooltip={DASHBOARD_CARD_ROUTES.consignadosAtivos.label}
      />
      <ClickableStatsCard
        title="Custo da Folha"
        value={`R$ ${defaultStats.custoFolha.toLocaleString('pt-BR', {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2
        })}`}
        icon={Calculator}
        color="pink"
        route={DASHBOARD_CARD_ROUTES.custoFolha.path}
        tooltip={DASHBOARD_CARD_ROUTES.custoFolha.label}
      />
      <ClickableStatsCard
        title="Comissão Total"
        value={`R$ ${defaultStats.comissaoTotal.toLocaleString('pt-BR', {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2
        })}`}
        icon={Award}
        color="green"
        route={DASHBOARD_CARD_ROUTES.comissaoTotal.path}
        tooltip={DASHBOARD_CARD_ROUTES.comissaoTotal.label}
      />
    </div>
  );
}
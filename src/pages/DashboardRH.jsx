import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { client } from '@/api/client';
import StatisticsGrid from '@/components/dashboard-rh/StatisticsGrid';
import AlertBanner from '@/components/dashboard-rh/AlertBanner';
import IndicadoresFinanceiros from '@/components/dashboard-rh/IndicadoresFinanceiros';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Skeleton } from '@/components/ui/skeleton';
import { User, ExternalLink, CalendarDays } from 'lucide-react';
import { formatDate } from '@/lib/formatters';
import { mergeTipos } from '@/lib/formatters';

export default function DashboardRH() {
  const navigate = useNavigate();
  const [feriasModalOpen, setFeriasModalOpen] = useState(false);
  const { data: funcionarios, isLoading: loadingFuncionarios } = useQuery({
    queryKey: ['funcionarios'],
    queryFn: () => client.entities.Funcionarios.list(),
  });

  const { data: solicitacoes } = useQuery({
    queryKey: ['solicitacoes'],
    queryFn: () => client.entities.SolicitacoesFuncionario.list(),
  });

  const { data: lancamentos } = useQuery({
    queryKey: ['lancamentos'],
    queryFn: () => client.entities.FichaFinanceira.list('-data_lancamento', 2000),
  });

  const { data: assinaturas } = useQuery({
    queryKey: ['assinaturas_dashboard'],
    queryFn: () => client.entities.AssinaturaDigital.list('-data_envio', 200),
  });

  const { data: comissoes } = useQuery({
    queryKey: ['comissoes_dashboard'],
    queryFn: () => client.entities.ComissoesGorjetas.list('-created_date', 50),
  });

  const { data: fechamentos = [] } = useQuery({
    queryKey: ['fechamentos_dashboard'],
    queryFn: () => client.entities.FechamentoMensal.list('-created_date', 2000),
  });

  const { data: todasFerias = [] } = useQuery({
    queryKey: ['ferias_dashboard'],
    queryFn: () => client.entities.Ferias.list(),
  });

  const { data: tiposLancamento = [] } = useQuery({
    queryKey: ['tipos-lancamento-rh'],
    queryFn: () => client.entities.TipoLancamento.list(),
  });

  const descontosList = useMemo(() => mergeTipos(tiposLancamento, 'desconto'), [tiposLancamento]);

  const stats = React.useMemo(() => {
    if (!funcionarios) return {};
    const now = new Date();
    const mesAtual = `${String(now.getMonth() + 1).padStart(2, '0')}/${now.getFullYear()}`;
    const ativas = funcionarios.filter(f => f.ativo !== false && !f.data_demissao).length;
    const pendentes = solicitacoes?.filter(s => s.status === 'pendente').length || 0;

    // Férias vencidas considerando períodos já gozados
    const feriasVencidas = funcionarios.filter(f => {
      const dataAdm = f.data_admissao ? new Date(f.data_admissao) : null;
      if (!dataAdm || f.data_demissao) return false;
      const mesesDesdeAdmissao = (now.getTime() - dataAdm.getTime()) / (1000 * 60 * 60 * 24 * 30.44);
      const totalPeriodos = Math.floor(mesesDesdeAdmissao / 12);
      if (totalPeriodos === 0) return false;
      // Períodos já consumidos
      const consumidos = new Set(
        todasFerias.filter(fc => fc.funcionario_id === f.id).map(fc => fc.periodo_aquisitivo)
      );
      // Verifica se há algum período não consumido cujo prazo CLT já venceu
      for (let p = 1; p <= totalPeriodos; p++) {
        if (!consumidos.has(p)) {
          const fimPeriodo = new Date(dataAdm.getTime() + p * 365 * 24 * 60 * 60 * 1000);
          const prazoLimite = new Date(fimPeriodo);
          prazoLimite.setMonth(prazoLimite.getMonth() + 11);
          if (now > prazoLimite) return true;
        }
      }
      return false;
    }).length;

    const lancamentosMes = (lancamentos || []).filter(l => {
      if (!l.data_lancamento) return false;
      const d = new Date(l.data_lancamento);
      return `${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}` === mesAtual;
    });
    const vales = lancamentosMes.filter(l => descontosList.includes(l.tipo_lancamento));
    const valesMes = vales.reduce((s, l) => s + (l.valor || 0), 0);
    // Funcionários em férias agora
    const agora = new Date();
    const feriadosAtivos = (todasFerias || []).filter(fc => {
      if (!fc.data_inicio || !fc.data_fim) return false;
      const inicio = new Date(fc.data_inicio);
      const fim = new Date(fc.data_fim);
      return inicio <= agora && fim >= agora;
    });
    const funcIdsFerias = new Set(feriadosAtivos.map(fc => fc.funcionario_id));
    const funcionariosFeriasList = (funcionarios || []).filter(f => funcIdsFerias.has(f.id));
    const funcionariosFerias = funcionariosFeriasList.length;

    const docsVencendo = (assinaturas || []).filter(a => {
      if (a.status !== 'aguardando' || !a.data_expiracao) return false;
      const exp = new Date(a.data_expiracao);
      return exp > now && exp < new Date(now.getTime() + 5 * 24 * 60 * 60 * 1000);
    }).length;

    const fechamentosMes = fechamentos.filter(f => f.mes_referencia === mesAtual);
    const custoFolha = fechamentosMes.reduce((s, f) => s + (f.salario_liquido || 0), 0);

    const comissaoTotal = (comissoes || [])
      .filter(c => c.mes_referencia === mesAtual && c.status === 'confirmado')
      .reduce((s, c) => s + (c.valor_total_periodo || 0), 0);

    return { funcionariosAtivos: ativas, solicitacoesPendentes: pendentes, feriasVencidas, docsVencendo, valesMes, custoFolha, comissaoTotal, funcionariosFerias, funcionariosFeriasList };
  }, [funcionarios, solicitacoes, lancamentos, assinaturas, comissoes, fechamentos, todasFerias, descontosList, funcionarios]);

  const alerts = React.useMemo(() => {
    const result = [];
    if (stats.feriasVencidas > 0) result.push({ type: 'warning', title: `${stats.feriasVencidas} funcionário(s) com férias vencidas`, description: `${stats.feriasVencidas} funcionário(s) estão há mais de 14 meses sem férias.`, action: 'Verificar', onAction: () => navigate('/funcionarios?tab=ferias') });
    if (stats.docsVencendo > 0) result.push({ type: 'error', title: `${stats.docsVencendo} documento(s) vencendo`, description: `${stats.docsVencendo} documento(s) vencerão nos próximos 5 dias.`, action: 'Gerenciar', onAction: () => navigate('/assinaturas-digitais') });
    return result;
  }, [stats, navigate]);

  const dadosCustosPorSetor = React.useMemo(() => {
    if (!funcionarios) return [];
    const porSetor = {};
    funcionarios.filter(f => f.ativo !== false).forEach(f => {
      const setor = f.setor || 'Sem setor';
      porSetor[setor] = (porSetor[setor] || 0) + (f.salario_base || 0) + (f.ajuda_custo || 0);
    });
    return Object.entries(porSetor).map(([setor, custo]) => ({ setor, custo }));
  }, [funcionarios]);

  const dadosFaltasPorSetor = React.useMemo(() => {
    if (!funcionarios) return [];
    const porSetor = {};
    funcionarios.filter(f => f.ativo !== false).forEach(f => {
      const setor = f.setor || 'Sem setor';
      porSetor[setor] = (porSetor[setor] || 0) + (f.faltas_no_periodo || 0);
    });
    return Object.entries(porSetor).map(([setor, faltas]) => ({ setor, faltas }));
  }, [funcionarios]);

  const dadosEvolucaoFolha = React.useMemo(() => {
    if (!fechamentos.length) return [];
    const mapa = {};
    fechamentos.forEach(f => {
      if (!f.mes_referencia) return;
      mapa[f.mes_referencia] = (mapa[f.mes_referencia] || 0) + (f.salario_liquido || 0);
    });
    return Object.entries(mapa)
      .sort(([a], [b]) => a.localeCompare(b))
      .slice(-6)
      .map(([mes, custo]) => ({ mes, custo }));
  }, [fechamentos]);

  const dadosSolicitacoes = React.useMemo(() => {
    if (!solicitacoes) return [];
    const porTipo = {};
    solicitacoes.forEach(s => { const tipo = s.tipo_solicitacao || 'outros'; porTipo[tipo] = (porTipo[tipo] || 0) + 1; });
    return Object.entries(porTipo).map(([name, value]) => ({ name, value }));
  }, [solicitacoes]);

  const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

  if (loadingFuncionarios) {
    return <div className="space-y-6"><Skeleton className="h-32 w-full" /><Skeleton className="h-96 w-full" /></div>;
  }

  return (
    <div className="space-y-6">
      <AlertBanner alerts={alerts} />
      <StatisticsGrid stats={stats} onFeriasClick={() => setFeriasModalOpen(true)} />
      <IndicadoresFinanceiros />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <Card>
          <CardHeader><CardTitle className="text-lg">Custos por Setor</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={dadosCustosPorSetor.length ? dadosCustosPorSetor : [{ setor: 'Sem dados', custo: 0 }]} layout="vertical" margin={{ top: 5, right: 30, left: 120, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis type="number" />
                <YAxis dataKey="setor" type="category" width={110} />
                <Tooltip formatter={(v) => `R$ ${Number(v).toLocaleString('pt-BR')}`} />
                <Bar dataKey="custo" fill="#3b82f6" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-lg">Evolução da Folha (6 meses)</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={dadosEvolucaoFolha.length ? dadosEvolucaoFolha : [{ mes: 'Aguardando dados', custo: 0 }]}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="mes" />
                <YAxis />
                <Tooltip formatter={(v) => `R$ ${Number(v).toLocaleString('pt-BR')}`} />
                <Line type="monotone" dataKey="custo" stroke="#3b82f6" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader><CardTitle className="text-lg">Solicitações por Tipo</CardTitle></CardHeader>
          <CardContent className="flex items-center justify-center">
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie data={dadosSolicitacoes.length ? dadosSolicitacoes : [{ name: 'Sem dados', value: 1 }]} cx="50%" cy="50%" labelLine={false}
                  label={({ name, value }) => `${name}: ${value}`} outerRadius={100} dataKey="value">
                  {(dadosSolicitacoes.length ? dadosSolicitacoes : [{ name: 'Sem dados', value: 1 }]).map((_, i) => (<Cell key={i} fill={COLORS[i % COLORS.length]} />))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-lg">Faltas por Setor</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={dadosFaltasPorSetor.length ? dadosFaltasPorSetor : [{ setor: 'Sem dados', faltas: 0 }]}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="setor" />
                <YAxis />
                <Tooltip formatter={(v) => `${v} falta(s)`} />
                <Legend />
                <Bar dataKey="faltas" fill="#ef4444" name="Faltas no Período" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      <Dialog open={feriasModalOpen} onOpenChange={setFeriasModalOpen}>
        <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CalendarDays className="w-5 h-5 text-primary" />
              Funcionários em Férias
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            {!stats.funcionariosFeriasList?.length ? (
              <p className="text-center py-8 text-muted-foreground">Nenhum funcionário em período de férias no momento.</p>
            ) : (
              stats.funcionariosFeriasList.map(func => {
                const feriasAtual = (todasFerias || []).find(fc =>
                  fc.funcionario_id === func.id &&
                  fc.data_inicio && fc.data_fim &&
                  new Date(fc.data_inicio) <= new Date() &&
                  new Date(fc.data_fim) >= new Date()
                );
                return (
                  <div key={func.id} className="flex items-center gap-3 p-3 rounded-lg border bg-card hover:bg-muted/30 transition-colors">
                    <div className="w-9 h-9 rounded-full bg-muted flex items-center justify-center overflow-hidden shrink-0">
                      {func.foto ? <img src={func.foto} alt="" className="w-full h-full object-cover" /> : <User className="w-4 h-4 text-muted-foreground" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <a href={`/funcionarios/${func.id}/360`} target="_blank" rel="noopener noreferrer" className="font-medium text-sm hover:text-primary transition-colors flex items-center gap-1">
                        {func.nome}
                        <ExternalLink className="w-3 h-3" />
                      </a>
                      <p className="text-xs text-muted-foreground">
                        {func.funcao || func.setor || '—'} • {feriasAtual ? `${formatDate(feriasAtual.data_inicio)} → ${formatDate(feriasAtual.data_fim)}` : ''}
                      </p>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

import React, { useState, useEffect, useRef } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { client } from '@/api/client';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { useSearchParams } from 'react-router-dom';
import { User, LogOut, ChevronLeft, ChevronRight, FileText } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { getMesReferenciaAtual, getMesesOptions, formatDate, formatCurrency } from '@/lib/formatters';
import { useRHControl } from '@/lib/rhControl';
import { useToast } from '@/components/ui/use-toast';

import PortalSidebar from '@/components/portal/PortalSidebar';
import VisaoGeral from '@/components/portal/VisaoGeral';
import MeusDados from '@/components/portal/MeusDados';
import MeuSalario from '@/components/portal/MeuSalario';
import MeusVales from '@/components/portal/MeusVales';
import ExtratoMensal from '@/components/portal/ExtratoMensal';
import MinhasComissoes from '@/components/portal/MinhasComissoes';
import PortalMetas from '@/components/portal/PortalMetas';
import PortalVidaFinanceira from '@/components/portal/PortalVidaFinanceira';
import MensagensPortal from '@/components/portal/MensagensPortal';
import MinhasSolicitacoes from '@/components/portal/MinhasSolicitacoes';
import AvisosPendentes from '@/components/portal/AvisosPendentes';
import AvisosCloudMobile from '@/components/portal/AvisosCloudMobile';
import AssinaturasPortal from '@/components/portal/AssinaturasPortal';
import MeusDocumentos from '@/components/portal/MeusDocumentos';


const TIPOS_LIMITE = ['vale', 'adiantamento', 'convenio', 'consumo', 'credito_consignado'];

const ABA_LABELS = {
  'visao-geral': 'Visão Geral',
  'meus-dados': 'Meus Dados',
  'meu-salario': 'Meu Salário',
  'meus-vales': 'Meus Vales',
  'extrato': 'Extrato Mensal',
  'vida-financeira': 'Minha Vida Financeira',
  'comissoes': 'Minhas Comissões',
  'metas': 'Minhas Metas',
  'meus-documentos': 'Meus Documentos',
  'mensagens': 'Mensagens',
  'solicitacoes': 'Minhas Solicitações',
  'assinaturas': 'Assinaturas Digitais',
};

export default function PortalFuncionario() {
  const [meUser, setMeUser] = useState(null);
  const [searchParams, setSearchParams] = useSearchParams();
  const [aba, setAba] = useState(searchParams.get('tab') || 'visao-geral');
  const [mobileOpen, setMobileOpen] = useState(false);
  const [comprovante, setComprovante] = useState(null);
  const mesAtual = getMesReferenciaAtual();
  const [mesSelecionado, setMesSelecionado] = useState(mesAtual);
  const mesesDisponiveis = getMesesOptions(12);
  const { isAtiva } = useRHControl();
  const { toast } = useToast();
  const [mensagensNaoLidas, setMensagensNaoLidas] = React.useState(0);
  const [solicitacoesRespondidas, setSolicitacoesRespondidas] = React.useState(0);

  useEffect(() => {
    client.auth.me().then(setMeUser);
  }, []);

  // Sincroniza aba com a URL
  useEffect(() => {
    const params = new URLSearchParams(searchParams);
    if (aba === 'visao-geral') {
      params.delete('tab');
    } else {
      params.set('tab', aba);
    }
    setSearchParams(params, { replace: true });
  }, [aba]);

  const { data: funcionarios = [], isLoading: loadingFunc } = useQuery({
    queryKey: ['funcionarios'],
    queryFn: () => client.entities.Funcionarios.list(),
    enabled: !!meUser,
  });

  const { data: lancamentos = [], isLoading: loadingLanc } = useQuery({
    queryKey: ['lancamentos'],
    queryFn: () => client.entities.FichaFinanceira.list(),
    enabled: !!meUser,
  });

  const funcionario = funcionarios.find(
    f => f.user_email_portal === meUser?.email || f.email === meUser?.email
  );

  const { data: gastosPessoais = [] } = useQuery({
    queryKey: ['gastos_pessoais', funcionario?.id],
    queryFn: () => client.entities.GastosPessoais.filter({
      funcionario_id: funcionario?.id
    }),
    enabled: !!meUser && funcionarios.length > 0,
  });

  const { data: mensagensRH = [] } = useQuery({
    queryKey: ['mensagens_rh_portal'],
    queryFn: () => client.entities.MensagensRH.list('-data_envio', 200),
    enabled: !!meUser && isAtiva('modulo_mensagens'),
  });

  // Subscrição em tempo real para respostas de solicitações
  useEffect(() => {
    if (!funcionario?.id) return;
    const isFirst = { current: true };
    const timer = setTimeout(() => { isFirst.current = false; }, 2000);

    const unsubscribe = client.entities.SolicitacoesFuncionario.subscribe((event) => {
      if (isFirst.current) return;
      if (event.type !== 'update') return;
      const sol = event.data;
      if (sol.funcionario_id !== funcionario.id) return;
      if (sol.status === 'aprovado' || sol.status === 'recusado') {
        const isAprovado = sol.status === 'aprovado';
        setSolicitacoesRespondidas(prev => prev + 1);
        // Toast de notificação
        const tipoLabels = { ferias: 'Férias', vale: 'Vale', banco_horas: 'Banco de Horas', atestado: 'Atestado', documento: 'Documento', outro: 'Outra' };
        const tipo = tipoLabels[sol.tipo_solicitacao] || 'solicitação';
        toast({
          title: isAprovado ? `✅ Solicitação de ${tipo} aprovada!` : `❌ Solicitação de ${tipo} recusada`,
          description: sol.resposta_rh || (isAprovado ? 'O RH aprovou sua solicitação.' : 'O RH recusou sua solicitação.'),
          variant: isAprovado ? 'default' : 'destructive',
        });
      }
    });

    return () => { unsubscribe(); clearTimeout(timer); };
  }, [funcionario?.id]);

  // Limpar badge de solicitações ao entrar na aba
  useEffect(() => {
    if (aba === 'solicitacoes') setSolicitacoesRespondidas(0);
  }, [aba]);

  // Calcular mensagens não lidas do funcionário
  React.useEffect(() => {
    if (!funcionario || !mensagensRH.length) return;
    const disponiveis = mensagensRH.filter(m => {
      if (m.publico_alvo === 'todos') return true;
      if (m.publico_alvo === 'setor' && funcionario.setor && m.setor_alvo === funcionario.setor) return true;
      if (m.publico_alvo === 'funcionario' && m.funcionario_id_alvo === funcionario.id) return true;
      return false;
    });
    const naoLidas = disponiveis.filter(m => !(m.lidas_por || []).includes(funcionario.id)).length;
    setMensagensNaoLidas(naoLidas);
  }, [mensagensRH, funcionario]);

  const { data: comissoesFuncionarios = [] } = useQuery({
    queryKey: ['comissoes_funcionario_vf', funcionario?.id],
    queryFn: () => client.entities.ComissaoPorFuncionario.filter({
      funcionario_id: funcionario?.id
    }),
    enabled: !!meUser && funcionarios.length > 0 && !!funcionario && isAtiva('comissoes_por_periodo'),
  });

  const lancamentosFunc = lancamentos.filter(l => l.funcionario_id === funcionario?.id);
  const lancamentosMes = lancamentosFunc.filter(l => {
    if (!l.data_lancamento) return false;
    const d = new Date(l.data_lancamento);
    const mr = `${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
    return mr === mesSelecionado;
  });

  const lancamentosLimiteMes = lancamentosMes.filter(l => TIPOS_LIMITE.includes(l.tipo_lancamento));
  const totalValesMes = lancamentosLimiteMes.reduce((s, l) => s + (l.valor || 0), 0);

  // Receitas extras do mês selecionado
  const receitasExtrasMes = gastosPessoais.filter(g => {
    if (g.categoria_tipo !== 'receita_extra' || !g.data_lancamento) return false;
    const d = new Date(g.data_lancamento);
    const mr = `${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
    return mr === mesSelecionado;
  });

  const isLoading = loadingFunc || loadingLanc || !meUser;
  const queryClient = useQueryClient();

  const avisosNaoLidos = mensagensRH.filter(m => {
    if (m.publico_alvo === 'todos') return true;
    if (m.publico_alvo === 'setor' && funcionario?.setor && m.setor_alvo === funcionario.setor) return true;
    if (m.publico_alvo === 'funcionario' && m.funcionario_id_alvo === funcionario?.id) return true;
    return false;
  }).filter(m => !(m.lidas_por || []).includes(funcionario?.id)).length;

  const navegarMes = (dir) => {
    const idx = mesesDisponiveis.indexOf(mesSelecionado);
    const novo = idx + dir;
    if (novo >= 0 && novo < mesesDisponiveis.length) setMesSelecionado(mesesDisponiveis[novo]);
  };

  // Abas que exibem seletor de mês
  const ABAS_COM_MES = ['meus-vales', 'extrato', 'meu-salario', 'comissoes'];

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-6">
        <div className="w-full max-w-lg space-y-4">
          <Skeleton className="h-32" />
          <Skeleton className="h-48" />
        </div>
      </div>
    );
  }

  if (!funcionario) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6 gap-4">
        <User className="w-16 h-16 text-muted-foreground" />
        <h2 className="text-xl font-semibold">Cadastro não encontrado</h2>
        <p className="text-muted-foreground text-center max-w-sm">
          Seu usuário ({meUser?.email}) não está vinculado a nenhum funcionário. Entre em contato com o RH.
        </p>
        <Button variant="outline" onClick={() => client.auth.logout()}>
          <LogOut className="w-4 h-4 mr-2" />Sair
        </Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex">
      {/* Sidebar */}
      <PortalSidebar
        aba={aba}
        setAba={setAba}
        funcionario={funcionario}
        mobileOpen={mobileOpen}
        setMobileOpen={setMobileOpen}
        mensagensNaoLidas={mensagensNaoLidas}
        solicitacoesRespondidas={solicitacoesRespondidas}
        avisosNaoLidos={avisosNaoLidos}
      />

      {/* Main content */}
       <main className="flex-1 min-w-0 flex flex-col">
         {/* Topbar */}
          <div className="bg-card border-b px-4 md:px-6 py-4 flex items-center justify-between md:sticky top-0 z-10">
            <div className="flex-1 md:flex-none flex flex-col gap-2">
              <div className="flex items-center justify-center gap-3 ml-10 md:ml-0">
                <h1 className="font-bold text-lg text-center">{ABA_LABELS[aba] || 'Portal'}</h1>
              </div>
             {aba === 'visao-geral' && (
               <AvisosCloudMobile 
                 funcionario={funcionario} 
                 mensagensRH={mensagensRH}
                 onRefresh={() => queryClient.invalidateQueries({ queryKey: ['mensagens_rh_portal'] })}
               />
             )}
           </div>
          {/* Seletor de mês inline para abas relevantes */}
          {ABAS_COM_MES.includes(aba) && (
            <div className="flex items-center gap-2">
              <button onClick={() => navegarMes(-1)} disabled={mesesDisponiveis.indexOf(mesSelecionado) === 0}
                className="w-10 h-10 rounded-lg border flex items-center justify-center disabled:opacity-40 hover:bg-muted transition-colors shrink-0">
                <ChevronLeft className="w-4 h-4" />
              </button>
              <Select value={mesSelecionado} onValueChange={setMesSelecionado}>
                <SelectTrigger className="w-28 h-10 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {mesesDisponiveis.map(mes => (
                    <SelectItem key={mes} value={mes}>{mes}{mes === mesAtual ? ' ●' : ''}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <button onClick={() => navegarMes(1)} disabled={mesesDisponiveis.indexOf(mesSelecionado) === mesesDisponiveis.length - 1}
                className="w-10 h-10 rounded-lg border flex items-center justify-center disabled:opacity-40 hover:bg-muted transition-colors shrink-0">
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>

        {/* Page content */}
          <div className="flex-1 p-4 md:p-6 w-full pb-12 space-y-6">
           {aba === 'visao-geral' && (
             <>
               <AvisosPendentes 
                 funcionario={funcionario} 
                 mensagensRH={mensagensRH}
                 onRefresh={() => queryClient.invalidateQueries({ queryKey: ['mensagens_rh_portal'] })}
               />
               <VisaoGeral
                 funcionario={funcionario}
                 totalValesMes={totalValesMes}
                 mesSelecionado={mesSelecionado}
                 setAba={setAba}
               />
               </>
               )}
          {aba === 'meus-dados' && (
            <MeusDados funcionario={funcionario} />
          )}
          {aba === 'meu-salario' && (
            <MeuSalario
              funcionario={funcionario}
              lancamentosFuncionario={lancamentosFunc}
              comissoesFuncionarios={comissoesFuncionarios}
              mesSelecionado={mesSelecionado}
            />
          )}
          {aba === 'meus-vales' && (
            <MeusVales
              funcionario={funcionario}
              lancamentosLimiteMes={lancamentosLimiteMes}
              totalValesMes={totalValesMes}
              mesSelecionado={mesSelecionado}
              onVerComprovante={setComprovante}
            />
          )}
          {aba === 'extrato' && (
            <ExtratoMensal
              funcionario={funcionario}
              lancamentosMes={lancamentosMes}
              mesSelecionado={mesSelecionado}
              onVerComprovante={setComprovante}
              receitasExtras={receitasExtrasMes}
            />
          )}
          {aba === 'vida-financeira' && (
            <PortalVidaFinanceira
              funcionario={funcionario}
              lancamentosFunc={lancamentosFunc}
              comissoesFuncionarios={comissoesFuncionarios}
              mesSelecionado={mesSelecionado}
              setMesSelecionado={setMesSelecionado}
            />
          )}
          {aba === 'comissoes' && (
            <MinhasComissoes
              funcionarioId={funcionario?.id}
              funcionarioSetor={funcionario?.setor}
            />
          )}
          {aba === 'metas' && (
            <PortalMetas
              funcionarioId={funcionario?.id}
              funcionarioSetor={funcionario?.setor}
              salarioBase={funcionario?.salario_base}
              ajudaCusto={funcionario?.ajuda_custo || 0}
              comissoesFuncionarios={comissoesFuncionarios}
              mesSelecionado={mesSelecionado}
              setMesSelecionado={setMesSelecionado}
            />
          )}
          {aba === 'meus-documentos' && (
            <MeusDocumentos funcionarioId={funcionario?.id} />
          )}
          {aba === 'mensagens' && isAtiva('modulo_mensagens') && (
            <MensagensPortal funcionario={funcionario} />
          )}
          {aba === 'solicitacoes' && isAtiva('modulo_solicitacoes') && (
            <MinhasSolicitacoes funcionario={funcionario} />
          )}
          {aba === 'assinaturas' && (
            <AssinaturasPortal funcionario={funcionario} />
          )}
        </div>
      </main>

      {/* Modal comprovante */}
      <Dialog open={!!comprovante} onOpenChange={open => !open && setComprovante(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Comprovante</DialogTitle>
          </DialogHeader>
          {comprovante && (
            <div className="space-y-3">
              <div className="bg-muted rounded-lg p-3 space-y-1 text-sm">
                <div><span className="text-muted-foreground">Tipo:</span> <span className="font-medium capitalize">{comprovante.tipo_lancamento === 'credito_consignado' ? 'Crédito Consignado' : comprovante.tipo_lancamento}</span></div>
                {comprovante.descricao && <div><span className="text-muted-foreground">Descrição:</span> <span className="font-medium">{comprovante.descricao}</span></div>}
                <div><span className="text-muted-foreground">Valor:</span> <span className="font-medium">{formatCurrency(comprovante.valor)}</span></div>
                <div><span className="text-muted-foreground">Data:</span> <span className="font-medium">{formatDate(comprovante.data_lancamento)}</span></div>
              </div>
              {comprovante.comprovante && (
                <div className="rounded-lg border overflow-hidden bg-white flex items-center justify-center min-h-[200px] sm:min-h-96">
                  {comprovante.comprovante.match(/\.(png|jpg|jpeg|gif|webp)$/i) ? (
                    <img src={comprovante.comprovante} alt="Comprovante" className="max-w-full max-h-[50vh] sm:max-h-96 object-contain" />
                  ) : comprovante.comprovante.match(/\.pdf$/i) ? (
                    <iframe src={comprovante.comprovante} className="w-full h-[50vh] sm:h-96" />
                  ) : (
                    <a href={comprovante.comprovante} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-primary hover:underline">
                      <FileText className="w-5 h-5" />Ver documento
                    </a>
                  )}
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
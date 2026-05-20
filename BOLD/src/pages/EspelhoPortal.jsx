import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { getMesReferenciaAtual, getMesesOptions, formatCurrency, formatDate } from '@/lib/formatters';
import { ChevronLeft, ChevronRight, Eye, User, FileText, AlertTriangle } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useRHControl } from '@/lib/rhControl';

import VisaoGeral from '@/components/portal/VisaoGeral';
import MeusDados from '@/components/portal/MeusDados';
import MeuSalario from '@/components/portal/MeuSalario';
import MeusVales from '@/components/portal/MeusVales';
import ExtratoMensal from '@/components/portal/ExtratoMensal';
import MinhasComissoes from '@/components/portal/MinhasComissoes';
import MensagensPortal from '@/components/portal/MensagensPortal';
import AssinaturasPortal from '@/components/portal/AssinaturasPortal';

const TIPOS_LIMITE = ['vale', 'adiantamento', 'convenio', 'consumo', 'credito_consignado'];

const ABAS = [
  { id: 'visao-geral', label: 'Visão Geral' },
  { id: 'meus-dados', label: 'Meus Dados' },
  { id: 'meu-salario', label: 'Salário' },
  { id: 'meus-vales', label: 'Vales' },
  { id: 'extrato', label: 'Extrato Mensal' },
  { id: 'comissoes', label: 'Comissões' },
  { id: 'mensagens', label: 'Mensagens' },
  { id: 'assinaturas', label: 'Assinaturas' },
];

const ABAS_COM_MES = ['meus-vales', 'extrato', 'meu-salario', 'comissoes'];

export default function EspelhoPortal() {
  const [funcionarioId, setFuncionarioId] = useState('');
  const [aba, setAba] = useState('visao-geral');
  const [mesSelecionado, setMesSelecionado] = useState(getMesReferenciaAtual());
  const [comprovante, setComprovante] = useState(null);
  const { isAtiva } = useRHControl();
  const mesAtual = getMesReferenciaAtual();
  const mesesDisponiveis = getMesesOptions(12);

  const { data: funcionarios = [], isLoading: loadingFuncs } = useQuery({
    queryKey: ['funcionarios'],
    queryFn: () => base44.entities.Funcionarios.list(),
  });

  const { data: lancamentos = [], isLoading: loadingLanc } = useQuery({
    queryKey: ['lancamentos'],
    queryFn: () => base44.entities.FichaFinanceira.list(),
    enabled: !!funcionarioId,
  });

  const { data: comissoesFuncionarios = [] } = useQuery({
    queryKey: ['comissoes_espelho', funcionarioId],
    queryFn: () => base44.entities.ComissaoPorFuncionario.filter({ funcionario_id: funcionarioId }),
    enabled: !!funcionarioId && isAtiva('comissoes_por_periodo'),
  });

  const { data: mensagensRH = [] } = useQuery({
    queryKey: ['mensagens_rh_portal'],
    queryFn: () => base44.entities.MensagensRH.list('-data_envio', 200),
    enabled: isAtiva('modulo_mensagens'),
  });

  const funcionario = funcionarios.find(f => f.id === funcionarioId);
  const funcionariosAtivos = funcionarios.filter(f => f.ativo !== false);

  const lancamentosFunc = lancamentos.filter(l => l.funcionario_id === funcionarioId);
  const lancamentosMes = lancamentosFunc.filter(l => {
    if (!l.data_lancamento) return false;
    const d = new Date(l.data_lancamento);
    const mr = `${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
    return mr === mesSelecionado;
  });
  const lancamentosLimiteMes = lancamentosMes.filter(l => TIPOS_LIMITE.includes(l.tipo_lancamento));
  const totalValesMes = lancamentosLimiteMes.reduce((s, l) => s + (l.valor || 0), 0);

  const navegarMes = (dir) => {
    const idx = mesesDisponiveis.indexOf(mesSelecionado);
    const novo = idx + dir;
    if (novo >= 0 && novo < mesesDisponiveis.length) setMesSelecionado(mesesDisponiveis[novo]);
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header RH */}
      <div className="bg-card border-b px-6 py-4 flex flex-wrap items-center gap-4">
        <div className="flex items-center gap-2 text-primary font-semibold">
          <Eye className="w-5 h-5" />
          <span>Espelho do Portal</span>
        </div>
        <div className="flex items-center gap-2 bg-amber-50 border border-amber-200 rounded-lg px-3 py-1.5">
          <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
          <p className="text-xs text-amber-800">Modo somente leitura — visualização do ponto de vista do funcionário</p>
        </div>
        <div className="ml-auto flex items-center gap-3">
          <Select value={funcionarioId} onValueChange={id => { setFuncionarioId(id); setAba('visao-geral'); }}>
            <SelectTrigger className="w-64">
              <SelectValue placeholder="Selecione um funcionário..." />
            </SelectTrigger>
            <SelectContent>
              {funcionariosAtivos.map(f => (
                <SelectItem key={f.id} value={f.id}>
                  {f.nome}{f.setor ? ` — ${f.setor}` : ''}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {!funcionarioId ? (
        <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4 text-center p-6">
          <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center">
            <User className="w-8 h-8 text-primary" />
          </div>
          <h2 className="text-xl font-semibold">Selecione um funcionário</h2>
          <p className="text-muted-foreground max-w-sm text-sm">
            Escolha um funcionário acima para visualizar exatamente o que ele vê no portal, incluindo vales, comissões e informações pessoais conforme as permissões configuradas.
          </p>
        </div>
      ) : (
        <div className="flex min-h-[calc(100vh-73px)]">
          {/* Sidebar de abas */}
          <aside className="w-52 shrink-0 bg-card border-r p-3 space-y-1 hidden md:block">
            {funcionario && (
              <div className="px-2 py-3 mb-2 border-b">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center overflow-hidden shrink-0">
                    {funcionario.foto ? (
                      <img src={funcionario.foto} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <User className="w-4 h-4 text-muted-foreground" />
                    )}
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-semibold truncate">{funcionario.nome}</p>
                    {funcionario.setor && <p className="text-xs text-muted-foreground truncate">{funcionario.setor}</p>}
                  </div>
                </div>
              </div>
            )}
            {ABAS.map(a => (
              <button
                key={a.id}
                onClick={() => setAba(a.id)}
                className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${
                  aba === a.id
                    ? 'bg-primary text-primary-foreground font-medium'
                    : 'hover:bg-muted text-muted-foreground hover:text-foreground'
                }`}
              >
                {a.label}
              </button>
            ))}
          </aside>

          {/* Mobile: tabs horizontais */}
          <div className="md:hidden w-full border-b bg-card overflow-x-auto sticky top-0 z-10 flex">
            {ABAS.map(a => (
              <button
                key={a.id}
                onClick={() => setAba(a.id)}
                className={`px-4 py-3 text-xs whitespace-nowrap font-medium border-b-2 transition-colors ${
                  aba === a.id ? 'border-primary text-primary' : 'border-transparent text-muted-foreground'
                }`}
              >
                {a.label}
              </button>
            ))}
          </div>

          {/* Conteúdo principal */}
          <main className="flex-1 min-w-0 flex flex-col">
            {/* Topbar com seletor de mês */}
            <div className="bg-card border-b px-6 py-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="font-semibold text-sm">{ABAS.find(a => a.id === aba)?.label}</span>
                {funcionario && (
                  <Badge variant="secondary" className="text-xs">
                    {funcionario.nome}
                  </Badge>
                )}
              </div>
              {ABAS_COM_MES.includes(aba) && (
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => navegarMes(-1)}
                    disabled={mesesDisponiveis.indexOf(mesSelecionado) === 0}
                    className="w-7 h-7 rounded-lg border flex items-center justify-center disabled:opacity-40 hover:bg-muted transition-colors"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <Select value={mesSelecionado} onValueChange={setMesSelecionado}>
                    <SelectTrigger className="w-28 h-8 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {mesesDisponiveis.map(mes => (
                        <SelectItem key={mes} value={mes}>{mes}{mes === mesAtual ? ' ●' : ''}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <button
                    onClick={() => navegarMes(1)}
                    disabled={mesesDisponiveis.indexOf(mesSelecionado) === mesesDisponiveis.length - 1}
                    className="w-7 h-7 rounded-lg border flex items-center justify-center disabled:opacity-40 hover:bg-muted transition-colors"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              )}
            </div>

            {/* Conteúdo da aba — idêntico ao portal, read-only */}
            <div className="flex-1 p-4 md:p-6 max-w-2xl w-full mx-auto pb-12 space-y-6">
              {aba === 'visao-geral' && (
                <VisaoGeral
                  funcionario={funcionario}
                  totalValesMes={totalValesMes}
                  mesSelecionado={mesSelecionado}
                  setAba={setAba}
                />
              )}
              {aba === 'meus-dados' && <MeusDados funcionario={funcionario} />}
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
                  receitasExtras={[]}
                />
              )}
              {aba === 'comissoes' && (
                <MinhasComissoes
                  funcionarioId={funcionario?.id}
                  funcionarioSetor={funcionario?.setor}
                />
              )}
              {aba === 'mensagens' && (
                <MensagensPortal funcionario={funcionario} />
              )}
              {aba === 'assinaturas' && (
                <AssinaturasPortal funcionario={funcionario} />
              )}
            </div>
          </main>
        </div>
      )}

      {/* Modal comprovante */}
      <Dialog open={!!comprovante} onOpenChange={open => !open && setComprovante(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Comprovante</DialogTitle>
          </DialogHeader>
          {comprovante && (
            <div className="space-y-3">
              <div className="bg-muted rounded-lg p-3 space-y-1 text-sm">
                <div><span className="text-muted-foreground">Tipo:</span> <span className="font-medium capitalize">{comprovante.tipo_lancamento}</span></div>
                {comprovante.descricao && <div><span className="text-muted-foreground">Descrição:</span> <span className="font-medium">{comprovante.descricao}</span></div>}
                <div><span className="text-muted-foreground">Valor:</span> <span className="font-medium">{formatCurrency(comprovante.valor)}</span></div>
                <div><span className="text-muted-foreground">Data:</span> <span className="font-medium">{formatDate(comprovante.data_lancamento)}</span></div>
              </div>
              {comprovante.comprovante && (
                <div className="rounded-lg border overflow-hidden bg-white flex items-center justify-center min-h-96">
                  {comprovante.comprovante.match(/\.(png|jpg|jpeg|gif|webp)$/i) ? (
                    <img src={comprovante.comprovante} alt="Comprovante" className="max-w-full max-h-96 object-contain" />
                  ) : comprovante.comprovante.match(/\.pdf$/i) ? (
                    <iframe src={comprovante.comprovante} className="w-full h-96" />
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
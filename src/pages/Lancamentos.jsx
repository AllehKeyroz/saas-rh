import React, { useState, useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { client } from '@/api/client';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Plus, Search, User, ChevronRight, Upload, TrendingUp, FileText, Wallet, DollarSign, Clock, List, Settings, Building2, Hash, Calendar } from 'lucide-react';
import { formatCurrency, getMesesOptions, getMesReferenciaAtual, TIPOS_DESCONTO, TIPOS_ADICIONAL, parseDateLocal, getMesRef } from '@/lib/formatters';
import { Skeleton } from '@/components/ui/skeleton';
import LancamentoForm from '@/components/lancamentos/LancamentoForm';
import GerenciarTiposLancamento from '@/components/lancamentos/TiposLancamentoForm';
import DetalhesFuncionarioModal from '@/components/lancamentos/DetalhesFuncionarioModal';
import ImportarLancamentos from '@/components/importacao/ImportarLancamentos';

const TIPOS_NAVBAR = [
  { key: 'todos',          label: 'Todos',           icon: List,        tipo: null },
  { key: 'vale',           label: 'Vales',           icon: DollarSign,  tipo: 'vale' },
  { key: 'vale_parcelado', label: 'Vales Parcelados', icon: Clock,      tipo: 'vale_parcelado' },
  { key: 'consignado',     label: 'Consignados',     icon: TrendingUp,  tipo: 'credito_consignado' },
  { key: 'convenio',       label: 'Convênios',       icon: Wallet,      tipo: 'convenio' },
  { key: 'consumo',        label: 'Consumo',         icon: FileText,    tipo: 'consumo' },
];

export default function Lancamentos() {
  const [formOpen, setFormOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [tiposOpen, setTiposOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [mesFiltro, setMesFiltro] = useState(getMesReferenciaAtual());
  const [funcSelecionado, setFuncSelecionado] = useState(null);
  const [filtroAtivo, setFiltroAtivo] = useState('todos');
  const queryClient = useQueryClient();

  const filtroConfig = TIPOS_NAVBAR.find(t => t.key === filtroAtivo && t.key !== 'todos') || null;

  const { data: lancamentos = [], isLoading } = useQuery({
    queryKey: ['lancamentos'],
    queryFn: () => client.entities.FichaFinanceira.list('-created_date', 1000),
  });

  const { data: funcionarios = [] } = useQuery({
    queryKey: ['funcionarios'],
    queryFn: () => client.entities.Funcionarios.list(),
  });

  const { data: tiposLancamento = [] } = useQuery({
    queryKey: ['tipos-lancamento'],
    queryFn: () => client.entities.TipoLancamento.list(),
  });

  const { data: consignadosContratos = [] } = useQuery({
    queryKey: ['consignados-contratos'],
    queryFn: () => client.entities.Consignado.list('-created_date', 500),
  });

  const customDescontos = useMemo(() => {
    return new Set(
      tiposLancamento
        .filter(t => t.ativo !== false && t.categoria === 'desconto')
        .map(t => t.nome)
    );
  }, [tiposLancamento]);

  const customAdicionais = useMemo(() => {
    return new Set(
      tiposLancamento
        .filter(t => t.ativo !== false && t.categoria === 'adicional')
        .map(t => t.nome)
    );
  }, [tiposLancamento]);

  const isDesconto = (tipo) => TIPOS_DESCONTO.includes(tipo) || customDescontos.has(tipo);
  const isAdicional = (tipo) => TIPOS_ADICIONAL.includes(tipo) || customAdicionais.has(tipo);

  // Filtra lançamentos do mês selecionado
  const lancamentosMes = lancamentos.filter(l => {
    if (!l.data_lancamento) return false;
    const mr = getMesRef(l.data_lancamento);
    return mr === mesFiltro;
  });

  // Agrupa por funcionário (filtra apenas ativos e não demitidos)
  // Se filtroConfig ativo, mostra TODOS os lançamentos do funcionário (não só do mês) para acompanhamento de longo prazo
  const todosLancamentos = filtroConfig ? lancamentos : lancamentosMes;

  const ativos = funcionarios.filter(f => f.ativo !== false && !f.data_demissao);
  const resumo = ativos
    .sort((a, b) => (a.nome || '').localeCompare(b.nome || ''))
    .map(func => {
      const fl = lancamentosMes.filter(l => l.funcionario_id === func.id);
      const totalDescontos = fl.filter(l => isDesconto(l.tipo_lancamento)).reduce((s, l) => s + (l.valor || 0), 0);
      const totalAdicionais = fl.filter(l => isAdicional(l.tipo_lancamento)).reduce((s, l) => s + (l.valor || 0), 0);
      // Para filtro por tipo: verifica se funcionário tem algum lançamento desse tipo (em todo o histórico)
      const temTipoFiltro = filtroConfig
        ? lancamentos.some(l => l.funcionario_id === func.id && l.tipo_lancamento === filtroConfig.tipo)
        : true;
      return { func, fl, totalDescontos, totalAdicionais, total: fl.length, temTipoFiltro };
    })
    .filter(r => {
      if (!r.temTipoFiltro) return false;
      if (!search) return true;
      return r.func.nome?.toLowerCase().includes(search.toLowerCase()) ||
             r.func.funcao?.toLowerCase().includes(search.toLowerCase()) ||
             r.func.setor?.toLowerCase().includes(search.toLowerCase());
    });

  // Filtra contratos consignado vigentes no mês selecionado
  const MESES_ABV = ['JAN','FEV','MAR','ABR','MAI','JUN','JUL','AGO','SET','OUT','NOV','DEZ'];
  const consignadosFiltrados = useMemo(() => {
    const [m, a] = mesFiltro.split('/');
    const mesAlvo = Number(m);
    const anoAlvo = Number(a);
    return consignadosContratos.filter(c => {
      if (!c.mes_inicio_desconto || !c.mes_fim_desconto) return true;
      const [mI, aI] = c.mes_inicio_desconto.split('/');
      const [mF, aF] = c.mes_fim_desconto.split('/');
      const idxI = MESES_ABV.indexOf(mI?.toUpperCase());
      const idxF = MESES_ABV.indexOf(mF?.toUpperCase());
      if (idxI === -1 || idxF === -1) return true;
      const linearInicio = Number(aI) * 12 + idxI;
      const linearFim = Number(aF) * 12 + idxF;
      const linearAlvo = anoAlvo * 12 + (mesAlvo - 1);
      return linearAlvo >= linearInicio && linearAlvo <= linearFim;
    });
  }, [consignadosContratos, mesFiltro]);

  const handleSaved = () => {
    queryClient.invalidateQueries({ queryKey: ['lancamentos'] });
    queryClient.invalidateQueries({ queryKey: ['consignados-contratos'] });
  };

  const funcDetalhes = funcSelecionado ? funcionarios.find(f => f.id === funcSelecionado) : null;
  const lancDetalhes = funcSelecionado ? lancamentosMes.filter(l => l.funcionario_id === funcSelecionado) : [];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            Lançamentos Financeiros
            <button onClick={() => setTiposOpen(true)} className="text-muted-foreground hover:text-foreground transition-colors text-sm flex items-center gap-1" title="Gerenciar tipos">
              <Settings className="w-4 h-4" /> Gerenciar Tipos
            </button>
          </h1>
          <p className="text-muted-foreground mt-1">
            Resumo mensal por funcionário
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setImportOpen(true)}>
            <Upload className="w-4 h-4 mr-2" />Importar
          </Button>
          <Button onClick={() => setFormOpen(true)}>
            <Plus className="w-4 h-4 mr-2" />Novo Lançamento
          </Button>
        </div>
      </div>

      {/* Navbar de tipos */}
      <Tabs value={filtroAtivo} onValueChange={setFiltroAtivo}>
        <div className="flex flex-col sm:flex-row sm:items-center gap-3">
          <TabsList className="overflow-x-auto">
            {TIPOS_NAVBAR.map(t => (
              <TabsTrigger key={t.key} value={t.key} className="gap-1.5">
                <t.icon className="w-3.5 h-3.5" />
                <span>{t.label}</span>
              </TabsTrigger>
            ))}
          </TabsList>
          <div className="flex gap-2 ml-auto">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input placeholder="Buscar funcionário..." value={search} onChange={e => setSearch(e.target.value)} className="pl-10" />
            </div>
            <Select value={mesFiltro} onValueChange={setMesFiltro}>
              <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
              <SelectContent>
                {getMesesOptions(12).map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </div>
      </Tabs>

      {isLoading ? (
        <div className="space-y-3">
          {[1,2,3,4].map(i => <Skeleton key={i} className="h-20" />)}
        </div>
      ) : filtroAtivo === 'consignado' ? (
        <div className="space-y-3">
          {consignadosFiltrados.filter(ct => {
            if (!search) return true;
            const func = funcionarios.find(f => f.id === ct.funcionario_id);
            return (func?.nome || '').toLowerCase().includes(search.toLowerCase())
              || (ct.numero_contrato || '').toLowerCase().includes(search.toLowerCase())
              || (ct.instituicao_financeira || '').toLowerCase().includes(search.toLowerCase());
          }).map(ct => {
            const func = funcionarios.find(f => f.id === ct.funcionario_id);
            // Calcula número ordinal da parcela para o mês selecionado
            let parcelaAtual = null;
            const totalParc = Number(ct.total_parcelas);
            if (ct.mes_inicio_desconto && totalParc) {
              const [mI, aI] = ct.mes_inicio_desconto.split('/');
              const idx = MESES_ABV.indexOf(mI?.toUpperCase());
              if (idx !== -1) {
                const linearInicio = Number(aI) * 12 + idx;
                const [mM, aM] = mesFiltro.split('/');
                const linearAlvo = Number(aM) * 12 + (Number(mM) - 1);
                const diff = linearAlvo - linearInicio;
                if (diff >= 0 && diff < totalParc) parcelaAtual = diff + 1;
              }
            }
            return (
              <Card key={ct.id}>
                <CardContent className="p-4">
                  <div className="flex items-center gap-4">
                    <div className="w-11 h-11 rounded-xl bg-purple-100 flex items-center justify-center shrink-0">
                      <Building2 className="w-5 h-5 text-purple-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold">{func?.nome || ct.funcionario_nome}</span>
                        {ct.ativo === false && <Badge variant="outline" className="text-xs">Encerrado</Badge>}
                        {ct.ativo !== false && <Badge className="bg-purple-100 text-purple-700 text-xs">Ativo</Badge>}
                      </div>
                      <p className="text-sm text-muted-foreground flex items-center gap-1">
                        <Hash className="w-3 h-3" />{ct.numero_contrato || '—'}
                      </p>
                    </div>
                    <div className="hidden sm:flex items-center gap-6 text-sm">
                      <div className="text-center">
                        <p className="text-xs text-muted-foreground">Valor Parcela</p>
                        <p className="font-bold text-destructive">{formatCurrency(ct.valor_parcela || 0)}</p>
                      </div>
                      <div className="text-center">
                        <p className="text-xs text-muted-foreground">Parcela no mês</p>
                        <p className="font-semibold">{parcelaAtual ? `${parcelaAtual}/${totalParc}` : '—'}</p>
                      </div>
                      <div className="text-center">
                        <p className="text-xs text-muted-foreground">Instituição</p>
                        <p className="font-medium max-w-[180px] truncate text-xs">{ct.instituicao_financeira || '—'}</p>
                      </div>
                      <div className="text-center">
                        <p className="text-xs text-muted-foreground">Período</p>
                        <p className="text-xs">{ct.mes_inicio_desconto || '?'} — {ct.mes_fim_desconto || '?'}</p>
                      </div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" />
                  </div>
                  {ct.instituicao_financeira && (
                    <div className="sm:hidden flex flex-wrap gap-x-4 gap-y-1 mt-3 pt-3 border-t text-xs text-muted-foreground">
                      <span>{ct.numero_contrato || '—'}</span>
                      <span>{ct.instituicao_financeira}</span>
                      <span>{parcelaAtual ? `${parcelaAtual}/${totalParc}` : `${ct.parcelas_pagas || 0}/${totalParc || '—'}`}</span>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
          {consignadosFiltrados.length === 0 && (
            <div className="text-center py-16 text-muted-foreground">
              Nenhum contrato consignado registrado.
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {resumo.map(({ func, fl, totalDescontos, totalAdicionais, total }) => {
            const salarioLiquido = (func.salario_base || 0) + (func.ajuda_custo || 0) + totalAdicionais - totalDescontos;
            const temLancamentos = total > 0;
            const consolidados = fl.filter(l => l.consolidado).length;
            const todosConsolidados = temLancamentos && consolidados === total;
            // Total acumulado do tipo filtrado (histórico completo)
            const totalTipoFiltrado = filtroConfig
              ? lancamentos.filter(l => l.funcionario_id === func.id && l.tipo_lancamento === filtroConfig.tipo)
                  .reduce((s, l) => s + (l.valor || 0), 0)
              : 0;
            const qtdTipoFiltrado = filtroConfig
              ? lancamentos.filter(l => l.funcionario_id === func.id && l.tipo_lancamento === filtroConfig.tipo).length
              : 0;

            return (
              <Card
                key={func.id}
                className="cursor-pointer hover:shadow-md hover:border-primary/30 transition-all"
                onClick={() => setFuncSelecionado(func.id)}
              >
                <CardContent className="p-4">
                  <div className="flex items-center gap-4">
                    {/* Avatar */}
                    <div className="w-11 h-11 rounded-xl bg-muted flex items-center justify-center overflow-hidden shrink-0">
                      {func.foto ? (
                        <img src={func.foto} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <User className="w-5 h-5 text-muted-foreground" />
                      )}
                    </div>

                    {/* Info principal */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold">{func.nome}</span>
                        {todosConsolidados && (
                          <Badge className="bg-green-100 text-green-700 text-xs">Folha fechada</Badge>
                        )}
                        {!temLancamentos && (
                          <Badge variant="outline" className="text-xs text-muted-foreground">Sem lançamentos</Badge>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground">{func.funcao || '-'} • {func.setor || '-'}</p>
                    </div>

                    {/* Valores resumidos */}
                    <div className="hidden sm:flex items-center gap-6 text-sm">
                      {filtroConfig ? (
                        <>
                          <div className="text-center">
                            <p className="text-xs text-muted-foreground">Total Acumulado</p>
                            <p className="font-bold text-destructive">{formatCurrency(totalTipoFiltrado)}</p>
                          </div>
                          <div className="text-center">
                            <p className="text-xs text-muted-foreground">Parcelas</p>
                            <p className="font-semibold">{qtdTipoFiltrado}</p>
                          </div>
                          <div className="text-center">
                            <p className="text-xs text-muted-foreground">Desc. esse mês</p>
                            <p className="font-semibold text-red-600">{formatCurrency(totalDescontos)}</p>
                          </div>
                        </>
                      ) : (
                        <>
                          <div className="text-center">
                            <p className="text-xs text-muted-foreground">Descontos</p>
                            <p className="font-semibold text-red-600">{formatCurrency(totalDescontos)}</p>
                          </div>
                          <div className="text-center">
                            <p className="text-xs text-muted-foreground">Adicionais</p>
                            <p className="font-semibold text-green-600">{formatCurrency(totalAdicionais)}</p>
                          </div>
                          <div className="text-center">
                            <p className="text-xs text-muted-foreground">Sal. Líquido</p>
                            <p className="font-bold">{formatCurrency(salarioLiquido)}</p>
                          </div>
                          <div className="text-center">
                            <p className="text-xs text-muted-foreground">Lançamentos</p>
                            <p className="font-semibold">{total}</p>
                          </div>
                        </>
                      )}
                    </div>

                    <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" />
                  </div>

                  {/* Mobile values */}
                  {temLancamentos && (
                    <div className="sm:hidden flex gap-4 mt-3 pt-3 border-t text-sm">
                      <div>
                        <span className="text-muted-foreground">Desc: </span>
                        <span className="font-semibold text-red-600">{formatCurrency(totalDescontos)}</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Líq: </span>
                        <span className="font-bold">{formatCurrency(salarioLiquido)}</span>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}

          {resumo.length === 0 && (
            <div className="text-center py-16 text-muted-foreground">
              Nenhum funcionário encontrado
            </div>
          )}
        </div>
      )}

      {/* Modal detalhes do funcionário */}
      {funcSelecionado && (
        <DetalhesFuncionarioModal
          open={!!funcSelecionado}
          onClose={() => setFuncSelecionado(null)}
          funcionario={funcDetalhes}
          lancamentos={lancDetalhes}
          mesRef={mesFiltro}
        />
      )}

      {formOpen && (
        <LancamentoForm
          open={formOpen}
          onClose={() => setFormOpen(false)}
          onSaved={handleSaved}
          funcionarios={funcionarios}
        />
      )}

      <ImportarLancamentos
        open={importOpen}
        onClose={() => setImportOpen(false)}
        onSaved={handleSaved}
        funcionarios={funcionarios}
      />

      <GerenciarTiposLancamento
        open={tiposOpen}
        onClose={() => setTiposOpen(false)}
      />
    </div>
  );
}
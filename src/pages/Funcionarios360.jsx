import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { client } from '@/api/client';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Calendar, DollarSign, HelpCircle, Umbrella } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { formatCurrency, formatDate } from '@/lib/formatters';
import { getTipoAfastamento, getHojeISO, isAfastamentoAtivo } from '@/lib/afastamento';

import Dashboard360 from '@/components/funcionarios360/Dashboard360';
import DadosPessoais360 from '@/components/funcionarios360/DadosPessoais360';
import Documentos360 from '@/components/funcionarios360/Documentos360';
import HistoricoPagamentos360 from '@/components/funcionarios360/HistoricoPagamentos360';
import CargoSalario360 from '@/components/funcionarios360/CargoSalario360';
import Afastamento360 from '@/components/funcionarios360/Afastamento360';
import Ferias360 from '@/components/funcionarios360/Ferias360';
import AfastamentoFormModal from '@/components/funcionarios/AfastamentoFormModal';
import {
  ValesAdiantamentos360,
  DescontosConsignados360,
  Comissoes360,
  Solicitacoes360,
  Advertencias360,
  BancoHoras360,
  Desempenho360,
  LinhaTempoInteligente360,
  Auditoria360,
  AnexosGerais360
} from '@/components/funcionarios360/stub-components';

function getSituacaoFerias(ferias) {
  if (!ferias || ferias.length === 0) return null;
  const hoje = new Date();
  const ativas = ferias.filter(f => {
    if (!f.data_inicio || !f.data_fim) return false;
    const inicio = new Date(f.data_inicio + 'T12:00:00');
    const fim = new Date(f.data_fim + 'T12:00:00');
    return inicio <= hoje && fim >= hoje;
  });
  if (ativas.length > 0) return { tipo: 'em_ferias', label: 'Em férias', data: ativas[0] };
  const futuras = ferias.filter(f => {
    if (!f.data_inicio) return false;
    return new Date(f.data_inicio + 'T12:00:00') > hoje;
  }).sort((a, b) => new Date(a.data_inicio) - new Date(b.data_inicio));
  if (futuras.length > 0) return { tipo: 'programada', label: 'Férias programadas', data: futuras[0] };
  return { tipo: 'sem_ferias', label: 'Sem férias ativas' };
}

export default function Funcionarios360() {
  const { funcId } = useParams();
  const navigate = useNavigate();
  const [abaSelecionada, setAbaSelecionada] = useState('dashboard');

  const { data: funcionario, isLoading } = useQuery({
    queryKey: ['funcionario360', funcId],
    queryFn: () => funcId ? client.entities.Funcionarios.get(funcId) : null,
  });

  const { data: lancamentos = [] } = useQuery({
    queryKey: ['lancamentos360', funcId],
    queryFn: () => client.entities.FichaFinanceira.filter({ funcionario_id: funcId }),
  });

  const { data: vales = [] } = useQuery({
    queryKey: ['vales360', funcId],
    queryFn: () => client.entities.FichaFinanceira.filter({ funcionario_id: funcId, tipo_lancamento: 'vale' }),
  });

  const { data: solicitacoes = [] } = useQuery({
    queryKey: ['solicitacoes360', funcId],
    queryFn: () => client.entities.SolicitacoesFuncionario.filter({ funcionario_id: funcId }),
  });

  const { data: documentos = [] } = useQuery({
    queryKey: ['documentos360', funcId],
    queryFn: () => funcId ? client.entities.DocumentoFuncionario.filter({ funcionario_id: funcId }) : [],
  });

  const { data: comissoes = [] } = useQuery({
    queryKey: ['comissoes360', funcId],
    queryFn: () => funcId ? client.entities.ComissaoPorFuncionario.filter({ funcionario_id: funcId }) : [],
  });

  const { data: fechamentos = [] } = useQuery({
    queryKey: ['fechamentos360', funcId],
    queryFn: () => funcId ? client.entities.FechamentoMensal.filter({ funcionario_id: funcId }) : [],
  });

  const { data: ferias = [] } = useQuery({
    queryKey: ['ferias360', funcId],
    queryFn: () => funcId ? client.entities.Ferias.filter({ funcionario_id: funcId }) : [],
    enabled: !!funcId,
  });

  const { data: afastamentos = [] } = useQuery({
    queryKey: ['afastamentos_360', funcId],
    queryFn: () => funcId ? client.entities.Afastamento.filter({ funcionario_id: funcId }) : [],
    enabled: !!funcId,
  });

  const [registrarAfastamentoOpen, setRegistrarAfastamentoOpen] = useState(false);

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-48 w-full" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  if (!funcionario) {
    return (
      <div className="text-center py-16">
        <p className="text-muted-foreground">Funcionário não encontrado</p>
      </div>
    );
  }

  const situacaoFerias = getSituacaoFerias(ferias);
  const afastamentoAtivo = afastamentos.find(a => isAfastamentoAtivo(a, getHojeISO())) || null;
  const afastamentoCfg = afastamentoAtivo ? getTipoAfastamento(afastamentoAtivo.tipo) : null;

  return (
    <div className="space-y-6">
      {/* Back button */}
      <div>
        <Button variant="ghost" size="sm" onClick={() => navigate('/funcionarios')}>
          <ArrowLeft className="w-4 h-4 mr-1.5" />
          Voltar
        </Button>
      </div>

      {/* Header: Foto + Informações */}
      <Card className="overflow-hidden">
        <CardContent className="p-0">
          <div className="flex flex-col sm:flex-row">
            {/* Foto — lado esquerdo (1/3 da largura) */}
            <div className="w-full sm:w-1/3 shrink-0 bg-muted flex items-center justify-center">
              {funcionario.foto ? (
                <img
                  src={funcionario.foto}
                  alt={funcionario.nome}
                  className="w-full h-72 sm:h-full object-cover"
                />
              ) : (
                <div className="w-full h-72 sm:min-h-[280px] flex items-center justify-center text-muted-foreground text-sm">
                  Sem foto
                </div>
              )}
            </div>

            {/* Informações — lado direito (vertical) */}
            <div className="flex-1 p-6 flex flex-col gap-5">
              {/* Nome + Status */}
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h1 className="text-2xl font-bold">{funcionario.nome}</h1>
                  <p className="text-base text-muted-foreground mt-0.5">{funcionario.funcao || ''}</p>
                </div>
                <div className="flex flex-col items-end gap-1.5">
                  {afastamentoAtivo ? (
                    <Badge className="bg-red-100 text-red-700 border-0">
                      Em afastamento{afastamentoCfg ? ` — ${afastamentoCfg.label}` : ''}
                    </Badge>
                  ) : (
                    <Badge variant={funcionario.ativo !== false ? 'default' : 'destructive'}>
                      {funcionario.ativo !== false ? 'Ativo' : 'Inativo'}
                    </Badge>
                  )}
                </div>
              </div>

              {/* Info cards — Lista vertical simples */}
              <div className="flex flex-col gap-4">
                <div>
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-1">
                    <Calendar className="w-3.5 h-3.5" />
                    Admissão
                  </div>
                  <p className="text-sm font-semibold">{funcionario.data_admissao ? formatDate(funcionario.data_admissao) : '-'}</p>
                </div>
                <div>
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-1">
                    <DollarSign className="w-3.5 h-3.5" />
                    Salário Base
                  </div>
                  <p className="text-sm font-semibold">{formatCurrency(funcionario.salario_base || 0)}</p>
                </div>
                <div>
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-1">
                    <HelpCircle className="w-3.5 h-3.5" />
                    Ajuda de Custo
                  </div>
                  <p className="text-sm font-semibold">{formatCurrency(funcionario.ajuda_custo || 0)}</p>
                </div>
                <div>
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-1">
                    <Umbrella className="w-3.5 h-3.5" />
                    Situação de Férias
                  </div>
                  <p className="text-sm font-semibold">
                    {situacaoFerias ? (
                      <span className={situacaoFerias.tipo === 'em_ferias' ? 'text-amber-600' : ''}>
                        {situacaoFerias.label}
                      </span>
                    ) : '-'}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Dashboard de Indicadores */}
      <Dashboard360 
        funcionario={funcionario}
        lancamentos={lancamentos}
        vales={vales}
        comissoes={comissoes}
        solicitacoes={solicitacoes}
        documentos={documentos}
        fechamentos={fechamentos}
      />

      {/* Abas de Conteúdo */}
      <Tabs value={abaSelecionada} onValueChange={setAbaSelecionada} className="mt-6">
        <TabsList className="grid w-full grid-cols-4 lg:grid-cols-8 h-auto">
          <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
          <TabsTrigger value="dados">Dados Pessoais</TabsTrigger>
          <TabsTrigger value="documentos">Documentos</TabsTrigger>
          <TabsTrigger value="pagamentos">Pagamentos</TabsTrigger>
          <TabsTrigger value="vales">Vales</TabsTrigger>
          <TabsTrigger value="descontos">Descontos</TabsTrigger>
          <TabsTrigger value="comissoes">Comissões</TabsTrigger>
          <TabsTrigger value="solicitacoes">Solicitações</TabsTrigger>
          <TabsTrigger value="advertencias">Advertências</TabsTrigger>
          <TabsTrigger value="ferias">Férias</TabsTrigger>
          <TabsTrigger value="afastamentos">Afastamentos</TabsTrigger>
          <TabsTrigger value="bancohoras">Banco de Horas</TabsTrigger>
          <TabsTrigger value="desempenho">Desempenho</TabsTrigger>
          <TabsTrigger value="cargo-salario">Cargo & Salário</TabsTrigger>
          <TabsTrigger value="timeline">Linha do Tempo</TabsTrigger>
          <TabsTrigger value="auditoria">Auditoria</TabsTrigger>
          <TabsTrigger value="anexos">Anexos</TabsTrigger>
        </TabsList>

        <TabsContent value="dados" className="mt-6">
          <DadosPessoais360 funcionario={funcionario} />
        </TabsContent>

        <TabsContent value="documentos" className="mt-6">
          <Documentos360 funcionario={funcionario} documentos={documentos} />
        </TabsContent>

        <TabsContent value="pagamentos" className="mt-6">
          <HistoricoPagamentos360 funcionario={funcionario} fechamentos={fechamentos} lancamentos={lancamentos} comissoes={comissoes} />
        </TabsContent>

        <TabsContent value="vales" className="mt-6">
          <ValesAdiantamentos360 funcionario={funcionario} vales={vales} />
        </TabsContent>

        <TabsContent value="descontos" className="mt-6">
          <DescontosConsignados360 funcionario={funcionario} lancamentos={lancamentos} />
        </TabsContent>

        <TabsContent value="comissoes" className="mt-6">
          <Comissoes360 funcionario={funcionario} comissoes={comissoes} />
        </TabsContent>

        <TabsContent value="solicitacoes" className="mt-6">
          <Solicitacoes360 funcionario={funcionario} solicitacoes={solicitacoes} />
        </TabsContent>

        <TabsContent value="advertencias" className="mt-6">
          <Advertencias360 funcionario={funcionario} />
        </TabsContent>

        <TabsContent value="ferias" className="mt-6">
          <Ferias360 funcionario={funcionario} />
        </TabsContent>

        <TabsContent value="afastamentos" className="mt-6">
          <Afastamento360 funcionario={funcionario} onRegistrar={() => setRegistrarAfastamentoOpen(true)} />
        </TabsContent>

        <TabsContent value="bancohoras" className="mt-6">
          <BancoHoras360 funcionario={funcionario} />
        </TabsContent>

        <TabsContent value="desempenho" className="mt-6">
          <Desempenho360 funcionario={funcionario} />
        </TabsContent>

        <TabsContent value="cargo-salario" className="mt-6">
          <CargoSalario360 funcionario={funcionario} />
        </TabsContent>

        <TabsContent value="timeline" className="mt-6">
          <LinhaTempoInteligente360 
            funcionario={funcionario}
            lancamentos={lancamentos}
            solicitacoes={solicitacoes}
            documentos={documentos}
            comissoes={comissoes}
            fechamentos={fechamentos}
          />
        </TabsContent>

        <TabsContent value="auditoria" className="mt-6">
          <Auditoria360 funcionario={funcionario} />
        </TabsContent>

        <TabsContent value="anexos" className="mt-6">
          <AnexosGerais360 funcionario={funcionario} />
        </TabsContent>
      </Tabs>

      <AfastamentoFormModal
        open={registrarAfastamentoOpen}
        onClose={() => setRegistrarAfastamentoOpen(false)}
        funcionarios={funcionario ? [funcionario] : []}
        selectedFunc={funcionario}
      />
    </div>
  );
}

import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowLeft, Download } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

import Dashboard360 from '@/components/funcionarios360/Dashboard360';
import DadosPessoais360 from '@/components/funcionarios360/DadosPessoais360';
import Documentos360 from '@/components/funcionarios360/Documentos360';
import HistoricoPagamentos360 from '@/components/funcionarios360/HistoricoPagamentos360';
import {
  ValesAdiantamentos360,
  DescontosConsignados360,
  Comissoes360,
  Solicitacoes360,
  Advertencias360,
  Ferias360,
  BancoHoras360,
  Desempenho360,
  HistoricoSalario360,
  HistoricoFuncaoSetor360,
  LinhaTempoInteligente360,
  Auditoria360,
  AnexosGerais360
} from '@/components/funcionarios360/stub-components';

export default function Funcionarios360() {
  const { funcId } = useParams();
  const navigate = useNavigate();
  const [abaSelecionada, setAbaSelecionada] = useState('dashboard');

  const { data: funcionario, isLoading } = useQuery({
    queryKey: ['funcionario360', funcId],
    queryFn: () => funcId ? base44.entities.Funcionarios.get(funcId) : null,
  });

  const { data: lancamentos = [] } = useQuery({
    queryKey: ['lancamentos360', funcId],
    queryFn: () => base44.entities.FichaFinanceira.filter({ funcionario_id: funcId }),
  });

  const { data: vales = [] } = useQuery({
    queryKey: ['vales360', funcId],
    queryFn: () => base44.entities.FichaFinanceira.filter({ funcionario_id: funcId, tipo_lancamento: 'vale' }),
  });

  const { data: solicitacoes = [] } = useQuery({
    queryKey: ['solicitacoes360', funcId],
    queryFn: () => base44.entities.SolicitacoesFuncionario.filter({ funcionario_id: funcId }),
  });

  const { data: documentos = [] } = useQuery({
    queryKey: ['documentos360', funcId],
    queryFn: () => funcId ? base44.entities.DocumentoFuncionario.filter({ funcionario_id: funcId }) : [],
  });

  const { data: comissoes = [] } = useQuery({
    queryKey: ['comissoes360', funcId],
    queryFn: () => funcId ? base44.entities.ComissaoPorFuncionario.filter({ funcionario_id: funcId }) : [],
  });

  const { data: fechamentos = [] } = useQuery({
    queryKey: ['fechamentos360', funcId],
    queryFn: () => funcId ? base44.entities.FechamentoMensal.filter({ funcionario_id: funcId }) : [],
  });

  if (isLoading) {
    return (
      <div className="space-y-6 p-6">
        <Skeleton className="h-20 w-full" />
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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate('/funcionarios')}>
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold">Visão 360° do Funcionário</h1>
            <p className="text-muted-foreground mt-1">{funcionario.nome}</p>
          </div>
        </div>
      </div>

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
          <TabsTrigger value="bancohoras">Banco de Horas</TabsTrigger>
          <TabsTrigger value="desempenho">Desempenho</TabsTrigger>
          <TabsTrigger value="salario">Salário</TabsTrigger>
          <TabsTrigger value="funcao">Função/Setor</TabsTrigger>
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
          <HistoricoPagamentos360 funcionario={funcionario} fechamentos={fechamentos} lancamentos={lancamentos} />
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

        <TabsContent value="bancohoras" className="mt-6">
          <BancoHoras360 funcionario={funcionario} />
        </TabsContent>

        <TabsContent value="desempenho" className="mt-6">
          <Desempenho360 funcionario={funcionario} />
        </TabsContent>

        <TabsContent value="salario" className="mt-6">
          <HistoricoSalario360 funcionario={funcionario} />
        </TabsContent>

        <TabsContent value="funcao" className="mt-6">
          <HistoricoFuncaoSetor360 funcionario={funcionario} />
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
    </div>
  );
}
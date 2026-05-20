import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

export default function AlertasAutomaticos() {
  const [alertas, setAlertas] = useState({
    // Alertas Diários
    aniversariantes: true,
    feriasvencidas: true,
    feriasvincendas: true,
    periodoacquisitivo: true,
    solicitacoesPendentes: true,
    documentosVencendo: true,
    advertenciasProximas: true,
    muitos_vales: true,
    queda_comissao: true,
    faltas_repetidas: true,
    bancohoras_negativo: true,
    // Alertas Imediatos
    nova_solicitacao: true,
    solicitacao_vencendo_sla: true,
    documento_enviado: true,
    advertencia_registrada: true,
    comissao_lancada: true,
    vale_solicitado: true,
    // Alertas Semanais
    resumo_solicitacoes: true,
    resumo_vales: true,
    resumo_comissoes: true,
    resumo_faltas: true,
    // Alertas Mensais
    resumo_folha: true,
    custos_setor: true,
    desempenho_geral: true,
  });

  const [canaisEntrega, setCanaisEntrega] = useState({
    painel: true,
    notificacao: true,
    push: true,
    email: false,
  });

  const toggleAlerta = (key) => {
    setAlertas(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const toggleCanal = (key) => {
    setCanaisEntrega(prev => ({ ...prev, [key]: !prev[key] }));
  };

  return (
    <div className="space-y-6">
      {/* Configuração de Canais */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Canais de Entrega</CardTitle>
          <CardDescription>Escolha como os alertas serão entregues aos gestores</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
            <Label className="cursor-pointer flex-1">Painel do RH</Label>
            <Switch checked={canaisEntrega.painel} onCheckedChange={() => toggleCanal('painel')} />
          </div>
          <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
            <Label className="cursor-pointer flex-1">Notificação Interna</Label>
            <Switch checked={canaisEntrega.notificacao} onCheckedChange={() => toggleCanal('notificacao')} />
          </div>
          <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
            <Label className="cursor-pointer flex-1">Push Notification</Label>
            <Switch checked={canaisEntrega.push} onCheckedChange={() => toggleCanal('push')} />
          </div>
          <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
            <Label className="cursor-pointer flex-1">E-mail (Opcional)</Label>
            <Switch checked={canaisEntrega.email} onCheckedChange={() => toggleCanal('email')} />
          </div>
        </CardContent>
      </Card>

      {/* Alertas por Tipo */}
      <Tabs defaultValue="diarios">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="diarios">Diários 08:00</TabsTrigger>
          <TabsTrigger value="imediatos">Imediatos</TabsTrigger>
          <TabsTrigger value="semanais">Semanais</TabsTrigger>
          <TabsTrigger value="mensais">Mensais</TabsTrigger>
        </TabsList>

        <TabsContent value="diarios" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Alertas Diários (08:00)</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <AlertItem label="Aniversariantes do dia" checked={alertas.aniversariantes} onChange={() => toggleAlerta('aniversariantes')} />
              <AlertItem label="Férias vencidas" checked={alertas.feriasvencidas} onChange={() => toggleAlerta('feriasvencidas')} />
              <AlertItem label="Férias vincendas (30/60/90 dias)" checked={alertas.feriasvincendas} onChange={() => toggleAlerta('feriasvincendas')} />
              <AlertItem label="Funcionários próximos do período aquisitivo" checked={alertas.periodoacquisitivo} onChange={() => toggleAlerta('periodoacquisitivo')} />
              <AlertItem label="Solicitações pendentes" checked={alertas.solicitacoesPendentes} onChange={() => toggleAlerta('solicitacoesPendentes')} />
              <AlertItem label="Documentos vencendo" checked={alertas.documentosVencendo} onChange={() => toggleAlerta('documentosVencendo')} />
              <AlertItem label="Advertências próximas de expirar" checked={alertas.advertenciasProximas} onChange={() => toggleAlerta('advertenciasProximas')} />
              <AlertItem label="Funcionários com muitos vales" checked={alertas.muitos_vales} onChange={() => toggleAlerta('muitos_vales')} />
              <AlertItem label="Queda brusca de comissão" checked={alertas.queda_comissao} onChange={() => toggleAlerta('queda_comissao')} />
              <AlertItem label="Faltas repetidas" checked={alertas.faltas_repetidas} onChange={() => toggleAlerta('faltas_repetidas')} />
              <AlertItem label="Banco de horas negativo" checked={alertas.bancohoras_negativo} onChange={() => toggleAlerta('bancohoras_negativo')} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="imediatos" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Alertas Imediatos</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <AlertItem label="Nova solicitação enviada" checked={alertas.nova_solicitacao} onChange={() => toggleAlerta('nova_solicitacao')} />
              <AlertItem label="Solicitação vencendo SLA" checked={alertas.solicitacao_vencendo_sla} onChange={() => toggleAlerta('solicitacao_vencendo_sla')} />
              <AlertItem label="Documento enviado" checked={alertas.documento_enviado} onChange={() => toggleAlerta('documento_enviado')} />
              <AlertItem label="Advertência registrada" checked={alertas.advertencia_registrada} onChange={() => toggleAlerta('advertencia_registrada')} />
              <AlertItem label="Comissão lançada" checked={alertas.comissao_lancada} onChange={() => toggleAlerta('comissao_lancada')} />
              <AlertItem label="Vale solicitado" checked={alertas.vale_solicitado} onChange={() => toggleAlerta('vale_solicitado')} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="semanais" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Alertas Semanais</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <AlertItem label="Resumo de solicitações" checked={alertas.resumo_solicitacoes} onChange={() => toggleAlerta('resumo_solicitacoes')} />
              <AlertItem label="Resumo de vales" checked={alertas.resumo_vales} onChange={() => toggleAlerta('resumo_vales')} />
              <AlertItem label="Resumo de comissões" checked={alertas.resumo_comissoes} onChange={() => toggleAlerta('resumo_comissoes')} />
              <AlertItem label="Resumo de faltas/atrasos" checked={alertas.resumo_faltas} onChange={() => toggleAlerta('resumo_faltas')} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="mensais" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Alertas Mensais</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <AlertItem label="Resumo da folha" checked={alertas.resumo_folha} onChange={() => toggleAlerta('resumo_folha')} />
              <AlertItem label="Custos por setor" checked={alertas.custos_setor} onChange={() => toggleAlerta('custos_setor')} />
              <AlertItem label="Desempenho geral" checked={alertas.desempenho_geral} onChange={() => toggleAlerta('desempenho_geral')} />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function AlertItem({ label, checked, onChange }) {
  return (
    <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
      <Label className="cursor-pointer flex-1">{label}</Label>
      <Switch checked={checked} onCheckedChange={onChange} />
    </div>
  );
}
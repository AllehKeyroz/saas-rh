import React, { useState, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Bell, Lock, Settings, Zap, LayoutTemplate } from 'lucide-react';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';
import AlertasAutomaticos from '@/components/centrocontrole/AlertasAutomaticos';
import PermissoesPorCargo from '@/components/centrocontrole/PermissoesPorCargo';
import IntegracaoVidaFinanceira from '@/components/centrocontrole/IntegracaoVidaFinanceira';
import ConfiguracaoModulos from '@/components/centrocontrole/ConfiguracaoModulos';

const VALID_TABS = ['alertas', 'permissoes', 'vida-financeira', 'modulos', 'modelos'];

export default function CentroControleRH() {
  const urlParams = new URLSearchParams(window.location.search);
  const tabFromUrl = urlParams.get('tab');
  const [tab, setTab] = useState(VALID_TABS.includes(tabFromUrl) ? tabFromUrl : 'alertas');
  const queryClient = useQueryClient();

  useEffect(() => {
    const t = new URLSearchParams(window.location.search).get('tab');
    if (t && VALID_TABS.includes(t)) setTab(t);
  }, [window.location.search]);

  const { data: configRH = [], isLoading } = useQuery({
    queryKey: ['configRH'],
    queryFn: () => base44.entities.ConfiguracoesRH.list(),
  });

  const { data: meUser } = useQuery({
    queryKey: ['meUser'],
    queryFn: () => base44.auth.me(),
  });

  // Validar se é RH/Admin
  if (meUser && !['admin', 'rh'].includes(meUser.role)) {
    return (
      <div className="text-center py-16">
        <p className="text-muted-foreground">Acesso restrito ao módulo de RH</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Centro de Controle RH</h1>
        <p className="text-muted-foreground mt-1">Configurar alertas, permissões e integrações</p>
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="grid w-full grid-cols-2 lg:grid-cols-5">
          <TabsTrigger value="alertas" className="gap-2">
            <Bell className="w-4 h-4" />
            <span className="hidden sm:inline">Alertas</span>
          </TabsTrigger>
          <TabsTrigger value="permissoes" className="gap-2">
            <Lock className="w-4 h-4" />
            <span className="hidden sm:inline">Permissões</span>
          </TabsTrigger>
          <TabsTrigger value="vida-financeira" className="gap-2">
            <Zap className="w-4 h-4" />
            <span className="hidden sm:inline">Vida Financeira</span>
          </TabsTrigger>
          <TabsTrigger value="modulos" className="gap-2">
            <Settings className="w-4 h-4" />
            <span className="hidden sm:inline">Módulos</span>
          </TabsTrigger>
          <TabsTrigger value="modelos" className="gap-2">
            <LayoutTemplate className="w-4 h-4" />
            <span className="hidden sm:inline">Modelos</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="alertas" className="mt-6">
          <AlertasAutomaticos />
        </TabsContent>

        <TabsContent value="permissoes" className="mt-6">
          <PermissoesPorCargo />
        </TabsContent>

        <TabsContent value="vida-financeira" className="mt-6">
          <IntegracaoVidaFinanceira />
        </TabsContent>

        <TabsContent value="modulos" className="mt-6">
          <ConfiguracaoModulos configRH={configRH} />
        </TabsContent>

        <TabsContent value="modelos" className="mt-6">
          <div className="border border-border rounded-xl p-6 bg-card text-center space-y-3">
            <LayoutTemplate className="w-10 h-10 mx-auto text-primary opacity-70" />
            <div>
              <h3 className="font-semibold text-foreground">Modelos de Documentos</h3>
              <p className="text-sm text-muted-foreground mt-1">Gerencie modelos de contratos, formulários e documentos com variáveis dinâmicas e integração GovBR</p>
            </div>
            <Link to="/modelos-documentos">
              <Button className="gap-2 mt-2">
                <LayoutTemplate className="w-4 h-4" />Abrir Módulo de Modelos
              </Button>
            </Link>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
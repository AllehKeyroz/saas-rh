import React from 'react';
import { useAccessControl } from '@/hooks/useAccessControl';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import Dashboard360 from './Dashboard360';
import DadosPessoais360 from './DadosPessoais360';
import HistoricoPagamentos360 from './HistoricoPagamentos360';
import Documentos360 from './Documentos360';
import { Lock } from 'lucide-react';

export default function Dashboard360WithTabs({ 
  funcionario, 
  lancamentos, 
  vales, 
  comissoes, 
  solicitacoes, 
  documentos, 
  fechamentos 
}) {
  const { role } = useAccessControl();

  const tabs = [
    { id: 'resumo', label: 'Resumo', icon: '📊', requiredRoles: ['user', 'admin', 'manager'], component: Dashboard360 },
    { id: 'pessoal', label: 'Dados Pessoais', icon: '👤', requiredRoles: ['user', 'admin', 'manager'], component: DadosPessoais360 },
    { id: 'pagamentos', label: 'Pagamentos', icon: '💰', requiredRoles: ['admin', 'manager'], component: HistoricoPagamentos360 },
    { id: 'documentos', label: 'Documentos', icon: '📄', requiredRoles: ['user', 'admin', 'manager'], component: Documentos360 }
  ];

  const visibleTabs = tabs.filter(tab => 
    !tab.requiredRoles || tab.requiredRoles.includes(role)
  );

  return (
    <Tabs defaultValue="resumo" className="space-y-4">
      <TabsList className="bg-secondary">
        {visibleTabs.map((tab) => (
          <TabsTrigger key={tab.id} value={tab.id} className="gap-2">
            <span>{tab.icon}</span>
            <span>{tab.label}</span>
          </TabsTrigger>
        ))}
      </TabsList>

      {visibleTabs.map((tab) => {
        const Component = tab.component;
        return (
          <TabsContent key={tab.id} value={tab.id} className="space-y-4">
            {tab.requiredRoles && !tab.requiredRoles.includes(role) ? (
              <div className="flex items-center gap-3 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                <Lock className="w-5 h-5 text-yellow-600" />
                <p className="text-sm text-yellow-800">Você não tem permissão para visualizar esta abas.</p>
              </div>
            ) : (
              <Component 
                funcionario={funcionario}
                lancamentos={lancamentos}
                vales={vales}
                comissoes={comissoes}
                solicitacoes={solicitacoes}
                documentos={documentos}
                fechamentos={fechamentos}
              />
            )}
          </TabsContent>
        );
      })}
    </Tabs>
  );
}
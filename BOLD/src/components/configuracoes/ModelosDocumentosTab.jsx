import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { LayoutTemplate, Tag } from 'lucide-react';
import ModelosTab from '@/components/modelos/ModelosTab';
import FinalidadesTab from '@/components/modelos/FinalidadesTab';

export default function ModelosDocumentosTab() {
  const [tab, setTab] = useState('modelos');
  const queryClient = useQueryClient();

  const { data: modelos = [], isLoading: loadingModelos } = useQuery({
    queryKey: ['modelos-documentos'],
    queryFn: () => base44.entities.ModeloDocumento.list('-created_date'),
  });

  const { data: finalidades = [], isLoading: loadingFinalidades } = useQuery({
    queryKey: ['finalidades-documentos'],
    queryFn: () => base44.entities.FinalidadeDocumento.list('-created_date'),
  });

  return (
    <Tabs value={tab} onValueChange={setTab}>
      <TabsList>
        <TabsTrigger value="modelos" className="gap-2">
          <LayoutTemplate className="w-4 h-4" />Modelos ({modelos.length})
        </TabsTrigger>
        <TabsTrigger value="finalidades" className="gap-2">
          <Tag className="w-4 h-4" />Finalidades ({finalidades.length})
        </TabsTrigger>
      </TabsList>

      <TabsContent value="modelos" className="mt-4">
        <ModelosTab
          modelos={modelos}
          finalidades={finalidades}
          loading={loadingModelos}
          onRefresh={() => queryClient.invalidateQueries({ queryKey: ['modelos-documentos'] })}
        />
      </TabsContent>

      <TabsContent value="finalidades" className="mt-4">
        <FinalidadesTab
          finalidades={finalidades}
          loading={loadingFinalidades}
          onRefresh={() => queryClient.invalidateQueries({ queryKey: ['finalidades-documentos'] })}
        />
      </TabsContent>
    </Tabs>
  );
}
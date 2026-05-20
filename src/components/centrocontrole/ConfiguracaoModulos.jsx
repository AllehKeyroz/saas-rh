import React, { useState, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { client } from '@/api/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';

const MODULO_FEATURE_MAP = {
  comissoes: 'comissoes_por_periodo',
  vida_financeira: 'vida_financeira',
  solicitacoes: 'modulo_solicitacoes',
  comunicacao: 'modulo_mensagens',
};

const MODULOS_DISPONIVEIS = [
  { id: 'folha_pagamento', nome: 'Folha de Pagamento', descricao: 'Gerenciar fechamentos mensais, lançamentos e demonstrativos', icone: '💰' },
  { id: 'funcionarios', nome: 'Funcionários', descricao: 'Cadastro, dados pessoais e documentação', icone: '👥' },
  { id: 'comissoes', nome: 'Comissões', descricao: 'Cálculo, distribuição e histórico de comissões', icone: '📊' },
  { id: 'solicitacoes', nome: 'Solicitações', descricao: 'Férias, vales, banco de horas, documentos', icone: '📋' },
  { id: 'comunicacao', nome: 'Comunicação', descricao: 'Mensagens internas e avisos para colaboradores', icone: '📢' },
  { id: 'banco_horas', nome: 'Banco de Horas', descricao: 'Controle de horas extras e compensações', icone: '⏰' },
  { id: 'ferias', nome: 'Férias', descricao: 'Aquisição, concessão e controle de férias', icone: '🏖️' },
  { id: 'advertencias', nome: 'Advertências', descricao: 'Registro de ocorrências e advertências', icone: '⚠️' },
  { id: 'desempenho', nome: 'Desempenho', descricao: 'Avaliações e métricas de colaboradores', icone: '⭐' },
  { id: 'documentos', nome: 'Documentos', descricao: 'Armazenamento e versionamento de documentos', icone: '📄' },
  { id: 'vida_financeira', nome: 'Vida Financeira', descricao: 'Portal financeiro pessoal dos colaboradores', icone: '💳' },
  { id: 'visao_360', nome: 'Visão 360°', descricao: 'Perfil completo do funcionário com 16 abas', icone: '👁️' },
];

export default function ConfiguracaoModulos({ configRH }) {
  const queryClient = useQueryClient();
  const [modulos, setModulos] = useState({});
  const [loadingFeature, setLoadingFeature] = useState(null);

  // Inicializa estado dos módulos a partir do Firestore
  useEffect(() => {
    if (!configRH) return;
    const state = {};
    MODULOS_DISPONIVEIS.forEach(mod => {
      const featureKey = MODULO_FEATURE_MAP[mod.id];
      if (featureKey) {
        const cfg = configRH.find(c => c.chave === featureKey);
        state[mod.id] = cfg?.ativa === true;
      } else {
        // Módulos sem feature key: ativos por padrão
        state[mod.id] = true;
      }
    });
    setModulos(state);
  }, [configRH]);

  const toggleModulo = async (key) => {
    const novaAtiva = !modulos[key];
    setModulos(prev => ({ ...prev, [key]: novaAtiva }));

    const featureKey = MODULO_FEATURE_MAP[key];
    if (!featureKey) {
      toast.success(`Módulo ${novaAtiva ? 'ativado' : 'desativado'}`);
      return;
    }

    setLoadingFeature(key);
    try {
      const existente = configRH.find(c => c.chave === featureKey);
      if (existente) {
        await client.entities.ConfiguracoesRH.update(existente.id, { ativa: novaAtiva });
      } else {
        await client.entities.ConfiguracoesRH.create({
          chave: featureKey,
          descricao: MODULOS_DISPONIVEIS.find(m => m.id === key)?.nome || key,
          ativa: novaAtiva,
          data_ativacao: new Date().toISOString(),
        });
      }
      queryClient.invalidateQueries({ queryKey: ['configuracoes_rh'] });
      toast.success(`Módulo ${novaAtiva ? 'ativado' : 'desativado'} com sucesso!`);
    } catch (e) {
      setModulos(prev => ({ ...prev, [key]: !novaAtiva }));
      toast.error('Erro ao salvar: ' + e.message);
    } finally {
      setLoadingFeature(null);
    }
  };

  const modulosAtivos = Object.values(modulos).filter(v => v).length;
  const carregando = Object.keys(modulos).length === 0;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-bold mb-2">Configuração de Módulos</h2>
        <p className="text-sm text-muted-foreground mb-4">
          Ative ou desative módulos do sistema RH conforme necessário
        </p>
        <Badge variant="outline" className="mb-4">
          {carregando ? '...' : `${modulosAtivos} de ${MODULOS_DISPONIVEIS.length} módulos ativos`}
        </Badge>
      </div>

      {carregando ? (
        <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {MODULOS_DISPONIVEIS.map(modulo => (
            <Card key={modulo.id} className={!modulos[modulo.id] ? 'opacity-60' : ''}>
              <CardContent className="pt-6">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-2xl">{modulo.icone}</span>
                      <Label className="text-base font-semibold cursor-pointer">{modulo.nome}</Label>
                    </div>
                    <p className="text-sm text-muted-foreground">{modulo.descricao}</p>
                  </div>
                  <Switch
                    checked={modulos[modulo.id] ?? true}
                    onCheckedChange={() => toggleModulo(modulo.id)}
                    disabled={loadingFeature === modulo.id}
                  />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Card className="bg-blue-50 border-blue-200">
        <CardHeader>
          <CardTitle className="text-base">💡 Dica</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-blue-900">
          <p>Desative módulos que sua empresa não utiliza para simplificar a interface e reduzir a complexidade do sistema.</p>
        </CardContent>
      </Card>
    </div>
  );
}

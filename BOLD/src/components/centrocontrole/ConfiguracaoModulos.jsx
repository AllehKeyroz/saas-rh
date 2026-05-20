import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';

export default function ConfiguracaoModulos({ configRH }) {
  const [modulos, setModulos] = useState({
    folha_pagamento: true,
    funcionarios: true,
    comissoes: true,
    solicitacoes: true,
    comunicacao: true,
    banco_horas: true,
    ferias: true,
    advertencias: true,
    desempenho: true,
    documentos: true,
    vida_financeira: true,
    visao_360: true,
  });

  const toggleModulo = (key) => {
    setModulos(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const MODULOS_DISPONIVEIS = [
    {
      id: 'folha_pagamento',
      nome: 'Folha de Pagamento',
      descricao: 'Gerenciar fechamentos mensais, lançamentos e demonstrativos',
      icone: '💰'
    },
    {
      id: 'funcionarios',
      nome: 'Funcionários',
      descricao: 'Cadastro, dados pessoais e documentação',
      icone: '👥'
    },
    {
      id: 'comissoes',
      nome: 'Comissões',
      descricao: 'Cálculo, distribuição e histórico de comissões',
      icone: '📊'
    },
    {
      id: 'solicitacoes',
      nome: 'Solicitações',
      descricao: 'Férias, vales, banco de horas, documentos',
      icone: '📋'
    },
    {
      id: 'comunicacao',
      nome: 'Comunicação',
      descricao: 'Mensagens internas e avisos para colaboradores',
      icone: '📢'
    },
    {
      id: 'banco_horas',
      nome: 'Banco de Horas',
      descricao: 'Controle de horas extras e compensações',
      icone: '⏰'
    },
    {
      id: 'ferias',
      nome: 'Férias',
      descricao: 'Aquisição, concessão e controle de férias',
      icone: '🏖️'
    },
    {
      id: 'advertencias',
      nome: 'Advertências',
      descricao: 'Registro de ocorrências e advertências',
      icone: '⚠️'
    },
    {
      id: 'desempenho',
      nome: 'Desempenho',
      descricao: 'Avaliações e métricas de colaboradores',
      icone: '⭐'
    },
    {
      id: 'documentos',
      nome: 'Documentos',
      descricao: 'Armazenamento e versionamento de documentos',
      icone: '📄'
    },
    {
      id: 'vida_financeira',
      nome: 'Vida Financeira',
      descricao: 'Portal financeiro pessoal dos colaboradores',
      icone: '💳'
    },
    {
      id: 'visao_360',
      nome: 'Visão 360°',
      descricao: 'Perfil completo do funcionário com 16 abas',
      icone: '👁️'
    },
  ];

  const modulosAtivos = Object.values(modulos).filter(v => v).length;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-bold mb-2">Configuração de Módulos</h2>
        <p className="text-sm text-muted-foreground mb-4">
          Ative ou desative módulos do sistema RH conforme necessário
        </p>
        <Badge variant="outline" className="mb-4">
          {modulosAtivos} de {MODULOS_DISPONIVEIS.length} módulos ativos
        </Badge>
      </div>

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
                  checked={modulos[modulo.id]} 
                  onCheckedChange={() => toggleModulo(modulo.id)}
                />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Info Box */}
      <Card className="bg-blue-50 border-blue-200">
        <CardHeader>
          <CardTitle className="text-base">💡 Dica</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-blue-900">
          <p>
            Desative módulos que sua empresa não utiliza para simplificar a interface e reduzir a complexidade do sistema.
          </p>
        </CardContent>
      </Card>

      {/* Módulos Recomendados */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">🎯 Configuração Recomendada</CardTitle>
        </CardHeader>
        <CardContent className="text-sm space-y-2 text-muted-foreground">
          <p>• <strong>Obrigatórios:</strong> Funcionários, Folha, Solicitações</p>
          <p>• <strong>Recomendados:</strong> Comunicação, Documentos, Visão 360°</p>
          <p>• <strong>Opcional (se aplica):</strong> Comissões, Banco de Horas, Férias</p>
        </CardContent>
      </Card>
    </div>
  );
}
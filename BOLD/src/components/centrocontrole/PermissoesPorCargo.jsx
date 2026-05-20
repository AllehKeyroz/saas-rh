import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { CheckCircle2, Circle } from 'lucide-react';

const PERMISSOES = {
  'admin': {
    label: 'Administrador',
    color: 'bg-red-100 text-red-800',
    descricao: 'Acesso total ao sistema',
    permissoes: ['tudo']
  },
  'rh': {
    label: 'RH',
    color: 'bg-blue-100 text-blue-800',
    descricao: 'Acesso completo ao módulo de RH',
    permissoes: ['verfuncionarios', 'verfolha', 'versolicitacoes', 'vercomunicacao', 'verrelatorios', 'vercentrocontrole']
  },
  'gerente': {
    label: 'Gerente',
    color: 'bg-green-100 text-green-800',
    descricao: 'Acesso limitado à sua equipe',
    permissoes: ['verequipe', 'versolicitacoes', 'vercomunicacao']
  },
  'financeiro': {
    label: 'Financeiro',
    color: 'bg-yellow-100 text-yellow-800',
    descricao: 'Acesso apenas à folha de pagamento',
    permissoes: ['verfolha', 'verrelatorios']
  },
  'diretoria': {
    label: 'Diretoria',
    color: 'bg-purple-100 text-purple-800',
    descricao: 'Acesso a indicadores e relatórios',
    permissoes: ['verindicadores', 'verrelatorios', 'vercomissoes']
  },
  'colaborador': {
    label: 'Colaborador',
    color: 'bg-gray-100 text-gray-800',
    descricao: 'Acesso apenas aos dados pessoais',
    permissoes: ['verpróprio', 'verprópriavida financeira']
  },
};

const MODULOS = [
  { id: 'verfuncionarios', nome: 'Visualizar Funcionários' },
  { id: 'verfolha', nome: 'Folha de Pagamento' },
  { id: 'versolicitacoes', nome: 'Solicitações' },
  { id: 'vercomunicacao', nome: 'Comunicação' },
  { id: 'verrelatorios', nome: 'Relatórios' },
  { id: 'vercentrocontrole', nome: 'Centro de Controle' },
  { id: 'verequipe', nome: 'Visualizar Equipe' },
  { id: 'verindicadores', nome: 'Indicadores' },
  { id: 'vercomissoes', nome: 'Comissões' },
  { id: 'verpróprio', nome: 'Dados Pessoais' },
  { id: 'verprópriavida financeira', nome: 'Vida Financeira Pessoal' },
];

export default function PermissoesPorCargo() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-bold mb-2">Sistema de Permissões por Cargo</h2>
        <p className="text-sm text-muted-foreground mb-6">
          Cada cargo tem acesso diferenciado aos módulos de RH. Abaixo está a matriz de permissões.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Matriz de Permissões</CardTitle>
        </CardHeader>
        <CardContent className="p-0 overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="min-w-32">Módulo/Funcionalidade</TableHead>
                {Object.entries(PERMISSOES).map(([key, value]) => (
                  <TableHead key={key} className="text-center min-w-28">
                    <div className="font-semibold text-xs">{value.label}</div>
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {MODULOS.map(modulo => (
                <TableRow key={modulo.id}>
                  <TableCell className="font-medium text-sm">{modulo.nome}</TableCell>
                  {Object.entries(PERMISSOES).map(([cargoKey, cargo]) => (
                    <TableCell key={cargoKey} className="text-center">
                      {cargo.permissoes.includes('tudo') || cargo.permissoes.includes(modulo.id) ? (
                        <CheckCircle2 className="w-4 h-4 mx-auto text-green-600" />
                      ) : (
                        <Circle className="w-4 h-4 mx-auto text-muted-foreground opacity-30" />
                      )}
                    </TableCell>
                  ))}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Detalhes por Cargo */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {Object.entries(PERMISSOES).map(([key, cargo]) => (
          <Card key={key}>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Badge className={cargo.color}>{cargo.label}</Badge>
              </div>
              <CardDescription>{cargo.descricao}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {cargo.permissoes.includes('tudo') ? (
                  <p className="text-sm font-medium">✅ Acesso a todos os módulos</p>
                ) : (
                  <>
                    {cargo.permissoes.map(perm => {
                      const modulo = MODULOS.find(m => m.id === perm);
                      return (
                        <div key={perm} className="flex items-center gap-2 text-sm">
                          <CheckCircle2 className="w-3.5 h-3.5 text-green-600 shrink-0" />
                          <span>{modulo?.nome || perm}</span>
                        </div>
                      );
                    })}
                  </>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Nota Importante */}
      <Card className="bg-blue-50 border-blue-200">
        <CardHeader>
          <CardTitle className="text-base">💡 Nota Importante</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-blue-900">
          <ul className="list-disc list-inside space-y-1">
            <li><strong>Gerente:</strong> Vê apenas funcionários de sua equipe</li>
            <li><strong>Financeiro:</strong> Vê apenas lançamentos de folha e relatórios financeiros</li>
            <li><strong>Colaborador:</strong> Vê apenas seus próprios dados</li>
            <li><strong>Diretoria:</strong> Acesso a indicadores de negócio e performance</li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
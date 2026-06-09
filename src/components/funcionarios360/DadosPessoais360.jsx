import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { formatDate, formatCurrency } from '@/lib/formatters';

export default function DadosPessoais360({ funcionario }) {
  return (
    <div className="space-y-6">
      {/* Dados Básicos */}
      <Card>
        <CardHeader>
          <CardTitle>Dados Cadastrais</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-2 md:grid-cols-3 gap-6">
          <div>
            <label className="text-xs font-semibold text-muted-foreground">Nome</label>
            <p className="text-sm font-medium mt-1">{funcionario.nome}</p>
          </div>
          <div>
            <label className="text-xs font-semibold text-muted-foreground">E-mail</label>
            <p className="text-sm font-medium mt-1">{funcionario.email || '-'}</p>
          </div>
          <div>
            <label className="text-xs font-semibold text-muted-foreground">Telefone</label>
            <p className="text-sm font-medium mt-1">{funcionario.telefone || '-'}</p>
          </div>
          <div>
            <label className="text-xs font-semibold text-muted-foreground">Data de Nascimento</label>
            <p className="text-sm font-medium mt-1">{funcionario.data_nascimento ? formatDate(funcionario.data_nascimento) : '-'}</p>
          </div>
          <div>
            <label className="text-xs font-semibold text-muted-foreground">CPF</label>
            <p className="text-sm font-medium mt-1">Não disponível</p>
          </div>
        </CardContent>
      </Card>

      {/* Dados Contratuais */}
      <Card>
        <CardHeader>
          <CardTitle>Dados Contratuais</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-2 md:grid-cols-3 gap-6">
          <div>
            <label className="text-xs font-semibold text-muted-foreground">Função</label>
            <p className="text-sm font-medium mt-1">{funcionario.funcao || '-'}</p>
          </div>
          <div>
            <label className="text-xs font-semibold text-muted-foreground">Setor</label>
            <p className="text-sm font-medium mt-1">{funcionario.setor || '-'}</p>
          </div>
          <div>
            <label className="text-xs font-semibold text-muted-foreground">Data de Admissão</label>
            <p className="text-sm font-medium mt-1">{funcionario.data_admissao ? formatDate(funcionario.data_admissao) : '-'}</p>
          </div>
          <div>
            <label className="text-xs font-semibold text-muted-foreground">Salário Base</label>
            <p className="text-sm font-medium mt-1">{formatCurrency(funcionario.salario_base || 0)}</p>
          </div>
          <div>
            <label className="text-xs font-semibold text-muted-foreground">Ajuda de Custo</label>
            <p className="text-sm font-medium mt-1">{formatCurrency(funcionario.ajuda_custo || 0)}</p>
          </div>
          <div>
            <label className="text-xs font-semibold text-muted-foreground">Limite de Vales</label>
            <p className="text-sm font-medium mt-1">{formatCurrency(funcionario.limite_vales || 0)}</p>
          </div>
          <div>
            <label className="text-xs font-semibold text-muted-foreground">Status</label>
            <p className="text-sm font-medium mt-1">
              {funcionario.data_demissao ? 'Desligado' : funcionario.ativo !== false ? 'Ativo' : 'Inativo'}
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Histórico de Alterações */}
      <Card>
        <CardHeader>
          <CardTitle>Histórico de Alterações</CardTitle>
        </CardHeader>
        <CardContent className="text-center text-muted-foreground py-8">
          <p>Histórico será preenchido via integração com auditoria</p>
        </CardContent>
      </Card>
    </div>
  );
}
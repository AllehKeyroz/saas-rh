// Componentes stub para completar a Visão 360°
// Cada um será expandido conforme necessário

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { formatCurrency, formatDate } from '@/lib/formatters';

export function ValesAdiantamentos360({ funcionario, vales }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Histórico de Vales e Adiantamentos</CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Data</TableHead>
              <TableHead>Tipo</TableHead>
              <TableHead>Valor</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {vales.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                  Nenhum vale registrado
                </TableCell>
              </TableRow>
            ) : (
              vales.map(v => (
                <TableRow key={v.id}>
                  <TableCell>{formatDate(v.data_lancamento)}</TableCell>
                  <TableCell>{v.tipo_lancamento}</TableCell>
                  <TableCell>{formatCurrency(v.valor)}</TableCell>
                  <TableCell>Processado</TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}

export function DescontosConsignados360({ funcionario, lancamentos }) {
  const consignados = lancamentos.filter(l => ['credito_consignado', 'convenio'].includes(l.tipo_lancamento));
  
  return (
    <Card>
      <CardHeader>
        <CardTitle>Descontos e Consignados</CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Data</TableHead>
              <TableHead>Tipo</TableHead>
              <TableHead>Descrição</TableHead>
              <TableHead>Valor</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {consignados.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                  Nenhum consignado registrado
                </TableCell>
              </TableRow>
            ) : (
              consignados.map(c => (
                <TableRow key={c.id}>
                  <TableCell>{formatDate(c.data_lancamento)}</TableCell>
                  <TableCell>{c.tipo_lancamento}</TableCell>
                  <TableCell>{c.descricao || '-'}</TableCell>
                  <TableCell className="text-red-600">{formatCurrency(c.valor)}</TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}

export function Comissoes360({ funcionario, comissoes }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Histórico de Comissões</CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Período</TableHead>
              <TableHead>Valor Setor</TableHead>
              <TableHead>Valor Individual</TableHead>
              <TableHead>Proporcionalidade</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {comissoes.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                  Nenhuma comissão registrada
                </TableCell>
              </TableRow>
            ) : (
              comissoes.map(c => (
                <TableRow key={c.id}>
                  <TableCell className="font-medium">{c.mes_referencia}</TableCell>
                  <TableCell>{formatCurrency(c.valor_setor)}</TableCell>
                  <TableCell className="font-bold">{formatCurrency(c.valor_individual_final)}</TableCell>
                  <TableCell>{(c.proporcao * 100).toFixed(1)}%</TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}

export function Solicitacoes360({ funcionario, solicitacoes }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Solicitações Registradas</CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Data</TableHead>
              <TableHead>Tipo</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Resposta</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {solicitacoes.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                  Nenhuma solicitação registrada
                </TableCell>
              </TableRow>
            ) : (
              solicitacoes.map(s => (
                <TableRow key={s.id}>
                  <TableCell>{formatDate(s.created_date)}</TableCell>
                  <TableCell>{s.tipo_solicitacao}</TableCell>
                  <TableCell>{s.status}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{s.resposta_rh || '-'}</TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}

export function Advertencias360({ funcionario }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Advertências e Ocorrências</CardTitle>
      </CardHeader>
      <CardContent className="text-center py-8 text-muted-foreground">
        <p>Módulo de advertências será integrado</p>
      </CardContent>
    </Card>
  );
}

export function Ferias360({ funcionario }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Férias</CardTitle>
      </CardHeader>
      <CardContent className="text-center py-8 text-muted-foreground">
        <p>Histórico de férias será integrado</p>
      </CardContent>
    </Card>
  );
}

export function BancoHoras360({ funcionario }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Banco de Horas</CardTitle>
      </CardHeader>
      <CardContent className="text-center py-8 text-muted-foreground">
        <p>Histórico de banco de horas será integrado</p>
      </CardContent>
    </Card>
  );
}

export function Desempenho360({ funcionario }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Avaliações de Desempenho</CardTitle>
      </CardHeader>
      <CardContent className="text-center py-8 text-muted-foreground">
        <p>Histórico de avaliações será integrado</p>
      </CardContent>
    </Card>
  );
}

export function HistoricoSalario360({ funcionario }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Histórico de Salário</CardTitle>
      </CardHeader>
      <CardContent className="text-center py-8 text-muted-foreground">
        <p>Aumentos e alterações salariais serão integradas</p>
      </CardContent>
    </Card>
  );
}

export function HistoricoFuncaoSetor360({ funcionario }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Histórico de Função e Setor</CardTitle>
      </CardHeader>
      <CardContent className="text-center py-8 text-muted-foreground">
        <p>Mudanças de cargo e setor serão integradas</p>
      </CardContent>
    </Card>
  );
}

export function LinhaTempoInteligente360({ funcionario, lancamentos, solicitacoes, documentos, comissoes, fechamentos }) {
  const eventos = [];

  if (funcionario.data_admissao) {
    eventos.push({
      data: funcionario.data_admissao,
      tipo: 'admissao',
      titulo: 'Admissão',
      descricao: `${funcionario.nome} foi admitido`
    });
  }

  documentos.forEach(d => {
    eventos.push({
      data: d.created_date,
      tipo: 'documento',
      titulo: 'Documento Enviado',
      descricao: d.nome_arquivo
    });
  });

  solicitacoes.forEach(s => {
    eventos.push({
      data: s.created_date,
      tipo: 'solicitacao',
      titulo: `Solicitação: ${s.tipo_solicitacao}`,
      descricao: `Status: ${s.status}`
    });
  });

  comissoes.forEach(c => {
    eventos.push({
      data: `${c.mes_referencia}-01`,
      tipo: 'comissao',
      titulo: 'Comissão Lançada',
      descricao: `Período: ${c.mes_referencia}`
    });
  });

  fechamentos.forEach(f => {
    eventos.push({
      data: `${f.mes_referencia}-01`,
      tipo: 'fechamento',
      titulo: 'Fechamento Mensal',
      descricao: f.mes_referencia
    });
  });

  const eventosOrdenados = eventos.sort((a, b) => new Date(b.data) - new Date(a.data));

  return (
    <Card>
      <CardHeader>
        <CardTitle>Linha do Tempo Inteligente</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="relative">
          {eventosOrdenados.map((evento, idx) => (
            <div key={idx} className="flex gap-4 pb-6 relative">
              <div className="w-2 h-2 rounded-full bg-primary mt-2 shrink-0" />
              <div className="flex-1">
                <p className="font-medium text-sm">{evento.titulo}</p>
                <p className="text-xs text-muted-foreground mt-1">{evento.descricao}</p>
                <p className="text-xs text-muted-foreground mt-2">{formatDate(evento.data)}</p>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

export function Auditoria360({ funcionario }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Auditoria de Alterações</CardTitle>
      </CardHeader>
      <CardContent className="text-center py-8 text-muted-foreground">
        <p>Alterações realizadas no cadastro serão registradas aqui</p>
      </CardContent>
    </Card>
  );
}

export function AnexosGerais360({ funcionario }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Anexos Gerais</CardTitle>
      </CardHeader>
      <CardContent className="text-center py-8 text-muted-foreground">
        <p>Documentos diversos e contratos podem ser armazenados aqui</p>
      </CardContent>
    </Card>
  );
}
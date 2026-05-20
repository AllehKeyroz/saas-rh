import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { formatCurrency, formatDate } from '@/lib/formatters';

export default function HistoricoPagamentos360({ funcionario, fechamentos, lancamentos }) {
  const comissoes = lancamentos.filter(l => l.tipo_lancamento === 'comissao');
  const descontos = lancamentos.filter(l => l.tipo_lancamento === 'desconto');
  const consignados = lancamentos.filter(l => l.tipo_lancamento === 'credito_consignado');

  return (
    <div className="space-y-6">
      {/* Fechamentos Mensais */}
      <Card>
        <CardHeader>
          <CardTitle>Fechamentos Mensais</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Mês</TableHead>
                  <TableHead>Sal. Base</TableHead>
                  <TableHead>Descontos</TableHead>
                  <TableHead>Adicionais</TableHead>
                  <TableHead>Líquido</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {fechamentos.map(f => (
                  <TableRow key={f.id}>
                    <TableCell className="font-medium">{f.mes_referencia}</TableCell>
                    <TableCell>{formatCurrency(f.salario_base)}</TableCell>
                    <TableCell className="text-red-600">{formatCurrency(f.total_descontos)}</TableCell>
                    <TableCell className="text-green-600">{formatCurrency(f.total_adicionais)}</TableCell>
                    <TableCell className="font-bold">{formatCurrency(f.salario_liquido)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Comissões */}
      {comissoes.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Comissões Pagas</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Data</TableHead>
                  <TableHead>Descrição</TableHead>
                  <TableHead>Valor</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {comissoes.map(c => (
                  <TableRow key={c.id}>
                    <TableCell>{formatDate(c.data_lancamento)}</TableCell>
                    <TableCell>{c.descricao || '-'}</TableCell>
                    <TableCell className="font-bold text-green-600">{formatCurrency(c.valor)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Descontos */}
      {descontos.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Descontos Aplicados</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Data</TableHead>
                  <TableHead>Descrição</TableHead>
                  <TableHead>Valor</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {descontos.map(d => (
                  <TableRow key={d.id}>
                    <TableCell>{formatDate(d.data_lancamento)}</TableCell>
                    <TableCell>{d.descricao || '-'}</TableCell>
                    <TableCell className="font-bold text-red-600">{formatCurrency(d.valor)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
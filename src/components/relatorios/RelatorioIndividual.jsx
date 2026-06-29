import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ExternalLink, User, FileDown, Loader2 } from 'lucide-react';
import { formatCurrency, formatDate, TIPO_LABELS, TIPO_COLORS, parseDateLocal, getMesRef } from '@/lib/formatters';
import { exportDemonstrativoPDF } from '@/lib/pdfExport';
import ExportHistoricoFinanceiro from './ExportHistoricoFinanceiro';

export default function RelatorioIndividual({ funcionario, lancamentos, fechamentos, mesRef }) {
  const [exporting, setExporting] = useState(false);
  if (!funcionario) return null;

  const handleExport = async () => {
    setExporting(true);
    await exportDemonstrativoPDF(funcionario, lancamentos, fechamentos, mesRef);
    setExporting(false);
  };

  const funcLanc = lancamentos
    .filter(l => l.funcionario_id === funcionario.id)
    .sort((a, b) => (b.data_lancamento || '').localeCompare(a.data_lancamento || ''));

  const funcFech = fechamentos
    .filter(f => f.funcionario_id === funcionario.id)
    .sort((a, b) => b.mes_referencia.localeCompare(a.mes_referencia));

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-2xl bg-muted flex items-center justify-center overflow-hidden">
              {funcionario.foto ? (
                <img src={funcionario.foto} alt="" className="w-full h-full object-cover" />
              ) : (
                <User className="w-8 h-8 text-muted-foreground" />
              )}
            </div>
            <div className="flex-1">
              <CardTitle className="text-xl">{funcionario.nome}</CardTitle>
              <p className="text-sm text-muted-foreground">
                {funcionario.funcao || 'Sem função'} • {funcionario.setor || 'Sem setor'}
              </p>
              <p className="text-sm text-muted-foreground">
                Salário base: {formatCurrency(funcionario.salario_base || 0)}{funcionario.ajuda_custo > 0 ? ` + Ajuda de Custo: ${formatCurrency(funcionario.ajuda_custo)}` : ''} •
                Limite vales: {funcionario.limite_vales != null ? formatCurrency(funcionario.limite_vales) : 'Sem limite'}
              </p>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={handleExport} disabled={exporting}>
                {exporting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <FileDown className="w-4 h-4 mr-2" />}
                Demonstrativo
              </Button>
              <ExportHistoricoFinanceiro 
                funcionario={funcionario} 
                lancamentos={lancamentos} 
                fechamentos={fechamentos}
              />
            </div>
          </div>
        </CardHeader>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Histórico de Fechamentos</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Mês Ref.</TableHead>
                  <TableHead>Sal. Base</TableHead>
                  <TableHead>Descontos</TableHead>
                  <TableHead>Adicionais</TableHead>
                  <TableHead>Sal. Líquido</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {funcFech.map(f => (
                  <TableRow key={f.id}>
                    <TableCell className="font-medium">{f.mes_referencia}</TableCell>
                    <TableCell>{formatCurrency(f.salario_base)}</TableCell>
                    <TableCell className="text-red-600">{formatCurrency(f.total_descontos)}</TableCell>
                    <TableCell className="text-green-600">{formatCurrency(f.total_adicionais)}</TableCell>
                    <TableCell className="font-bold">{formatCurrency(f.salario_liquido)}</TableCell>
                  </TableRow>
                ))}
                {funcFech.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center text-muted-foreground py-8">Nenhum fechamento</TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Lançamentos Detalhados ({funcLanc.length})</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Data</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Descrição</TableHead>
                  <TableHead>Valor</TableHead>
                  <TableHead>Comprov.</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {funcLanc.map(l => (
                  <TableRow key={l.id}>
                    <TableCell>{formatDate(l.data_lancamento)}</TableCell>
                    <TableCell>
                      <Badge variant="secondary" className={TIPO_COLORS[l.tipo_lancamento]}>
                        {TIPO_LABELS[l.tipo_lancamento] || l.tipo_lancamento}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground">{l.descricao || '-'}</TableCell>
                    <TableCell className="font-semibold">{formatCurrency(l.valor)}</TableCell>
                    <TableCell>
                      {l.comprovante ? (
                        <a href={l.comprovante} target="_blank" rel="noopener noreferrer" className="text-primary">
                          <ExternalLink className="w-4 h-4" />
                        </a>
                      ) : '-'}
                    </TableCell>
                  </TableRow>
                ))}
                {funcLanc.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center text-muted-foreground py-8">Nenhum lançamento</TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { ExternalLink } from 'lucide-react';
import { formatCurrency, formatDate, TIPO_LABELS, TIPO_COLORS } from '@/lib/formatters';

export default function DrilldownModal({ open, onClose, titulo, lancamentos }) {
  const total = lancamentos.reduce((s, l) => s + (l.valor || 0), 0);

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{titulo}</DialogTitle>
          <p className="text-sm text-muted-foreground">{lancamentos.length} lançamento(s) • Total: <strong>{formatCurrency(total)}</strong></p>
        </DialogHeader>

        {lancamentos.length === 0 ? (
          <p className="text-center text-muted-foreground py-8">Nenhum lançamento</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Funcionário</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>Descrição</TableHead>
                <TableHead>Valor</TableHead>
                <TableHead>Data</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {lancamentos.map(l => (
                <TableRow key={l.id}>
                  <TableCell className="font-medium text-sm">{l.funcionario_nome || '-'}</TableCell>
                  <TableCell>
                    <Badge variant="secondary" className={`${TIPO_COLORS[l.tipo_lancamento]} text-xs`}>
                      {TIPO_LABELS[l.tipo_lancamento] || l.tipo_lancamento}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground text-sm">{l.descricao || '-'}</TableCell>
                  <TableCell className="font-semibold text-sm">{formatCurrency(l.valor)}</TableCell>
                  <TableCell className="text-sm">{formatDate(l.data_lancamento)}</TableCell>
                  <TableCell>
                    {l.comprovante && (
                      <a href={l.comprovante} target="_blank" rel="noopener noreferrer" className="text-primary">
                        <ExternalLink className="w-3.5 h-3.5" />
                      </a>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </DialogContent>
    </Dialog>
  );
}
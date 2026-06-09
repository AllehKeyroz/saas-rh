import React from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { client } from '@/api/client';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { ExternalLink, Trash2, User } from 'lucide-react';
import { formatCurrency, formatDate, TIPO_LABELS, TIPO_COLORS, TIPOS_DESCONTO, TIPOS_ADICIONAL } from '@/lib/formatters';

export default function DetalhesFuncionarioModal({ open, onClose, funcionario, lancamentos, mesRef }) {
  const queryClient = useQueryClient();

  const handleDelete = async (lanc) => {
    if (lanc.consolidado) return;
    await client.entities.FichaFinanceira.delete(lanc.id);
    queryClient.invalidateQueries({ queryKey: ['lancamentos'] });
  };

  const totalDescontos = lancamentos.filter(l => TIPOS_DESCONTO.includes(l.tipo_lancamento)).reduce((s, l) => s + (l.valor || 0), 0);
  const totalAdicionais = lancamentos.filter(l => TIPOS_ADICIONAL.includes(l.tipo_lancamento)).reduce((s, l) => s + (l.valor || 0), 0);
  const salarioLiquido = (funcionario?.salario_base || 0) + (funcionario?.ajuda_custo || 0) + totalAdicionais - totalDescontos;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-muted flex items-center justify-center overflow-hidden shrink-0">
              {funcionario?.foto ? (
                <img src={funcionario.foto} alt="" className="w-full h-full object-cover" />
              ) : (
                <User className="w-5 h-5 text-muted-foreground" />
              )}
            </div>
            <div>
              <DialogTitle>{funcionario?.nome}</DialogTitle>
              <p className="text-sm text-muted-foreground">{mesRef} • {lancamentos.length} lançamento(s)</p>
            </div>
          </div>
        </DialogHeader>

        {/* Resumo */}
        <div className="grid grid-cols-3 gap-3 py-2">
          <div className="bg-muted/50 rounded-lg p-3 text-center">
            <p className="text-xs text-muted-foreground">Sal. Base</p>
            <p className="font-bold text-sm">{formatCurrency(funcionario?.salario_base || 0)}</p>
          </div>
          {funcionario?.ajuda_custo > 0 && (
            <div className="bg-blue-50 rounded-lg p-3 text-center">
              <p className="text-xs text-muted-foreground">Ajuda de Custo</p>
              <p className="font-bold text-sm text-blue-600">{formatCurrency(funcionario.ajuda_custo)}</p>
            </div>
          )}
          <div className="bg-red-50 rounded-lg p-3 text-center">
            <p className="text-xs text-muted-foreground">Descontos</p>
            <p className="font-bold text-sm text-red-600">-{formatCurrency(totalDescontos)}</p>
          </div>
          <div className="bg-green-50 rounded-lg p-3 text-center">
            <p className="text-xs text-muted-foreground">Sal. Líquido</p>
            <p className="font-bold text-sm text-green-700">{formatCurrency(salarioLiquido)}</p>
          </div>
        </div>

        {/* Tabela de lançamentos */}
        {lancamentos.length === 0 ? (
          <p className="text-center text-muted-foreground py-8">Nenhum lançamento neste mês</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Tipo</TableHead>
                <TableHead>Descrição</TableHead>
                <TableHead>Valor</TableHead>
                <TableHead>Data</TableHead>
                <TableHead>Comprov.</TableHead>
                <TableHead className="w-10"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {lancamentos.map(l => (
                <TableRow key={l.id}>
                  <TableCell>
                    <Badge variant="secondary" className={TIPO_COLORS[l.tipo_lancamento]}>
                      {TIPO_LABELS[l.tipo_lancamento] || l.tipo_lancamento}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground text-sm">{l.descricao || '-'}</TableCell>
                  <TableCell className="font-semibold">{formatCurrency(l.valor)}</TableCell>
                  <TableCell className="text-sm">{formatDate(l.data_lancamento)}</TableCell>
                  <TableCell>
                    {l.comprovante ? (
                      <a href={l.comprovante} target="_blank" rel="noopener noreferrer" className="text-primary">
                        <ExternalLink className="w-4 h-4" />
                      </a>
                    ) : '-'}
                  </TableCell>
                  <TableCell>
                    {!l.consolidado ? (
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-destructive h-7 w-7">
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Excluir lançamento?</AlertDialogTitle>
                            <AlertDialogDescription>Esta ação não pode ser desfeita.</AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancelar</AlertDialogCancel>
                            <AlertDialogAction onClick={() => handleDelete(l)}>Excluir</AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    ) : (
                      <Badge variant="outline" className="text-xs">✓</Badge>
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
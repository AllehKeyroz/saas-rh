import React, { useState, useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { client } from '@/api/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Pencil, Trash2, Eye, TrendingUp, RotateCcw } from 'lucide-react';
import { formatCurrency, formatDate, getMesReferenciaAtual, getMesesOptions } from '@/lib/formatters';
import { TIPO_LABELS, TIPO_COLORS, filtrarGastosPorMes } from '@/lib/vidaFinanceira';
import GastoForm from '@/components/vidafinanceira/GastoForm';
import { useToast } from '@/components/ui/use-toast';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useFinancialDataLogger } from '@/hooks/useFinancialDataLogger';

function mesToDate(mesRef) {
  const [m, a] = mesRef.split('/');
  return new Date(parseInt(a), parseInt(m) - 1, 1);
}

function dateToMes(d) {
  return `${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
}

export default function MeusGastos({ funcionarioId }) {
  const { toast } = useToast();
  const qc = useQueryClient();
  const { logError } = useFinancialDataLogger('MeusGastos');
  const mesAtual = getMesReferenciaAtual();
  const meses = getMesesOptions(12);
  const [mesSelecionado, setMesSelecionado] = useState(mesAtual);
  const [filtroTipo, setFiltroTipo] = useState('todos');
  const [formOpen, setFormOpen] = useState(false);
  const [editGasto, setEditGasto] = useState(null);
  const [comprovanteUrl, setComprovanteUrl] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);

  const { data: gastos = [], isLoading, error: gastosError } = useQuery({
    queryKey: ['gastos_pessoais', funcionarioId],
    queryFn: () => client.entities.GastosPessoais.filter({ funcionario_id: funcionarioId }),
    enabled: !!funcionarioId,
  });

  if (gastosError) {
    logError(gastosError, 'Erro ao carregar gastos pessoais');
  }

  if (isLoading) return null;

  // Filtra gastos do mês selecionado
  const gastosMesOriginais = filtrarGastosPorMes(gastos, mesSelecionado);

  // Projeta gastos recorrentes de meses anteriores para este mês
  const gastosRecorrentesProjetados = useMemo(() => {
    const mesData = mesToDate(mesSelecionado);
    const categoriasNoMes = new Set(gastosMesOriginais.map(g => `${g.categoria_tipo}::${g.categoria_nome}`));
    const projetados = [];

    for (const g of gastos) {
      if (!g.recorrente) continue;
      const dataGasto = new Date(g.data_lancamento + 'T12:00:00');
      // Se o gasto foi criado antes ou durante este mês
      if (dataGasto <= mesData) {
        const chave = `${g.categoria_tipo}::${g.categoria_nome}`;
        // Se não existe entrada igual neste mês, projeta
        if (!categoriasNoMes.has(chave)) {
          projetados.push({ ...g, id: g.id + '_projetado', projetado: true });
          categoriasNoMes.add(chave);
        }
      }
    }
    return projetados;
  }, [gastos, mesSelecionado, gastosMesOriginais]);

  const gastosMes = [...gastosMesOriginais, ...gastosRecorrentesProjetados];
  const gastosFiltrados = filtroTipo === 'todos' ? gastosMes : gastosMes.filter(g => g.categoria_tipo === filtroTipo);

  const totaisPorTipo = ['gasto_fixo', 'gasto_variavel', 'investimento', 'receita_extra'].reduce((acc, tipo) => {
    acc[tipo] = gastosMes.filter(g => g.categoria_tipo === tipo).reduce((s, g) => s + (g.valor || 0), 0);
    return acc;
  }, {});

  const handleDelete = async () => {
    if (!deleteTarget) return;
    await client.entities.GastosPessoais.delete(deleteTarget);
    qc.invalidateQueries({ queryKey: ['gastos_pessoais'] });
    toast({ title: 'Lançamento excluído' });
    setDeleteTarget(null);
  };

  const onSaved = () => qc.invalidateQueries({ queryKey: ['gastos_pessoais'] });

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2 items-center">
        <Select value={mesSelecionado} onValueChange={setMesSelecionado}>
          <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
          <SelectContent>
            {meses.map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={filtroTipo} onValueChange={setFiltroTipo}>
          <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos os tipos</SelectItem>
            {Object.entries(TIPO_LABELS).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
          </SelectContent>
        </Select>
        <Button variant="outline" onClick={() => { setEditGasto({ categoria_tipo: 'receita_extra' }); setFormOpen(true); }} className="text-blue-600 border-blue-300 hover:bg-blue-50">
          <TrendingUp className="w-4 h-4 mr-1" />Receita Extra
        </Button>
        <Button onClick={() => { setEditGasto(null); setFormOpen(true); }} className="ml-auto">
          <Plus className="w-4 h-4 mr-1" />Adicionar
        </Button>
      </div>

      <div className="grid grid-cols-3 gap-2">
        {Object.entries(TIPO_LABELS).map(([tipo, label]) => {
          const c = TIPO_COLORS[tipo];
          return (
            <div key={tipo} className={`rounded-xl p-3 ${c.bg}`}>
              <p className={`text-xs font-medium ${c.text}`}>{label}</p>
              <p className={`text-base font-bold ${c.text}`}>{formatCurrency(totaisPorTipo[tipo])}</p>
            </div>
          );
        })}
      </div>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Lançamentos — {mesSelecionado}</CardTitle>
        </CardHeader>
        <CardContent>
          {gastosFiltrados.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-6">Nenhum lançamento encontrado.</p>
          ) : (
            <div className="space-y-1">
              {gastosFiltrados.slice().sort((a, b) => b.data_lancamento?.localeCompare(a.data_lancamento)).map(g => {
                const c = TIPO_COLORS[g.categoria_tipo];
                const isProjetado = g.projetado;
                return (
                  <div key={g.id} className={`flex items-center gap-2 py-2 border-b last:border-b-0 ${isProjetado ? 'opacity-70' : ''}`}>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-medium text-sm truncate">{g.categoria_nome}</span>
                        <Badge className={`${c.bg} ${c.text} border-0 text-xs`}>{TIPO_LABELS[g.categoria_tipo]}</Badge>
                        {isProjetado && <Badge variant="outline" className="text-xs border-blue-300 text-blue-600 flex items-center gap-1"><RotateCcw className="w-2.5 h-2.5" />Recorrente</Badge>}
                      </div>
                      {g.descricao && <p className="text-xs text-muted-foreground">{g.descricao}</p>}
                      <p className="text-xs text-muted-foreground">{formatDate(g.data_lancamento)}</p>
                    </div>
                    <span className={`font-bold text-sm ${c.text} shrink-0`}>{formatCurrency(g.valor)}</span>
                    <div className="flex gap-1 shrink-0">
                      {g.comprovante && (
                        <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => setComprovanteUrl(g.comprovante)}>
                          <Eye className="w-3 h-3" />
                        </Button>
                      )}
                      {!isProjetado && (
                        <>
                          <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => { setEditGasto(g); setFormOpen(true); }}>
                            <Pencil className="w-3 h-3" />
                          </Button>
                          <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive" onClick={() => setDeleteTarget(g.id)}>
                            <Trash2 className="w-3 h-3" />
                          </Button>
                        </>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      <GastoForm
        open={formOpen}
        onClose={() => { setFormOpen(false); setEditGasto(null); }}
        onSaved={onSaved}
        funcionarioId={funcionarioId}
        gasto={editGasto?.id ? editGasto : (editGasto?.categoria_tipo ? { categoria_tipo: editGasto.categoria_tipo } : null)}
      />

      <Dialog open={!!comprovanteUrl} onOpenChange={v => !v && setComprovanteUrl(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>Comprovante</DialogTitle></DialogHeader>
          {comprovanteUrl && (
            comprovanteUrl.match(/\.(png|jpg|jpeg|gif|webp)$/i) ? (
              <img src={comprovanteUrl} alt="Comprovante" className="max-w-full rounded-lg" />
            ) : (
              <iframe src={comprovanteUrl} className="w-full h-96" />
            )
          )}
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteTarget} onOpenChange={open => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir lançamento?</AlertDialogTitle>
            <AlertDialogDescription>Esta ação não pode ser desfeita.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Excluir</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

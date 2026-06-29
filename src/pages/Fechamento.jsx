import React, { useState, useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { client } from '@/api/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Calculator, Loader2, CheckCircle2, RefreshCw, FileDown, LockOpen, ChevronDown, UserCheck, FileSpreadsheet, FileType, FileArchive } from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { formatDate, parseDateLocal, getMesRef } from '@/lib/formatters';
import { formatCurrency, getMesesOptions, getMesReferenciaAtual, TIPOS_DESCONTO, TIPOS_ADICIONAL, mergeTipos, TIPOS_DESCONTO_DEFAULT, TIPOS_ADICIONAL_DEFAULT, TIPO_LABELS } from '@/lib/formatters';
import { Skeleton } from '@/components/ui/skeleton';
import { useUserRole } from '@/lib/useUserRole';
import { toast } from 'sonner';
import { exportFechamentoPDF, exportDemonstrativoPDF } from '@/lib/pdfExport';
import { exportFechamentoXLSX } from '@/lib/xlsxExport';
import DetalhesFechamentoModal from '@/components/fechamento/DetalhesFechamentoModal';
import ExportarContrachequesMassaDialog from '@/components/fechamento/ExportarContrachequesMassaDialog';
import FechamentoIndividualDialog from '@/components/fechamento/FechamentoIndividualDialog';

// Célula clicável que abre os lançamentos individuais de um tipo
function CelulaLancamentos({ total, lancamentos, tipo, label, colorClass }) {
  if (!total) return <span className="text-muted-foreground text-xs">—</span>;
  const itens = lancamentos.filter(l => l.tipo_lancamento === tipo);
  if (itens.length <= 1) {
    return <span className={colorClass}>{formatCurrency(total)}</span>;
  }
  return (
    <Popover>
      <PopoverTrigger asChild>
        <button className={`flex items-center gap-1 hover:underline underline-offset-2 ${colorClass}`}>
          {formatCurrency(total)}
          <ChevronDown className="w-3 h-3 opacity-60" />
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-72 p-0" align="start">
        <div className="p-3 border-b">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">{label}</p>
        </div>
        <div className="divide-y max-h-60 overflow-y-auto">
          {itens.map(l => (
            <div key={l.id} className="flex items-center justify-between px-3 py-2">
              <div>
                <p className="text-sm font-medium">{l.descricao || label}</p>
                <p className="text-xs text-muted-foreground">{formatDate(l.data_lancamento)}</p>
              </div>
              <span className={`text-sm font-semibold ${colorClass}`}>{formatCurrency(l.valor || 0)}</span>
            </div>
          ))}
        </div>
        <div className="p-3 border-t bg-muted/30">
          <div className="flex justify-between text-sm font-bold">
            <span>Total</span>
            <span className={colorClass}>{formatCurrency(total)}</span>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}

export default function Fechamento() {
  const [mesRef, setMesRef] = useState(getMesReferenciaAtual());
  const [processing, setProcessing] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmFunc, setConfirmFunc] = useState(null);
  const [reprocessMode, setReprocessMode] = useState(false);
  const [reabrirFunc, setReabrirFunc] = useState(null); // individual reopen
  const [reabrirGrupoOpen, setReabrirGrupoOpen] = useState(false); // group reopen
  const [detalhesFunc, setDetalhesFunc] = useState(null); // modal details
  const [exportMassaOpen, setExportMassaOpen] = useState(false); // export dialog
  const [fechIndividualOpen, setFechIndividualOpen] = useState(false); // fechamento individual
  const queryClient = useQueryClient();
  const { isAdmin, canProcess } = useUserRole();

  const { data: funcionarios = [], isLoading: lf } = useQuery({
    queryKey: ['funcionarios'],
    queryFn: () => client.entities.Funcionarios.list(),
  });

  const { data: lancamentos = [], isLoading: ll } = useQuery({
    queryKey: ['lancamentos'],
    queryFn: () => client.entities.FichaFinanceira.list('-created_date', 1000),
  });

  const { data: fechamentos = [], isLoading: lfech } = useQuery({
    queryKey: ['fechamentos'],
    queryFn: () => client.entities.FechamentoMensal.list(),
  });

  const { data: comissoesFuncionarios = [] } = useQuery({
    queryKey: ['comissoes_funcionarios'],
    queryFn: () => client.entities.ComissaoPorFuncionario.list('-created_date', 2000),
  });

  const { data: tiposLancamento = [] } = useQuery({
    queryKey: ['tipos-lancamento-fechamento'],
    queryFn: () => client.entities.TipoLancamento.list(),
  });

  const { data: consignados = [] } = useQuery({
    queryKey: ['consignados-fechamento'],
    queryFn: () => client.entities.Consignado.list(),
  });

  const { data: configsRH = [] } = useQuery({
    queryKey: ['configuracoes-rh-fechamento'],
    queryFn: () => client.entities.ConfiguracoesRH.list(),
  });

  const customDescontosList = useMemo(() => mergeTipos(tiposLancamento, 'desconto'), [tiposLancamento]);
  const customAdicionaisList = useMemo(() => mergeTipos(tiposLancamento, 'adicional'), [tiposLancamento]);

  // Configuração de colunas visíveis no fechamento
  // Remove tipos que já têm coluna dedicada fixa (comissao = coluna "Comissão" dedicada)
  const COLUNAS_FIXAS = ['comissao'];
  const colunasFechamento = useMemo(() => {
    const configDoc = configsRH.find(c => c.chave === 'colunas_fechamento');
    const saved = configDoc?.valor || {};
    const result = [];
    const ALL_DEFAULT = [...TIPOS_DESCONTO_DEFAULT, ...TIPOS_ADICIONAL_DEFAULT];
    const getCorDefault = (nome) => {
      const v = saved[nome];
      if (v === true || v === false) return null;
      return v?.cor || null;
    };
    const visivelDefault = (nome) => {
      const v = saved[nome];
      if (v === true || v === false) return v !== false;
      return v?.visivel !== false;
    };
    for (const tipo of ALL_DEFAULT) {
      if (COLUNAS_FIXAS.includes(tipo)) continue;
      if (visivelDefault(tipo)) {
        result.push({ nome: TIPO_LABELS[tipo] || tipo, key: tipo, cor: getCorDefault(tipo) || null });
      }
    }
    const customCor = (nome) => {
      const c = tiposLancamento.find(t => t.nome === nome);
      return c?.cor || null;
    };
    for (const t of tiposLancamento) {
      if (t.ativo !== false && t.mostrar_coluna !== false && !ALL_DEFAULT.includes(t.nome)) {
        result.push({ nome: t.nome, key: t.nome, cor: customCor(t.nome) || null });
      }
    }
    return result;
  }, [tiposLancamento, configsRH]);

  const isLoading = lf || ll || lfech;
  const [mesNum, anoStr] = mesRef.split('/');
  const mes = parseInt(mesNum) - 1;
  const ano = parseInt(anoStr);

  const lancMes = lancamentos.filter(l => {
    if (!l.data_lancamento) return false;
    return getMesRef(l.data_lancamento) === mesRef;
  });

  const ativos = funcionarios.filter(f => f.ativo !== false).sort((a, b) => (a.nome || '').localeCompare(b.nome || ''));
  const fechamentosMes = fechamentos.filter(f => f.mes_referencia === mesRef);
  const fechadosIds = new Set(fechamentosMes.map(f => f.funcionario_id));

  // Usa valores congelados do FechamentoMensal se existir, senão recalcula
  // salario_base armazenado: registros antigos = base+ajuda (combinado), novos = apenas base
  // a soma com ajuda_custo garante compatibilidade com ambos
  const calcularComFechado = (funcId) => {
    const fechado = fechamentosMes.find(f => f.funcionario_id === funcId);
    if (fechado) {
      return {
        salarioBase: (fechado.salario_base || 0) + (fechado.ajuda_custo || 0),
        totalDescontos: fechado.total_descontos || 0,
        totalAdicionais: fechado.total_adicionais || 0,
        comissaoGorjeta: fechado.comissao_gorjeta || 0,
        salarioLiquido: fechado.salario_liquido || 0,
        detalhes: fechado.detalhes || {},
        lancamentos: Object.values(fechado.detalhes || {}).filter(v => v > 0).length,
      };
    }
    return calcular(funcId);
  };

  const calcularComissaoMes = (funcId) => {
    return comissoesFuncionarios
      .filter(c => c.funcionario_id === funcId && c.mes_referencia === mesRef && c.apto)
      .reduce((s, c) => s + (c.valor_individual_final ?? c.valor_individual ?? 0), 0);
  };

  const calcular = (funcId) => {
    const funcLanc = lancMes.filter(l => l.funcionario_id === funcId);
    const func = funcionarios.find(f => f.id === funcId);
    const salarioBase = (func?.salario_base || 0) + (func?.ajuda_custo || 0);
    const comissaoGorjeta = calcularComissaoMes(funcId);

    const descontos = {};
    let totalDescontos = 0;
    customDescontosList.forEach(tipo => {
      const val = funcLanc.filter(l => l.tipo_lancamento === tipo).reduce((s, l) => s + (l.valor || 0), 0);
      descontos[tipo] = val;
      totalDescontos += val;
    });

    const adicionais = {};
    let totalAdicionais = 0;
    customAdicionaisList.forEach(tipo => {
      const val = funcLanc.filter(l => l.tipo_lancamento === tipo).reduce((s, l) => s + (l.valor || 0), 0);
      adicionais[tipo] = val;
      totalAdicionais += val;
    });

    return {
      salarioBase,
      totalDescontos,
      totalAdicionais,
      comissaoGorjeta,
      salarioLiquido: salarioBase + totalAdicionais + comissaoGorjeta - totalDescontos,
      detalhes: { ...descontos, ...adicionais },
      lancamentos: funcLanc.length
    };
  };

  const processarFuncionario = async (func) => {
    const jafechado = fechamentosMes.find(f => f.funcionario_id === func.id);
    if (jafechado && !reprocessMode) {
      toast.error('Fechamento já realizado para este mês.');
      return;
    }

    const calc = calcular(func.id);

    if (jafechado && reprocessMode && isAdmin) {
      await client.entities.FechamentoMensal.update(jafechado.id, {
        salario_base: (func?.salario_base || 0),
        ajuda_custo: func?.ajuda_custo || 0,
        total_descontos: calc.totalDescontos,
        total_adicionais: calc.totalAdicionais,
        salario_liquido: calc.salarioLiquido,
        comissao_gorjeta: calc.comissaoGorjeta,
        data_processamento: new Date().toISOString(),
        detalhes: calc.detalhes,
      });
    } else {
      await client.entities.FechamentoMensal.create({
        funcionario_id: func.id,
        funcionario_nome: func.nome,
        mes_referencia: mesRef,
        salario_base: (func?.salario_base || 0),
        ajuda_custo: func?.ajuda_custo || 0,
        total_descontos: calc.totalDescontos,
        total_adicionais: calc.totalAdicionais,
        salario_liquido: calc.salarioLiquido,
        comissao_gorjeta: calc.comissaoGorjeta,
        data_processamento: new Date().toISOString(),
        detalhes: calc.detalhes,
      });
    }

    // Mark lancamentos as consolidated
    const funcLanc = lancMes.filter(l => l.funcionario_id === func.id && !l.consolidado);
    for (const l of funcLanc) {
      await client.entities.FichaFinanceira.update(l.id, { consolidado: true });
    }

    // Increment parcelas_pagas dos contratos consignado ativos (apenas no 1º processamento)
    if (!jafechado) {
      const consignadosAtivos = consignados.filter(c => c.funcionario_id === func.id && c.ativo !== false && c.valor_parcela);
      for (const c of consignadosAtivos) {
        const novasPagas = (c.parcelas_pagas || 0) + 1;
        const finalizado = novasPagas >= (c.total_parcelas || 99999);
        await client.entities.Consignado.update(c.id, {
          parcelas_pagas: novasPagas,
          ativo: !finalizado,
        });
      }
    }
  };

  const processarTodos = async () => {
    setProcessing(true);
    const pendentes = ativos.filter(f => reprocessMode || !fechadosIds.has(f.id));
    for (const func of pendentes) {
      await processarFuncionario(func);
    }
    queryClient.invalidateQueries({ queryKey: ['fechamentos'] });
    queryClient.invalidateQueries({ queryKey: ['lancamentos'] });
    queryClient.invalidateQueries({ queryKey: ['funcionarios'] });
    queryClient.invalidateQueries({ queryKey: ['consignados-fechamento'] });
    toast.success(`Fechamento ${reprocessMode ? 'reprocessado' : 'processado'} com sucesso!`);
    setProcessing(false);
    setConfirmOpen(false);
  };

  const processarUm = async (func) => {
    setProcessing(true);
    await processarFuncionario(func);
    queryClient.invalidateQueries({ queryKey: ['fechamentos'] });
    queryClient.invalidateQueries({ queryKey: ['lancamentos'] });
    queryClient.invalidateQueries({ queryKey: ['consignados-fechamento'] });
    setProcessing(false);
    setConfirmFunc(null);
    toast.success(`Fechamento de ${func.nome} processado!`);
  };

  const processarIndividual = async (func, tipo) => {
    setProcessing(true);
    await processarFuncionario(func);
    queryClient.invalidateQueries({ queryKey: ['fechamentos'] });
    queryClient.invalidateQueries({ queryKey: ['lancamentos'] });
    queryClient.invalidateQueries({ queryKey: ['consignados-fechamento'] });
    setProcessing(false);
    setFechIndividualOpen(false);
    const tipoLabel = tipo === 'rescisao' ? 'Rescisão' : tipo === 'ferias' ? 'Férias' : 'Mensal';
    toast.success(`Fechamento (${tipoLabel}) de ${func.nome} processado!`);
  };

  const reabrirFuncionario = async (func) => {
    const fechado = fechamentosMes.find(f => f.funcionario_id === func.id);
    if (!fechado) return;
    setProcessing(true);
    // Delete fechamento record
    await client.entities.FechamentoMensal.delete(fechado.id);
    // Unconsolidate lancamentos of this month for this employee
    const funcLanc = lancMes.filter(l => l.funcionario_id === func.id && l.consolidado);
    for (const l of funcLanc) {
      await client.entities.FichaFinanceira.update(l.id, { consolidado: false });
    }
    queryClient.invalidateQueries({ queryKey: ['fechamentos'] });
    queryClient.invalidateQueries({ queryKey: ['lancamentos'] });
    setProcessing(false);
    setReabrirFunc(null);
    toast.success(`Folha de ${func.nome} reaberta para edição!`);
  };

  const reabrirTodos = async () => {
    setProcessing(true);
    for (const fech of fechamentosMes) {
      await client.entities.FechamentoMensal.delete(fech.id);
      const funcLanc = lancMes.filter(l => l.funcionario_id === fech.funcionario_id && l.consolidado);
      for (const l of funcLanc) {
        await client.entities.FichaFinanceira.update(l.id, { consolidado: false });
      }
    }
    queryClient.invalidateQueries({ queryKey: ['fechamentos'] });
    queryClient.invalidateQueries({ queryKey: ['lancamentos'] });
    setProcessing(false);
    setReabrirGrupoOpen(false);
    toast.success(`Folha de ${mesRef} reaberta para todos!`);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <h1 className="text-3xl font-bold tracking-tight">Fechamento Mensal</h1>
          <span className="text-muted-foreground text-sm hidden sm:inline">— Calcule e processe a folha</span>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Select value={mesRef} onValueChange={setMesRef}>
            <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
            <SelectContent>
              {getMesesOptions().map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}
            </SelectContent>
          </Select>
          <Button variant="outline" onClick={() => setFechIndividualOpen(true)} disabled={processing}>
            <UserCheck className="w-4 h-4 mr-2" />Fechamento Individual
          </Button>
          {canProcess && (
            <Button onClick={() => { setReprocessMode(false); setConfirmOpen(true); }} disabled={processing}>
              <Calculator className="w-4 h-4 mr-2" />Processar Todos
            </Button>
          )}
          {isAdmin && (
            <Button variant="outline" onClick={() => { setReprocessMode(true); setConfirmOpen(true); }} disabled={processing}>
              <RefreshCw className="w-4 h-4 mr-2" />Reprocessar
            </Button>
          )}
          {isAdmin && fechamentosMes.length > 0 && (
            <Button variant="outline" className="text-orange-600 border-orange-300 hover:bg-orange-50" onClick={() => setReabrirGrupoOpen(true)} disabled={processing}>
              <LockOpen className="w-4 h-4 mr-2" />Reabrir Todos
            </Button>
          )}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" disabled={isLoading}>
                <FileDown className="w-4 h-4 mr-2" />Exportar
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuItem onClick={() => exportFechamentoPDF(ativos, calcularComFechado, mesRef)}>
                <FileType className="w-4 h-4 mr-2 text-blue-600" />PDF — Resumo da Folha
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => exportFechamentoXLSX(funcionarios, lancamentos, fechamentos, calcular, mesRef, tiposLancamento)}>
                <FileSpreadsheet className="w-4 h-4 mr-2 text-green-600" />XLSX — Planilha Completa
              </DropdownMenuItem>
              {isAdmin && fechamentosMes.length > 0 && (
                <DropdownMenuItem onClick={() => setExportMassaOpen(true)}>
                  <FileArchive className="w-4 h-4 mr-2 text-orange-600" />ZIP — Contracheques Individuais
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {isLoading ? (
        <Skeleton className="h-64" />
      ) : (
        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Funcionário</TableHead>
                     <TableHead>Sal. Base</TableHead>
                     <TableHead>Comissão</TableHead>
                     {colunasFechamento.map(col => (
                       <TableHead key={col.key} className="text-xs tracking-wide" style={col.cor ? { backgroundColor: col.cor + '15', color: col.cor } : {}}>
                         {col.nome}
                       </TableHead>
                     ))}
                     <TableHead>Sal. Líquido</TableHead>
                     <TableHead>Lanç.</TableHead>
                     <TableHead>Status</TableHead>
                    <TableHead className="w-12"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {ativos.map(func => {
                    const fechado = fechamentosMes.find(f => f.funcionario_id === func.id);
                    const dados = calcularComFechado(func.id);
                    return (
                      <TableRow key={func.id}>
                        <TableCell>
                          <button
                            className="font-medium text-left hover:text-primary hover:underline transition-colors"
                            onClick={() => setDetalhesFunc(func)}
                          >
                            {func.nome}
                          </button>
                        </TableCell>
                        <TableCell>{formatCurrency(dados.salarioBase)}</TableCell>
                        <TableCell className="text-emerald-600 font-medium">{formatCurrency(dados.comissaoGorjeta || 0)}</TableCell>
                        {colunasFechamento.map(col => {
                          const val = dados.detalhes?.[col.key] || 0;
                          const isDesc = TIPOS_DESCONTO_DEFAULT.includes(col.key);
                          return (
                            <TableCell key={col.key} className={val ? (isDesc ? 'text-destructive font-medium' : 'text-green-600') : 'text-muted-foreground text-xs'}>
                              {val ? formatCurrency(val) : '—'}
                            </TableCell>
                          );
                        })}
                        <TableCell className="font-bold">{formatCurrency(dados.salarioLiquido)}</TableCell>
                        <TableCell>{dados.lancamentos}</TableCell>
                        <TableCell>
                          {fechado ? (
                            <Badge className="bg-green-100 text-green-700"><CheckCircle2 className="w-3 h-3 mr-1" />Fechado</Badge>
                          ) : (
                            <Badge variant="outline">Pendente</Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <Button
                              size="sm" variant="ghost"
                              onClick={() => exportDemonstrativoPDF(func, lancamentos, fechamentos, mesRef)}
                              title="Exportar demonstrativo PDF"
                            >
                              <FileDown className="w-4 h-4 text-muted-foreground" />
                            </Button>
                            {canProcess && !fechado && (
                              <Button size="sm" variant="ghost" onClick={() => setConfirmFunc(func)} disabled={processing} title="Processar fechamento">
                                <Calculator className="w-4 h-4" />
                              </Button>
                            )}
                            {isAdmin && fechado && (
                              <Button size="sm" variant="ghost" className="text-orange-500 hover:text-orange-700" onClick={() => setReabrirFunc(func)} disabled={processing} title="Reabrir folha">
                                <LockOpen className="w-4 h-4" />
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{reprocessMode ? 'Reprocessar' : 'Processar'} Fechamento</AlertDialogTitle>
            <AlertDialogDescription>
              {reprocessMode
                ? `Reprocessar o fechamento de ${mesRef} para todos os funcionários? Valores anteriores serão sobrescritos.`
                : `Processar o fechamento de ${mesRef} para ${ativos.filter(f => !fechadosIds.has(f.id)).length} funcionários pendentes?`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={processarTodos} disabled={processing}>
              {processing && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Confirmar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={!!confirmFunc} onOpenChange={() => setConfirmFunc(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Processar Fechamento</AlertDialogTitle>
            <AlertDialogDescription>Processar fechamento de {confirmFunc?.nome} para {mesRef}?</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={() => processarUm(confirmFunc)} disabled={processing}>
              {processing && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Confirmar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Reabrir individual */}
      <AlertDialog open={!!reabrirFunc} onOpenChange={() => setReabrirFunc(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Reabrir Folha</AlertDialogTitle>
            <AlertDialogDescription>
              Deseja reabrir a folha de <strong>{reabrirFunc?.nome}</strong> para {mesRef}?
              O fechamento será excluído e os lançamentos voltarão a ser editáveis.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-orange-600 hover:bg-orange-700"
              onClick={() => reabrirFuncionario(reabrirFunc)}
              disabled={processing}
            >
              {processing && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Reabrir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Reabrir todos */}
      <AlertDialog open={reabrirGrupoOpen} onOpenChange={setReabrirGrupoOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Reabrir Todos os Fechamentos</AlertDialogTitle>
            <AlertDialogDescription>
              Deseja reabrir a folha de <strong>todos os funcionários</strong> de {mesRef}?
              Todos os fechamentos serão excluídos e os lançamentos voltarão a ser editáveis.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-orange-600 hover:bg-orange-700"
              onClick={reabrirTodos}
              disabled={processing}
            >
              {processing && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Reabrir Todos
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Modal detalhes ao clicar no nome */}
      <DetalhesFechamentoModal
        func={detalhesFunc}
        lancamentos={lancamentos}
        mesRef={mesRef}
        tiposLancamento={tiposLancamento}
        fechamentosMes={fechamentosMes}
        onClose={() => setDetalhesFunc(null)}
      />

      {/* Fechamento Individual */}
      <FechamentoIndividualDialog
        open={fechIndividualOpen}
        onClose={() => setFechIndividualOpen(false)}
        funcionarios={ativos}
        mesRef={mesRef}
        calcular={calcularComFechado}
        onProcessar={processarIndividual}
        processing={processing}
      />

      {/* Exportar Contracheques em Massa */}
      <ExportarContrachequesMassaDialog
        open={exportMassaOpen}
        onOpenChange={setExportMassaOpen}
        mesRef={mesRef}
        funcionarios={ativos}
        fechamentosMes={fechamentosMes}
      />
    </div>
  );
}
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
import { usePersistedFilter } from '@/lib/usePersistedFilter';
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
  const [mesRef, setMesRef] = usePersistedFilter('rh_filtro_mes_fechamento', getMesReferenciaAtual());
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

  const { data: dividasPessoais = [] } = useQuery({
    queryKey: ['dividas-pessoais-fechamento'],
    queryFn: () => client.entities.DividasPessoais.list(),
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

  // Separa colunas entre créditos (adicionais) e débitos (descontos)
  const colunasAdicionais = useMemo(() => {
    return colunasFechamento.filter(col => customAdicionaisList.includes(col.key));
  }, [colunasFechamento, customAdicionaisList]);

  const colunasDescontos = useMemo(() => {
    return colunasFechamento.filter(col => customDescontosList.includes(col.key));
  }, [colunasFechamento, customDescontosList]);

  const isLoading = lf || ll || lfech;
  const [mesNum, anoStr] = mesRef.split('/');
  const mes = parseInt(mesNum) - 1;
  const ano = parseInt(anoStr);

  const lancMes = lancamentos.filter(l => {
    if (!l.data_lancamento) return false;
    return getMesRef(l.data_lancamento) === mesRef;
  });

  const ativos = funcionarios
    .filter(f => f.ativo !== false)
    .filter(f => {
      if (!f.data_admissao) return true
      const ultimoDiaMes = new Date(ano, mes + 1, 0)
      const adm = parseDateLocal(f.data_admissao)
      if (adm > ultimoDiaMes) return false
      if (f.data_demissao) {
        const primeiroDiaMes = new Date(ano, mes, 1)
        const dem = parseDateLocal(f.data_demissao)
        if (dem < primeiroDiaMes) return false
      }
      return true
    })
    .sort((a, b) => (a.nome || '').localeCompare(b.nome || ''))
  const fechamentosMes = fechamentos.filter(f => f.mes_referencia === mesRef);
  const fechadosIds = new Set(fechamentosMes.map(f => f.funcionario_id));

  // Usa valores congelados do FechamentoMensal se existir, senão recalcula
  // salario_base armazenado: registros antigos = base+ajuda (combinado), novos = apenas base
  // a soma com ajuda_custo garante compatibilidade com ambos
  const calcularComFechado = (funcId) => {
    const fechado = fechamentosMes.find(f => f.funcionario_id === funcId);
    if (fechado) {
      const base = fechado.salario_base || 0;
      const ajuda = fechado.ajuda_custo || 0;
      const comissao = fechado.comissao_gorjeta || 0;
      const adicionais = fechado.total_adicionais || 0;
      const descontos = fechado.total_descontos || 0;
      return {
        salarioBase: base,
        ajudaCusto: ajuda,
        totalDescontos: descontos,
        totalAdicionais: adicionais,
        comissaoGorjeta: comissao,
        subtotalCreditos: base + ajuda + comissao + adicionais,
        subtotalDebitos: descontos,
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
    const salarioBase = func?.salario_base || 0;
    const ajudaCusto = func?.ajuda_custo || 0;
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

    const subtotalCreditos = salarioBase + ajudaCusto + comissaoGorjeta + totalAdicionais;
    const subtotalDebitos = totalDescontos;

    return {
      salarioBase,
      ajudaCusto,
      totalDescontos: subtotalDebitos,
      totalAdicionais,
      comissaoGorjeta,
      subtotalCreditos,
      subtotalDebitos,
      salarioLiquido: subtotalCreditos - subtotalDebitos,
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

      // Sync DividasPessoais consignado — mesma lógica de incremento
      const dividasConsignado = dividasPessoais.filter(d =>
        d.funcionario_id === func.id && d.tipo === 'consignado' && d.ativa && d.valor_parcela
      );
      for (const d of dividasConsignado) {
        const novasPagas = (d.parcelas_pagas || 0) + 1;
        const finalizado = novasPagas >= (d.parcelas_total || 99999);
        await client.entities.DividasPessoais.update(d.id, {
          parcelas_pagas: novasPagas,
          ativa: !finalizado,
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
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <h1 className="text-2xl font-bold tracking-tight">Fechamento Mensal</h1>
          <span className="text-muted-foreground text-xs hidden sm:inline">— Calcule e processe a folha</span>
        </div>
        <div className="flex items-center gap-1.5 flex-wrap">
          <Select value={mesRef} onValueChange={setMesRef}>
            <SelectTrigger className="w-28 h-8 text-xs"><SelectValue /></SelectTrigger>
            <SelectContent>
              {getMesesOptions().map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}
            </SelectContent>
          </Select>
          <Button variant="outline" size="sm" className="h-8 text-xs" onClick={() => setFechIndividualOpen(true)} disabled={processing}>
            <UserCheck className="w-3.5 h-3.5 mr-1" />Individual
          </Button>
          {canProcess && (
            <Button size="sm" className="h-8 text-xs" onClick={() => { setReprocessMode(false); setConfirmOpen(true); }} disabled={processing}>
              <Calculator className="w-3.5 h-3.5 mr-1" />Processar
            </Button>
          )}
          {isAdmin && (
            <Button variant="outline" size="sm" className="h-8 text-xs" onClick={() => { setReprocessMode(true); setConfirmOpen(true); }} disabled={processing}>
              <RefreshCw className="w-3.5 h-3.5 mr-1" />Reprocessar
            </Button>
          )}
          {isAdmin && fechamentosMes.length > 0 && (
            <Button variant="outline" size="sm" className="h-8 text-xs text-orange-600 border-orange-300 hover:bg-orange-50" onClick={() => setReabrirGrupoOpen(true)} disabled={processing}>
              <LockOpen className="w-3.5 h-3.5 mr-1" />Reabrir
            </Button>
          )}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="h-8 text-xs" disabled={isLoading}>
                <FileDown className="w-3.5 h-3.5 mr-1" />Exportar
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

      {/* Cards de resumo */}
      <div className="grid grid-cols-3 sm:grid-cols-3 gap-3">
        <div className="rounded-lg border bg-card p-3">
          <p className="text-[11px] text-muted-foreground">Funcionários</p>
          <p className="text-lg font-bold">{ativos.length}</p>
        </div>
        <div className="rounded-lg border bg-card p-3">
          <p className="text-[11px] text-muted-foreground">Total Bruto</p>
          <p className="text-lg font-bold">{formatCurrency(ativos.reduce((s, f) => s + calcularComFechado(f.id).subtotalCreditos, 0))}</p>
        </div>
        <div className="rounded-lg border bg-card p-3">
          <p className="text-[11px] text-muted-foreground">Total Líquido</p>
          <p className="text-lg font-bold">{formatCurrency(ativos.reduce((s, f) => s + calcularComFechado(f.id).salarioLiquido, 0))}</p>
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
                  <TableHead className="sticky left-0 z-10 bg-white py-1 px-1.5 text-[11px] whitespace-nowrap">Funcionário</TableHead>
                   <TableHead className="py-1 px-1.5 text-[11px] whitespace-nowrap">Sal. Base</TableHead>
                   <TableHead className="py-1 px-1.5 text-[11px] whitespace-nowrap">Ajuda Custo</TableHead>
                   <TableHead className="py-1 px-1.5 text-[11px] whitespace-nowrap">Comissão</TableHead>
                   {colunasAdicionais.map(col => (
                     <TableHead key={col.key} className="py-1 px-1.5 text-[11px] whitespace-nowrap text-green-700" style={col.cor ? { backgroundColor: col.cor + '15', color: col.cor } : {}}>
                       {col.nome}
                     </TableHead>
                   ))}
                   <TableHead className="py-1 px-1.5 text-[11px] whitespace-nowrap font-bold text-green-700 bg-green-50">Subtotal Créd.</TableHead>
                   {colunasDescontos.map(col => (
                     <TableHead key={col.key} className="py-1 px-1.5 text-[11px] whitespace-nowrap text-red-700" style={col.cor ? { backgroundColor: col.cor + '15', color: col.cor } : {}}>
                       {col.nome}
                     </TableHead>
                   ))}
                   <TableHead className="py-1 px-1.5 text-[11px] whitespace-nowrap font-bold text-red-700 bg-red-50">Subtotal Déb.</TableHead>
                   <TableHead className="py-1 px-1.5 text-[11px] whitespace-nowrap">Sal. Líquido</TableHead>
                   <TableHead className="py-1 px-1.5 text-[11px] whitespace-nowrap">Lanç.</TableHead>
                   <TableHead className="py-1 px-1.5 text-[11px] whitespace-nowrap">Status</TableHead>
                  <TableHead className="sticky right-0 z-10 bg-white py-1 px-1.5 w-12"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {ativos.map(func => {
                    const fechado = fechamentosMes.find(f => f.funcionario_id === func.id);
                    const dados = calcularComFechado(func.id);
                    return (
                      <TableRow key={func.id}>
                        <TableCell className="sticky left-0 z-10 bg-white py-0.5 px-1.5 text-xs whitespace-nowrap">
                          <button
                            className="font-medium text-left hover:text-primary hover:underline transition-colors text-xs"
                            onClick={() => setDetalhesFunc(func)}
                          >
                            {func.nome}
                          </button>
                        </TableCell>
                        <TableCell className="py-0.5 px-1.5 text-xs whitespace-nowrap">{formatCurrency(dados.salarioBase)}</TableCell>
                        <TableCell className="py-0.5 px-1.5 text-xs whitespace-nowrap">{dados.ajudaCusto > 0 ? formatCurrency(dados.ajudaCusto) : <span className="text-muted-foreground">—</span>}</TableCell>
                        <TableCell className="py-0.5 px-1.5 text-xs whitespace-nowrap text-emerald-600 font-medium">{formatCurrency(dados.comissaoGorjeta || 0)}</TableCell>
                        {colunasAdicionais.map(col => {
                          const val = dados.detalhes?.[col.key] || 0;
                          return (
                            <TableCell key={col.key} className={'py-0.5 px-1.5 text-xs whitespace-nowrap' + (val ? ' text-green-600' : ' text-muted-foreground')}>
                              {val ? <CelulaLancamentos total={val} lancamentos={lancMes.filter(l => l.funcionario_id === func.id)} tipo={col.key} label={col.nome} colorClass="text-green-600" /> : '—'}
                            </TableCell>
                          );
                        })}
                        <TableCell className="py-0.5 px-1.5 text-xs whitespace-nowrap font-bold text-green-700 bg-green-50/50">{formatCurrency(dados.subtotalCreditos)}</TableCell>
                        {colunasDescontos.map(col => {
                          const val = dados.detalhes?.[col.key] || 0;
                          return (
                            <TableCell key={col.key} className={'py-0.5 px-1.5 text-xs whitespace-nowrap' + (val ? ' text-destructive font-medium' : ' text-muted-foreground')}>
                              {val ? <CelulaLancamentos total={val} lancamentos={lancMes.filter(l => l.funcionario_id === func.id)} tipo={col.key} label={col.nome} colorClass="text-destructive" /> : '—'}
                            </TableCell>
                          );
                        })}
                        <TableCell className="py-0.5 px-1.5 text-xs whitespace-nowrap font-bold text-red-700 bg-red-50/50">{formatCurrency(dados.subtotalDebitos)}</TableCell>
                        <TableCell className="py-0.5 px-1.5 text-xs whitespace-nowrap font-bold">{formatCurrency(dados.salarioLiquido)}</TableCell>
                        <TableCell className="py-0.5 px-1.5 text-xs whitespace-nowrap">{dados.lancamentos}</TableCell>
                        <TableCell className="py-0.5 px-1.5 text-xs whitespace-nowrap">
                          {fechado ? (
                            <Badge className="bg-green-100 text-green-700 text-[10px] py-0 px-1.5"><CheckCircle2 className="w-2.5 h-2.5 mr-0.5" />Fechado</Badge>
                          ) : (
                            <Badge variant="outline" className="text-[10px] py-0 px-1.5">Pendente</Badge>
                          )}
                        </TableCell>
                        <TableCell className="sticky right-0 z-10 bg-white py-0.5 px-1.5">
                          <div className="flex items-center gap-0.5">
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
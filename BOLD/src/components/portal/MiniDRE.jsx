import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { TrendingUp, TrendingDown, Minus, ChevronRight, Download, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { formatCurrency } from '@/lib/formatters';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useToast } from '@/components/ui/use-toast';

function DRERow({ label, value, percentual = null, indent = false, isTotal = false, isCategoryTotal = false, colorClass = '', onClick = null, itens = [] }) {
  const isClickable = onClick && itens && itens.length > 0;
  return (
    <div 
      className={`flex items-center justify-between py-1.5 ${isTotal || isCategoryTotal ? 'border-t mt-1 pt-2.5' : ''} ${indent ? 'pl-4' : ''} ${isClickable ? 'cursor-pointer hover:bg-muted/50 rounded px-2 -mx-2' : ''}`}
      onClick={isClickable ? onClick : undefined}
    >
      <div className="flex flex-col">
        <span className={`text-sm ${isTotal || isCategoryTotal ? 'font-bold' : indent ? 'text-muted-foreground' : 'font-medium'}`}>{label}</span>
        {percentual !== null && <span className="text-xs text-muted-foreground">{percentual}%</span>}
      </div>
      <div className="flex items-center gap-2">
        <span className={`text-sm ${isTotal || isCategoryTotal ? 'font-bold text-base' : 'font-medium'} ${colorClass}`}>{value}</span>
        {isClickable && <ChevronRight className="w-3 h-3 text-muted-foreground" />}
      </div>
    </div>
  );
}

export default function MiniDRE({
  mesSelecionado,
  salarioBase,
  comissaoMes,
  receitaExtra = 0,
  gastoFixo,
  gastoVariavel,
  investimento,
  lancamentosMes,
}) {
  const [dialogAberto, setDialogAberto] = useState(false);
  const [categoriaSelecionada, setCategoriaSelecionada] = useState(null);
  const [exportando, setExportando] = useState(false);
  const { toast } = useToast();

  // Calcular entradas (receitas)
  const adicionais = lancamentosMes
    .filter(l => ['adicional', 'ajuste'].includes(l.tipo_lancamento))
    .reduce((s, l) => s + (l.valor || 0), 0);
  
  const totalEntradas = salarioBase + comissaoMes + adicionais + receitaExtra;

  // Calcular despesas por categoria - listar itens individuais
  // Gastos Fixos: consignado (automático) + gastos fixos lançados pelo funcionário
  const consignado = lancamentosMes
    .filter(l => l.tipo_lancamento === 'credito_consignado')
    .reduce((s, l) => s + (l.valor || 0), 0);
  
  // Investimentos: aportes, poupança, investimentos lançados
  const investimentosLista = lancamentosMes
    .filter(l => l.tipo_lancamento === 'investimento')
    .map(l => ({ nome: l.descricao || 'Investimento', valor: l.valor || 0 }));
  const totalInvestimentos = investimentosLista.reduce((s, i) => s + i.valor, 0) + investimento;

  // Gastos Variáveis: alimentação, transporte, lazer, compras, farmácia, etc.
  const gastosVariaveisLista = lancamentosMes
    .filter(l => ['gasto_variavel'].includes(l.categoria_tipo) || ['alimentacao', 'transporte', 'lazer', 'compras', 'farmacia'].includes(l.categoria_nome?.toLowerCase()))
    .map(l => ({ nome: l.descricao || l.categoria_nome || 'Gasto Variável', valor: l.valor || 0 }));
  const totalGastosVariaveis = gastosVariaveisLista.reduce((s, g) => s + g.valor, 0) + gastoVariavel;

  // Total despesas = fixos + investimentos + variáveis + consignado
  const totalGastosFixos = gastoFixo + consignado;
  const totalDespesas = totalGastosFixos + totalInvestimentos + totalGastosVariaveis;
  
  const resultado = totalEntradas - totalDespesas;

  // Função para calcular análise vertical
  const calcularPercentual = (valor, total) => {
    if (total === 0) return 0;
    return ((valor / total) * 100).toFixed(1);
  };

  // Função para abrir detalhe da categoria
  const abrirDetalhe = (categoria, itens) => {
    setCategoriaSelecionada({ nome: categoria, itens });
    setDialogAberto(true);
  };

  // Função para exportar em PDF
  const exportarPDF = async () => {
    setExportando(true);
    try {
      const { jsPDF } = await import('jspdf');
      const doc = new jsPDF();
      doc.setFontSize(14);
      doc.text(`Mini DRE - ${mesSelecionado}`, 20, 15);

      let yPos = 25;
      const lineHeight = 6;
      const pageHeight = doc.internal.pageSize.height;

      const addSection = (title, rows) => {
        if (yPos + 5 > pageHeight - 10) {
          doc.addPage();
          yPos = 15;
        }
        doc.setFontSize(11);
        doc.setFont(undefined, 'bold');
        doc.text(title, 20, yPos);
        yPos += lineHeight;
        doc.setFontSize(9);
        doc.setFont(undefined, 'normal');

        rows.forEach(([label, value, percent]) => {
          if (yPos + lineHeight > pageHeight - 10) {
            doc.addPage();
            yPos = 15;
          }
          const percentText = percent ? ` (${percent}%)` : '';
          doc.text(label, 25, yPos);
          doc.text(`${value}${percentText}`, 150, yPos);
          yPos += lineHeight;
        });
        yPos += 3;
      };

      // Entradas
      const entradas = [
        salarioBase > 0 ? ['Salário Fixo', formatCurrency(salarioBase), calcularPercentual(salarioBase, totalEntradas)] : null,
        comissaoMes > 0 ? ['Comissão', formatCurrency(comissaoMes), calcularPercentual(comissaoMes, totalEntradas)] : null,
        receitaExtra > 0 ? ['Receitas Extras', formatCurrency(receitaExtra), calcularPercentual(receitaExtra, totalEntradas)] : null,
        adicionais > 0 ? ['Outras Receitas', formatCurrency(adicionais), calcularPercentual(adicionais, totalEntradas)] : null,
      ].filter(Boolean);
      addSection('ENTRADAS (RECEITAS)', [...entradas, ['Total Entradas', formatCurrency(totalEntradas), null]]);

      // Gastos Fixos
      const gastosFixos = [
        consignado > 0 ? ['Consignado', formatCurrency(consignado), calcularPercentual(consignado, totalDespesas)] : null,
        gastoFixo > 0 ? ['Outros Gastos Fixos', formatCurrency(gastoFixo), calcularPercentual(gastoFixo, totalDespesas)] : null,
      ].filter(Boolean);
      addSection('GASTOS FIXOS', [...gastosFixos, ['Total Gastos Fixos', formatCurrency(totalGastosFixos), calcularPercentual(totalGastosFixos, totalDespesas)]]);

      // Investimentos
      const investimentos = investimentosLista.map(inv => [inv.nome, formatCurrency(inv.valor), calcularPercentual(inv.valor, totalDespesas)]);
      addSection('INVESTIMENTOS', [...investimentos, ['Total Investimentos', formatCurrency(totalInvestimentos), calcularPercentual(totalInvestimentos, totalDespesas)]]);

      // Gastos Variáveis
      const gastosVariaveis = gastosVariaveisLista.map(g => [g.nome, formatCurrency(g.valor), calcularPercentual(g.valor, totalDespesas)]);
      addSection('GASTOS VARIÁVEIS', [...gastosVariaveis, ['Total Gastos Variáveis', formatCurrency(totalGastosVariaveis), calcularPercentual(totalGastosVariaveis, totalDespesas)]]);

      // Totais
      doc.setFont(undefined, 'bold');
      if (yPos + lineHeight > pageHeight - 10) {
        doc.addPage();
        yPos = 15;
      }
      doc.text('Total Despesas', 20, yPos);
      doc.text(formatCurrency(totalDespesas), 150, yPos);
      yPos += lineHeight;

      const resultadoColor = resultado >= 0 ? [34, 197, 94] : [239, 68, 68];
      doc.setTextColor(...resultadoColor);
      doc.text('Resultado do Mês', 20, yPos);
      doc.text(formatCurrency(resultado), 150, yPos);

      doc.save(`Mini_DRE_${mesSelecionado}.pdf`);
      toast({ title: '✅ PDF exportado com sucesso!' });
    } catch (error) {
      toast({ title: 'Erro ao exportar PDF', description: error.message, variant: 'destructive' });
    } finally {
      setExportando(false);
    }
  };

  // Função para exportar em Excel
  const exportarExcel = async () => {
    setExportando(true);
    try {
      const xlsx = await import('xlsx');
      const ws = xlsx.utils.aoa_to_sheet([
        ['Mini DRE', mesSelecionado],
        [],
        ['ENTRADAS (RECEITAS)'],
        salarioBase > 0 ? ['Salário Fixo', salarioBase, calcularPercentual(salarioBase, totalEntradas) + '%'] : null,
        comissaoMes > 0 ? ['Comissão', comissaoMes, calcularPercentual(comissaoMes, totalEntradas) + '%'] : null,
        receitaExtra > 0 ? ['Receitas Extras', receitaExtra, calcularPercentual(receitaExtra, totalEntradas) + '%'] : null,
        adicionais > 0 ? ['Outras Receitas', adicionais, calcularPercentual(adicionais, totalEntradas) + '%'] : null,
        ['Total Entradas', totalEntradas],
        [],
        ['GASTOS FIXOS'],
        consignado > 0 ? ['Consignado', consignado, calcularPercentual(consignado, totalDespesas) + '%'] : null,
        gastoFixo > 0 ? ['Outros Gastos Fixos', gastoFixo, calcularPercentual(gastoFixo, totalDespesas) + '%'] : null,
        ['Total Gastos Fixos', totalGastosFixos, calcularPercentual(totalGastosFixos, totalDespesas) + '%'],
        [],
        ['INVESTIMENTOS'],
        ...investimentosLista.map(inv => [inv.nome, inv.valor, calcularPercentual(inv.valor, totalDespesas) + '%']),
        ['Total Investimentos', totalInvestimentos, calcularPercentual(totalInvestimentos, totalDespesas) + '%'],
        [],
        ['GASTOS VARIÁVEIS'],
        ...gastosVariaveisLista.map(g => [g.nome, g.valor, calcularPercentual(g.valor, totalDespesas) + '%']),
        ['Total Gastos Variáveis', totalGastosVariaveis, calcularPercentual(totalGastosVariaveis, totalDespesas) + '%'],
        [],
        ['Total Despesas', totalDespesas],
        ['Resultado do Mês', resultado],
      ].filter(row => row !== null));

      const wb = xlsx.utils.book_new();
      xlsx.utils.book_append_sheet(wb, ws, 'DRE');
      xlsx.writeFile(wb, `Mini_DRE_${mesSelecionado}.xlsx`);
      toast({ title: '✅ Excel exportado com sucesso!' });
    } catch (error) {
      toast({ title: 'Erro ao exportar Excel', description: error.message, variant: 'destructive' });
    } finally {
      setExportando(false);
    }
  };

  return (
    <Card className="border-2 border-primary/10">
      <CardHeader className="pb-2 flex items-center justify-between">
        <CardTitle className="text-base flex items-center gap-2">
          <TrendingUp className="w-4 h-4 text-primary" />
          Mini DRE — {mesSelecionado}
        </CardTitle>
        <div className="flex gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={exportarPDF}
            disabled={exportando}
            className="gap-1"
          >
            {exportando ? <Loader2 className="w-3 h-3 animate-spin" /> : <Download className="w-3 h-3" />}
            PDF
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={exportarExcel}
            disabled={exportando}
            className="gap-1"
          >
            {exportando ? <Loader2 className="w-3 h-3 animate-spin" /> : <Download className="w-3 h-3" />}
            Excel
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-1 pb-4">
        {/* A) ENTRADAS (RECEITAS) */}
        <p className="text-xs font-bold text-green-700 uppercase tracking-wider mb-1 flex items-center gap-1">
          <TrendingUp className="w-3 h-3" /> Entradas
        </p>
        {salarioBase > 0 && (
          <DRERow 
            label="Salário Fixo" 
            value={formatCurrency(salarioBase)} 
            percentual={calcularPercentual(salarioBase, totalEntradas)}
            indent 
            colorClass="text-green-600" 
          />
        )}
        {comissaoMes !== undefined && comissaoMes > 0 && (
          <DRERow 
            label="Comissão" 
            value={formatCurrency(comissaoMes)} 
            percentual={calcularPercentual(comissaoMes, totalEntradas)}
            indent 
            colorClass="text-green-600" 
          />
        )}
        {receitaExtra > 0 && (
          <DRERow 
            label="Receitas Extras" 
            value={formatCurrency(receitaExtra)} 
            percentual={calcularPercentual(receitaExtra, totalEntradas)}
            indent 
            colorClass="text-blue-600" 
          />
        )}
        {adicionais > 0 && (
          <DRERow 
            label="Outras Receitas" 
            value={formatCurrency(adicionais)} 
            percentual={calcularPercentual(adicionais, totalEntradas)}
            indent 
            colorClass="text-green-600" 
          />
        )}
        <DRERow 
          label="Total Entradas" 
          value={formatCurrency(totalEntradas)} 
          isCategoryTotal 
          colorClass="text-green-600" 
        />

        <div className="h-3" />

        {/* B) GASTOS FIXOS */}
        <p className="text-xs font-bold text-red-700 uppercase tracking-wider mb-1 flex items-center gap-1">
          <TrendingDown className="w-3 h-3" /> Gastos Fixos
        </p>
        {consignado > 0 && (
          <DRERow 
            label="Consignado" 
            value={formatCurrency(consignado)} 
            percentual={calcularPercentual(consignado, totalDespesas)}
            indent 
            colorClass="text-red-600" 
          />
        )}
        <DRERow 
          label="Total Gastos Fixos" 
          value={formatCurrency(totalGastosFixos)} 
          percentual={calcularPercentual(totalGastosFixos, totalDespesas)}
          isCategoryTotal
          colorClass="text-red-600" 
          onClick={() => abrirDetalhe('Gastos Fixos', [
            ...(consignado > 0 ? [{ nome: 'Consignado', valor: consignado }] : []),
            ...(gastoFixo > 0 ? [{ nome: 'Outros Gastos Fixos', valor: gastoFixo }] : [])
          ])}
          itens={[]}
        />

        <div className="h-3" />

        {/* C) INVESTIMENTOS */}
        <p className="text-xs font-bold text-blue-700 uppercase tracking-wider mb-1 flex items-center gap-1">
          <TrendingUp className="w-3 h-3" /> Investimentos
        </p>
        {investimentosLista.length > 0 && investimentosLista.map((inv, idx) => (
          <DRERow 
            key={idx}
            label={inv.nome} 
            value={formatCurrency(inv.valor)} 
            percentual={calcularPercentual(inv.valor, totalDespesas)}
            indent 
            colorClass="text-blue-600" 
          />
        ))}
        {totalInvestimentos > 0 ? (
          <DRERow 
            label="Total Investimentos" 
            value={formatCurrency(totalInvestimentos)} 
            percentual={calcularPercentual(totalInvestimentos, totalDespesas)}
            isCategoryTotal
            colorClass="text-blue-600" 
            onClick={() => investimentosLista.length > 0 && abrirDetalhe('Investimentos', investimentosLista)}
            itens={investimentosLista}
          />
        ) : (
          <p className="text-xs text-muted-foreground pl-4 py-1.5">Nenhum investimento</p>
        )}

        <div className="h-3" />

        {/* D) GASTOS VARIÁVEIS */}
        <p className="text-xs font-bold text-orange-700 uppercase tracking-wider mb-1 flex items-center gap-1">
          <TrendingDown className="w-3 h-3" /> Gastos Variáveis
        </p>
        {gastosVariaveisLista.length > 0 && gastosVariaveisLista.map((gasto, idx) => (
          <DRERow 
            key={idx}
            label={gasto.nome} 
            value={formatCurrency(gasto.valor)} 
            percentual={calcularPercentual(gasto.valor, totalDespesas)}
            indent 
            colorClass="text-orange-600" 
          />
        ))}
        {totalGastosVariaveis > 0 ? (
          <DRERow 
            label="Total Gastos Variáveis" 
            value={formatCurrency(totalGastosVariaveis)} 
            percentual={calcularPercentual(totalGastosVariaveis, totalDespesas)}
            isCategoryTotal
            colorClass="text-orange-600" 
            onClick={() => gastosVariaveisLista.length > 0 && abrirDetalhe('Gastos Variáveis', gastosVariaveisLista)}
            itens={gastosVariaveisLista}
          />
        ) : (
          <p className="text-xs text-muted-foreground pl-4 py-1.5">Nenhum gasto variável</p>
        )}

        <div className="h-3" />

        {/* Total de Despesas */}
        <DRERow 
          label="Total Despesas" 
          value={formatCurrency(totalDespesas)} 
          isTotal 
          colorClass="text-destructive" 
        />

        <div className="h-3" />

        {/* Resultado do Mês */}
        <div className={`flex items-center justify-between rounded-xl px-4 py-3 ${resultado >= 0 ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'}`}>
          <span className="flex items-center gap-2 font-bold text-sm">
            <Minus className="w-4 h-4" />
            Resultado do Mês
          </span>
          <span className={`text-lg font-bold ${resultado >= 0 ? 'text-green-700' : 'text-red-700'}`}>
            {formatCurrency(resultado)}
          </span>
        </div>

        {/* Dialog de detalhes */}
        <Dialog open={dialogAberto} onOpenChange={setDialogAberto}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                {categoriaSelecionada?.nome}
              </DialogTitle>
            </DialogHeader>
            {categoriaSelecionada && (
              <div className="space-y-2">
                {categoriaSelecionada.itens.map((item, idx) => (
                  <div key={idx} className="flex items-center justify-between py-2 border-b last:border-0">
                    <span className="text-sm text-muted-foreground">{item.nome}</span>
                    <span className="text-sm font-medium">{formatCurrency(item.valor)}</span>
                  </div>
                ))}
                <div className="flex items-center justify-between py-2 border-t mt-2 pt-2">
                  <span className="text-sm font-bold">Total</span>
                  <span className="text-base font-bold">
                    {formatCurrency(categoriaSelecionada.itens.reduce((s, i) => s + i.valor, 0))}
                  </span>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
}
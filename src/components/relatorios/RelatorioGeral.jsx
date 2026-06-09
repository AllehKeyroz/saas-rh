import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { formatCurrency } from '@/lib/formatters';
import DrilldownModal from './DrilldownModal';

export default function RelatorioGeral({ fechamentos, lancamentos, funcionarios, mesRef }) {
  const [drilldown, setDrilldown] = useState(null); // { titulo, lancamentos }
  const ativos = funcionarios.filter(f => f.ativo !== false);
  const [mesNum, anoStr] = mesRef.split('/');
  const mes = parseInt(mesNum) - 1;
  const ano = parseInt(anoStr);

  const lancMes = lancamentos.filter(l => {
    if (!l.data_lancamento) return false;
    const d = new Date(l.data_lancamento);
    return d.getMonth() === mes && d.getFullYear() === ano;
  });

  const rows = ativos.map(func => {
    const fl = lancMes.filter(l => l.funcionario_id === func.id);
    const fech = fechamentos.find(f => f.funcionario_id === func.id && f.mes_referencia === mesRef);
    const byTipo = (...tipos) => fl.filter(l => tipos.includes(l.tipo_lancamento));
    const sumTipo = (...tipos) => byTipo(...tipos).reduce((s, l) => s + (l.valor || 0), 0);

    return {
      func,
      fl,
      comissoes: sumTipo('comissao'),
      adicionais: sumTipo('adicional', 'ajuste'),
      vales: sumTipo('vale'),
      consignados: sumTipo('credito_consignado'),
      adiantamentos: sumTipo('adiantamento'),
      convenios: sumTipo('convenio'),
      consumos: sumTipo('consumo'),
      totalDescontos: fech?.total_descontos ?? sumTipo('vale', 'adiantamento', 'convenio', 'consumo', 'credito_consignado'),
      salarioLiquido: fech?.salario_liquido ?? ((func.salario_base || 0) + (func.ajuda_custo || 0) + sumTipo('adicional', 'ajuste', 'comissao') - sumTipo('vale', 'adiantamento', 'convenio', 'consumo', 'credito_consignado')),
      salarioBase: (func.salario_base || 0) + (func.ajuda_custo || 0),
      ajudaCusto: func.ajuda_custo || 0,
      byTipo,
    };
  });

  const totals = rows.reduce((acc, r) => ({
    salarioBase: acc.salarioBase + r.salarioBase,
    ajudaCusto: acc.ajudaCusto + r.ajudaCusto,
    comissoes: acc.comissoes + r.comissoes,
    adicionais: acc.adicionais + r.adicionais,
    vales: acc.vales + r.vales,
    consignados: acc.consignados + r.consignados,
    adiantamentos: acc.adiantamentos + r.adiantamentos,
    convenios: acc.convenios + r.convenios,
    consumos: acc.consumos + r.consumos,
    totalDescontos: acc.totalDescontos + r.totalDescontos,
    salarioLiquido: acc.salarioLiquido + r.salarioLiquido,
  }), { salarioBase: 0, ajudaCusto: 0, comissoes: 0, adicionais: 0, vales: 0, consignados: 0, adiantamentos: 0, convenios: 0, consumos: 0, totalDescontos: 0, salarioLiquido: 0 });

  const openDrill = (titulo, lancs) => {
    if (lancs.length === 0) return;
    setDrilldown({ titulo, lancamentos: lancs });
  };

  const ClickableValue = ({ value, lancamentos: lancs, className = '' }) => (
    lancs.length > 0 ? (
      <button
        onClick={() => openDrill('', lancs)}
        className={`underline decoration-dotted underline-offset-2 hover:opacity-70 transition-opacity font-semibold ${className}`}
        title="Clique para ver detalhes"
      >
        {formatCurrency(value)}
      </button>
    ) : (
      <span className={className}>{formatCurrency(value)}</span>
    )
  );

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>Relatório Geral — {mesRef}</CardTitle>
          <p className="text-xs text-muted-foreground">Clique sobre os valores para ver os lançamentos que os compõem</p>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>Função</TableHead>
                  <TableHead>Setor</TableHead>
                  <TableHead>Sal. Base</TableHead>
                  <TableHead>Ajuda Custo</TableHead>
                  <TableHead>Comissão</TableHead>
                  <TableHead>Adicionais</TableHead>
                  <TableHead>Vales</TableHead>
                  <TableHead>Consignado</TableHead>
                  <TableHead>Adiant.</TableHead>
                  <TableHead>Convênio</TableHead>
                  <TableHead>Consumo</TableHead>
                  <TableHead>Tot. Desc.</TableHead>
                  <TableHead>Sal. Líquido</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((r, i) => (
                  <TableRow key={i}>
                    <TableCell className="font-medium">{r.func.nome}</TableCell>
                    <TableCell>{r.func.funcao || '-'}</TableCell>
                    <TableCell>{r.func.setor || '-'}</TableCell>
                    <TableCell>{formatCurrency(r.salarioBase)}</TableCell>
                    <TableCell>{r.ajudaCusto > 0 ? formatCurrency(r.ajudaCusto) : '-'}</TableCell>
                      <TableCell>
                        <ClickableValue value={r.comissoes} lancamentos={r.byTipo('comissao')} className="text-emerald-600 font-medium" />
                      </TableCell>
                      <TableCell>
                        <ClickableValue value={r.adicionais} lancamentos={r.byTipo('adicional', 'ajuste')} className="text-green-600" />
                      </TableCell>
                      <TableCell>
                        <ClickableValue value={r.vales} lancamentos={r.byTipo('vale')} className="text-red-600" />
                      </TableCell>
                      <TableCell>
                        <ClickableValue value={r.consignados} lancamentos={r.byTipo('credito_consignado')} className="text-purple-600 font-medium" />
                      </TableCell>
                      <TableCell>
                        <ClickableValue value={r.adiantamentos} lancamentos={r.byTipo('adiantamento')} className="text-red-600" />
                      </TableCell>
                      <TableCell>
                        <ClickableValue value={r.convenios} lancamentos={r.byTipo('convenio')} className="text-red-600" />
                      </TableCell>
                      <TableCell>
                        <ClickableValue value={r.consumos} lancamentos={r.byTipo('consumo')} className="text-red-600" />
                      </TableCell>
                      <TableCell>
                        <ClickableValue value={r.totalDescontos} lancamentos={r.byTipo('vale', 'adiantamento', 'convenio', 'consumo', 'credito_consignado')} className="text-red-600" />
                      </TableCell>
                      <TableCell>
                        <ClickableValue value={r.salarioLiquido} lancamentos={r.fl} className="font-bold" />
                      </TableCell>
                  </TableRow>
                ))}
                <TableRow className="bg-muted font-bold">
                  <TableCell colSpan={3}>TOTAL</TableCell>
                  <TableCell>{formatCurrency(totals.salarioBase)}</TableCell>
                  <TableCell>{totals.ajudaCusto > 0 ? formatCurrency(totals.ajudaCusto) : '-'}</TableCell>
                  <TableCell className="text-emerald-600">{formatCurrency(totals.comissoes)}</TableCell>
                  <TableCell className="text-green-600">{formatCurrency(totals.adicionais)}</TableCell>
                  <TableCell className="text-red-600">{formatCurrency(totals.vales)}</TableCell>
                  <TableCell className="text-purple-600">{formatCurrency(totals.consignados)}</TableCell>
                  <TableCell className="text-red-600">{formatCurrency(totals.adiantamentos)}</TableCell>
                  <TableCell className="text-red-600">{formatCurrency(totals.convenios)}</TableCell>
                  <TableCell className="text-red-600">{formatCurrency(totals.consumos)}</TableCell>
                  <TableCell className="text-red-600">{formatCurrency(totals.totalDescontos)}</TableCell>
                  <TableCell>{formatCurrency(totals.salarioLiquido)}</TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {drilldown && (
        <DrilldownModal
          open={!!drilldown}
          onClose={() => setDrilldown(null)}
          titulo={drilldown.titulo}
          lancamentos={drilldown.lancamentos}
        />
      )}
    </>
  );
}
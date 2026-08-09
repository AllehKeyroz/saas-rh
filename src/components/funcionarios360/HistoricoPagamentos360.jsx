import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { client } from '@/api/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { formatCurrency, formatDate, getMesRef, getMesReferenciaAtual, mergeTipos } from '@/lib/formatters';
import { ChevronRight, TrendingUp, TrendingDown, FileText, AlertCircle } from 'lucide-react';

function calcularResumo(lancamentos, fechamento, tiposDesconto, tiposAdicional) {
  const descontos = lancamentos.filter(l => tiposDesconto.includes(l.tipo_lancamento));
  const adicionais = lancamentos.filter(l => tiposAdicional.includes(l.tipo_lancamento));
  const totalDescontos = descontos.reduce((s, l) => s + (l.valor || 0), 0);
  const totalAdicionais = adicionais.reduce((s, l) => s + (l.valor || 0), 0);

  const outros = lancamentos.filter(l => !tiposDesconto.includes(l.tipo_lancamento) && !tiposAdicional.includes(l.tipo_lancamento));

  return {
    totalDescontos: fechamento ? fechamento.total_descontos : totalDescontos,
    totalAdicionais: fechamento ? fechamento.total_adicionais : totalAdicionais,
    salarioBase: fechamento?.salario_base || null,
    salarioLiquido: fechamento?.salario_liquido || null,
    processado: !!fechamento,
    descontos,
    adicionais,
    outros,
    lancamentos,
    dataProcessamento: fechamento?.data_processamento || null,
  };
}

function ModalDetalhes({ mes, resumo, open, onClose }) {
  const { salarioBase, salarioLiquido, processado, descontos, adicionais, outros, lancamentos } = resumo;

  return (
    <Dialog open={open} onOpenChange={open => { if (!open) onClose(); }}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5" />
            Detalhes — {mes}
            {processado && <Badge variant="secondary" className="text-xs ml-2">Fechado</Badge>}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Resumo do fechamento */}
          {processado && (
            <div className="grid grid-cols-3 gap-3">
              <div className="p-3 bg-muted/50 rounded-lg">
                <p className="text-xs text-muted-foreground mb-1">Salário Base</p>
                <p className="text-sm font-semibold">{formatCurrency(salarioBase || 0)}</p>
              </div>
              <div className="p-3 bg-muted/50 rounded-lg">
                <p className="text-xs text-muted-foreground mb-1">Total Adicionais</p>
                <p className="text-sm font-semibold text-green-600">{formatCurrency(resumo.totalAdicionais)}</p>
              </div>
              <div className="p-3 bg-muted/50 rounded-lg">
                <p className="text-xs text-muted-foreground mb-1">Total Descontos</p>
                <p className="text-sm font-semibold text-red-600">{formatCurrency(resumo.totalDescontos)}</p>
              </div>
            </div>
          )}

          {/* Adicionais */}
          {adicionais.length > 0 && (
            <div>
              <h4 className="text-sm font-semibold text-green-700 mb-2 flex items-center gap-1.5">
                <TrendingUp className="w-4 h-4" /> Acréscimos ({adicionais.length})
              </h4>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Data</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Descrição</TableHead>
                    <TableHead className="text-right">Valor</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {adicionais.map(l => (
                    <TableRow key={l.id}>
                      <TableCell className="text-xs">{formatDate(l.data_lancamento)}</TableCell>
                      <TableCell><span className="text-xs capitalize">{l.tipo_lancamento}</span></TableCell>
                      <TableCell className="text-xs">{l.descricao || '-'}</TableCell>
                      <TableCell className="text-xs text-right text-green-600 font-medium">{formatCurrency(l.valor || 0)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}

          {/* Descontos */}
          {descontos.length > 0 && (
            <div>
              <h4 className="text-sm font-semibold text-red-700 mb-2 flex items-center gap-1.5">
                <TrendingDown className="w-4 h-4" /> Débitos ({descontos.length})
              </h4>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Data</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Descrição</TableHead>
                    <TableHead className="text-right">Valor</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {descontos.map(l => (
                    <TableRow key={l.id}>
                      <TableCell className="text-xs">{formatDate(l.data_lancamento)}</TableCell>
                      <TableCell><span className="text-xs capitalize">{l.tipo_lancamento}</span></TableCell>
                      <TableCell className="text-xs">{l.descricao || '-'}</TableCell>
                      <TableCell className="text-xs text-right text-red-600 font-medium">{formatCurrency(l.valor || 0)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}

          {/* Outros lançamentos não categorizados */}
          {outros.length > 0 && (
            <div>
              <h4 className="text-sm font-semibold text-muted-foreground mb-2 flex items-center gap-1.5">
                Outros Lançamentos ({outros.length})
              </h4>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Data</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Descrição</TableHead>
                    <TableHead className="text-right">Valor</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {outros.map(l => (
                    <TableRow key={l.id}>
                      <TableCell className="text-xs">{formatDate(l.data_lancamento)}</TableCell>
                      <TableCell><span className="text-xs capitalize">{l.tipo_lancamento}</span></TableCell>
                      <TableCell className="text-xs">{l.descricao || '-'}</TableCell>
                      <TableCell className="text-xs text-right font-medium">{formatCurrency(l.valor || 0)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}

          {lancamentos.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-4">Nenhum lançamento neste mês</p>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default function HistoricoPagamentos360({ funcionario, fechamentos, lancamentos, comissoes = [] }) {
  const [modalMes, setModalMes] = useState(null);

  const { data: tiposLancamento = [] } = useQuery({
    queryKey: ['tipos-lancamento-historico'],
    queryFn: () => client.entities.TipoLancamento.list(),
    staleTime: 60000,
  });

  const tiposDesconto = useMemo(() => mergeTipos(tiposLancamento, 'desconto'), [tiposLancamento]);
  const tiposAdicional = useMemo(() => mergeTipos(tiposLancamento, 'adicional'), [tiposLancamento]);

  // Agrupa lancamentos por mês
  const meses = useMemo(() => {
    const mapa = {};

    // Agrupa lancamentos individuais (FichaFinanceira)
    lancamentos.forEach(l => {
      if (!l.data_lancamento) return;
      const mes = getMesRef(l.data_lancamento);
      if (!mes) return;
      if (!mapa[mes]) mapa[mes] = [];
      mapa[mes].push(l);
    });

    // Adiciona comissões do módulo de comissões (ComissaoPorFuncionario)
    comissoes.forEach(c => {
      if (!c.mes_referencia || c.apto === false) return;
      if (!mapa[c.mes_referencia]) mapa[c.mes_referencia] = [];
      // Cria entrada sintética como adicional para aparecer no agrupamento
      mapa[c.mes_referencia].push({
        id: c.id,
        data_lancamento: `${c.mes_referencia.slice(3, 7)}-${c.mes_referencia.slice(0, 2)}-01`,
        tipo_lancamento: 'comissao',
        descricao: `Comissão${c.setor ? ` — ${c.setor}` : ''}`,
        valor: c.valor_individual_final ?? c.valor_individual ?? 0,
        _fonte: 'comissao_modulo',
      });
    });

    // Se há fechamento sem lançamentos, cria entrada vazia
    fechamentos.forEach(f => {
      if (!mapa[f.mes_referencia]) {
        mapa[f.mes_referencia] = [];
      }
    });

    // Converte "MM/AAAA" para "YYYYMM" para comparação segura
    const mesParaNum = (m) => parseInt(m.slice(3, 7) + m.slice(0, 2), 10);
    const mesAtualNum = mesParaNum(getMesReferenciaAtual());

    return Object.entries(mapa)
      .map(([mes, lista]) => {
        const fechamento = fechamentos.find(f => f.mes_referencia === mes);
        return { mes, lancamentos: lista, fechamento, num: mesParaNum(mes) };
      })
      // Remove meses futuros
      .filter(({ num }) => num <= mesAtualNum)
      // Ordena do mais recente para o mais antigo
      .sort((a, b) => b.num - a.num);
  }, [lancamentos, fechamentos, comissoes]);

  if (meses.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Histórico de Pagamentos</CardTitle>
        </CardHeader>
        <CardContent className="text-center py-8 text-muted-foreground">
          <p>Nenhum pagamento registrado</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <h3 className="text-lg font-semibold">Histórico de Pagamentos</h3>

      <div className="space-y-3">
        {meses.map(({ mes, lancamentos: lancs, fechamento }) => {
          const resumo = calcularResumo(lancs, fechamento, tiposDesconto, tiposAdicional);
          const saldo = resumo.salarioLiquido != null
            ? resumo.salarioLiquido
            : (resumo.totalAdicionais - resumo.totalDescontos);

          return (
            <Card
              key={mes}
              className="cursor-pointer hover:shadow-md transition-shadow"
              onClick={() => setModalMes(mes)}
            >
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-sm font-bold">{mes}</span>
                      {fechamento && (
                        <Badge variant="secondary" className="text-xs">Fechado</Badge>
                      )}
                      <span className="text-xs text-muted-foreground">
                        {lancs.length} lançamento(s)
                      </span>
                    </div>

                    {!fechamento && (
                      <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-1.5">
                        <AlertCircle className="w-3 h-3" />
                        Sem fechamento de salário neste mês
                      </div>
                    )}
                    <div className="flex flex-wrap items-center gap-x-6 gap-y-1 text-sm">
                      {resumo.salarioBase != null && (
                        <span className="text-muted-foreground">
                          Salário: <span className="font-medium text-foreground">{formatCurrency(resumo.salarioBase)}</span>
                        </span>
                      )}
                      <span className="text-green-600 flex items-center gap-1">
                        <TrendingUp className="w-3.5 h-3.5" />
                        +{formatCurrency(resumo.totalAdicionais)}
                      </span>
                      <span className="text-red-600 flex items-center gap-1">
                        <TrendingDown className="w-3.5 h-3.5" />
                        -{formatCurrency(resumo.totalDescontos)}
                      </span>
                      <span className="font-semibold">
                        Saldo: {formatCurrency(saldo)}
                      </span>
                    </div>
                  </div>

                  <ChevronRight className="w-5 h-5 text-muted-foreground shrink-0 ml-4" />
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Modal de detalhes */}
      {modalMes && (
        <ModalDetalhes
          mes={modalMes}
          resumo={(() => {
            const entry = meses.find(m => m.mes === modalMes);
            return entry ? calcularResumo(entry.lancamentos, entry.fechamento, tiposDesconto, tiposAdicional) : { totalDescontos: 0, totalAdicionais: 0, descontos: [], adicionais: [], outros: [], lancamentos: [] };
          })()}
          open={!!modalMes}
          onClose={() => setModalMes(null)}
        />
      )}
    </div>
  );
}

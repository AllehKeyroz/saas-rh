import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { formatCurrency } from '@/lib/formatters';
import { TrendingDown, TrendingUp, Wallet } from 'lucide-react';

const TIPO_LABELS = {
  vale: 'Vale',
  adiantamento: 'Adiantamento',
  convenio: 'Convênio',
  consumo: 'Consumo',
  adicional: 'Adicional',
  ajuste: 'Ajuste',
  comissao: 'Comissão',
  credito_consignado: 'Crédito Consignado',
};

const DESCONTOS = ['vale', 'adiantamento', 'convenio', 'consumo', 'credito_consignado'];
const ADICIONAIS = ['adicional', 'ajuste', 'comissao'];

export default function DetalhesFechamentoModal({ func, lancamentos, mesRef, onClose }) {
  if (!func) return null;

  const [mesNum, anoStr] = mesRef.split('/');
  const mes = parseInt(mesNum) - 1;
  const ano = parseInt(anoStr);

  const funcLanc = lancamentos.filter(l => {
    if (l.funcionario_id !== func.id) return false;
    if (!l.data_lancamento) return false;
    const d = new Date(l.data_lancamento);
    return d.getMonth() === mes && d.getFullYear() === ano;
  });

  const descontoLanc = funcLanc.filter(l => DESCONTOS.includes(l.tipo_lancamento));
  const adicionalLanc = funcLanc.filter(l => ADICIONAIS.includes(l.tipo_lancamento));

  const totalDescontos = descontoLanc.reduce((s, l) => s + (l.valor || 0), 0);
  const totalAdicionais = adicionalLanc.reduce((s, l) => s + (l.valor || 0), 0);
  const salarioLiquido = (func.salario_base || 0) + (func.ajuda_custo || 0) + totalAdicionais - totalDescontos;

  const LancItem = ({ item }) => (
    <div className="flex items-center justify-between py-2 px-3 rounded-lg hover:bg-muted/50 transition-colors">
      <div className="flex flex-col">
        <span className="text-sm font-medium">{TIPO_LABELS[item.tipo_lancamento] || item.tipo_lancamento}</span>
        {item.descricao && <span className="text-xs text-muted-foreground">{item.descricao}</span>}
        <span className="text-xs text-muted-foreground">{item.data_lancamento}</span>
      </div>
      <span className={`font-semibold text-sm ${DESCONTOS.includes(item.tipo_lancamento) ? 'text-destructive' : 'text-green-600'}`}>
        {DESCONTOS.includes(item.tipo_lancamento) ? '–' : '+'}{formatCurrency(item.valor || 0)}
      </span>
    </div>
  );

  return (
    <Dialog open={!!func} onOpenChange={onClose}>
      <DialogContent className="max-w-md max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-lg">{func.nome}</DialogTitle>
          <p className="text-sm text-muted-foreground">Detalhes — {mesRef}</p>
        </DialogHeader>

        {/* Resumo */}
        <div className="grid grid-cols-3 gap-3 mt-2">
          <div className="bg-muted/50 rounded-xl p-3 text-center">
            <p className="text-xs text-muted-foreground mb-1">Salário Base</p>
            <p className="font-bold text-sm">{formatCurrency(func.salario_base || 0)}</p>
          </div>
          {func.ajuda_custo > 0 && (
            <div className="bg-blue-50 rounded-xl p-3 text-center">
              <p className="text-xs text-muted-foreground mb-1">Ajuda de Custo</p>
              <p className="font-bold text-sm text-blue-600">{formatCurrency(func.ajuda_custo)}</p>
            </div>
          )}
          <div className="bg-red-50 rounded-xl p-3 text-center">
            <p className="text-xs text-muted-foreground mb-1">Descontos</p>
            <p className="font-bold text-sm text-destructive">–{formatCurrency(totalDescontos)}</p>
          </div>
          <div className="bg-green-50 rounded-xl p-3 text-center">
            <p className="text-xs text-muted-foreground mb-1">Acréscimos</p>
            <p className="font-bold text-sm text-green-600">+{formatCurrency(totalAdicionais)}</p>
          </div>
        </div>

        {/* Salário líquido */}
        <div className="flex items-center justify-between bg-primary/5 border border-primary/20 rounded-xl px-4 py-3">
          <div className="flex items-center gap-2">
            <Wallet className="w-4 h-4 text-primary" />
            <span className="font-semibold text-sm">Salário Líquido</span>
          </div>
          <span className="font-bold text-base text-primary">{formatCurrency(salarioLiquido)}</span>
        </div>

        {funcLanc.length === 0 ? (
          <p className="text-center text-muted-foreground text-sm py-6">Nenhum lançamento neste mês.</p>
        ) : (
          <>
            {/* Descontos */}
            {descontoLanc.length > 0 && (
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <TrendingDown className="w-4 h-4 text-destructive" />
                  <span className="text-sm font-semibold text-destructive">Descontos</span>
                  <Badge variant="destructive" className="text-xs ml-auto">{formatCurrency(totalDescontos)}</Badge>
                </div>
                <div className="space-y-1">
                  {descontoLanc.map(l => <LancItem key={l.id} item={l} />)}
                </div>
              </div>
            )}

            {descontoLanc.length > 0 && adicionalLanc.length > 0 && <Separator />}

            {/* Acréscimos */}
            {adicionalLanc.length > 0 && (
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <TrendingUp className="w-4 h-4 text-green-600" />
                  <span className="text-sm font-semibold text-green-600">Acréscimos</span>
                  <Badge className="text-xs ml-auto bg-green-100 text-green-700">{formatCurrency(totalAdicionais)}</Badge>
                </div>
                <div className="space-y-1">
                  {adicionalLanc.map(l => <LancItem key={l.id} item={l} />)}
                </div>
              </div>
            )}
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
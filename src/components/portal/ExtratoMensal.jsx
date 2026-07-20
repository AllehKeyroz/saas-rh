import React, { useMemo } from 'react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { FileText, Eye, AlertTriangle } from 'lucide-react';
import { formatCurrency, formatDate, TIPOS_ADICIONAL_DEFAULT, TIPO_LABELS as GLOBAL_TIPO_LABELS } from '@/lib/formatters';

const TIPOS_LIMITE_BASE = ['vale', 'vale_parcelado', 'adiantamento', 'convenio', 'consumo', 'credito_consignado'];

const TIPO_LABELS_BASE = {
  ...GLOBAL_TIPO_LABELS,
  adicional: 'Adicional',
  ajuste: 'Ajuste',
  comissao: 'Comissão',
  receita_extra: 'Receita Extra',
};

export default function ExtratoMensal({ funcionario, lancamentosMes, mesSelecionado, onVerComprovante, receitasExtras = [], tiposPersonalizados = [] }) {
  const perm = funcionario?.permissoes_portal || {};

  const tiposDesconto = useMemo(() => {
    const extras = tiposPersonalizados
      .filter(t => t.ativo !== false && t.categoria === 'desconto')
      .map(t => t.nome);
    return [...TIPOS_LIMITE_BASE, ...extras];
  }, [tiposPersonalizados]);

  const labels = useMemo(() => {
    const extra = Object.fromEntries(
      tiposPersonalizados
        .filter(t => t.ativo !== false)
        .map(t => [t.nome, t.nome])
    );
    return { ...TIPO_LABELS_BASE, ...extra };
  }, [tiposPersonalizados]);

  if (perm.ver_extrato_completo === false) {
    return (
      <Card>
        <CardContent className="pt-6 flex flex-col items-center gap-3 py-10 text-center">
          <AlertTriangle className="w-8 h-8 text-muted-foreground" />
          <p className="text-muted-foreground text-sm">Você não tem permissão para ver o extrato completo.</p>
        </CardContent>
      </Card>
    );
  }

  const totalDebitos = lancamentosMes
    .filter(l => tiposDesconto.includes(l.tipo_lancamento) && !l.parcelado)
    .reduce((s, l) => s + (l.valor || 0), 0);
  const totalCreditos = lancamentosMes
    .filter(l => TIPOS_ADICIONAL_DEFAULT.includes(l.tipo_lancamento) || l.parcelado)
    .reduce((s, l) => s + (l.valor || 0), 0);
  const totalReceitasExtras = receitasExtras.reduce((s, r) => s + (r.valor || 0), 0);
  const salarioBaseExibir = funcionario?.salario_base || 0;
  const ajudaCustoExibir = funcionario?.ajuda_custo || 0;
  const saldoBase = salarioBaseExibir + ajudaCustoExibir;
  const saldoFinal = saldoBase + totalCreditos + totalReceitasExtras - totalDebitos;

  const sorted = [...lancamentosMes].sort((a, b) => (b.data_lancamento || '').localeCompare(a.data_lancamento || ''));

  const isDebito = (l) => tiposDesconto.includes(l.tipo_lancamento) && !l.parcelado;

  return (
    <div className="space-y-5">
      {/* Resumo */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="bg-card border rounded-xl p-3 text-center">
          <p className="text-xs text-muted-foreground mb-1">Créditos</p>
          <p className="font-bold text-sm text-green-600">+ {formatCurrency(totalCreditos)}</p>
        </div>
        <div className="bg-card border rounded-xl p-3 text-center">
          <p className="text-xs text-muted-foreground mb-1">Débitos</p>
          <p className="font-bold text-sm text-destructive">- {formatCurrency(totalDebitos)}</p>
        </div>
        <div className="bg-card border rounded-xl p-3 text-center">
          <p className="text-xs text-muted-foreground mb-1">Saldo Final</p>
          <p className={`font-bold text-sm ${saldoFinal >= 0 ? 'text-primary' : 'text-destructive'}`}>{formatCurrency(saldoFinal)}</p>
        </div>
      </div>

      {/* Lançamentos */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <FileText className="w-4 h-4 text-primary" />
            Lançamentos — {mesSelecionado}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {/* Salário base */}
          {salarioBaseExibir > 0 && (
            <div className="flex items-center justify-between py-2.5 border-b">
              <div>
                <span className="text-sm font-medium">Salário Base</span>
                <p className="text-xs text-muted-foreground">Competência {mesSelecionado}</p>
              </div>
              <span className="text-sm font-bold text-green-600">+ {formatCurrency(salarioBaseExibir)}</span>
            </div>
          )}
          {ajudaCustoExibir > 0 && (
            <div className="flex items-center justify-between py-2.5 border-b">
              <div>
                <span className="text-sm font-medium">Ajuda de Custo</span>
                <p className="text-xs text-muted-foreground">Competência {mesSelecionado}</p>
              </div>
              <span className="text-sm font-bold text-blue-600">+ {formatCurrency(ajudaCustoExibir)}</span>
            </div>
          )}

          {/* Receitas Extras */}
          {receitasExtras.sort((a, b) => (b.data_lancamento || '').localeCompare(a.data_lancamento || '')).map(r => (
            <div key={r.id} className="flex items-center justify-between py-2.5 border-b">
              <div className="flex-1">
                <span className="text-sm font-medium">Receita Extra — {r.categoria_nome}</span>
                {r.descricao && <span className="text-xs text-muted-foreground ml-1">— {r.descricao}</span>}
                <p className="text-xs text-muted-foreground">{formatDate(r.data_lancamento)}</p>
              </div>
              <span className="text-sm font-bold text-blue-600">+ {formatCurrency(r.valor)}</span>
            </div>
          ))}

          {sorted.length === 0 && saldoBase === 0 && receitasExtras.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-6">Nenhum lançamento neste mês.</p>
          ) : (
            sorted.map(l => {
              const debito = isDebito(l);
              const isParcelado = l.tipo_lancamento === 'vale_parcelado' && l.total_parcelas;
              return (
                <div key={l.id} className="flex items-center justify-between py-2.5 border-b last:border-b-0">
                  <div className="flex-1">
                    <span className="text-sm font-medium">{labels[l.tipo_lancamento] || l.tipo_lancamento}</span>
                    {isParcelado && l.parcela_numero && (
                      <Badge variant="outline" className="ml-1.5 text-[10px] h-4 px-1.5 font-normal bg-rose-50 text-rose-700 border-rose-200">
                        {l.parcela_numero}/{l.total_parcelas}
                      </Badge>
                    )}
                    {l.parcelado && (
                      <Badge variant="outline" className="ml-1.5 text-[10px] h-4 px-1.5 font-normal bg-green-50 text-green-700 border-green-200">
                        Recebimento à vista
                      </Badge>
                    )}
                    {l.descricao && <span className="text-xs text-muted-foreground ml-1">— {l.descricao}</span>}
                    <p className="text-xs text-muted-foreground">{formatDate(l.data_lancamento)}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    {l.comprovante && (
                      <Button size="icon" variant="ghost" className="h-10 w-10" onClick={() => onVerComprovante(l)}>
                        <Eye className="w-4 h-4" />
                      </Button>
                    )}
                    <span className={`text-sm font-bold ${debito ? 'text-destructive' : 'text-green-600'}`}>
                      {debito ? '-' : '+'} {formatCurrency(l.valor)}
                    </span>
                  </div>
                </div>
              );
            })
          )}

          {/* Total */}
          <div className="flex items-center justify-between pt-3 mt-2">
            <span className="text-sm font-semibold">Saldo Final Estimado</span>
            <span className={`text-base font-bold ${saldoFinal >= 0 ? 'text-primary' : 'text-destructive'}`}>
              {formatCurrency(saldoFinal)}
            </span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
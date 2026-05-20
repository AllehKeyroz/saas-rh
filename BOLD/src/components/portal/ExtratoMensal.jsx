import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { FileText, Eye, AlertTriangle } from 'lucide-react';
import { formatCurrency, formatDate } from '@/lib/formatters';

const TIPOS_LIMITE = ['vale', 'adiantamento', 'convenio', 'consumo', 'credito_consignado'];

const TIPO_LABELS = {
  vale: 'Vale',
  adiantamento: 'Adiantamento',
  convenio: 'Convênio',
  consumo: 'Consumo',
  credito_consignado: 'Crédito Consignado',
  adicional: 'Adicional',
  ajuste: 'Ajuste',
  comissao: 'Comissão',
  receita_extra: 'Receita Extra',
};

const TIPO_GRUPOS = {
  debito: ['vale', 'adiantamento', 'convenio', 'consumo', 'credito_consignado'],
  credito: ['adicional', 'ajuste', 'comissao', 'receita_extra'],
};

export default function ExtratoMensal({ funcionario, lancamentosMes, mesSelecionado, onVerComprovante, receitasExtras = [] }) {
  const perm = funcionario?.permissoes_portal || {};

  if (!perm.ver_extrato_completo) {
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
    .filter(l => TIPOS_LIMITE.includes(l.tipo_lancamento))
    .reduce((s, l) => s + (l.valor || 0), 0);
  const totalCreditos = lancamentosMes
    .filter(l => !TIPOS_LIMITE.includes(l.tipo_lancamento))
    .reduce((s, l) => s + (l.valor || 0), 0);
  const totalReceitasExtras = receitasExtras.reduce((s, r) => s + (r.valor || 0), 0);
  const saldoBase = funcionario?.salario_base || 0;
  const saldoFinal = saldoBase + totalCreditos + totalReceitasExtras - totalDebitos;

  const sorted = [...lancamentosMes].sort((a, b) => (b.data_lancamento || '').localeCompare(a.data_lancamento || ''));

  return (
    <div className="space-y-5">
      {/* Resumo */}
      <div className="grid grid-cols-3 gap-3">
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

      {/* Salário base na lista */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <FileText className="w-4 h-4 text-primary" />
            Lançamentos — {mesSelecionado}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {/* Salário base */}
          {saldoBase > 0 && (
            <div className="flex items-center justify-between py-2.5 border-b">
              <div>
                <span className="text-sm font-medium">Salário Base</span>
                <p className="text-xs text-muted-foreground">Competência {mesSelecionado}</p>
              </div>
              <span className="text-sm font-bold text-green-600">+ {formatCurrency(saldoBase)}</span>
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
              const isDebito = TIPOS_LIMITE.includes(l.tipo_lancamento);
              return (
                <div key={l.id} className="flex items-center justify-between py-2.5 border-b last:border-b-0">
                  <div className="flex-1">
                    <span className="text-sm font-medium">{TIPO_LABELS[l.tipo_lancamento] || l.tipo_lancamento}</span>
                    {l.descricao && <span className="text-xs text-muted-foreground ml-1">— {l.descricao}</span>}
                    <p className="text-xs text-muted-foreground">{formatDate(l.data_lancamento)}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    {l.comprovante && (
                      <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => onVerComprovante(l)}>
                        <Eye className="w-3.5 h-3.5" />
                      </Button>
                    )}
                    <span className={`text-sm font-bold ${isDebito ? 'text-destructive' : 'text-green-600'}`}>
                      {isDebito ? '-' : '+'} {formatCurrency(l.valor)}
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
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Wallet, Info, Eye, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { formatCurrency, formatDate } from '@/lib/formatters';

const TIPO_LABELS = {
  vale: 'Vale',
  adiantamento: 'Adiantamento',
  convenio: 'Convênio',
  consumo: 'Consumo',
  credito_consignado: 'Crédito Consignado',
};

export default function MeusVales({ funcionario, lancamentosLimiteMes, totalValesMes, mesSelecionado, onVerComprovante }) {
  const perm = funcionario?.permissoes_portal || {};
  const limite = funcionario?.limite_vales;
  const percentual = limite ? Math.min((totalValesMes / limite) * 100, 100) : null;
  const disponivel = limite ? Math.max(limite - totalValesMes, 0) : null;

  if (!perm.ver_limite_vales && !perm.ver_extrato_vales) {
    return (
      <Card>
        <CardContent className="pt-6 flex flex-col items-center gap-3 py-10 text-center">
          <AlertTriangle className="w-8 h-8 text-muted-foreground" />
          <p className="text-muted-foreground text-sm">Você não tem permissão para ver informações de vales.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-5">
      {/* Alertas */}
      {percentual !== null && percentual >= 50 && (
        <div className={`flex items-start gap-3 rounded-xl px-4 py-3 border ${percentual >= 100 ? 'bg-red-50 border-red-200' : percentual >= 80 ? 'bg-yellow-50 border-yellow-200' : 'bg-blue-50 border-blue-200'}`}>
          {percentual >= 80 ? (
            <AlertTriangle className={`w-5 h-5 shrink-0 mt-0.5 ${percentual >= 100 ? 'text-destructive' : 'text-yellow-600'}`} />
          ) : (
            <Info className="w-5 h-5 shrink-0 mt-0.5 text-blue-600" />
          )}
          <p className={`text-sm font-medium ${percentual >= 100 ? 'text-red-700' : percentual >= 80 ? 'text-yellow-700' : 'text-blue-700'}`}>
            {percentual >= 100
              ? 'Limite atingido! Nenhum novo desconto pode ser lançado.'
              : percentual >= 80
              ? `Atenção: ${percentual.toFixed(0)}% do limite utilizado.`
              : `${percentual.toFixed(0)}% do limite utilizado.`}
          </p>
        </div>
      )}

      {/* Cards de resumo */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-card border rounded-xl p-3 text-center">
          <p className="text-xs text-muted-foreground mb-1">Limite</p>
          <p className="font-bold text-sm">{limite ? formatCurrency(limite) : '—'}</p>
        </div>
        <div className="bg-card border rounded-xl p-3 text-center">
          <p className="text-xs text-muted-foreground mb-1">Utilizado</p>
          <p className="font-bold text-sm text-destructive">{formatCurrency(totalValesMes)}</p>
        </div>
        <div className="bg-card border rounded-xl p-3 text-center">
          <p className="text-xs text-muted-foreground mb-1">Disponível</p>
          <p className="font-bold text-sm text-green-600">{disponivel !== null ? formatCurrency(disponivel) : '—'}</p>
        </div>
      </div>

      {/* Barra de progresso */}
      {percentual !== null && (
        <Card>
          <CardContent className="pt-4 space-y-2">
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>Utilização do limite</span>
              <span className={`font-bold ${percentual >= 100 ? 'text-destructive' : percentual >= 80 ? 'text-yellow-600' : 'text-green-600'}`}>
                {percentual.toFixed(0)}%
              </span>
            </div>
            <div className="w-full h-3 rounded-full bg-muted overflow-hidden">
              <div
                className={`h-full rounded-full transition-all ${percentual >= 100 ? 'bg-destructive' : percentual >= 80 ? 'bg-yellow-500' : 'bg-green-500'}`}
                style={{ width: `${Math.min(percentual, 100)}%` }}
              />
            </div>
          </CardContent>
        </Card>
      )}

      {/* Informativo */}
      <div className="flex items-start gap-2 bg-blue-50 border border-blue-200 rounded-lg px-3 py-2">
        <Info className="w-4 h-4 text-blue-500 mt-0.5 shrink-0" />
        <p className="text-xs text-blue-700">
          O limite de <strong>40%</strong> inclui: vale, adiantamento, convênio, consumo e crédito consignado.
        </p>
      </div>

      {/* Lista de lançamentos */}
      {perm.ver_extrato_vales && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Wallet className="w-4 h-4 text-primary" />
              Lançamentos — {mesSelecionado}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {lancamentosLimiteMes.length === 0 ? (
              <div className="flex flex-col items-center gap-2 py-8 text-center">
                <CheckCircle2 className="w-8 h-8 text-green-500" />
                <p className="text-sm text-muted-foreground">Nenhum desconto este mês.</p>
              </div>
            ) : (
              <div className="space-y-1">
                {lancamentosLimiteMes.map(l => (
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
                      <span className="text-sm font-bold text-destructive">- {formatCurrency(l.valor)}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
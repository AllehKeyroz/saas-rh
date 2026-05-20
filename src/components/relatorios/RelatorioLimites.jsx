import React, { useMemo, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { AlertTriangle, CheckCircle2, XCircle, TrendingUp } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';

const TIPOS_DESCONTO = ['vale', 'adiantamento', 'convenio', 'consumo'];

function getStatus(pct) {
  if (pct >= 100) return { label: 'Limite atingido', color: 'destructive', icon: XCircle, barColor: 'bg-red-500' };
  if (pct >= 80) return { label: 'Próximo do limite', color: 'outline', icon: AlertTriangle, barColor: 'bg-amber-500', textColor: 'text-amber-600' };
  return { label: 'Dentro do limite', color: 'secondary', icon: CheckCircle2, barColor: 'bg-green-500', textColor: 'text-green-600' };
}

export default function RelatorioLimites({ funcionarios, lancamentos, mesRef }) {
  const [filtro, setFiltro] = React.useState('todos');

  const dados = useMemo(() => {
    return funcionarios
      .filter(f => f.ativo !== false && f.limite_vales > 0)
      .map(f => {
        const lancs = lancamentos.filter(l =>
          l.funcionario_id === f.id &&
          l.data_lancamento?.startsWith(mesRef.split('/').reverse().join('-').substring(0, 7)) &&
          TIPOS_DESCONTO.includes(l.tipo_lancamento)
        );
        const total = lancs.reduce((s, l) => s + (l.valor || 0), 0);
        const pct = Math.round((total / f.limite_vales) * 100);
        return { ...f, total_descontos: total, percentual: pct };
      })
      .sort((a, b) => b.percentual - a.percentual);
  }, [funcionarios, lancamentos, mesRef]);

  const filtrados = useMemo(() => {
    if (filtro === 'atingido') return dados.filter(d => d.percentual >= 100);
    if (filtro === 'alerta') return dados.filter(d => d.percentual >= 80 && d.percentual < 100);
    if (filtro === 'ok') return dados.filter(d => d.percentual < 80);
    return dados;
  }, [dados, filtro]);

  const totalAtingido = dados.filter(d => d.percentual >= 100).length;
  const totalAlerta = dados.filter(d => d.percentual >= 80 && d.percentual < 100).length;
  const totalOk = dados.filter(d => d.percentual < 80).length;

  if (dados.length === 0) {
    return (
      <div className="text-center py-16 text-muted-foreground">
        <TrendingUp className="w-10 h-10 mx-auto mb-2 opacity-30" />
        <p className="font-medium">Nenhum funcionário com limite de vales definido</p>
        <p className="text-xs mt-1">Configure o campo "Limite de vales" no cadastro de cada funcionário</p>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Resumo */}
      <div className="grid grid-cols-3 gap-3">
        <div className="rounded-xl border bg-red-50 p-4 text-center">
          <p className="text-2xl font-bold text-red-600">{totalAtingido}</p>
          <p className="text-xs text-red-500 mt-1">Limite atingido</p>
        </div>
        <div className="rounded-xl border bg-amber-50 p-4 text-center">
          <p className="text-2xl font-bold text-amber-600">{totalAlerta}</p>
          <p className="text-xs text-amber-500 mt-1">Próximo do limite</p>
        </div>
        <div className="rounded-xl border bg-green-50 p-4 text-center">
          <p className="text-2xl font-bold text-green-600">{totalOk}</p>
          <p className="text-xs text-green-500 mt-1">Dentro do limite</p>
        </div>
      </div>

      {/* Filtro */}
      <div className="flex items-center gap-3">
        <Label className="text-sm shrink-0">Filtrar por:</Label>
        <Select value={filtro} onValueChange={setFiltro}>
          <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos ({dados.length})</SelectItem>
            <SelectItem value="atingido">Limite atingido ({totalAtingido})</SelectItem>
            <SelectItem value="alerta">Próximo do limite ({totalAlerta})</SelectItem>
            <SelectItem value="ok">Dentro do limite ({totalOk})</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Lista */}
      <div className="divide-y border rounded-xl overflow-hidden bg-card">
        {filtrados.map(f => {
          const st = getStatus(f.percentual);
          const Icon = st.icon;
          return (
            <div key={f.id} className="px-4 py-3">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <Icon className={`w-4 h-4 ${st.textColor || 'text-red-500'}`} />
                  <span className="font-medium text-sm">{f.nome}</span>
                  {f.setor && <span className="text-xs text-muted-foreground">· {f.setor}</span>}
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-xs text-muted-foreground">
                    R$ {f.total_descontos.toFixed(2)} / R$ {f.limite_vales.toFixed(2)}
                  </span>
                  <Badge variant={st.color} className={`text-xs ${f.percentual >= 80 && f.percentual < 100 ? 'border-amber-400 text-amber-700' : ''}`}>
                    {f.percentual}%
                  </Badge>
                </div>
              </div>
              <Progress value={Math.min(f.percentual, 100)} className="h-2" indicatorClassName={st.barColor} />
            </div>
          );
        })}
        {filtrados.length === 0 && (
          <div className="text-center py-8 text-muted-foreground text-sm">
            Nenhum funcionário nesta categoria
          </div>
        )}
      </div>
    </div>
  );
}
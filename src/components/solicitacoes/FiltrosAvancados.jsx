import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Search, SlidersHorizontal, X } from 'lucide-react';

const TIPO_LABELS = {
  ferias: 'Férias',
  vale: 'Vale',
  banco_horas: 'Banco de Horas',
  atestado: 'Atestado',
  documento: 'Documento',
  outro: 'Outro',
};

export default function FiltrosAvancados({ filtros, onChange, totalFiltradas, totalGeral }) {
  const [expandido, setExpandido] = useState(false);

  const setFiltro = (campo, valor) => onChange({ ...filtros, [campo]: valor });

  const limparTodos = () => onChange({
    status: 'todos',
    tipo: 'todos',
    funcionario: '',
    dataInicio: '',
    dataFim: '',
  });

  const temFiltroAtivo = filtros.status !== 'todos' || filtros.tipo !== 'todos'
    || filtros.funcionario || filtros.dataInicio || filtros.dataFim;

  const contadorAtivos = [
    filtros.status !== 'todos',
    filtros.tipo !== 'todos',
    !!filtros.funcionario,
    !!(filtros.dataInicio || filtros.dataFim),
  ].filter(Boolean).length;

  return (
    <div className="bg-card border rounded-xl p-4 space-y-3">
      {/* Linha principal */}
      <div className="flex flex-wrap gap-3 items-center">
        {/* Busca por funcionário */}
        <div className="relative flex-1 min-w-[180px]">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
          <Input
            className="pl-8 h-9 text-sm"
            placeholder="Buscar funcionário..."
            value={filtros.funcionario}
            onChange={e => setFiltro('funcionario', e.target.value)}
          />
          {filtros.funcionario && (
            <button className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              onClick={() => setFiltro('funcionario', '')}>
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Status */}
        <Select value={filtros.status} onValueChange={v => setFiltro('status', v)}>
          <SelectTrigger className="w-36 h-9 text-sm">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos status</SelectItem>
            <SelectItem value="pendente">Pendentes</SelectItem>
            <SelectItem value="aprovado">Aprovados</SelectItem>
            <SelectItem value="recusado">Recusados</SelectItem>
          </SelectContent>
        </Select>

        {/* Tipo */}
        <Select value={filtros.tipo} onValueChange={v => setFiltro('tipo', v)}>
          <SelectTrigger className="w-44 h-9 text-sm">
            <SelectValue placeholder="Tipo" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos os tipos</SelectItem>
            {Object.entries(TIPO_LABELS).map(([k, v]) => (
              <SelectItem key={k} value={k}>{v}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Botão filtros adicionais */}
        <Button
          size="sm"
          variant={expandido ? 'default' : 'outline'}
          className="gap-1.5 h-9 shrink-0"
          onClick={() => setExpandido(e => !e)}
        >
          <SlidersHorizontal className="w-4 h-4" />
          Data
          {contadorAtivos > 0 && (
            <Badge className="bg-white text-primary text-xs px-1.5 py-0 ml-0.5 h-4">{contadorAtivos}</Badge>
          )}
        </Button>

        {temFiltroAtivo && (
          <button onClick={limparTodos} className="text-xs text-muted-foreground hover:text-destructive flex items-center gap-1 transition-colors">
            <X className="w-3.5 h-3.5" /> Limpar filtros
          </button>
        )}

        <span className="text-xs text-muted-foreground ml-auto shrink-0">
          {totalFiltradas} de {totalGeral} resultado(s)
        </span>
      </div>

      {/* Filtros de data expansível */}
      {expandido && (
        <div className="pt-3 border-t grid grid-cols-2 gap-3">
          <div>
            <Label className="text-xs text-muted-foreground mb-1 block">Data de envio — de</Label>
            <Input
              type="date"
              className="h-9 text-sm"
              value={filtros.dataInicio}
              onChange={e => setFiltro('dataInicio', e.target.value)}
            />
          </div>
          <div>
            <Label className="text-xs text-muted-foreground mb-1 block">Data de envio — até</Label>
            <Input
              type="date"
              className="h-9 text-sm"
              value={filtros.dataFim}
              onChange={e => setFiltro('dataFim', e.target.value)}
            />
          </div>
        </div>
      )}
    </div>
  );
}
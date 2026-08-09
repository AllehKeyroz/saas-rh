import React, { useState, useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { client } from '@/api/client';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Search, User, Plus, Calendar, FileText, X, CheckCircle2, Ban, Stethoscope } from 'lucide-react';
import { toast } from 'sonner';
import { formatDate } from '@/lib/formatters';
import { registrarAuditoria } from '@/lib/audit';
import { getTipoAfastamento, getHojeISO, isAfastamentoAtivo } from '@/lib/afastamento';
import AfastamentoFormModal from '@/components/funcionarios/AfastamentoFormModal';
import EncerrarAfastamentoDialog from '@/components/funcionarios/EncerrarAfastamentoDialog';

const TIPO_ICONS = {
  atestado_medico: Stethoscope,
  suspensao: Ban,
  outro: FileText,
};

function AfastamentoCard({ afastamento, funcionario, onEncerrar }) {
  const cfg = getTipoAfastamento(afastamento.tipo);
  const Icon = TIPO_ICONS[afastamento.tipo] || FileText;
  const ativo = isAfastamentoAtivo(afastamento, getHojeISO());

  return (
    <div className="border rounded-xl bg-card px-4 py-3 space-y-2">
      <div className="flex items-center gap-3">
        <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${cfg.color}`}>
          <Icon className="w-4 h-4" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-sm truncate">{funcionario?.nome || '—'}</p>
          <p className="text-xs text-muted-foreground">
            {funcionario?.funcao || ''}{funcionario?.funcao && funcionario?.setor ? ' · ' : ''}{funcionario?.setor || ''}
          </p>
        </div>
        {ativo ? (
          <Badge className="bg-red-100 text-red-700 border-0">Em afastamento</Badge>
        ) : (
          <Badge variant="secondary" className="text-xs">
            Encerrado{afastamento.data_encerramento ? ` em ${formatDate(afastamento.data_encerramento)}` : ''}
          </Badge>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        <div className="bg-muted/30 rounded-lg px-3 py-2">
          <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground mb-1">
            <Calendar className="w-3.5 h-3.5" />Período
          </div>
          <p className="text-xs font-semibold">
            {afastamento.data_inicio ? formatDate(afastamento.data_inicio) : '—'}
            {' → '}
            {afastamento.data_fim ? formatDate(afastamento.data_fim) : 'em aberto'}
          </p>
          {afastamento.data_encerramento && afastamento.data_fim && afastamento.data_encerramento !== afastamento.data_fim && (
            <p className="text-[11px] text-muted-foreground mt-0.5">
              Encerrado antes do previsto ({formatDate(afastamento.data_encerramento)})
            </p>
          )}
        </div>
        <div className="bg-muted/30 rounded-lg px-3 py-2">
          <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground mb-1">
            <FileText className="w-3.5 h-3.5" />Tipo
          </div>
          <Badge className={`${cfg.color} border-0 text-xs`}>{cfg.label}</Badge>
        </div>
      </div>

      {afastamento.motivo && (
        <p className="text-xs text-muted-foreground">{afastamento.motivo}</p>
      )}

      {afastamento.justificativa_encerramento && (
        <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
          Justificativa do encerramento: {afastamento.justificativa_encerramento}
        </p>
      )}

      {ativo && (
        <div className="flex justify-end pt-1">
          <Button size="sm" variant="outline" className="text-destructive" onClick={() => onEncerrar(afastamento)}>
            <X className="w-3.5 h-3.5 mr-1" />Encerrar
          </Button>
        </div>
      )}
    </div>
  );
}
export default function AfastamentoTab({ funcionarios }) {
  const [search, setSearch] = useState('');
  const [filtro, setFiltro] = useState('todos');
  const [showForm, setShowForm] = useState(false);
  const [encerrando, setEncerrando] = useState(null);
  const queryClient = useQueryClient();

  const { data: afastamentos = [], isLoading } = useQuery({
    queryKey: ['afastamentos'],
    queryFn: () => client.entities.Afastamento.list('-created_date', 500),
  });

  const hoje = getHojeISO();

  const lista = useMemo(() => {
    const funcMap = new Map(funcionarios.map(f => [f.id, f]));
    return afastamentos
      .filter(a => {
        const func = funcMap.get(a.funcionario_id);
        if (search && !func?.nome?.toLowerCase().includes(search.toLowerCase())) return false;
        const ativo = isAfastamentoAtivo(a, hoje);
        if (filtro === 'ativos' && !ativo) return false;
        if (filtro === 'encerrados' && ativo) return false;
        return true;
      })
      .sort((a, b) => {
        const ativoA = isAfastamentoAtivo(a, hoje) ? 0 : 1;
        const ativoB = isAfastamentoAtivo(b, hoje) ? 0 : 1;
        return ativoA - ativoB;
      });
  }, [afastamentos, funcionarios, search, filtro, hoje]);

  const handleEncerrar = async (afastamento, justificativa) => {
    try {
      await client.entities.Afastamento.update(afastamento.id, { status: 'encerrado', data_encerramento: hoje, justificativa_encerramento: justificativa || null });
      await registrarAuditoria({
        acao: 'editar', modulo: 'funcionario',
        entidade_id: afastamento.funcionario_id,
        descricao: `Afastamento encerrado em ${formatDate(hoje)}${afastamento.data_fim ? ` (previsto: ${formatDate(afastamento.data_fim)})` : ''}${justificativa ? ` — ${justificativa}` : ''}`,
        dados_anteriores: { status: 'ativo' },
        dados_novos: { status: 'encerrado', data_encerramento: hoje, justificativa_encerramento: justificativa || null },
      });
      toast.success('Afastamento encerrado!');
      queryClient.invalidateQueries({ queryKey: ['afastamentos'] });
      setEncerrando(null);
    } catch (err) {
      toast.error(err?.message || 'Erro ao encerrar afastamento');
    }
  };

  if (isLoading) return <div className="space-y-3">{[1, 2, 3].map(i => <Skeleton key={i} className="h-32 rounded-xl" />)}</div>;

  const funcMap = new Map(funcionarios.map(f => [f.id, f]));

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-3 items-center">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Buscar funcionário..." value={search} onChange={e => setSearch(e.target.value)} className="pl-10" />
        </div>
        <Select value={filtro} onValueChange={setFiltro}>
          <SelectTrigger className="w-48"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos</SelectItem>
            <SelectItem value="ativos">Em afastamento</SelectItem>
            <SelectItem value="encerrados">Encerrados</SelectItem>
          </SelectContent>
        </Select>
        <Button onClick={() => setShowForm(true)}>
          <Plus className="w-4 h-4 mr-2" />Registrar Afastamento
        </Button>
      </div>

      <div className="bg-orange-50 border border-orange-200 rounded-xl px-4 py-3 text-xs text-orange-700 space-y-0.5">
        <p className="font-semibold flex items-center gap-1.5"><CheckCircle2 className="w-3.5 h-3.5" />Afastamentos</p>
        <p>• Atestado médico: afastamento por motivo de saúde, com ou sem data de retorno.</p>
        <p>• Suspensão: afastamento disciplinar, temporário e sem prejuízo do vínculo.</p>
      </div>

      {lista.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <User className="w-12 h-12 mx-auto mb-2 opacity-30" />
          <p className="font-medium">Nenhum afastamento encontrado</p>
          <p className="text-xs mt-1">Ajuste o filtro ou registre um novo afastamento</p>
        </div>
      ) : (
        <div className="space-y-3">
          {lista.map(a => (
            <AfastamentoCard key={a.id} afastamento={a} funcionario={funcMap.get(a.funcionario_id)} onEncerrar={setEncerrando} />
          ))}
        </div>
      )}

      <AfastamentoFormModal
        open={showForm}
        onClose={() => setShowForm(false)}
        funcionarios={funcionarios}
        selectedFunc={null}
        onSaved={() => queryClient.invalidateQueries({ queryKey: ['afastamentos'] })}
      />

      <EncerrarAfastamentoDialog
        afastamento={encerrando}
        open={!!encerrando}
        onClose={() => setEncerrando(null)}
        onConfirm={(justificativa) => handleEncerrar(encerrando, justificativa)}
      />
    </div>
  );
}

import React, { useState, useMemo } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { client } from '@/api/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandInput, CommandList, CommandEmpty, CommandGroup, CommandItem } from '@/components/ui/command';
import { cn } from '@/lib/utils';
import { formatCurrency, getMesReferenciaAtual } from '@/lib/formatters';
import { User, Users, Save, Trash2, Loader2, Check, ChevronsUpDown, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';
import { registrarAuditoria } from '@/lib/audit';

function getMesFromDatas(inicio) {
  if (!inicio) return getMesReferenciaAtual();
  const d = new Date(inicio + 'T00:00:00');
  return `${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
}

// Seletor pesquisável de funcionário (um por vez)
function ComboboxFuncionario({ funcionarios, value, onChange, placeholder = 'Selecione o funcionário...' }) {
  const [open, setOpen] = useState(false);
  const selecionado = funcionarios.find(f => f.id === value);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" role="combobox" aria-expanded={open} className="w-full justify-between font-normal">
          {selecionado ? (
            <span className="truncate">{selecionado.nome}{selecionado.setor ? ` · ${selecionado.setor}` : ''}</span>
          ) : (
            <span className="text-muted-foreground">{placeholder}</span>
          )}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0">
        <Command>
          <CommandInput placeholder="Buscar funcionário..." />
          <CommandList>
            <CommandEmpty>Nenhum funcionário encontrado.</CommandEmpty>
            <CommandGroup>
              {funcionarios.map(f => (
                <CommandItem
                  key={f.id}
                  value={`${f.nome} ${f.setor || ''}`}
                  onSelect={() => { onChange(f.id); setOpen(false); }}
                >
                  <Check className={cn('mr-2 h-4 w-4', value === f.id ? 'opacity-100' : 'opacity-0')} />
                  <span className="truncate">{f.nome}</span>
                  {f.setor && <span className="ml-1 text-xs text-muted-foreground shrink-0">· {f.setor}</span>}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

// Comissão individual MANUAL: o RH informa, um por vez, o valor que cada funcionário
// recebe. Grava em ComissaoPorFuncionario com origem='individual', seguindo o mesmo
// padrão das gorjetas por setor — assim os consumidores somam automaticamente.
export default function ComissaoIndividual({ funcionarios, onSaved }) {
  const queryClient = useQueryClient();
  const [periodoInicio, setPeriodoInicio] = useState('');
  const [periodoFim, setPeriodoFim] = useState('');
  const [observacao, setObservacao] = useState('');
  const [funcionarioId, setFuncionarioId] = useState('');
  const [valorInput, setValorInput] = useState('');
  const [incluidos, setIncluidos] = useState([]); // [{ func, valor, tipo: 'comissao'|'debito' }]
  const [modoDebito, setModoDebito] = useState(false);
  const [salvando, setSalvando] = useState(false);

  const mesRef = getMesFromDatas(periodoInicio);
  const hoje = new Date().toISOString().split('T')[0];

  // Funcionários aptos (mesmo critério do rateio por setor), ainda não adicionados
  const funcionariosAptos = useMemo(() => {
    return (funcionarios || []).filter(f => {
      if (f.ativo === false || f.data_demissao) return false;
      if (f.apto_comissao) return true;
      if (f.data_inicio_comissao && f.data_inicio_comissao <= hoje) return true;
      return false;
    }).sort((a, b) => (a.nome || '').localeCompare(b.nome || ''));
  }, [funcionarios, hoje]);

  const disponiveis = funcionariosAptos.filter(f => !incluidos.some(x => x.func.id === f.id));
  const totalComissao = incluidos.filter(x => x.tipo !== 'debito').reduce((s, x) => s + x.valor, 0);
  const totalDebitos = incluidos.filter(x => x.tipo === 'debito').reduce((s, x) => s + x.valor, 0);
  const total = totalComissao - totalDebitos;

  const handleAdicionar = () => {
    if (!funcionarioId) { toast.error('Selecione o funcionário'); return; }
    const valor = parseFloat(valorInput.trim().replace(',', '.'));
    if (!valor || valor <= 0) { toast.error('Informe um valor válido'); return; }
    const func = funcionariosAptos.find(f => f.id === funcionarioId);
    if (!func) { toast.error('Funcionário não encontrado'); return; }
    if (incluidos.some(x => x.func.id === funcionarioId)) { toast.error('Este funcionário já foi adicionado'); return; }
    setIncluidos(prev => [...prev, { func, valor, tipo: modoDebito ? 'debito' : 'comissao' }]);
    setFuncionarioId('');
    setValorInput('');
    setModoDebito(false);
  };

  const handleRemover = (funcId) => {
    setIncluidos(prev => prev.filter(x => x.func.id !== funcId));
  };

  const handleConfirmar = async () => {
    if (!periodoInicio || !periodoFim) { toast.error('Informe o período'); return; }
    if (new Date(periodoFim) < new Date(periodoInicio)) { toast.error('Data fim não pode ser anterior à data início'); return; }
    if (incluidos.length === 0) { toast.error('Adicione pelo menos um funcionário'); return; }

    setSalvando(true);
    let comissaoCriada = null;
    try {
      comissaoCriada = await client.entities.ComissaoIndividual.create({
        periodo_inicio: periodoInicio,
        periodo_fim: periodoFim,
        mes_referencia: mesRef,
        valor_total: total,
        observacao,
        status: 'confirmado',
      });

      const registros = incluidos.map(({ func, valor, tipo }) => {
        const ehDebito = tipo === 'debito';
        const valorFinal = ehDebito ? -Math.abs(valor) : valor;
        return {
          funcionario_id: func.id,
          funcionario_nome: func.nome || '',
          comissao_id: comissaoCriada.id,
          setor: func.setor || 'Sem setor',
          periodo_inicio: periodoInicio,
          periodo_fim: periodoFim,
          mes_referencia: mesRef,
          valor_setor: 0,
          valor_individual: valorFinal,
          valor_individual_cheio: valorFinal,
          valor_individual_final: valorFinal,
          perda_faltas_proprias: 0,
          bonus_faltas_terceiros: 0,
          dias_ausentes_no_periodo: 0,
          dias_trabalhados: 0,
          dias_totais: 0,
          proporcao: 1,
          apto: true,
          origem: 'individual',
          tipo_lancamento: ehDebito ? 'debito' : 'comissao',
        };
      });

      await client.entities.ComissaoPorFuncionario.bulkCreate(registros);

      await registrarAuditoria({
        acao: 'criar', modulo: 'comissao',
        descricao: `Comissão individual lançada: ${periodoInicio} a ${periodoFim} — ${formatCurrency(total)}`,
        dados_novos: { valor_total: total, periodo: `${periodoInicio} a ${periodoFim}` },
      });

      toast.success(`Comissão individual lançada para ${incluidos.length} funcionário(s)!`);
      setPeriodoInicio(''); setPeriodoFim(''); setObservacao(''); setFuncionarioId(''); setValorInput(''); setIncluidos([]);
      queryClient.invalidateQueries({ queryKey: ['comissoes_funcionarios'] });
      queryClient.invalidateQueries({ queryKey: ['comissoes_individual'] });
      onSaved?.();
    } catch (e) {
      if (comissaoCriada?.id) {
        try { await client.entities.ComissaoIndividual.delete(comissaoCriada.id); }
        catch (err) { console.error('[ComissaoIndividual] Erro ao reverter pai órfão:', err?.message); }
      }
      toast.error(`Erro ao salvar: ${e.message}`);
    } finally {
      setSalvando(false);
    }
  };

  return (
    <div className="space-y-5">
      <div className="flex items-start gap-3 bg-blue-50 border border-blue-200 rounded-xl p-4">
        <AlertTriangle className="w-5 h-5 text-blue-600 mt-0.5 shrink-0" />
        <p className="text-sm text-blue-800">
          Adicione um funcionário por vez, informando o valor que ele recebe. O valor é somado às gorjetas por setor.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <User className="w-5 h-5 text-primary" />Período
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Início *</Label>
              <Input type="date" value={periodoInicio} onChange={e => setPeriodoInicio(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Fim *</Label>
              <Input type="date" value={periodoFim} onChange={e => setPeriodoFim(e.target.value)} />
            </div>
          </div>
          {periodoInicio && periodoFim && (
            <div className="text-sm text-muted-foreground bg-muted/50 rounded-lg px-3 py-2">
              Mês de referência: <strong>{mesRef}</strong>
            </div>
          )}
          <div className="space-y-1.5">
            <Label>Observação (opcional)</Label>
            <Input placeholder="Ex.: Bônus de desempenho, comissão especial..." value={observacao} onChange={e => setObservacao(e.target.value)} />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <Users className="w-4 h-4 text-primary" />Funcionário
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex rounded-lg border overflow-hidden w-full sm:w-fit">
            <button
              onClick={() => setModoDebito(false)}
              className={`flex-1 sm:flex-none px-5 py-2 text-sm font-medium transition-colors ${!modoDebito ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-muted'}`}
            >
              Comissão (acrescentar)
            </button>
            <button
              onClick={() => setModoDebito(true)}
              className={`flex-1 sm:flex-none px-5 py-2 text-sm font-medium transition-colors ${modoDebito ? 'bg-red-600 text-white' : 'text-muted-foreground hover:bg-muted'}`}
            >
              Débito (descontar)
            </button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <ComboboxFuncionario
                funcionarios={disponiveis}
                value={funcionarioId}
                onChange={setFuncionarioId}
                placeholder={disponiveis.length === 0 ? 'Todos os aptos já foram adicionados' : 'Buscar funcionário...'}
              />
            </div>
            <div className="space-y-1.5">
              <Label>{modoDebito ? 'Valor do débito (R$)' : 'Valor (R$)'}</Label>
              <div className="flex gap-2">
                <Input
                  type="text"
                  inputMode="decimal"
                  placeholder="0,00"
                  value={valorInput}
                  onChange={e => setValorInput(e.target.value)}
                />
                <Button onClick={handleAdicionar} disabled={!funcionarioId}>
                  Adicionar
                </Button>
              </div>
            </div>
          </div>

          {incluidos.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">Nenhum funcionário adicionado.</p>
          ) : (
            <div className="space-y-1.5">
              {incluidos.map(({ func, valor, tipo }) => {
                const ehDebito = tipo === 'debito';
                return (
                  <div key={func.id} className={`flex items-center gap-3 rounded-lg px-3 py-2 border ${ehDebito ? 'bg-red-50 border-red-100' : 'bg-green-50 border-green-100'}`}>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{func.nome}</p>
                      {func.setor && <p className="text-xs text-muted-foreground truncate">{func.setor}</p>}
                    </div>
                    <span className={`font-semibold shrink-0 ${ehDebito ? 'text-red-700' : 'text-green-700'}`}>
                      {ehDebito ? '− ' : ''}{formatCurrency(valor)}
                    </span>
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive shrink-0" onClick={() => handleRemover(func.id)} title="Remover">
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Resumo</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Funcionários</span>
            <span className="text-sm font-semibold">{incluidos.length}</span>
          </div>
          {totalComissao > 0 && (
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Comissão</span>
              <span className="text-sm font-semibold text-green-700">{formatCurrency(totalComissao)}</span>
            </div>
          )}
          {totalDebitos > 0 && (
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Débitos</span>
              <span className="text-sm font-semibold text-red-600">− {formatCurrency(totalDebitos)}</span>
            </div>
          )}
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Total</span>
            <span className={`text-lg font-bold ${total < 0 ? 'text-red-600' : 'text-green-600'}`}>{formatCurrency(total)}</span>
          </div>
          <Button onClick={handleConfirmar} disabled={salvando} className="w-full" size="lg">
            {salvando ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
            {salvando ? 'Salvando...' : 'Confirmar'}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
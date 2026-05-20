import React, { useState } from 'react';
import { client } from '@/api/client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Trash2, Pencil, Loader2, Bell, BellOff, Filter } from 'lucide-react';

const EVENTOS = {
  limite_vale_atingido:    { label: '🚫 100% do limite de vale atingido', desc: 'Envia e-mail ao funcionário quando ele esgota o limite mensal de vales/adiantamentos', grupo: 'Limites de Vale' },
  limite_vale_80_atingido: { label: '⚠️ 80% do limite de vale atingido',  desc: 'Envia e-mail ao funcionário quando ele atinge 80% do limite mensal de vales/adiantamentos', grupo: 'Limites de Vale' },
  limite_vale_50_atingido: { label: '📊 50% do limite de vale atingido',  desc: 'Envia e-mail ao funcionário quando ele atinge 50% do limite mensal de vales/adiantamentos', grupo: 'Limites de Vale' },
  aniversario_funcionario: { label: '🎂 Aniversário de funcionário',       desc: 'Envia e-mail de parabéns automaticamente no dia do aniversário do funcionário (disparo diário às 8h)', grupo: 'Recursos Humanos' },
  backup_gerado:           { label: '✅ Backup gerado',                    desc: 'Quando um backup é concluído com sucesso', grupo: 'Sistema' },
  backup_falhou:           { label: '❌ Backup falhou',                    desc: 'Quando ocorre erro ao gerar um backup', grupo: 'Sistema' },
  fechamento_processado:   { label: '📅 Fechamento mensal processado',     desc: 'Quando o fechamento mensal é processado', grupo: 'Sistema' },
};

// Condições disponíveis por evento
const CONDICOES_POR_EVENTO = {
  limite_vale_atingido: [
    { field: 'percentual_atingido', label: 'Percentual do limite atingido (%)', type: 'number', operators: ['gte', 'gt', 'equals'], placeholder: 'Ex: 80' },
    { field: 'setor', label: 'Setor do funcionário', type: 'text', operators: ['equals'], placeholder: 'Ex: Produção' },
  ],
  fechamento_processado: [
    { field: 'mes_referencia', label: 'Mês de referência', type: 'text', operators: ['equals'], placeholder: 'Ex: 05/2026' },
  ],
};

const OPERADORES = {
  equals: 'igual a',
  gte: 'maior ou igual a',
  gt: 'maior que',
  lt: 'menor que',
};

function CondicoesEditor({ evento, condicoes, onChange }) {
  const camposDisponiveis = CONDICOES_POR_EVENTO[evento] || [];
  if (!camposDisponiveis.length) return null;

  const lista = condicoes?.conditions || [];

  const addCondicao = () => {
    const primeiro = camposDisponiveis[0];
    onChange({ logic: 'and', conditions: [...lista, { field: primeiro.field, operator: primeiro.operators[0], value: '' }] });
  };

  const updateCondicao = (idx, patch) => {
    const novas = lista.map((c, i) => i === idx ? { ...c, ...patch } : c);
    onChange({ logic: 'and', conditions: novas });
  };

  const removeCondicao = (idx) => {
    const novas = lista.filter((_, i) => i !== idx);
    onChange(novas.length ? { logic: 'and', conditions: novas } : null);
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <Label className="flex items-center gap-1.5"><Filter className="w-3.5 h-3.5" /> Condições (opcional)</Label>
        <Button type="button" variant="outline" size="sm" className="h-7 text-xs" onClick={addCondicao}>
          <Plus className="w-3 h-3" /> Adicionar
        </Button>
      </div>
      {lista.length === 0 && (
        <p className="text-xs text-muted-foreground">Sem condições — notificação será enviada sempre que o evento ocorrer.</p>
      )}
      {lista.map((cond, idx) => {
        const campoInfo = camposDisponiveis.find(c => c.field === cond.field) || camposDisponiveis[0];
        return (
          <div key={idx} className="flex gap-2 items-center bg-muted/40 rounded-md p-2">
            <Select value={cond.field} onValueChange={v => updateCondicao(idx, { field: v, operator: (CONDICOES_POR_EVENTO[evento]?.find(c => c.field === v)?.operators[0] || 'equals'), value: '' })}>
              <SelectTrigger className="h-7 text-xs flex-1"><SelectValue /></SelectTrigger>
              <SelectContent>
                {camposDisponiveis.map(c => <SelectItem key={c.field} value={c.field}>{c.label}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={cond.operator} onValueChange={v => updateCondicao(idx, { operator: v })}>
              <SelectTrigger className="h-7 text-xs w-36"><SelectValue /></SelectTrigger>
              <SelectContent>
                {(campoInfo?.operators || ['equals']).map(op => <SelectItem key={op} value={op}>{OPERADORES[op]}</SelectItem>)}
              </SelectContent>
            </Select>
            <Input
              className="h-7 text-xs flex-1"
              value={cond.value}
              onChange={e => updateCondicao(idx, { value: e.target.value })}
              placeholder={campoInfo?.placeholder || 'Valor'}
            />
            <Button type="button" size="icon" variant="ghost" className="h-7 w-7 text-destructive shrink-0" onClick={() => removeCondicao(idx)}>
              <Trash2 className="w-3.5 h-3.5" />
            </Button>
          </div>
        );
      })}
    </div>
  );
}

function NotificacaoForm({ open, onClose, notificacao, onSaved }) {
  const [form, setForm] = useState(notificacao || { evento: '', destinatarios: '', ativo: true, observacao: '', condicoes_json: null });
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    if (notificacao) {
      await client.entities.ConfiguracaoNotificacao.update(notificacao.id, form);
    } else {
      await client.entities.ConfiguracaoNotificacao.create(form);
    }
    setSaving(false);
    onSaved();
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{notificacao ? 'Editar Notificação' : 'Nova Notificação'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label>Evento *</Label>
            <Select value={form.evento} onValueChange={v => setForm(p => ({ ...p, evento: v, condicoes_json: null }))}>
              <SelectTrigger><SelectValue placeholder="Selecione um evento..." /></SelectTrigger>
              <SelectContent>
                {Object.entries(EVENTOS).map(([k, v]) => (
                  <SelectItem key={k} value={k}>{v.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            {form.evento && (
              <p className="text-xs text-muted-foreground mt-1">{EVENTOS[form.evento]?.desc}</p>
            )}
          </div>
          <div>
            <Label>Destinatários adicionais (e-mails)</Label>
            <Input
              value={form.destinatarios || ''}
              onChange={e => setForm(p => ({ ...p, destinatarios: e.target.value }))}
              placeholder="email1@ex.com, email2@ex.com"
            />
            {['limite_vale_atingido','limite_vale_80_atingido','limite_vale_50_atingido','aniversario_funcionario'].includes(form.evento) ? (
              <p className="text-xs text-blue-600 mt-1">💡 O e-mail é enviado automaticamente ao próprio funcionário. Adicione destinatários extras (ex: RH) se desejar cópias.</p>
            ) : (
              <p className="text-xs text-muted-foreground mt-1">Separe múltiplos e-mails por vírgula</p>
            )}
          </div>

          {form.evento && (
            <CondicoesEditor
              evento={form.evento}
              condicoes={form.condicoes_json}
              onChange={v => setForm(p => ({ ...p, condicoes_json: v }))}
            />
          )}

          <div>
            <Label>Observação</Label>
            <Input
              value={form.observacao || ''}
              onChange={e => setForm(p => ({ ...p, observacao: e.target.value }))}
              placeholder="Observação opcional"
            />
          </div>
          <div className="flex items-center gap-3">
            <Switch checked={form.ativo !== false} onCheckedChange={v => setForm(p => ({ ...p, ativo: v }))} />
            <Label>Notificação ativa</Label>
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="outline" onClick={onClose}>Cancelar</Button>
            <Button type="submit" disabled={saving || !form.evento}>
              {saving && <Loader2 className="w-4 h-4 animate-spin" />}
              {notificacao ? 'Salvar' : 'Criar'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export default function NotificacoesTab() {
  const queryClient = useQueryClient();
  const [formOpen, setFormOpen] = useState(null);

  const { data: notificacoes = [], isLoading } = useQuery({
    queryKey: ['notificacoes'],
    queryFn: () => client.entities.ConfiguracaoNotificacao.list(),
  });

  const handleDelete = async (id) => {
    if (!confirm('Excluir esta configuração de notificação?')) return;
    await client.entities.ConfiguracaoNotificacao.delete(id);
    queryClient.invalidateQueries({ queryKey: ['notificacoes'] });
  };

  const handleToggle = async (notif) => {
    await client.entities.ConfiguracaoNotificacao.update(notif.id, { ativo: !notif.ativo });
    queryClient.invalidateQueries({ queryKey: ['notificacoes'] });
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <p className="text-sm text-muted-foreground">{notificacoes.length} regra(s) configurada(s)</p>
        <Button size="sm" onClick={() => setFormOpen({})}>
          <Plus className="w-4 h-4" /> Nova Notificação
        </Button>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>
      ) : notificacoes.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <Bell className="w-10 h-10 mx-auto mb-2 opacity-30" />
          <p className="font-medium">Nenhuma notificação configurada</p>
          <p className="text-xs mt-1">Crie regras para receber alertas por e-mail sobre eventos do sistema</p>
        </div>
      ) : (
        <div className="divide-y border rounded-lg overflow-hidden bg-card">
          {notificacoes.map(n => (
            <div key={n.id} className="flex items-center justify-between px-4 py-3 gap-3">
              <div className="flex items-center gap-3 min-w-0">
                {n.ativo ? (
                  <Bell className="w-4 h-4 text-primary shrink-0" />
                ) : (
                  <BellOff className="w-4 h-4 text-muted-foreground shrink-0" />
                )}
                <div className="min-w-0">
                  <p className="font-medium text-sm">{EVENTOS[n.evento]?.label || n.evento}</p>
                  <p className="text-xs text-muted-foreground truncate">{n.destinatarios}</p>
                  {n.condicoes_json?.conditions?.length > 0 && (
                    <p className="text-xs text-primary/70 mt-0.5 flex items-center gap-1">
                      <Filter className="w-3 h-3" /> {n.condicoes_json.conditions.length} condição(ões) definida(s)
                    </p>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <Badge variant={n.ativo ? 'default' : 'secondary'} className="text-xs">
                  {n.ativo ? 'Ativa' : 'Inativa'}
                </Badge>
                <Switch checked={n.ativo !== false} onCheckedChange={() => handleToggle(n)} />
                <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => setFormOpen(n)}>
                  <Pencil className="w-3.5 h-3.5" />
                </Button>
                <Button size="icon" variant="ghost" className="h-8 w-8 text-destructive hover:text-destructive" onClick={() => handleDelete(n.id)}>
                  <Trash2 className="w-3.5 h-3.5" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {formOpen !== null && (
        <NotificacaoForm
          open
          notificacao={formOpen?.id ? formOpen : null}
          onClose={() => setFormOpen(null)}
          onSaved={() => queryClient.invalidateQueries({ queryKey: ['notificacoes'] })}
        />
      )}
    </div>
  );
}
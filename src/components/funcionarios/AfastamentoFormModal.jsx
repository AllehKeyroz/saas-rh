import React, { useState, useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { client } from '@/api/client';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Loader2, Plus } from 'lucide-react';
import { toast } from 'sonner';
import { registrarAuditoria } from '@/lib/audit';
import { AFASTAMENTO_TIPOS, getHojeISO } from '@/lib/afastamento';

export default function AfastamentoFormModal({ open, onClose, funcionarios, onSaved, selectedFunc }) {
  const queryClient = useQueryClient();
  const [funcId, setFuncId] = useState('');
  const [tipo, setTipo] = useState('atestado_medico');
  const [dataInicio, setDataInicio] = useState(getHojeISO());
  const [dataFim, setDataFim] = useState('');
  const [motivo, setMotivo] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open && selectedFunc?.id) {
      setFuncId(selectedFunc.id);
    } else if (!open) {
      setFuncId('');
      setTipo('atestado_medico');
      setDataInicio(getHojeISO());
      setDataFim('');
      setMotivo('');
    }
  }, [open, selectedFunc]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!funcId || !tipo || !dataInicio) {
      toast.error('Preencha funcionário, tipo e data de início');
      return;
    }
    if (dataFim && new Date(dataFim) < new Date(dataInicio)) {
      toast.error('Data fim não pode ser anterior à data início');
      return;
    }
    setSaving(true);
    try {
      await client.entities.Afastamento.create({
        funcionario_id: funcId,
        tipo,
        data_inicio: dataInicio,
        data_fim: dataFim || null,
        motivo: motivo.trim() || '',
        status: 'ativo',
        origem: 'rh',
      });
      await registrarAuditoria({
        acao: 'criar', modulo: 'funcionario',
        entidade_id: funcId,
        descricao: `Afastamento (${AFASTAMENTO_TIPOS[tipo]?.label}) registrado`,
        dados_novos: { tipo, data_inicio: dataInicio, data_fim: dataFim || null, motivo: motivo.trim() },
      });
      toast.success('Afastamento registrado com sucesso!');
      queryClient.invalidateQueries({ queryKey: ['afastamentos'] });
      queryClient.invalidateQueries({ queryKey: ['afastamentos_360', funcId] });
      onSaved?.();
      onClose();
      setFuncId(''); setTipo('atestado_medico'); setDataInicio(getHojeISO()); setDataFim(''); setMotivo('');
    } catch (err) {
      toast.error(err?.message || 'Erro ao registrar afastamento');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Plus className="w-5 h-5" />Registrar Afastamento
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 py-2">
          <div>
            <Label>Funcionário *</Label>
            <Select value={funcId} onValueChange={setFuncId} disabled={!!selectedFunc}>
              <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
              <SelectContent>
                {funcionarios
                  .filter(f => !f.data_demissao && f.ativo !== false)
                  .sort((a, b) => (a.nome || '').localeCompare(b.nome || ''))
                  .map(f => (
                    <SelectItem key={f.id} value={f.id}>{f.nome}</SelectItem>
                  ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Tipo de Afastamento *</Label>
            <Select value={tipo} onValueChange={setTipo}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {Object.entries(AFASTAMENTO_TIPOS).map(([key, cfg]) => (
                  <SelectItem key={key} value={key}>{cfg.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Data Início *</Label>
              <Input type="date" value={dataInicio} onChange={e => setDataInicio(e.target.value)} />
            </div>
            <div>
              <Label>Data Fim</Label>
              <Input type="date" value={dataFim} onChange={e => setDataFim(e.target.value)} placeholder="Em aberto" />
            </div>
          </div>
          <div>
            <Label>Motivo / Justificativa</Label>
            <Textarea value={motivo} onChange={e => setMotivo(e.target.value)} placeholder="Ex: Atestado médico — CID X..." rows={3} />
          </div>
          <DialogFooter>
            <Button variant="outline" type="button" onClick={onClose}>Cancelar</Button>
            <Button type="submit" disabled={saving}>
              {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Registrar
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

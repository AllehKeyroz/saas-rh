import React, { useState, useEffect, useRef } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { client } from '@/api/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Loader2, Plus, Trash2, CalendarX2 } from 'lucide-react';
import { toast } from 'sonner';
import { getFeriadosNacionais } from '@/lib/feriados';
import { formatDate } from '@/lib/formatters';

const CHAVE = 'feriados_especificos';

export default function FeriadosDialog({ open, onClose, ano }) {
  const queryClient = useQueryClient();
  const [extras, setExtras] = useState([]);
  const [novaData, setNovaData] = useState('');
  const [novoNome, setNovoNome] = useState('');
  const [saving, setSaving] = useState(false);
  const inicializadoRef = useRef(false);

  const { data: configs = [] } = useQuery({
    queryKey: ['feriados_especificos'],
    queryFn: () => client.entities.ConfiguracoesRH.filter({ chave: CHAVE }),
  });

  // Ao abrir, limpa o estado de edição
  useEffect(() => {
    if (open) {
      inicializadoRef.current = false;
      setNovaData('');
      setNovoNome('');
    }
  }, [open]);

  // Popula a lista a partir do servidor UMA vez por abertura — não sobrescreve
  // edições do usuário feitas antes da query terminar de carregar
  useEffect(() => {
    if (open && !inicializadoRef.current) {
      inicializadoRef.current = true;
      setExtras(configs[0]?.valor || []);
    }
  }, [open, configs]);

  const nacionais = getFeriadosNacionais(ano || new Date().getFullYear());

  const adicionar = () => {
    if (!novaData) { toast.error('Informe a data do feriado'); return; }
    inicializadoRef.current = true;
    const nome = novoNome.trim() || 'Feriado';
    setExtras(prev => [...prev, { data: novaData, nome }]);
    setNovaData('');
    setNovoNome('');
  };

  const remover = (idx) => {
    inicializadoRef.current = true;
    setExtras(prev => prev.filter((_, i) => i !== idx));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const existente = configs[0];
      if (existente) {
        await client.entities.ConfiguracoesRH.update(existente.id, { valor: extras });
      } else {
        await client.entities.ConfiguracoesRH.create({ chave: CHAVE, valor: extras, ativa: true });
      }
      toast.success('Feriados salvos!');
      queryClient.invalidateQueries({ queryKey: ['feriados_especificos'] });
      onClose();
    } catch (e) {
      toast.error(e?.message || 'Erro ao salvar feriados');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o && !saving) onClose(); }}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CalendarX2 className="w-5 h-5 text-primary" />
            Feriados
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <p className="text-sm font-medium mb-2">Feriados nacionais ({ano})</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-1 max-h-40 overflow-y-auto">
              {nacionais.map(f => (
                <div key={f.data} className="flex items-center justify-between text-xs bg-muted/40 rounded px-2 py-1">
                  <span className="font-medium">{f.nome}</span>
                  <span className="text-muted-foreground">{formatDate(f.data)}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="border-t pt-4">
            <p className="text-sm font-medium mb-2">Feriados municipais / outros</p>
            <div className="space-y-2">
              {extras.length === 0 && (
                <p className="text-xs text-muted-foreground">Nenhum feriado extra cadastrado.</p>
              )}
              {extras.map((f, idx) => (
                <div key={idx} className="flex items-center gap-2 bg-muted/40 rounded-lg px-2 py-1.5 text-xs">
                  <span className="flex-1 font-medium truncate">{f.nome || 'Feriado'}</span>
                  <span className="text-muted-foreground">{formatDate(f.data)}</span>
                  <button type="button" onClick={() => remover(idx)} className="text-muted-foreground hover:text-destructive shrink-0">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
            <div className="grid grid-cols-2 gap-2 mt-3">
              <div>
                <Label className="text-xs">Data</Label>
                <Input type="date" value={novaData} onChange={e => setNovaData(e.target.value)} className="h-8 text-sm" />
              </div>
              <div>
                <Label className="text-xs">Nome</Label>
                <Input value={novoNome} onChange={e => setNovoNome(e.target.value)} placeholder="Ex: Aniversário da cidade" className="h-8 text-sm" />
              </div>
            </div>
            <Button type="button" size="sm" variant="outline" className="mt-2" onClick={adicionar} disabled={!novaData}>
              <Plus className="w-3.5 h-3.5 mr-1" />Adicionar
            </Button>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={saving}>Cancelar</Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            Salvar feriados
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
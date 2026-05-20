import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { base44 } from '@/api/base44Client';
import { CATEGORIAS_PADRAO, TIPO_LABELS } from '@/lib/vidaFinanceira';
import { useToast } from '@/components/ui/use-toast';

export default function GastoForm({ open, onClose, onSaved, funcionarioId, gasto }) {
  const isEdit = !!gasto?.id;
  const { toast } = useToast();
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [categoriaTipo, setCategoriaTipo] = useState(gasto?.categoria_tipo || '');
  const [categoriaNome, setCategoriaNome] = useState(gasto?.categoria_nome || '');
  const [categoriaCustom, setCategoriaCustom] = useState('');
  const [valor, setValor] = useState(gasto?.valor?.toString() || '');
  const [descricao, setDescricao] = useState(gasto?.descricao || '');
  const [dataLancamento, setDataLancamento] = useState(gasto?.data_lancamento || new Date().toISOString().split('T')[0]);
  const [comprovante, setComprovante] = useState(gasto?.comprovante || '');

  // Reset state when gasto changes (e.g. opening for new entry or editing)
  useEffect(() => {
    setCategoriaTipo(gasto?.categoria_tipo || '');
    setCategoriaNome(gasto?.categoria_nome || '');
    setCategoriaCustom('');
    setValor(gasto?.valor?.toString() || '');
    setDescricao(gasto?.descricao || '');
    setDataLancamento(gasto?.data_lancamento || new Date().toISOString().split('T')[0]);
    setComprovante(gasto?.comprovante || '');
  }, [gasto, open]);

  const categoriasDisponiveis = categoriaTipo ? CATEGORIAS_PADRAO[categoriaTipo] || [] : [];

  const handleUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setUploading(true);
    const { file_url } = await base44.integrations.Core.UploadFile({ file });
    setComprovante(file_url);
    setUploading(false);
  };

  const handleSave = async () => {
    const v = parseFloat(valor);
    if (!categoriaTipo || !categoriaNome || isNaN(v) || v === 0 || !dataLancamento) {
      toast({ title: 'Preencha todos os campos obrigatórios', description: 'Categoria, valor (positivo) e data são obrigatórios.', variant: 'destructive' });
      return;
    }
    const nomeFinal = categoriaNome === '__custom__' ? categoriaCustom.trim() : categoriaNome;
    if (!nomeFinal) {
      toast({ title: 'Informe o nome da categoria personalizada', variant: 'destructive' });
      return;
    }
    setSaving(true);
    const payload = {
      funcionario_id: funcionarioId,
      categoria_tipo: categoriaTipo,
      categoria_nome: nomeFinal,
      descricao,
      valor: v,
      data_lancamento: dataLancamento,
      comprovante,
    };
    if (isEdit) {
      await base44.entities.GastosPessoais.update(gasto.id, payload);
    } else {
      await base44.entities.GastosPessoais.create(payload);
    }
    setSaving(false);
    onSaved();
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={v => !v && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Editar Lançamento' : categoriaTipo === 'receita_extra' ? 'Nova Receita Extra' : 'Novo Gasto'}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-1">
            <Label>Tipo *</Label>
            <Select value={categoriaTipo} onValueChange={v => { setCategoriaTipo(v); setCategoriaNome(''); }}>
              <SelectTrigger><SelectValue placeholder="Selecione o tipo" /></SelectTrigger>
              <SelectContent>
                {Object.entries(TIPO_LABELS).map(([k, v]) => (
                  <SelectItem key={k} value={k}>{v}</SelectItem>
                ))}
              </SelectContent>
              {categoriaTipo === 'receita_extra' && (
                <p className="text-xs text-blue-600 mt-1">💰 Receita extra — valor será somado à renda do mês</p>
              )}
            </Select>
          </div>

          {categoriaTipo && (
            <div className="space-y-1">
              <Label>Categoria *</Label>
              <Select value={categoriaNome} onValueChange={setCategoriaNome}>
                <SelectTrigger><SelectValue placeholder="Selecione a categoria" /></SelectTrigger>
                <SelectContent>
                  {categoriasDisponiveis.map(c => (
                    <SelectItem key={c} value={c}>{c}</SelectItem>
                  ))}
                  <SelectItem value="__custom__">+ Nova categoria personalizada</SelectItem>
                </SelectContent>
              </Select>
              {categoriaNome === '__custom__' && (
                <Input
                  className="mt-2"
                  placeholder="Nome da nova categoria"
                  value={categoriaCustom}
                  onChange={e => setCategoriaCustom(e.target.value)}
                />
              )}
            </div>
          )}

          <div className="space-y-1">
            <Label>Valor (R$) *</Label>
            <Input type="number" min="0.01" step="0.01" placeholder="0,00" value={valor} onChange={e => setValor(e.target.value)} />
          </div>

          <div className="space-y-1">
            <Label>Data *</Label>
            <Input type="date" value={dataLancamento} onChange={e => setDataLancamento(e.target.value)} />
          </div>

          <div className="space-y-1">
            <Label>Descrição</Label>
            <Input placeholder="Observação opcional" value={descricao} onChange={e => setDescricao(e.target.value)} />
          </div>

          <div className="space-y-1">
            <Label>Comprovante</Label>
            <Input type="file" onChange={handleUpload} disabled={uploading} />
            {uploading && <p className="text-xs text-muted-foreground">Enviando...</p>}
            {comprovante && !uploading && <p className="text-xs text-green-600">✓ Arquivo anexado</p>}
          </div>

          <div className="flex gap-2 pt-2">
            <Button variant="outline" className="flex-1" onClick={onClose} disabled={saving}>Cancelar</Button>
            <Button className="flex-1" onClick={handleSave} disabled={saving || uploading}>
              {saving ? 'Salvando...' : isEdit ? 'Salvar' : 'Adicionar'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
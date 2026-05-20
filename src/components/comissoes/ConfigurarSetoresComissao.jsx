import React, { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { client } from '@/api/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';
import { Plus, Save, Trash2, Percent, AlertCircle, CheckCircle2, GripVertical, Info } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

function SetorRow({ setor, onChange, onDelete }) {
  return (
    <div className="flex items-center gap-3 py-3 border-b last:border-0">
      <GripVertical className="w-4 h-4 text-muted-foreground shrink-0" />
      <div className="flex-1 grid grid-cols-1 sm:grid-cols-3 gap-2">
        <div>
          <Label className="text-xs text-muted-foreground mb-1 block">Nome do Setor</Label>
          <Input
            value={setor.nome_do_setor}
            onChange={e => onChange({ ...setor, nome_do_setor: e.target.value })}
            placeholder="Ex: Salão"
            className="h-8 text-sm"
          />
        </div>
        <div>
          <Label className="text-xs text-muted-foreground mb-1 block">Palavras-chave (para mapear funcionários)</Label>
          <Input
            value={setor.palavras_chave || ''}
            onChange={e => onChange({ ...setor, palavras_chave: e.target.value })}
            placeholder="Ex: salão, garçom, atendimento"
            className="h-8 text-sm"
          />
        </div>
        <div>
        <Label className="text-xs text-muted-foreground mb-1 block">Percentual (%)</Label>
        <div className="flex items-center gap-2">
          <Input
            type="number"
            min="0"
            max="100"
            step="0.1"
            value={typeof setor.percentual === 'string' ? setor.percentual : (setor.percentual || 0)}
            onChange={e => {
              const val = parseFloat(e.target.value);
              onChange({ ...setor, percentual: isNaN(val) ? 0 : Math.min(100, Math.max(0, val)) });
            }}
            className="h-8 text-sm w-24"
          />
          <span className="text-sm font-semibold text-primary">{typeof setor.percentual === 'string' ? parseFloat(setor.percentual) || 0 : setor.percentual}%</span>
        </div>
        </div>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        <div className="flex items-center gap-1.5">
          <Switch
            checked={setor.ativo !== false}
            onCheckedChange={v => onChange({ ...setor, ativo: v })}
          />
          <span className="text-xs text-muted-foreground">{setor.ativo !== false ? 'Ativo' : 'Inativo'}</span>
        </div>
        <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive" onClick={onDelete}>
          <Trash2 className="w-3.5 h-3.5" />
        </Button>
      </div>
    </div>
  );
}

export default function ConfigurarSetoresComissao() {
  const queryClient = useQueryClient();
  const [salvando, setSalvando] = useState(false);

  const { data: setoresDB = [], isLoading } = useQuery({
    queryKey: ['setores_comissao'],
    queryFn: () => client.entities.SetoresComissao.list('ordem_exibicao', 50),
  });

  const [setores, setSetores] = useState(null);
  const lista = setores ?? setoresDB;

  const totalPercentual = lista.filter(s => s.ativo !== false).reduce((sum, s) => {
    const perc = typeof s.percentual === 'string' ? parseFloat(s.percentual) : s.percentual;
    return sum + (isNaN(perc) ? 0 : perc);
  }, 0);
  const valido = Math.abs(totalPercentual - 100) < 0.1;

  const handleChange = (idx, updated) => {
    setSetores(lista.map((s, i) => i === idx ? updated : s));
  };

  const handleAdd = () => {
    setSetores([...lista, { nome_do_setor: '', percentual: 0, ativo: true, palavras_chave: '', _novo: true }]);
  };

  const handleDelete = (idx) => {
    setSetores(lista.filter((_, i) => i !== idx));
  };

  const handleSalvar = async () => {
    if (!valido) {
      toast.error(`A soma dos percentuais ativos deve ser 100%. Atual: ${totalPercentual.toFixed(1)}%`);
      return;
    }
    const invalidos = lista.filter(s => !s.nome_do_setor.trim());
    if (invalidos.length > 0) {
      toast.error('Todos os setores precisam ter um nome');
      return;
    }

    setSalvando(true);
    try {
      // Deletar setores removidos que existem no banco
      const idsAtuais = lista.filter(s => s.id).map(s => s.id);
      for (const s of setoresDB) {
        if (!idsAtuais.includes(s.id)) await client.entities.SetoresComissao.delete(s.id);
      }
      // Criar ou atualizar
      for (let i = 0; i < lista.length; i++) {
        const s = lista[i];
        const percValue = typeof s.percentual === 'string' ? parseFloat(s.percentual) : s.percentual;
        const data = {
          nome_do_setor: s.nome_do_setor.trim(),
          percentual: isNaN(percValue) ? 0 : percValue,
          ativo: s.ativo !== false,
          palavras_chave: s.palavras_chave || '',
          ordem_exibicao: i,
        };
        if (s.id) await client.entities.SetoresComissao.update(s.id, data);
        else await client.entities.SetoresComissao.create(data);
      }
      queryClient.invalidateQueries({ queryKey: ['setores_comissao'] });
      setSetores(null);
      toast.success('Setores salvos com sucesso!');
      } catch (e) {
      toast.error(`Erro ao salvar: ${e.message}`);
      } finally {
      setSalvando(false);
      }
      };

  if (isLoading) return <Skeleton className="h-48" />;

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Percent className="w-4 h-4 text-primary" />
            Setores Participantes da Comissão
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-start gap-2 bg-blue-50 border border-blue-200 rounded-lg px-3 py-2">
            <Info className="w-4 h-4 text-blue-600 mt-0.5 shrink-0" />
            <p className="text-xs text-blue-800">
              Configure os setores e seus percentuais. A soma dos setores <strong>ativos</strong> deve ser 100%.
              As palavras-chave são usadas para mapear funcionários automaticamente ao setor.
            </p>
          </div>

          {lista.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-4">Nenhum setor configurado. Clique em "Adicionar Setor".</p>
          )}

          <div>
            {lista.map((setor, i) => (
              <SetorRow key={setor.id || `novo-${i}`} setor={setor} onChange={u => handleChange(i, u)} onDelete={() => handleDelete(i)} />
            ))}
          </div>

          <Button variant="outline" size="sm" onClick={handleAdd}>
            <Plus className="w-4 h-4 mr-1" />Adicionar Setor
          </Button>

          {/* Indicador de soma */}
          <div className={`flex items-center gap-2 text-sm font-medium px-3 py-2 rounded-lg ${valido ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
            {valido
              ? <><CheckCircle2 className="w-4 h-4" />Total: {totalPercentual.toFixed(1)}% ✓</>
              : <><AlertCircle className="w-4 h-4" />Total dos setores ativos: {totalPercentual.toFixed(1)}% — deve ser 100%</>
            }
          </div>

          <div className="flex gap-3">
            <Button onClick={handleSalvar} disabled={salvando || !valido}>
              <Save className="w-4 h-4 mr-2" />
              {salvando ? 'Salvando...' : 'Salvar Configuração'}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
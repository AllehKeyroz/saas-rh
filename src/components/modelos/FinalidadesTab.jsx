import React, { useState } from 'react';
import { client } from '@/api/client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Plus, Pencil, Trash2, Loader2, Tag, PenLine, FolderOpen, Power } from 'lucide-react';
import FinalidadeForm from './FinalidadeForm';
import { registrarAuditoria, ACOES } from '@/lib/auditoriaDocumentos';

export default function FinalidadesTab({ finalidades, loading, onRefresh }) {
  const [formOpen, setFormOpen] = useState(false);
  const [editando, setEditando] = useState(null);

  const handleDelete = async (id, nome) => {
    if (!confirm(`Excluir a finalidade "${nome}"?`)) return;
    await client.entities.FinalidadeDocumento.delete(id);
    await registrarAuditoria({ acao: ACOES.FINALIDADE_EXCLUIDA, modulo: 'finalidade', descricao: `Finalidade "${nome}" excluída.`, origem: 'rh', dados_antes: { id, nome } });
    onRefresh();
  };

  const handleToggle = async (f) => {
    const novoStatus = !f.ativo;
    await client.entities.FinalidadeDocumento.update(f.id, { ativo: novoStatus });
    await registrarAuditoria({ acao: ACOES.FINALIDADE_EDITADA, modulo: 'finalidade', descricao: `Finalidade "${f.nome}" ${novoStatus ? 'ativada' : 'desativada'}.`, origem: 'rh', dados_antes: { ativo: f.ativo }, dados_depois: { ativo: novoStatus } });
    onRefresh();
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">{finalidades.length} finalidade(s) cadastrada(s)</p>
        <Button size="sm" onClick={() => { setEditando(null); setFormOpen(true); }} className="gap-2">
          <Plus className="w-4 h-4" />Nova Finalidade
        </Button>
      </div>

      {loading ? (
        <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>
      ) : finalidades.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground border-2 border-dashed border-border rounded-xl">
          <Tag className="w-10 h-10 mx-auto mb-2 opacity-30" />
          <p className="font-medium">Nenhuma finalidade cadastrada</p>
          <p className="text-xs mt-1">Crie finalidades como "Contrato de Trabalho", "Aviso de Férias", etc.</p>
        </div>
      ) : (
        <div className="divide-y border border-border rounded-xl overflow-hidden bg-card">
          {finalidades.map(f => (
            <div key={f.id} className="flex items-center justify-between px-4 py-3 hover:bg-muted/30 transition-colors">
              <div className="flex items-center gap-3">
                <div className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: f.cor || '#6b7280' }} />
                <div>
                  <p className="font-medium text-sm">{f.nome}</p>
                  <div className="flex items-center gap-3 mt-0.5">
                    {f.pasta_padrao && (
                      <span className="text-xs text-muted-foreground flex items-center gap-1">
                        <FolderOpen className="w-3 h-3" />{f.pasta_padrao}
                      </span>
                    )}
                    {f.exige_assinatura && (
                      <span className="text-xs text-blue-600 flex items-center gap-1">
                        <PenLine className="w-3 h-3" />Exige assinatura GovBR
                      </span>
                    )}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant={f.ativo !== false ? 'default' : 'secondary'} className="text-xs">
                  {f.ativo !== false ? 'Ativa' : 'Inativa'}
                </Badge>
                <Button
                  size="icon" variant="ghost"
                  className={`h-8 w-8 ${f.ativo !== false ? 'text-yellow-600' : 'text-green-600'}`}
                  onClick={() => handleToggle(f)} title={f.ativo !== false ? 'Desativar' : 'Ativar'}
                >
                  <Power className="w-3.5 h-3.5" />
                </Button>
                <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => { setEditando(f); setFormOpen(true); }}>
                  <Pencil className="w-3.5 h-3.5" />
                </Button>
                <Button size="icon" variant="ghost" className="h-8 w-8 text-destructive hover:text-destructive" onClick={() => handleDelete(f.id, f.nome)}>
                  <Trash2 className="w-3.5 h-3.5" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      <FinalidadeForm
        open={formOpen}
        onClose={() => setFormOpen(false)}
        finalidade={editando}
        onSaved={(finalidade, isNew) => {
          registrarAuditoria({
            acao: isNew ? ACOES.FINALIDADE_CRIADA : ACOES.FINALIDADE_EDITADA,
            modulo: 'finalidade',
            descricao: isNew ? `Finalidade "${finalidade?.nome}" criada.` : `Finalidade "${finalidade?.nome}" editada.`,
            origem: 'rh',
            dados_depois: finalidade,
          });
          onRefresh();
          setFormOpen(false);
        }}
      />
    </div>
  );
}
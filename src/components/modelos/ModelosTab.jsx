import React, { useState } from 'react';
import { client } from '@/api/client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Plus, Pencil, Trash2, Loader2, LayoutTemplate, PenLine, FolderOpen, Power } from 'lucide-react';
import ModeloForm from './ModeloForm';
import { registrarAuditoria, ACOES } from '@/lib/auditoriaDocumentos';

export default function ModelosTab({ modelos, finalidades, loading, onRefresh }) {
  const [formOpen, setFormOpen] = useState(false);
  const [editando, setEditando] = useState(null);

  const handleDelete = async (id, nome) => {
    if (!confirm(`Excluir o modelo "${nome}"?`)) return;
    await client.entities.ModeloDocumento.delete(id);
    await registrarAuditoria({ acao: ACOES.MODELO_EXCLUIDO, modulo: 'modelo', descricao: `Modelo "${nome}" excluído.`, origem: 'rh', dados_antes: { id, nome } });
    onRefresh();
  };

  const handleToggle = async (m) => {
    const novoStatus = !m.ativo;
    await client.entities.ModeloDocumento.update(m.id, { ativo: novoStatus });
    await registrarAuditoria({ acao: novoStatus ? ACOES.MODELO_ATIVADO : ACOES.MODELO_DESATIVADO, modulo: 'modelo', descricao: `Modelo "${m.nome}" ${novoStatus ? 'ativado' : 'desativado'}.`, origem: 'rh', dados_antes: { ativo: m.ativo }, dados_depois: { ativo: novoStatus } });
    onRefresh();
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">{modelos.length} modelo(s) cadastrado(s)</p>
        <Button size="sm" onClick={() => { setEditando(null); setFormOpen(true); }} className="gap-2">
          <Plus className="w-4 h-4" />Novo Modelo
        </Button>
      </div>

      {loading ? (
        <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>
      ) : modelos.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground border-2 border-dashed border-border rounded-xl">
          <LayoutTemplate className="w-10 h-10 mx-auto mb-2 opacity-30" />
          <p className="font-medium">Nenhum modelo cadastrado</p>
          <p className="text-xs mt-1">Crie modelos de documentos com variáveis dinâmicas</p>
        </div>
      ) : (
        <div className="grid gap-3">
          {modelos.map(m => (
            <div key={m.id} className="border border-border rounded-xl p-4 bg-card hover:shadow-sm transition-all">
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-semibold text-sm text-foreground">{m.nome}</p>
                    <Badge variant={m.ativo !== false ? 'default' : 'secondary'} className="text-xs">
                      {m.ativo !== false ? 'Ativo' : 'Inativo'}
                    </Badge>
                    {m.exige_assinatura && (
                      <Badge variant="outline" className="text-xs border-blue-300 text-blue-700 gap-1">
                        <PenLine className="w-3 h-3" />GovBR
                      </Badge>
                    )}
                  </div>
                  {m.descricao && <p className="text-xs text-muted-foreground mt-1">{m.descricao}</p>}
                  <div className="flex items-center gap-4 mt-2 flex-wrap">
                    {m.finalidade_nome && (
                      <span className="text-xs text-muted-foreground flex items-center gap-1">
                        <span className="w-2 h-2 rounded-full bg-primary inline-block" />
                        {m.finalidade_nome}
                      </span>
                    )}
                    {m.pasta_destino && (
                      <span className="text-xs text-muted-foreground flex items-center gap-1">
                        <FolderOpen className="w-3 h-3" />{m.pasta_destino}
                      </span>
                    )}
                    {m.variaveis?.length > 0 && (
                      <span className="text-xs text-muted-foreground">
                        {m.variaveis.length} variável(is)
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <Button
                    size="icon" variant="ghost" className={`h-8 w-8 ${m.ativo !== false ? 'text-yellow-600' : 'text-green-600'}`}
                    onClick={() => handleToggle(m)} title={m.ativo !== false ? 'Desativar' : 'Ativar'}
                  >
                    <Power className="w-3.5 h-3.5" />
                  </Button>
                  <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => { setEditando(m); setFormOpen(true); }}>
                    <Pencil className="w-3.5 h-3.5" />
                  </Button>
                  <Button size="icon" variant="ghost" className="h-8 w-8 text-destructive hover:text-destructive" onClick={() => handleDelete(m.id, m.nome)}>
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <ModeloForm
        open={formOpen}
        onClose={() => setFormOpen(false)}
        modelo={editando}
        finalidades={finalidades}
        onSaved={(modelo, isNew) => {
          registrarAuditoria({
            acao: isNew ? ACOES.MODELO_CRIADO : ACOES.MODELO_EDITADO,
            modulo: 'modelo',
            descricao: isNew ? `Modelo "${modelo?.nome}" criado.` : `Modelo "${modelo?.nome}" editado.`,
            origem: 'rh',
            dados_depois: modelo,
          });
          onRefresh();
          setFormOpen(false);
        }}
      />
    </div>
  );
}
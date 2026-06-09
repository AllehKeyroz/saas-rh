import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Upload, ExternalLink, Trash2, Loader2, ShieldCheck, Eye, EyeOff } from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { formatDate } from '@/lib/formatters';
import { client } from '@/api/client';
import { toast } from 'sonner';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import AuditoriaDocumentoDrawer from '@/components/auditoria/AuditoriaDocumentoDrawer';
import { registrarAuditoria, ACOES } from '@/lib/auditoriaDocumentos';

export default function Documentos360({ funcionario, documentos, onRefresh }) {
  const [uploading, setUploading] = useState(false);
  const [auditoriaDoc, setAuditoriaDoc] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);

  const handleToggleVisivel = async (doc) => {
    await client.entities.DocumentoFuncionario.update(doc.id, { visivel_ao_funcionario: !doc.visivel_ao_funcionario });
    if (onRefresh) onRefresh();
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    await client.entities.DocumentoFuncionario.delete(deleteTarget);
    toast.success('Documento excluído.');
    if (onRefresh) onRefresh();
    setDeleteTarget(null);
  };

  const handleUpload = async (e) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;

    setUploading(true);
    try {
      for (const file of files) {
        const uploadResult = await client.integrations.Core.UploadFile({ file });
        const doc = await client.entities.DocumentoFuncionario.create({
          funcionario_id: funcionario.id,
          funcionario_nome: funcionario.nome,
          nome_arquivo: file.name,
          file_uri: uploadResult.file_url,
          file_type: file.type,
          categoria: 'outros',
          visivel_ao_funcionario: false,
        });
        await registrarAuditoria({
          acao: ACOES.DOCUMENTO_CARREGADO, modulo: 'documento', origem: 'rh',
          descricao: `Documento "${file.name}" enviado manualmente para ${funcionario.nome}.`,
          documento_id: doc?.id, funcionario_id: funcionario.id, funcionario_nome: funcionario.nome,
          nome_documento: file.name,
        });
      }
      toast.success('Documentos enviados com sucesso!');
      if (onRefresh) onRefresh();
    } catch (error) {
      toast.error(`Erro ao enviar: ${error.message}`);
     } finally {
      setUploading(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle>Documentos do Funcionário</CardTitle>
            <label>
              <input 
                type="file" 
                multiple 
                hidden 
                onChange={handleUpload}
                disabled={uploading}
              />
              <Button asChild disabled={uploading} className="gap-2">
                <span>
                  {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                  Enviar Documento
                </span>
              </Button>
            </label>
          </div>
        </CardHeader>
      </Card>

      {documentos.length > 0 ? (
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>Categoria</TableHead>
                  <TableHead>Descrição</TableHead>
                  <TableHead>Data</TableHead>
                  <TableHead>Visível</TableHead>
                  <TableHead>Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {documentos.map(doc => (
                  <TableRow key={doc.id}>
                    <TableCell className="font-medium">{doc.nome_arquivo}</TableCell>
                    <TableCell>
                      <Badge>{doc.categoria || 'outros'}</Badge>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">{doc.descricao || '-'}</TableCell>
                    <TableCell className="text-sm">{doc.created_date ? formatDate(doc.created_date) : '-'}</TableCell>
                    <TableCell>
                      <Button
                        size="icon" variant="ghost"
                        className={`h-8 w-8 ${doc.visivel_ao_funcionario ? 'text-green-600' : 'text-muted-foreground'}`}
                        onClick={() => handleToggleVisivel(doc)}
                        title={doc.visivel_ao_funcionario ? 'Visível ao funcionário' : 'Oculto do funcionário'}
                      >
                        {doc.visivel_ao_funcionario ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                      </Button>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        {doc.file_uri && (
                          <a href={doc.file_uri} target="_blank" rel="noopener noreferrer">
                            <Button size="icon" variant="ghost" className="h-8 w-8">
                              <ExternalLink className="w-3 h-3" />
                            </Button>
                          </a>
                        )}
                        <Button
                          size="icon" variant="ghost" className="h-8 w-8 text-muted-foreground"
                          title="Ver Auditoria" onClick={() => setAuditoriaDoc(doc)}
                        >
                          <ShieldCheck className="w-3 h-3" />
                        </Button>
                        <Button
                          size="icon" variant="ghost" className="h-8 w-8 text-destructive"
                          title="Excluir documento"
                          onClick={() => setDeleteTarget(doc.id)}
                        >
                          <Trash2 className="w-3 h-3" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="text-center py-12 text-muted-foreground">
            <p>Nenhum documento anexado</p>
          </CardContent>
        </Card>
      )}
      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir documento?</AlertDialogTitle>
            <AlertDialogDescription>Esta ação não pode ser desfeita.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setDeleteTarget(null)}>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete}>Excluir</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AuditoriaDocumentoDrawer
        open={!!auditoriaDoc}
        onClose={() => setAuditoriaDoc(null)}
        documentoId={auditoriaDoc?.id}
        nomeDocumento={auditoriaDoc?.nome_arquivo || auditoriaDoc?.nome_documento}
      />
    </div>
  );
}
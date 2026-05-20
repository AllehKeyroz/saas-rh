import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Upload, ExternalLink, Trash2, Loader2, ShieldCheck } from 'lucide-react';
import { formatDate } from '@/lib/formatters';
import { base44 } from '@/api/base44Client';
import { toast } from 'sonner';
import AuditoriaDocumentoDrawer from '@/components/auditoria/AuditoriaDocumentoDrawer';
import { registrarAuditoria, ACOES } from '@/lib/auditoriaDocumentos';

export default function Documentos360({ funcionario, documentos, onRefresh }) {
  const [uploading, setUploading] = useState(false);
  const [auditoriaDoc, setAuditoriaDoc] = useState(null);

  const handleUpload = async (e) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;

    setUploading(true);
    try {
      for (const file of files) {
        const uploadResult = await base44.integrations.Core.UploadFile({ file });
        const doc = await base44.entities.DocumentoFuncionario.create({
          funcionario_id: funcionario.id,
          funcionario_nome: funcionario.nome,
          nome_arquivo: file.name,
          file_uri: uploadResult.file_url,
          file_type: file.type,
          categoria: 'outros',
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
                          onClick={async () => {
                            if (!confirm(`Excluir "${doc.nome_arquivo}"?`)) return;
                            await base44.entities.DocumentoFuncionario.delete(doc.id);
                            toast.success('Documento excluído.');
                            if (onRefresh) onRefresh();
                          }}
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
      <AuditoriaDocumentoDrawer
        open={!!auditoriaDoc}
        onClose={() => setAuditoriaDoc(null)}
        documentoId={auditoriaDoc?.id}
        nomeDocumento={auditoriaDoc?.nome_arquivo || auditoriaDoc?.nome_documento}
      />
    </div>
  );
}
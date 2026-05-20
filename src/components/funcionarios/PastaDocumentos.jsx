import React, { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { client } from '@/api/client';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Upload, Download, Trash2, FileText, Image, Loader2, User, FolderOpen, PackageOpen } from 'lucide-react';
import JSZip from 'jszip';
import { formatDate } from '@/lib/formatters';

const CATEGORIAS = {
  admissional: { label: 'Admissional', color: 'bg-blue-100 text-blue-700' },
  demissional: { label: 'Demissional', color: 'bg-red-100 text-red-700' },
  contrato: { label: 'Contrato', color: 'bg-purple-100 text-purple-700' },
  atestado: { label: 'Atestado', color: 'bg-yellow-100 text-yellow-700' },
  outros: { label: 'Outros', color: 'bg-gray-100 text-gray-700' },
};

function FileIcon({ type }) {
  if (type?.startsWith('image/')) return <Image className="w-5 h-5 text-blue-500" />;
  return <FileText className="w-5 h-5 text-red-500" />;
}

export default function PastaDocumentos({ open, onClose, funcionario }) {
  const queryClient = useQueryClient();
  const [uploading, setUploading] = useState(false);
  const [descricao, setDescricao] = useState('');
  const [categoria, setCategoria] = useState('outros');
  const [downloading, setDownloading] = useState(null);
  const [zipping, setZipping] = useState(false);

  const { data: documentos = [], isLoading } = useQuery({
    queryKey: ['documentos', funcionario?.id],
    queryFn: () => client.entities.DocumentoFuncionario.filter({ funcionario_id: funcionario.id }, '-created_date', 200),
    enabled: !!funcionario?.id,
  });

  const handleUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    const { file_uri } = await client.integrations.Core.UploadPrivateFile({ file });
    await client.entities.DocumentoFuncionario.create({
      funcionario_id: funcionario.id,
      funcionario_nome: funcionario.nome,
      nome_arquivo: file.name,
      descricao: descricao || '',
      categoria,
      file_uri,
      file_type: file.type,
    });
    queryClient.invalidateQueries({ queryKey: ['documentos', funcionario.id] });
    setDescricao('');
    setUploading(false);
    e.target.value = '';
  };

  const handleDownload = async (doc) => {
    setDownloading(doc.id);
    const { signed_url } = await client.integrations.Core.CreateFileSignedUrl({ file_uri: doc.file_uri });
    const a = document.createElement('a');
    a.href = signed_url;
    a.download = doc.nome_arquivo;
    a.target = '_blank';
    a.click();
    setDownloading(null);
  };

  const handleDownloadAll = async () => {
    if (documentos.length === 0) return;
    setZipping(true);
    const zip = new JSZip();
    await Promise.all(documentos.map(async (doc) => {
      const { signed_url } = await client.integrations.Core.CreateFileSignedUrl({ file_uri: doc.file_uri });
      const response = await fetch(signed_url);
      const blob = await response.blob();
      zip.file(doc.nome_arquivo, blob);
    }));
    const content = await zip.generateAsync({ type: 'blob' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(content);
    a.download = `documentos_${funcionario.nome.replace(/\s+/g, '_')}.zip`;
    a.click();
    URL.revokeObjectURL(a.href);
    setZipping(false);
  };

  const handleDelete = async (doc) => {
    await client.entities.DocumentoFuncionario.delete(doc.id);
    queryClient.invalidateQueries({ queryKey: ['documentos', funcionario.id] });
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-muted flex items-center justify-center overflow-hidden shrink-0">
              {funcionario?.foto ? (
                <img src={funcionario.foto} alt="" className="w-full h-full object-cover" />
              ) : (
                <User className="w-5 h-5 text-muted-foreground" />
              )}
            </div>
            <div>
              <DialogTitle className="flex items-center gap-2">
                <FolderOpen className="w-5 h-5" /> Pasta de {funcionario?.nome}
              </DialogTitle>
              <div className="flex items-center gap-3">
                <p className="text-sm text-muted-foreground">{documentos.length} documento(s)</p>
                {documentos.length > 0 && (
                  <Button size="sm" variant="outline" onClick={handleDownloadAll} disabled={zipping} className="h-7 text-xs gap-1">
                    {zipping ? <Loader2 className="w-3 h-3 animate-spin" /> : <PackageOpen className="w-3 h-3" />}
                    {zipping ? 'Compactando...' : 'Exportar ZIP'}
                  </Button>
                )}
              </div>
            </div>
          </div>
        </DialogHeader>

        {/* Upload */}
        <div className="border rounded-xl p-4 space-y-3 bg-muted/30">
          <p className="text-sm font-medium">Adicionar documento</p>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs">Categoria</Label>
              <Select value={categoria} onValueChange={setCategoria}>
                <SelectTrigger className="h-8 text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(CATEGORIAS).map(([k, v]) => (
                    <SelectItem key={k} value={k}>{v.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Descrição (opcional)</Label>
              <Input
                value={descricao}
                onChange={e => setDescricao(e.target.value)}
                placeholder="Ex: Contrato assinado"
                className="h-8 text-sm"
              />
            </div>
          </div>
          <div>
            <Label className="text-xs">Arquivo (imagem ou PDF)</Label>
            <Input
              type="file"
              accept="image/*,.pdf,.doc,.docx"
              onChange={handleUpload}
              disabled={uploading}
              className="text-sm"
            />
          </div>
          {uploading && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="w-4 h-4 animate-spin" /> Enviando arquivo...
            </div>
          )}
        </div>

        {/* Lista de documentos */}
        {isLoading ? (
          <div className="text-center py-8 text-muted-foreground text-sm">Carregando...</div>
        ) : documentos.length === 0 ? (
          <div className="text-center py-10 text-muted-foreground">
            <FolderOpen className="w-10 h-10 mx-auto mb-2 opacity-30" />
            <p className="text-sm">Nenhum documento na pasta</p>
          </div>
        ) : (
          <div className="space-y-2">
            {documentos.map(doc => (
              <div key={doc.id} className="flex items-center gap-3 p-3 rounded-lg border bg-card hover:bg-muted/30 transition-colors">
                <FileIcon type={doc.file_type} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{doc.nome_arquivo}</p>
                  <div className="flex items-center gap-2 mt-0.5">
                    <Badge className={`text-xs ${CATEGORIAS[doc.categoria]?.color || CATEGORIAS.outros.color}`}>
                      {CATEGORIAS[doc.categoria]?.label || 'Outros'}
                    </Badge>
                    {doc.descricao && <span className="text-xs text-muted-foreground truncate">{doc.descricao}</span>}
                    <span className="text-xs text-muted-foreground">{formatDate(doc.created_date)}</span>
                  </div>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-primary"
                    onClick={() => handleDownload(doc)}
                    disabled={downloading === doc.id}
                    title="Download"
                  >
                    {downloading === doc.id ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Download className="w-4 h-4" />
                    )}
                  </Button>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive" title="Excluir">
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Excluir documento?</AlertDialogTitle>
                        <AlertDialogDescription>Esta ação não pode ser desfeita.</AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                        <AlertDialogAction onClick={() => handleDelete(doc)}>Excluir</AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </div>
            ))}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
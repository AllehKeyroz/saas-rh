import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { client } from '@/api/client';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Download, FileText, EyeOff, Loader2 } from 'lucide-react';
import { formatDate } from '@/lib/formatters';
import { toast } from 'sonner';

const CATEGORIA_LABELS = {
  admissional: 'Admissional',
  demissional: 'Demissional',
  contrato: 'Contrato',
  atestado: 'Atestado',
  outros: 'Outros',
};

const CATEGORIA_COLORS = {
  admissional: 'bg-blue-100 text-blue-700',
  demissional: 'bg-red-100 text-red-700',
  contrato: 'bg-green-100 text-green-700',
  atestado: 'bg-yellow-100 text-yellow-700',
  outros: 'bg-gray-100 text-gray-700',
};

export default function MeusDocumentos({ funcionarioId }) {
  const [baixando, setBaixando] = useState(null);

  const { data: documentos = [], isLoading } = useQuery({
    queryKey: ['meus_documentos', funcionarioId],
    queryFn: () => client.entities.DocumentoFuncionario.filter({
      funcionario_id: funcionarioId,
      visivel_ao_funcionario: true,
    }),
    enabled: !!funcionarioId,
  });

  const handleDownload = async (doc) => {
    setBaixando(doc.id);
    try {
      const a = document.createElement('a');
      a.href = doc.file_uri;
      a.download = doc.nome_arquivo;
      a.target = '_blank';
      a.click();
    } catch (err) {
      toast.error('Erro ao baixar documento');
    } finally {
      setBaixando(null);
    }
  };

  if (isLoading) return <Skeleton className="h-32" />;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <FileText className="w-5 h-5 text-primary" />
        <h2 className="font-bold text-lg">Meus Documentos</h2>
      </div>

      {documentos.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16 text-muted-foreground gap-2">
            <EyeOff className="w-10 h-10 opacity-30" />
            <p className="font-medium">Nenhum documento disponível</p>
            <p className="text-sm">O RH ainda não disponibilizou documentos para você.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {documentos.sort((a, b) => (b.created_date || '').localeCompare(a.created_date || '')).map(doc => {
            const catColor = CATEGORIA_COLORS[doc.categoria] || CATEGORIA_COLORS.outros;
            return (
              <Card key={doc.id} className="hover:shadow-sm transition-shadow">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3 min-w-0 flex-1">
                      <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                        <FileText className="w-5 h-5 text-primary" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="font-semibold text-sm truncate">{doc.nome_arquivo}</p>
                        <div className="flex items-center gap-2 flex-wrap mt-0.5">
                          <Badge className={`text-xs ${catColor} border-0`}>{CATEGORIA_LABELS[doc.categoria] || doc.categoria}</Badge>
                          {doc.created_date && <span className="text-xs text-muted-foreground">{formatDate(doc.created_date)}</span>}
                        </div>
                        {doc.descricao && <p className="text-xs text-muted-foreground mt-1">{doc.descricao}</p>}
                      </div>
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleDownload(doc)}
                      disabled={baixando === doc.id}
                      className="shrink-0"
                    >
                      {baixando === doc.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />}
                      {baixando === doc.id ? '...' : 'Baixar'}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}

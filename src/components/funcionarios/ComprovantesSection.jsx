import React, { useState } from 'react';
import { Loader2, Paperclip, Eye, EyeOff, Trash2, Upload, ExternalLink } from 'lucide-react';

// Seção reutilizável de comprovantes de um evento (férias/afastamento).
// - Lista os arquivos com link para abrir
// - Upload posterior (onAddFile recebe o File)
// - Controle de visibilidade ao funcionário (opcional — só férias no portal)
// - Remoção (opcional)
export default function ComprovantesSection({ anexos = [], onAddFile, onToggleVisivel, onRemover }) {
  const [uploading, setUploading] = useState(false);

  const handleFile = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      await onAddFile?.(file);
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  };

  return (
    <div className="space-y-1.5">
      <p className="text-xs font-medium text-muted-foreground flex items-center gap-1">
        <Paperclip className="w-3.5 h-3.5" /> Comprovantes
      </p>
      {(anexos || []).length === 0 && (
        <p className="text-xs text-muted-foreground">Nenhum comprovante anexado.</p>
      )}
      {(anexos || []).map((a, idx) => {
        const nome = a.nome || 'Arquivo';
        const url = a.url || '';
        const visivel = a.visivel_ao_funcionario === true;
        return (
          <div key={idx} className="flex items-center gap-2 bg-muted/40 rounded-lg px-2 py-1.5 text-xs">
            <a href={url} target="_blank" rel="noopener noreferrer" className="flex-1 truncate text-primary hover:underline flex items-center gap-1 min-w-0">
              <Paperclip className="w-3 h-3 shrink-0" />
              <span className="truncate">{nome}</span>
              <ExternalLink className="w-3 h-3 shrink-0 opacity-60" />
            </a>
            {onToggleVisivel && (
              <button
                type="button"
                onClick={() => onToggleVisivel(a)}
                title={visivel ? 'Visível ao funcionário' : 'Oculto do funcionário'}
                className={`shrink-0 ${visivel ? 'text-green-600' : 'text-muted-foreground hover:text-foreground'}`}
              >
                {visivel ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
              </button>
            )}
            {onRemover && (
              <button
                type="button"
                onClick={() => onRemover(a)}
                title="Remover comprovante"
                className="shrink-0 text-muted-foreground hover:text-destructive"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        );
      })}
      {onAddFile && (
        <label className="flex items-center gap-2 border border-dashed rounded-lg px-3 py-1.5 cursor-pointer hover:bg-muted/50 transition-colors text-xs text-muted-foreground">
          {uploading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Upload className="w-3.5 h-3.5" />}
          <span>{uploading ? 'Enviando...' : 'Adicionar comprovante'}</span>
          <input type="file" className="hidden" accept="image/*,.pdf" onChange={handleFile} disabled={uploading} />
        </label>
      )}
    </div>
  );
}
import React, { useState } from 'react';
import { client } from '@/api/client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Download, Loader2, HardDrive, RefreshCw, Trash2, AlertCircle, CheckCircle2, Clock, History, User, FileText, Database, Users } from 'lucide-react';
import { format, differenceInDays, addDays } from 'date-fns';
import JSZip from 'jszip';
import { toast } from 'sonner';

const STATUS_CONFIG = {
  concluido: { label: 'Concluído', variant: 'default', icon: CheckCircle2 },
  gerando:   { label: 'Gerando...', variant: 'secondary', icon: Clock },
  erro:      { label: 'Erro', variant: 'destructive', icon: AlertCircle },
};

const TIPOS_BACKUP = [
  {
    id: 'documentos',
    label: 'Documentos de Funcionários',
    descricao: 'Arquivos e documentos pessoais de todos os funcionários',
    icon: FileText,
    color: 'bg-blue-50 border-blue-200',
    iconColor: 'text-blue-600',
  },
  {
    id: 'geral',
    label: 'Backup Geral do Sistema',
    descricao: 'Todos os dados: funcionários, lançamentos, comissões, documentos e assinaturas',
    icon: Database,
    color: 'bg-purple-50 border-purple-200',
    iconColor: 'text-purple-600',
  },
];

async function executarBackup(tipo, queryClient, setGerandoTipo) {
  setGerandoTipo(tipo);
  const agora = new Date();
  const nomeArquivo = `backup_${tipo}_${format(agora, 'yyyy-MM-dd_HH-mm')}.zip`;
  const expiraEm = addDays(agora, 60);

  const registro = await client.entities.BackupRegistro.create({
    nome_arquivo: nomeArquivo,
    data_geracao: agora.toISOString(),
    expira_em: expiraEm.toISOString(),
    status: 'gerando',
    total_arquivos: 0,
  });

  const zip = new JSZip();
  let totalArquivos = 0;

  try {
    if (tipo === 'documentos' || tipo === 'geral') {
      // Documentos dos funcionários
      const documentos = await client.entities.DocumentoFuncionario.list();
      const pastaDocumentos = zip.folder('documentos_funcionarios');
      for (const doc of documentos) {
        if (!doc.file_uri) continue;
        try {
          const { signed_url } = await client.integrations.Core.CreateFileSignedUrl({ file_uri: doc.file_uri });
          const response = await fetch(signed_url);
          if (!response.ok) continue;
          const arrayBuffer = await response.arrayBuffer();
          const nomeFunc = (doc.funcionario_nome || 'desconhecido').replace(/[^a-zA-Z0-9_\- ]/g, '_');
          pastaDocumentos.folder(nomeFunc).file(doc.nome_arquivo || `doc_${doc.id}`, arrayBuffer);
          totalArquivos++;
        } catch (_) { /* pula arquivo com erro */ }
      }

      // Comprovantes financeiros
      const fichas = await client.entities.FichaFinanceira.list();
      const pastaComp = zip.folder('comprovantes_financeiros');
      for (const ficha of fichas) {
        if (!ficha.comprovante) continue;
        try {
          const response = await fetch(ficha.comprovante);
          if (!response.ok) continue;
          const arrayBuffer = await response.arrayBuffer();
          const nomeFunc = (ficha.funcionario_nome || 'desconhecido').replace(/[^a-zA-Z0-9_\- ]/g, '_');
          const ext = ficha.comprovante.split('.').pop()?.split('?')[0] || 'bin';
          pastaComp.folder(nomeFunc).file(`comprovante_${ficha.id}.${ext}`, arrayBuffer);
          totalArquivos++;
        } catch (_) { /* pula */ }
      }
    }

    if (tipo === 'geral') {
      // Dados estruturados em JSON
      const [funcionarios, lancamentos, comissoes, assinaturas, advertencias, fechamentos] = await Promise.all([
        client.entities.Funcionarios.list(),
        client.entities.FichaFinanceira.list(),
        client.entities.ComissoesGorjetas.list(),
        client.entities.AssinaturaDigital.list(),
        client.entities.Advertencias.list(),
        client.entities.FechamentoMensal.list(),
      ]);

      const dadosJson = {
        exportado_em: agora.toISOString(),
        funcionarios,
        lancamentos_financeiros: lancamentos,
        comissoes,
        assinaturas_digitais: assinaturas,
        advertencias,
        fechamentos,
      };

      zip.folder('dados_sistema').file('exportacao_completa.json', JSON.stringify(dadosJson, null, 2));
      totalArquivos++;
    }

    const zipBlob = await zip.generateAsync({ type: 'blob' });
    const zipFile = new File([zipBlob], nomeArquivo, { type: 'application/zip' });
    const { file_url } = await client.integrations.Core.UploadFile({ file: zipFile });

    await client.entities.BackupRegistro.update(registro.id, {
      file_url,
      status: 'concluido',
      total_arquivos: totalArquivos,
    });

    client.entities.LogAuditoria.create({
      usuario_email: 'sistema',
      acao: 'criar',
      modulo: 'backup',
      descricao: `Backup concluído: ${nomeArquivo} (${totalArquivos} arquivo(s))`,
    }).catch(() => {});

    toast.success(`Backup gerado com sucesso! ${totalArquivos} arquivo(s).`);
  } catch (error) {
    await client.entities.BackupRegistro.update(registro.id, { status: 'erro' });
    toast.error(`Erro ao gerar backup: ${error.message}`);
  }

  // Limpar backups expirados
  const todos = await client.entities.BackupRegistro.list();
  for (const r of todos) {
    if (r.expira_em && new Date(r.expira_em) < new Date()) {
      await client.entities.BackupRegistro.delete(r.id);
    }
  }

  queryClient.invalidateQueries({ queryKey: ['backups'] });
  setGerandoTipo(null);
}

export default function BackupsTab() {
  const queryClient = useQueryClient();
  const [gerandoTipo, setGerandoTipo] = useState(null);

  const { data: backups = [], isLoading } = useQuery({
    queryKey: ['backups'],
    queryFn: () => client.entities.BackupRegistro.list('-data_geracao'),
  });

  const { data: logsBackup = [] } = useQuery({
    queryKey: ['logsBackup'],
    queryFn: () => client.entities.LogAuditoria.filter({ modulo: 'backup' }, '-created_date', 20),
  });

  const handleDelete = async (id) => {
    if (!confirm('Excluir este registro de backup?')) return;
    await client.entities.BackupRegistro.delete(id);
    queryClient.invalidateQueries({ queryKey: ['backups'] });
  };

  return (
    <div className="space-y-6">
      {/* Cards de tipos de backup */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {TIPOS_BACKUP.map(tipo => {
          const Icon = tipo.icon;
          const gerando = gerandoTipo === tipo.id;
          return (
            <div key={tipo.id} className={`border rounded-xl p-4 space-y-3 ${tipo.color}`}>
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-lg bg-white flex items-center justify-center shadow-sm`}>
                  <Icon className={`w-5 h-5 ${tipo.iconColor}`} />
                </div>
                <div>
                  <p className="font-semibold text-sm text-foreground">{tipo.label}</p>
                  <p className="text-xs text-muted-foreground">{tipo.descricao}</p>
                </div>
              </div>
              <Button
                size="sm"
                className="w-full gap-2"
                disabled={!!gerandoTipo}
                onClick={() => executarBackup(tipo.id, queryClient, setGerandoTipo).catch(e => { toast.error('Erro inesperado: ' + e.message); setGerandoTipo(null); })}
              >
                {gerando
                  ? <><Loader2 className="w-4 h-4 animate-spin" />Gerando...</>
                  : <><RefreshCw className="w-4 h-4" />Gerar Backup</>
                }
              </Button>
            </div>
          );
        })}
      </div>

      {gerandoTipo && (
        <div className="flex items-center gap-3 p-4 bg-primary/5 border border-primary/20 rounded-lg text-sm text-primary">
          <Loader2 className="w-5 h-5 animate-spin shrink-0" />
          <span>Coletando e compactando arquivos... Isso pode levar alguns minutos.</span>
        </div>
      )}

      {/* Lista de backups */}
      <div>
        <div className="flex justify-between items-center mb-3">
          <p className="text-sm font-medium text-foreground flex items-center gap-2">
            <HardDrive className="w-4 h-4" />
            Backups Disponíveis
          </p>
          <p className="text-xs text-muted-foreground">{backups.length} backup(s) · ficam por 60 dias</p>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>
        ) : backups.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground border-2 border-dashed border-border rounded-xl">
            <HardDrive className="w-10 h-10 mx-auto mb-2 opacity-30" />
            <p className="font-medium">Nenhum backup disponível</p>
            <p className="text-xs mt-1">Gere um backup usando os botões acima</p>
          </div>
        ) : (
          <div className="divide-y border rounded-xl overflow-hidden bg-card">
            {backups.map(b => {
              const cfg = STATUS_CONFIG[b.status] || STATUS_CONFIG.concluido;
              const Icon = cfg.icon;
              const dias = b.expira_em ? differenceInDays(new Date(b.expira_em), new Date()) : null;
              return (
                <div key={b.id} className="flex items-center justify-between px-4 py-3 gap-3">
                  <div className="flex items-start gap-3 min-w-0">
                    <HardDrive className="w-5 h-5 text-muted-foreground shrink-0 mt-0.5" />
                    <div className="min-w-0">
                      <p className="font-medium text-sm truncate">{b.nome_arquivo}</p>
                      <div className="flex items-center gap-2 flex-wrap mt-0.5">
                        <span className="text-xs text-muted-foreground">
                          {b.data_geracao ? format(new Date(b.data_geracao), "dd/MM/yyyy 'às' HH:mm") : '-'}
                        </span>
                        {b.total_arquivos > 0 && (
                          <span className="text-xs text-muted-foreground">· {b.total_arquivos} arquivo(s)</span>
                        )}
                        {dias !== null && (
                          <span className={`text-xs ${dias <= 7 ? 'text-destructive' : 'text-muted-foreground'}`}>
                            · expira em {dias} dia(s)
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <Badge variant={cfg.variant} className="text-xs gap-1">
                      <Icon className="w-3 h-3" />{cfg.label}
                    </Badge>
                    {b.status === 'concluido' && b.file_url && (
                      <Button size="sm" variant="outline" asChild>
                        <a href={b.file_url} download={b.nome_arquivo} target="_blank" rel="noopener noreferrer">
                          <Download className="w-4 h-4" />Baixar
                        </a>
                      </Button>
                    )}
                    <Button size="icon" variant="ghost" className="h-8 w-8 text-destructive" onClick={() => handleDelete(b.id)}>
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Histórico */}
      {logsBackup.length > 0 && (
        <div className="space-y-2">
          <p className="text-sm font-medium text-foreground flex items-center gap-2">
            <History className="w-4 h-4" />Histórico de Operações
          </p>
          <div className="divide-y border rounded-xl overflow-hidden bg-card">
            {logsBackup.map(log => (
              <div key={log.id} className="flex items-center gap-3 px-4 py-2.5">
                <User className="w-4 h-4 text-muted-foreground shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm truncate">{log.descricao}</p>
                </div>
                <span className="text-xs text-muted-foreground shrink-0">
                  {log.created_date ? format(new Date(log.created_date), "dd/MM/yyyy HH:mm") : '-'}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
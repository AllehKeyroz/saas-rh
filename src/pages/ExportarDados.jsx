import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { client } from '@/api/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Loader2, Download, FolderTree, CheckCircle2, AlertTriangle } from 'lucide-react';
import JSZip from 'jszip';
import { saveAs } from 'file-saver';

function sanitize(name) {
  return String(name || 'sem_nome').replace(/[<>:"/\\|?*]/g, '_').trim().slice(0, 60);
}

function formatTXT(obj, indent = 0) {
  const pad = '  '.repeat(indent);
  let out = '';
  for (const [key, val] of Object.entries(obj)) {
    if (val === null || val === undefined) continue;
    if (Array.isArray(val)) {
      out += `${pad}${key}: [\n`;
      val.forEach((item, i) => {
        if (typeof item === 'object') {
          out += `${pad}  [${i + 1}]\n${formatTXT(item, indent + 2)}`;
        } else {
          out += `${pad}  ${i + 1}. ${item}\n`;
        }
      });
      out += `${pad}]\n`;
    } else if (typeof val === 'object') {
      out += `${pad}${key}:\n${formatTXT(val, indent + 1)}`;
    } else {
      out += `${pad}${key}: ${val}\n`;
    }
  }
  return out;
}

async function baixarMidia(url) {
  if (!url) return null;
  if (url.startsWith('data:')) {
    try { const r = await fetch(url); return r.ok ? r.blob() : null; } catch { return null; }
  }
  try {
    const resp = await fetch(url, { signal: AbortSignal.timeout(20000) });
    return resp.ok ? resp.blob() : null;
  } catch { return null; }
}

export default function ExportarDados() {
  const [exporting, setExporting] = useState(false);
  const [progresso, setProgresso] = useState('');
  const [log, setLog] = useState([]);
  const [concluido, setConcluido] = useState(false);
  const [apenas3, setApenas3] = useState(true);

  const { data: funcionarios = [] } = useQuery({
    queryKey: ['funcionarios-export'],
    queryFn: () => client.entities.Funcionarios.list(),
  });

  const { data: lancamentos = [] } = useQuery({
    queryKey: ['lancamentos-export'],
    queryFn: () => client.entities.FichaFinanceira.list('-created_date', 2000),
  });

  const { data: documentos = [] } = useQuery({
    queryKey: ['documentos-export'],
    queryFn: () => client.entities.DocumentoFuncionario.list('-created_date', 500),
  });

  const { data: fechamentos = [] } = useQuery({
    queryKey: ['fechamentos-export'],
    queryFn: () => client.entities.FechamentoMensal.list(),
  });

  const addLog = (msg) => setLog(p => [...p, msg]);

  const handleExport = async () => {
    setExporting(true);
    setConcluido(false);
    setLog([]);
    const zip = new JSZip();
    const downloads = [];

    const alvos = apenas3 ? funcionarios.slice(0, 3) : funcionarios;
    const total = alvos.length;

    addLog(`Iniciando exportação de ${total} funcionário(s)...`);

    for (let idx = 0; idx < alvos.length; idx++) {
      const func = alvos[idx];
      const nomePasta = sanitize(func.nome || func.id);
      const basePath = `funcionarios/${nomePasta}`;
      setProgresso(`(${idx + 1}/${total}) ${func.nome}...`);

      // Dados do funcionário
      const funcDados = { ...func };
      delete funcDados.tenant_id;
      delete funcDados.created_date;
      delete funcDados.updated_date;
      zip.file(`${basePath}/dados.txt`, formatTXT(funcDados));

      // Lançamentos
      const funcLanc = lancamentos.filter(l => l.funcionario_id === func.id);
      if (funcLanc.length > 0) {
        const lancComLink = [];
        for (const l of funcLanc) {
          const { tenant_id, created_date, updated_date, ...rest } = l;
          const item = { ...rest };
          if (l.comprovante) {
            const nomeArq = `comprovante_${sanitize(l.id)}`;
            const ext = nomeArquivo(l.comprovante).includes('.') ? '.' + nomeArquivo(l.comprovante).split('.').pop() : '.bin';
            const caminho = `comprovantes/${nomeArq}${ext}`;
            downloads.push({ url: l.comprovante, path: `${basePath}/${caminho}`, func: func.nome, tipo: 'comprovante' });
            item.comprovante_url = l.comprovante;
            item.comprovante_arquivo = caminho;
          }
          lancComLink.push(item);
        }
        zip.file(`${basePath}/lancamentos.txt`, formatTXT({ total: funcLanc.length, lancamentos: lancComLink }));
      } else {
        zip.file(`${basePath}/lancamentos.txt`, 'Nenhum lançamento registrado.\n');
      }

      // Fechamentos
      const funcFech = fechamentos.filter(f => f.funcionario_id === func.id);
      if (funcFech.length > 0) {
        const fechParaTxt = funcFech.map(f => {
          const { tenant_id, created_date, updated_date, ...rest } = f;
          return rest;
        });
        zip.file(`${basePath}/fechamentos.txt`, formatTXT({ total: funcFech.length, fechamentos: fechParaTxt }));
      }

      // Documentos
      const funcDocs = documentos.filter(d => d.funcionario_id === func.id);
      if (funcDocs.length > 0) {
        const docsComLink = [];
        for (const d of funcDocs) {
          const { tenant_id, created_date, updated_date, ...rest } = d;
          const item = { ...rest, file_uri: d.file_uri || '(sem arquivo)' };
          if (d.file_uri) {
            const nomeArq = sanitize(d.nome_arquivo || `documento_${d.id}`);
            const ext = d.nome_arquivo ? '.' + d.nome_arquivo.split('.').pop() : '.bin';
            const caminho = `documentos/${nomeArq}${ext}`;
            downloads.push({ url: d.file_uri, path: `${basePath}/${caminho}`, func: func.nome, tipo: 'documento' });
            item.arquivo_url = d.file_uri;
            item.arquivo_arquivo = caminho;
          }
          docsComLink.push(item);
        }
        zip.file(`${basePath}/documentos_info.txt`, formatTXT({ total: funcDocs.length, documentos: docsComLink }));
      }

      addLog(`✓ ${func.nome} — ${funcLanc.length} lançamentos, ${funcDocs.length} documentos`);
    }

    // Manifest JSON com todas as URLs para download
    zip.file('manifesto_downloads.json', JSON.stringify(downloads, null, 2));

    // Script PowerShell que baixa todos os arquivos
    const psScript = `<# Ferramenta de Download de Arquivos #>
# Extraia este ZIP, depois execute este script com PowerShell:
#   powershell -ExecutionPolicy Bypass -File baixar_arquivos.ps1

# Lê o manifesto e baixa cada arquivo
try {
  $manifest = Get-Content -Path "$PSScriptRoot/manifesto_downloads.json" -Raw | ConvertFrom-Json
} catch {
  Write-Host "ERRO: Não foi possível ler manifesto_downloads.json" -ForegroundColor Red
  Write-Host "Certifique-se de que está executando o script na pasta onde o ZIP foi extraído." -ForegroundColor Yellow
  exit 1
}

$total = $manifest.Count
$ok = 0
$falha = 0

Write-Host "╔══════════════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "║     DOWNLOAD DE ARQUIVOS - RHDTALIA         ║" -ForegroundColor Cyan
Write-Host "╚══════════════════════════════════════════════╝" -ForegroundColor Cyan
  Write-Host "Total de arquivos para baixar: ${total}" -ForegroundColor White

for ($i = 0; $i -lt $total; $i++) {
  $item = $manifest[$i]
  $destino = Join-Path $PSScriptRoot $item.path
  $pasta = Split-Path $destino -Parent

  if (-not (Test-Path $pasta)) {
    New-Item -ItemType Directory -Path $pasta -Force | Out-Null
  }

  Write-Progress -Activity "Baixando arquivos..." -Status "$($i+1)/$total - $($item.tipo) de $($item.func)" -PercentComplete (($i / $total) * 100)

  try {
    Invoke-WebRequest -Uri $item.url -OutFile $destino -TimeoutSec 120 -ErrorAction Stop
    Write-Host "  [$($i+1)/$total] OK $($item.tipo) - $($item.func)" -ForegroundColor Green
    $ok++
  } catch {
    Write-Host "  [$($i+1)/$total] FALHA $($item.tipo) - $($item.func): $($_.Exception.Message)" -ForegroundColor Red
    $falha++
  }
}

Write-Progress -Activity "Baixando arquivos..." -Completed
Write-Host ""
Write-Host "╔══════════════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "║  CONCLUIDO: $ok baixados, $falha falhas          ║" -ForegroundColor Cyan
Write-Host "╚══════════════════════════════════════════════╝" -ForegroundColor Cyan
`;
    zip.file('baixar_arquivos.ps1', psScript);

    setProgresso('Gerando ZIP...');
    const blob = await zip.generateAsync({ type: 'blob' });
    const timestamp = new Date().toISOString().slice(0, 19).replace(/[T:]/g, '-');
    saveAs(blob, `exportacao_rhdtalia_${timestamp}.zip`);
    setProgresso('');
    setConcluido(true);
    addLog(`✅ ZIP criado: ${downloads.length} arquivos listados no manifesto.`);
    addLog('📥 Descompacte o ZIP e execute "baixar_arquivos.ps1" para baixar todas as mídias.');
    setExporting(false);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
          <Download className="w-6 h-6" />
          Exportar Dados
        </h1>
        <p className="text-muted-foreground mt-1">
          Gera um arquivo ZIP com todos os dados organizados por funcionário para reimportação manual.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">Funcionários</CardTitle></CardHeader>
          <CardContent><p className="text-2xl font-bold">{funcionarios.length}</p></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">Lançamentos</CardTitle></CardHeader>
          <CardContent><p className="text-2xl font-bold">{lancamentos.length}</p></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">Documentos</CardTitle></CardHeader>
          <CardContent><p className="text-2xl font-bold">{documentos.length}</p></CardContent>
        </Card>
      </div>

      <Card>
        <CardContent className="p-6 space-y-4">
          <div className="flex items-center gap-3">
            <input
              type="checkbox"
              id="apenas3"
              checked={apenas3}
              onChange={e => setApenas3(e.target.checked)}
              className="rounded border-gray-300"
            />
            <label htmlFor="apenas3" className="text-sm font-medium cursor-pointer">
              Exportar apenas 3 funcionários (teste)
            </label>
          </div>

          <Button onClick={handleExport} disabled={exporting || funcionarios.length === 0} size="lg">
            {exporting ? (
              <><Loader2 className="w-5 h-5 mr-2 animate-spin" />{progresso || 'Exportando...'}</>
            ) : (
              <><FolderTree className="w-5 h-5 mr-2" />{apenas3 ? 'Exportar 3 (teste)' : 'Exportar Todos'}</>
            )}
          </Button>

          {progresso && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="w-4 h-4 animate-spin" />
              {progresso}
            </div>
          )}

          {log.length > 0 && (
            <div className="bg-muted/50 rounded-lg p-4 max-h-64 overflow-y-auto text-xs font-mono space-y-1">
              {log.map((msg, i) => (
                <p key={i} className={msg.startsWith('✓') ? 'text-green-600' : msg.startsWith('❌') ? 'text-red-600' : ''}>
                  {msg}
                </p>
              ))}
            </div>
          )}

          {concluido && (
            <div className="flex items-center gap-2 text-green-700 bg-green-50 border border-green-200 rounded-lg px-4 py-3">
              <CheckCircle2 className="w-5 h-5 shrink-0" />
              <span className="text-sm font-medium">Exportação concluída. ZIP baixado.</span>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm flex items-center gap-2">
            <FolderTree className="w-4 h-4" />
            Estrutura do ZIP
          </CardTitle>
        </CardHeader>
        <CardContent>
          <pre className="text-xs text-muted-foreground bg-muted/30 rounded-lg p-4 overflow-x-auto">{`exportacao_rhdtalia_YYYY-MM-DD-HH-MM-SS.zip/
  funcionarios/
    Nome_do_Funcionario/
      dados.txt                # Cadastro completo
      lancamentos.txt          # Lançamentos + link download + caminho ZIP
      fechamentos.txt          # Fechamentos mensais
      documentos_info.txt      # Documentos + link download + caminho ZIP
      comprovantes/
        comprovante_abc123.jpg # Mídia dos lançamentos
      documentos/
        contrato.pdf           # Documentos enviados
    Outro_Funcionario/
      ...`}</pre>
        </CardContent>
      </Card>
    </div>
  );
}

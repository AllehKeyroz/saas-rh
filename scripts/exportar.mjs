import { initializeApp, cert } from 'firebase-admin';
import { getFirestore } from 'firebase-admin/firestore';
import { readFileSync, writeFileSync, mkdirSync, existsSync, createWriteStream, rmSync, unlinkSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import https from 'https';
import http from 'http';
import { execSync } from 'child_process';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const EXPORT_DIR = join(ROOT, 'exports');
const SA_PATH = join(ROOT, 'service-account.json');

// ─── Firebase Admin Init ──────────────────────────────────────
const sa = JSON.parse(readFileSync(SA_PATH, 'utf-8'));
initializeApp({ credential: cert(sa) });
const db = getFirestore();
db.settings({ databaseId: 'rhdtalia' });

// ─── Helpers ──────────────────────────────────────────────────
function sanitize(name) {
  return String(name || 'sem_nome')
    .replace(/[<>:"/\\|?*]/g, '_')
    .trim()
    .slice(0, 60);
}

function extFromUrl(url) {
  if (!url) return '.bin';
  try {
    const u = new URL(url);
    const decoded = decodeURIComponent(u.pathname);
    const parts = decoded.split('.');
    if (parts.length > 1) return '.' + parts.pop().split('?')[0].split('#')[0];
  } catch {}
  return '.bin';
}

function downloadFile(url, dest) {
  return new Promise((resolve) => {
    if (!url) return resolve(false);
    const file = createWriteStream(dest);
    const proto = url.startsWith('https') ? https : http;
    proto.get(url, { timeout: 30000 }, (res) => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        file.close();
        return downloadFile(res.headers.location, dest).then(resolve);
      }
      if (res.statusCode !== 200) {
        file.close();
        tryUnlink(dest);
        return resolve(false);
      }
      res.pipe(file);
      file.on('finish', () => { file.close(); resolve(true); });
      file.on('error', () => { file.close(); tryUnlink(dest); resolve(false); });
    }).on('error', () => { file.close(); tryUnlink(dest); resolve(false); });
  });
}

function tryUnlink(p) { if (existsSync(p)) try { unlinkSync(p); } catch {} }

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

async function readCollection(name) {
  const snap = await db.collection(name).get();
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}

// ─── Main ─────────────────────────────────────────────────────
async function main() {
  console.log('╔══════════════════════════════════════════╗');
  console.log('║     EXPORTAÇÃO RHDTALIA                 ║');
  console.log('╚══════════════════════════════════════════╝\n');

  // 1. Ler todas as coleções
  console.log('Lendo dados do Firestore...');
  const [funcionarios, lancamentos, fechamentos, documentos] = await Promise.all([
    readCollection('Funcionarios'),
    readCollection('FichaFinanceira'),
    readCollection('FechamentoMensal'),
    readCollection('DocumentoFuncionario'),
  ]);
  console.log(`  ${funcionarios.length} funcionários`);
  console.log(`  ${lancamentos.length} lançamentos`);
  console.log(`  ${fechamentos.length} fechamentos`);
  console.log(`  ${documentos.length} documentos\n`);

  // 2. Preparar pasta de exportação
  const timestamp = new Date().toISOString().slice(0, 19).replace(/[T:]/g, '-');
  const pastaExport = join(EXPORT_DIR, `exportacao_rhdtalia_${timestamp}`);
  const pastaFuncs = join(pastaExport, 'funcionarios');
  mkdirSync(pastaFuncs, { recursive: true });

  let totalOk = 0;
  let totalFalha = 0;

  for (let idx = 0; idx < funcionarios.length; idx++) {
    const func = funcionarios[idx];
    const nomePasta = sanitize(func.nome || func.id);
    const pastaFunc = join(pastaFuncs, nomePasta);
    mkdirSync(pastaFunc, { recursive: true });

    process.stdout.write(`[${idx + 1}/${funcionarios.length}] ${func.nome}...`);

    // dados.txt
    const funcDados = { ...func };
    delete funcDados.tenant_id;
    delete funcDados.created_date;
    delete funcDados.updated_date;
    writeFileSync(join(pastaFunc, 'dados.txt'), formatTXT(funcDados), 'utf-8');

    // lancamentos.txt
    const funcLanc = lancamentos.filter(l => l.funcionario_id === func.id);
    if (funcLanc.length > 0) {
      const pastaComprov = join(pastaFunc, 'comprovantes');
      mkdirSync(pastaComprov, { recursive: true });

      const lancList = [];
      for (const l of funcLanc) {
        const { tenant_id, created_date, updated_date, ...rest } = l;
        const item = { ...rest };
        if (l.comprovante) {
          const nomeArq = `comprovante_${sanitize(l.id)}${extFromUrl(l.comprovante)}`;
          const caminho = `comprovantes/${nomeArq}`;
          const ok = await downloadFile(l.comprovante, join(pastaFunc, caminho));
          if (ok) { totalOk++; } else { totalFalha++; }
          item.comprovante_url = l.comprovante;
          item.comprovante_arquivo = caminho;
          item.comprovante_baixado = ok ? 'sim' : 'falha';
        }
        lancList.push(item);
      }
      writeFileSync(join(pastaFunc, 'lancamentos.txt'), formatTXT({ total: funcLanc.length, lancamentos: lancList }), 'utf-8');
    } else {
      writeFileSync(join(pastaFunc, 'lancamentos.txt'), 'Nenhum lançamento registrado.\n', 'utf-8');
    }

    // fechamentos.txt
    const funcFech = fechamentos.filter(f => f.funcionario_id === func.id);
    if (funcFech.length > 0) {
      const fechList = funcFech.map(f => {
        const { tenant_id, created_date, updated_date, ...rest } = f;
        return rest;
      });
      writeFileSync(join(pastaFunc, 'fechamentos.txt'), formatTXT({ total: funcFech.length, fechamentos: fechList }), 'utf-8');
    }

    // documentos
    const funcDocs = documentos.filter(d => d.funcionario_id === func.id);
    if (funcDocs.length > 0) {
      const pastaDocs = join(pastaFunc, 'documentos');
      mkdirSync(pastaDocs, { recursive: true });

      const docsList = [];
      for (const d of funcDocs) {
        const { tenant_id, created_date, updated_date, ...rest } = d;
        const item = { ...rest, file_uri: d.file_uri || '(sem arquivo)' };
        if (d.file_uri) {
          const nomeArq = sanitize(d.nome_arquivo || `documento_${d.id}`) + extFromUrl(d.file_uri);
          const caminho = `documentos/${nomeArq}`;
          const ok = await downloadFile(d.file_uri, join(pastaFunc, caminho));
          if (ok) { totalOk++; } else { totalFalha++; }
          item.arquivo_url = d.file_uri;
          item.arquivo_arquivo = caminho;
          item.arquivo_baixado = ok ? 'sim' : 'falha';
        }
        docsList.push(item);
      }
      writeFileSync(join(pastaFunc, 'documentos_info.txt'), formatTXT({ total: funcDocs.length, documentos: docsList }), 'utf-8');
    }

    process.stdout.write(' OK\n');
  }

  // 3. Criar ZIP via script PowerShell
  console.log('\nCriando ZIP...');
  const zipPath = join(EXPORT_DIR, `exportacao_rhdtalia_${timestamp}.zip`);
  const psScriptPath = join(EXPORT_DIR, '_zipar.ps1');
  // Escreve script PS num arquivo (evita problemas de quoting no shell)
  writeFileSync(psScriptPath, `
Add-Type -AssemblyName System.IO.Compression.FileSystem
[System.IO.Compression.ZipFile]::CreateFromDirectory("${pastaExport.replace(/\\/g, '\\\\')}", "${zipPath.replace(/\\/g, '\\\\')}", [System.IO.Compression.CompressionLevel]::Optimal, $false)
`.trim(), 'utf-8');
  try {
    execSync(`powershell -NoProfile -ExecutionPolicy Bypass -File "${psScriptPath}"`, { timeout: 120000, stdio: 'ignore' });
  } catch {}
  // Limpa script temporário e pasta de exportação
  try { unlinkSync(psScriptPath); } catch {}
  rmSync(pastaExport, { recursive: true, force: true });

  const totalArquivos = totalOk + totalFalha;
  console.log(`\n╔══════════════════════════════════════════╗`);
  console.log(`║  EXPORTAÇÃO CONCLUÍDA!                  ║`);
  console.log(`║  Funcionários: ${funcionarios.length}                     ║`);
  console.log(`║  Mídias baixadas: ${totalOk}                     ║`);
  if (totalFalha > 0) console.log(`║  Mídias com falha: ${totalFalha}                    ║`);
  console.log(`╚══════════════════════════════════════════╝`);
  console.log(`\nZIP: ${zipPath}`);
}

main().catch(err => { console.error('\nERRO:', err); process.exit(1); });
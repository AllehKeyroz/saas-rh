import { initializeApp, cert } from 'firebase-admin';
import { getFirestore } from 'firebase-admin/firestore';
import { getStorage } from 'firebase-admin/storage';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import * as readline from 'readline';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const SA_PATH = join(ROOT, 'service-account.json');

const sa = JSON.parse(readFileSync(SA_PATH, 'utf-8'));
const app = initializeApp({ credential: cert(sa), storageBucket: 'rhdtalia.firebasestorage.app' });
const db = getFirestore(app);
db.settings({ databaseId: 'rhdtalia' });

const COLDELETAR = [
  'FichaFinanceira',
  'Consignado',
  'FechamentoMensal',
  'ComissaoPorFuncionario',
  'ComissoesGorjetas',
  'HistoricoAlteracaoComissao',
  'DocumentoFuncionario',
  'SolicitacoesFuncionario',
  'Ferias',
  'Advertencias',
  'MensagensRH',
  'GastosPessoais',
  'DividasPessoais',
  'AssinaturasPessoais',
  'MetasObjetivos',
  'MetaFinanceira',
  'LogAuditoria',
  'AuditoriaDocumentos',
  'BackupRegistro',
];

async function contarColecao(nome) {
  const snap = await db.collection(nome).count().get();
  return snap.data().count;
}

async function deletarColecao(nome) {
  const batchSize = 500;
  let total = 0;
  while (true) {
    const snap = await db.collection(nome).limit(batchSize).get();
    if (snap.empty) break;
    const batch = db.batch();
    snap.docs.forEach(d => batch.delete(d.ref));
    await batch.commit();
    total += snap.size;
    process.stdout.write(`\r  ${nome}: ${total} deletados...`);
  }
  process.stdout.write(`\r  ${nome}: ${total} deletados ✓\n`);
}

async function contarStorage(prefixo) {
  const bucket = getStorage().bucket();
  const [files] = await bucket.getFiles({ prefix: prefixo });
  return files.length;
}

async function deletarStorage(prefixo) {
  const bucket = getStorage().bucket();
  const [files] = await bucket.getFiles({ prefix: prefixo });
  if (files.length === 0) { console.log(`  Storage (${prefixo}): 0 arquivos`); return; }
  const nomes = files.map(f => f.name);
  await bucket.deleteFiles({ prefix: prefixo });
  console.log(`  Storage (${prefixo}): ${nomes.length} arquivos deletados ✓`);
}

async function main() {
  console.log('╔══════════════════════════════════════════╗');
  console.log('║     LIMPEZA DE DADOS - RHDTALIA          ║');
  console.log('╚══════════════════════════════════════════╝\n');

  // 1. Contar tudo
  console.log('Contando registros...');
  const resumo = [];
  for (const col of COLDELETAR) {
    const qtd = await contarColecao(col);
    resumo.push({ colecao: col, qtd });
    console.log(`  ${col}: ${qtd}`);
  }

  const bucket = getStorage().bucket();
  try {
    const [arqs] = await bucket.getFiles({ prefix: 'uploads/' });
    console.log(`  Storage (uploads/): ${arqs.length} arquivos`);
    resumo.push({ colecao: 'Storage (uploads/)', qtd: arqs.length });
  } catch (e) {
    console.log(`  Storage: erro ao contar (pode não existir): ${e.message}`);
  }

  const totalGeral = resumo.reduce((s, r) => s + r.qtd, 0);
  console.log(`\n  TOTAL: ${totalGeral} registros serão deletados`);
  console.log('  (Funcionarios, users, configs serão PRESERVADOS)\n');

  // 2. Confirmar
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  const resposta = await new Promise(resolve => {
    rl.question('Digite "LIMPAR" para confirmar: ', resolve);
  });
  rl.close();

  if (resposta.trim() !== 'LIMPAR') {
    console.log('\n❌ Operação cancelada.');
    process.exit(0);
  }

  // 3. Deletar Firestore
  console.log('\nDeletando Firestore...');
  for (const col of COLDELETAR) {
    await deletarColecao(col);
  }

  // 4. Deletar Storage
  console.log('\nDeletando arquivos do Storage...');
  try {
    await deletarStorage('uploads/');
  } catch (e) {
    console.log(`  Storage: ${e.message}`);
  }

  // 5. Resumo final
  console.log('\n╔══════════════════════════════════════════╗');
  console.log('║     LIMPEZA CONCLUÍDA!                  ║');
  console.log('╚══════════════════════════════════════════╝');
  console.log(`\n${totalGeral} registros deletados.`);
  console.log('Funcionários, usuários e configurações preservados.');
}

main().catch(err => { console.error('\nERRO:', err); process.exit(1); });
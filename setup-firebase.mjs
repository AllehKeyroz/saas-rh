import { GoogleAuth } from 'google-auth-library';
import { readFileSync } from 'fs';
import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

const serviceAccount = JSON.parse(readFileSync('service-account.json', 'utf-8'));
const projectId = serviceAccount.project_id;

async function getToken() {
  const auth = new GoogleAuth({
    credentials: serviceAccount,
    scopes: ['https://www.googleapis.com/auth/cloud-platform', 'https://www.googleapis.com/auth/firebase']
  });
  const client = await auth.getClient();
  const token = await client.getAccessToken();
  return token.token;
}

async function enableFirestoreAPI(token) {
  console.log('Ativando Firestore API...');
  try {
    const res = await fetch(
      `https://serviceusage.googleapis.com/v1/projects/${projectId}/services/firestore.googleapis.com:enable`,
      { method: 'POST', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }, body: '{}' }
    );
    const data = await res.json();
    if (res.ok) console.log(`API ativada: ${data.name}`);
    else if (data.error?.message?.includes('already')) console.log('API já estava ativa');
    else console.log(`API: ${data.error?.message || JSON.stringify(data)}`);
  } catch (e) { console.log(`API erro: ${e.message}`); }
}

async function createDatabase(token) {
  console.log('Criando Firestore database...');
  const body = { name: `projects/${projectId}/databases/(default)`, location_id: 'us-central1', type: 'FIRESTORE_NATIVE' };
  const res = await fetch(
    `https://firestore.googleapis.com/v1/projects/${projectId}/databases`,
    { method: 'POST', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }, body: JSON.stringify(body) }
  );
  const data = await res.json();
  if (res.ok) { console.log(`Database criada! Operação: ${data.name}`); return true; }
  else if (data.error?.message?.includes('already exists')) { console.log('Database já existe'); return true; }
  else { console.error(`Erro: ${data.error?.message || JSON.stringify(data)}`); return false; }
}

async function verifyWrite(token) {
  console.log('Testando escrita no Firestore...');
  const body = { fields: { status: { stringValue: 'ok' } } };
  const res = await fetch(
    `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/setup-test`,
    { method: 'POST', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }, body: JSON.stringify(body) }
  );
  const data = await res.json();
  if (res.ok) {
    console.log(`Escrita OK! Doc: ${data.name}`);
    await fetch(data.name, { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } });
    return true;
  } else { console.error(`Escrita falhou: ${data.error?.message || JSON.stringify(data)}`); return false; }
}

async function createAdminUser() {
  console.log('Criando usuário admin padrão...');
  if (getApps().length === 0) initializeApp({ credential: cert(serviceAccount) });
  const db = getFirestore();
  const ref = db.collection('users').doc('admin-default');
  await ref.set({
    full_name: 'Administrador',
    email: 'admin@rhdtalia.com',
    role: 'admin',
    ativo: true,
    created_date: new Date().toISOString(),
  });
  const check = await ref.get();
  console.log(`Admin criado: admin@rhdtalia.com | Existe: ${check.exists}`);
}

async function main() {
  console.log(`\n=== Setup Firebase: ${projectId} ===\n`);

  console.log('1. Token...');
  const token = await getToken();
  console.log('OK\n');

  console.log('2. API...');
  await enableFirestoreAPI(token);
  await new Promise(r => setTimeout(r, 3000));
  console.log('');

  console.log('3. Database...');
  const created = await createDatabase(token);
  if (!created) { console.log('\nCriação do database falhou. Tente criar manualmente.'); return; }
  await new Promise(r => setTimeout(r, 5000));
  console.log('');

  console.log('4. Verificação...');
  const verified = await verifyWrite(token);
  if (!verified) { console.log('\nVerificação falhou.'); return; }
  console.log('');

  console.log('5. Admin user...');
  try { await createAdminUser(); } catch (e) { console.log(`Admin: ${e.message}`); }
  console.log('');

  console.log('=== Setup concluído! ===');
  console.log('Rode "npm run dev" e faça login.');
}

main().catch(e => { console.error('Fatal:', e.message); process.exit(1); });

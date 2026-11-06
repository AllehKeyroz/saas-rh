/**
 * Seed de dados de exemplo para os emuladores do Firebase (localhost).
 *
 * Uso:
 *   1. .\iniciar_emulador.bat      (emuladores no ar)
 *   2. node seed-emulador.mjs
 *
 * Idempotente: usa IDs fixos e sobrescreve os documentos (PATCH).
 * Funciona apenas contra os emuladores — nunca aponte para produção.
 */

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const RAIZ = dirname(fileURLToPath(import.meta.url));
const PROJETO = 'rhdtalia';
const FS = `http://127.0.0.1:8080/v1/projects/${PROJETO}/databases/(default)/documents`;
const AUTH = 'http://127.0.0.1:9099/identitytoolkit.googleapis.com/v1';
const API_KEY = 'demo-key';

// ─── Helpers Firestore (REST com typed values) ──────────────────────────────

function tipoValor(v) {
  if (v === null || v === undefined) return { nullValue: null };
  if (typeof v === 'string') return { stringValue: v };
  if (typeof v === 'boolean') return { booleanValue: v };
  if (typeof v === 'number') {
    return Number.isInteger(v) ? { integerValue: String(v) } : { doubleValue: v };
  }
  if (Array.isArray(v)) return { arrayValue: { values: v.map(tipoValor) } };
  if (typeof v === 'object') return { mapValue: { fields: campos(v) } };
  throw new Error(`Tipo nao suportado: ${typeof v}`);
}

function campos(obj) {
  const out = {};
  for (const [k, v] of Object.entries(obj)) out[k] = tipoValor(v);
  return out;
}

async function setDoc(colecao, id, dados) {
  const url = `${FS}/${colecao}/${id}`;
  const res = await fetch(url, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', Authorization: 'Bearer owner' },
    body: JSON.stringify({ fields: campos(dados) }),
  });
  if (!res.ok) {
    throw new Error(`${colecao}/${id}: HTTP ${res.status} ${await res.text()}`);
  }
  return `${colecao}/${id}`;
}

// ─── Helpers Auth ───────────────────────────────────────────────────────────

async function garantirUsuario(email, senha) {
  const corpo = { email, password: senha, returnSecureToken: true };

  let res = await fetch(`${AUTH}/accounts:signUp?key=${API_KEY}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(corpo),
  });
  let json = await res.json();

  if (json.error?.message === 'EMAIL_EXISTS') {
    res = await fetch(`${AUTH}/accounts:signInWithPassword?key=${API_KEY}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(corpo),
    });
    json = await res.json();
  }

  if (!json.localId) {
    throw new Error(`Auth ${email}: ${JSON.stringify(json.error || json)}`);
  }
  return json.localId;
}

// ─── Features ligadas (lê as chaves direto do código) ───────────────────────

function chavesDeFeatures() {
  const src = readFileSync(join(RAIZ, 'src', 'lib', 'rhControl.js'), 'utf8');
  return [...src.matchAll(/chave:\s*'([^']+)'/g)].map(m => m[1]);
}

// ─── Dados ──────────────────────────────────────────────────────────────────

const HOJE = new Date();
const MES_ATUAL = `${String(HOJE.getMonth() + 1).padStart(2, '0')}/${HOJE.getFullYear()}`;
const data = (dia, mesOffset = 0) => {
  const d = new Date(HOJE.getFullYear(), HOJE.getMonth() - mesOffset, dia);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};
const mesRef = (mesOffset = 0) => {
  const d = new Date(HOJE.getFullYear(), HOJE.getMonth() - mesOffset, 1);
  return `${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
};

const TENANT = 'demo';

async function main() {
  // 1. Emuladores no ar?
  try {
    await fetch(`http://127.0.0.1:8080/`, { signal: AbortSignal.timeout(3000) });
  } catch {
    console.error('[ERRO] Firestore emulator nao respondeu em 127.0.0.1:8080.');
    console.error('       Rode .\\iniciar_emulador.bat antes do seed.');
    process.exit(1);
  }

  console.log('Criando usuarios no Auth emulator...');
  const uidAdmin = await garantirUsuario('admin@demo.com', 'demo1234');
  const uidFunc = await garantirUsuario('funcionario@demo.com', 'demo1234');

  console.log('Gravando documentos...');
  const criados = [];

  // 2. Tenant + usuários
  criados.push(await setDoc('tenants', TENANT, {
    nome: 'Restaurante Demo',
    ativo: true,
    created_date: new Date().toISOString(),
  }));

  criados.push(await setDoc('users', uidAdmin, {
    email: 'admin@demo.com',
    nome: 'Alleh Demo (RH)',
    role: 'admin',
    tenant_id: TENANT,
    ativo: true,
    created_date: new Date().toISOString(),
  }));

  criados.push(await setDoc('users', uidFunc, {
    email: 'funcionario@demo.com',
    nome: 'Maria Souza',
    role: 'funcionario',
    tenant_id: TENANT,
    ativo: true,
    created_date: new Date().toISOString(),
  }));

  // 3. Features ligadas (sem isso o portal esconde comissões, mensagens, etc.)
  const chaves = chavesDeFeatures();
  for (const chave of chaves) {
    criados.push(await setDoc('ConfiguracoesRH', chave, {
      chave,
      ativa: true,
      tenant_id: TENANT,
    }));
  }

  // 4. Setores de comissão — Cozinha fica SEM funcionário de propósito:
  //    ao publicar um lançamento ela vira crédito de setor.
  const setores = [
    { id: 'setor-salao', nome_do_setor: 'Salão', percentual: 50, palavras_chave: 'salão,salao,garçom,garcom,atendente' },
    { id: 'setor-cozinha', nome_do_setor: 'Cozinha', percentual: 30, palavras_chave: 'cozinha,chef,auxiliar' },
    { id: 'setor-entrega', nome_do_setor: 'Entrega', percentual: 20, palavras_chave: 'entrega,motoboy' },
  ];
  for (const [i, s] of setores.entries()) {
    criados.push(await setDoc('SetoresComissao', s.id, {
      nome_do_setor: s.nome_do_setor,
      percentual: s.percentual,
      ativo: true,
      ordem_exibicao: i,
      palavras_chave: s.palavras_chave,
      tenant_id: TENANT,
    }));
  }

  // 5. Funcionários (só Salão e Entrega têm gente)
  const funcionarios = [
    {
      id: 'func-maria', nome: 'Maria Souza', setor: 'Salão', funcao: 'Garçonete',
      email: 'maria@demo.com', salario_base: 2200, ajuda_custo: 200,
      data_admissao: data(10, 8), user_email_portal: 'funcionario@demo.com',
      permissoes_portal: {
        ver_funcao: true, ver_setor: true, ver_data_admissao: true, ver_salario: true,
        ver_limite_vales: true, ver_extrato_vales: true, ver_extrato_completo: true,
        // Seções liberadas para o portal (padrão do sistema = nada visível)
        secoes_visiveis: [
          'meus-dados', 'financeiro', 'meus-documentos', 'minhas-ferias',
          'vida-financeira', 'mensagens', 'solicitacoes', 'assinaturas',
        ],
      },
    },
    { id: 'func-joao', nome: 'João Lima', setor: 'Salão', funcao: 'Garçom', email: 'joao@demo.com', salario_base: 2000, ajuda_custo: 150, data_admissao: data(1, 6) },
    { id: 'func-carla', nome: 'Carla Dias', setor: 'Salão', funcao: 'Garçonete', email: 'carla@demo.com', salario_base: 2100, ajuda_custo: 150, data_admissao: data(15, 4) },
    { id: 'func-pedro', nome: 'Pedro Alves', setor: 'Entrega', funcao: 'Motoboy', email: 'pedro@demo.com', salario_base: 1900, ajuda_custo: 100, data_admissao: data(5, 2) },
  ];
  for (const f of funcionarios) {
    const { id, ...resto } = f;
    criados.push(await setDoc('Funcionarios', id, {
      ...resto,
      ativo: true,
      tenant_id: TENANT,
      created_date: new Date().toISOString(),
    }));
  }

  // 6. Crédito de setor disponível (aparece no lançamento como "opcional")
  criados.push(await setDoc('CreditoComissaoSetor', 'credito-salao-1', {
    setor_id: 'setor-salao',
    setor_nome: 'Salão',
    valor: 500,
    status: 'disponivel',
    origem_comissao_id: 'comissao-demo-anterior',
    origem_periodo_inicio: data(1, 1),
    origem_periodo_fim: data(28, 1),
    origem_mes_referencia: mesRef(1),
    tenant_id: TENANT,
    created_date: new Date().toISOString(),
  }));

  // 7. Lançamentos da Maria — 3 meses + 1 antigo (para provar o corte de 3 meses)
  const lancamentos = [
    { id: 'lanc-maria-atual-vale', tipo_lancamento: 'vale', valor: 400, data_lancamento: data(5), descricao: 'Vale quinzenal' },
    { id: 'lanc-maria-atual-adic', tipo_lancamento: 'adicional', valor: 150, data_lancamento: data(6), descricao: 'Adicional noturno' },
    { id: 'lanc-maria-m1', tipo_lancamento: 'vale', valor: 300, data_lancamento: data(10, 1), descricao: 'Vale' },
    { id: 'lanc-maria-m2', tipo_lancamento: 'vale', valor: 250, data_lancamento: data(12, 2), descricao: 'Vale' },
    { id: 'lanc-maria-antigo', tipo_lancamento: 'vale', valor: 999, data_lancamento: data(20, 6), descricao: 'Vale ANTIGO — deve ficar fora do histórico' },
  ];
  for (const l of lancamentos) {
    const { id, ...resto } = l;
    criados.push(await setDoc('FichaFinanceira', id, {
      ...resto,
      funcionario_id: 'func-maria',
      tenant_id: TENANT,
      created_date: new Date().toISOString(),
    }));
  }

  // 8. Comissões publicadas da Maria (abas Comissões/Salário do portal)
  const comissoes = [
    { id: 'com-func-maria-m0', mes: mesRef(0), valor: 320 },
    { id: 'com-func-maria-m1', mes: mesRef(1), valor: 280 },
    { id: 'com-func-maria-m2', mes: mesRef(2), valor: 210 },
  ];
  for (const c of comissoes) {
    criados.push(await setDoc('ComissaoPorFuncionario', c.id, {
      funcionario_id: 'func-maria',
      comissao_id: 'comissao-demo-publicada',
      setor_id: 'setor-salao',
      setor_nome: 'Salão',
      mes_referencia: c.mes,
      periodo_inicio: data(1, 1),
      periodo_fim: data(28, 1),
      apto: true,
      valor_individual_final: c.valor,
      valor_individual: c.valor,
      tenant_id: TENANT,
      created_date: new Date().toISOString(),
    }));
  }

  const isoLocal = (a, m, d) => `${a}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;

  // 9. Escala de folga — mês anterior, atual e próximo, por funcionário.
  //    Padrão: 1 dia fixo na semana + domingos alternados (par/ímpar por pessoa).
  const DIAS_FOLGA_SEMANA = [1, 2, 3, 4]; // seg, ter, qua, qui
  const CORES_ESCALA = ['bg-rose-500', 'bg-sky-500', 'bg-emerald-500', 'bg-amber-500'];
  const MESES_ESCALA = [
    { offset: 1, status: 'consolidada' },  // mês anterior
    { offset: 0, status: 'consolidada' },  // mês atual
    { offset: -1, status: 'rascunho' },    // mês seguinte
  ];

  for (const [idx, f] of funcionarios.entries()) {
    const diaFixo = DIAS_FOLGA_SEMANA[idx % DIAS_FOLGA_SEMANA.length];

    for (const { offset, status } of MESES_ESCALA) {
      const ref = new Date(HOJE.getFullYear(), HOJE.getMonth() - offset, 1);
      const anoRef = ref.getFullYear();
      const mesNum = ref.getMonth();
      const diasNoMesRef = new Date(anoRef, mesNum + 1, 0).getDate();

      const dias = [];
      let domingoIdx = 0;
      for (let dia = 1; dia <= diasNoMesRef; dia++) {
        const dow = new Date(anoRef, mesNum, dia).getDay();
        if (dow === diaFixo) dias.push(isoLocal(anoRef, mesNum, dia));
        if (dow === 0) {
          if ((domingoIdx + idx) % 2 === 0) dias.push(isoLocal(anoRef, mesNum, dia));
          domingoIdx++;
        }
      }

      criados.push(await setDoc(
        'EscalaFolga',
        `escala-${f.id}-${anoRef}-${String(mesNum + 1).padStart(2, '0')}`,
        {
          funcionario_id: f.id,
          tipo: 'personalizada',
          dias_folga: dias.sort(),
          data_ancora: isoLocal(anoRef, mesNum, 1),
          data_fim: isoLocal(anoRef, mesNum, diasNoMesRef),
          cor: CORES_ESCALA[idx % CORES_ESCALA.length],
          ativo: true,
          status,
          tenant_id: TENANT,
          created_date: new Date().toISOString(),
        },
      ));
    }
  }

  console.log(`\nOK — ${criados.length + 2} documentos gravados.\n`);  console.log('========================================');
  console.log('  ACESSOS (senha demo1234)');
  console.log('========================================');
  console.log('  RH / admin : admin@demo.com');
  console.log('  Portal     : funcionario@demo.com  (Maria Souza)');
  console.log('');
  console.log(`  Mes de referencia atual: ${MES_ATUAL}`);
  console.log('  Setor "Cozinha" esta sem funcionario de proposito:');
  console.log('  ao publicar uma comissao ele vira credito de setor.');
  console.log('  Ja existe 1 credito de R$ 500 do Salao para testar a');
  console.log('  inclusao opcional na tela de lancamento.');
  console.log('');
  console.log('  Escala de folga: 3 meses por funcionario (anterior, atual');
  console.log('  e proximo). Mes anterior/atual consolidados, proximo em');
  console.log('  rascunho. Veja em Escala de Folga > Calendario.');
  console.log('========================================');
}

main().catch(err => {
  console.error('\n[FALHA]', err.message);
  process.exit(1);
});

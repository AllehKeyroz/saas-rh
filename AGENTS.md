# RHDTalia — Agent Guide

## Quick start

```sh
npm install
npm run dev          # localhost:5173 — prints nothing (see gotcha below)
npm run build        # dist/
npm run lint         # eslint . --quiet → only ERRORs, scoped to components + pages
npm run lint:fix
npm run typecheck    # tsc on jsconfig.json — effectively only src/pages/**/*.jsx
npm run preview      # serve dist/
```

- **No test suite** and no CI — `lint` + `build` are the only automated gates.
- **`vite.config.js` sets `logLevel: 'error'`**, so `npm run dev` prints no URL/banner and swallows warnings. Verify the server with `Invoke-WebRequest http://localhost:5173` instead of trusting the console.

## Setup: `.env` is not in the repo

`.env` is gitignored and absent from a fresh clone. The app builds fine without it but Firebase initializes with `undefined` and every request fails. Required keys: `VITE_FIREBASE_API_KEY`, `VITE_FIREBASE_AUTH_DOMAIN`, `VITE_FIREBASE_PROJECT_ID`, `VITE_FIREBASE_STORAGE_BUCKET`, `VITE_FIREBASE_MESSAGING_SENDER_ID`, `VITE_FIREBASE_APP_ID`, `VITE_LOGIN_URL` (`/login`); `VITE_FIREBASE_MEASUREMENT_ID` is optional. Ask the user for the values — never invent them or commit them.

**Emulator vs prod data is decided by hostname** (`src/firebase/config.js`): only `localhost`/`127.0.0.1` auto-connect to the emulators (they must be running, otherwise every call hangs/fails). To point the local UI at prod data, serve on a non-localhost host (`npm run preview -- --host`) and open the LAN IP.

## Architecture

**SPA** — React 18 + Vite 6, no SSR. Entry: `src/main.jsx` → `src/App.jsx`.

**Multi-tenant** by `tenant_id`. The proxy in `src/api/client.js` auto-injects `tenant_id` on list/filter/create/createWithId/bulkCreate. `SKIP_TENANT` collections (global): `users`, `convites`, `tenants`, `ApplicationError`, `LogNotificacao`.

**Silent-empty trap:** for tenant-scoped entities, `list()`/`filter()` return `[]` (not an error) when the user has no `tenant_id` in context, and writes throw `'Usuário sem tenant vinculado'`. "No data" usually means a missing tenant link, not an empty collection.

Personal finance collections (`GastosPessoais`, `DividasPessoais`, `AssinaturasPessoais`, `MetasObjetivos`, `MetaFinanceira`) are keyed by `funcionario_id`, not `tenant_id`, and their Firestore rules allow `read, write` for **any authenticated user** (`match /GastosPessoais` … `/MetaFinanceira` in `firestore.rules`) — ownership is enforced only client-side. `SolicitacoesFuncionario` create is likewise open to any authenticated user.

**Firebase**: Auth + Firestore + Storage. Prod uses the **named database `rhdtalia`**, localhost uses `(default)`. The emulator cannot serve named databases — that's why the switch exists; don't "simplify" it. Cloud Functions (`sendEmail`, `calcularLimiteValeMensal`) are **not deployed**: `invokeFunction` in `src/api/client.js` posts to `us-central1-<projectId>.cloudfunctions.net/<name>` and returns `null` on any failure.

**`__APP_VERSION__`** is injected by Vite from `package.json` at build time (footer, auditoria, audit logs). Bump `package.json` before building if the release needs a new number.

**PWA** (`vite-plugin-pwa`): build emits `manifest.webmanifest` + `sw.js` (NetworkOnly, no precache — the app is online-only). The "Instalar" button (`src/components/pwa/InstallAppButton.jsx`) only appears on deployed HTTPS; the service worker is disabled in `npm run dev`.

## Data access

```js
import { client } from '@/api/client'
// list, get, create, createWithId, update, delete, filter, bulkCreate, subscribe
const data = await client.entities.Funcionarios.list()
const item = await client.entities.Funcionarios.get(id)
await client.entities.FichaFinanceira.create({ valor: 1000, ... })
```

41 collections are auto-registered in `src/firebase/db.js` via `ENTITY_NAMES`. `getEntity()` auto-registers **any** unknown name on first touch, so `client.entities.FuncionariosX` never throws "unknown entity" — it silently becomes a real collection path with no rule (empty in the emulator, denied in prod). Grep `ENTITY_NAMES` before debugging "missing data".

**Adding a collection takes two edits**: `ENTITY_NAMES` in `src/firebase/db.js` **and** a `match /Colecao/{docId}` block in `firestore.rules`. Rules are not inferred; a missing rule works in the emulator (open rules) but denies with "permissões insuficientes" in prod. Edit `firestore.rules` — `firestore.rules.bak` is a stale backup, never the deployed file.

`filter()` in `db.js` catches Firestore failures (e.g. missing composite index) and retries without `orderBy`, sorting client-side — so new `where`+`orderBy` combos silently work but don't scale. Add indexes to `firestore.indexes.json` and deploy them.

## Feature toggles

Flags live in the `ConfiguracoesRH` collection; read via `useRHControl()` from `@/lib/rhControl`:

```js
const { isAtiva } = useRHControl()
if (isAtiva('vida_financeira')) { /* render */ }
```

Keys/`RH_FEATURES` groups: `comissoes`, `vida_financeira`, `comunicacao`, `solicitacoes`. Dependencies are enforced client-side only.

## Routing & roles

Role comes from `user.role` in the Firestore `users` doc, resolved in `src/lib/useUserRole.js`:

| role | behavior | flags |
|------|----------|-------|
| `admin` | `<AppLayoutRH>` + all pages | `isRH()`, `isAdmin()`, `canEdit`, `canReprocess` |
| `user` | `<AppLayoutRH>` + all pages | `isRH()`, `canEdit` (no reprocess) |
| `funcionario` | `<PortalFuncionario>` only | `isFuncionario` |
| `consulta` | `PageNotFound` everywhere | `isConsulta` |
| `inativo` | **bug**: falls through to the RH layout (writes are rejected by Firestore) | no check |

RH routes are the `/` block in `src/App.jsx`; `/login`, `/register` are outside auth. Portal sections are defined once in `src/lib/portalSecoes.js` — the sidebar, the RH mirror (`EspelhoPortal`), the `?tab=` routing and the per-employee permission dialog all read from that list. Salário/Vales/Comissões/Extrato/Metas are **one** section (`financeiro`, sub-abas); legacy links (`?tab=meu-salario`, `meus-vales`, `extrato`, `comissoes`, `metas`) are resolved by `resolverAba()`. The RH hides a section by adding its id to `permissoes_portal.secoes_ocultas` (hide, never delete); default is visible.

## Conventions

- **`@/`** → `./src/` (Vite alias + jsconfig `paths`)
- **CSS**: Tailwind + CSS vars (`hsl(var(--...))`), dark mode via `.dark`
- **`cn()`** from `@/lib/utils` for className merging — don't concatenate strings
- **UI**: shadcn/ui (New York, no TS) in `src/components/ui/` — generated, do not hand-edit
- **State**: TanStack React Query; `queryClientInstance` from `@/lib/query-client` (`refetchOnWindowFocus: false`, `retry: 1`); invalidate with `queryClientInstance.invalidateQueries({ queryKey: [...] })`
- **Routing/auth**: React Router v6 + `src/lib/AuthContext.jsx`
- **Forms**: `react-hook-form` + `zod`
- **Toasts**: `react-hot-toast` **and** `sonner` are both mounted in `App.jsx`
- **Exports**: jsPDF + jspdf-autotable, SheetJS (`xlsx`), JSZip
- UI text, labels and comments are **pt-BR** — match the surrounding language

## Key constants (`src/lib/`)

`formatters.js`: `TIPO_LABELS` / `TIPO_COLORS` (labels + badge colors per `tipo_lancamento`), `LIMITE_PERCENTUAL = 40` (max % of salary+commission for vales/adiantamentos), `TIPOS_DESCONTO_DEFAULT`, `TIPOS_ADICIONAL_DEFAULT`, plus PT-BR date/currency helpers.

`vidaFinanceira.js`: `CATEGORIAS_PADRAO` (default `GastosPessoais` categories), `TIPO_COLORS` (hex for charts, variants for badges).

## Domain logic worth knowing

- **Escala de folga** (`src/lib/escalaFolga.js`): `status` is `rascunho` or `consolidada` (`ESCALA_STATUS`); records **without** `status` count as `rascunho`. A `consolidada` record must **never** be overwritten or deleted — guards live in `salvarEscalaFuncionario` and `handleLimpar` (`src/components/escala-folga/ConfigurarEscalaDialog.jsx`). Consolidate/reopen only writes `status` (+ `consolidado_em`/`reaberto_em`). The page has **two views**: the original employee × days table (`src/pages/EscalaFolga.jsx`) and a read-only month calendar (`src/components/escala-folga/CalendarioFolga.jsx`) — editing exists only in the table view, so new features that need "who is off on day X" should read from `folgasPorDia`-style maps (`getEscalaEfetiva` + `ehDiaFolga`), not reimplement the cycle math.
- **Férias — faltas (art. 130 CLT)**: `faltas_por_periodo` (`{ periodoAquisitivo: dias }`) on the `Funcionarios` doc reduces entitlement (`diasFeriasPorFaltas()`: ≤5→30, 6–14→24, 15–23→18, 24–32→12, 33+→0). `calcularSaldoFerias(func, ferias)` reads it automatically; `calcularSituacaoFerias(admissao, ferias, faltasPorPeriodo)` takes it as 3rd arg.
- **Férias — rules live only in `src/lib/ferias.js`**: `validarFracionamento` (14/5), `getSobreposicaoFuncionario` (blocks), `getFeriasEmendadas` (1-day gap warning), `verificarRegra48h` (`src/lib/feriados.js`, holiday) and `verificarRegra48hFolga` (`escalaFolga.js`, folga/DSR). Don't reimplement these checks in components.
- **Comissões — pendente → publicar**: a lançamento starts `status: 'pendente'` with the full calculation in `rascunho` (per-employee rows **without** `comissao_id`). While pending there are **no** `ComissaoPorFuncionario` rows, so nothing leaks into fechamento/dashboard/portal. `publicarComissao()` (`src/lib/comissoes.js`) creates the rows and flips to `confirmado`. Deleting `ComissoesGorjetas` is admin-only.
- **Comissões — crédito de setor**: a sector with no eligible employees does **not** redistribute its value (race-condition guard); it becomes a `CreditoComissaoSetor` doc (`status: 'disponivel'`) applied manually to a later lançamento and marked `usado` on publish.

## Lint / typecheck scope

**ESLint** (`eslint.config.js`) only matches `src/components/**` and `src/pages/**` (plus a non-existent `src/Layout.jsx`) and ignores `src/lib/**` and `src/components/ui/**`. `--quiet` hides warnings, so a clean `npm run lint` is weak evidence: **`src/lib` and `src/api` are never linted**. Rules that do bite: `unused-imports/no-unused-imports` (error), `react-hooks/rules-of-hooks` (error), `react/no-unknown-property` (`cmdk-input-wrapper`, `toast-close` whitelisted).

**Typecheck** (`jsconfig.json`): `include` = `src/components/**/*.js` + `src/pages/**/*.jsx` + `src/Layout.jsx`, and `src/components` holds **only `.jsx`** — so `npm run typecheck` effectively checks just `src/pages/**/*.jsx`. Components are not typechecked at all.

**Pre-existing noise, not your bug:** the LSP floods with `Property 'Funcionarios' does not exist on type '{}'` (untyped `client.entities` proxy) and `Property 'children' does not exist` (shadcn). Don't chase them. Verify your own work with `npm run lint` + `npm run build`.

## Emulators

```sh
.\iniciar_emulador.bat   # emuladores (janela separada) + `npm run dev` na mesma execução
.\emuladores.ps1         # só os emuladores; persistente por padrão, -Seed para começar limpo
```

Ambos detectam o JDK 21 em `C:\Program Files\Eclipse Adoptium\jdk-21*` (a pasta tem a versão no nome — não fixe o caminho) e falham com instrução de instalação se não houver Java. Ports: auth 9099, firestore 8080, storage 9199, hosting 5000, UI 4000. Dados/sessões persistem em `C:\rhdtalia-emulator-data` via `--import` + `--export-on-exit` — **o export só acontece em saída graciosa (Ctrl+C)** na janela dos emuladores; fechar a janela no X perde a sessão.

`iniciar_emulador.bat` sobe só `auth,firestore,storage` (poupa o emulador de hosting, que exigiria `dist/`), espera a porta 9099 responder antes de subir o app, e reaproveita emuladores/app já em execução em vez de duplicar.

`node seed-emulador.mjs` popula o emulador com dados de teste idempotentes: tenant `demo`, `admin@demo.com` (admin) e `funcionario@demo.com` (portal), senha `demo1234`, 3 setores (Cozinha **sem** funcionários de propósito, para gerar crédito de setor), 4 funcionários, 1 `CreditoComissaoSetor` disponível e lançamentos/comissões da Maria (inclui um lançamento antigo para provar o corte de histórico em 3 meses).

## Deploy

`firebase-tools` is not in `package.json`, so the CLI must be on PATH (or use `npx firebase-tools …`).

```sh
firebase deploy --only hosting          # SPA on rhdtalia.web.app — does NOT publish rules
firebase deploy --only firestore:rules  # publishes firestore.rules
firebase deploy --only firestore:indexes
firebase deploy --only storage          # NOT --only storage:rules
```

`--only hosting` leaves `firestore.rules`/`storage.rules` untouched, so a new collection fails in prod with "permissões insuficientes" even though the emulator works. `--only storage:rules` fails ("Could not find rules for the following storage targets: rules") because `firebase.json` uses the simple `"storage": { "rules": "storage.rules" }` form.

`Dockerfile`: `npm ci` + `vite build`, then serves `dist` via `vite preview --port 80` (Cloud Run / EasyPanel). `apphosting.yaml` covers Firebase App Hosting.

## Known issues

- `inativo` role has no frontend gating: sees the admin UI and edit buttons, Firestore rejects the writes
- Cloud Functions not deployed: `sendEmail` / `calcularLimiteValeMensal` silently return `null`
- `match /Funcionarios` update rule also allows any authenticated user to update the doc whose `email` equals their token email — self-service write with no tenant/role check
- No tests, no CI, no `.github/`

## Reference docs

`MATRIZ_ACESSO.md` (access matrix), `FUNCOES_DO_APP.md` / `FUNCOES_PENDENTES.md` (feature inventory), `UX_ANALISE.md`, `docs/checklist-implementacao.md` (prioritized backlog), `docs/ajustes-entregues.md` (client-facing delivery log), `docs/auditoria-rh.md`, `docs/auditoria-portal.md`, `docs/reuniao-2026-10-06.md`, `arquitetura-rhdtalia.mmd`.

# RHDTalia — Agent Guide

## Quick start

```sh
npm install
npm run dev          # localhost:5173
npm run build        # dist/
npm run lint         # eslint . --quiet (scoped: src/components/ src/pages/ src/Layout.jsx)
npm run lint:fix     # auto-fix
npm run typecheck    # tsc on jsconfig.json (checkJs, limited include)
npm run preview      # serve dist/
```

No test suite.

## Reference docs

Project notes an agent should read for context: `MATRIZ_ACESSO.md` (access matrix), `FUNCOES_DO_APP.md` / `FUNCOES_PENDENTES.md` (feature inventory), `UX_ANALISE.md`, `docs/auditoria-rh.md`, `docs/auditoria-portal.md`. Delivery log (client-facing): `docs/ajustes-entregues.md`. Backlog by priority: `docs/checklist-implementacao.md`. Architecture diagram: `arquitetura-rhdtalia.mmd`.

## Architecture

**SPA** — React 18 + Vite 6, no SSR. Entry: `src/main.jsx` → `src/App.jsx`.

**Multi-tenant** by `tenant_id`. Proxy in `src/api/client.js` (`import { client } from '@/api/client'`) auto-injects `tenant_id` on list/filter/create/bulkCreate. Collections that skip tenant scoping: `users`, `convites`, `tenants`, `ApplicationError`, `LogNotificacao`.

Personal finance collections (`GastosPessoais`, `DividasPessoais`, `AssinaturasPessoais`, `MetasObjetivos`, `MetaFinanceira`) are keyed/filtered by `funcionario_id` (not `tenant_id`). Firestore rules allow `read, write` for **any authenticated user** with no tenant/ownership check (`firestore.rules:91-95`) — the `funcionario_id` filter is enforced only client-side. `SolicitacoesFuncionario` create is also open to any authenticated user.

**Firebase**: Auth + Firestore + Storage. Named database `rhdtalia` in prod, `(default)` on localhost (auto-detect in `src/firebase/config.js:21`). Emulators auto-connect on localhost. Cloud Functions (`sendEmail`, `calcularLimiteValeMensal`) are **not deployed** — calls hit `us-central1-<projectId>.cloudfunctions.net/<name>` and silently fail.

**`__APP_VERSION__`** global injected by Vite from `package.json` version — used in footer, auditoria, and audit logging. Bump version in `package.json` → `npm run build` → deploy (the number is baked at build time).

**PWA** (`vite-plugin-pwa`): build generates `manifest.webmanifest` + `sw.js` (NetworkOnly) and the registration script. Icons live in `public/`. The "Instalar" button (`src/components/pwa/InstallAppButton.jsx`) only shows on deployed HTTPS — the service worker is **disabled in `npm run dev`**, so it won't appear locally.

## Data access

```js
import { client } from '@/api/client'
// methods: list, get, create, update, delete, filter, bulkCreate, subscribe
const data = await client.entities.Funcionarios.list()
const item = await client.entities.Funcionarios.get(id)
client.entities.FichaFinanceira.create({ valor: 1000, ... })
```

40 collections auto-registered in `src/firebase/db.js` via `ENTITY_NAMES`. Custom `tipo_lancamento` categories from `client.entities.TipoLancamento.list()`.

**Adding a new collection requires two edits**: add to `ENTITY_NAMES` in `src/firebase/db.js` **and** a `match /Colecao/{docId}` line in `firestore.rules`. Without the rule, Firestore denies by default in prod ("permissões insuficientes") — the rule is not inferred from the entity.

`filter()` (`db.js`) falls back to client-side sort when Firestore rejects a query (e.g. missing composite index), so a new `where`+`orderBy` combo silently works but is unscalable — add indexes to `firestore.indexes.json` and deploy via `firebase deploy --only firestore:indexes`.

## Feature toggles

Feature flags in `ConfiguracoesRH` Firestore collection. Use `useRHControl()` from `@/lib/rhControl`:

```js
const { isAtiva } = useRHControl()
if (isAtiva('vida_financeira')) { /* render */ }
```

All feature keys defined in `RH_FEATURES` array. Groups: `comissoes`, `vida_financeira`, `comunicacao`, `solicitacoes`. Dependencies enforced client-side.

## Routing & roles

Role comes from `user.role` in Firestore `users` doc. Checked in `src/lib/useUserRole.js`:

| role | behavior | checks |
|------|----------|--------|
| `admin` | `<AppLayoutRH>` + all pages | `isRH()`, `isAdmin()`, `canEdit`, `canReprocess` |
| `user` | `<AppLayoutRH>` + all pages | `isRH()`, `canEdit` (no reprocess) |
| `funcionario` | `<PortalFuncionario>` only | `isFuncionario` |
| `consulta` | 404 always | `isConsulta` |
| `inativo` | **bug**: falls through as admin/user (same UI, but Firestore rejects writes) | no client-side check |

All RH routes in `src/App.jsx:76-99`. PortalFuncionario tabs controlled by `useRHControl()` + `useFinancialDataLogger`.

## Project conventions

- **`@/`** → `./src/` (Vite alias + jsconfig.json)
- **CSS**: Tailwind + CSS vars (`hsl(var(--...))`), dark mode via `.dark` class
- **`cn()`** from `@/lib/utils` — always use for className merging
- **UI**: shadcn/ui (New York, no TS) in `src/components/ui/`. **Do not edit these manually** — they are generated.
- **State**: TanStack React Query (`queryClientInstance` from `@/lib/query-client`, `refetchOnWindowFocus: false`, `retry: 1`). Invalidate via `queryClientInstance.invalidateQueries({ queryKey: [...] })`
- **Routing**: React Router v6, `src/lib/AuthContext.jsx` for auth state
- **Forms**: `react-hook-form` + `zod`
- **Notifications**: `react-hot-toast` + `sonner` (both mounted in App.jsx)
- **PDF/XLSX/ZIP**: jsPDF + jspdf-autotable, SheetJS, JSZip

## Key constants

`src/lib/formatters.js`:
- `TIPO_LABELS` / `TIPO_COLORS` — display labels and badge colors for all `tipo_lancamento` values
- `LIMITE_PERCENTUAL = 40` — max % of salary+commission for vales/adiantamentos
- `TIPOS_DESCONTO_DEFAULT`, `TIPOS_ADICIONAL_DEFAULT` — default lançamento type lists

`src/lib/vidaFinanceira.js`:
- `CATEGORIAS_PADRAO` — default categories for GastosPessoais
- `TIPO_COLORS` — hex colors (chart) and badge style variants

`src/lib/formatters.js` also exports date/currency helpers (PT-BR locale).

## Domain logic worth knowing

- **Escala de folga** (`src/lib/escalaFolga.js`): each record has a `status` — `rascunho` or `consolidada` (`ESCALA_STATUS`). Records **without** `status` are treated as `rascunho` (backward compatible). A `consolidada` record must **never** be overwritten/deleted — guards live in `salvarEscalaFuncionario` and `handleLimpar` in `src/components/escala-folga/ConfigurarEscalaDialog.jsx`. Consolidate/reopen only write the `status` field (+ `consolidado_em`/`reaberto_em`).
- **Férias — faltas (art. 130 CLT)**: stored as `faltas_por_periodo` (a `{ periodoAquisitivo: dias }` map) on the `Funcionarios` doc. `diasFeriasPorFaltas()` reduces entitlement (≤5→30, 6–14→24, 15–23→18, 24–32→12, 33+→0). `calcularSaldoFerias(func, ferias)` reads it automatically; `calcularSituacaoFerias(admissao, ferias, faltasPorPeriodo)` takes it as a 3rd param.
- **Férias — regras centralizadas em `src/lib/ferias.js`** (fonte única): `validarFracionamento` (14/5), `getSobreposicaoFuncionario` (bloqueia), `getFeriasEmendadas` (aviso de 1 dia entre períodos), `verificarRegra48h` (feriado) e `verificarRegra48hFolga` (folga/DSR, em `escalaFolga.js`).

## Env vars (all `VITE_` prefix)

Required: `VITE_FIREBASE_API_KEY`, `VITE_FIREBASE_AUTH_DOMAIN`, `VITE_FIREBASE_PROJECT_ID`, `VITE_FIREBASE_STORAGE_BUCKET`, `VITE_FIREBASE_MESSAGING_SENDER_ID`, `VITE_FIREBASE_APP_ID`, `VITE_LOGIN_URL` (default `/login`).

`setup-firebase.mjs` bootstraps a new Firebase project (needs `service-account.json` — gitignored).

## Lint / Typecheck scope

**ESLint** (`eslint.config.js`): targets `src/components/**/*.{js,jsx}`, `src/pages/**/*.{js,jsx}`, `src/Layout.jsx`. Ignores `src/lib/**` and `src/components/ui/**`. Rules: `prop-types: off`, `react-in-jsx-scope: off`, `unused-imports/no-unused-imports: error`. Custom `no-unknown-property` ignore: `cmdk-input-wrapper`, `toast-close`.

**Typecheck** (`jsconfig.json`): `checkJs: true`, includes same paths as lint + `"src/components/**/*.js"`. Excludes `node_modules`, `dist`, `src/vite-plugins`, `src/components/ui`, `src/api`, `src/lib`.

**Expect pre-existing errors.** The editor/LSP floods with errors from the untyped `client.entities` proxy (`Property 'Funcionarios' does not exist on type '{}'`) and from shadcn components (`Property 'children' does not exist...`). These are **not** caused by your edit — don't try to fix them. After changing files, run `npm run lint` and confirm **only your touched files** are clean (lint is `--quiet`, so it prints only errors).

## Emulators

```sh
.\iniciar_emulador.bat    # imports from C:\rhdtalia-emulator-data, exports on exit
.\emuladores.ps1           # -Seed flag for fresh data, persistent mode by default
```

Both set `JAVA_HOME` to `C:\Program Files\Eclipse Adoptium\jdk-21.0.11.10-hotspot`. Ports: auth=9099, firestore=8080, storage=9199, hosting=5000, ui=4000. Named database `rhdtalia` is **not supported in emulator** — localhost auto-detects `(default)`.

## Deploy

```sh
firebase deploy --only hosting          # SPA on rhdtalia.web.app (does NOT touch rules)
firebase deploy --only firestore:rules  # publishes firestore.rules
firebase deploy --only storage          # publishes storage.rules (NOT --only storage:rules)
```

`--only hosting` does **not** publish `firestore.rules`/`storage.rules` — a new collection/permission needs the rules deployed separately, otherwise prod denies with "permissões insuficientes" even though it works in the emulator. `--only storage:rules` fails ("Could not find rules for the following storage targets: rules") because `firebase.json` uses the simple `"storage": { "rules": "storage.rules" }` form — use `--only storage`.

Dockerfile builds with `npm ci` + `vite build`, serves via `vite preview --port 80` (Cloud Run / EasyPanel). `apphosting.yaml` for Firebase App Hosting.

No CI/CD pipeline configured (no `.github/` directory).

## Known issues

- `inativo` role: no frontend gating — sees admin UI, edit buttons visible (Firestore rejects writes server-side)
- Cloud Functions not deployed — `sendEmail` and `calcularLimiteValeMensal` fetch calls silently return `null`
- `Funcionarios` update rule (`firestore.rules:55`) lets any authenticated user update a doc whose `email` matches their auth token — self-service write with no tenant/role check
- No test suite

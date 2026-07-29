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

## Architecture

**SPA** — React 18 + Vite 6, no SSR. Entry: `src/main.jsx` → `src/App.jsx`.

**Multi-tenant** by `tenant_id`. Proxy in `src/api/client.js` (`import { client } from '@/api/client'`) auto-injects `tenant_id` on list/filter/create/bulkCreate. Collections that skip tenant scoping: `users`, `convites`, `tenants`, `ApplicationError`, `LogNotificacao`.

Personal finance collections (`GastosPessoais`, `DividasPessoais`, `AssinaturasPessoais`, `MetasObjetivos`, `MetaFinanceira`) are **user-scoped** (not tenant-scoped) — any authenticated user can read/write their own data. `SolicitacoesFuncionario` create is allowed for any authenticated user.

**Firebase**: Auth + Firestore + Storage. Named database `rhdtalia` in prod, `(default)` on localhost (auto-detect in `src/firebase/config.js:21`). Emulators auto-connect on localhost. Cloud Functions (`sendEmail`, `calcularLimiteValeMensal`) are **not deployed** — calls hit `us-central1-<projectId>.cloudfunctions.net/<name>` and silently fail.

**`__APP_VERSION__`** global injected by Vite from `package.json` version — used in footer, auditoria, and audit logging.

## Data access

```js
import { client } from '@/api/client'
// methods: list, get, create, update, delete, filter, bulkCreate, subscribe
const data = await client.entities.Funcionarios.list()
const item = await client.entities.Funcionarios.get(id)
client.entities.FichaFinanceira.create({ valor: 1000, ... })
```

36 collections auto-registered in `src/firebase/db.js` via `ENTITY_NAMES`. Custom `tipo_lancamento` categories from `client.entities.TipoLancamento.list()`.

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

All RH routes in `src/App.jsx:74-94`. PortalFuncionario tabs controlled by `useRHControl()` + `useFinancialDataLogger`.

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

## Env vars (all `VITE_` prefix)

Required: `VITE_FIREBASE_API_KEY`, `VITE_FIREBASE_AUTH_DOMAIN`, `VITE_FIREBASE_PROJECT_ID`, `VITE_FIREBASE_STORAGE_BUCKET`, `VITE_FIREBASE_MESSAGING_SENDER_ID`, `VITE_FIREBASE_APP_ID`, `VITE_LOGIN_URL` (default `/login`).

`setup-firebase.mjs` bootstraps a new Firebase project (needs `service-account.json` — gitignored).

## Lint / Typecheck scope

**ESLint** (`eslint.config.js`): targets `src/components/**/*.{js,jsx}`, `src/pages/**/*.{js,jsx}`, `src/Layout.jsx`. Ignores `src/lib/**` and `src/components/ui/**`. Rules: `prop-types: off`, `react-in-jsx-scope: off`, `unused-imports/no-unused-imports: error`. Custom `no-unknown-property` ignore: `cmdk-input-wrapper`, `toast-close`.

**Typecheck** (`jsconfig.json`): `checkJs: true`, includes same paths as lint + `"src/components/**/*.js"`. Excludes `node_modules`, `dist`, `src/vite-plugins`, `src/components/ui`, `src/api`, `src/lib`.

## Emulators

```sh
.\iniciar_emulador.bat    # imports from C:\rhdtalia-emulator-data, exports on exit
.\emuladores.ps1           # -Seed flag for fresh data, persistent mode by default
```

Both set `JAVA_HOME` to `C:\Program Files\Eclipse Adoptium\jdk-21.0.11.10-hotspot`. Ports: auth=9099, firestore=8080, storage=9199, hosting=5000, ui=4000. Named database `rhdtalia` is **not supported in emulator** — localhost auto-detects `(default)`.

## Deploy

```sh
firebase deploy --only hosting   # SPA on rhdtalia.web.app
```

Dockerfile builds with `npm ci` + `vite build`, serves via `vite preview --port 80` (Cloud Run / EasyPanel). `apphosting.yaml` for Firebase App Hosting.

No CI/CD pipeline configured (no `.github/` directory).

## Known issues

- `inativo` role: no frontend gating — sees admin UI, edit buttons visible (Firestore rejects writes server-side)
- Cloud Functions not deployed — `sendEmail` and `calcularLimiteValeMensal` fetch calls silently return `null`
- No test suite

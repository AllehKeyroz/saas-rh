# RHDTalia — Agent Guide

## Quick start

```sh
npm install
npm run dev          # localhost:5173
npm run build        # dist/
npm run lint         # eslint (scoped: src/components/ src/pages/ src/Layout.jsx only)
npm run typecheck    # tsc on jsconfig.json (checkJs: true, limited include)
npm run preview      # serve dist/
```

No test suite installed.

## Architecture

**SPA** — React 18 + Vite 6, no SSR. Entry: `src/main.jsx` → `src/App.jsx`.

**Multi-tenant** by `tenant_id`. Proxy in `src/api/client.js` auto-injects `tenant_id` on list/filter/create/bulkCreate. Collections that skip tenant scoping: `users`, `convites`, `tenants`, `ApplicationError`, `LogNotificacao`.

**Firebase**: Auth + Firestore + Storage. Named database `rhdtalia` in prod, `(default)` on localhost (auto-detect in `src/firebase/config.js:21`). Emulators auto-connect on localhost. Cloud Functions (sendEmail, calcularLimiteValeMensal) are **not deployed** — calls silently fail via fetch to `us-central1-<projectId>.cloudfunctions.net/<name>`.

**`__APP_VERSION__`** global is injected by Vite from `package.json` version — used in footer, auditoria, and audit logging.

## Data access

```js
import { client } from '@/api/client'
// methods: list, get, create, update, delete, filter, bulkCreate, subscribe
const data = await client.entities.Funcionarios.list()
const item = await client.entities.Funcionarios.get(id)
client.entities.FichaFinanceira.create({ valor: 1000, ... })
```

All standard collections auto-register in `src/firebase/db.js:128-141`. Custom tipo_lancamento categories are fetched from `client.entities.TipoLancamento.list()`.

## Feature toggles

Feature flags are stored in `ConfiguracoesRH` collection. Use `useRHControl()` from `@/lib/rhControl`:

```js
const { isAtiva } = useRHControl()
if (isAtiva('vida_financeira')) { /* render */ }
```

All feature keys defined in `RH_FEATURES` array (rhControl.js). Groups: `comissoes`, `vida_financeira`, `comunicacao`, `solicitacoes`. Dependencies are enforced client-side.

## Routing & roles

Role comes from `user.role` in Firestore `users` doc. Checked in `src/lib/useUserRole.js`:

| role | behavior | checks |
|------|----------|--------|
| `admin` | `<AppLayoutRH>` + all pages | `isRH()`, `isAdmin()`, `canEdit`, `canReprocess` |
| `user` | `<AppLayoutRH>` + all pages | `isRH()`, `canEdit` (no reprocess) |
| `funcionario` | `<PortalFuncionario>` only | `isFuncionario` |
| `consulta` | 404 always | `isConsulta` |
| `inativo` | **bug**: falls through as admin/user (same UI, but Firestore rejects writes) | no explicit check exists |

All RH routes in `src/App.jsx:74-94`. PortalFuncionario tabs controlled client-side by `useRHControl()` + `useFinancialDataLogger`.

## Project conventions

- **`@/`** → `./src/` (Vite alias + jsconfig.json)
- **CSS**: Tailwind + CSS vars (`hsl(var(--...))`), dark mode via `.dark` class
- **`cn()`** from `@/lib/utils` — always use for className merging
- **UI**: shadcn/ui (New York) in `src/components/ui/`, icons from `lucide-react`
- **State**: TanStack React Query (`queryClientInstance` from `@/lib/query-client`, `refetchOnWindowFocus: false`). Invalidate via `queryClientInstance.invalidateQueries({ queryKey: [...] })`
- **Routing**: React Router v6 (`react-router-dom`)
- **Forms**: `react-hook-form` + `zod`
- **Notifications**: `react-hot-toast` + `sonner` (both mounted in App.jsx)
- **PDF/XLSX/ZIP**: jsPDF + jspdf-autotable, SheetJS, JSZip

## Key constants

`src/lib/formatters.js`:
- `TIPO_LABELS` / `TIPO_COLORS` — display labels and badge colors for all `tipo_lancamento` values
- `LIMITE_PERCENTUAL = 40` — max % of salary+commission for vales/adiantamentos
- `TIPOS_DESCONTO_DEFAULT`, `TIPOS_ADICIONAL_DEFAULT` — default lançamento type lists

`src/lib/vidaFinanceira.js`:
- `CATEGORIAS_PADRAO` — default categories for GastosPessoais, used when no personalização exists
- `TIPO_COLORS` (chart) — hex colors for recharts integration

`src/firebase/config.js:21`:
```js
export const db = getFirestore(app, isLocal ? undefined : 'rhdtalia')
```

## ESLint quirks

- Scoped to `src/components/`, `src/pages/`, `src/Layout.jsx` only (ignores `src/lib/`, `src/components/ui/`)
- `prop-types: off`, `react-in-jsx-scope: off`, `unused-imports/no-unused-imports: error`
- Custom `no-unknown-property` ignore list: `cmdk-input-wrapper`, `toast-close`

## Emulators

```sh
.\iniciar_emulador.bat    # imports from C:\rhdtalia-emulator-data, exports on exit
.\emuladores.ps1           # demo-rhdtalia project, no import
```

Both set `JAVA_HOME` to `C:\Program Files\Eclipse Adoptium\jdk-21.0.11.10-hotspot`. Ports: auth=9099, firestore=8080, storage=9199, hosting=5000, ui=4000. Firestore named database `rhdtalia` is **not supported in emulator** — localhost auto-detects and uses `(default)`.

## Deploy

```sh
firebase deploy --only hosting   # SPA on rhdtalia.web.app
```

Dockerfile builds with `npm ci` + `vite build`, serves via `vite preview --port 80` (used for Cloud Run / EasyPanel). `apphosting.yaml` for Firebase App Hosting.

## Known issues

- `inativo` role: no frontend gating — sees admin UI, edit buttons remain visible (Firestore rejects writes server-side)
- Cloud Functions not deployed — `sendEmail` and `calcularLimiteValeMensal` calls hit non-existent URLs and silently fail
- No test suite — no test framework installed

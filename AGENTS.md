# RHDTalia — Agent Guide

## Quick start

```sh
npm install
npm run dev          # localhost:5173
npm run build        # dist/
npm run lint         # eslint (targets: src/components/ src/pages/ src/Layout.jsx only)
npm run typecheck    # tsc against jsconfig.json (checkJs: true, JS files)
npm run preview      # serve dist/
```

## Architecture

**SPA** — React 18 + Vite 6, **no SSR**, all logic is client-side. Entry: `src/main.jsx` → `src/App.jsx`.

**Multi-tenant** by `tenant_id`. Data layer auto-injects `tenant_id` via Proxy in `src/api/client.js`. Collections `users`, `convites`, `tenants`, `ApplicationError`, `LogNotificacao` skip tenant scoping.

**Firebase**: Auth + Firestore (named database `rhdtalia` in prod, `(default)` on localhost via auto-detect) + Storage. Emulator ports: auth=9099, firestore=8080, storage=9199, hosting=5000, ui=4000. Emulators require Java 21 at `C:\Program Files\Eclipse Adoptium\jdk-21.0.11.10-hotspot`.

**Cloud Functions** (sendEmail, calcularLimiteValeMensal) are **not deployed** — calls silently fail.

## Data access pattern

```js
import { client } from '@/api/client'
// methods: list, get, create, update, delete, filter, bulkCreate, subscribe
const data = await client.entities.Funcionarios.list()
const item = await client.entities.Funcionarios.get(id)
await client.entities.FichaFinanceira.create({ valor: 1000, ... })
```

Entities auto-register. All standard collections are in `src/firebase/db.js:128-141`.

## Routing & roles

Role is checked in `src/lib/useUserRole.js`. Routes in `src/App.jsx`:

- **admin** / **user** (isRH): wrapped in `<AppLayoutRH>` → sidebar + header, full route set
- **funcionario**: `<PortalFuncionario>` only (no sidebar, no admin pages)
- **consulta**: always 404 (unused role)
- **inativo**: routed as admin/user but **Firestore blocks writes** (frontend bug: edit buttons still show)

| check | meaning |
|-------|---------|
| `isRH()` | admin || user |
| `isAdmin()` | admin |
| `canEdit` | isRH |
| `canReprocess` | isAdmin |

## Project conventions

- **`@/`** → `./src/` (Vite alias, also in jsconfig.json)
- **CSS**: Tailwind + CSS variables (`hsl(var(--...))`), dark mode via `.dark` class
- **`cn()`** from `@/lib/utils` — use it for className merging
- **UI components**: shadcn/ui (New York style) in `src/components/ui/`, use `lucide-react` icons
- **State**: TanStack React Query (`queryClientInstance` from `@/lib/query-client`), `refetchOnWindowFocus: false`
- **Routing**: React Router v6 (`react-router-dom`)
- **Forms**: `react-hook-form` + `zod`
- **Notifications**: both `react-hot-toast` and `sonner` (Toaster + SonnerToaster in App.jsx)
- **PDF**: jsPDF + jspdf-autotable; **XLSX**: SheetJS; **ZIP**: JSZip

## ESLint quirks

- Scoped to `src/components/`, `src/pages/`, `src/Layout.jsx` only
- Ignores `src/lib/`, `src/components/ui/`
- `prop-types: off`, `react-in-jsx-scope: off`, `unused-imports/no-unused-imports: error`
- Custom `no-unknown-property` ignore list: `cmdk-input-wrapper`, `toast-close`

## Emulators

```sh
.\iniciar_emulador.bat    # imports from C:\rhdtalia-emulator-data
.\emuladores.ps1           # uses demo-rhdtalia project (no import)
```

## Deploy

```sh
firebase deploy --only hosting   # SPA hosting on rhdtalia.web.app
```

Dockerfile for Cloud Run / EasyPanel (vite preview on port 80). `apphosting.yaml` for Firebase App Hosting.

## Known issues

- `inativo` can see admin pages and edit buttons (Firestore rejects writes, frontend does not hide UI)
- Cloud Functions not deployed — email send silently fails; vale limit calc is client-side only
- No test suite (no test framework installed)

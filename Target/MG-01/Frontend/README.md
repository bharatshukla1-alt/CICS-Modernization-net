# MG-01 — Transaction Type Maintenance (Frontend)

React + Vite (JavaScript) SPA for the two MG-01 screens, refactored from the legacy CICS BMS maps
`COTRTLI` / `COTRTUP`. Styling is `bfsi-theme.css` (from `Config/Style-Sheet.md`) applied directly —
no Tailwind. Auth is Keycloak OIDC (Auth Code + PKCE); data comes from the Spring
`transaction-type-service` over `/api/v1`.

> Frontend only. The backend service, database, tests, and code review are separate deliverables.

## Screens
- **Transaction Types** (`/transaction-types`) — list, filter, keyset paging (7/page), inline edit &
  delete, each gated by a confirmation dialog.
- **Transaction Type Details** (`/transaction-types/details`) — search one code, then view / edit /
  create / delete, each gated by a confirmation dialog.

## Run locally
Prereqs (separate deliverables from the saved local setup): Spring backend on `:8080`, Keycloak on
`:8081` (realm `carddemo`, client `mg01-frontend`), Postgres seeded. Sign in with a disposable
local-sandbox account you create in your own Keycloak realm — do not commit credentials to this repo
(SEC-009). Keep any shared/staging login in a non-committed local note and rotate it before use.

```bash
npm install
npm run dev        # Vite on http://localhost:5173  (proxies /api -> :8080)
```

Config lives in `.env` (`VITE_KEYCLOAK_*`, `VITE_API_BASE`, `VITE_ADMIN_ROUTE`).

## Quality checks

```bash
npm run lint          # ESLint (flat config in eslint.config.js) — hooks rules, unused vars
npm run format:check  # Prettier, no writes
npm run format        # Prettier, writes
npm run audit         # npm audit, fails on high severity
```

## Content-Security-Policy
The CSP is generated per build mode by the `mg01-csp` plugin in `vite.config.js` and injected into
`index.html`. Dev keeps the `'unsafe-inline'` and `ws://` allowances Vite needs; production drops
them and takes `connect-src` from `VITE_KEYCLOAK_URL` plus optional `VITE_API_ORIGIN`. Never
hardcode a policy in `index.html`.

## Structure
- `src/auth/` — Keycloak singleton + `useAuth`
- `src/services/` — `http.js` (Bearer + error normalization) and `transactionTypeApi.js` (E1–E5)
- `src/hooks/` — `useTransactionTypeList` (paging/filter, G1 page number) and
  `useTransactionTypeRecord` (search/edit/create/delete state machine)
- `src/validation/` — client rules (UI §6), `src/lib/messages.js` — reconciled message catalogue
- `src/components/ui/` — Button / TextField / Modal / ConfirmDialog / Alert / EmptyState
- `src/components/transaction-type/` — filters, table, pager, dialogs, search, record form
- `src/screens/` — the two screen containers

## Contract notes (reconcile spec)
- **G2** — E4 `PUT` returns `{ typeCode, description, changed, code }`; `changed` drives
  "Changes saved." vs "No changes to save."
- **G3** — `createIfMissing` is a client constant: list edit sends `false`, details save sends `true`.
- **G7 / G8** — admin route (`VITE_ADMIN_ROUTE`) and the admin scope name are placeholders behind
  single constants pending confirmation from the wider app.

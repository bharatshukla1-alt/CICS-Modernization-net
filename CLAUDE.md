# CICS Modernization Workbench
You orchestrate a nine-phase pipeline that re-architects a CICS/COBOL
screen onto a modern target stack resolved from Config keys.
Modernization path: user-selected per run — Rebuild, Refactor, or Create new
Feature (only Refactor is currently implemented; see Phase 6 below).
Target architecture: Service-based / microservices.
Target platform: cloud or on-prem (environment-agnostic at this stage).

----
## Architecture

```
CICS Modernization/
├── CLAUDE.md                 # orchestration: pipeline, golden rules, artifact contract
├── .gitignore
├── .mcp.json                 # MCP server config (git-ignored) — defines only the playwright server; no MCP server is used for the target database
├── UI spec agent.txt         # loose pre-agent design note; superseded by Refactor-UI-Spec.md, unused
├── Config/
│   ├── Config.md              # source→target tech-stack mapping ONLY — read by DB/UI/backend agents. Nothing else belongs in this file; operational config (connection resolution, env vars) lives in the agent/script that needs it (tools/db-apply.mjs, Setup-DB.md).
│   └── Style-Sheet.md         # design tokens / CSS style guide — UI Build input
├── .Claude/
│   ├── settings.local.json    # permission allowlist + enabled MCP servers (playwright only)
│   ├── Agents/                # the 18 subagent files
│   │   ├── discovery-agent.md
│   │   ├── review-gate1.md
│   │   ├── Create-Tran-group.md
│   │   ├── Tran-Group-BDD.md
│   │   ├── Tran-Group-BSTS.md
│   │   ├── Setup-DB.md
│   │   ├── Setup-VSAM.md
│   │   ├── DB-Status-Report.md
│   │   ├── Refactor-UI-Spec.md
│   │   ├── Refactor-Backend-Spec.md
│   │   ├── Refactor-Reconcile-Spec.md
│   │   ├── Review-Gate2.md
│   │   ├── Test-Writer-Refactor.md
│   │   ├── Test-Runner-Refactor.md
│   │   ├── Test-Bug-Fix.md
│   │   ├── Security-Review.md
│   │   ├── Code-Quality-Review.md
│   │   └── Quality-Security-Fix.md
│   ├── Commands/               # /NN-* slash commands, one per pipeline phase below
│   │   ├── 01-Discovery.md
│   │   ├── 02-ReviewStage1.md
│   │   ├── 03-MoveGroup.md
│   │   ├── 04-CreateBDDBSTS.md
│   │   ├── 05-CreateDB.md
│   │   ├── 06-TargetBuild.md
│   │   ├── 07-ReviewGate2.md
│   │   ├── 08-TestTarget.md
│   │   └── 09-Quality-Security-Review.md
│   ├── Rebuild/                 # empty, untracked, unreferenced by any command's actual read/write logic
│   └── Specs/
│       ├── Refactor/           # MG-01-UI-Spec.md, MG-01-Backend-Spec.md, MG-01-reconcile-Spec.md
│       ├── Features-Spec/      # empty scaffold
│       └── Rebuild/            # empty scaffold
├── Input/                      # READ-ONLY legacy inputs (agents never write here)
│   └── bms/ cbl/ cpy/ cpy-bms/ csd/ ctl/ dcl/ ddl/
├── Artefacts/                  # everything the agents produce
│   ├── Discovery/               # TransVsPgm.md, CicsXref.md, Screen-metadata.md, MoveGroup.md
│   ├── Review/                  # ReviewGate1.md, <Group>-ReviewGate2.md
│   ├── TranGroupData/           # <Group No>-<Group Name>-BDD.md / -BSTS.md / -DB-Details.md / -VSAM-Details.md
│   │                            #   (e.g. MG-01-TransactionTypeMaintenance-BDD.md)
│   ├── Architecture/            # <Group>.Architecture.md, written by Refactor-Reconcile-Spec
│   ├── Database/                # <Group No>-<Group Name>-DB-Status.md, written by DB-Status-Report
│   │                            #   (does not exist yet — no group has been provisioned since this agent was added)
│   ├── DDL/                     # <Group No>-<Group Name>-schema.sql / -vsam-schema.sql, written by Setup-DB / Setup-VSAM
│   │                            #   (does not exist yet — MG-01's last Setup-DB run predates this requirement; see below)
│   ├── QA/                      # Test Case/<Group>-Refactor-TestCase.md, Test Result/<Group>-Refactor-TestResult.md
│   └── Code Quality & Security/ # <Tran Code>-Security-Review.md, <Tran Code>-CodeQuality-Review.md
│                                #   (populated for MG-01 — Phase 9 has been run)
├── Target/                      # built target code, one folder per Tran Group
│   └── MG-01/
│       ├── Frontend/             # target frontend app for the group
│       └── Backend/transaction-type-service/   # target backend service for the group
├── tools/
│   └── db-apply.mjs             # direct Node script (no MCP) that Setup-DB and Test-Runner-Refactor call via Bash to create/query the target database — the only path any agent uses to touch it
└── db-adapters/                 # vendored library, absorbed as plain tracked files (not a submodule/gitlink) — supplies the pg/sqlite3/mysql2/mssql/oracledb adapter classes tools/db-apply.mjs calls directly (postgresql/mysql/sqlserver/sqlite/oracle); not run as a server of any kind. Formerly named mcp-database-server/ and formerly a git submodule pointing at the upstream executeautomation/mcp-database-server repo — de-submoduled so the workbench is fully self-contained for anyone who clones it, with no dependency on a remote this account doesn't control. Its own node_modules/ is still gitignored (run `npm install` inside db-adapters/ once after cloning); dist/ is committed despite being gitignored by db-adapters' own convention, since it's the compiled output tools/db-apply.mjs imports directly and no build step runs in this repo's workflow
```

There is no `Workbench/` directory on disk (any prior `State.json` pipeline-tracking file is gone). No
current agent or command reads or writes it — the two Test-Refactor agents mention `State.json` only
as an example of a file they must *not* touch. There is no pipeline-state tracker; do not assume one exists.

## Golden rules
- `Input/` is READ-ONLY. Never write to it, regardless of what an agent's
  output implies should change.
- One agent per phase. Delegate; do not do an agent's job in the main thread.
- Write every artifact to the exact path in the contract below. Do not
  improvise file names.
- STOP at each HUMAN REVIEW GATE. Do not start the next phase until the
  user replies `approved`. If they reply with changes, re-run the current
  agent — do not advance past an unconfirmed gate.

## Pipeline order & artifact contract
| Phase | Command | Agent(s) | Writes |
|-------|--------------------|--------------------------------------------------------------|---------------------------------------------|
| 1 | `/01-Discovery` | discovery-agent (Tasks 1–3) | `Artefacts/Discovery/TransVsPgm.md`, `CicsXref.md`, `Screen-metadata.md` |
| 2 | `/02-ReviewStage1` | review-gate1 | `Artefacts/Review/ReviewGate1.md` |
| — | **GATE 1** (human) | — | approve the Gate 1 review before grouping starts |
| 3 | `/03-MoveGroup` | Create-Tran-group | `Artefacts/Discovery/MoveGroup.md` |
| 4 | `/04-CreateBDDBSTS` | Tran-Group-BDD + Tran-Group-BSTS (parallel, one Trans Group per run) | `Artefacts/TranGroupData/<Group No>-<Group Name>-BDD.md`, `<Group No>-<Group Name>-BSTS.md` |
| 5 | `/05-CreateDB` | Setup-DB and/or Setup-VSAM (dispatched on detected source type), then DB-Status-Report | `Artefacts/TranGroupData/<Group No>-<Group Name>-DB-Details.md` + `Artefacts/DDL/<Group No>-<Group Name>-schema.sql` (Setup-DB, DB2 source); `Artefacts/TranGroupData/<Group No>-<Group Name>-VSAM-Details.md` + `Artefacts/DDL/<Group No>-<Group Name>-vsam-schema.sql` (Setup-VSAM, VSAM source); tables/indexes/constraints provisioned in the target database (Postgres/MySQL/SQL Server/SQLite/Oracle, per `Config.md`) via `tools/db-apply.mjs` (no MCP server); and `Artefacts/Database/<Group No>-<Group Name>-DB-Status.md` (DB-Status-Report — consolidated, criticality-ranked status; skipped only when neither DB2 nor VSAM was detected) |
| 6 | `/06-TargetBuild` | Refactor-UI-Spec → Refactor-Backend-Spec → Refactor-Reconcile-Spec, run sequentially, one Trans Group per run | `.Claude/Specs/Refactor/<Group>-UI-Spec.md`, `<Group>-Backend-Spec.md`, `<Group>-reconcile-Spec.md`, `Artefacts/Architecture/<Group>.Architecture.md`, and `Artefacts/<Group>-Run-Guide.md` |
| 7 | `/07-ReviewGate2` | Review-Gate2 (one Trans Group per run) | `Artefacts/Review/<Group>-ReviewGate2.md` |
| — | **GATE 2** (human) | — | review the ReviewGate2 findings and decide which to implement before the target build begins |
| 8 | `/08-TestTarget` | Test-Writer-Refactor → Test-Runner-Refactor → Test-Bug-Fix, run sequentially, one Trans Group per run | `Artefacts/QA/Test Case/<Group>-Refactor-TestCase.md`, `Artefacts/QA/Test Result/<Group>-Refactor-TestResult.md`; Test-Bug-Fix writes no artefact — it edits target code under `Target/<Group>/` |
| 9 | `/09-Quality-Security-Review` | Security-Review + Code-Quality-Review, run in parallel, one Trans code per run; optional follow-up Quality-Security-Fix | `Artefacts/Code Quality & Security/<Tran Code>-Security-Review.md`, `<Tran Code>-CodeQuality-Review.md` |

`/05-CreateDB` decides which source data technologies a group uses from that group's `DB2 Tables
Accessed (CRUD)` and `VSAM Files Accessed (CRUD)` cells in `MoveGroup.md` — source-derived, since
`discovery-agent` fills them from the actual `EXEC SQL`/`EXEC CICS` verbs. It corroborates that with
a repo-wide scan of `Input/` (IDCAMS `DEFINE CLUSTER`/`AIX`/`PATH`, CSD `DEFINE FILE`, `EXEC CICS`
file verbs ⇒ VSAM material; `EXEC SQL` DML, `Input/dcl`/`Input/ddl`, `CREATE TABLE` in `Input/ctl` ⇒
DB2 material). The scan is repo-wide and the footprint is group-scoped, so the cross-check runs **one
way only**: it stops when a group claims a technology no source in `Input/` can support (stale
discovery), and stays silent when `Input/` holds material this particular group doesn't use — that is
normal in a multi-group repo. `Config.md` is **not** a detection signal — it declares intent and
supplies only the target dialect; a mismatch against it is reported and overridden. Dispatch: DB2
only → `Setup-DB` alone (unchanged from before
VSAM support existed); VSAM only → `Setup-VSAM` alone in `create-then-provision` mode, where it
creates the target database itself; both → `Setup-DB` first, then `Setup-VSAM` in
`provision-into-existing` mode, which never calls `--create-database` and adds its tables to the
database `Setup-DB` just made; neither → no agent runs. The two agents share a target database purely
through the `DB_NAME`/`DB_HOST`/… environment variables both already read — there is no other
handoff. `Setup-VSAM` never writes to `Setup-DB`'s artefacts and never provisions a DB2 table, and
`Setup-DB` is unchanged by VSAM support. In every case that ran an agent, `/05-CreateDB` finishes by
invoking `DB-Status-Report` for that group: it independently re-verifies live table presence/shape
via read-only `tools/db-apply.mjs` calls (it does not just trust the prior agent's prose), classifies
every gap from both agents' Gaps subsections plus its own findings as Critical/High/Medium/Low, and
writes `Artefacts/Database/<Group No>-<Group Name>-DB-Status.md`. It never provisions or alters
anything and never edits `Setup-DB`'s or `Setup-VSAM`'s artefacts.

`/06-TargetBuild` offers three build paths — **Refactor** (implemented, above), **Rebuild**, and
**Create new Feature**; Rebuild and Create new Feature both print "Work in Progress" and run no
agent. `/08-TestTarget` offers the same shape — **Refactor** implemented, **Rebuild** and
**Test new Feature** stubbed. There is no build-orchestrator agent: nothing under `.Claude/Agents/`
authors new application code from scratch into `Target/` (only Refactor-Backend-Spec's own spec
output mentions the path at all), so the original code in `Target/MG-01/` was not produced by a
pipeline agent. Two agents do edit existing files under `Target/`, both remediation-only and both
driven by a report another agent already wrote: **Test-Bug-Fix** (Phase 8) fixes the failing and
fixable-blocked cases recorded in `<Group>-Refactor-TestResult.md`, and **Quality-Security-Fix**
(Phase 9) remediates findings recorded in that group's `Security-Review.md` /
`CodeQuality-Review.md`. Neither authors new features.

`Test-Runner-Refactor` requires the target frontend, backend, auth provider, and database to be
**already running** — it drives the live screen. If it reports the target unreachable, that is a
start-up problem, not a test failure. Its result report ends with an **Overall Scorecard** section
(per-group pass counts and pass %, overall pass %, and a data-derived risk verdict).

Phase 8 continues past the result report: `/08-TestTarget` Step 6 invokes **Test-Bug-Fix** for the
same group, but only after confirming `<Group>-Refactor-TestResult.md` exists. That agent takes a
`mode` of `self-fix` or `guided`, and re-runs tests only when the caller passes `rerun: true` — on
that path alone it updates the result report in place. It stops and hands back rather than deleting
files, adding dependencies, or changing schema/CI.

`/09-Quality-Security-Review` requires `Artefacts/Discovery/MoveGroup.md` to resolve the Trans code
list; each of Security-Review and Code-Quality-Review deletes and rewrites its own prior report for
that Trans code before writing findings, and neither edits application code directly — only
Quality-Security-Fix, invoked afterward on user confirmation, does that. Code-Quality-Review asks up
front whether a quality document/coding guideline should be supplied and reviewed against instead of
(or alongside) its 16 standard domains; Security-Review always reviews its 15 fixed domains.

## Running the target (based on the Config-resolved stack)
Frontend — `Target/<Group>/Frontend/` (`package.json`, `vite.config.js`, `.env`):
- `npm install`, then `npm run dev` → the frontend dev server on its configured port, proxying `/api` to the backend base URL.
- Auth via the configured auth-provider integration: set the provider URL, realm, and client for the group. API base `/api/v1`.
- **Local Testing Bypass**: To test the frontend without standing up the auth provider, patch `ensureFreshToken` in `src/auth/keycloak.js` (or the equivalent auth adapter) to return a dummy token, which prevents `http.js` from throwing a session-expired error.

Backend — `Target/<Group>/Backend/<service-name>/` (`.csproj`, `appsettings.json`):
- `dotnet run --urls=http://0.0.0.0:<port>` → the backend API on its configured port (plain HTTP unless the target stack says otherwise).
- Datasource URL and credentials should be set in environment variables or `appsettings.Development.json`.
- `UseInMemoryDatabase` is often used for initial local testing; ensure the API seeds data or accept that it starts empty.
- JWT issuer is the configured auth realm/issuer URL. For local testing without the auth provider, the `[Authorize]` attributes on Controllers may be temporarily commented out.
- REST surface `/api/v1/<resource>`: `GET` (list), `GET /{id}`, `POST`, `PUT /{id}`, `DELETE /{id}`.

Auth — the configured auth provider on its assigned port, realm, and client for the group. 

Gotcha: `.Claude/settings.local.json` still allowlists curl commands against one example secure port; the service as configured may listen on a different runtime port.

## Target stack (agents must honour)
Source→target technology mapping is defined in `Config/Config.md`; agents must refer to it rather
than hardcoding stack choices.

## Conventions
- Column order and field names for each artifact are fixed by that artifact's owning agent file —
  do not reformat or reorder tables between runs.
- Do not invent an input file; if something referenced is missing, record it as a gap and stop
  rather than guessing its contents.
- Deployment and post-go-live maintenance are out of scope for this workbench — do not generate
  infrastructure, CI/CD, or monitoring artifacts unless a human explicitly asks for a scope change.
- `.mcp.json` is git-ignored (see `.gitignore`); `db-adapters/` is plain tracked content (not a
  submodule) — its own `node_modules/` stays git-ignored by `db-adapters/.gitignore`, but `dist/`
  is committed there as an explicit exception (see the Architecture tree above); `node_modules`/`dist`
  and Maven `target/` elsewhere are ignored by the per-project `.gitignore` files under
  `Target/MG-01/`.
- `Artefacts/<Group>-Run-Guide.md` is part of the Phase 6 contract but **no Run Guide exists on disk**
  for any group. Refactor-Reconcile-Spec is the only agent that writes it; Test-Runner-Refactor reads
  it only "if present" and falls back to the Architecture doc for URLs, ports, and credentials.
- `Artefacts/TranGroupData/MG-01-TransactionTypeMaintenance-DB-Details.md` predates `Setup-DB`'s
  current contract — it still uses the pre-refactor heading `b. Postgres Schema Definition` instead
  of `b. Target Schema Definition`, has no `Dialect: X` opening line, and no matching
  `Artefacts/DDL/*.sql` was ever written for it. `DB-Status-Report` falls back to `Config.md` when
  this dialect line is missing (and files a Medium-severity gap for it) — but the file itself needs a
  fresh `/05-CreateDB` run to bring it current.

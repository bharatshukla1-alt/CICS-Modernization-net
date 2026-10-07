---
description: Detect which source data technologies a transaction group actually uses (DB2, VSAM, or both) by inspecting Input/ directly, then provision that group's tables into the target database resolved from `Config/Config.md` via tools/db-apply.mjs (a direct Node script, no MCP server) — running the Setup-DB agent, the Setup-VSAM agent, or both in sequence — and finish by generating a consolidated, criticality-ranked status report via the DB-Status-Report agent at Artefacts/Database/<Group No>-<Group Name>-DB-Status.md.
argument-hint: <TransGroup>
---
## Step 1: Resolve which group to process

- If a Trans Group identifier (e.g. `MG-01`) was provided as an argument to this command, use it directly.
- If none was provided, ask the user which Trans Group to process this run. If the user has already confirmed a conversion order during `/03-MoveGroup`, ask for the **next** group in that confirmed sequence rather than treating the list as unordered. Do not default to running all of them.
- Do not pre-read or validate `Artefacts/MoveGroup.md` for correctness here — each agent's own Step 1 owns checking that the file exists and that the identifier matches, and will report back if either fails. The only reading this command does of that file is the classification in Step 2, and the only failure it reports itself is the source-disagreement stop in Step 2.3.

## Step 2: Detect which source data technologies this group actually uses

This detection reads the **source components**, not `Config/Config.md`. `Config.md` declares the
source→target technology mapping a customer *intends*; it lists no source files and cannot say what
a given repo actually contains. Its only role in this phase is supplying the target dialect, which
each agent resolves for itself.

**2.1 — Determine what this group uses (this is what decides dispatch).** Read
`Artefacts/Discovery/MoveGroup.md` and take the requested group's `DB2 Tables Accessed (CRUD)` and
`VSAM Files Accessed (CRUD)` cells across all of its rows. `None` in every row means that technology
is absent **for this group**; anything else means present. These cells are source-derived —
`discovery-agent` fills them from the actual `EXEC SQL` / `EXEC CICS` verbs in the COBOL, not from
`Config.md` — which is why they, and not `Config.md`, drive dispatch.

**2.2 — Scan `Input/` for corroborating source material.** This scan is **repo-wide, not
group-scoped**: it establishes whether definitions for a technology exist in the source at all.

| Signal | Material present for |
|---|---|
| `DEFINE CLUSTER` / `DEFINE CL` / `DEFINE ALTERNATEINDEX` / `DEFINE AIX` / `DEFINE PATH` matches anywhere under `Input/**` | VSAM |
| `DEFINE FILE(` matches in a CSD under `Input/**` | VSAM |
| An `EXEC CICS READ`/`WRITE`/`REWRITE`/`DELETE`/`STARTBR`/`READNEXT`/`READPREV`/`ENDBR`/`UNLOCK` with a `FILE(...)` operand matches under `Input/cbl/**` | VSAM |
| An `EXEC SQL` statement carrying a DML verb (`SELECT`/`INSERT`/`UPDATE`/`DELETE`/`DECLARE ... CURSOR`/`FETCH`) — not a bare `EXEC SQL INCLUDE` — matches under `Input/cbl/**` | DB2 |
| `Input/dcl/` or `Input/ddl/` contains at least one file, or a `CREATE TABLE` matches under `Input/ctl/**` | DB2 |

Searching by content, not by directory, keeps this working for customer repos that lay their source
out differently.

**2.3 — Cross-check, in one direction only.** The two readings have different scopes, so they are
*not* required to match:

| 2.1 (this group) | 2.2 (repo-wide) | Action |
|---|---|---|
| uses technology X | material for X exists | Normal. Dispatch on 2.1. |
| uses technology X | **no** material for X anywhere in `Input/` | **Stop and report.** `MoveGroup.md` claims a footprint the source cannot support — usually discovery ran against different source. Re-run `/01-Discovery` and `/03-MoveGroup`; do not guess here. |
| does **not** use X | material for X exists | **Normal, not a disagreement.** Another group uses it. Dispatch on 2.1 and say nothing. |
| does not use X | no material for X | Normal. |

Finer-grained mismatches — the group names a specific VSAM file for which no cluster definition
exists, say — are **not** a stop here. `Setup-VSAM`'s own Step 4 resolves each file individually and
records a missing definition under Gaps, which is the right place for a per-file gap.

**2.4 — Report any mismatch against `Config.md`, then override it.** Compare the agreed result with
`Config/Config.md`'s declared Source Technology rows and tell the user about any disagreement (for
example: "`Config.md` declares DB2 and VSAM; this group's source uses DB2 only"). This is a **report,
never a stop, and never authoritative** — the source detection wins.

**2.5 — Target-dialect agreement guard.** If VSAM was detected, read every row of `Config/Config.md`
whose Design Area is `Database` and compare their Target Technology cells. If they name different
targets, **stop** — DB2-derived and VSAM-derived tables are specified to land in the same target
database, and that premise is false when the two rows disagree. Report both rows and ask which
target applies.

## Step 3: Dispatch

| DB2 detected | VSAM detected | What to run |
|---|---|---|
| yes | no | `Setup-DB` only. Unchanged from this command's original behaviour — same agent, same single argument, nothing else added. |
| no | yes | `Setup-VSAM` only, with `mode: create-then-provision`. It creates the target database itself, because nothing else will. |
| yes | yes | `Setup-DB` first. Wait for its final report. **Only then** invoke `Setup-VSAM` with `mode: provision-into-existing`, so it adds VSAM-derived tables to the database `Setup-DB` just created and never creates a second one. |
| no | no | Invoke neither. Report that this group has no DB2 or VSAM footprint and stop — do not create a database for a group with nothing to provision. |

Invoke each agent with the Trans Group identifier resolved in Step 1 (and, for `Setup-VSAM`, the mode
from the table above). Each agent owns its own input validation, file-reset handling, source-to-target
translation, `tools/db-apply.mjs` connectivity check, provisioning logic, and final report — do not
re-check, re-derive, or re-specify any of that here.

**Sequencing rule for the both-detected case:** if `Setup-DB` stops for any reason — target database
unreachable, the Oracle DBA hand-off, or a table collision the user did not resolve — **do not start
`Setup-VSAM`.** `Setup-VSAM` in `provision-into-existing` mode assumes a database that exists and is
reachable, so skipping it here is the only safe move. This affects only Step 3: still continue to
Step 5 (relay `Setup-DB`'s stop as its report) and Step 6 (`DB-Status-Report` still runs — it audits
whatever `Setup-DB` did manage to write and produces a persisted Critical-severity record of the stop,
which is more useful than letting the run end with nothing on disk but a chat message).

Neither agent is passed database credentials. Both read `DB_HOST`/`DB_PORT`/`DB_NAME`/`DB_USER`/
`DB_PASSWORD` (or `DB_FILE`) from the shell environment, which is precisely what guarantees they
reach the same target database — there is no other handoff to arrange, and none should be invented.

## Step 4: Relay mid-run pauses

Neither agent has a direct channel to the user, so pauses arrive relayed through you. Handle each by
relaying it to the user once, capturing their literal answer, and passing it back to the subagent
verbatim — never paraphrase it into your own assertion, and never pre-approve on an agent's behalf.

- **Target database unreachable** (bad credentials, host down, missing env var) — a stop condition;
  do not guess at table state or fabricate a connection value. (Either agent.)
- **A target table already exists** — relay the conflict and the leave-as-is / reconcile / drop choice
  once per table. (Either agent.)
- **An unconfirmed VSAM binding** — `Setup-VSAM` proposes which IDCAMS cluster and which copybook
  belong to a VSAM file when the CSD or DSNAME chain doesn't resolve it. Relay the proposal and its
  evidence; do not confirm it yourself. (`Setup-VSAM` only.)
- **A structural choice that needs a human** — an ambiguous `REDEFINES`, or a copybook holding
  multiple `01` record layouts. Relay the options as given. (`Setup-VSAM` only.)

## Step 5: Report back

Relay each agent's own final report to the user as-is (each already covers which tables were created
vs. already existed vs. skipped, its gaps, and which other Trans Groups are still unprovisioned).
When both agents ran, present them in the order they ran and state plainly that `Setup-DB` created
the database and its DB2-derived tables and `Setup-VSAM` added the VSAM-derived tables into that same
database.

## Step 6: Generate the consolidated status report

**Skip this step in the "neither detected" case** — there is nothing to audit when no agent ran.

In every other case, invoke `DB-Status-Report` with this run's Trans Group identifier, after both
Step 3's agent(s) have finished. It independently re-verifies live table presence/shape against the
target database (it does not simply trust `Setup-DB`'s or `Setup-VSAM`'s prose) and classifies every
open gap from both agents' own Gaps subsections, plus anything its own live check finds, by
criticality. It writes `Artefacts/Database/<Group No>-<Group Name>-DB-Status.md` and never provisions
or alters anything itself.

Show the user its report, and tell them this file — not the per-agent reports from Step 5 — is the
place to review overall provisioning status and open gaps ranked by severity. Ask the user to review
`Artefacts/Database/<Group No>-<Group Name>-DB-Status.md` and confirm the provisioned schema.

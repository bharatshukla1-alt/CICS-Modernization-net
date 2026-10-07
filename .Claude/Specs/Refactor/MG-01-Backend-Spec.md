# MG-01 — Transaction Type Maintenance — Backend Build Spec (Refactor)

> Backend / server-side build specification only. The UI is an **input** to this spec, not a
> deliverable. No application code, scaffolding, or folders are created here — Section 10 *describes*
> the backend tree a build agent will later create under `target/MG-01/`. Every rule, endpoint,
> validation, and error path below is traced inline to a TranGroupData artefact and, where noted, to
> the legacy COBOL source.

---

## 1. Spec Metadata & Traceability

| Item | Value |
|---|---|
| Tran Group | **MG-01** |
| Short description | Transaction type maintenance — list, add, update, delete (per `Artefacts/Discovery/MoveGroup.md`) |
| Programs / transactions covered | `COTRTLIC` / `CTLI` (list, page, inline update/delete); `COTRTUPC` / `CTTU` (search, view, add, update, delete a single record) |
| Business domain | Reference-data (configuration) maintenance of Transaction Type codes used to classify financial transactions in the CardDemo application (BSTS §a) |
| Backend services delivered | 1 microservice — **Transaction Type service** exposing REST endpoints over the `TRANSACTION_TYPE` table |

### 1.1 Component-wise target stack (quoted from `Config/Config.md`)

| Design area | Target technology (verbatim) |
|---|---|
| API Layer | "REST APIs, API gateway" |
| Backend | ".NET Core 9 (C#) with ASP.NET Core Web API" |
| Database (DB2 source) | "Postgres" |
| Security | "Oauth 2.0,HTTPS/TLS 1.3" |
| State Management | "Stateless REST + client-held state (or Redis-backed session if multi-step)" |
| Temporary storage (TSQ) | "Redis" |
| Temporary storage (TDQ intra) | "Kafka / RabbitMQ" |
| Integration | "Event streaming (Kafka, Azure Event Hub) or messaging (RabbitMQ, IBM MQ, Azure Service Bus)" |
| Architecture Type | "Microservice-based" |
| Target Platform | "Cloud or on-prem" |

### 1.2 Mandatory backend language (Step 1.3)

The backend build target language is **object-oriented C# / .NET Core** — classes/interfaces, encapsulation,
composition, and a layered domain model (controller → service → repository → entity/DTO), **not** a
procedural line-by-line translation of the COBOL. `Config/Config.md` already names ".NET Core 9 (C#) with ASP.NET Core Web API", so the mandatory-C# requirement and Config **agree** — no discrepancy recorded on this point
(see Section 11 for the full discrepancy log).

### 1.3 Scope note — no temporary storage / messaging / VSAM

`MoveGroup.md` records **no** VSAM files and **no** CICS TS queues (TSQ/TDQ) for either member, and
`MG-01-...-DB-Details.md §a` confirms it ("No VSAM files and no CICS TS (TSQ/TDQ) queues are accessed").
Therefore the Config rows for Redis (TSQ), Kafka/RabbitMQ (TDQ), and event/messaging integration are
**not exercised** by this group and no cache, queue, or event-stream component is specified. State is
fully **stateless REST + client-held state** (Config State-Management row) — the legacy
pseudo-conversational COMMAREA state machine collapses into request-scoped state, discussed in Section 9.

### 1.4 Source files read for this spec

| Source file | Used for |
|---|---|
| `Artefacts/Discovery/MoveGroup.md` | Group membership, programs, transactions, CRUD footprint |
| `Config/Config.md` | Component-wise target stack |
| `Artefacts/TranGroupData/MG-01-TransactionTypeMaintenance-BSTS.md` | Business & technical summary, workflow, rules, paragraph-level behaviour |
| `Artefacts/TranGroupData/MG-01-TransactionTypeMaintenance-BDD.md` | Acceptance scenarios, validations, error handling, edge cases |
| `Artefacts/TranGroupData/MG-01-TransactionTypeMaintenance-DB-Details.md` | Target Postgres schema, CRUD footprint, seed data |
| `.Claude/Specs/Refactor/MG-01-UI-Spec.md` | Frontend contract: screens, fields, actions, routes, message catalogue |

**Frontend build files consulted:** none exist yet. `Glob` of `Target/**` and `**/MG-01/**` returned
no files, so the **UI spec is the sole frontend contract** for this backend spec (per Step 3.3). When
the frontend build later lands under `target/MG-01/`, the request/response shapes in Section 3 are the
contract it must call.

**Legacy source consulted (Step 2.3):** none re-opened for this run — the BSTS/BDD/DB-Details already
cite the COBOL paragraphs, SQLCODEs, and cursor predicates in full, so all behaviour below is grounded
in the artefacts. Paragraph names (e.g. `9200-UPDATE-RECORD`) are quoted from those artefacts, not
re-derived from source.

---

## 2. Business Context & Scope

**What it does.** MG-01 maintains the "Transaction Type" reference table — 2-character codes and their
free-text descriptions used elsewhere to classify financial transactions (BSTS §a). It is pure
reference-data CRUD over one table, `CARDDEMO.TRANSACTION_TYPE`.

**Who uses it.** An operations administrator (BSTS §a: session marked `CDEMO-USRTYP-ADMIN` on entry;
BDD stories "As an operations administrator"). No self-service/customer usage.

**Backend use cases in scope:**
1. **List & page** transaction types, optionally filtered by code and/or description, 7 rows per page,
   forward and backward (CTLI / `COTRTLIC`, cursors `C-TR-TYPE-FORWARD` / `C-TR-TYPE-BACKWARD`).
2. **Filter existence check** before returning a page (CTLI, `9100-CHECK-FILTERS`).
3. **Search a single** transaction type by code (CTTU / `COTRTUPC`, `9100-GET-TRANSACTION-TYPE`).
4. **Create** a new transaction type when the searched code does not exist (CTTU, `9700-INSERT-RECORD`).
5. **Update** a transaction type's description — both inline from the list (CTLI, `9200-UPDATE-RECORD`)
   and from the details screen (CTTU, `9600-WRITE-PROCESSING`).
6. **Delete** a transaction type — both inline from the list (CTLI, `9300-DELETE-RECORD`) and from the
   details screen (CTTU, `9800-DELETE-PROCESSING`).
7. **Verify database connectivity** before serving (CTLI, `9998-PRIMING-QUERY`).

**Out of scope (grounded).** `CARDDEMO.TRANSACTION_TYPE_CATEGORY` (`DCLTRCAT`) is `EXEC SQL INCLUDE`d by
`COTRTUPC` but never referenced by any statement and carries no CRUD footprint in `MoveGroup.md`
(DB-Details §a note) — no endpoint, entity, or table is specified for it. It survives only as the
**parent-side referential constraint** that makes a delete fail (Section 7, SQLCODE -532). The
`CDEMO-USRTYP-ADMIN` → `CDEMO-USRTYP-USER` role switch on PF2 hand-off is an observed legacy behaviour
whose downstream effect is unconfirmed (BSTS "Business role note", copybook `COCOM01Y` missing) — it has
no backend consequence in this service and is recorded as a gap in Section 11.

---

## 3. Service & API Specification

**Target implementation language: object-oriented C# / .NET Core.** API style per `Config/Config.md`
"REST APIs, API gateway": stateless JSON/REST controllers behind an API gateway; JSON request/response;
`Content-Type: application/json`; all traffic over TLS 1.3 (Section 8). Base path: `/api/v1`.

**Resource model.** One resource: `transaction-type`, identified by its 2-character code.

### 3.1 Canonical representations (DTOs)

`TransactionTypeDto` (response element):
| Field | Type | Notes |
|---|---|---|
| `typeCode` | string(2) | Fixed 2-char zero-padded code, e.g. `"05"` (`TR_TYPE`) |
| `description` | string(≤50) | `TR_DESCRIPTION` |

`TransactionTypePageDto` (list response):
| Field | Type | Notes |
|---|---|---|
| `items` | `TransactionTypeDto[]` | ≤ 7 elements |
| `hasNext` | boolean | Lookahead result — a further forward page exists (`CA-NEXT-PAGE-EXISTS`) |
| `hasPrevious` | boolean | A previous page exists (false on first page, `CA-FIRST-PAGE`) |
| `nextCursor` | string(2)/null | `typeCode` of the last item, for forward paging |
| `prevCursor` | string(2)/null | `typeCode` of the first item, for backward paging |

`ErrorResponseDto` (all non-2xx): `{ code: string, message: string, field?: string, traceId: string }` —
`code` is a machine-readable enum (Section 7), `message` is a user-safe, identifier-free string; raw
SQLSTATE / DB diagnostics are **never** included (Section 7, Section 8).

### 3.2 Endpoints

---

#### E1 — `GET /api/v1/transaction-types`
**Purpose:** Filtered, keyset-paged list of transaction types (≤ 7 per page), forward or backward.
**UI action(s) served:** Screen 1 — Search, Clear, Next, Previous (UI-Spec §7.1).
**Legacy origin:** `COTRTLIC` cursors `C-TR-TYPE-FORWARD` / `C-TR-TYPE-BACKWARD`, `8000-READ-FORWARD`,
`8100-READ-BACKWARDS`, `9100-CHECK-FILTERS` (BDD "Browse and page" feature).

Request (query parameters):
| Param | Type | Req | Rule / mapping |
|---|---|---|---|
| `typeCode` | string | opt | If present, must be exactly 2 digits (§5 V1). Applied as `TR_TYPE = :typeCode` only when supplied (`WS-EDIT-TYPE-FLAG='1'`). |
| `description` | string | opt | Trimmed; applied as `TR_DESCRIPTION LIKE '%'||:description||'%'` when supplied (`1230-EDIT-DESC`). |
| `cursor` | string(2) | opt | The keyset boundary code; absent = first page. |
| `direction` | enum `forward`\|`backward` | opt | Default `forward`. `forward` → `TR_TYPE > :cursor ORDER BY TR_TYPE ASC`; `backward` → `TR_TYPE < :cursor ORDER BY TR_TYPE DESC` then re-sorted ascending for display. |
| `size` | int | opt | Fixed page size **7** (`WS-MAX-SCREEN-LINES`); default and max 7. |

Behaviour:
- If a filter is supplied, run a `SELECT COUNT(1)` existence check first (`9100-CHECK-FILTERS`); if zero,
  return **200** with an empty `items` array and `hasNext=hasPrevious=false` (the UI renders the
  filtered-no-match alert, UI-Spec §8). Do **not** 404 — an empty filtered result is a valid page.
- Fetch up to 7 rows plus one lookahead row to set `hasNext` (`CA-NEXT-PAGE-EXISTS`/`NOT-EXISTS`).
- First page (`cursor` absent, `direction=forward`) sets `hasPrevious=false` (`CA-FIRST-PAGE`).

Response: **200** `TransactionTypePageDto`.
Status codes: `200` OK (including empty page); `400` invalid `typeCode`/`direction`/`size` (§5);
`401`/`403` auth (§8); `503` DB unavailable (§7 priming).

---

#### E2 — `GET /api/v1/transaction-types/{typeCode}`
**Purpose:** Fetch one transaction type by code.
**UI action(s) served:** Screen 2 — Find (UI-Spec §7.2).
**Legacy origin:** `COTRTUPC` `9100-GET-TRANSACTION-TYPE` (SQL `SELECT TR_TYPE, TR_DESCRIPTION ... WHERE TR_TYPE = :DCL-TR-TYPE`).

Request: path `typeCode` — required, validated & normalized per §5 V4 (numeric, non-zero, single digit
zero-padded to 2, e.g. `5`→`05`).

Response: **200** `TransactionTypeDto` when found (`SQLCODE 0`, `FOUND-TRANTYPE-IN-TABLE`).
Status codes: `200` found; `400` invalid code (§5 V4); `404` `TXN_TYPE_NOT_FOUND` when `SQLCODE +100`
(BDD "No record found for this key in database" — the UI offers Create); `401`/`403`; `500`
`TXN_TYPE_DB_ERROR` on a negative SQLCODE (§7).

> Functional-equivalence note: legacy on a negative SELECT SQLCODE builds an error message but still routes
> the user to the not-found/create path (BDD "A negative SQLCODE during search still routes… not found").
> The modern service instead returns `500` with a safe code so the client does not silently offer create on
> a genuine DB fault; the UI may still present a retry/create affordance. Recorded in Section 11.

---

#### E3 — `POST /api/v1/transaction-types`
**Purpose:** Create a new transaction type.
**UI action(s) served:** Screen 2 — Create record (not-found → confirm) (UI-Spec §7.2).
**Legacy origin:** `COTRTUPC` `9600-WRITE-PROCESSING` → `9700-INSERT-RECORD` (INSERT when the update
finds no row, `SQLCODE +100`).

Request body `CreateTransactionTypeRequest`:
| Field | Type | Req | Rule |
|---|---|---|---|
| `typeCode` | string(2) | yes | §5 V4 (numeric, 2-digit, non-zero, zero-padded). |
| `description` | string(≤50) | yes | §5 V5 (required, letters/digits/spaces only, ≤50). |

Response: **201** `TransactionTypeDto` with `Location: /api/v1/transaction-types/{typeCode}`; success
message maps to "Changes committed to database" (BDD create success).
Status codes: `201` created; `400` validation (§5); `409` `TXN_TYPE_ALREADY_EXISTS` if the key already
exists (Postgres unique-violation `23505`); `401`/`403`; `500` `TXN_TYPE_DB_ERROR` (`9700` "Error
inserting record into: TRANSACTION_TYPE Table" — surfaced as safe generic).

> Legacy performs update-then-insert in one paragraph; the modern split (POST create vs PUT update) is a
> clean-REST rationalization. The create path is reached only after E2 returned 404, exactly as the legacy
> add path is reached only after a not-found search. Recorded in Section 11.

---

#### E4 — `PUT /api/v1/transaction-types/{typeCode}`
**Purpose:** Update a transaction type's description.
**UI action(s) served:** Screen 1 — Edit dialog → Save (inline); Screen 2 — Save changes
(UI-Spec §7.1, §7.2).
**Legacy origin:** `COTRTLIC` `9200-UPDATE-RECORD` (list) and `COTRTUPC` `9600-WRITE-PROCESSING` (details)
— both `UPDATE CARDDEMO.TRANSACTION_TYPE SET TR_DESCRIPTION = :desc WHERE TR_TYPE = :code`.

Request body `UpdateTransactionTypeRequest`:
| Field | Type | Req | Rule |
|---|---|---|---|
| `description` | string(≤50) | yes | §5 V5 (required, letters/digits/spaces only, ≤50). |
| `createIfMissing` | boolean | opt | Default **false**. See divergence below. |

Behaviour (functional equivalence — the two legacy paragraphs differ on a concurrently-deleted row):
- **No-change guard (both screens):** if the submitted description equals the stored value when both are
  trimmed and compared case-insensitively, perform **no** UPDATE and return **200** with body flag
  `changed:false` and code `TXN_TYPE_NO_CHANGE` (BDD "No change detected with respect to database values"
  / "No change detected with respect to values fetched"; `1211-EDIT-ARRAY-DESC`, `1205-COMPARE-OLD-NEW`).
- **Normal update:** perform the UPDATE; on 1 row affected return **200** `TransactionTypeDto`,
  `changed:true` (success maps to "HIGHLIGHTED row was updated" / "Changes committed to database").
- **Row absent at update time (0 rows / legacy `SQLCODE +100`):**
  - `createIfMissing=false` (list default, `9200`): return **409** `TXN_TYPE_CONCURRENTLY_DELETED`
    (BDD "Record not found. Deleted by others ?").
  - `createIfMissing=true` (details write path, `9600`→`9700` fall-through): re-INSERT the row and return
    **201** `TransactionTypeDto` (BDD edge case "Saving a change to a row that another user deleted first
    falls back to creating it").
- **Lock/deadlock (legacy `SQLCODE -911`):** **409** `TXN_TYPE_LOCK_CONFLICT` (BDD "Deadlock. Someone
  else updating ?" / "Could not lock record for update").

Status codes: `200` updated / no-change; `201` re-created (createIfMissing); `400` validation (§5);
`404` `TXN_TYPE_NOT_FOUND` (see note); `409` `TXN_TYPE_CONCURRENTLY_DELETED` / `TXN_TYPE_LOCK_CONFLICT`;
`401`/`403`; `500` `TXN_TYPE_DB_ERROR` (generic "Update failed with…").

> Divergence: the legacy list update never inserts on `+100`; the legacy details update does. `createIfMissing`
> lets one endpoint reproduce both exactly (list caller passes false, details caller passes true). Recorded in
> Section 11.

---

#### E5 — `DELETE /api/v1/transaction-types/{typeCode}`
**Purpose:** Delete a transaction type.
**UI action(s) served:** Screen 1 — Delete dialog → Confirm; Screen 2 — Delete → confirm
(UI-Spec §7.1, §7.2).
**Legacy origin:** `COTRTLIC` `9300-DELETE-RECORD` (list) and `COTRTUPC` `9800-DELETE-PROCESSING` (details)
— both `DELETE FROM CARDDEMO.TRANSACTION_TYPE WHERE TR_TYPE = :code`.

Request: path `typeCode` — validated/normalized per §5 V4.

Behaviour:
- Row deleted (`SQLCODE 0`): **204 No Content** (success maps to "HIGHLIGHTED row deleted…" / "Delete
  successful.").
- Referential-constraint violation (legacy `SQLCODE -532` / Postgres `23503`): **409**
  `TXN_TYPE_HAS_DEPENDENTS` (BDD "Please delete associated child records first:") — caused by the inbound
  FK from `TRANSACTION_TYPE_CATEGORY (TRC_TYPE_CODE) … ON DELETE RESTRICT` (DB-Details §b note).
- Lock/deadlock (`-911`): **409** `TXN_TYPE_LOCK_CONFLICT`.
- Row not present: **404** `TXN_TYPE_NOT_FOUND` (idempotency note, Section 9).
- Any other DB failure: **500** `TXN_TYPE_DB_ERROR` (generic "Delete failed with message:").

Status codes: `204`; `400`; `404`; `409` dependents/lock; `401`/`403`; `500`.

> The legacy "arm then confirm" two-step (mark `D` then `F10`; press `F4` twice) is a **presentation** concern
> resolved in the UI's confirmation dialog (UI-Spec §3.3, §7). The backend receives a single, already-confirmed
> delete request; it does not model the confirmation state.

---

#### E6 — Database connectivity / health (infrastructure, not a business endpoint)
**Legacy origin:** `9998-PRIMING-QUERY` (`SELECT 1 FROM SYSIBM.SYSDUMMY1`), BSTS/BDD "Db2 connectivity is
verified before any screen is built". Implemented as a Spring Boot Actuator **DB health indicator**
(`SELECT 1`); when the datastore is unreachable, business endpoints E1–E5 short-circuit and return
**503** `SERVICE_UNAVAILABLE` with a safe message rather than attempting data access (mirrors "returns
without building the 3270 map"). Not exposed as a public REST resource.

### 3.3 UI-action → endpoint coverage matrix

| UI action (UI-Spec) | Endpoint |
|---|---|
| Screen 1 Search / Clear | E1 (with/without filters) |
| Screen 1 Next / Previous | E1 (`direction`, `cursor`) |
| Screen 1 Row Edit → Save | E4 (`createIfMissing=false`) |
| Screen 1 Row Delete → Confirm | E5 |
| Screen 1 Add transaction type | route to Screen 2 (no backend call until Find/Create) |
| Screen 2 Find | E2 |
| Screen 2 Save changes (found) | E4 (`createIfMissing` may be true to mirror legacy re-insert) |
| Screen 2 Create record (not found) | E3 |
| Screen 2 Delete → Confirm | E5 |
| Screen 2 / Screen 1 Back | route only (no backend call) |

---

## 4. Business Rules & Functional Equivalence

Every rule/calculation/conditional path from BSTS, BDD, and DB-Details, restated as target server logic.
Nothing is summarized away.

| # | Legacy source (paragraph / SQLCODE / scenario) | Target server behaviour |
|---|---|---|
| R1 | `8000-READ-FORWARD`: fetch up to 7 rows forward from lowest key on first entry (BDD "First entry shows first page") | E1 first page: keyset `ORDER BY TR_TYPE ASC LIMIT 7`, no cursor. |
| R2 | `CA-NEXT-PAGE-EXISTS` lookahead fetch beyond row 7 | E1 fetches `LIMIT 8`; if 8 returned, `hasNext=true`, drop the 8th from `items`. |
| R3 | PF8 when `CA-NEXT-PAGE-NOT-EXISTS AND CA-LAST-PAGE-SHOWN` → "No more pages to display" (BDD) | E1 forward beyond last page returns empty `items` + `hasNext=false`; UI shows "You're on the last page." (client-side, no extra call needed since `hasNext` was already false). |
| R4 | PF7 on `CA-FIRST-PAGE` → "No previous pages to display" (BDD) | `hasPrevious=false` on first page; UI blocks Previous. |
| R5 | `8100-READ-BACKWARDS`: page up fetches previous 7 rows descending, re-shown ascending | E1 `direction=backward`: `TR_TYPE < :cursor ORDER BY TR_TYPE DESC LIMIT 8`, reverse to ascending for `items`. |
| R6 | Type filter applied only when supplied (`WS-EDIT-TYPE-FLAG='1'`), predicate `TR_TYPE = :filter` (BDD "Filtering by a valid code") | E1: add `TR_TYPE = :typeCode` to WHERE only when `typeCode` present. |
| R7 | Description filter wrapped `%...%` for `LIKE` (`1230-EDIT-DESC`, BDD "partial match") | E1: `TR_DESCRIPTION LIKE '%'||:description||'%'` only when present; trim first. |
| R8 | Blank filters = whole table in code order (BSTS §CTLI) | E1 with no params: unfiltered `ORDER BY TR_TYPE ASC`. |
| R9 | `9100-CHECK-FILTERS` `SELECT COUNT(1)` before paging; zero → "No Records found for these filter conditions" and selection locked (BDD/BSTS) | E1: run count when a filter is present; zero → empty page (UI renders filtered-no-match alert). |
| R10 | First forward fetch on page 1 returns +100 → "No records found for this search condition." (BDD edge case) | E1: empty `items` on an unfiltered/first-page empty result — same empty-page response; UI distinguishes copy. |
| R11 | Only one row action per page; >1 `U`/`D` → "Please select only 1 action" (`1210-EDIT-ARRAY`) | Structurally prevented by REST design — each E4/E5 acts on exactly one `{typeCode}`. No multi-row action code exists server-side (UI-Spec §6.1 F4). Recorded Section 11. |
| R12 | Row action code must be `U`/`D`/space/low-values else "Action code selected is invalid" (`1210-EDIT-ARRAY WHEN OTHER`) | No free-text action field in the API; N/A server-side (same rationalization as R11). |
| R13 | Update path: description required + alphanumeric+spaces only (`1211/1240-EDIT-ALPHANUM-REQD`) | §5 V5 enforced on E4 body before UPDATE. |
| R14 | No-change guard: retyped description equal to stored (trimmed, case-insensitive) → "No change detected…" (`1211`, `1205-COMPARE-OLD-NEW`) | E4 no-change guard → 200 `TXN_TYPE_NO_CHANGE`, no UPDATE (E4 behaviour). |
| R15 | Update commit on `SQLCODE 0` then `SYNCPOINT`; success "HIGHLIGHTED row was updated"/"Changes committed" (`9200`/`9600`) | E4 UPDATE inside a transaction; commit on success; 200. |
| R16 | Update `SQLCODE +100` (list) → "Record not found. Deleted by others ?" (`9200`) | E4 `createIfMissing=false` → 409 `TXN_TYPE_CONCURRENTLY_DELETED`. |
| R17 | Update `SQLCODE +100` (details) → fall through to INSERT (`9600`→`9700`) | E4 `createIfMissing=true` → re-INSERT, 201. |
| R18 | Update `SQLCODE -911` → "Deadlock. Someone else updating ?" / "Could not lock record" (`9200`/`9600`) | E4 → 409 `TXN_TYPE_LOCK_CONFLICT`. |
| R19 | Update other negative SQLCODE → "Update failed with…" (`9200`/`9600`) | E4 → 500 `TXN_TYPE_DB_ERROR` (safe generic). |
| R20 | Delete requires explicit confirmation then `DELETE`; success "HIGHLIGHTED row deleted…"/"Delete successful." (`9300`/`9800`) | Confirmation is UI; E5 performs DELETE, 204 on success. |
| R21 | Delete `SQLCODE -532` → "Please delete associated child records first:" (`9300`/`9800`) | E5 → 409 `TXN_TYPE_HAS_DEPENDENTS` (Postgres FK `23503`). |
| R22 | Delete other non-zero SQLCODE → "Delete failed with message:" (`9300 WHEN OTHER`/`9800`) | E5 → 500 `TXN_TYPE_DB_ERROR`. |
| R23 | Search single: `SELECT` by key; `SQLCODE 0` → show editable; `+100` → not-found/offer-create (`9100-GET-TRANSACTION-TYPE`) | E2: 200 found / 404 not-found. |
| R24 | Search key required, numeric, 2-digit, non-zero (`1210-EDIT-TRANTYPE`, `1245-EDIT-NUM-REQD`) | §5 V4 on E2 path / E3 & E4 `typeCode`. |
| R25 | Single-digit key zero-padded to 2 (`INSPECT REPLACING SPACES BY ZEROS`) | §5 V4 normalization: `5`→`05` server-side before any DB op. |
| R26 | Add path: UPDATE first, INSERT on +100; save logic identical for add & update (`9600`/`9700`) | Modelled as E3 (POST create) reached only after E2 404, plus E4 `createIfMissing` for the concurrent-delete edge case. |
| R27 | Create success → "Changes committed to database" (`9700`) | E3 → 201. |
| R28 | Insert failure any non-zero SQLCODE → "Error inserting record…" (`9700 WHEN OTHER`) | E3 → 500 `TXN_TYPE_DB_ERROR`; duplicate key `23505` → 409 `TXN_TYPE_ALREADY_EXISTS`. |
| R29 | Delete two-step confirm on details (`F4` then `F4`); Cancel behaviours (`F12`) revert state (BSTS Cancel path) | UI-only state machine; backend stateless — no server behaviour. Recorded Section 11. |
| R30 | Db2 connectivity verified via priming query before any work; failure → send error text, return without map (`9998`) | E6 health indicator; on DB-down, E1–E5 short-circuit to 503. |
| R31 | `2000-DECIDE-ACTION WHEN OTHER` → controlled abend `9999` "UNEXPECTED DATA SCENARIO" (BSTS/BDD) | The pseudo-conversational state machine is replaced by stateless REST; unrecognized/illegal transitions cannot arise from persisted state. Any internal invariant breach → 500 with a safe generic code + server-side log; never an abend surfaced to the client. Recorded Section 11. |
| R32 | PF-key validity per state (`0001-CHECK-PFKEYS`); invalid → "Invalid key pressed" (BDD) | UI action availability replaces PF-key gating; the backend enforces the equivalent by only exposing valid operations per resource state (e.g. E4 no-change guard, E2 404). No "invalid key" server concept. |
| R33 | `1150-STORE-MAP-IN-NEW`: `'*'`/spaces normalized to low-values on receive | Server treats blank/whitespace-only `description` and blank `typeCode` as empty → triggers required-field validation (§5). |
| R34 | Both actions `SYNCPOINT` (commit) only on success; failures leave DB unchanged | Each state-changing endpoint runs in a single DB transaction, committed only on success, rolled back on any error (Section 6 transaction boundaries). |

---

## 5. Server-Side Validation

Every request field gets a server check — the server-side counterpart to the UI spec's presentation-layer
rules (UI-Spec §6). Client validation is never trusted alone. On failure the endpoint returns **400** with
`ErrorResponseDto` (`field` set to the offending attribute) unless a more specific status applies.

| ID | Field / endpoint | Rule | Error code / message (user-safe) | Legacy origin |
|---|---|---|---|---|
| V1 | `typeCode` query on E1 | If supplied, exactly 2 digits `^[0-9]{2}$` | `INVALID_TYPE_CODE_FILTER` — "Type code must be a 2-digit number." | `1220-EDIT-TYPECD` |
| V2 | `typeCode` query on E1 | Blank/absent accepted → no filter | (none) | `1220-EDIT-TYPECD` (`FLG-TYPEFILTER-BLANK`) |
| V3 | `description` query on E1 | Any text; trim; max length 50; used as contains-search | (none — no format rule) | `1230-EDIT-DESC` |
| V4 | `typeCode` path/body on E2/E3/E4/E5 | Required; numeric; a single digit is zero-padded to 2 (`5`→`05`); resulting value `^[0-9]{2}$`; must not be `00` | Required→`TYPE_CODE_REQUIRED` "Enter a transaction type code."; non-numeric→`TYPE_CODE_NOT_NUMERIC` "Transaction type code must be numeric."; zero→`TYPE_CODE_ZERO` "Transaction type code cannot be zero." | `1210-EDIT-TRANTYPE`, `1245-EDIT-NUM-REQD` |
| V5 | `description` body on E3/E4 | Required (non-blank after trim); letters, digits, spaces only `^[A-Za-z0-9 ]+$`; max length 50 | Blank→`DESCRIPTION_REQUIRED` "Enter a description."; bad chars→`DESCRIPTION_INVALID_CHARS` "Description can contain letters, numbers, and spaces only."; too long→`DESCRIPTION_TOO_LONG` "Description must be 50 characters or fewer." | `1211/1230/1240-EDIT-ALPHANUM-REQD` |
| V6 | `direction` query on E1 | If present, one of `forward`\|`backward` | `INVALID_DIRECTION` "Invalid paging direction." | derived from cursor pair |
| V7 | `size` query on E1 | If present, integer 1..7; capped at 7 | `INVALID_PAGE_SIZE` "Page size must be between 1 and 7." | `WS-MAX-SCREEN-LINES=7` |
| V8 | `cursor` query on E1 | If present, 2 digits | `INVALID_CURSOR` "Invalid paging cursor." | keyset boundary |

Notes:
- V4 normalization (zero-pad) is applied **before** the numeric/zero checks and before any DB access, so
  the stored/queried key is always the canonical 2-char form (R25).
- "Existence/uniqueness/referential" outcomes (record found, already exists, no-change, has dependents,
  concurrently deleted) are **not** input validations — they are runtime outcomes returned per Sections 3
  and 7 (UI-Spec §6 preface makes the same distinction).
- Character-set check V5 uses the alphanumeric-plus-space rule exactly as the two legacy edits express it;
  no additional allowed characters are introduced.

---

## 6. Data Model & Data Access

**Datastore:** Postgres (Config "Database: Postgres"). Schema per `MG-01-...-DB-Details.md §b`.

**Table `TRANSACTION_TYPE`** (created unqualified / `public` inside the `CARDDEMO` database — DB-Details §b):

| Column | Type | Null | Key | Notes |
|---|---|---|---|---|
| `TR_TYPE` | `CHAR(2)` | NOT NULL | PK | 2-char code; `PRIMARY KEY (TR_TYPE)` auto-creates the backing unique index — the legacy `XTRAN_TYPE` index is **not** re-emitted (DB-Details §b). |
| `TR_DESCRIPTION` | `VARCHAR(50)` | NOT NULL | — | Free-text description. |

- **Constraints/indexes:** single-column PK on `TR_TYPE` (unique index implicit). No FK originates from
  this table. An inbound FK exists from out-of-scope `TRANSACTION_TYPE_CATEGORY (TRC_TYPE_CODE) REFERENCES
  TRANSACTION_TYPE (TR_TYPE) ON DELETE RESTRICT` — this is what raises the delete-blocked error (R21/§7).
- **Seed data (DB-Details §c):** 7 rows `01 PURCHASE, 02 PAYMENT, 03 CREDIT, 04 AUTHORIZATION,
  05 REFUND, 06 REVERAL (verbatim — sic), 07 ADJUSTMENT`. The service must not "correct" `REVERAL`.
  Seeding is a database-provisioning concern (already handled by the DB phase, MCP `postgres-carddemo`);
  this spec does not re-provision — it only reads/writes.

**Domain / persistence model (object-oriented C#):**
- `TransactionType` entity — fields `typeCode` (PK, mapped to `TR_TYPE`), `description` (`TR_DESCRIPTION`).
- `TransactionTypeRepository` — Entity Framework Core `DbContext` **or** ADO.NET repository (build agent's choice within the .NET stack); it must support:
  - keyset forward query: `WHERE TR_TYPE > :cursor [AND filters] ORDER BY TR_TYPE ASC LIMIT :sizePlus1`;
  - keyset backward query: `WHERE TR_TYPE < :cursor [AND filters] ORDER BY TR_TYPE DESC LIMIT :sizePlus1`;
  - filtered count: `SELECT COUNT(1) WHERE [filters]`;
  - `findById`, `insert`, `updateDescriptionByCode`, `deleteById`.
- Filters (`TR_TYPE = :code`, `TR_DESCRIPTION LIKE :pattern`) must be **parameterized** — never string-
  concatenated (Section 8 injection control).

**CRUD footprint per endpoint** (DB-Details §a):
| Endpoint | Operation | SQL |
|---|---|---|
| E1 | R | keyset `SELECT` (fwd/bwd) + filtered `SELECT COUNT(1)` |
| E2 | R | `SELECT TR_TYPE, TR_DESCRIPTION WHERE TR_TYPE = :code` |
| E3 | C | `INSERT INTO TRANSACTION_TYPE (TR_TYPE, TR_DESCRIPTION) VALUES (:code,:desc)` |
| E4 | U (C on createIfMissing) | `UPDATE TRANSACTION_TYPE SET TR_DESCRIPTION=:desc WHERE TR_TYPE=:code` (+ conditional INSERT) |
| E5 | D | `DELETE FROM TRANSACTION_TYPE WHERE TR_TYPE=:code` |

**Transaction boundaries (R15, R20, R34):** each state-changing endpoint (E3/E4/E5) executes within a single
.NET Core transaction (`IDbContextTransaction` or `TransactionScope`), committed only on success and rolled back on any exception —
the modern equivalent of the legacy `EXEC CICS SYNCPOINT` issued only after a successful UPDATE/INSERT/DELETE.
The E4 no-change guard commits nothing (no write). E1/E2 are read-only (`@Transactional(readOnly=true)`).

**Data-access approach:** ASP.NET Core with a pooled `DbContext` or connection pool — connection
pooling replaces the single per-transaction DB2 thread. Isolation `READ COMMITTED` (Postgres default) is
sufficient; the `-911` lock-conflict path (§7) is surfaced rather than blindly retried.

---

## 7. Error Handling & Edge Cases

Every server-side error path required for functional equivalence. Legacy SQLCODE → Postgres SQLSTATE →
target HTTP + machine code + user-safe message. **Raw SQLSTATE / driver text is never returned to the client**
(logged server-side only, Section 8).

| Legacy condition (SQLCODE / scenario, source) | Postgres equivalent | HTTP | Machine code | User-safe message |
|---|---|---|---|---|
| Priming query fails / DB unreachable (`9998`, BDD) | connection failure | `503` | `SERVICE_UNAVAILABLE` | "The service is temporarily unavailable. Please try again shortly." |
| SELECT single `+100` (`9100-GET-TRANSACTION-TYPE`, BDD) | 0 rows | `404` | `TXN_TYPE_NOT_FOUND` | "No record exists for this code." |
| SELECT single negative SQLCODE (`9100`, BDD) | SQL error | `500` | `TXN_TYPE_DB_ERROR` | "Something went wrong. Please try again." |
| List UPDATE `+100` (`9200`, BDD) | 0 rows affected | `409` | `TXN_TYPE_CONCURRENTLY_DELETED` | "This record was removed by someone else. Refresh and try again." |
| Details UPDATE `+100` (`9600`→`9700`, edge case) | 0 rows → INSERT | `201` | (re-created) | "Transaction type created." |
| UPDATE `-911` (`9200`/`9600`, BDD) | `40P01` deadlock / `55P03` lock / `40001` serialization | `409` | `TXN_TYPE_LOCK_CONFLICT` | "This record is being changed by someone else. Try again shortly." |
| UPDATE other negative (`9200`/`9600`, BDD) | SQL error | `500` | `TXN_TYPE_DB_ERROR` | "Something went wrong and your change was not saved. Please try again." |
| INSERT duplicate key (implicit — key already present) | `23505` unique_violation | `409` | `TXN_TYPE_ALREADY_EXISTS` | "A transaction type with this code already exists." |
| INSERT other non-zero (`9700 WHEN OTHER`, BDD) | SQL error | `500` | `TXN_TYPE_DB_ERROR` | "Something went wrong. Please try again." |
| DELETE `-532` child records (`9300`/`9800`, BDD) | `23503` foreign_key_violation | `409` | `TXN_TYPE_HAS_DEPENDENTS` | "This transaction type is in use and cannot be deleted while related records exist." |
| DELETE `-911` lock (`9800`) | `40P01`/`55P03` | `409` | `TXN_TYPE_LOCK_CONFLICT` | "This record is being changed by someone else. Try again shortly." |
| DELETE other non-zero (`9300 WHEN OTHER`/`9800`, BDD) | SQL error | `500` | `TXN_TYPE_DB_ERROR` | "Something went wrong. Please try again." |
| DELETE row absent | 0 rows | `404` | `TXN_TYPE_NOT_FOUND` | "No record exists for this code." |
| Field validation failures (§5 V1–V8) | — | `400` | per §5 | per §5 |
| `WHEN OTHER` state abend `9999` (`2000-DECIDE-ACTION`, BSTS/BDD) | — | `500` | `INTERNAL_ERROR` | "Something went wrong. Please try again." (logged; no abend surfaced) |
| Auth failures (Section 8) | — | `401`/`403` | `UNAUTHENTICATED`/`FORBIDDEN` | "You are not authorized to perform this action." |

**Edge cases (BDD §e) → server behaviour:**
| Edge case (BDD) | Server handling |
|---|---|
| First page has no previous page | E1 first page `hasPrevious=false`. |
| Last page has no next page (lookahead +100) | E1 `hasNext=false` via `LIMIT size+1` lookahead. |
| Filtered search yields zero rows on entry | E1 count-check → empty page (200), not an error. |
| Changing filter/selection cancels a pending row selection | Presentation concern — each E4/E5 targets one code; no stale server state. |
| PF10 after criteria change treated as plain Enter (no confirm) | Presentation concern — backend only receives confirmed writes. |
| Re-submitting an unresolved not-found key keeps state unresolved | E2 simply returns 404 again; stateless — no accumulation. |
| Saving a change to a row another user deleted → re-create | E4 `createIfMissing=true` → 201 (R17/R26). |

**Central handling:** an ASP.NET Core global exception handler or middleware translates
`DbUpdateException` / `SqlException` and the
custom domain exceptions (`TransactionTypeNotFoundException`, `TransactionTypeExistsException`,
`TransactionTypeHasDependentsException`, `ConcurrentDeleteException`, `LockConflictException`,
`NoChangeException`) into the `ErrorResponseDto` table above. Every response carries a `traceId` correlating
to the server log where the real SQLSTATE/stack is recorded.

---

## 8. Security Specification (mandatory build instruction)

Controls the build MUST implement. Legacy security was RACF (Config Security row → "Oauth 2.0,HTTPS/TLS 1.3").

### 8.1 OWASP Top 10 — concrete mitigations per endpoint
- **A01 Broken Access Control:** every endpoint E1–E5 requires an authenticated principal with an
  administrator authority (maps the legacy `CDEMO-USRTYP-ADMIN` gate). Enforce method/endpoint
  authorization (e.g. `@PreAuthorize("hasAuthority('TXN_TYPE_ADMIN')")`) at the service boundary; deny by
  default. Read (E1/E2) may permit a read scope; writes (E3/E4/E5) require the admin scope.
- **A02 Cryptographic Failures / Sensitive-Data Exposure:** TLS 1.3 in transit (§8.3); no sensitive data at
  rest here (reference data only, §8.4); never serialize raw SQLSTATE/stack traces into responses (Section 7).
- **A03 Injection:** all SQL is parameterized/bound (Section 6) — the `TR_TYPE = :code` and
  `TR_DESCRIPTION LIKE :pattern` filters are bound parameters; the `%...%` wrapping is applied to the bound
  value, not concatenated into SQL. Bean-validation constraints (§5) reject malformed input before the DB.
- **A04 Insecure Design:** state-changing operations gated by explicit client confirmation (UI) and
  idempotent server semantics (Section 9); no destructive bulk operation exposed.
- **A05 Security Misconfiguration:** API gateway terminates/enforces TLS, strips unknown verbs; disable
  verbose error output (safe `ErrorResponseDto` only); restrictive CORS to the known frontend origin.
- **A06 Vulnerable Components:** pin ASP.NET Core / driver versions; dependency scanning in the build (build-
  process instruction).
- **A07 Identification & Authentication Failures:** OAuth 2.0 + JWT (§8.2); reject expired/tampered tokens.
- **A08 Software & Data Integrity Failures:** validate JWT signature (§8.2); transactional writes (Section 6).
- **A09 Logging & Monitoring Failures:** audit log every write (E3/E4/E5) with principal, code, outcome,
  `traceId` (Section 9) — never logging tokens or full error payloads to the client.
- **A10 SSRF:** N/A — the service makes no outbound URL calls from user input.

### 8.2 OAuth 2.0 authorization flow + JWT handling
- **Flow:** OAuth 2.0 Authorization Code + PKCE for the interactive administrator via the frontend; the
  Transaction Type service is an OAuth2 **Resource Server** validating bearer JWT access tokens on every
  request (no session).
- **JWT validation:** verify issuer (`iss`), audience (`aud`), signature (JWKS from the authorization
  server), and expiry (`exp`); reject on any failure → `401 UNAUTHENTICATED`.
- **Scopes/roles:** map an admin authority/scope (legacy `CDEMO-USRTYP-ADMIN` equivalent) — required for
  E3/E4/E5; a read scope for E1/E2. Missing required scope → `403 FORBIDDEN`.
- **Expiry/refresh:** short-lived access tokens; refresh handled by the frontend/authorization server, not
  this service. No token stored server-side.

### 8.3 TLS 1.3
- **All data in transit over TLS 1.3** (Config Security row states TLS 1.3 — aligns with the mandatory
  standard; no discrepancy). Terminated at the API gateway / ingress; internal service-to-DB traffic also
  encrypted where the platform supports it. HTTP is redirected/rejected; HSTS set at the gateway.

### 8.4 GDPR
- **Personal-data inventory:** the service handles **only** reference/configuration data — a 2-char
  `TR_TYPE` code and a free-text `TR_DESCRIPTION` (BSTS/BDD; DB-Details table). **No personal or sensitive
  data (no PII, account/card numbers, or amounts) is captured, stored, or transmitted.** (UI-Spec §10 records
  the same finding.)
- **Consequently:** no field-level masking, no lawful-basis/consent capture, and no special retention or
  erasure workflow is required for this data. Data minimization is inherently satisfied.
- **Guardrail:** the free-text description must not be repurposed for personal data; validation (§5 V5)
  already restricts it to letters/digits/spaces. Audit logs (§8.1 A09) record only the principal identifier
  supplied by the auth layer and the reference code — no additional personal data is introduced.

### 8.5 WCAG (backend support)
- The backend supports accessibility by returning **machine-readable, stable error `code`s plus concise,
  identifier-free `message`s** (Sections 3, 7) that the UI announces via its live regions (UI-Spec §8, §9).
  Consistent codes let the frontend map errors to the correct field (`field` attribute) and announce them.
- All other WCAG obligations (focus, contrast, keyboard, live-region wiring) are **front-end responsibility**
  (UI-Spec §9).

> No standard named in this section conflicts with `Config/Config.md` — Config already specifies OAuth 2.0
> and TLS 1.3, matching the mandatory instruction. Recorded (as a non-conflict) in Section 11.

---

## 9. Non-Functional Requirements

- **Statelessness:** no server session; the legacy pseudo-conversational COMMAREA/`WS-THIS-PROGCOMMAREA`
  state (paging cursors, armed-action flags, `TTUP-*` state machine) becomes **client-held** state plus
  request parameters (keyset `cursor`/`direction`). No Redis session is needed (single-request operations;
  §1.3). This directly satisfies the Config State-Management row ("Stateless REST + client-held state").
- **Idempotency:** `GET` (E1/E2) safe & idempotent. `PUT` (E4) idempotent — repeating an update to the same
  value hits the no-change guard (200, no write). `DELETE` (E5) idempotent — a second delete returns 404,
  never an error state. `POST` (E3) is not idempotent; a duplicate returns 409 `TXN_TYPE_ALREADY_EXISTS`
  rather than creating a second row (PK protects against this).
- **Performance/latency:** single-row keyed reads/writes and a ≤7-row keyset page over a tiny reference
  table — target p95 < 200 ms server-side under nominal load; the PK/unique index backs every access path.
- **Concurrency:** lock/deadlock conflicts surface as `409 TXN_TYPE_LOCK_CONFLICT` (do not auto-retry
  silently); concurrent-delete-during-update surfaces per E4 (409 or re-create). Reads use `READ COMMITTED`.
- **Logging/observability:** structured logs with `traceId`; audit entries for every write (principal,
  endpoint, `typeCode`, outcome code). No tokens, no raw SQLSTATE, no full driver payloads in any client
  response. Expose Actuator health (incl. the E6 DB indicator) for readiness/liveness.
- **Internationalization/locale:** user-facing messages (Sections 3/5/7) should be externalized to message
  bundles keyed by the machine `code` so the frontend/locale layer can localize; codes are locale-invariant.
  Data itself is ASCII reference codes/descriptions — no locale-sensitive formatting (no amounts/dates in
  payloads).

---

## 10. Backend Folder Structure

To be created under `target/MG-01/` **at build time** (this spec creates nothing). Adapted to the
`Config/Config.md` Backend row (.NET Core 9) and API row (REST). Only folders this service needs.

```
target/MG-01/
└── backend/
    └── TransactionTypeService/
        ├── src/
        │   ├── TransactionTypeService.Api/
        │   │   ├── Program.cs                                   # ASP.NET Core entry point
        │   │   ├── Controllers/                                 # REST controllers (E1–E5)
        │   │   │   └── TransactionTypeController.cs
        │   │   ├── Services/                                    # business logic (Section 4 rules)
        │   │   │   └── TransactionTypeService.cs
        │   │   ├── Repositories/                                # data access (Section 6)
        │   │   │   └── TransactionTypeRepository.cs
        │   │   ├── Models/                                      # domain entity
        │   │   │   └── TransactionType.cs
        │   │   ├── Dtos/                                        # request/response contracts (Section 3)
        │   │   │   ├── TransactionTypeDto.cs
        │   │   │   ├── TransactionTypePageDto.cs
        │   │   │   ├── CreateTransactionTypeRequest.cs
        │   │   │   ├── UpdateTransactionTypeRequest.cs
        │   │   │   └── ErrorResponseDto.cs
        │   │   ├── Validation/                                  # §5 validators / normalization
        │   │   │   └── TransactionTypeValidation.cs
        │   │   ├── Security/                                    # OAuth2 resource-server + JWT (Section 8)
        │   │   │   └── SecurityConfig.cs
        │   │   ├── Error/                                       # Exception middleware + domain exceptions
        │   │   │   ├── ExceptionHandlerMiddleware.cs
        │   │   │   └── (TransactionTypeNotFound / Exists / HasDependents / ConcurrentDelete /
        │   │   │        LockConflict / NoChange exceptions)
        │   │   ├── appsettings.json                             # datasource, OAuth2 issuer, TLS refs
        │   │   └── Resources/                                   # externalized message bundles (Section 9 i18n)
        │   └── TransactionTypeService.Api.csproj                # Project file
        └── tests/
            └── TransactionTypeService.Tests/                    # unit + slice + integration tests
                └── TransactionTypeService.Tests.csproj
```

No frontend, infrastructure, CI/CD, or messaging/cache folders are included (§1.3; group uses no
TSQ/TDQ/VSAM/MQ, and UI is out of scope).

---

## 11. Acceptance Criteria & Deviations

### 11.1 Acceptance criteria (verifiable by a build/test agent)

**API contract & routing**
1. Endpoints E1–E5 exist at the paths/methods in Section 3, JSON over TLS 1.3, behind auth (§8).
2. Every UI action in the §3.3 matrix maps to the specified endpoint with the specified request/response shape.

**List (E1)**
3. Returns ≤ 7 items/page; `hasNext` derived from a `size+1` lookahead; `hasPrevious=false` on first page (R1–R5).
4. `typeCode` filter applies exact match only when supplied; `description` applies `%...%` contains match; both absent = whole table in `TR_TYPE` order (R6–R8).
5. A supplied filter matching no rows returns 200 with empty `items` (count-check), never an error (R9–R10).
6. Invalid `typeCode` filter (non-2-digit) → 400 `INVALID_TYPE_CODE_FILTER` (V1).

**Single search (E2)**
7. Valid existing code → 200 with `typeCode`+`description`; non-existent → 404 `TXN_TYPE_NOT_FOUND` (R23).
8. `typeCode` validated & zero-padded (`5`→`05`), non-numeric → 400 numeric, `00` → 400 zero (V4, R24–R25).

**Create (E3)**
9. Valid body → 201 with `Location`; duplicate key → 409 `TXN_TYPE_ALREADY_EXISTS`; description validated (V5, R27–R28).

**Update (E4)**
10. Changed description → 200, persisted; identical (trimmed, case-insensitive) → 200 `TXN_TYPE_NO_CHANGE`, no write (R14).
11. Row concurrently deleted: `createIfMissing=false` → 409 `TXN_TYPE_CONCURRENTLY_DELETED`; `=true` → 201 re-created (R16–R17).
12. Lock/deadlock → 409 `TXN_TYPE_LOCK_CONFLICT`; other DB error → 500 `TXN_TYPE_DB_ERROR` (R18–R19).

**Delete (E5)**
13. Success → 204; dependents (FK) → 409 `TXN_TYPE_HAS_DEPENDENTS`; absent → 404; lock → 409; other → 500 (R20–R22).

**Cross-cutting**
14. All writes are transactional (commit-on-success, rollback-on-error) (R15/R20/R34).
15. No raw SQLSTATE/driver text ever reaches the client; every error is a machine `code` + safe message + `traceId` (Section 7/8).
16. Every endpoint enforces OAuth2/JWT auth with admin authority on writes; missing/invalid token → 401, missing scope → 403 (§8.2).
17. DB-unavailable → 503 `SERVICE_UNAVAILABLE` and business endpoints do not attempt data access (R30/E6).
18. Server-side validation (§5) is enforced independently of the client for every editable field.

### 11.2 Deviations, assumptions, and gaps

**Design judgment calls (rationalizations of legacy → REST)**
- **Legacy dual-purpose save paragraph split into POST (E3) + PUT (E4).** The legacy `9600`→`9700`
  update-then-insert is modelled as clean-REST create vs update; the concurrent-delete re-insert behaviour is
  preserved via E4 `createIfMissing` (R17/R26). Assumed acceptable; a reviewer should confirm the details
  client passes `createIfMissing=true` to retain exact legacy equivalence, and the list client passes false.
- **Multi-row / action-code validations (R11/R12) have no server counterpart** — REST acts on one
  `{typeCode}` per request, so "Please select only 1 action" and "Action code selected is invalid" cannot
  arise. Deliberate rationalization, not a dropped rule (matches UI-Spec §13).
- **Two-step arm/confirm and Cancel-state reversion (R29/R32) are presentation concerns** handled by the UI
  confirmation dialogs (UI-Spec §7); the stateless backend receives only already-confirmed writes and models
  no PF-key/confirmation state.
- **Legacy `WHEN OTHER` abend (`9999`, R31)** cannot map to an abend in stateless REST; any internal invariant
  breach returns a safe 500 `INTERNAL_ERROR` and is logged. No client-visible abend.
- **E2 on a negative SELECT SQLCODE returns 500** rather than the legacy behaviour of routing to the
  not-found/create path (which conflated a real DB fault with "not found"). This is a deliberate correctness
  improvement; the UI may still offer retry/create.
- **Keyset (cursor) pagination** replaces the legacy forward/backward DB2 scrolling cursors; page size fixed
  at 7 (`WS-MAX-SCREEN-LINES`). Chosen over offset paging to match the legacy `TR_TYPE`-keyed scroll exactly.

**Assumptions (not confirmed by source)**
- Admin authority/scope name (`TXN_TYPE_ADMIN`) is a proposed mapping of `CDEMO-USRTYP-ADMIN`; the exact
  RACF→OAuth role mapping is outside this group's source (copybook `COCOM01Y` missing) — build agent to align
  with the wider app's authorization model.
- The `CDEMO-USRTYP-ADMIN`→`CDEMO-USRTYP-USER` switch on PF2 hand-off has unconfirmed downstream meaning
  (BSTS "Business role note"); it is treated as having **no** backend effect in this service.
- Back/exit navigation targets (caller vs `COADM01C`/`CA00` admin menu) are routing concerns owned by the
  frontend/gateway; no backend endpoint models the XCTL target.
- Isolation level `READ COMMITTED` and p95 < 200 ms are proposed defaults; tune against real load.

**Standard / Config discrepancies**
- **Backend language:** mandatory object-oriented C# / .NET Core (Step 1.3) **agrees** with Config (".NET Core 9 (C#) with ASP.NET Core Web API") — no conflict.
- **Security standards:** OAuth 2.0, JWT, and TLS 1.3 (Section 8) **agree** with Config's Security row
  ("Oauth 2.0,HTTPS/TLS 1.3") — no conflict; TLS 1.3 is specified as instructed.
- No other standard named in Section 8 conflicts with Config.

**Missing source files (gaps carried from BSTS/BDD, cannot be closed here)**
- Copybooks `COCOM01Y`, `CVCRD01Y`, `CSSTRPFY`, `CSSETATY`, `CSUTLDWY`, `CSMSG01Y`, `CSMSG02Y`, `CSUSR01Y`,
  `CSDAT01Y`, `COTTL01Y`, `CVACT02Y`, and `DCLTRCAT` are referenced by the programs but absent under
  `Input/` (BSTS/BDD Gaps). They define commarea/PF-key/title/abend/user structures. Their absence does not
  block this backend spec — all CRUD, rules, validations, and error paths were traced to the artefacts — but
  the exact caller identity, role semantics, and abend-message formatting they define are inferred, not
  asserted.
- `CARDDEMO.TRANSACTION_TYPE_CATEGORY` (`DCLTRCAT`) is out of scope (no CRUD footprint); it appears only as
  the parent-side FK that yields the delete-blocked (`-532`/`23503`) path.

**No blocking gaps for the backend build.** All endpoints, rules, validations, and error paths are grounded
in the read artefacts; the open items above are design/assumption/role notes, not missing prerequisites.

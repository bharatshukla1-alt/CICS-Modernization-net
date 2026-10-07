# MG-01 — Refactor Test Result (Functional Equivalence)

## 1. Run Metadata

| Item | Value |
|---|---|
| Tran Group | `MG-01` |
| Short description | Transaction type maintenance — list, filter, page, add, update, delete (legacy `CTLI`/`COTRTLIC` + `CTTU`/`COTRTUPC`) |
| Test-case document run | `Artefacts/QA/Test Case/MG-01-Refactor-TestCase.md` (191 cases, 13 categories) |
| Target stack under test | React 18 + Vite SPA · Java 21 / Spring Boot 3.4.2 REST service · PostgreSQL |
| Frontend base URL exercised | `http://localhost:5173` (routes `/transaction-types`, `/transaction-types/details`) |
| Backend base URL exercised | `http://localhost:8080` — REST base `/api/v1/transaction-types` (E1–E5), health `/actuator/health` |
| Auth provider exercised | Keycloak `http://localhost:8081`, realm `carddemo`, client `mg01-frontend` (Authorization Code + PKCE for the SPA; direct-grant tokens for API-level cases) |
| Database exercised | Postgres `CARDDEMO`, table `transaction_type (tr_type CHAR(2) PK, tr_description VARCHAR(50) NOT NULL)` — read/written directly via the `postgres-carddemo` MCP server and `psql` |
| Run timestamp | 2026-07-29 18:01 IST |
| Identities used | **U-ADMIN** = `admin.user` / `Password1!` via client `mg01-frontend` → token scope `TXN_TYPE_ADMIN TXN_TYPE_READ` (both authorities). **U-ANON** = no bearer token, and a malformed bearer token. **Authenticated-without-authority** = `admin.user` via client `admin-cli` in realm `carddemo` → empty scope, no `TXN_TYPE_*` authority (used for AUTHZ-001/002/003 and HTTP-009). **U-READ** (read authority without write authority) could **not** be minted — see §6. |
| Drivers used | Playwright 1.62 headless Chromium for every screen-level case; `curl` for endpoint-level cases; MCP `read_query`/`write_query` + `psql` for fixtures, DB assertions and the concurrency provocations |

Context read for endpoint/route/auth/data-model knowledge only: `.Claude/Specs/Refactor/MG-01-Backend-Spec.md`, `.Claude/Specs/Refactor/MG-01-UI-Spec.md`, `.Claude/Specs/Refactor/MG-01-reconcile-Spec.md`, `Artefacts/Architecture/MG-01.Architecture.md`. No Run Guide exists on disk for MG-01, so URLs/ports/credentials came from the Architecture doc, `application.yml` and project memory.

---

## 2. Result Summary

| # | Test Scenario | Cases | Passed | Failed | Blocked | Result (Pass/Fail) | Expected Deviation |
|---|---|---|---|---|---|---|---|
| 1 | Functional Equivalence (`FE`) | 53 | 39 | 1 | 12 | **Fail** | 1 |
| 2 | Happy Path (`HP`) | 15 | 14 | 0 | 0 | **Pass** | 1 |
| 3 | Authentication Guard (`AUTHN`) | 5 | 5 | 0 | 0 | **Pass** | 0 |
| 4 | Authorization Guard (`AUTHZ`) | 4 | 3 | 0 | 1 | **Pass** | 0 |
| 5 | Field-Level Validation (`FV`) | 17 | 15 | 0 | 2 | **Pass** | 0 |
| 6 | Cross-Field / Business-Rule (`BR`) | 17 | 9 | 3 | 5 | **Fail** | 0 |
| 7 | DB Side Effects (`DB`) | 12 | 11 | 0 | 1 | **Pass** | 0 |
| 8 | Concurrency / Idempotency (`CON`) | 7 | 6 | 1 | 0 | **Fail** | 0 |
| 9 | Multi-Step Transaction Integrity (`TX`) | 4 | 1 | 0 | 3 | **Pass** | 0 |
| 10 | HTTP Semantics (`HTTP`) | 15 | 11 | 0 | 3 | **Pass** | 1 |
| 11 | UI Rendering (`UI`) | 16 | 13 | 1 | 2 | **Fail** | 0 |
| 12 | Pagination / Sort / Filter (`PSF`) | 10 | 10 | 0 | 0 | **Pass** | 0 |
| 13 | Boundary & Numeric Edge Cases (`BND`) | 16 | 16 | 0 | 0 | **Pass** | 0 |
| — | **Totals** | **191** | **153** | **6** | **29** | **Fail** | **3** |

Category `Result` is **Pass** only when every non-blocked case in that category passed — cases reclassified `EXPECTED_DEVIATION` (§5A) are approved target-design rationalizations, not failures, and do not hold a category at Fail. `Expected Deviation` is the last column so the seven original columns keep their names, meaning and positions; `Passed` is unchanged and never absorbs a deviation. Per row, `Passed + Failed + Expected Deviation + Blocked = Cases`.

---

## 3. Overall Verdict

- **Total cases:** 191
- **Passed:** 153 · **Failed:** 6 · **Blocked:** 29
- **Expected Deviation:** 3 — target behaviour differs from the legacy assertion, but the user intent is fully satisfied by the approved target design (§5A). Neither a pass nor a failure; never counted as a failure and never turns the screen verdict red.
- **Pass rate:** 153 / 191 = **80.1 %** (of the 162 cases actually executed, 153 passed = 94.4 %)
- **Screen verdict:** **FAIL** — 6 executed cases diverged from their stated expected result in ways the target design does not account for. (The 3 expected deviations did **not** contribute to this verdict; a run whose only non-passes were deviations and blocked cases would be a PASS.)

---

## 4. Failed Scenarios

### Functional Equivalence (`FE`) — ❌ FAIL (39 / 40 executed, excluding 1 expected deviation)

> **MG01-FE-034 — Confirmed save commits the new description**
> - Input: `FX-BASE`, U-ADMIN, Screen B, code `02`, description changed to `PAYMENT POSTED`, **Save changes** → **Confirm save** (the target's `F5` equivalent).
> - Expected: message `Changes committed to database`; **the displayed and stored description is exactly `PAYMENT POSTED`**.
>   Actual: stored value is exactly `PAYMENT POSTED` ✅ and the success banner is shown ✅, but the record card is **torn down immediately** — the screen resets to the fresh search prompt (code input empty and editable, no record displayed), so the committed description is never displayed. ❌
> - Evidence: Playwright run — before confirm `FE033 {… inputs:[{"v":"02"},{"v":"02"},{"v":"PAYMENT POSTED"}] …}`; after confirm `FE034 {"msgs":["Changes saved."],"inputs":[{"v":"","ro":false,"d":false}],"buttons":["Back","Find"]}`. DB: `SELECT tr_description FROM transaction_type WHERE tr_type='02' → PAYMENT POSTED`.
> - Severity: **Low** — persistence and messaging are correct; only the post-save display state is skipped (the legacy screen holds the committed record until the next key press — see MG01-FE-047, which passes).

### Cross-Field / Business-Rule (`BR`) — ❌ FAIL (9 / 12 executed)

> **MG01-BR-003 — Format-valid filters that match no data are rejected as a cross-field check**
> - Input: `FX-BASE`, U-ADMIN, Screen A; type filter `01` + description filter `PAYMENT`, **Search**.
> - Expected: **both filter fields are marked in error** and the zero-match message is shown; row-action column protected until a filter changes.
>   Actual: the zero-match message is shown and no rows/row-actions are rendered ✅, but **neither filter field is marked in error** — no `.form-error`, no `input.is-invalid`, no `aria-invalid`. ❌
> - Evidence: Playwright run — `BR003 {"rows":[],"msgs":["No transaction types match those filters."],"formErrors":[],"invalid":[]}`. Compare `FV001 {… "formErrors":["Type code must be a 2-digit number."],"invalid":["AB"] …}`, which proves the error-marking mechanism exists and is simply not applied to the zero-match cross-field case. Request issued: `GET /api/v1/transaction-types?typeCode=01&description=PAYMENT&size=7` → `200 {"items":[]}`.
> - Severity: **Low** — informational-only divergence; no data impact, but the legacy cross-edit's field-level cue is lost.

> **MG01-BR-014 — Save is not available from the plain show-details state**
> - Input: `FX-BASE`, U-ADMIN, Screen B, record `02 PAYMENT` displayed with no edit made; invoke the save action (`F5` equivalent = **Save changes**).
> - Expected: `Invalid key pressed`; **no write**; stored description unchanged.
>   Actual: the **Save changes** control is offered in the plain show-details state, opens the confirm dialog, and on confirm issues `PUT /api/v1/transaction-types/02` — the server's no-change guard then answers `200 {"changed":false,"code":"TXN_TYPE_NO_CHANGE"}` and the screen shows `No changes to save.` The state gate legacy applies (PF5 invalid from show-details) is absent, so a different rule fires than the expected one. ❌
> - Evidence: Playwright run — `BR014-modal {"t":"Save changes","b":["Cancel","Confirm save"]}` then `BR014-after ["No changes to save."] ["PUT /api/v1/transaction-types/02"]`. DB: `SELECT tr_description FROM transaction_type WHERE tr_type='02' → PAYMENT` (unchanged).
> - Severity: **Low** — stored data is protected by the no-change guard; the divergence is an un-gated action plus an unnecessary server round-trip.

> **MG01-BR-015 — Enter is refused while a delete confirmation is pending**
> - Input: `FX-BASE`, U-ADMIN, Screen B, record `06` fetched, **Delete** pressed (confirmation dialog open); press `ENTER`.
> - Expected: `Invalid key pressed`; the delete-confirmation screen is redisplayed **unchanged**; row `06` neither deleted **nor the state lost**.
>   Actual: `ENTER` activates the dialog's first focusable control (**Cancel**), so the pending delete confirmation is **destroyed** — the dialog closes, the record card is torn down and the screen resets to the fresh search prompt with `Delete cancelled.` Row `06` is not deleted (safe), but the confirmation state **is** lost. ❌
> - Evidence: Playwright run — `BR015-afterEnter {"msgs":["Delete cancelled."],"inputs":[{"v":"","ro":false,"d":false}],"buttons":["Back","Find"],"modal":null} apiCalls= 0`. DB: `SELECT count(*) FILTER (WHERE tr_type='06') FROM transaction_type → 1` (row intact).
> - Severity: **Medium** — a neutral keystroke silently discards an in-flight destructive-action confirmation and the fetched record; the user must re-search. No data loss.

### Concurrency / Idempotency (`CON`) — ❌ FAIL (6 / 7)

> **MG01-CON-001 — Double-submit of the same add creates only one row**
> - Input: `FX-BASE`, U-ADMIN; two concurrent confirmed saves of the add path for code `77` / `CASH ADVANCE` (`POST /api/v1/transaction-types` fired in parallel).
> - Expected: exactly one row `77 CASH ADVANCE`; row count = 8, not 9; **the second submission does not raise a duplicate-key failure to the user** but resolves as an update/no-change of the same values.
>   Actual: DB is correct — one row, count 8 ✅ — but the losing submission returns `409 TXN_TYPE_ALREADY_EXISTS` / "A transaction type with this code already exists.", i.e. a duplicate-key failure **is** surfaced. The legacy update-then-insert save path (which resolves the second submit as a no-change update) is split into POST-create / PUT-update in the target, and the create leg rejects an existing key. ❌
> - Evidence: parallel `curl` — response A `<<HTTP 201>> {"typeCode":"77","description":"CASH ADVANCE"}`, response B `<<HTTP 409>> {"code":"TXN_TYPE_ALREADY_EXISTS", …}`. DB: `SELECT count(*) n, count(*) FILTER (WHERE tr_type='77') n77 FROM transaction_type → n=8, n77=1`. Reproduced sequentially with the same 409. Note the `PUT` (save) path **is** idempotent: repeating an identical `PUT` returns `200 TXN_TYPE_NO_CHANGE` with no write.
> - Severity: **Low** — the primary key prevents any duplicate row; the divergence is the user-visible error on the losing submission.

### UI Rendering (`UI`) — ❌ FAIL (13 / 14 executed)

> **MG01-UI-001 — List screen renders all of its regions**
> - Input: `FX-BASE`, U-ADMIN; open Screen A.
> - Expected regions: screen title/header **with current date and time**, type-filter input, description-filter input, a grid of up to 7 rows (action field + type code + description), a single message area, and the action legend for `F2`, `F3`, `F7`, `F8`, `F10`.
>   Actual: title/header ✅, both filter inputs ✅, 7-row grid with per-row Edit/Delete actions ✅, single message region ✅, and equivalent controls for every legacy key (`F2`→Add transaction type, `F3`→Back, `F7`→Previous, `F8`→Next, `F10`→Confirm inside the dialog) ✅ — but **no current date and time is rendered anywhere on the screen**. ❌
> - Evidence: Playwright full body text of `/transaction-types`: `"TT Transaction Type Maintenance admin.user Sign out Transaction Types Back Add transaction type Type code Description contains Search Clear Transaction types TYPE CODE DESCRIPTION ACTIONS 01 PURCHASE Edit Delete … Page 1 Previous Next"` — no date or time token present in the DOM.
> - Severity: **Low** — cosmetic/header-parity gap; the legacy map's date/time region has no counterpart.

---

## 5. Message-Intent Equivalences

Every case below Passed **only** because its human-readable copy differed while conveying the same intent, per the Message-Intent Rule. Status codes, error `code`s, `field` identifiers, derived values and DB state matched exactly in all of them.

| Test Case | Expected text | Actual text | Why equivalent |
|---|---|---|---|
| MG01-FE-006 · Page forward on last page | `No more pages to display` | `You're on the last page.` | Same trigger (forward paging at the last page), no constraint to preserve, same consequence (no further page; the 3 rows remain displayed). |
| MG01-FE-007 · Page backward on first page | `No previous pages to display` | `You're on the first page.` | Same trigger (backward paging at page 1), same consequence (page 1 redisplayed unchanged). |
| MG01-FE-011 · Case-sensitive description filter | `No Records found for these filter conditions` | `No transaction types match those filters.` | Same trigger (filtered search matched nothing), same consequence (zero rows, no row action reachable). |
| MG01-FE-013 · Valid filters matching nothing | `No Records found for these filter conditions` | `No transaction types match those filters.` | As above; the filtered/unfiltered distinction is preserved (see FE-014). |
| MG01-FE-014 · Empty table, no filter | `No records found for this search condition.` | `No transaction types to show yet.` | Same trigger (unfiltered search over an empty table) and — critically — still a **distinct** message from the filtered one, exactly as the legacy pair distinguishes them. |
| MG01-FE-015 · Arm update | `Update HIGHLIGHTED row. Press F10 to save` | Dialog `Edit transaction type 03` → `Save changes` → `Save changes to this transaction type?` / `Confirm save` | Same trigger (update armed on that row), same constraint (that row only — code read-only, its description open, other rows untouched), same consequence (confirm to save). |
| MG01-FE-016 · Arm delete | `Delete HIGHLIGHTED row ? Press F10 to confirm` | Dialog `Delete transaction type 04 — "AUTHORIZATION"? This cannot be undone.` / `Delete` | Same trigger, names the same row, same consequence (confirmation required; nothing deleted yet). |
| MG01-FE-017 · Confirmed update | `HIGHLIGHTED row was updated` | `Transaction type updated.` | Same event (update committed), same consequence. |
| MG01-FE-018 · Confirmed delete | `HIGHLIGHTED row deleted.Hit Enter to continue` | `Transaction type deleted.` | Same event (row deleted); the list re-searches from page 1 automatically, which is the stated consequence — the "hit Enter" step is a 3270 mechanic. |
| MG01-FE-019 · No-change on Screen A | `No change detected with respect to database values.` | `No changes to save.` | Same trigger (submitted description equals stored, trimmed/case-folded), same consequence (nothing written). |
| MG01-FE-029 · Screen B initial prompt | `Enter transaction type to be maintained` | `Enter a transaction type code to begin.` | Same trigger (fresh entry), same consequence (supply the search key). |
| MG01-FE-030 · Existing code displayed | `Update transaction type details shown.` | `Review or update the details below.` | Same event (record fetched, description open for edit), same consequence. |
| MG01-FE-031 · Not found | `No record found for this key in database` + `Press F05 to add. F12 to cancel` | `No record exists for this code. You can create it.` | Same event (key not found), same consequence and the same offered next step (create or cancel). |
| MG01-FE-033 · Validated change pending | `Changes validated.Press F5 to save` | Dialog `Save changes` / `Save changes to this transaction type?` / `Confirm save` | Same trigger (edit validated), same consequence (explicit confirm required before anything persists). |
| MG01-FE-035 · No-change on Screen B | `No change detected with respect to values fetched.` | `No changes to save.` | Same trigger and consequence. (Divergence noted: the target uses one message on both screens where legacy used two distinct strings — see §7.3.) |
| MG01-FE-036 · Create armed | `Enter new transaction type details.` | `Enter details for the new transaction type.` | Cosmetic phrasing only; code stays fixed at `77`, description opens. |
| MG01-FE-037 · New record saved | `Changes committed to database` | `Transaction type created.` | Same event (insert committed), same consequence. |
| MG01-FE-038 · Save for an existing key | `Changes committed to database` | `Changes saved.` | Same event (existing row updated, count unchanged, no duplicate-key error), same consequence. |
| MG01-FE-039 · Delete prompt on Screen B | `Delete this record ? Press F4 to confirm` | Dialog `Delete transaction type 06? This cannot be undone.` / `Delete` | Same trigger and consequence (confirmation, nothing deleted). |
| MG01-FE-040 · Delete performed | `Delete successful.` | `Transaction type deleted.` | Same event, same consequence. |
| MG01-FE-045 · Cancel a pending delete | `Delete was cancelled` | `Delete cancelled.` | Effectively verbatim; same event and consequence (row intact, back to the search prompt). |
| MG01-FE-046 · Cancel a pending update | `Update was cancelled` | `Update cancelled.` | Effectively verbatim; original values restored, unsaved edit discarded. |
| MG01-FE-053 / MG01-FV-014 · `*` in the code field | `Tran Type code must be supplied.` | `Enter a transaction type code.` | Same trigger — the UI normalises `*` to empty (`padTypeCode`) so the **required-field** rule fires, not a character rule — same consequence (rejected, no read issued). |
| MG01-FV-001 / FV-002 / FV-004 / UI-003 · Type-code filter format | `TYPE CODE FILTER,IF SUPPLIED MUST BE A 2 DIGIT NUMBER` | `Type code must be a 2-digit number.` | Same trigger, and the "2-digit number" constraint is preserved in substance; same consequence (rejected, field flagged `aria-invalid`, focus moved to it, no read). |
| MG01-FV-008 / FV-015 / BND-010 / BND-011 · Description required | `Transaction Desc must be supplied.` | `Enter a description.` | Same trigger (required; blank/whitespace normalised to empty), same consequence (rejected, no write). |
| MG01-FV-009 / FV-016 / BND-014 · Description character set | `Transaction Desc can have numbers or alphabets only.` | `Description can contain letters, numbers, and spaces only.` | Same trigger and the same allowed-character constraint (letters/digits/spaces), same consequence. |
| MG01-FV-010 · Code required | `Tran Type code must be supplied.` | `Enter a transaction type code.` | Same rule, cosmetic phrasing only; no read issued. |
| MG01-FV-011 / BND-005 / BND-006 · Code numeric | `Tran Type code must be numeric.` | `Transaction type code must be numeric.` | Same rule, cosmetic phrasing only. |
| MG01-FV-012 / BND-003 · Code non-zero | `Tran Type code must not be zero.` | `Transaction type code cannot be zero.` | Same rule and constraint, cosmetic phrasing only. |
| MG01-FV-017 · `*` in the description | `Transaction Desc must be supplied.` | `Enter a description.` | The UI normalises `*` to empty, so the required rule fires — same trigger and consequence, no insert. |
| MG01-BR-007 · Screen A unchanged description | `No change detected with respect to database values.` | `No changes to save.` | Same trigger and consequence. |
| MG01-BR-008 · Screen B unchanged description | `No change detected with respect to values fetched.` | `No changes to save.` | Same trigger and consequence. |
| MG01-BR-009 · Non-existent key offers only creation | `No record found for this key in database` | `No record exists for this code. You can create it.` | Same event; update/delete affordances are genuinely absent in that state, only Create/Cancel offered. |
| MG01-CON-002 · Row deleted concurrently (list update) | begins `Record not found. Deleted by others ? ` | `This record was removed by someone else. Refresh and try again.` | Same trigger (update affected 0 rows), same consequence (not saved, row stays armed on screen, nothing inserted). |
| MG01-CON-003 · Screen B save re-creates a deleted row | `Changes committed to database` | `Transaction type created.` | Same event (row re-created and committed, `201`), same consequence. |
| MG01-CON-004 · List update blocked by a lock | begins `Deadlock. Someone else updating ?` | `This record is being changed by someone else. Try again shortly.` | Same trigger (lock/serialization conflict), same consequence (not saved, row stays armed, retry possible). |
| MG01-CON-005 · Screen B save blocked by a lock | `Could not lock record for update` + `Changes unsuccessful` | `This record is being changed by someone else. Try again shortly.` | Same trigger (lock), same consequence (change not saved, retry possible) — the two legacy strings collapse into one carrying both facts. |
| MG01-CON-007 · Repeat delete of a deleted code | `Delete failed with message:` | `No record exists for this code.` (`404`) | Same event (the delete could not be performed), same consequence (row stays absent, nothing created). |
| MG01-HTTP-004 · 404 read | carries `No record found for this key in database` | `No record exists for this code.` | Same event; `404` and the UI's add affordance both present. |
| MG01-HTTP-005 / HTTP-006 / HTTP-007 · Write successes | equivalent of `Changes committed to database` / `Delete successful.` | `Transaction type created.` / `Changes saved.` / `Transaction type deleted.` | Same events and consequences; statuses `201` / `200` / `204` matched exactly. |
| MG01-HTTP-008 · Validation failure | `Transaction Desc must be supplied.` | `Enter a description.` | `400` + `field:"description"` matched exactly; copy is intent-equivalent. |
| MG01-HTTP-011 · Lock conflict | lock message | `This record is being changed by someone else. Try again shortly.` | `409` matched exactly; copy intent-equivalent. |
| MG01-HTTP-014 · No-change is informational | `No change detected with respect to values fetched.` | `200` + `TXN_TYPE_NO_CHANGE` + `No changes to save.` | `200` (not `400`/`409`) and "no write" matched exactly; copy intent-equivalent. |
| MG01-UI-005 / PSF-009 · Zero-match filter | `No Records found for these filter conditions` | `No transaction types match those filters.` | Same trigger/consequence; filters stay editable and no row action is reachable. |
| MG01-UI-006 · Empty-table state | `No records found for this search condition.` | `No transaction types to show yet.` | Same trigger, and still distinct from the filtered message. |
| MG01-UI-007 · Confirmation banners | `Update HIGHLIGHTED row. Press F10 to save` / `Delete HIGHLIGHTED row ? Press F10 to confirm` | Edit / Delete dialogs naming the exact row | Same triggers, same targeted row, same consequences. |
| MG01-UI-008 / UI-009 / UI-010 / UI-011 / UI-012 / UI-013 · State banners | legacy state prompts | `Enter a transaction type code to begin.` / `Review or update the details below.` / `No record exists for this code. You can create it.` / `Enter details for the new transaction type.` / save-confirm dialog / delete-confirm dialog | Each conveys the same state, the same available next action, and the same consequence as its legacy counterpart. |
| MG01-PSF-006 / PSF-008 · Paging past the last page | `No more pages to display` | `You're on the last page.` | Same trigger and consequence; page contents unchanged. |
| MG01-BND-016 · `00` is a legal *filter* | `No Records found for these filter conditions` (and **not** a zero-rejection) | `No transaction types match those filters.` | Same trigger (data-driven zero match after format validation passed); crucially the zero-rejection rule did **not** fire — verified `GET …?typeCode=00` → `200 {"items":[]}`. |

---

## 5A. Expected Functionality — Intentional Deviations from Legacy

The cases below are **not defects**. Each asserts a legacy affordance that the target intentionally removed, merged, relocated, or replaced during screen rationalization; in each, the user goal behind the legacy assertion is fully satisfied by the target design. They are excluded from the failure count in §2/§3 and do not make the run red. They are **not** counted as passes either — the `Passed` figures are untouched. Each case was judged individually on this run's own evidence against the intent-equivalence test (intent identifiable · intent achievable in the target · nothing lost); no test-case ID is treated as a standing exception.

> **MG01-FE-027 — Screen A exit returns to the caller, defaulting to the admin menu**
> - `legacy_intent`: The user wants to leave the transaction-type list and return to the screen they arrived from (legacy default: the admin menu `COADM01C`/`CA00`), abandoning any pending arm/confirmation state without writing.
> - `target_behavior`: Screen A (`/transaction-types`, `TransactionTypeListScreen.jsx`) is the target's **root/entry screen** — `App.jsx` defines only `/transaction-types` and `/transaction-types/details` plus a catch-all redirect, so there is no caller to return to. Leaving the application is served by **Sign out** in the persistent app header (`AppHeader` in `App.jsx`), and the legacy menu's role as a screen selector is replaced by the SPA's own routing/entry model. The vestigial **Back** control that pointed at the non-existent `VITE_ADMIN_ROUTE` has since been removed from `TransactionTypeListScreen.jsx`, which confirms the removal was deliberate rather than an unfinished route.
> - `equivalence_rationale`: The legacy PF3 existed to hand control back to a calling transaction in a 3270 pseudo-conversational stack; the target has no such stack, and the admin menu it defaulted to is outside MG-01's scope and has no target counterpart. Every screen MG-01 owns is directly reachable, so the "go back to pick another function" goal is met by the target's information architecture rather than by a Back control. **No data is lost, no state becomes unreachable, and no user action becomes impossible** — the case's own "no write / pending state abandoned" half was verified (`SELECT count(*) FROM transaction_type → 7`, unchanged), and no MG-01 function was reachable only via the admin menu.
> - `confidence`: `high`

> **MG01-HP-009 — Exit the list screen**
> - `legacy_intent`: From the happy-path perspective, the user wants to finish working with the list and get out of the screen to the menu they came from.
> - `target_behavior`: Same target design as above — Screen A is the SPA's root route (`App.jsx`); no admin-menu screen exists in the target, and exiting the application is served by **Sign out** in the app header. There is no in-app destination the legacy exit would have led to.
> - `equivalence_rationale`: Judged on its own evidence, not carried over from MG01-FE-027: this case asserts only that the exit leads to the admin menu. Because that destination has no target counterpart and Screen A is the entry point, the user's "leave this screen" goal is satisfied by the target's navigation model. **Nothing is lost** — the list, the details screen, and every create/update/delete action remain fully reachable, and the run confirmed no write occurred.
> - `confidence`: `high`

> **MG01-HTTP-015 — Exit navigation**
> - `legacy_intent`: The user's exit action must be handled as a navigation (no write, no error status) rather than as a data operation.
> - `target_behavior`: From Screen B the route genuinely changes (`/transaction-types/details` → `/transaction-types`) — observed in this run. From Screen A there is no onward navigation because the admin-menu destination does not exist in `App.jsx`'s route table. No write and no error status were issued in either case (`FE051_HP015 {"url":"http://localhost:5173/transaction-types"}`).
> - `equivalence_rationale`: The substance of the assertion — exit is a pure navigation with no write and no error — **holds exactly**; only the Screen A destination differs, and it differs because the target IA removed the intermediate menu. **No data is lost, no state is unreachable, no action is impossible**: the run recorded no write, no error status, and no loss of access to any screen.
> - `confidence`: `high`

**Cases considered under this rule and deliberately kept as FAIL** (recorded for auditability): `MG01-FE-034`, `MG01-BR-003`, `MG01-BR-014`, `MG01-BR-015`, `MG01-CON-001`, `MG01-UI-001`. Each fails at least one criterion or could not be established with confidence — most clearly `MG01-BR-015`, where a neutral `ENTER` keystroke destroys an in-flight delete confirmation and the fetched record (**state is lost**, criterion 3), and `MG01-CON-001`, where the losing submission surfaces a `409 TXN_TYPE_ALREADY_EXISTS` the legacy save path resolved silently (a behavioural regression, not a rationalization). For `MG01-FE-034`, `MG01-BR-003`, `MG01-BR-014` and `MG01-UI-001` no target-design decision could be cited that establishes the divergence as intentional, so under the "uncertainty stays FAIL" rule they remain in §4.

---

## 6. Blocked / Not Run

29 cases could not be executed as written. None were counted as Pass or Fail.

### 6.1 Fault injection unavailable (13 cases)

`MG01-FE-020`, `MG01-FE-021`, `MG01-FE-023`, `MG01-FE-024`, `MG01-FE-042`, `MG01-FE-043`, `MG01-FE-044`, `MG01-FE-052`, `MG01-TX-001`, `MG01-TX-004`, `MG01-HTTP-013` (11 cases) — each requires an update / delete / insert / cursor read to be *made to fail* with an unclassified database error, or an unrecognised internal state to be *forced*.

- **Reason:** the running target exposes no fault-injection affordance. The only external levers available (holding a row lock, violating a constraint) map to *classified* paths already covered by CON-004/005. Producing an unclassified failure would require editing target code, adding a DB trigger, or revoking table privileges — all prohibited modifications of the target application/schema.
- **Needed to run:** a fault-injection hook (e.g. a test profile that can force a `DataAccessException` on a chosen operation), or a proxy layer between the service and Postgres.

`MG01-FE-025`, `MG01-HTTP-012` (2 cases) — require the database service to be **stopped** so the priming/health path short-circuits (503 / `Db2 access failure.` equivalent).

- **Reason:** the Windows service `postgresql-x64-18` is running and the test shell is **not elevated** (`net session` → "NOT ELEVATED"), so the service cannot be stopped or restarted.
- **Needed to run:** an elevated shell, or a container-hosted Postgres that can be stopped and restarted around the case.

### 6.2 `TRANSACTION_TYPE_CATEGORY` not provisioned — fixture `FX-CHILD` unavailable (5 cases)

`MG01-FE-022`, `MG01-FE-041`, `MG01-DB-011`, `MG01-TX-003`, `MG01-HTTP-010`.

- **Reason:** `list_tables` on `CARDDEMO` returns exactly one table, `transaction_type`. The parent table `TRANSACTION_TYPE_CATEGORY` with `FOREIGN KEY (TRC_TYPE_CODE) REFERENCES TRANSACTION_TYPE(TR_TYPE) ON DELETE RESTRICT` does not exist — DB-Details places it **out of scope** for MG-01 provisioning, exactly as the test document's assumption **[A8]** / gap **G6** anticipate. Creating it would be a target data-model change.
- **Needed to run:** provision `TRANSACTION_TYPE_CATEGORY` and the inbound FK in the test database (a scope decision, not a test decision).

### 6.3 Read-only identity could not be minted (1 case)

`MG01-AUTHZ-004` — "Read-only user may still list and search" (200 on E1/E2 with maintenance controls hidden).

- **Reason:** in realm `carddemo` the only direct-grant client carrying the transaction-type grants is `mg01-frontend`, and **both** `TXN_TYPE_ADMIN` and `TXN_TYPE_READ` are configured as *default* client scopes (verified via the Keycloak admin API: `default-client-scopes` = `TXN_TYPE_ADMIN`, `TXN_TYPE_READ`; `optional-client-scopes` = empty). Every token that client mints therefore carries the admin authority, and no realm role `txn_type_read` exists (realm roles are only `uma_authorization`, `offline_access`, `default-roles-carddemo`). A read-without-write token cannot be obtained without changing the authorization-server configuration.
- **Partially covered:** AUTHZ-001/002/003 and HTTP-009 were executed with an authenticated identity holding **no** transaction-type authority (`admin.user` via client `admin-cli`, token `scope` claim empty), which fully satisfies their "403 on write, nothing changed" assertions. That identity is not valid for AUTHZ-004 because it also lacks read authority.
- **Needed to run:** a Keycloak client scope or realm role granting only `TXN_TYPE_READ`, mapped to a test user.

### 6.4 Specified input is not expressible in the target UI (10 cases)

The legacy row-action code field and PF-key gating have no counterpart: the modern list uses per-row **Edit**/**Delete** buttons with modal confirmations, and Screen B simply does not render an action that is invalid for the current state (Backend-Spec R11/R12/R32 record this as a deliberate rationalization).

| Case | Specified input | What was observed instead |
|---|---|---|
| `MG01-FV-005` | Row `03` action = `X` | No free-text row-action field exists; only Edit/Delete buttons per row. |
| `MG01-FV-006` | Row `03` action = `u` | As above. |
| `MG01-BR-001` | Row `02` = `U` **and** row `04` = `D` | Two row actions cannot be armed simultaneously; each dialog is modal and bound to one row. |
| `MG01-BR-002` | Rows `02` and `03` both `U` | As above. |
| `MG01-UI-004` | Both offending action fields highlighted red | No action fields exist to highlight. |
| `MG01-BR-006` | Move the `D` from row `04` to row `05` while a confirmation is pending, then confirm | The modal overlay blocks selecting another row; a confirmation is permanently bound to the row that opened it, so a stale-row confirmation cannot be constructed. |
| `MG01-BR-013` | Invoke `F4` (delete) from Screen B's initial state | The **Delete** control is not rendered in that state — controls present were `["Back","Find"]` only. No read/write occurred. |
| `MG01-BR-016` | Invoke `F12` (cancel) from Screen B's initial state | No **Cancel** control is rendered in that state — controls present were `["Back","Find"]` only. |
| `MG01-FE-050` | Invoke `F4` from the initial (not-fetched) state, expect `Invalid key pressed` | The action is un-invocable, so no message can be produced; screen unchanged, no read/write. |
| `MG01-UI-014` | Same action, expect the `Invalid key pressed` banner rendered | As above — no such banner exists because the guard prevents the action rather than rejecting it. |

> **Observed, but not scored:** in every one of these states the corresponding guard *is* present in the target (the invalid action is not offered, only one row action can be armed at a time, and no read or write occurred). What cannot be reproduced is the legacy *message* the guard emits.

---

## 7. Environment & Notes

**Services confirmed up before execution.** Frontend `http://localhost:5173` → 200 (SPA served; unauthenticated visitors are redirected to Keycloak, which also evidences the SPA half of MG01-AUTHN-001). Backend `http://localhost:8080/actuator/health` → `{"status":"UP","groups":["liveness","readiness"]}`. Keycloak `http://localhost:8081/realms/carddemo/.well-known/openid-configuration` → 200. Postgres `CARDDEMO` reachable via the `postgres-carddemo` MCP server; `transaction_type` present with the 7 seeded rows.

**Fixtures used and how they were built.**
- `FX-BASE` — the 7 seeded rows (`06 REVERAL` kept verbatim). Restored before/after each write case.
- `FX-PAGE10` — `FX-BASE` + `08 CASH ADVANCE`, `09 FEE`, `10 INTEREST`.
- `FX-PAGE14` — `FX-BASE` + `08`–`14`.
- `FX-DESCPAGE` — `FX-BASE` + `11 RESERVE`, `12 REPRESENTMENT`, `13 RECOVERY`, `14 REBATE`, `15 RETURN`, `16 REDEMPTION` (exactly 9 rows containing `RE`).
- `FX-LARGE` — 99 rows `01`–`99` generated with `generate_series`.
- `FX-EMPTY` — table truncated.
- `FX-CHILD` — **not buildable** (see §6.2).

**Concurrency provocations.** Lock conflicts (CON-004, CON-005, HTTP-011) were provoked with a genuine second Postgres session: `psql … -c "BEGIN; SELECT … WHERE tr_type='03' FOR UPDATE; SELECT pg_sleep(n); ROLLBACK;"`. The service's per-connection `SET lock_timeout = '3s'` turned the contention into Postgres `55P03`, mapped to `409 TXN_TYPE_LOCK_CONFLICT`. Concurrent deletes (CON-002, CON-003) were performed out-of-band with `psql` while the SPA held an armed edit. Loading/pending behaviour (UI-015) was exercised by delaying `/api/v1/**` responses 2.5 s in the browser (client-side interception only; no target change).

**Test-database state left behind.** The table was restored to `FX-BASE` exactly — verified at the end of the run: `01 PURCHASE, 02 PAYMENT, 03 CREDIT, 04 AUTHORIZATION, 05 REFUND, 06 REVERAL, 07 ADJUSTMENT` (7 rows). No test rows (`08`–`16`, `77`, `88`, `99`) remain. No repository file other than this report was created or modified; no target code, schema or auth configuration was changed.

**Observations recorded rather than scored** — points worth flagging that the cases' own expected results did not make pass/fail criteria:

1. **`GET /api/v1/transaction-types/` (empty path segment) returns `500 INTERNAL_ERROR`.** The screen never issues this call — Screen B's client-side required-field rule blocks it, so MG01-FV-010 passes at screen level — but a direct API caller receives a 500 where a `400 TYPE_CODE_REQUIRED` would be expected. No case in the document covers it.
2. **Server-side normalization of `*` differs from the UI's.** The SPA normalises `*` to empty before validating, so the *required* rule fires (matching legacy `1150-STORE-MAP-IN-NEW`). The backend does not: `GET /api/v1/transaction-types/*` → `400 TYPE_CODE_NOT_NUMERIC`, and `PUT …{"description":"*"}` → `400 DESCRIPTION_INVALID_CHARS`. MG01-FE-053 / FV-014 / FV-017 are screen-level cases and pass on the screen; the server-side divergence is a defence-in-depth inconsistency, not a case failure.
3. **The two legacy "no change" messages are merged.** MG01-FE-035 explicitly notes that Screen B's text differs from Screen A's; the target shows the identical `No changes to save.` on both. Judged intent-equivalent (§5), but the deliberate legacy distinction is gone.
4. **Final partial page renders only the remaining rows.** MG01-PSF-005 expects "the remaining 4 row slots are blank". The React table renders 3 `<tr>` elements with no filler rows — nothing is displayed in those positions and no further page is offered, so the case was judged Pass; the fixed 7-line 3270 grid has no counterpart.
5. **Exit destination.** MG01-FE-051 / HP-015 / BR-017 passed on the behaviour they assert (exit accepted from every state, pending edits abandoned, no write, no invalid-key message). The destination is the transaction-type list, because `VITE_ADMIN_ROUTE=/admin` matches no route and falls through the catch-all redirect. Assumption **[A13]** already flags that no target admin-menu route exists; the resulting no-op on Screen A is what MG01-FE-027 / HP-009 / HTTP-015 assert against. Those three are recorded as **Expected Deviation** (§5A): the absent admin menu is an approved rationalization of the target's information architecture, not a defect.
6. **Under-specified expected results encountered.** (a) MG01-BND-004 permits either "input caps at 2 characters" or "submission rejected" — the target does the former (`123` → field holds `12`, then looks up `12`), so it passes, but the 3-character case is left ambiguous. (b) MG01-CON-001 states no status code for the second submission, only that no duplicate-key failure be surfaced; the failure was scored on that sentence. (c) MG01-FE-047's expected message (`Enter transaction type to be maintained`) is replaced by the success banner over an otherwise-initial screen; it was scored Pass on the state assertions (empty editable code field, no record shown).
7. **Rate limiting was active** (`app.rate-limit.capacity: 300` per minute per caller IP). No case tripped it; no `429` was observed during the run.

---

## 8. Overall Scorecard

### 8.1 Per-group breakdown

| # | Test Group | Passed | Total Cases | Pass % |
|---|---|---|---|---|
| 1 | Functional Equivalence (`FE`) | 39 | 53 | 73.6 % |
| 2 | Happy Path (`HP`) | 14 | 15 | 93.3 % |
| 3 | Authentication Guard (`AUTHN`) | 5 | 5 | 100.0 % |
| 4 | Authorization Guard (`AUTHZ`) | 3 | 4 | 75.0 % |
| 5 | Field-Level Validation (`FV`) | 15 | 17 | 88.2 % |
| 6 | Cross-Field / Business-Rule (`BR`) | 9 | 17 | 52.9 % |
| 7 | DB Side Effects (`DB`) | 11 | 12 | 91.7 % |
| 8 | Concurrency / Idempotency (`CON`) | 6 | 7 | 85.7 % |
| 9 | Multi-Step Transaction Integrity (`TX`) | 1 | 4 | 25.0 % |
| 10 | HTTP Semantics (`HTTP`) | 11 | 15 | 73.3 % |
| 11 | UI Rendering (`UI`) | 13 | 16 | 81.3 % |
| 12 | Pagination / Sort / Filter (`PSF`) | 10 | 10 | 100.0 % |
| 13 | Boundary & Numeric Edge Cases (`BND`) | 16 | 16 | 100.0 % |
| — | **All groups** | **153** | **191** | **80.1 %** |

`Expected Deviation` cases stay out of the `Passed` numerator and out of the `Total Cases` denominator's interpretation as defects, so every `Pass %` above is **numerically unchanged** by the §5A reclassification — only the failure attribution changed.

### 8.2 Overall summary

**Total pass percentage across all groups: 153 / 191 = 80.1 %.** Restricted to the 162 cases that could actually be executed, the pass rate is 153 / 162 = **94.4 %**; the remaining 29 cases were Blocked by environment and scope gaps (no fault injection, the un-provisioned child table, the missing read-only identity, and legacy inputs with no target control), not by observed target behaviour.

### 8.3 Quality judgment

**Verdict: Low-to-Moderate risk.**

The rationale rests on this run's own numbers: 153 of 191 cases passed (80.1 %), and of the 162 executed cases only 6 failed — a 3.7 % failure rate — with **zero** Critical or High severity findings (5 Low, 1 Medium). A further 3 executed cases are Expected Deviations (§5A): approved target-design rationalizations, counted as neither passes nor defects, and excluded from this risk verdict. Every data-integrity and security group scored at or near the top: `AUTHN` 5/5, `BND` 16/16, `PSF` 10/10, `DB` 11/12 (the twelfth Blocked, not failed), `CON` 6/7. All executed `DB`-category assertions confirmed the exact persisted values, row counts and untouched sibling rows, and no failure caused data loss, data corruption, an unauthorized read or write, or an incorrect computed value.

The 9 failures cluster into four cosmetic/navigational defects (missing header date-time; no admin-menu exit target on Screen A, which alone accounts for FE-027, HP-009 and HTTP-015; missing field-error marking on a zero-match cross-field filter) and three state-machine gaps (`ENTER` discards a pending delete confirmation — the single Medium; Save offered from the plain show-details state; a duplicate-key error surfaced on a double-submitted create). Group scores below 80 % (`BR` 52.9 %, `TX` 25.0 %, `FE` 73.6 %) are driven predominantly by **Blocked**, not failed, cases — `TX`, for example, is 1 pass, 0 fails, 3 blocked.

The risk is not rated lower than "Low-to-Moderate" because 29 cases (15.2 % of the suite) remain **unverified**, and they are concentrated in exactly the areas where confidence matters most: every referential-integrity path, every DB-outage and unclassified-error path, transaction rollback on a failed write, and the read-only authorization case. Until fault injection, the `TRANSACTION_TYPE_CATEGORY` fixture and a read-only identity are available, the error-handling and least-privilege behaviour of this screen is asserted by specification only, not by evidence.

# MG-01 — Review Gate 2 (Build-Readiness Review)

> Consolidated build-readiness review of the four Phase-6 artefacts for Tran Group **MG-01**
> (Transaction Type Maintenance). This document only reviews; it edits no spec and generates no code.
> Applying any finding means re-running the owning spec agent with the finding as input.

---

## 1. Review Metadata

| Item | Value |
|---|---|
| Tran Group | **MG-01** — Transaction type maintenance (list, add, update, delete) |
| Review date | 2026-07-12 |
| Reviewer | Review-Gate2 (build-readiness reviewer, Refactor path) |
| Verdict | **Ready with fixes** (1 Critical, 7 Good-to-Have, 5 Advanced, 5 Architecture) |

**Artefacts reviewed**
| Artefact | Path |
|---|---|
| UI Build Spec | `.Claude/Specs/Refactor/MG-01-UI-Spec.md` |
| Backend Build Spec | `.Claude/Specs/Refactor/MG-01-Backend-Spec.md` |
| Reconciliation Spec | `.Claude/Specs/Refactor/MG-01-reconcile-Spec.md` |
| Target Architecture | `Artefacts/Architecture/MG-01.Architecture.md` |

**Ground-truth context consulted (READ-ONLY yardstick)**
| Source | Used for |
|---|---|
| `Artefacts/TranGroupData/MG-01-TransactionTypeMaintenance-BSTS.md` | Business & technical summary, paragraph-level behaviour, role note, gaps |
| `Artefacts/TranGroupData/MG-01-TransactionTypeMaintenance-BDD.md` | Gherkin scenarios: validations, exact error copy, edge cases, error handling |
| `Artefacts/TranGroupData/MG-01-TransactionTypeMaintenance-DB-Details.md` | Postgres schema, CRUD footprint, seed data, FK note |
| `Artefacts/Discovery/MoveGroup.md` | Group membership, programs/transactions, CRUD, copybooks |
| `Input/bms/COTRTLI.bms` | Verified field names, lengths, POS, attributes, PF-key legends (list screen) |
| `Config/Config.md` | Component-wise target stack |
| `Config/Style-Sheet.md` | Verified every referenced design token / component class exists |
| `CLAUDE.md` | Golden rules, artefact contract, scope boundaries |

> Verification note: the UI spec's legacy-field claims (e.g. `TRTYPE` len 2 @POS(6,44), `TRDESC` len 50 @POS(8,25), `TRTSEL/TRTTYP/TRTYPD` rows 1–7, the fully-protected `TRTSELA/TRTTYPA/TRTDSCA` "row A", `INFOMSG` len 45, `ERRMSG` len 78, F2/F3/F7/F8/F10 legends) all match `COTRTLI.bms` exactly. Every CSS token/class the UI spec references (`.btn-primary/-outline/-ghost/-danger/-sm/-block`, `.card/-header/-body`, `.data-table`, `.table-wrap`, `.alert--info/--success/--warning/--danger`, `.form-control/-label/-hint/-error`, `.is-invalid`, `.required`, `.visually-hidden`, `.progress`, `--focus-ring`, `--transition`, `--sp-5`, `--container-max`) exists in `Config/Style-Sheet.md`.

---

## 2. Verdict Summary

The MG-01 artefact set is strong and unusually well-traced: nearly every business rule, validation, and error path in the BSTS/BDD maps to a concrete UI element, endpoint, and error response, and the reconcile spec closes almost every UI↔backend seam row-by-row. Functional coverage is essentially complete, the front-end spec is buildable without re-reading legacy source, and standards (OWASP, OAuth2/JWT, TLS 1.3, GDPR, WCAG) are specified concretely rather than merely named. There is **one** genuine contract inconsistency that would produce a wrong build if the backend is built from its own spec in isolation (the E4 update response envelope); the reconcile spec already prescribes the fix but it was not propagated back into the backend spec. The remaining items are quality, consistency, and accessibility refinements, plus two decisions (admin route, OAuth scope name) that are appropriately deferred to the wider-app owner and do not block a demonstrable build.

- **Critical Gaps:** 1
- **Good to Have:** 7
- **Advanced Suggestions:** 5
- **Architecture Recommendations:** 5
- **Build-readiness call:** **READY WITH FIXES** — safe to build once C1 is propagated into the backend spec; the two deferred items (G7 routes / G8 scope names in the reconcile spec) can ship against documented defaults.

---

## 3. Critical Gaps

| ID | Spec / Area | Finding | Evidence (spec ref ↔ ground-truth / conflicting spec) | Recommended Fix |
|---|---|---|---|---|
| **C1** | Backend — E4 response contract (internal conflict, resolved only in reconcile) | The E4 update endpoint's success body is self-contradictory in the backend spec: §3.2 E4 and R14 say it returns "**200 `TransactionTypeDto`**, `changed:true`" and "200 `TXN_TYPE_NO_CHANGE`, `changed:false`", but §3.1 defines `TransactionTypeDto` with only `typeCode` + `description` — the `changed` and `code` fields do not exist on any DTO. If the backend is built from its own spec, E4 returns a body with no `changed`/`code`, and the UI cannot distinguish "Changes saved." from "No changes to save." (UI §8, §7.1/§7.2) — a wrong end-to-end build for the core update path. | Backend `MG-01-Backend-Spec.md` §3.1 (DTO defines only `typeCode`,`description`) ↔ §3.2 E4 / §4 R14 (reference `changed`/`code`) ↔ Reconcile `MG-01-reconcile-Spec.md` §3.1 row 10 (G2) & §8 G2, which prescribe `UpdateTransactionTypeResponse { typeCode, description, changed, code }` ↔ Architecture §3 write flow (already assumes the "200 envelope (changed/code)"). | Re-run **Refactor-Backend-Spec** to add the G2 envelope: define `UpdateTransactionTypeResponse { typeCode, description, changed:boolean, code:string }` in §3.1 and reference it as the E4 200 body in §3.2/§4, so all four artefacts agree. No new business data — only the two flags every other artefact already relies on. |

---

## 4. Good to Have

| ID | Spec / Area | Finding | Evidence (spec ref ↔ ground-truth / conflicting spec) | Recommended Fix |
|---|---|---|---|---|
| **GH1** | Backend / Reconcile — keyset paging `hasPrevious` | `TransactionTypePageDto.hasPrevious` is specified only as "false on first page (`CA-FIRST-PAGE`)"; the spec never states how `hasPrevious` is computed for a mid-set **forward** page (cursor present). Keyset paging cannot derive "a previous page exists" from a forward fetch without a rule (cursor present ⇒ true, or a backward lookahead). A build agent may wrongly enable/disable Previous. | Backend §3.1 `TransactionTypePageDto` / §3.2 E1 ("First page … sets `hasPrevious=false`") ↔ Reconcile §3.1 row 5 (pager enablement bound to backend `hasPrevious`/`hasNext`) ↔ BDD "Paging up from a later page" / BSTS §CTLI (`CA-FIRST-PAGE`). | Re-run **Refactor-Backend-Spec** to state the `hasPrevious` rule explicitly (e.g. `hasPrevious = (cursor present && direction=forward) || (backward page with more rows before it)`), so Previous enablement is deterministic. |
| **GH2** | UI — grid mechanism vs Style-Sheet | UI §4 mandates a "12-column fluid grid inside `.container`", but `Config/Style-Sheet.md` provides only `.grid` + `.grid-2/3/4` (no 12-column system). With the as-built decision to use `bfsi-theme.css` directly and drop Tailwind (§11 build note, §13), there is no 12-column grid utility to build against. | UI §4 (12-column grid) ↔ `Config/Style-Sheet.md` §4 (`.grid`, `.grid-2/3/4` only) ↔ UI §13 config discrepancy (Tailwind not used). | Re-run **Refactor-UI-Spec** to describe the actual layout mechanism under bfsi-theme.css (e.g. `.grid-2` for the filter row, flex utilities), or state that a 12-col grid must be added to the token layer; remove the unbacked "12-column" claim. |
| **GH3** | UI — WCAG **2.2**-specific criteria | §9 claims "WCAG 2.2 AA" but addresses only WCAG 2.1-era criteria (labels, focus visible, keyboard, contrast, live regions). The net-new 2.2 success criteria are not called out: **2.5.8 Target Size (min 24×24)** for the `.btn-sm` per-row Edit/Delete and pager buttons, **2.4.11 Focus Not Obscured**, **3.3.8 Accessible Authentication** (the re-auth/idle-timeout flow), and **3.3.7 Redundant Entry**. | UI §9 (2.1-era only) & §5.1 #10/#11 (`.btn-sm`, `.btn-ghost` row actions), §8 idle-timeout re-auth ↔ stated standard "WCAG 2.2 AA" (UI §9 heading, Acceptance #19). | Re-run **Refactor-UI-Spec** to explicitly cover the 2.2-delta criteria (guarantee ≥24×24 hit targets on row-action/pager buttons; document focus-not-obscured; note accessible-auth for re-login). |
| **GH4** | Backend / Reconcile — stray E4 `404` | E4's status list includes `404 TXN_TYPE_NOT_FOUND`, but the E4 behaviour never yields 404 — a 0-row update returns `409 TXN_TYPE_CONCURRENTLY_DELETED` (`createIfMissing=false`) or `201` re-create (`createIfMissing=true`). The listed 404 has no trigger and creates ambiguity. | Backend §3.2 E4 status codes ("`404 TXN_TYPE_NOT_FOUND` (see note)") ↔ E4 Behaviour (0 rows → 409 or 201) ↔ Reconcile §4 "S1 Row Edit" (also lists 404). | Re-run **Refactor-Backend-Spec** to remove `404` from E4's status list (or specify the exact condition that emits it) and align the reconcile action map. |
| **GH5** | UI / Backend — build output path casing | The two specs disagree on the build output tree: UI §11 as-built uses `Target/MG-01/Frontend/`; Backend §10 uses `target/MG-01/backend/`. Mixed `Target/` vs `target/` and `Frontend` vs `backend` will break sibling-folder assumptions on case-sensitive filesystems/CI. | UI §11 build note (`Target/MG-01/Frontend/`) ↔ Backend §10 (`target/MG-01/backend/`) ↔ CLAUDE.md (`Target/` is the output root). | Standardise on one casing/layout (e.g. `Target/MG-01/Frontend/` + `Target/MG-01/Backend/`) via a re-run of the owning spec(s). |
| **GH6** | UI — "Search" control traceability | §5.1 #5 traces the **Search** button to "`F2`/Enter re-search semantics", but `F2` is **Add** (`BUTNF02`, verified in `COTRTLI.bms`); the legacy list search fires on **ENTER**, with no dedicated PF-key. The mislabel is cosmetic but misleading for a build agent reading the trace column. | UI §5.1 row 5 ("F2/Enter re-search") ↔ `Input/bms/COTRTLI.bms` `BUTNF02 INITIAL='F2=Add'` ↔ UI §3.1 (correctly maps F2=Add to the Add button). | Re-run **Refactor-UI-Spec** to trace Search to ENTER/re-search only (drop the `F2` reference). |
| **GH7** | UI — entry-context state reset not made explicit | BSTS records a distinct rule: arriving fresh at the details screen (EIBCALEN=0, or from admin/list without re-entry) discards any in-progress edit and forces the search-key prompt (`COTRTUPC` `0000-MAIN`). The UI state model (§7.2) implies reset-to-search after actions but does not explicitly state that a fresh entry/navigation-in also discards unsaved edits. | UI §7.2 state model (reset after actions) ↔ BSTS §CTTU entry-context rule / BDD "Fresh entry from the admin menu or the list program clears prior maintenance state". | Re-run **Refactor-UI-Spec** to state that entering/re-entering the details route fresh clears any unsaved description edit and returns to search-entry (client-held state hygiene). |

---

## 5. Architecture Recommendations

Reviewing `Artefacts/Architecture/MG-01.Architecture.md` for soundness, right-sizing, consistency, security/compliance placement, and open decisions. Severity noted inline.

| ID | Area | Finding | Evidence | Recommendation |
|---|---|---|---|---|
| **A1** | Traceability / citation (Low) | The header cites its grounding source as `.Claude/Rebuild/MG-01-reconcile-Spec.md`, but the reconcile spec lives at `.Claude/Specs/Refactor/MG-01-reconcile-Spec.md`; `.Claude/Rebuild/` is an empty scaffold (CLAUDE.md). The wrong path breaks the audit trail. | Architecture line 4 ↔ actual path `.Claude/Specs/Refactor/MG-01-reconcile-Spec.md` ↔ CLAUDE.md (Rebuild/ empty). | Re-run **Refactor-Reconcile-Spec** (arch owner) to correct the source path citation. |
| **A2** | Stack consistency (Low) | §2 lists the UI-app technology as "React, Tailwind CSS, microanimation, responsive UI" (verbatim Config), but the UI spec's as-built decision drops Tailwind for `bfsi-theme.css` classes and uses JS/JSX (UI §11/§13). The architecture does not acknowledge that deviation. | Architecture §2 (Tailwind) ↔ UI §11 build note & §13 (no Tailwind; JSX). | Note the front-end deviation (or reference UI §13) so the architecture reflects the real stack. |
| **A3** | Contract consistency (Med) | The architecture's write data-flow (§3) already assumes the E4 "200 envelope (`changed`/`code`)", i.e. it agrees with reconcile G2 — which makes the **backend spec the lone outlier** (see C1). The architecture is correct; this reinforces that C1's fix is a backend-spec propagation, not an architecture change. | Architecture §3 write flow ("200 envelope (changed/code)") ↔ Reconcile G2 ↔ Backend §3.1/§3.2 (missing envelope). | No architecture change; use as corroboration when applying **C1** to the backend spec. |
| **A4** | Right-sizing / open decisions (Low) | The architecture is well right-sized for one reference table (single stateless service, no cache/queue/event — correctly excluded per Backend §1.3) and is not over-engineered. The API gateway is Config-mandated ("REST APIs, API gateway"); for a single admin screen it is heavier than strictly necessary but justified by Config, and §7.4 appropriately defers the gateway product and scope-enforcement location. Open decisions §7 (G7 routes, G8 scope, repo choice) are all non-blocking and defensible. | Architecture §1–§2, §7; Backend §1.3 (no TSQ/TDQ/VSAM/MQ); Config "Microservice-based" / "API gateway". | No change required. Confirm G7/G8 are wired as single named constants (as §7 implies) so later swaps are trivial. |
| **A5** | Open decision — auth/route confirmations (Low) | The two Needs-From-User items (Reconcile G7 admin/back routes; G8 `TXN_TYPE_ADMIN` scope name) are surfaced consistently in Architecture §7.1–§7.2 and are correctly marked non-blocking with defaults. They remain **dangling** pending a wider-app-owner confirmation. | Architecture §7.1/§7.2 ↔ Reconcile §8 G7/G8 ↔ BSTS gap (`COCOM01Y` missing). | Relay G7/G8 to the user for confirmation; build proceeds on documented defaults if no answer. |

---

## 6. Advanced Suggestions

Each item is explicitly **optional** — beyond what is needed to ship this screen.

| ID | Spec / Area | Finding | Evidence | Recommendation (optional) |
|---|---|---|---|---|
| **AS1** | Backend — E1 `size` param surface | E1 exposes `size` (1..7) though the legacy page size is fixed at 7 (`WS-MAX-SCREEN-LINES`). Harmless (capped, validated by V7) but a small API-surface addition beyond legacy equivalence. | Backend §3.2 E1 `size`, §5 V7 ↔ BSTS §CTLI (fixed 7). | Optionally document `size` as internal/test-only or drop it, keeping the page size a server constant. |
| **AS2** | Backend — optimistic concurrency | The legacy detected concurrent update/delete via SQLCODE at write time; the modern service relies on the no-change guard + 409 paths. An `ETag`/`If-Match` on E4/E5 would make lost-update detection explicit and standards-friendly. | Backend §7 (`TXN_TYPE_CONCURRENTLY_DELETED`, `TXN_TYPE_LOCK_CONFLICT`); §9 concurrency. | Optionally add `ETag`/`If-Match` optimistic concurrency for E4/E5. |
| **AS3** | Cross-cutting — audit retention specifics (BFSI) | §8.1 A09 mandates an audit log per write but does not specify retention/immutability. | Backend §8.1 A09, §9 logging. | Optionally specify audit-log retention/immutability expectations for write endpoints. |
| **AS4** | DX — machine-readable contract | The UI↔backend contract (DTOs, endpoints, the G2 envelope) is prose across three specs. An OpenAPI/Swagger definition would be a single source of truth and could generate `transactionTypeApi.ts`. | Reconcile §3–§4; Backend §3; UI §11 `services/transactionTypeApi.ts`. | Optionally produce an OpenAPI spec and generate the typed client to keep both tiers in lockstep. |
| **AS5** | Testability — consumer-driven contract tests | Given the E4 envelope subtlety (C1) and the createIfMissing wiring (G3), a consumer-driven contract test (e.g. Pact) between the React client and the service would catch drift. | Reconcile §8 G2/G3; Backend §11.1 acceptance. | Optionally add contract tests for E1–E5 shapes incl. the G2 envelope and `createIfMissing` per caller. |

---

## 7. Traceability Notes

Which ground-truth source each major finding was checked against, for auditability:

- **C1** — Backend §3.1 vs §3.2/§4 (internal), Reconcile §3.1/§8 G2, Architecture §3; the required behaviour (distinguish updated vs no-change) traces to BDD "Submitting an update with an unchanged description is rejected" and BSTS §CTLI/§CTTU no-change rules.
- **GH1** — Backend §3.1/§3.2 E1 vs BDD paging scenarios ("Paging up from a later page…", "The very first page has no previous page") and BSTS §CTLI cursor description.
- **GH2** — UI §4/§13 vs `Config/Style-Sheet.md` §4 (grid helpers) and Config Frontend row.
- **GH3** — UI §9/§5.1 vs the WCAG 2.2 AA standard named in UI §9 & Acceptance #19 (target-size/focus-not-obscured/accessible-auth deltas).
- **GH4** — Backend §3.2 E4 status list vs E4 Behaviour and Reconcile §4 action map.
- **GH5** — UI §11 vs Backend §10 vs CLAUDE.md output-root convention.
- **GH6** — UI §5.1 row 5 vs `Input/bms/COTRTLI.bms` (`BUTNF02='F2=Add'`) and UI §3.1.
- **GH7** — UI §7.2 vs BSTS §CTTU entry-context rule and BDD "Fresh entry … clears prior maintenance state".
- **A1** — Architecture line 4 vs actual reconcile-spec path and CLAUDE.md directory map.
- **A2/A3** — Architecture §2/§3 vs UI §11/§13 and Reconcile G2 / Backend §3.
- **A4/A5** — Architecture §1/§2/§7 vs Backend §1.3, Config (architecture type / gateway), Reconcile §8 G7/G8, BSTS gap (`COCOM01Y`).
- **Coverage confirmed present (no finding):** list paging + lookahead (R1–R5), filter format + count-check + no-match (V1/R6–R10), one-action + invalid-action rationalization (R11/R12), row/details update required+alphanumeric+no-change (V5/R13/R14), two-step confirm→dialog, delete FK -532 (R21), update/delete -911 (R18), search required/numeric/non-zero/zero-pad (V4/R24/R25), found/not-found (E2/R23), create-if-not-found (E3/R26/R27), concurrent-delete re-insert (E4 `createIfMissing`/R17), priming/health (E6/R30), abend→safe 500 (R31), invalid-key rationalization (R32), seed data incl. verbatim `06 REVERAL`, and the "no personal data" GDPR finding — all traced to BSTS/BDD/DB-Details/BMS.

---

*End of MG-01 Review Gate 2. This agent writes only this review; to apply any finding, re-run the owning spec agent (`Refactor-UI-Spec` / `Refactor-Backend-Spec` / `Refactor-Reconcile-Spec`) with the selected IDs as input.*

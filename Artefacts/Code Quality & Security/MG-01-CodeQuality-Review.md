# MG-01 — Code Quality Review (Re-Review After Remediation Pass)

## 1. Code Quality Scorecard

| # | Metric | Measured value | Band | Basis (how it was derived) |
|---|--------|----------------|------|-----------------------------|
| 1 | Overall Code Quality Grade | **C** | Moderate findings, remediation needed before sign-off | Zero Critical findings, but CQ-001 (High) forces the grade cap at C per the scoring rule, regardless of the otherwise strong posture. |
| 2 | Maintainability Rating | **B (~85/100)** | Minor friction, isolated hotspots | Read of all 34 backend main classes (1,695 LOC) and 25 frontend files (1,922 LOC): small single-purpose classes, no method observed over ~40 lines, consistent naming, layered packages (`api/service/repository/model/dto/error/security/validation`). `~` estimated — no static-analysis tool (e.g. SonarQube) was run. |
| 3 | Code Duplication | **~2% (A)** | Negligible | Manual inspection found no repeated logic blocks; validation/error-translation logic is centralized in `TransactionTypeValidation` / `DataAccessExceptionTranslator`. `~` estimated — no duplication-detection tool was run. |
| 4 | Cyclomatic / Cognitive Complexity | **~4–6 avg (A, 1–10 band)** | Simple, low risk | Manual count of branches in the most complex methods read (`TransactionTypeService.update`, `list`): update() has 4 decision points, list() has ~5. No method approached the 11+ (B) threshold. `~` estimated — no complexity tool (e.g. PMD/Sonar) was run. |
| 5 | Architecture Conformance | **90%** | Fully conforms, minor deviations | Controller → Service → Repository layering verified by reading `TransactionTypeController.java`, `TransactionTypeService.java`, `TransactionTypeRepository.java`: no entity ever returned from the controller (DTOs only), no repository call from the controller, dependency direction is one-way. The 10% deduction is the Config.md UI-stack divergence (CQ-003, Tailwind not installed) — a stack-mapping gap, not a layering break. |
| 6 | BFSI Standards Compliance | **85%** | Minor gaps | No money fields exist in this table (`TR_TYPE`/`TR_DESCRIPTION` only, confirmed against DB-Details) so BigDecimal/rounding rules are not applicable; error/status codes are centralized string constants (`ErrorCodes.java`), not magic literals; a dedicated audit-log channel records every write (principal/action/outcome/traceId). Deduction: no schema-level audit columns (`created_by/at`, `modified_by/at`) — inherited from the legacy DB2 table shape and out of this service's control (`ddl-auto: none`), and no migration tool exists to evolve that (CQ-004). |
| 7 | Documentation & API Coverage | **85%** | Adequate, minor gaps | Every controller endpoint carries `@Operation`/`@ApiResponse` (OpenAPI); every public class/method read carries a Javadoc/JSDoc block explaining intent and cross-referencing the Backend/UI spec section; both README.md files are current and detailed. Deduction: the Phase-6-contract `Artefacts/MG-01-Run-Guide.md` still does not exist (CQ-006). |
| 8 | Technical Debt Ratio | **~9% (B)** | Manageable | Estimated from the 8 open findings below (6 Medium + 1 High + 1 Low) against ~3,617 main-source LOC, weighted by remediation effort (mostly config/tooling additions, not redesign). `~` estimated — no SonarQube technical-debt-minutes figure was computed. |
| 9 | Issue Density | **2.2 / 1,000 LOC (0 Critical, 1 High, 6 Medium, 1 Low)** | 0–5, excellent | 8 findings ÷ 3,617 main-source LOC (1,695 backend `src/main` + 1,922 frontend `src`) × 1,000. Test code (1,138 LOC) excluded from the denominator as non-shipping code. |

**Interpretation.** The application code itself — layering, transaction handling, concurrency (compare-and-swap), error translation, validation, accessibility, and configuration hygiene — is genuinely strong and shows clear evidence of a careful remediation pass. The grade is held at **C** for one specific, verifiable reason: the newly-added ~1,138-line backend test suite (the centerpiece of the CQ-001 remediation) has never been compiled or executed, so its correctness — and by extension whether `mvn verify` even succeeds — is unverified. The remaining gaps (CI/CD, schema migration tooling, Tailwind, Run Guide, a lockfile drift on the frontend) are real but lower-impact and mostly pre-existing scope decisions.

---

## 2. Review Metadata

- **Tran Code:** MG-01 — Transaction Type Maintenance (list, add, update, delete; transactions CTLI/COTRTLIC and CTTU/COTRTUPC).
- **Review date:** 2026-07-27.
- **Review type:** Re-review after a remediation pass. The prior report at this path was deleted (per Step 4 contract) and this report was written fresh from the current code — no prior finding was assumed closed without being re-verified against the code read in this pass.
- **Target paths scanned:**
  - `Target/MG-01/Frontend/` (all of `src/**`, `package.json`, `package-lock.json`, `eslint.config.js`, `.prettierrc.json`, `vite.config.js`, `.env`, `README.md`)
  - `Target/MG-01/Backend/transaction-type-service/` (all of `src/main/java/**`, `src/test/java/**`, `src/main/resources/**`, `pom.xml`, `README.md`)
- **Review mode:** Standard 16 quality domains only — no guideline document was supplied (confirmed answer: "No document — standard domains"). No Guideline Conformance section is produced (see §6 note).
- **Context sources consulted:**
  - `Artefacts/TranGroupData/MG-01-TransactionTypeMaintenance-BSTS.md`, `-BDD.md`, `-DB-Details.md`
  - `.Claude/Specs/Refactor/MG-01-Backend-Spec.md`, `MG-01-UI-Spec.md`, `MG-01-reconcile-Spec.md`
  - `Artefacts/Architecture/MG-01.Architecture.md`
  - `Config/Config.md` and `CLAUDE.md`
  - No `Artefacts/MG-01-Run-Guide.md` exists (confirmed absent — recorded as a finding, CQ-006).

---

## 3. Executive Summary

The MG-01 target code is a well-engineered, carefully documented implementation of the Transaction Type maintenance screens, and the remediation pass since the last review closed several genuine gaps: a real test suite now exists, ESLint/Prettier are configured, Spotless enforces formatting on `mvn verify`, and OpenAPI documents all five endpoints. Verification against the current code confirms **CQ-002 (concurrency/lost-update), CQ-005 (formatting gate), CQ-006 (API docs), CQ-009 (logging), CQ-011 (config hygiene), and CQ-012 (locale-aware messages)** from the prior pass are genuinely resolved in the code as it stands. **CQ-003 (Tailwind), CQ-007 (schema migration tooling), CQ-008 (CI/CD), and CQ-010 (Run Guide)** remain open, as expected and previously acknowledged as out of this pass's scope.

The one finding that changes the overall verdict is that the new backend test suite has **never been compiled or executed** — there are no `target/test-classes` and no surefire output on disk, so whether the ~1,138 lines of test code even compile (let alone pass) is unverified. Because a test suite that does not compile would break `mvn verify` entirely (Spotless is also bound to that phase), this is treated as a High-severity finding rather than a cosmetic one. A second, related gap: the frontend's new devDependencies (ESLint, Prettier, and their plugins) are present in `package.json` but absent from `package-lock.json`, so `npm ci` — the reproducible-install command — would fail until a plain `npm install` regenerates the lock; the CQ-004 tooling fix is therefore not yet fully reproducible on a clean checkout.

**Finding counts:** 0 Critical · 1 High · 6 Medium · 1 Low/Informational (8 total).

**Verdict: Remediate then sign off.** No Critical defects were found and nothing here blocks progress structurally, but the unexecuted test suite must be compiled and run (and any resulting failures fixed) before this can be called "shipped," and the lockfile should be regenerated so the tooling fix is actually reproducible.

---

## 4. Findings by Severity

### Critical
None found.

### High

| ID | Area | Finding | Evidence (file:line) | Impact | Recommended Fix |
|----|------|---------|----------------------|--------|------------------|
| CQ-001 | 16 — CI/CD build & quality-gate integration | The backend test suite added since the last review (6 test classes, 1,138 LOC) has never been compiled or executed. `target/` contains only `maven-compiler-plugin` output for `src/main`; there are no `test-classes` and no surefire/failsafe reports anywhere under the module. | `Target/MG-01/Backend/transaction-type-service/target/` (no `test-classes` dir present); `src/test/java/com/carddemo/transactiontype/service/TransactionTypeServiceTest.java` (352 lines, never run); `pom.xml:77-87` (test dependencies declared) | Whether the test suite even compiles — let alone passes — is unverified. Because Spotless's `check` goal is bound to the `verify` phase (`pom.xml:117-125`), a single compile error in `src/test` would fail `mvn verify` outright, meaning the CQ-001 remediation's own claimed benefit (a working, gating test suite) cannot yet be relied upon. | Run `./mvnw test` (or `verify`) at least once, fix any compile/assertion failures, and commit the resulting `target/surefire-reports` evidence (or a CI log) so "tests exist" and "tests pass" are the same verified claim. This is exactly what `/08-TestTarget` and a build step would confirm — until then, treat CQ-001 as open, not closed. |

### Medium

| ID | Area | Finding | Evidence (file:line) | Impact | Recommended Fix |
|----|------|---------|----------------------|--------|------------------|
| CQ-002 | 12 — Dependency & framework currency | The frontend devDependencies added for CQ-004 (`eslint`, `@eslint/js`, `eslint-plugin-react-hooks`, `eslint-plugin-react-refresh`, `globals`, `prettier`) are declared in `package.json` but are absent from `package-lock.json` — confirmed by grepping the lockfile for each package name with zero matches, and confirmed the lockfile still lists only the pre-existing `@babel/*`/esbuild/rollup transitive tree that backs `react`/`vite`. | `Target/MG-01/Frontend/package.json:22-31` (devDependencies); `Target/MG-01/Frontend/package-lock.json` (no `eslint`/`prettier`/`@eslint/js` entries found) | `npm ci` — the command a reproducible build or CI pipeline would use — fails today because the lock and manifest disagree. `npm run lint` / `npm run format` cannot be run from a clean checkout without first doing an un-pinned `npm install`, which is exactly the non-reproducible step CQ-004 was meant to close out. | Run `npm install` once (as the task description notes was blocked in this environment) to regenerate `package-lock.json` with the new devDependencies pinned, then commit the updated lockfile. Verify with `npm ci` afterward. |
| CQ-003 | 1 — Code readability & maintainability (stack conformance) | `Config/Config.md` mandates "React, Tailwind CSS, microanimation, Responsive UI" for the frontend design area; the frontend still uses hand-written CSS (`bfsi-theme.css` 461 lines + `app.css` 133 lines) with no Tailwind dependency anywhere in `package.json`. This is a known, previously-acknowledged, deliberate divergence — re-verified as still present in the current code. | `Config/Config.md:6` (mandate); `Target/MG-01/Frontend/package.json:16-31` (no `tailwindcss` dependency); `Target/MG-01/Frontend/src/styles/bfsi-theme.css`, `app.css`; `Target/MG-01/Frontend/README.md:4-5` ("Styling is `bfsi-theme.css`... no Tailwind" — self-documented) | Utility-class design-token enforcement (spacing/color/typography scale consistency, dead-CSS detection via PurgeCSS-equivalent) is not available; long-term consistency depends entirely on manual discipline in the two hand-written stylesheets. No functional or accessibility defect was observed as a result. | If the mandate stands, migrate the two stylesheets to Tailwind utility classes (a `/06-TargetBuild` spec change, not a Step-9 fix). If the divergence is accepted going forward, record that decision in `Config/Config.md` or the Architecture doc so future reviews stop re-flagging it. |
| CQ-004 | 8 — Database & schema design quality | No schema migration/versioning tool (Flyway, Liquibase, or equivalent) is wired into the backend build; `spring.jpa.hibernate.ddl-auto: none` is set correctly (schema owned by `/05-CreateDB`), but that means schema evolution has **no tooling-enforced traceability or reversibility** anywhere in the codebase — a future column addition or constraint change would have no versioned, replayable record inside this service. | `Target/MG-01/Backend/transaction-type-service/src/main/resources/application.yml:38-40` (`ddl-auto: none`); `Target/MG-01/Backend/transaction-type-service/pom.xml` (no `flyway-core`/`liquibase-core` dependency present) | If/when the schema needs to change, there is no in-repo record of what changed, when, or how to roll it back — that history exists only in whatever the `/05-CreateDB` phase happens to retain outside this codebase. | Introduce Flyway (or Liquibase) with baseline-only migrations that describe (not create) the current schema, so future DDL changes have a versioned, reversible trail even though `ddl-auto` stays `none`. This is a build/spec decision, not a same-file fix. |
| CQ-005 | 16 — CI/CD build & quality-gate integration | No CI/CD pipeline descriptor exists anywhere under `Target/MG-01/` (no `.github/workflows/**`, `Jenkinsfile`, or `sonar-project.properties`), so neither the Spotless format gate, the (currently unverified) test suite, nor a static-analysis quality gate is wired to run automatically on a change. This is consistent with `CLAUDE.md`'s statement that deployment/CI-CD artifacts are out of scope for this workbench — recorded here as a gap per the Step-5 instruction, not as something this review will generate. | `Target/MG-01/Backend/transaction-type-service/` (no CI descriptor found); `Target/MG-01/Frontend/` (none found); `CLAUDE.md` ("Deployment and post-go-live maintenance are out of scope for this workbench") | Every quality gate that exists today (Spotless, ESLint, the test suite) is opt-in and manual; nothing prevents a regression from being committed without anyone running `mvn verify` / `npm run lint` locally first. | Out of this workbench's authored scope per `CLAUDE.md`; record as an open item for whichever team owns deployment tooling. Do not generate pipeline files from this review. |
| CQ-006 | 10 — Documentation | `Artefacts/MG-01-Run-Guide.md` — part of the Phase-6 artifact contract (`CLAUDE.md` pipeline table) — does not exist on disk. Both `Frontend/README.md` and `Backend/.../README.md` are individually good, but neither is the consolidated, cross-tier Run Guide the contract calls for, and `Test-Runner-Refactor` is documented to fall back to the Architecture doc only "if present" is absent. | `Artefacts/` (no `MG-01-Run-Guide.md` found by search); `CLAUDE.md` ("`Artefacts/<Group>-Run-Guide.md` is part of the Phase 6 contract but no Run Guide exists on disk for any group") | An operator or the next reviewer has to reconstruct the full run sequence (Postgres → Keycloak → backend env vars → frontend `.env`) from two separate READMEs and the Architecture doc rather than one authoritative source. | Not a Step-9 fix (the owning agent is `Refactor-Reconcile-Spec` under `/06-TargetBuild`, not this review). Record as an open item for that phase to produce. |
| CQ-008 | 9 — Logging & observability for operability | No request-scoped correlation ID is established at ingress and threaded through every log line of a request. `traceId` is minted ad hoc, per call, only inside `ApiExceptionHandler.build()` (on error) and `TransactionTypeService.audit()` (on a successful write) — a successful read leaves no correlatable identifier in the logs at all, and no inbound header (e.g. `X-Request-Id`/`traceparent`) from the SPA is read or echoed, so a single user action cannot be correlated end-to-end across the frontend and backend logs outside the error/write paths. | `Target/MG-01/Backend/transaction-type-service/src/main/java/com/carddemo/transactiontype/error/ApiExceptionHandler.java:80-93` (`UUID.randomUUID()` per error only); `.../service/TransactionTypeService.java:205-208` (`UUID.randomUUID()` per write only); `.../services/http.js:57-87` (no `X-Request-Id` header ever sent) | Diagnosing a specific user's successful-but-slow or successful-but-wrong read request (E1/E2) after the fact has no log-level correlation hook; only writes and errors are traceable. | Add a lightweight `OncePerRequestFilter` (alongside the existing `RateLimitFilter`) that assigns/accepts a correlation ID into MDC at request entry and includes it in every log line via the logging pattern; have the frontend generate and send that ID as a header. |

### Low / Informational

| ID | Area | Finding | Evidence (file:line) | Impact | Recommended Fix |
|----|------|---------|----------------------|--------|------------------|
| CQ-007 | 12 — Dependency & framework currency | `spring-boot-starter-validation` is declared as a dependency in `pom.xml` but is not used anywhere in the codebase — no `@Valid`, `@NotNull`, `@Size`, or any `jakarta.validation.*` import was found in any `src/main` file; all request validation is done manually in `TransactionTypeValidation`. | `Target/MG-01/Backend/transaction-type-service/pom.xml:46-49` (dependency declared); confirmed via search — zero matches for `jakarta.validation`/`@Valid` under `src/main` | Minor unused-dependency footprint (larger artifact, one more library to track for updates) with no functional effect — the manual validation is thorough and well-tested. | Either remove the dependency if manual validation is the deliberate approach, or adopt `@Valid`/bean-validation annotations on the DTOs to use the dependency that is already being pulled in. Low priority either way. |

---

## 5. Area Coverage Matrix

| # | Area | Status (Findings / Clean / Not applicable — why) | Finding IDs |
|---|------|----------------------------------------------------|-------------|
| 1 | Code readability & maintainability | Findings — otherwise clean (small, single-purpose classes; no duplication or dead code observed; consistent naming) | CQ-003, CQ-007 |
| 2 | Architecture & layering conformance | Clean — controller binds/delegates only, service owns rules + `@Transactional`, repository is parameterized-only, DTOs used at every boundary, no entity leakage | — |
| 3 | BFSI coding-standard conformance | Clean — no money fields in this table (verified against DB-Details); error/status codes are named constants (`ErrorCodes.java`), not magic strings; a dedicated audit-log channel records every write. No `created_by/at` columns exist, but that is inherited from the legacy DB2 table shape (out of this service's control; see CQ-004) | — |
| 4 | Transaction management & data integrity | Clean — `@Transactional(readOnly=true)` on reads, single `@Transactional` unit per write, compare-and-swap update prevents partial/lost writes, `repository.flush()` forces constraint checks inside the delete's try block | — |
| 5 | Concurrency & thread-safety | Clean — compare-and-swap (`updateDescriptionIfUnchanged`) replaces the need for `@Version`; `RateLimitFilter`'s bucket map is a `ConcurrentHashMap` with a documented, deliberate per-instance trade-off | — |
| 6 | Performance & resource efficiency | Clean — keyset pagination (no offset scans), size+1 lookahead avoids a second count query on paging, page size capped at 7 server-side regardless of client request, HikariCP pool sized and `lock_timeout` bounded | — |
| 7 | API design & contract quality | Clean — correct verbs/status codes (200/201/204/400/401/403/404/409/429/500/503), `Location` header on create, consistent `ErrorResponseDto` envelope, OpenAPI/Swagger UI documents all five endpoints and matches the implemented surface | — |
| 8 | Database & schema design quality | Findings — schema itself (PK, seed data) is correctly reproduced from the legacy DDL, but no migration tool provides traceability/reversibility | CQ-004 |
| 9 | Logging & observability for operability | Findings — audit logging and error-path traceId are good; no whole-request correlation ID | CQ-008 |
| 10 | Documentation | Findings — excellent inline Javadoc/JSDoc and per-tier READMEs; the Phase-6 Run Guide artifact itself is missing | CQ-006 |
| 11 | Configuration hygiene (non-secret) | Clean — all URLs/ports/authority names/CORS origins/rate-limit knobs externalized via `application.yml`/env vars or `.env`; no hardcoded environment values found in source | — |
| 12 | Dependency & framework currency | Findings | CQ-002, CQ-007 |
| 13 | Accessibility compliance | Clean — semantic table markup with `scope="col"` and hidden captions, `role="dialog"`/`aria-modal`/focus trap/Esc/focus-restore on `Modal`, `aria-live` region with polite/assertive variant selection, full `aria-required`/`aria-invalid`/`aria-describedby` wiring on `TextField` | — |
| 14 | Internationalization / localization correctness | Clean (for this domain) — backend resolves user-facing copy via `MessageSource`/`Accept-Language` rather than JVM default; the domain has no currency/date/number formatting to get wrong (reference codes + free text only). Frontend copy is hardcoded English, acceptable for a single-locale reference-data screen; recorded as an open item if multi-locale UI is ever required | — (see §9) |
| 15 | Maker-checker / four-eyes traceability | Not applicable — the BSTS/BDD describe a single-actor "arm, then confirm" UI pattern (F10/F5 double-keypress) for the legacy screens, not a two-person approval/dual-control workflow, and no downstream approval step is described for this reference-data table | — |
| 16 | CI/CD build & quality-gate integration | Findings — Spotless is wired to `verify`; the test suite exists but is unverified, and no pipeline/gate runs any of this automatically | CQ-001, CQ-005 |

---

## 6. Guideline Conformance

Not applicable — the user confirmed "No document — standard domains" for this review; no supplied guideline was reviewed against, and this section is intentionally empty per the Step-8 contract.

---

## 7. Standards & Stack Conformance

Against `Config/Config.md`, the group's specs, and `Artefacts/Architecture/MG-01.Architecture.md`:

- **React SPA** — Met. React 18.3.1 + Vite, functional components, hooks-based state machines for both screens.
- **Tailwind CSS, microanimation, responsive UI** — **Absent.** Hand-written CSS (`bfsi-theme.css`/`app.css`) is used instead; no Tailwind dependency exists. Self-documented in the frontend README as a deliberate choice. (CQ-003)
- **REST APIs + API gateway** — Partially met. The REST API itself (`/api/v1/transaction-types`, correct verbs/status codes) fully conforms; no API gateway is present in the built target (the Architecture doc's §7 Open Decision #4 flags this as left to the platform team), so the in-process `RateLimitFilter` and CORS config compensate at the service boundary. Consistent with the Architecture doc's own acknowledgment.
- **Java + Spring Boot** — Met. Spring Boot 3.4.2 / Java 21, layered `api/service/repository` packages, Spring Data JPA + Specifications for parameterized dynamic queries.
- **Postgres** — Met. `TRANSACTION_TYPE` table matches DB-Details exactly (`TR_TYPE` PK, `TR_DESCRIPTION`); `ddl-auto: none` correctly defers schema ownership to `/05-CreateDB`, though no migration tool exists to make future schema evolution traceable (CQ-004).
- **Redis for TSQ-equivalent state / Kafka-RabbitMQ for TDQ-equivalent** — Not applicable and correctly absent. DB-Details and MoveGroup.md confirm MG-01 uses no VSAM/TSQ/TDQ; no cache, queue, or event stream is present, matching the Architecture doc's explicit statement that these Config rows are "deliberately not exercised."
- **OAuth 2.0 / TLS 1.3** — Partially met (Security-Review's remit, noted here only for completeness): OAuth2 Resource Server JWT validation is implemented; TLS itself is not configured on the service (`server.ssl.*` absent), consistent with `CLAUDE.md`'s statement that the service runs on plain HTTP and TLS termination is left to a reverse proxy/gateway not yet built.
- **Microservice-based architecture** — Met. Single-purpose `transaction-type-service` owning exactly one table, stateless, horizontally scalable (per the Architecture doc's Deployment/Topology section).

---

## 8. Remediation Plan

**Fix before sign-off:**
1. **CQ-001** — Compile and run the backend test suite (`./mvnw test`), fix any compile/assertion errors surfaced, and keep the resulting `target/surefire-reports` (or an equivalent CI run) as evidence. Touches: no source change expected unless a test itself is broken; if so, the specific test file. Effort: small if the tests are correct as written, larger if compile errors exist.
2. **CQ-002** — Run `npm install` once to regenerate `package-lock.json` with the new devDependencies pinned, then verify `npm ci` succeeds. Touches: `Target/MG-01/Frontend/package-lock.json` only. Effort: trivial (one command), but requires an environment where `npm` can reach the registry.

**Fix in the next iteration:**
3. **CQ-004** — Introduce Flyway/Liquibase with a baseline-only migration describing the current schema. Touches: `pom.xml` (new dependency), a new `src/main/resources/db/migration` baseline script, `application.yml` (Flyway config, still with no auto-apply of DDL beyond baseline). Effort: medium — needs coordination with `/05-CreateDB` ownership.
4. **CQ-008** — Add a correlation-ID filter (backend) and a matching header on the frontend's `http.js`. Touches: new `security/CorrelationIdFilter.java`, `SecurityConfig.java` (register the filter), `logging` pattern config, `Target/MG-01/Frontend/src/services/http.js`. Effort: small–medium.
5. **CQ-006** — Produce the consolidated `Artefacts/MG-01-Run-Guide.md` (owned by `Refactor-Reconcile-Spec` under `/06-TargetBuild`, not this review). Effort: small, but requires re-running that phase.
6. **CQ-003** — Decide whether to migrate to Tailwind (a `/06-TargetBuild` spec + code change) or formally accept the divergence in `Config/Config.md`/Architecture doc. Effort: large if migrating (two stylesheets, ~594 lines, to utility classes); trivial if accepting.

**Optional cleanup:**
7. **CQ-007** — Remove the unused `spring-boot-starter-validation` dependency, or adopt `@Valid` annotations to use it. Touches: `pom.xml`, optionally the two request DTOs. Effort: trivial.
8. **CQ-005** — CI/CD pipeline wiring is explicitly out of this workbench's scope per `CLAUDE.md`; no action expected from this review, recorded for whichever team owns deployment tooling.

---

## 9. Open Items & Assumptions

- **Tool-measured metrics are estimated.** No SonarQube, JaCoCo, PMD, or npm audit run was performed as part of this review (the agent is restricted to read-only inspection). Metrics 2–4 and 8 in the scorecard are manual estimates from reading the code, marked `~`, and should be replaced with real tool output once a build environment is available.
- **The test suite's actual pass/fail outcome is unknown** (see CQ-001) — this review can confirm the tests are well-designed and cover the right scenarios (paging lookahead, no-change guard, compare-and-swap conflicts, SQLSTATE translation, the authorization matrix) by reading them, but cannot confirm they compile or pass without a build being run. Re-run `/08-TestTarget` (or `./mvnw test` directly) to close this out.
- **Frontend build reproducibility is unverified** beyond the lockfile drift noted in CQ-002 — `npm install`/`npm run build` were not executed as part of this review (no builds are run by this agent).
- **Runtime behavior of accessibility and locale features** (screen-reader announcement timing, actual color contrast against `Config/Style-Sheet.md` tokens) was assessed from source code (ARIA attributes, live-region wiring, semantic markup) but not from a rendered browser session; a manual or automated a11y audit (axe, Lighthouse) would be a useful follow-up.
- **Security-adjacent observations noticed in passing, for the `Security-Review` agent (not scored here):** the in-process `RateLimitFilter` keys solely on `request.getRemoteAddr()` and explicitly does not trust `X-Forwarded-For` (by design, per its own Javadoc) — worth confirming with Security-Review whether the eventual reverse-proxy/gateway is expected to set a trusted forwarded-header the filter should read instead; and the JWT audience claim (`app.security.expected-audiences`) is empty by default, meaning only issuer/signature/expiry are enforced until a second service shares the realm — both are pre-existing, documented trade-offs in the code itself, not new discoveries.
- **Schema audit-trail columns** (`created_by/at`, `modified_by/at`) do not exist on `TRANSACTION_TYPE` because the legacy DB2 table never had them and schema is owned by `/05-CreateDB`; this review records it as an inherited characteristic rather than a code defect, since the service cannot alter the schema.

---

## Fixes Applied

None. Per this review's task scope, no fixes were applied to `Target/MG-01/` in this run — this report reflects findings only. Re-run this review (and `/08-TestTarget`) after any remediation to verify closure.

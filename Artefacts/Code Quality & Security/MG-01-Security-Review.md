# MG-01 — Transaction Type Maintenance — Security Review (Re-Review)

> **Re-review after a remediation pass.** This report supersedes and replaces the prior
> `MG-01-Security-Review.md` in full. Every finding below (open or newly raised) was verified
> against the code as it stands today — no prior finding was assumed closed without re-reading
> the relevant file.

---

## 1. Security Scorecard

| # | Metric | Measured value | Band | Basis (how it was derived) |
|---|--------|----------------|------|------------------------------|
| 1 | Overall Security Posture Grade | **F** | F — critical/exploitable finding present | 1 Critical finding (SEC-001, no TLS anywhere in the stack) forces this grade per the consistency rule, regardless of the otherwise sound authorization/injection posture. |
| 2 | OWASP Top 10 (2021) Coverage | **5 / 10 clean** | D (4–5, broad exposure) | Clean: A01 Broken Access Control, A03 Injection, A08 Software/Data Integrity, A09 Logging/Monitoring Failures, A10 SSRF (N/A, no outbound user-controlled requests). Breached: A02 Cryptographic Failures (SEC-001, SEC-003), A04 Insecure Design (SEC-006), A05 Security Misconfiguration (SEC-004, SEC-007), A06 Vulnerable/Outdated Components (SEC-005), A07 Identification & Auth Failures (SEC-002). |
| 3 | Authentication & Session Strength | **~80%** (estimated) | B (75–89%, minor gaps) | Present: issuer/signature/expiry validation (`SecurityConfig.jwtDecoder`), in-memory-only token storage (`keycloak.js`, no localStorage/sessionStorage of the token), silent refresh (`ensureFreshToken`), clean logout, idle-timeout hand-off to re-login (`http.js` → `setSessionExpiredHandler`), no hardcoded/default credentials, no stray `permitAll()`. Missing: `aud` claim enforcement is off by default (SEC-002). One material control absent out of ~6 expected → ~80%, marked estimated because no automated auth test run was executed against a live IdP. |
| 4 | Authorization Coverage | **100%** | 100% (every endpoint guarded, no IDOR) | Basis: all 5 REST endpoints (`GET` list, `GET {code}`, `POST`, `PUT {code}`, `DELETE {code}`) are matched in `SecurityConfig.filterChain` with an explicit authority requirement; `SecurityConfigAuthorizationTest` exercises the full matrix (anonymous/read/admin × 5 endpoints). No per-row ownership exists to bypass (shared reference table, not user-owned), so no IDOR surface. |
| 5 | Input Validation & Injection Resistance | **~98%** | A (≥95%, no injection sinks) | Basis: 5 inbound fields (`typeCode`, `description`, `cursor`, `direction`, `size`) all pass through `TransactionTypeValidation` before any DB access; all queries are JPA `Specification`s or `@Query` with bound `:param`s (`TransactionTypeRepository`, `TransactionTypeSpecifications`) — no string concatenation, no native SQL found. No confirmed injection sink → metric not forced to F. |
| 6 | Data Protection & Privacy Compliance (PCI/GDPR) | **~95%** | A (90–100%) | `TRANSACTION_TYPE` holds only a 2-char reference code and a free-text description (DB-Details §a/b); no PAN, CVV, SSN, account ID, or personal data is in scope (confirmed against `MG-01-TransactionTypeMaintenance-DB-Details.md` and `MG-01.Architecture.md` §5 GDPR note). DTOs are identifier-free (`TransactionTypeDto`, `ErrorResponseDto`). Encryption-at-rest is a platform/infrastructure concern not verifiable from code (open item). |
| 7 | Transport, Headers & Browser Hardening | **~50%** | D (40–59%, plaintext transport present) | Present: restrictive CORS (`SecurityConfig.corsConfigurationSource`), CSP generated per build mode (`vite.config.js`), `frame-ancestors 'none'` in that CSP, Spring Security's default response headers on backend API responses (`X-Content-Type-Options: nosniff`, `Cache-Control: no-store`, `X-Frame-Options: DENY` — none of these were overridden). Absent: TLS/HSTS anywhere (SEC-001), and no `Referrer-Policy`/`X-Content-Type-Options` for the SPA's own static assets since no hosting/reverse-proxy config exists in the target (SEC-004). ~4 of 8 expected controls present. |
| 8 | Secrets & Supply-Chain Hygiene | **C** | C (0 live secrets; no dependency scan actually executed) | 0 live credentials/keys found in any file read (`application.yml` has no default DB password; `.env`/`.env.example` carry only public dev URLs and role names). Dependencies are version-pinned in both `pom.xml` and `package.json`, and `package-lock.json` is present. However `dependency-check-maven` is an **opt-in** Maven profile and `npm run audit` is a manual script — neither has ever been run (no scan report artefact exists anywhere under `Target/MG-01/`), so "no known vulnerable dependencies" is unverified, not confirmed clean (SEC-005). `.env` (non-sensitive content) is tracked in git despite `.gitignore` (SEC-007) — hygiene gap, not a live secret. |
| 9 | Vulnerability Density | **~1.9 / 1,000 LOC** (7 findings / ~3,617 LOC); **~1.2 / endpoint** (7 findings / 6 HTTP endpoints incl. health) | A (0–3, excellent) | LOC basis: `find ... -name "*.java"` under `src/main` = 1,695 lines; `find ... -name "*.js" -o -name "*.jsx"` under `Frontend/src` = 1,922 lines; total 3,617 (test code and generated `dist/` excluded). Endpoint basis: 5 business endpoints + 1 actuator health endpoint. 7 total findings (1 Critical, 1 High, 3 Medium, 2 Low). |

**Interpretation.** The application-layer engineering is genuinely strong — parameterized queries throughout, a real compare-and-swap fix for lost updates, a dedicated audit channel for both successful writes and denied requests, in-process rate limiting, a mode-aware CSP, and a full server-side authorization matrix backed by tests. But the two items the last review explicitly left open are structural, not cosmetic: **the service has no transport encryption at all** (SEC-001) and **JWT audience is not enforced by default** (SEC-002/old-SEC-003). Because the first exposes every bearer token and every request/response body in cleartext, the overall grade is **F** — not safe to deploy as configured — even though the finding density and the fix quality elsewhere are excellent.

---

## 2. Review Metadata

- **Tran Code:** MG-01 — Transaction Type Maintenance (transactions CTLI/COTRTLIC, CTTU/COTRTUPC).
- **Review date:** 2026-07-27.
- **Review type:** Re-review after a remediation pass (fresh finding IDs; every prior finding independently re-verified against current code).
- **Target paths scanned:**
  - `Target/MG-01/Frontend/` — `src/**`, `package.json`, `package-lock.json`, `vite.config.js`, `index.html`, `.env`, `.env.example`, `.gitignore`.
  - `Target/MG-01/Backend/transaction-type-service/` — `src/main/java/**`, `src/main/resources/application.yml`, `src/main/resources/messages/messages.properties`, `src/test/java/**` (read for coverage, not executed), `pom.xml`.
- **Context sources consulted:**
  - `.Claude/Specs/Refactor/MG-01-Backend-Spec.md`, `MG-01-UI-Spec.md`, `MG-01-reconcile-Spec.md` (referenced via the Architecture doc; not independently re-read line-by-line this pass since the Architecture doc consolidates the security-relevant decisions).
  - `Artefacts/Architecture/MG-01.Architecture.md` (full read).
  - `Artefacts/TranGroupData/MG-01-TransactionTypeMaintenance-DB-Details.md` (full read — confirms the single in-scope table and its non-sensitive columns).
  - `Config/Config.md` (full read — target stack mandate, incl. "OAuth 2.0, HTTPS/TLS 1.3").
  - `CLAUDE.md` (project root — pipeline golden rules, MG-01 run posture, and the documented gotcha that the service listens on plain HTTP while permissions still allowlist `https://localhost:8443`).
- **Not independently re-read this pass:** `MG-01-TransactionTypeMaintenance-BDD.md` / `-BSTS.md` (functional behaviour, not security-relevant beyond what DB-Details already established about data sensitivity).

---

## 3. Executive Summary

The MG-01 backend and frontend show a mature, defense-in-depth security design for a single-table reference-data service: parameterized SQL exclusively, a working compare-and-swap fix for lost updates, a dedicated audit trail for both successful writes and access denials, in-process rate limiting ahead of authentication, mode-aware CSP, and a fully-tested server-side authorization matrix that a client can never bypass by hiding a button. Data-protection and injection risk are both low because the in-scope table holds no PAN/PII and every write path is validated and bound. However, two structural gaps remain, both explicitly called out by the calling context as deliberately unfixed: **no TLS/HTTPS anywhere in the built target** (Critical) and **JWT audience not enforced by default** (High). Three further Medium gaps and two Low hygiene items round out the picture.

**Findings: 1 Critical, 1 High, 3 Medium, 2 Low/Informational (7 total).**

**Verdict: not safe to deploy** as currently configured — the Critical transport-security gap must be closed (a TLS-terminating layer, in front of or inside the service) before this build is exposed to any network the operator does not fully trust, and the High audience-validation gap should be closed before any second client is onboarded to the same Keycloak realm.

---

## 4. Findings by Severity

### Critical

| ID | Area | Finding | Evidence (file:line) | Risk / Impact | Recommended Fix |
|----|------|---------|------------------------|----------------|-------------------|
| SEC-001 | 3 — Transport & network | The service listens on plain HTTP with no TLS configuration anywhere in the built target; no API gateway or reverse proxy exists to terminate TLS either. Every bearer JWT, every request/response body, and the DB connection string travel over an unencrypted channel by default. | `Target/MG-01/Backend/transaction-type-service/src/main/resources/application.yml:1-2` (`server: port: 8080`, no `server.ssl.*` block); `Target/MG-01/Backend/transaction-type-service/src/main/java/com/carddemo/transactiontype/security/SecurityConfig.java:67-94` (no `requiresChannel()`/HTTPS redirect); `Target/MG-01/Backend/transaction-type-service/src/main/java/com/carddemo/transactiontype/security/RateLimitFilter.java:22-24` ("No API gateway exists in the built target"); `CLAUDE.md` "Backend" section confirms "plain HTTP; no TLS configured" and flags the mismatch with the `https://localhost:8443` allowlist entry. | Bearer tokens, admin credentials in the token, and all business data are interceptable by anyone on the network path (classic-MITM / packet capture). Directly breaches the `Config/Config.md` mandate "Security \| RACF -> OAuth 2.0, HTTPS/TLS 1.3" and the Architecture doc §5 assumption that TLS 1.3 is "terminated at the API gateway/ingress" — that layer does not exist in the built target, so the mandate is unmet end-to-end. | Terminate TLS 1.3 in front of the service (reverse proxy/ingress/gateway) before any shared-network deployment, or configure `server.ssl.*` directly in `application.yml` for standalone deployments; add HSTS once TLS is live; update `CLAUDE.md`'s allowlisted curl target to match whichever layer actually holds the certificate. |

### High

| ID | Area | Finding | Evidence (file:line) | Risk / Impact | Recommended Fix |
|----|------|---------|------------------------|----------------|-------------------|
| SEC-002 | 1 — Authentication & session | JWT `aud` (audience) claim is not validated by default. `app.security.expected-audiences` resolves from `${JWT_EXPECTED_AUDIENCES:}`, which is empty unless an operator sets the environment variable — and no `.env`/run instruction anywhere in the target sets it. The decoder then validates only issuer/signature/expiry. | `Target/MG-01/Backend/transaction-type-service/src/main/resources/application.yml:76-80` (`expected-audiences: ${JWT_EXPECTED_AUDIENCES:}`); `Target/MG-01/Backend/transaction-type-service/src/main/java/com/carddemo/transactiontype/security/SecurityConfig.java:102-115` (`jwtDecoder` only adds `AudienceValidator` when the list is non-empty); `Target/MG-01/Backend/transaction-type-service/src/main/java/com/carddemo/transactiontype/security/AudienceValidator.java:1-36` (correct implementation, but only wired in conditionally). | Any JWT minted by the same Keycloak realm/issuer for a *different* client or resource server (audience confusion, OWASP A07) is currently accepted here as long as it is signed by the same realm and unexpired — a plausible attack path the moment a second microservice or a public/native OAuth client shares this realm, which the Architecture doc (§7 Open Decision 1) already anticipates as an upcoming change. | Set `JWT_EXPECTED_AUDIENCES` to the real audience value the `mg01-frontend`/resource-server client mints, in every environment, before a second client is onboarded to the `carddemo` realm; treat "audience configured" as a go-live gate, not an optional hardening step. |

### Medium

| ID | Area | Finding | Evidence (file:line) | Risk / Impact | Recommended Fix |
|----|------|---------|------------------------|----------------|-------------------|
| SEC-003 | 10 — Database & persistence | The service-to-Postgres link's encryption is not guaranteed: the datasource URL defaults to `sslmode=prefer`, which silently falls back to an unencrypted connection if the server doesn't offer TLS or the handshake fails, rather than failing closed. | `Target/MG-01/Backend/transaction-type-service/src/main/resources/application.yml:25` (`url: ${DB_URL:jdbc:postgresql://localhost:5432/CARDDEMO?sslmode=${DB_SSL_MODE:prefer}}`). | Combined with SEC-001, this means neither leg of the request path (client↔service, service↔DB) is verified encrypted by default; an operator who forgets to set `DB_SSL_MODE=require`/`verify-full` in a shared environment gets no error, just silent plaintext. | Change the default to `require` (or `verify-full` with a trusted CA) for any environment beyond an isolated local sandbox; consider failing fast if `DB_SSL_MODE=prefer` is detected outside a `local`/`dev` profile. |
| SEC-004 | 5 — Output encoding & browser-side risk | The SPA's own static-asset responses carry no `Strict-Transport-Security`, `X-Content-Type-Options`, `Referrer-Policy`, or `X-Frame-Options` header — only the CSP `<meta>` tag is present. There is no Dockerfile, nginx config, or other hosting descriptor anywhere under `Target/MG-01/Frontend/` to add these at the serving layer, and HTML `<meta>` tags cannot carry `X-Content-Type-Options`, `Referrer-Policy`, or a true `X-Frame-Options`/HSTS header (only `frame-ancestors` inside CSP works via `<meta>`, and it is present). | `Target/MG-01/Frontend/index.html:6-13` (only a CSP `<meta>` tag); confirmed no `Dockerfile`/`nginx.conf`/equivalent exists (`find ... -iname "*dockerfile*" -o -iname "*nginx*" -o -iname "*.conf"` returned nothing). Backend API responses *are* covered by Spring Security's default header writer (not overridden anywhere in `SecurityConfig.java`), so this gap is frontend-static-asset-specific. | Reduced defense-in-depth against MIME-sniffing and referrer leakage for the SPA shell itself (clickjacking is already mitigated via `frame-ancestors 'none'` in the CSP). Low likelihood alone, but compounds with SEC-001 (no TLS, so HSTS cannot even apply yet). | When a hosting layer for the built `dist/` is introduced, add `X-Content-Type-Options: nosniff`, `Referrer-Policy: no-referrer` (or `strict-origin-when-cross-origin`), and (once SEC-001 is fixed) `Strict-Transport-Security` at that layer. |
| SEC-005 | 13 — Dependency & supply chain | Dependency-vulnerability scanning exists only as tooling, never as an executed control: `dependency-check-maven` is bound to an opt-in `security-scan` Maven profile, and `npm run audit` is a manual script. No scan report artefact exists anywhere under `Target/MG-01/`, so the current CVE exposure of the pinned versions (Spring Boot 3.4.2, springdoc-openapi 2.7.0, bucket4j 8.10.1 on the backend; keycloak-js 24.0.5, react/react-dom 18.3.1, react-router-dom 6.30.4, vite 5.4.21 on the frontend) is unverified, not confirmed clean. | `Target/MG-01/Backend/transaction-type-service/pom.xml:20-27` (version properties), `:130-163` (opt-in `security-scan` profile, not part of the default build); `Target/MG-01/Frontend/package.json:11` (`"audit": "npm audit --audit-level=high"`, a manual script, not a build/CI gate); no `dependency-check-report.*` or audit output found under `Target/MG-01/`. | Cannot state with confidence whether any pinned dependency carries a known CVE at CVSS ≥ 7 — this is a control-completeness gap, not a confirmed vulnerable component (no CVE ID is asserted here; a scan is required to know). | Run `./mvnw -Psecurity-scan verify` (with `NVD_API_KEY` set) and `npm run audit --prefix Frontend` before sign-off, and wire both into whatever CI exists going forward rather than leaving them opt-in only. |

### Low / Informational

| ID | Area | Finding | Evidence (file:line) | Risk / Impact | Recommended Fix |
|----|------|---------|------------------------|----------------|-------------------|
| SEC-006 | 12 — Availability & abuse resistance | The in-process rate limiter keys strictly on `request.getRemoteAddr()` and holds buckets in memory only. This is a deliberate, documented trade-off (X-Forwarded-For is correctly *not* trusted, since it is caller-supplied), but it means (a) many legitimate callers behind a shared NAT/corporate proxy share one 300 req/min budget, and (b) the effective budget multiplies if the service is ever horizontally scaled (no shared store). | `Target/MG-01/Backend/transaction-type-service/src/main/java/com/carddemo/transactiontype/security/RateLimitFilter.java:89-97` (key = `getRemoteAddr()` only); `:27-29` (Javadoc already documents the per-instance limitation). | Low — availability/false-positive risk only, not a bypass of the control's intent (the code correctly refuses to trust a spoofable header). Becomes relevant only if/when the service is scaled horizontally or fronted by a NAT-heavy client population. | If/when this service is scaled to multiple instances or placed behind a real gateway, move the bucket store to Redis (already in the target stack per `Config/Config.md`) or push the limit to that gateway. |
| SEC-007 | 7 — Secrets & configuration | `Target/MG-01/Frontend/.env` is tracked in git even though `.gitignore` lists `.env`/`.env.*` as ignored (only `.env.example` is meant to be committed). Current content is non-sensitive (identical shape to `.env.example`: public dev URLs and role names, no credential), so this is a hygiene finding, not a live secret leak. | `Target/MG-01/Frontend/.gitignore:7-10` (`.env` / `.env.*` ignored, `!.env.example` re-included); `git ls-files -- "Target/MG-01/Frontend/.env"` returns the file as tracked (verified via `git check-ignore -v` and `git log --follow`, both showing it committed in prior commits). | If a future edit to `.env` ever adds a real secret (an API key, a non-local Keycloak client secret, etc.), it would be committed by default because the file is already tracked — `.gitignore` cannot retroactively protect an already-tracked file. | Remove `Target/MG-01/Frontend/.env` from git tracking (`git rm --cached`) so `.gitignore` actually takes effect going forward; keep only `.env.example` in version control. |

---

## 5. Area Coverage Matrix

| # | Area | Status | Finding IDs |
|---|------|--------|--------------|
| 1 | Authentication & session | Findings | SEC-002 |
| 2 | Authorization | Clean — every state-changing and read endpoint is guarded by an explicit server-side authority check (`SecurityConfig.filterChain`), exercised by `SecurityConfigAuthorizationTest`; no per-row ownership model to bypass (shared reference table); client-side `canWrite` gating is cosmetic only and backed by the same server check. | — |
| 3 | Transport & network | Findings | SEC-001 |
| 4 | Input validation & injection | Clean — every inbound field validated server-side in `TransactionTypeValidation` before DB access; all queries parameterized (`Specification`/`@Query` with bound params), no concatenated or native SQL found; no mass-assignment risk (request DTOs carry only `typeCode`/`description`, matching the entity 1:1). | — |
| 5 | Output encoding & browser-side risk | Findings | SEC-004 |
| 6 | CSRF & state-changing requests | Clean — `csrf().disable()` is coherent with the auth model: the API is stateless bearer-token-only (`SessionCreationPolicy.STATELESS`), no cookie-based session exists to be forged. | — |
| 7 | Secrets & configuration | Findings | SEC-007 |
| 8 | Data protection & privacy (BFSI/GDPR/PCI) | Clean / mostly not applicable — the single in-scope table (`TRANSACTION_TYPE`) holds only a 2-char code and a free-text description; no PAN, CVV, SSN, account ID, or personal data is read or written by this service (confirmed against DB-Details and Architecture §5). DTOs are identifier-free. | — |
| 9 | Error handling & information disclosure | Clean — every error path (`ApiExceptionHandler`, `ApiErrorWriter`) returns a fixed-shape, code-driven `ErrorResponseDto`; raw SQLSTATE/stack is logged server-side against a `traceId` and never serialized to the client; actuator exposes `health` only (`show-details: never`). | — |
| 10 | Database & persistence | Findings | SEC-003 |
| 11 | Logging, audit & monitoring | Clean — a dedicated `com.carddemo.transactiontype.audit` channel records every successful write (`TransactionTypeService.audit`) and every 401/403/429 (`SecurityConfig.auditDenied`, `RateLimitFilter`) with principal, action, code, outcome, and a correlating `traceId`; description/typeCode fields are regex-constrained (alnum+space, 2-digit), which also forecloses log-injection via those fields. | — |
| 12 | Availability & abuse resistance | Findings | SEC-006 |
| 13 | Dependency & supply chain | Findings | SEC-005 |
| 14 | API & HTTP hygiene | Clean — correct verbs/status codes per operation (200/201/204/404/409/429), `Cache-Control: no-store` applied by Spring Security defaults, `/api/v1` versioning, no method override, actuator surface minimal, OpenAPI contract gated behind authentication. | — |
| 15 | Build & deployment posture | Clean — no `spring-boot-devtools` dependency present in `pom.xml`; no source maps forced on in `vite.config.js` (Vite defaults production `sourcemap` to off, not overridden); CSP is generated per build mode, not hardcoded to the dev policy. Deployment/container posture itself is out of scope for this workbench per `CLAUDE.md` (no Dockerfile exists for either tier), so it is not scored as a gap here. | — |

---

## 6. Compliance Posture

- **OAuth 2.0 / JWT (Config.md mandate)** — **Partially met.** Issuer/signature/expiry validation is correctly implemented and tested (`SecurityConfig`, `SecurityConfigAuthorizationTest`); audience validation exists in code (`AudienceValidator`) but is not enforced by default (SEC-002).
- **HTTPS / TLS 1.3 (Config.md mandate)** — **Absent.** No TLS termination exists anywhere in the built target, at either tier or a gateway (SEC-001); the DB link's encryption is also not guaranteed by default (SEC-003).
- **OWASP Top 10 (2021)** — **5 of 10 categories clean** (see scorecard metric 2); breaches in A02 (Cryptographic Failures), A04 (Insecure Design), A05 (Security Misconfiguration), A06 (Vulnerable/Outdated Components), A07 (Identification & Authentication Failures).
- **PCI-DSS** — **Met / not applicable.** No PAN, CVV, or cardholder data is stored or transmitted by this service (confirmed against DB-Details); the table in scope is a reference/lookup table only.
- **GDPR** — **Met / not applicable.** No personal data is processed by this service, consistent with Architecture §5's own assessment; no masking, consent, retention, or erasure workflow is required for this scope.

---

## 7. Remediation Plan

**Fix before deployment**
1. **SEC-001** — Terminate TLS 1.3 in front of the service (reverse proxy/ingress/API gateway) or configure `server.ssl.*` directly for standalone deployments; add HSTS once live. Touches: infrastructure/deployment layer (out of this service's own files) and, if done in-service, `application.yml`. Effort: Medium–High (requires a certificate and either an infra component or Spring Boot SSL config plus testing).
2. **SEC-002** — Set `JWT_EXPECTED_AUDIENCES` to the real audience value in every environment before a second client shares the `carddemo` realm. Touches: deployment environment variables (no code change needed; `AudienceValidator` already exists). Effort: Low.

**Fix in the next iteration**
3. **SEC-003** — Default `DB_SSL_MODE` to `require`/`verify-full` outside local sandboxes. Touches: `application.yml:25`, environment configuration. Effort: Low.
4. **SEC-004** — Add `X-Content-Type-Options`, `Referrer-Policy`, and (post SEC-001) HSTS at whatever layer eventually serves the built `dist/`. Touches: a future hosting/reverse-proxy config (none exists yet); no application code change. Effort: Low–Medium.
5. **SEC-005** — Run `./mvnw -Psecurity-scan verify` and `npm run audit` and review/remediate any findings; consider making both mandatory rather than opt-in. Touches: CI/build process, `pom.xml` profile invocation. Effort: Low (to run); variable (to remediate whatever it finds).

**Optional hardening**
6. **SEC-006** — Move rate-limit buckets to Redis (already in the target stack) if/when this service is scaled horizontally. Touches: `RateLimitFilter.java`. Effort: Medium.
7. **SEC-007** — `git rm --cached Target/MG-01/Frontend/.env` so `.gitignore` takes effect for future edits. Touches: git history/tracking only, no source change. Effort: Low.

---

## 8. Open Items & Assumptions

- **Test suite present but never executed.** `src/test/java/**` (6 files, ~1,138 lines) covers the authorization matrix, rate limiting, validation, the DB-exception translator, and the service/controller layers with meaningful assertions (spot-checked `SecurityConfigAuthorizationTest`), but no build or test run has been performed. The scorecard treats this as unverified assurance, not as evidence of a passing state — run `mvn test` before relying on it for sign-off.
- **Dependency CVE status unconfirmed.** No `dependency-check-maven` or `npm audit` output exists in the repository; the versions listed under SEC-005 are reported as read from the manifests, not as a scanned-clean or scanned-vulnerable result. A real scan is needed to know either way.
- **Infrastructure-level controls out of this review's reach.** Whether a reverse proxy, gateway, container platform, or WAF sits in front of this service in any real deployment is unknown from the code alone; SEC-001/SEC-004's remediation may already be partially handled at a layer this review cannot see, since deployment artefacts are explicitly out of scope for this workbench (`CLAUDE.md`) and none exist under `Target/MG-01/`.
- **Keycloak realm configuration itself was not inspected** (no realm export file was found in the target) — whether the `carddemo` realm currently mints an `aud` claim at all, and what value, could not be confirmed from code; SEC-002's fix depends on that value.
- **Estimated (`~`) scorecard metrics** (rows 3, 6, 7, and the LOC-normalized side of row 9) are qualitative estimates derived from manual code reading, not from a SAST/dependency-check/coverage tool run — they should be replaced with tool-measured figures once `mvn -Psecurity-scan verify`, `npm audit`, and a test run are actually executed.

---

## Summary of prior-report status (verify, don't trust)

| Old ID | Claimed remediation | Verified status this pass |
|--------|----------------------|------------------------------|
| SEC-002 (old, TLS/DB) | JDBC URL carries `?sslmode=${DB_SSL_MODE:prefer}` | **Partially open** — mechanism added, but `prefer` does not guarantee encryption; re-raised as **SEC-003** (Medium). |
| SEC-004 (old, lost update) | Compare-and-swap UPDATE, no `@Version` column | **Confirmed closed.** `TransactionTypeRepository.updateDescriptionIfUnchanged` + `TransactionTypeService.update` correctly detect concurrent modification and return 409 `TXN_TYPE_CONCURRENTLY_MODIFIED`. |
| SEC-005 (old, 401/403 audit) | Dedicated AUDIT channel for denials | **Confirmed closed.** `SecurityConfig.auditDenied` logs every 401/403 with principal, method, path, code, traceId; `TransactionTypeService.audit` covers successful writes. |
| SEC-006 (old, rate limiting) | Bucket4j filter before `BearerTokenAuthenticationFilter`, IP-keyed, 300/min | **Confirmed closed, with a residual Low-severity note.** Re-raised as **SEC-006** (Low) for the shared-NAT/per-instance limitation, which is a documented design trade-off, not a defect in the control's intent. |
| SEC-007 (old, CSP) | Per-build-mode CSP via Vite plugin | **Confirmed closed for CSP itself.** Residual gap in the *rest* of the browser-hardening header set re-raised as **SEC-004** (Medium). |
| SEC-008 (old, dependency scan) | OWASP dependency-check-maven (opt-in profile) + `npm run audit` script | **Tooling added, but never executed.** Re-raised as **SEC-005** (Medium) — the capability exists but has produced no evidence of a clean dependency posture to date. |
| SEC-001 (old, TLS) | Deliberately not fixed | **Confirmed still open.** Re-raised as **SEC-001** (Critical) — no TLS anywhere in the built target. |
| SEC-003 (old, JWT `aud`) | Deliberately not fixed | **Confirmed still open.** Re-raised as **SEC-002** (High) — `expected-audiences` defaults empty, so `aud` is not enforced. |

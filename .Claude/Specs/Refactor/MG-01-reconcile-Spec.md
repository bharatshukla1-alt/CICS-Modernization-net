# MG-01-reconcile-Spec.md

## 1. Reconciliation Metadata
- **Tran Group**: MG-01
- **Short Description**: Transaction type maintenance — list, add, update, delete
- **Source Specs Read**: 
  - `.Claude/Specs/Refactor/MG-01-UI-Spec.md`
  - `.Claude/Specs/Refactor/MG-01-Backend-Spec.md`
- **Target Stack**: React, Tailwind CSS, microanimation, Responsive UI, .NET Core 9 (C#) with ASP.NET Core Web API, Postgres, Oauth 2.0, HTTPS/TLS 1.3, Stateless REST + client-held state.

## 2. Reconciled Screen Overview
The Transaction Type List and Maintenance Details screens combine into a fully functional administrative workbench. The frontend uses a modern React application to browse, search, and page through transaction types, and offers single-record CRUD capabilities. The backend is a stateless .NET Core 9 REST API that enforces business rules and interacts with a Postgres database. The end-to-end flow is secured via OAuth 2.0 and TLS 1.3.

## 3. Field Binding Map
| UI Field | Backend Attribute | Type/Format | Required/Optional | Access | Notes |
|---|---|---|---|---|---|
| Type Code Filter | `typeCode` (Query on E1) | string(2), numeric | Optional | Editable | Filter bar |
| Description Filter | `description` (Query on E1) | string(≤50) | Optional | Editable | Filter bar |
| Table Type Code | `typeCode` (Response from E1) | string(2) | Required | Read-only | List display |
| Table Description | `description` (Response from E1) | string(≤50) | Required | Read-only | List display |
| Detail Search Code | `typeCode` (Path/Body E2-E5) | string(2), numeric | Required | Editable/Read-only | Details card |
| Detail Description | `description` (Body E3, E4) | string(≤50) | Required | Editable | Details card |

## 4. Action ↔ Endpoint Map
| UI Action | Backend Endpoint | Method/Path | Request | Response | Status Codes |
|---|---|---|---|---|---|
| Screen 1 Search / Clear | E1 | GET `/api/v1/transaction-types` | `typeCode`, `description` | `TransactionTypePageDto` | 200, 400, 401, 403, 503 |
| Screen 1 Next / Previous | E1 | GET `/api/v1/transaction-types` | `direction`, `cursor`, `size=7` | `TransactionTypePageDto` | 200, 400, 401, 403, 503 |
| Screen 1 Row Edit (Save) | E4 | PUT `/api/v1/transaction-types/{typeCode}` | `description`, `createIfMissing=false` | `TransactionTypeDto` | 200, 400, 401, 403, 404, 409, 500 |
| Screen 1 Row Delete (Confirm) | E5 | DELETE `/api/v1/transaction-types/{typeCode}` | none | 204 | 204, 400, 401, 403, 404, 409, 500 |
| Screen 2 Find | E2 | GET `/api/v1/transaction-types/{typeCode}` | none | `TransactionTypeDto` | 200, 400, 401, 403, 404, 500 |
| Screen 2 Save changes (found) | E4 | PUT `/api/v1/transaction-types/{typeCode}` | `description`, `createIfMissing=true` | `TransactionTypeDto` | 200, 201, 400, 401, 403, 409, 500 |
| Screen 2 Create record (not found) | E3 | POST `/api/v1/transaction-types` | `typeCode`, `description` | `TransactionTypeDto` | 201, 400, 401, 403, 409, 500 |
| Screen 2 Delete (Confirm) | E5 | DELETE `/api/v1/transaction-types/{typeCode}` | none | 204 | 204, 400, 401, 403, 404, 409, 500 |

## 5. Validation Parity
| UI Validation | Backend Validation | Error Code | Message |
|---|---|---|---|
| Type code must be numeric | V4: numeric | `TYPE_CODE_NOT_NUMERIC` | "Transaction type code must be numeric." |
| Type code must be supplied (Details) | V4: required | `TYPE_CODE_REQUIRED` | "Enter a transaction type code." |
| Type code must not be zero | V4: non-zero | `TYPE_CODE_ZERO` | "Transaction type code cannot be zero." |
| Type filter 2 chars alphanumeric (UI) | V1: exact 2 digits | `INVALID_TYPE_CODE_FILTER` | "Type code must be a 2-digit number." |
| Description supplied (Details) | V5: required | `DESCRIPTION_REQUIRED` | "Enter a description." |
| Description letters/numbers/spaces | V5: `^[A-Za-z0-9 ]+$` | `DESCRIPTION_INVALID_CHARS` | "Description can contain letters, numbers, and spaces only." |
| Description max 50 chars | V5: max 50 | `DESCRIPTION_TOO_LONG` | "Description must be 50 characters or fewer." |

## 6. Error & Edge-Case Parity
| Backend Error/Edge Path | UI State/Message |
|---|---|
| DB unreachable (`SERVICE_UNAVAILABLE`) | "The service is temporarily unavailable. Please try again shortly." |
| Record not found (E2 `TXN_TYPE_NOT_FOUND`) | UI prompts to create. "No record exists for this code." |
| List UPDATE concurrent delete (`TXN_TYPE_CONCURRENTLY_DELETED`) | "This record was removed by someone else. Refresh and try again." |
| Record re-created (E4 `201`) | "Transaction type created." |
| Lock conflict (`TXN_TYPE_LOCK_CONFLICT`) | "This record is being changed by someone else. Try again shortly." |
| Insert duplicate (`TXN_TYPE_ALREADY_EXISTS`) | "A transaction type with this code already exists." |
| Delete has dependents (`TXN_TYPE_HAS_DEPENDENTS`) | "This transaction type is in use and cannot be deleted while related records exist." |
| DB error (`TXN_TYPE_DB_ERROR`) | "Something went wrong. Please try again." |
| Auth failure (`UNAUTHENTICATED`/`FORBIDDEN`) | "You are not authorized to perform this action." |
| No change detected (`TXN_TYPE_NO_CHANGE`) | UI handles `changed:false` flag to show appropriate feedback (or suppress toast). |

## 7. Cross-Cutting Alignment
- **Security**: OAuth 2.0 + JWT tokens are attached as Bearer tokens in API requests by the frontend. The backend validates tokens and scopes. TLS 1.3 is enforced.
- **Privacy/GDPR**: Reference data only. No PII exists in this transaction group, so masking is not required.
- **Accessibility**: UI relies on backend's consistent `code` to map errors to specific fields and announce them via ARIA live regions. Backend provides identifier-free, user-safe `message`s.
- **State**: Backend is fully stateless REST. Frontend handles pagination state (cursors, direction) and UI states.

## 8. Gaps & Resolutions for a Fully Functional Screen
| # | Area | Gap / Inconsistency | Resolution (or Needs From User) |
|---|---|---|---|
| 1 | Authorization | Role switching (`CDEMO-USRTYP-ADMIN` vs `USER`) was inferred in UI but handled via JWT roles in Backend. | Backend enforces `TXN_TYPE_ADMIN` scope for E3/E4/E5. Frontend relies on token claims to show/hide write actions. |
| 2 | Routing | Add New button on List screen routes to Screen 2, but UI spec is ambiguous on path vs modal. | Adopt route `/maintenance/add` which renders the Details component in a explicit "Create New" state. |
| 3 | Filter Validation | UI allows alphanumeric for Type Code filter, but backend (V1) requires exactly 2 digits. | UI must align with backend to restrict type code to numeric, exactly 2 digits, to prevent early 400s. |
| 4 | No-Change Guard | Backend returns `TXN_TYPE_NO_CHANGE` (200), UI needs to know if toast should show. | Frontend uses the `changed` boolean flag in the JSON response to suppress the success toast if no change occurred. |

## 9. Implementation Plan (Rewiring Front End & Back End)
1. **Backend Endpoints**: Stand up endpoints E1-E5 and contracts in `.NET Core 9` within `TransactionTypeController`.
2. **Security**: Configure OAuth 2.0 JWT validation in the backend (`SecurityConfig.cs`).
3. **Frontend API Client**: Wire the frontend API client (`api-client.ts`) to backend endpoints, ensuring it attaches JWT bearer tokens and sets the correct Base URL.
4. **List Screen Wiring**: Bind List Screen filters, data table, and pagination controls to E1.
5. **Details Screen Wiring**: Bind Details Screen inputs and save/delete buttons to E2 (Find), E3 (Create), E4 (Update), and E5 (Delete).
6. **Client Validations**: Implement client-side validations to strictly mirror V1, V4, and V5 rules.
7. **Error Mapping**: Implement error handling in the frontend to map backend `code` properties to field-level alerts or global toasts.
8. **Gap Resolutions**: Restrict type filter to numeric only, and process the `changed` flag for the no-change toast.

## 10. Build Acceptance Criteria
- [ ] Backend E1-E5 implemented exactly to the request/response contracts and status codes.
- [ ] Frontend API client configured with TLS 1.3 and JWT Bearer tokens.
- [ ] List screen successfully fetches, filters, and paginates transaction types using E1.
- [ ] Details screen successfully fetches (E2), creates (E3), updates (E4), and deletes (E5) transaction types.
- [ ] Client presentation validations match backend V1-V8 rules.
- [ ] Error messages correctly mapped and displayed based on backend `code`.
- [ ] Cross-cutting security, data privacy, and accessibility mandates met.

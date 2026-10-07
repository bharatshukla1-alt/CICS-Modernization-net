# MG-01 — Transaction Type Maintenance — Refactor Test Case

## Document Metadata
**Tran Group:** MG-01
**Description:** Transaction type maintenance — list, add, update, delete
**Programs Covered:** COTRTLIC (CTLI), COTRTUPC (CTTU)
**Artefacts Read:**
- Artefacts/TranGroupData/MG-01-TransactionTypeMaintenance-BSTS.md
- Artefacts/TranGroupData/MG-01-TransactionTypeMaintenance-BDD.md
- Artefacts/TranGroupData/MG-01-TransactionTypeMaintenance-DB-Details.md
**Target Stack:** React + .NET Core / C# + Postgres

## Scope & Objective
This document outlines the test cases for the MG-01 Transaction Type Maintenance screens and backend services. The objective is to ensure functional equivalence with the legacy CICS/COBOL behavior (CTLI and CTTU transactions) against the modern React/.NET Core/Postgres stack, incorporating all business rules, UI validations, edge cases, and data integrity constraints defined in the source artefacts.

## Test Data & Preconditions
- **Seed Data:** Existing records in `CARDDEMO.TRANSACTION_TYPE` ('01' PURCHASE, '02' PAYMENT, etc.).
- **User Roles:** CDEMO-USRTYP-ADMIN and CDEMO-USRTYP-USER.

## Test Cases

### FE (Functional Equivalence)
| Test Case ID | Scenario / Title | Preconditions | Input / Action | Expected Result | Source |
|---|---|---|---|---|---|
| MG01-FE-001 | Search transaction type found | Valid transaction type code exists | Enter code in search | Returns TR_TYPE and TR_DESCRIPTION | BDD: A valid, existing transaction type code displays its stored description |

### HP (Happy Path)
| Test Case ID | Scenario / Title | Preconditions | Input / Action | Expected Result | Source |
|---|---|---|---|---|---|
| MG01-HP-001 | List all transaction types | None | Request list page 1 | Up to 7 rows are fetched, page 1 displayed | BDD: First entry into the list |
| MG01-HP-002 | Page forward | Page 1 displayed, more data exists | PF8 | Next 7 rows fetched and displayed | BDD: Paging down |
| MG01-HP-003 | Delete existing type | Record exists | Select 'D', confirm delete | Record is deleted from DB | BDD: Confirming the delete |
| MG01-HP-004 | Add new type | Record does not exist | Enter new code, description, save | Record inserted in DB | BDD: Saving a new transaction type |
| MG01-HP-005 | Update existing type | Record exists | Change description, save | Record updated in DB | BDD: Saving the confirmed change |

### AUTHN (Authentication Guard)
Not applicable for this group (No specific unauthenticated scenarios defined in BSTS/BDD).

### AUTHZ (Authorization Guard)
Not applicable for this group (No specific role denial scenarios defined in BSTS/BDD).

### FV (Field-Level Validation)
| Test Case ID | Scenario / Title | Preconditions | Input / Action | Expected Result | Source |
|---|---|---|---|---|---|
| MG01-FV-001 | Invalid Type Filter | None | Enter non-numeric in Type Filter | Error "TYPE CODE FILTER... MUST BE A 2 DIGIT NUMBER" | BDD: A non-numeric value in the Type Filter is rejected |
| MG01-FV-002 | Description Required | Update action selected | Leave description blank | Error "Transaction Desc must be supplied." | BDD: Row description edit failures |
| MG01-FV-003 | Description Alphanumeric | Update action selected | Enter "Bad$Chars!" | Error "...can have numbers or alphabets only." | BDD: Row description edit failures |
| MG01-FV-004 | Search Key Required | Search screen | Leave key blank | Error "Tran Type code must be supplied." | BDD: Transaction Type code validation failures |
| MG01-FV-005 | Search Key Numeric | Search screen | Enter "AB" | Error "Tran Type code must be numeric." | BDD: Transaction Type code validation failures |
| MG01-FV-006 | Search Key Non-Zero | Search screen | Enter "00" | Error "Tran Type code must not be zero." | BDD: Transaction Type code validation failures |

### BR (Cross-Field / Business-Rule Validation)
| Test Case ID | Scenario / Title | Preconditions | Input / Action | Expected Result | Source |
|---|---|---|---|---|---|
| MG01-BR-001 | Filter no results | Filters valid | Enter filters matching no rows | Error "No Records found for these filter conditions" | BDD: No rows match the supplied filter conditions |
| MG01-BR-002 | Multiple row actions | List screen | Select 'U' or 'D' on multiple rows | Error "Please select only 1 action" | BDD: Selecting more than one row action is rejected |
| MG01-BR-003 | Unchanged update | Update screen | Submit unchanged description | Error "No change detected with respect to values fetched." | BDD: Resubmitting the identical code and description |

### DB (DB Side Effects)
| Test Case ID | Scenario / Title | Preconditions | Input / Action | Expected Result | Source |
|---|---|---|---|---|---|
| MG01-DB-001 | Verify Insert | Add completed successfully | Query CARDDEMO.TRANSACTION_TYPE | Record exists with correct TR_TYPE and TR_DESCRIPTION | DB-Details: CTTU CRUD |
| MG01-DB-002 | Verify Update | Update completed successfully | Query CARDDEMO.TRANSACTION_TYPE | Record has new TR_DESCRIPTION | DB-Details: CTTU CRUD |
| MG01-DB-003 | Verify Delete | Delete completed successfully | Query CARDDEMO.TRANSACTION_TYPE | Record does not exist | DB-Details: CTTU CRUD |

### CON (Concurrency / Idempotency)
| Test Case ID | Scenario / Title | Preconditions | Input / Action | Expected Result | Source |
|---|---|---|---|---|---|
| MG01-CON-001 | Concurrent Delete | Update action pending | Record deleted by another user, then submit update | Error "Record not found. Deleted by others ?" | BDD: Updating a row that another user has deleted |
| MG01-CON-002 | Concurrent Update | Update action pending | Record locked by another user | Error "Deadlock. Someone else updating ?" | BDD: Updating a row that is locked |

### TX (Transaction Integrity)
Not applicable for this group (No multi-table spanning transactions documented).

### HTTP (HTTP Semantics)
Not applicable for this group (REST API HTTP semantics not defined in BDD, assumptions to be made by implementer).

### UI (UI Rendering)
Not applicable for this group (No DOM element specific tests, mostly API behavior).

### PSF (Pagination / Sort / Filter)
| Test Case ID | Scenario / Title | Preconditions | Input / Action | Expected Result | Source |
|---|---|---|---|---|---|
| MG01-PSF-001 | Page past end | Last page shown | Page down | Error "No more pages to display" | BDD: The last page has no next page |
| MG01-PSF-002 | Page past start | First page shown | Page up | Error "No previous pages to display" | BDD: The very first page has no previous page |

### BND (Boundary & Numeric Edge Cases)
| Test Case ID | Scenario / Title | Preconditions | Input / Action | Expected Result | Source |
|---|---|---|---|---|---|
| MG01-BND-001 | Single digit type | Search screen | Enter "5" in type | Normalized to "05" | BDD: A single-digit numeric Transaction Type code |

## Traceability Matrix
All scenarios traced.

## Coverage & Gaps
AUTHN, AUTHZ, TX, HTTP, UI are marked Not Applicable based on provided artefacts.

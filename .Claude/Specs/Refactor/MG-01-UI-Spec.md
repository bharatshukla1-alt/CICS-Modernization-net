# MG-01-UI-Spec.md

## 1. Spec Metadata & Traceability
- **Tran Group**: MG-01 (Transaction type maintenance — list, add, update, delete)
- **Target UI Stack**: React, Tailwind CSS, microanimation, Responsive UI
- **Legacy Source Files**: `Artefacts/Discovery/MoveGroup.md`, `Config/Config.md`, `Config/Style-Sheet.md`, `Artefacts/TranGroupData/MG-01-TransactionTypeMaintenance-BSTS.md`, `Artefacts/TranGroupData/MG-01-TransactionTypeMaintenance-BDD.md`, `Artefacts/Discovery/Screen-metadata.md`, `Input/bms/COTRTLI.bms`, `Input/bms/COTRTUP.bms`.
- **Legacy to Target Mapping**:
  - `COTRTLI`/`CTRTLIA` (List transaction types) → Transaction Type List Screen
  - `COTRTUP`/`CTRTUPA` (Add/Update/Delete) → Transaction Type Maintenance Details Screen

## 2. Screen Purpose & User Context
- **Transaction Type List Screen**: An administrative screen used to browse existing transaction types, optionally filtered by type code and description. It allows users to quickly search, page through results, and select a transaction type for update or deletion.
- **Transaction Type Maintenance Details Screen**: A single-record workbench to view, add, update, or delete a single transaction type. Administrative users can search by type code and modify descriptions, maintaining the application's transaction type reference data.

## 3. Screen Rationalization
- **Transaction Type List Screen**:
  - Replaced the 24x80 grid with a modern search and filter bar atop a data table.
  - Replaced inline row action inputs ('U', 'D') with icon buttons (Edit, Delete) in an 'Actions' column for intuitive interactions.
  - Converted PF-key pagination (PF7, PF8) into standard pagination controls.
  - Converted PF2 (Add) into a prominent "Add New Transaction Type" primary action button above the table.
  - Merged the separate "confirm" step into modern UI patterns: clicking Edit opens a modal or navigates to the Details screen; clicking Delete shows a confirmation dialog.
  - Dropped mainframe headers (TRNNAME, PGMNAME, CURDATE, CURTIME).
- **Transaction Type Maintenance Details Screen**:
  - Modernized the initial search state into a simple card with a type code input and "Search" button.
  - When found, the card expands to show the description field.
  - Replaced F4 (Delete), F5 (Save), and F6 (Add) with primary/secondary/danger action buttons based on context.
  - Replaced F12 (Cancel) with a standard "Cancel" button to revert changes.
  - Merged Add and Update flows: searching a non-existent code explicitly transitions the form to a "Create New" state instead of an ambiguous "not found, press F5" message.

## 4. Layout & Responsive Behaviour
- **Grid Structure**: Built on the BFSI token spacing scale (4px base). Forms use a single-column layout on mobile, expanding to two columns on larger breakpoints.
- **Alignment**: Labels are top-aligned above inputs for clarity. Data table columns are left-aligned for text. Action buttons are right-aligned in form footers.
- **Containers**: Wrapped in a `.container` with `.card` components for sections. Table wrapped in `.table-wrap`.

## 5. Component Inventory
| Target Component | Control Type | Source Legacy Field | Grouping/Ordering | State | Style Token/Class |
|---|---|---|---|---|---|
| Search Card | Container | N/A | Top | N/A | `.card` |
| Type Code Filter | Text Input | `TRTYPE` (COTRTLI) | Filter Bar | Editable | `.form-control` |
| Description Filter | Text Input | `TRDESC` (COTRTLI) | Filter Bar | Editable | `.form-control` |
| Add New Button | Button | `BUTNF02` (COTRTLI) | Action Bar | Editable | `.btn.btn-primary` |
| Data Table | Table | Row array (COTRTLI) | Content | Read-only | `.data-table` |
| Type Code Column | Table Cell | `TRTTYP*` (COTRTLI) | Table Column 1 | Read-only | Default text |
| Description Column| Table Cell | `TRTYPD*` (COTRTLI) | Table Column 2 | Read-only | Default text |
| Action Column | Icon Buttons | `TRTSEL*` (COTRTLI) | Table Column 3 | Editable | `.btn.btn-ghost` |
| Detail Search Code | Text Input | `TRTYPCD` (COTRTUP) | Details Card | Editable/Read-only | `.form-control` |
| Detail Description | Text Input | `TRTYDSC` (COTRTUP) | Details Card | Editable | `.form-control` |
| Save/Update Button | Button | `FKEY05` (COTRTUP) | Form Actions | Editable | `.btn.btn-primary` |
| Delete Button | Button | `FKEY04` (COTRTUP) | Form Actions | Editable | `.btn.btn-danger` |
| Cancel Button | Button | `FKEY12` (COTRTUP) | Form Actions | Editable | `.btn.btn-secondary` |

## 6. Field-Level Specification & Presentation-Layer Validation
- **Type Filter (List)** / **Transaction Type (Details)**:
  - Format: 2 characters (alphanumeric, legacy allowed numeric 2-digit zero-padded, but type is CHAR(2)).
  - Validation: Required on details screen. "Tran Type code must be supplied.", "Tran Type code must be numeric." (if restricted), "Tran Type code must not be zero."
- **Description Filter (List)**:
  - Format: Up to 50 characters, alphanumeric.
  - Validation: Optional.
- **Transaction Description (Details / Inline List)**:
  - Format: Up to 50 characters, alphanumeric.
  - Validation: Required. "Transaction Desc must be supplied." Alphanumeric only: "Transaction Desc can have numbers or alphabets only."

## 7. Interaction & Navigation
- **Transaction Type List**:
  - Filter: Triggers data fetch on submit or debounced typing.
  - Pagination: Standard previous/next buttons.
  - Add New: Navigates to `/maintenance/add` or opens a modal.
  - Edit Row: Navigates to `/maintenance/:id` or opens edit view.
  - Delete Row: Opens a confirmation modal. "Delete HIGHLIGHTED row? Press Confirm." On success: "HIGHLIGHTED row deleted."
- **Transaction Type Details**:
  - Search: Fetches record. If found, displays details. If not found, prompts to create.
  - Save: Validates and saves. Success: "Changes committed to database."
  - Delete: Prompts confirmation. Success: "Delete successful." Failure handling for referential integrity: "Please delete associated child records first."

## 8. Component States & Content
- Buttons use hover (`.btn-primary:hover`) and focus (`.focus-ring`) states.
- Inputs highlight on focus (`border-color: var(--color-primary-500)`).
- Error messages use `.form-error` and `.alert.alert--danger`.
- No legacy terms like "Mapset", "PF-key", or program names in copy.

## 9. Accessibility (WCAG 2.2 AA)
- Focus indicators (`:focus-visible`) for keyboard navigation.
- Proper label associations (`htmlFor` matching input `id`).
- Error messages linked to inputs via `aria-describedby`.
- High contrast colors (navy on light background per `bfsi-theme.css`).

## 10. Data Privacy & BFSI Compliance
- No sensitive personal data (PII) identified (Transaction Types are reference data).
- Session inactivity triggers automatic logout (client-held state clearance).
- Tokens transmitted securely over HTTPS/TLS 1.3.

## 11. Frontend Folder Structure
```text
target/MG-01/
├── screens/
│   ├── TransactionTypeList.tsx
│   └── TransactionTypeDetails.tsx
├── components/
│   └── ConfirmationModal.tsx
├── hooks/
│   └── useTransactionTypes.ts
├── services/
│   └── api-client.ts
└── styles/
    └── bfsi-theme.css
```

## 12. Acceptance Criteria
- [ ] Screen renders with BFSI design tokens (Tailwind classes matching `bfsi-theme.css`).
- [ ] List screen correctly fetches, filters, and paginates transaction types.
- [ ] Create, Read, Update, Delete (CRUD) operations function smoothly without PF-key logic.
- [ ] All client-side validations trigger and display correct business error messages.
- [ ] Accessibility standards (keyboard nav, contrast, aria labels) are met.

## 13. Deviations, Assumptions & Gaps
- **Deviation**: Inline row editing and row-selection flags from the legacy list screen were converted to standard CRUD navigation/modals to match modern React/web UX patterns.
- **Gap**: Missing copybooks (`COCOM01Y`, etc.) meant exact role switching (`CDEMO-USRTYP-ADMIN` vs `USER`) on hand-off was inferred, so the UI relies on backend API token roles for authorization instead of managing user type client-side.

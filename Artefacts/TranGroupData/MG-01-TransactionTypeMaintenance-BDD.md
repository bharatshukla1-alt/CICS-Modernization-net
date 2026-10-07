# MG-01 — Transaction Type Maintenance (List, Add, Update, Delete)

## Member Transactions / Programs

| Transaction | Program | Map | Mapset | Role in Group |
|---|---|---|---|---|
| CTLI | COTRTLIC | CTRTLIA | COTRTLI | Lists Transaction Type codes/descriptions with DB2 cursor-based forward/backward paging; select rows for Update or Delete |
| CTTU | COTRTUPC | CTRTUPA | COTRTUP | Search a Transaction Type by code; view, update, delete with confirmation, or add (create) a new Transaction Type if the searched code is not found |

Both programs operate exclusively against the DB2 table `CARDDEMO.TRANSACTION_TYPE` (no VSAM, no TS/TD queues). COTRTLIC XCTLs to COTRTUPC (PF2) and to the admin menu program COADM01C (PF3); COTRTUPC XCTLs back to the admin menu program or to the calling program (PF3).

---

## a. Business User Stories

```gherkin
Feature: Browse and page through Transaction Type codes (COTRTLIC)
  As an operations administrator
  I want to browse the list of transaction type codes and descriptions, page forward and backward through the set, and select a record to update or delete
  So that I can find and maintain the correct transaction type reference record

  Rule: The list screen shows at most 7 transaction types per page, read via DB2 cursors

    Scenario: First entry into the list shows the first page of transaction types
      Given the user starts transaction CTLI with no prior context (EIBCALEN = 0)
      When the initial screen is built
      Then up to 7 rows are fetched forward from the lowest transaction type key using cursor C-TR-TYPE-FORWARD
      And the screen is displayed as page 1
      # Source: 0000-MAIN (EIBCALEN = 0 branch), 8000-READ-FORWARD

    Scenario: Paging down when a further page exists shows the next set of rows
      Given the list is displaying a page and the next-page indicator is set (CA-NEXT-PAGE-EXISTS)
      When the user presses PF8
      Then 8000-READ-FORWARD re-opens the forward cursor starting from the last row's transaction type code
      And the page number is incremented and the next set of rows is displayed
      # Source: 0000-MAIN WHEN CCARD-AID-PFK08 AND CA-NEXT-PAGE-EXISTS; 8000-READ-FORWARD

    Scenario: Paging down when no further page exists shows an informational message
      Given the currently displayed page is the last page (CA-NEXT-PAGE-NOT-EXISTS and CA-LAST-PAGE-SHOWN)
      When the user presses PF8 again
      Then the message "No more pages to display" is shown and the page is not advanced
      # Source: 2500-SETUP-MESSAGE (WHEN CCARD-AID-PFK08 AND CA-NEXT-PAGE-NOT-EXISTS AND CA-LAST-PAGE-SHOWN)

    Scenario: Paging up while already on the first page shows an informational message
      Given the list is displaying the first page (CA-FIRST-PAGE)
      When the user presses PF7
      Then the message "No previous pages to display" is shown
      And the first page is re-displayed unchanged
      # Source: 0000-MAIN WHEN CCARD-AID-PFK07 AND CA-FIRST-PAGE; 2500-SETUP-MESSAGE

    Scenario: Paging up from a later page shows the previous set of rows
      Given the list is displaying a page other than the first page
      When the user presses PF7
      Then 8100-READ-BACKWARDS re-opens the backward cursor C-TR-TYPE-BACKWARD ending at the first row's transaction type code
      And the page number is decremented and the previous set of rows is displayed
      # Source: 0000-MAIN WHEN CCARD-AID-PFK07 AND NOT CA-FIRST-PAGE; 8100-READ-BACKWARDS

  Rule: The list can be narrowed by transaction type code and/or description filters

    Scenario: Filtering by a valid transaction type code narrows the list to the exact match
      Given the user enters a valid 2-digit numeric value in the Type Filter field
      When the user presses ENTER
      Then cursor C-TR-TYPE-FORWARD is opened with the predicate TR_TYPE = the entered filter value
      And only the matching row(s) are displayed
      # Source: DECLARE C-TR-TYPE-FORWARD (WS-EDIT-TYPE-FLAG = '1' AND TR_TYPE = :WS-TYPE-CD-FILTER); 1220-EDIT-TYPECD

    Scenario: Filtering by description performs a partial (wildcard) match
      Given the user enters free text in the Description Filter field
      When the user presses ENTER
      Then the filter text is wrapped in '%' wildcards and cursor C-TR-TYPE-FORWARD is opened with TR_DESCRIPTION LIKE the wrapped value
      And only rows whose description contains the entered text are displayed
      # Source: 1230-EDIT-DESC; DECLARE C-TR-TYPE-FORWARD

    Scenario: No rows match the supplied filter conditions
      Given the type and/or description filters are valid but match zero rows in CARDDEMO.TRANSACTION_TYPE
      When the user presses ENTER
      Then a SELECT COUNT(1) check in 9100-CHECK-FILTERS returns zero
      And the message "No Records found for these filter conditions" is shown
      And the filter fields are protected from row selection until the filter is changed
      # Source: 1290-CROSS-EDITS; 9100-CHECK-FILTERS

  Rule: Only one row action (Update or Delete) may be selected across the page at a time

    Scenario: Selecting more than one row action is rejected
      Given the user marks more than one row's select field with 'U' and/or 'D'
      When the user presses ENTER
      Then the message "Please select only 1 action" is shown
      And each offending row's select field is highlighted in red
      # Source: 1210-EDIT-ARRAY; WS-MESG-MORE-THAN-1-ACTION

  Rule: Deleting a selected transaction type requires an explicit confirmation step

    Scenario: Requesting delete on a row prompts the user to confirm
      Given exactly one row is marked 'D' and no filter or selection has changed since the page was displayed
      When the user presses ENTER
      Then the message "Delete HIGHLIGHTED row ? Press F10 to confirm" is shown
      And the record is not yet deleted
      # Source: 2500-SETUP-MESSAGE (WS-INFORM-DELETE)

    Scenario: Confirming the delete removes the record from the database
      Given a delete has been requested and confirmed with no intervening filter/selection change
      When the user presses PF10
      Then 9300-DELETE-RECORD issues EXEC SQL DELETE FROM CARDDEMO.TRANSACTION_TYPE WHERE TR_TYPE = the selected row's code
      And on success the message "HIGHLIGHTED row deleted.Hit Enter to continue" is shown
      And the list resets to page 1 on the next key press
      # Source: 0000-MAIN WHEN CCARD-AID-PFK10 AND WS-DELETES-REQUESTED > 0; 9300-DELETE-RECORD

  Rule: Updating a selected transaction type requires editing the description then confirming

    Scenario: Requesting update on a row makes its description editable
      Given exactly one row is marked 'U'
      When the user presses ENTER
      Then the message "Update HIGHLIGHTED row. Press F10 to save" is shown
      And that row's description field becomes unprotected for editing
      # Source: 2500-SETUP-MESSAGE (WS-INFORM-UPDATE); 2200-SETUP-ARRAY-ATTRIBS

    Scenario: Confirming the update saves the new description to the database
      Given an update has been requested with a changed description and no intervening filter/selection change
      When the user presses PF10
      Then 9200-UPDATE-RECORD issues EXEC SQL UPDATE CARDDEMO.TRANSACTION_TYPE SET TR_DESCRIPTION = the new value WHERE TR_TYPE = the selected row's code
      And on success the message "HIGHLIGHTED row was updated" is shown
      And the list resets to page 1 on the next key press
      # Source: 0000-MAIN WHEN CCARD-AID-PFK10 AND WS-UPDATES-REQUESTED > 0; 9200-UPDATE-RECORD

    Scenario: Submitting an update with an unchanged description is rejected
      Given the row marked 'U' has a description that, trimmed and case-folded, equals the original database value
      When the user presses ENTER
      Then the message "No change detected with respect to database values." is shown
      And no update is attempted
      # Source: 1211-EDIT-ARRAY-DESC
```

```gherkin
Feature: Search, view, add, update and delete a single Transaction Type (COTRTUPC)
  As an operations administrator
  I want to search for a transaction type by its code, review its description, and then add, update, or delete it with an explicit confirmation step
  So that the transaction type reference table is changed deliberately and never by accident

  Rule: A transaction type code must be searched for before any maintenance action is offered

    Scenario: Program prompts for a search key on initial entry
      Given the user starts transaction CTTU with no details fetched yet
      When the first screen is built
      Then the message "Enter transaction type to be maintained" is shown
      And the transaction type code field is left editable
      # Source: 3250-SETUP-INFOMSG (PROMPT-FOR-SEARCH-KEYS); 3300-SETUP-SCREEN-ATTRS

    Scenario: A valid, existing transaction type code displays its stored description
      Given the user enters a valid 2-digit transaction type code that exists in CARDDEMO.TRANSACTION_TYPE
      When the user presses ENTER
      Then 9100-GET-TRANSACTION-TYPE selects TR_TYPE and TR_DESCRIPTION for that code
      And the fetched code and description are displayed on the screen for review and editing
      # Source: 2000-DECIDE-ACTION (WHEN TTUP-DETAILS-NOT-FETCHED, IF FLG-TRANFILTER-ISVALID); 9000-READ-TRANTYPE; 3202-SHOW-ORIGINAL-VALUES

    Scenario: A valid transaction type code that does not exist offers to create a new record
      Given the user enters a valid 2-digit transaction type code that does not exist in CARDDEMO.TRANSACTION_TYPE
      When the user presses ENTER
      Then the message "No record found for this key in database" is shown
      And the message "Press F05 to add. F12 to cancel" is also shown
      # Source: 9100-GET-TRANSACTION-TYPE (SQLCODE = +100); 2000-DECIDE-ACTION; 3250-SETUP-INFOMSG (PROMPT-CREATE-NEW-RECORD)

  Rule: A transaction type not found by search can be created as a new record

    Scenario: Confirming creation after a not-found search opens the description for entry
      Given the searched code was not found (details-not-found state)
      When the user presses PF05
      Then the message "Enter new transaction type details." is shown
      And the description field becomes editable while the transaction type code remains fixed to the searched value
      # Source: 0000-MAIN WHEN CCARD-AID-PFK05 AND TTUP-DETAILS-NOT-FOUND; 3320-UNPROTECT-FEW-ATTRS

    Scenario: Saving a new transaction type inserts it into the database
      Given the user has entered a valid description for a not-found code and confirmed via PF05
      When 9600-WRITE-PROCESSING attempts EXEC SQL UPDATE and receives SQLCODE = +100 (no existing row)
      Then 9700-INSERT-RECORD issues EXEC SQL INSERT INTO CARDDEMO.TRANSACTION_TYPE (TR_TYPE, TR_DESCRIPTION) VALUES (the code, the description)
      And on success the message "Changes committed to database" is shown
      # Source: 9600-WRITE-PROCESSING (WHEN SQLCODE = +100); 9700-INSERT-RECORD

  Rule: Updating an existing transaction type's description requires a confirmation step

    Scenario: Editing the description and confirming shows a validated-changes prompt
      Given the transaction type details are shown and the description has been changed and passes validation
      When the user presses ENTER
      Then the message "Changes validated.Press F5 to save" is shown
      # Source: 1200-EDIT-MAP-INPUTS (SET TTUP-CHANGES-OK-NOT-CONFIRMED); 3250-SETUP-INFOMSG (PROMPT-FOR-CONFIRMATION)

    Scenario: Saving the confirmed change updates the database description
      Given the changed description has been validated and confirmed
      When the user presses PF05
      Then 9600-WRITE-PROCESSING issues EXEC SQL UPDATE CARDDEMO.TRANSACTION_TYPE SET TR_DESCRIPTION = the new value WHERE TR_TYPE = the code
      And on success the message "Changes committed to database" is shown
      # Source: 9600-WRITE-PROCESSING (WHEN SQLCODE = ZERO); 3250-SETUP-INFOMSG (CONFIRM-UPDATE-SUCCESS)

    Scenario: Cancelling an unconfirmed change reverts to the originally stored values
      Given the transaction type details are shown or a change is pending confirmation
      When the user presses PF12
      Then the program re-reads the record from CARDDEMO.TRANSACTION_TYPE via 9000-READ-TRANTYPE
      And the originally stored code and description are re-displayed, discarding any unsaved edits
      # Source: 2000-DECIDE-ACTION (WHEN TTUP-DETAILS-NOT-FETCHED / WHEN CCARD-AID-PFK12, IF FLG-TRANFILTER-ISVALID); 9000-READ-TRANTYPE

  Rule: Deleting an existing transaction type requires an explicit confirmation step

    Scenario: Requesting delete on a shown record prompts for confirmation
      Given the transaction type details are currently shown
      When the user presses PF04
      Then the message "Delete this record ? Press F4 to confirm" is shown
      And the record is not yet deleted
      # Source: 0000-MAIN WHEN CCARD-AID-PFK04 AND TTUP-SHOW-DETAILS; 3250-SETUP-INFOMSG (PROMPT-DELETE-CONFIRM)

    Scenario: Confirming the delete removes the record from the database
      Given the delete confirmation prompt is displayed
      When the user presses PF04 again
      Then 9800-DELETE-PROCESSING issues EXEC SQL DELETE FROM CARDDEMO.TRANSACTION_TYPE WHERE TR_TYPE = the code
      And on success the message "Delete successful." is shown
      # Source: 0000-MAIN WHEN CCARD-AID-PFK04 AND TTUP-CONFIRM-DELETE; 9800-DELETE-PROCESSING
```

---

## b. Technical User Stories

```gherkin
Feature: Pseudo-conversational control flow, navigation and DB2 access for Transaction Type maintenance
  As the system
  I want to correctly manage commarea state, PF-key validity, program-to-program transfers, and DB2 cursor/statement lifecycles
  So that the two-program Transaction Type maintenance flow remains consistent and reliable across pseudo-conversational turns

  Rule: COTRTLIC establishes and resets its commarea context correctly

    Scenario: First-time invocation initializes commarea and paging state
      Given transaction CTLI is invoked with EIBCALEN = 0
      When 0000-MAIN executes
      Then CARDDEMO-COMMAREA and WS-THIS-PROGCOMMAREA are initialized
      And CDEMO-FROM-TRANID/CDEMO-FROM-PROGRAM are set to CTLI/COTRTLIC, CDEMO-USRTYP-ADMIN and CDEMO-PGM-ENTER are set, and CA-FIRST-PAGE/CA-LAST-PAGE-NOT-SHOWN are set
      # Source: 0000-MAIN (IF EIBCALEN = 0 branch)

    Scenario: Returning from the Add/Update program via PF3 restarts the list at page 1
      Given the user is returning to COTRTLIC from COTRTUPC (CDEMO-FROM-TRANID = CTTU) after pressing PF3 there
      When 0000-MAIN executes
      Then WS-THIS-PROGCOMMAREA is re-initialized and CA-FIRST-PAGE/CA-LAST-PAGE-NOT-SHOWN are reset
      # Source: 0000-MAIN (IF (CDEMO-PGM-ENTER AND CDEMO-FROM-PROGRAM NOT EQUAL LIT-THISPGM) OR (CCARD-AID-PFK03 AND CDEMO-FROM-TRANID EQUAL LIT-ADDTTRANID))

    Scenario: PF3 transfers control back to the calling transaction, defaulting to the admin menu
      Given the user presses PF3 on the list screen
      When 0000-MAIN processes the PF3 branch
      Then CDEMO-TO-TRANID/CDEMO-TO-PROGRAM are set to CDEMO-FROM-TRANID/CDEMO-FROM-PROGRAM, or to the admin transaction CA00/program COADM01C if the caller was blank or was COTRTLIC itself
      And EXEC CICS SYNCPOINT is issued followed by EXEC CICS XCTL PROGRAM(CDEMO-TO-PROGRAM) COMMAREA(CARDDEMO-COMMAREA)
      # Source: 0000-MAIN (IF CCARD-AID-PFK03 ...)

    Scenario: PF2 transfers control to the Add/Update program
      Given the user presses PF2 while CDEMO-FROM-PROGRAM equals COTRTLIC
      When 0000-MAIN processes the PF2 branch
      Then CDEMO-TO-PROGRAM is set to COTRTUPC, CDEMO-USRTYP-USER is set, and EXEC CICS XCTL PROGRAM(LIT-ADDTPGM) COMMAREA(CARDDEMO-COMMAREA) is issued
      # Source: 0000-MAIN (IF CCARD-AID-PFK02 AND CDEMO-FROM-PROGRAM EQUAL LIT-THISPGM)

    Scenario: Db2 connectivity is verified before any screen is built
      Given transaction CTLI is entered or re-entered
      When 0000-MAIN runs
      Then 9998-PRIMING-QUERY executes SELECT 1 FROM SYSIBM.SYSDUMMY1
      And if the query fails, the formatted long DB2 error text is sent via EXEC CICS SEND TEXT and the transaction returns without building the 3270 map
      # Source: 9998-PRIMING-QUERY; 0000-MAIN (IF WS-DB2-ERROR ... SEND-LONG-TEXT)

    Scenario: EXEC CICS RETURN passes both commarea segments forward for the next pseudo-conversational turn
      Given processing for the current turn is complete
      When COMMON-RETURN executes
      Then CARDDEMO-COMMAREA and WS-THIS-PROGCOMMAREA are concatenated into WS-COMMAREA and returned via EXEC CICS RETURN TRANSID(LIT-THISTRANID) COMMAREA(WS-COMMAREA)
      # Source: COMMON-RETURN

  Rule: COTRTLIC's DB2 cursors are opened, fetched and closed in a controlled sequence

    Scenario: Forward paging opens, fetches up to 8 rows (7 shown + 1 lookahead) and closes the forward cursor
      Given 8000-READ-FORWARD is performed
      When the cursor loop runs
      Then C-TR-TYPE-FORWARD is opened (9400-OPEN-FORWARD-CURSOR), FETCHed until 7 rows are stored or SQLCODE = +100, an extra lookahead FETCH determines CA-NEXT-PAGE-EXISTS/NOT-EXISTS, and the cursor is closed (9450-CLOSE-FORWARD-CURSOR)
      # Source: 8000-READ-FORWARD; 9400-OPEN-FORWARD-CURSOR-EXIT; 9450-CLOSE-FORWARD-CURSOR

    Scenario: Backward paging opens, fetches up to 7 rows in reverse order and closes the backward cursor
      Given 8100-READ-BACKWARDS is performed
      When the cursor loop runs
      Then C-TR-TYPE-BACKWARD is opened (9500-OPEN-BACKWARD-CURSOR), FETCHed descending from the current first key until 7 rows are filled or SQLCODE <> 0, and the cursor is closed (9550-CLOSE-BACK-CURSOR)
      # Source: 8100-READ-BACKWARDS; 9500-OPEN-BACKWARD-CURSOR; 9550-CLOSE-BACK-CURSOR

  Rule: COTRTUPC establishes an abend handler and manages a multi-state pseudo-conversational flow

    Scenario: An abend handler is established for the whole transaction
      Given transaction CTTU begins
      When 0000-MAIN starts
      Then EXEC CICS HANDLE ABEND LABEL(ABEND-ROUTINE) is issued before any other processing
      # Source: 0000-MAIN (EXEC CICS HANDLE ABEND)

    Scenario: An unrecognized program state triggers a controlled abend
      Given 2000-DECIDE-ACTION's EVALUATE reaches WHEN OTHER (no known TTUP-* state matched)
      When this occurs
      Then ABEND-CULPRIT is set to COTRTUPC, ABEND-CODE is set to '0001', ABEND-MSG is set to "UNEXPECTED DATA SCENARIO", and ABEND-ROUTINE is performed
      # Source: 2000-DECIDE-ACTION (WHEN OTHER)

    Scenario: The abend routine sends diagnostic data and abends the task
      Given ABEND-ROUTINE is performed
      When it executes
      Then it sends ABEND-DATA via EXEC CICS SEND NOHANDLE ERASE, issues EXEC CICS HANDLE ABEND CANCEL, and issues EXEC CICS ABEND ABCODE(ABEND-CODE)
      # Source: ABEND-ROUTINE

    Scenario: Fresh entry from the admin menu or the list program clears prior maintenance state
      Given CDEMO-FROM-PROGRAM equals COADM01C or COTRTLIC and the transaction is not being re-entered (NOT CDEMO-PGM-REENTER), or EIBCALEN = 0
      When 0000-MAIN runs
      Then CARDDEMO-COMMAREA and WS-THIS-PROGCOMMAREA are initialized, CDEMO-PGM-ENTER is set, and TTUP-DETAILS-NOT-FETCHED is set
      # Source: 0000-MAIN (IF EIBCALEN IS EQUAL TO 0 OR (CDEMO-FROM-PROGRAM = LIT-ADMINPGM AND NOT CDEMO-PGM-REENTER) OR (CDEMO-FROM-PROGRAM = LIT-LISTTPGM AND NOT CDEMO-PGM-REENTER))

    Scenario: After a completed save or delete, the next key press resets the screen to a fresh search prompt
      Given the previous turn ended in TTUP-CHANGES-OKAYED-AND-DONE, TTUP-CHANGES-FAILED, TTUP-DELETE-DONE, or TTUP-DELETE-FAILED (or TTUP-CHANGES-BACKED-OUT with no prior record)
      When the next request is processed
      Then CDEMO-PGM-ENTER and TTUP-DETAILS-NOT-FETCHED are set, causing the search-key prompt to be redisplayed
      # Source: 0000-MAIN (EVALUATE TRUE ... SET CDEMO-PGM-ENTER TO TRUE / SET TTUP-DETAILS-NOT-FETCHED TO TRUE, immediately after 0001-CHECK-PFKEYS)

    Scenario: PF3 transfers control back to the calling transaction, defaulting to the admin menu
      Given the user presses PF3
      When 0000-MAIN processes the PF3 branch
      Then CDEMO-TO-TRANID/CDEMO-TO-PROGRAM default to CA00/COADM01C when CDEMO-FROM-TRANID/PROGRAM are blank, otherwise they are set to the caller's transaction/program
      And EXEC CICS SYNCPOINT is issued followed by EXEC CICS XCTL PROGRAM(CDEMO-TO-PROGRAM) COMMAREA(CARDDEMO-COMMAREA)
      # Source: 0000-MAIN (WHEN CCARD-AID-PFK03)

  Rule: COTRTUPC performs a single controlled SELECT/UPDATE/INSERT/DELETE per confirmed action against CARDDEMO.TRANSACTION_TYPE

    Scenario: Searching a transaction type performs a keyed SELECT
      Given a validated 2-digit transaction type code has been entered
      When 9100-GET-TRANSACTION-TYPE executes
      Then EXEC SQL SELECT TR_TYPE, TR_DESCRIPTION FROM CARDDEMO.TRANSACTION_TYPE WHERE TR_TYPE = the entered code is issued (R)
      # Source: 9100-GET-TRANSACTION-TYPE

    Scenario: Saving a change to an existing record performs an UPDATE, committed with SYNCPOINT
      Given a confirmed description change for an existing code
      When 9600-WRITE-PROCESSING executes with SQLCODE = ZERO
      Then EXEC SQL UPDATE CARDDEMO.TRANSACTION_TYPE SET TR_DESCRIPTION = :DCL-TR-DESCRIPTION WHERE TR_TYPE = :DCL-TR-TYPE is issued (U), followed by EXEC CICS SYNCPOINT
      # Source: 9600-WRITE-PROCESSING (WHEN SQLCODE = ZERO)

    Scenario: Saving a change for a code with no existing row performs an INSERT, committed with SYNCPOINT
      Given the UPDATE in 9600-WRITE-PROCESSING returns SQLCODE = +100
      When 9700-INSERT-RECORD executes
      Then EXEC SQL INSERT INTO CARDDEMO.TRANSACTION_TYPE (TR_TYPE, TR_DESCRIPTION) VALUES (:DCL-TR-TYPE, :DCL-TR-DESCRIPTION) is issued (C), followed by EXEC CICS SYNCPOINT on success
      # Source: 9600-WRITE-PROCESSING (WHEN SQLCODE = +100); 9700-INSERT-RECORD

    Scenario: Confirmed delete performs a DELETE, committed with SYNCPOINT
      Given the delete confirmation has been given for an existing code
      When 9800-DELETE-PROCESSING executes
      Then EXEC SQL DELETE FROM CARDDEMO.TRANSACTION_TYPE WHERE TR_TYPE = :DCL-TR-TYPE is issued (D), followed by EXEC CICS SYNCPOINT on success (SQLCODE = ZERO)
      # Source: 9800-DELETE-PROCESSING

  Rule: PF-key validity is enforced per program state before the main action logic runs

    Scenario Outline: PF keys are accepted only in states that make them meaningful
      Given the current maintenance state is "<state>"
      When the user presses "<pfkey>"
      Then PFK-VALID is set to true and the corresponding action logic executes
      # Source: 0001-CHECK-PFKEYS

      Examples:
        | state                          | pfkey |
        | (any state)                    | PF3   |
        | not TTUP-CONFIRM-DELETE         | ENTER |
        | TTUP-SHOW-DETAILS               | PF4   |
        | TTUP-CONFIRM-DELETE             | PF4   |
        | TTUP-CHANGES-OK-NOT-CONFIRMED   | PF5   |
        | TTUP-DETAILS-NOT-FOUND          | PF5   |
        | TTUP-CHANGES-OK-NOT-CONFIRMED   | PF12  |
        | TTUP-SHOW-DETAILS               | PF12  |
        | TTUP-DETAILS-NOT-FOUND          | PF12  |
        | TTUP-CONFIRM-DELETE             | PF12  |
        | TTUP-CREATE-NEW-RECORD          | PF12  |

    Scenario: Blank/low-values transaction type input fields are normalized on receive
      Given the transaction type code or description field on the map contains '*' or spaces
      When 1150-STORE-MAP-IN-NEW processes the received map
      Then the corresponding TTUP-NEW-TTYP-TYPE / TTUP-NEW-TTYP-TYPE-DESC field is set to LOW-VALUES rather than the literal '*' or spaces
      # Source: 1150-STORE-MAP-IN-NEW
```

---

## c. UI Validations

```gherkin
Feature: Field-level and screen-level input validation for Transaction Type maintenance
  As the system
  I want to validate every field before accepting it, tying each check to its exact map field
  So that only well-formed data reaches the business logic and the database

  Rule: COTRTLIC's Type Filter field (TRTYPE on map CTRTLIA), if supplied, must be a 2-digit number

    Scenario: A non-numeric value in the Type Filter is rejected
      Given the user enters a non-numeric value in the TRTYPE field
      When the user presses ENTER
      Then the message "TYPE CODE FILTER,IF SUPPLIED MUST BE A 2 DIGIT NUMBER" is shown
      And the cursor is positioned on TRTYPE with the field colored red
      # Source: 1220-EDIT-TYPECD; 2400-SETUP-SCREEN-ATTRS

    Scenario: A blank Type Filter is accepted and treated as "no filter"
      Given the TRTYPE field is left blank or low-values
      When the user presses ENTER
      Then FLG-TYPEFILTER-BLANK is set and the type filter is not applied to the cursor predicate
      # Source: 1220-EDIT-TYPECD

  Rule: COTRTLIC's row description field (TRTYPD array), when a row is marked for Update, is required and alphanumeric-only

    Scenario Outline: Row description edit failures on Update are reported with the exact validation message
      Given a row is marked 'U' and its description field contains "<input>"
      When the user presses ENTER
      Then the message "<message>" is shown
      # Source: 1211-EDIT-ARRAY-DESC; 1240-EDIT-ALPHANUM-REQD

      Examples:
        | input                | message                                              |
        | (blank/low-values)   | Transaction Desc must be supplied.                   |
        | "Bad$Chars!"         | Transaction Desc can have numbers or alphabets only. |

  Rule: COTRTLIC's row select field (TRTSEL array) accepts only 'D', 'U', space or low-values

    Scenario: An unrecognized value in a row's select field is rejected
      Given a row's TRTSEL field contains a character other than 'D', 'U', space, or low-values
      When the user presses ENTER
      Then the message "Action code selected is invalid" is shown
      And that row's select field is highlighted in red
      # Source: 1210-EDIT-ARRAY (WHEN OTHER)

  Rule: COTRTLIC's filter combination is validated by a database lookup, not just format

    Scenario: Valid-format filters that match no data are rejected as a cross-field check
      Given the Type Filter and/or Description Filter pass format validation
      When SELECT COUNT(1) FROM CARDDEMO.TRANSACTION_TYPE with those predicates returns zero
      Then both filter fields are marked in error and the message "No Records found for these filter conditions" is shown
      # Source: 1290-CROSS-EDITS; 9100-CHECK-FILTERS

  Rule: COTRTUPC's Transaction Type field (TRTYPCD on map CTRTUPA) is required, numeric, 2 digits, and non-zero

    Scenario Outline: Transaction Type code validation failures are reported with the exact validation message
      Given the user enters "<input>" in the TRTYPCD field and presses ENTER (not in create/confirmed-change state)
      When 1210-EDIT-TRANTYPE validates the value
      Then the message "<message>" is shown
      # Source: 1210-EDIT-TRANTYPE; 1245-EDIT-NUM-REQD

      Examples:
        | input               | message                          |
        | (blank/low-values)  | Tran Type code must be supplied. |
        | "AB"                | Tran Type code must be numeric.  |
        | "00"                | Tran Type code must not be zero. |

    Scenario: A single-digit numeric Transaction Type code is zero-padded to 2 digits
      Given the user enters "5" in the TRTYPCD field
      When 1210-EDIT-TRANTYPE processes the value
      Then the stored search key is normalized to "05"
      # Source: 1210-EDIT-TRANTYPE (COMPUTE WS-EDIT-NUMERIC-2 / INSPECT REPLACING ALL SPACES BY ZEROS)

  Rule: COTRTUPC's Description field (TRTYDSC on map CTRTUPA) is required and alphanumeric-only when a change is being made

    Scenario Outline: Description validation failures are reported with the exact validation message
      Given a change is in progress and the TRTYDSC field contains "<input>"
      When the user presses ENTER
      Then the message "<message>" is shown
      # Source: 1200-EDIT-MAP-INPUTS; 1230-EDIT-ALPHANUM-REQD

      Examples:
        | input               | message                                              |
        | (blank/low-values)  | Transaction Desc must be supplied.                   |
        | "Bad$Chars!"        | Transaction Desc can have numbers or alphabets only. |

  Rule: COTRTUPC's search key must correspond to a record already present in the database before update/delete can proceed

    Scenario: A syntactically valid but non-existent code is rejected as "not found" rather than accepted
      Given the entered code passes format validation but SELECT returns SQLCODE = +100
      When the search executes
      Then the message "No record found for this key in database" is shown and the update/delete path is not available; only creation is offered
      # Source: 9100-GET-TRANSACTION-TYPE (WHEN SQLCODE = +100)

  Rule: COTRTUPC rejects a confirmed "change" that does not actually differ from the stored record

    Scenario: Resubmitting the identical code and description is rejected as a no-op
      Given the entered code and (trimmed, case-folded) description are identical to the values originally fetched from the database
      When the user presses ENTER
      Then the message "No change detected with respect to values fetched." is shown
      # Source: 1205-COMPARE-OLD-NEW
```

---

## d. Error Handling

```gherkin
Feature: Detection and reporting of resource and database errors during Transaction Type maintenance
  As the system
  I want to detect DB2 connectivity failures, SQL errors and referential-integrity violations, and route the user to a safe recovery state
  So that no silent data corruption or unhandled failure occurs

  Rule: COTRTLIC verifies Db2 connectivity before doing any other work

    Scenario: Db2 is unreachable at transaction start
      Given SELECT 1 FROM SYSIBM.SYSDUMMY1 fails with a non-zero SQLCODE
      When 9998-PRIMING-QUERY executes
      Then WS-DB2-ERROR is set, the message text begins with "Db2 access failure." (formatted via 9999-FORMAT-DB2-MESSAGE with the SQLCODE and DSNTIAC text appended)
      And the raw diagnostic text is sent via EXEC CICS SEND TEXT and the transaction returns without displaying the 3270 map
      # Source: 9998-PRIMING-QUERY; 0000-MAIN (IF WS-DB2-ERROR ... SEND-LONG-TEXT)

  Rule: COTRTLIC reports DB2 cursor errors distinctly for each cursor operation

    Scenario Outline: A cursor operation failure is reported with the specific action name embedded in the message
      Given the cursor operation "<operation>" returns a non-zero, non-+100 SQLCODE
      When the corresponding paragraph executes
      Then the message begins with "<action-text>" (via 9999-FORMAT-DB2-MESSAGE, including SQLCODE and DSNTIAC text)
      # Source: <paragraph>

      Examples:
        | operation                          | action-text                              | paragraph                     |
        | Open forward cursor                | C-TR-TYPE-FORWARD Open                   | 9400-OPEN-FORWARD-CURSOR      |
        | Fetch forward cursor (lookahead)    | C-TR-TYPE-FORWARD fetch                  | 8000-READ-FORWARD             |
        | Close forward cursor                | C-TR-TYPE-FORWARD close                  | 9450-CLOSE-FORWARD-CURSOR     |
        | Open backward cursor               | C-TR-TYPE-BACKWARD Open                  | 9500-OPEN-BACKWARD-CURSOR     |
        | Fetch backward cursor              | Error on fetch Cursor C-TR-TYPE-BACKWARD | 8100-READ-BACKWARDS           |
        | Close backward cursor              | C-TR-TYPE-BACKWARD close                 | 9550-CLOSE-BACK-CURSOR        |
        | Count rows for filter check         | Error reading TRANSACTION_TYPE table     | 9100-CHECK-FILTERS            |

  Rule: COTRTLIC reports specific outcomes for a failed Update or Delete confirmation

    Scenario: Updating a row that another user has deleted since the list was read
      Given the selected row's transaction type no longer exists at the moment of confirmation
      When 9200-UPDATE-RECORD executes and receives SQLCODE = +100
      Then the message begins with "Record not found. Deleted by others ? "
      And the row remains marked for update so the user can decide how to proceed
      # Source: 9200-UPDATE-RECORD (WHEN SQLCODE = +100)

    Scenario: Updating a row that is locked by another concurrent update
      Given the selected row is locked by another unit of work
      When 9200-UPDATE-RECORD executes and receives SQLCODE = -911
      Then the message begins with "Deadlock. Someone else updating ?"
      And the row remains marked for update
      # Source: 9200-UPDATE-RECORD (WHEN SQLCODE = -911)

    Scenario: Updating a row fails with an unclassified DB2 error
      Given the UPDATE statement fails with any other negative SQLCODE
      When 9200-UPDATE-RECORD executes
      Then the message begins with "Update failed with"
      And the row remains marked for update
      # Source: 9200-UPDATE-RECORD (WHEN SQLCODE < 0)

    Scenario: Deleting a row that has dependent child records is blocked by referential integrity
      Given the selected transaction type is referenced by child records in another table
      When 9300-DELETE-RECORD executes and receives SQLCODE = -532
      Then the message begins with "Please delete associated child records first:"
      And the row remains marked for delete without being removed
      # Source: 9300-DELETE-RECORD (WHEN SQLCODE = -532)

    Scenario: Deleting a row fails with an unclassified DB2 error
      Given the DELETE statement fails with any other non-zero SQLCODE
      When 9300-DELETE-RECORD executes
      Then the message begins with "Delete failed with message:"
      # Source: 9300-DELETE-RECORD (WHEN OTHER)

  Rule: COTRTUPC reports the exact technical error text when a search's SELECT fails outright

    Scenario: A negative SQLCODE during search still routes the user to the "not found / create" path
      Given the SELECT in 9100-GET-TRANSACTION-TYPE returns a negative SQLCODE
      When the search executes
      Then the message is built as "Error accessing: TRANSACTION_TYPE table. SQLCODE:<code>:<sqlerrm>"
      And the program proceeds as if the record were not found (offering creation via PF05)
      # Source: 9100-GET-TRANSACTION-TYPE (WHEN SQLCODE < 0); 2000-DECIDE-ACTION

  Rule: COTRTUPC reports specific outcomes when saving changes fails

    Scenario: Saving fails because the record is locked by another update
      Given the UPDATE in 9600-WRITE-PROCESSING returns SQLCODE = -911
      When the save executes
      Then the message "Could not lock record for update" is shown
      And the subsequent screen shows the message "Changes unsuccessful"
      # Source: 9600-WRITE-PROCESSING (WHEN SQLCODE = -911); 3250-SETUP-INFOMSG (INFORM-FAILURE)

    Scenario: Saving fails with an unclassified DB2 error on update
      Given the UPDATE in 9600-WRITE-PROCESSING returns any other negative SQLCODE
      When the save executes
      Then the message is built as "Error updating: TRANSACTION_TYPE Table. SQLCODE:<code>:<sqlerrm>"
      And the subsequent screen shows the message "Changes unsuccessful"
      # Source: 9600-WRITE-PROCESSING (WHEN SQLCODE < 0); 3250-SETUP-INFOMSG (INFORM-FAILURE)

    Scenario: Inserting a new transaction type fails with a DB2 error
      Given the INSERT in 9700-INSERT-RECORD returns any non-zero SQLCODE
      When the insert executes
      Then the message is built as "Error inserting record into: TRANSACTION_TYPE Table. SQLCODE:<code>:<sqlerrm>"
      # Source: 9700-INSERT-RECORD (WHEN OTHER)

  Rule: COTRTUPC reports specific outcomes when a confirmed delete fails

    Scenario: Deleting a record with dependent child records is blocked by referential integrity
      Given the confirmed delete's SQLCODE is -532
      When 9800-DELETE-PROCESSING executes
      Then the message is built starting with "Please delete associated child records first:"
      # Source: 9800-DELETE-PROCESSING (WHEN SQLCODE = -532)

    Scenario: Deleting a record fails with an unclassified DB2 error
      Given the confirmed delete's SQLCODE is any other non-zero value
      When 9800-DELETE-PROCESSING executes
      Then the message is built starting with "Delete failed with message:"
      And TTUP-DELETE-FAILED state is set
      # Source: 9800-DELETE-PROCESSING (WHEN OTHER)

  Rule: COTRTUPC rejects PF keys that are not valid for the current state

    Scenario: Pressing a PF key that has no meaning in the current state
      Given the current state does not list the pressed key as valid (per 0001-CHECK-PFKEYS)
      When the user presses that key
      Then the message "Invalid key pressed" is shown and the current screen is redisplayed unchanged
      # Source: 0001-CHECK-PFKEYS; 0000-MAIN (WHEN WS-INVALID-KEY-PRESSED)
```

---

## e. Edge Cases

```gherkin
Feature: Boundary and unusual conditions explicitly guarded against in Transaction Type maintenance
  As the system
  I want to correctly handle boundary paging conditions, mid-flight criteria changes, and empty result sets
  So that the user is never shown a confusing or inconsistent screen state

  Rule: COTRTLIC guards against paging past either end of the result set

    Scenario: The very first page has no previous page
      Given the list is on page 1 (CA-FIRST-PAGE)
      When the user presses PF7 (page up)
      Then no backward read is attempted and the message "No previous pages to display" is shown
      # Source: 0000-MAIN (WHEN CCARD-AID-PFK07 AND CA-FIRST-PAGE)

    Scenario: The last page has no next page
      Given the forward cursor's lookahead FETCH returns SQLCODE = +100 (no more rows)
      When the current page is built
      Then CA-NEXT-PAGE-NOT-EXISTS is set and a subsequent PF8 shows "No more pages to display" instead of reading further
      # Source: 8000-READ-FORWARD (WHEN SQLCODE = +100 on lookahead fetch); 2500-SETUP-MESSAGE

    Scenario: A filtered search yields no rows at all on entry
      Given the forward cursor's very first FETCH on page 1 returns SQLCODE = +100
      When 8000-READ-FORWARD completes with zero rows fetched on the first page
      Then the message "No records found for this search condition." is shown
      # Source: 8000-READ-FORWARD (WHEN SQLCODE = +100, IF WS-CA-SCREEN-NUM = 1 AND WS-ROW-NUMBER = 0)

  Rule: COTRTLIC guards against acting on stale row selections when the search criteria changed

    Scenario: Changing the type or description filter cancels a pending row selection
      Given the user has a row marked for Update or Delete and then also changes the Type Filter or Description Filter value
      When the user presses ENTER
      Then the previously marked row selections are discarded (WS-EDIT-SELECT-FLAGS initialized) and the list is simply re-queried with the new filter
      # Source: 1210-EDIT-ARRAY (IF FLG-TYPEFILTER-CHANGED-YES OR FLG-DESCFILTER-CHANGED-YES)

    Scenario: Pressing PF10 after changing criteria is treated as a plain ENTER, not a confirmation
      Given a delete or update was requested but the user then changes the type filter, description filter, or row selection before pressing PF10
      When the user presses PF10
      Then the key is remapped to ENTER internally and the list is simply re-displayed with the new criteria, without deleting or updating anything
      # Source: 0000-MAIN (IF CCARD-AID-PFK10 ... ELSE SET CCARD-AID-ENTER TO TRUE)

  Rule: COTRTUPC guards against resubmitting an unresolved not-found search key

    Scenario: Resubmitting the same not-found code without pressing PF05 keeps the state unresolved
      Given the details-not-found state is showing for a given code
      When the user presses ENTER again with the identical code still in the field (and not PF05)
      Then the program skips re-validating the search key and stays in TTUP-DETAILS-NOT-FETCHED, prompting again rather than re-querying the database
      # Source: 1150-STORE-MAP-IN-NEW; 1200-EDIT-MAP-INPUTS (IF TTUP-DETAILS-NOT-FOUND AND TRIM(TRTYPCDI) = TTUP-NEW-TTYP-TYPE)

  Rule: COTRTUPC guards against saving a change that collides with a concurrent delete

    Scenario: Saving a change to a row that another user deleted first falls back to creating it
      Given the confirmed description change's UPDATE returns SQLCODE = +100 (row no longer present)
      When 9600-WRITE-PROCESSING executes
      Then 9700-INSERT-RECORD is performed instead, re-creating the row with the entered code and description
      # Source: 9600-WRITE-PROCESSING (WHEN SQLCODE = +100)
```

---

## Gaps

- `COCOM01Y`, `CSSTRPFY`, `CSSETATY`, `CVCRD01Y`, `COTTL01Y`, `CSDAT01Y`, `CSMSG01Y`, `CSMSG02Y`, `CSUSR01Y`, `CVACT02Y`, and `CSUTLDWY` are `COPY`'d by COTRTLIC and/or COTRTUPC but do not exist anywhere under `input/` (only `CSDB2RWY.cpy` and `CSDB2RPY.cpy` were found under `input/cpy`). Their field-level PICTURE clauses could not be verified directly. Behavior that depends on them (e.g. `CDEMO-*` commarea fields, `CCARD-AID-PFKxx` condition names, the exact PF-key-to-EIBAID remapping performed by `CSSTRPFY`/`YYYY-STORE-PFKEY`, and the attribute-setting macro `CSSETATY`) was inferred only from how these names are actually used in the executable statements of `COTRTLIC.cbl` and `COTRTUPC.cbl` that were read directly — not from the missing copybooks themselves or from naming conventions.
- `DCLTRCAT` (`CARDDEMO.TRANSACTION_TYPE_CATEGORY`) is `COPY`'d into COTRTUPC's working storage but its fields (`DCL-TRC-*`) are never referenced anywhere in the program's procedural logic; no CRUD scenario exists against that table in this group, consistent with `MoveGroup.md`.
- Several message conditions are defined in COTRTUPC's `WS-INFO-MSG`/`WS-RETURN-MSG` 88-levels but were traced and found to be unreachable given the current control flow, so no scenario was written for them: `FOUND-TRANTYPE-DATA` ('Selected transaction type shown above'), `DATA-WAS-CHANGED-BEFORE-UPDATE` ('Record changed by someone else. Please review'), `WS-EXIT-MESSAGE` ('PF03 pressed.Exiting'), `WS-INVALID-KEY` ('Invalid Key pressed. ' — distinct from the reachable `WS-INVALID-KEY-PRESSED`), `NO-SEARCH-CRITERIA-RECEIVED` ('No input received'), `WS-DELETE-WAS-CANCELLED`, and `WS-UPDATE-WAS-CANCELLED`/`TTUP-CHANGES-BACKED-OUT` (the PF12-cancel branch in `2000-DECIDE-ACTION` that would set these is preceded in the same `EVALUATE` by an unconditional `CCARD-AID-PFK12` match, and the guard flag it depends on, `FLG-TRANFILTER-NOT-OK`/`FLG-TRANFILTER-BLANK`, is never left non-default on that code path).
- The exact PF-key/EIBAID-to-condition-name remapping (`YYYY-STORE-PFKEY`, `COPY 'CSSTRPFY'`) could not be inspected since `CSSTRPFY` is missing; scenarios reference the resulting condition names (`CCARD-AID-PFK03`, etc.) exactly as used in the source, without asserting the underlying AID-to-key mapping mechanics.
- `input/cpy-bms/COTRTLI.cpy` and `input/cpy-bms/COTRTUP.cpy` were located but not required for this document beyond confirming field names already visible in the `.bms` sources and the `.cbl` REDEFINES structures actually read.

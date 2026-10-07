# Gate 1 Review — 2026-07-05

## Summary
Reviewed three documentation artefacts (TransVsPgm.md, CicsXref.md, Screen-metadata.md) against the read-only ground truth under `Input\` (2 BMS maps, 3 COBOL programs, 1 CSD, plus dcl/ddl/cpy/ctl members). Component types validated: transaction IDs and program names (TransVsPgm), CICS program/transaction/map/copybook/table cross-references (CicsXref), and screen field metadata (Screen-metadata). TransVsPgm and Screen-metadata are fully consistent with the source — the two transaction-to-program mappings match the CSD exactly, and every named DFHMDF field, length, attribute and initial value in Screen-metadata matches the two BMS copybooks. The only substantive findings are on CicsXref: the batch program `COBTUPDT.cbl` exists in the repo but is not documented (likely intentional, since it is non-CICS), and a number of copybooks named in the "Copybooks Used" column have no member source file present under `Input\`. Files affected: `Artefacts\CicsXref.md` (2 findings, both informational/for-confirmation). No fabricated or uncitable discrepancies are reported.

## TransvsPgm.md

### a. Missing in documentation
No discrepancies found.
(The only undocumented program, `COBTUPDT`, has no `TRANSACTION` definition in the CSD and no `TRANSID`, so it is correctly absent from a transaction-to-program mapping.)

### b. Missing in repo
No discrepancies found.

### c. Irrelevant/inconsistent mappings
No discrepancies found.

| Component | Found In | Expected In | Detail |
|---|---|---|---|
| CTLI → COTRTLIC (CARDDEMO) | `Artefacts\TransVsPgm.md` line 3 | `Input\csd\CRDDEMOD.csd` lines 25-26 | Transaction CTLI, PROGRAM(COTRTLIC), GROUP(CARDDEMO) — matches. |
| CTTU → COTRTUPC (CARDDEMO) | `Artefacts\TransVsPgm.md` line 4 | `Input\csd\CRDDEMOD.csd` lines 35-36 | Transaction CTTU, PROGRAM(COTRTUPC), GROUP(CARDDEMO) — matches. |

### d. Other discrepancies
| Component | Found In | Expected In | Detail |
|---|---|---|---|
| Document header | `Artefacts\TransVsPgm.md` line 1 | — | Minor: file begins directly with the table (no `#` title/section heading). Cosmetic only; content is correct. |
| DB2TRAN CTLITRAN / CTTUTRAN | `Input\csd\CRDDEMOD.csd` lines 51-59 | `Artefacts\TransVsPgm.md` | Informational: the CSD also defines DB2TRAN objects `CTLITRAN`/`CTTUTRAN` and DB2ENTRY `CARDDEMO`. These are DB2 attachment objects, not CICS transaction-to-program entries, so their absence from TransVsPgm is correct — noted for completeness only. |

## CicsXref.md

### a. Missing in documentation
| Component | Found In | Expected In | Detail |
|---|---|---|---|
| Program COBTUPDT | `Input\cbl\COBTUPDT.cbl` line 23 (`PROGRAM-ID. COBTUPDT.`) | `Artefacts\CicsXref.md` | A third COBOL program exists in the repo but is not listed in the cross-reference. It contains zero `EXEC CICS` statements (verified) and has no CSD `PROGRAM`/`TRANSACTION` definition — it is a batch "business logic" module that updates `CARDDEMO.TRANSACTION_TYPE` via file input. Almost certainly intentionally out of scope for a CICS-only xref; flagged for reviewer confirmation rather than asserted as an error. |

### b. Missing in repo
No discrepancies found.
(Every documented program, map/mapset, transaction, DB2 table and copybook reference is traceable to a specific `COPY` / `EXEC SQL INCLUDE` / `EXEC CICS` statement in the source — see section c. Copybook *member files* that are absent are covered under d.)

### c. Irrelevant/inconsistent mappings
No discrepancies found.

| Component | Found In | Expected In | Detail |
|---|---|---|---|
| CTLI/COTRTLIC XCTL targets COADM01C, COTRTUPC | `Artefacts\CicsXref.md` line 3 | `Input\cbl\COTRTLIC.cbl` lines 47 (LIT-ADMINPGM='COADM01C'), 50 (LIT-ADDTPGM='COTRTUPC'), 620-621 & 648-649 (XCTL) | Called-program list matches. |
| CTLI map CTRTLIA / mapset COTRTLI | `Artefacts\CicsXref.md` line 3 | `Input\cbl\COTRTLIC.cbl` lines 45-46; `Input\bms\COTRTLI.bms` lines 20,25 | Matches. |
| CTLI copybooks (incl. SQL includes SQLCA, DCLTRTYP, CSDB2RWY, CSDB2RPY) | `Artefacts\CicsXref.md` line 3 | `Input\cbl\COTRTLIC.cbl` lines 304, 327, 331, 333, 375, 425-426, 430, 433, 480, 482, 485, 490, 2055, 2060 | All listed copybooks/includes verified present in source. |
| CTTU/COTRTUPC map CTRTUPA / mapset COTRTUP | `Artefacts\CicsXref.md` line 4 | `Input\cbl\COTRTUPC.cbl` lines 206-208; `Input\bms\COTRTUP.bms` lines 20,25 | Matches. |
| CTTU copybooks (incl. SQL includes SQLCA, DCLTRTYP, DCLTRCAT; CSSETATY REPLACING) | `Artefacts\CicsXref.md` line 4 | `Input\cbl\COTRTUPC.cbl` lines 76, 241, 257-258, 262, 265, 268, 271, 274, 277, 283, 286, 288, 292, 1358, 1671 | Verified; COTRTUPC correctly does NOT include CSDB2RWY/CSDB2RPY and the doc correctly omits them. |
| DB2 table CARDDEMO.TRANSACTION_TYPE CRUD | `Artefacts\CicsXref.md` lines 3-4 | `Input\cbl\COTRTLIC.cbl` / `COTRTUPC.cbl` SQL; `Input\ddl\TRNTYPE.ddl` | Table name and access pattern consistent with source. |

### d. Other discrepancies
| Component | Found In | Expected In | Detail |
|---|---|---|---|
| Copybook member source files | `Artefacts\CicsXref.md` lines 3-4 ("Copybooks Used") | `Input\cpy\` and `Input\cpy-bms\` | Repo-completeness gap: many copybooks named in the doc have no member file under `Input\`. Present: `CSDB2RPY.cpy`, `CSDB2RWY.cpy` (cpy); `COTRTLI.cpy`, `COTRTUP.cpy` (cpy-bms); `DCLTRTYP.dcl`, `DCLTRCAT.dcl` (dcl). Absent as files: CVCRD01Y, COCOM01Y, DFHBMSCA, DFHAID, COTTL01Y, CSDAT01Y, CSMSG01Y, CSMSG02Y, CSUSR01Y, CVACT02Y, CSSTRPFY, CSUTLDWY, CSSETATY. The doc entries are accurate to the `COPY` statements in the source; the members themselves (several are standard CICS/CardDemo system copybooks) are simply not shipped in `Input\`. Informational — resolve the copybook members before downstream phases that need field layouts. |

## Screen-metadata.md

### a. Missing in documentation
No discrepancies found.
(Both BMS copybooks in `Input\bms\` — COTRTLI.bms and COTRTUP.bms — are documented, and every named `DFHMDF` field in each source map appears in the corresponding table.)

### b. Missing in repo
No discrepancies found.
(No field, mapset or map is documented that does not exist in the BMS source.)

### c. Irrelevant/inconsistent mappings
No discrepancies found.

| Component | Found In | Expected In | Detail |
|---|---|---|---|
| COTRTLI (CTRTLIA) field lengths/attrs/initials | `Artefacts\Screen-metadata.md` lines 24-63 | `Input\bms\COTRTLI.bms` lines 34-336 | Spot- and full-checked: TRNNAME=4, CURDATE/CURTIME/PGMNAME=8, TITLE01/02=40, PAGENO=3, TRTYPE=2 (UNPROT→Editable), TRDESC=50, TRTSELn=1/TRTTYPn=2/TRTYPDn=50, TRTDSCA PROT→Read-only, INFOMSG=45, ERRMSG=78, BUTNF02/03=7, BUTNF07/08=10, BUTNF10=8 — all match. |
| COTRTUP (CTRTUPA) field lengths/attrs/initials | `Artefacts\Screen-metadata.md` lines 88-102 | `Input\bms\COTRTUP.bms` lines 34-135 | TRTYPCD=2 (IC,UNPROT→Editable), TRTYDSC=50, FKEYS=21, FKEY04=9, FKEY05=8, FKEY06=6, FKEY12=10 (all DRK→Masked) — all match. |
| Program/Transaction attribution per mapset | `Artefacts\Screen-metadata.md` lines 20, 84 | `Input\csd\CRDDEMOD.csd`; `Input\cbl\COTRTLIC.cbl` line 45; `COTRTUPC.cbl` line 206 | COTRTLI→COTRTLIC/CTLI and COTRTUP→COTRTUPC/CTTU — consistent with CSD and program literals. |

### d. Other discrepancies
No discrepancies found.
(The `PAGENO` "Unknown" attribute and the repeating-row `None` field-initial calls are correctly disclosed in the doc's own "Needs Review" section and match the source, which has `PAGENO DFHMDF LENGTH=3` with no `ATTRB=` clause at `Input\bms\COTRTLI.bms` lines 82-83.)

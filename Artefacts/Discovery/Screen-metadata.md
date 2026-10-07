# Screen Metadata

Source: BMS copybooks in `Input\bms\` cross-referenced against `Artefacts\CicsXref.md`.

**Field Initial methodology:** For each named field, "Field Initial" is populated
from the field's own `INITIAL=` attribute when present (this covers function-key
hint fields, date/time placeholders, etc.). When the field itself has no
`INITIAL=` value, the `INITIAL=` of the immediately preceding *unnamed* DFHMDF
entry is used where that entry is clearly acting as a caption/prompt label for
the field (e.g. `Tran:` preceding `TRNNAME`). Where the preceding entry is a
column-header/separator line inside a repeating detail table (not a per-field
caption), no value is inherited and the field is marked `None` — see the
Needs Review section for details.

---

## Mapset: COTRTLI (Map CTRTLIA)

Source copybook: `Input\bms\COTRTLI.bms`
Program: COTRTLIC | Transaction: CTLI (per `Artefacts\CicsXref.md`)

| Field Name | Field Initial | Field Length | Field Type | Field Attribute |
|---|---|---|---|---|
| TRNNAME | Tran: | 4 | Alphanumeric | Read-only |
| TITLE01 | None | 40 | Text | Read-only |
| CURDATE | mm/dd/yy | 8 | Character | Read-only |
| PGMNAME | Prog: | 8 | Alphanumeric | Read-only |
| TITLE02 | None | 40 | Text | Read-only |
| CURTIME | hh:mm:ss | 8 | Character | Read-only |
| PAGENO | Page  | 3 | Numeric | Unknown (no ATTRB specified) |
| TRTYPE | Type Filter: | 2 | Alphanumeric | Editable |
| TRDESC | Description Filter: | 50 | Text | Editable |
| TRTSEL1 | None | 1 | Character | Read-only |
| TRTTYP1 | None | 2 | Alphanumeric | Read-only |
| TRTYPD1 | None | 50 | Text | Editable |
| TRTSEL2 | None | 1 | Character | Read-only |
| TRTTYP2 | None | 2 | Alphanumeric | Read-only |
| TRTYPD2 | None | 50 | Text | Editable |
| TRTSEL3 | None | 1 | Character | Read-only |
| TRTTYP3 | None | 2 | Alphanumeric | Read-only |
| TRTYPD3 | None | 50 | Text | Editable |
| TRTSEL4 | None | 1 | Character | Read-only |
| TRTTYP4 | None | 2 | Alphanumeric | Read-only |
| TRTYPD4 | None | 50 | Text | Editable |
| TRTSEL5 | None | 1 | Character | Read-only |
| TRTTYP5 | None | 2 | Alphanumeric | Read-only |
| TRTYPD5 | None | 50 | Text | Editable |
| TRTSEL6 | None | 1 | Character | Read-only |
| TRTTYP6 | None | 2 | Alphanumeric | Read-only |
| TRTYPD6 | None | 50 | Text | Editable |
| TRTSEL7 | None | 1 | Character | Read-only |
| TRTTYP7 | None | 2 | Alphanumeric | Read-only |
| TRTYPD7 | None | 50 | Text | Editable |
| TRTSELA | None | 1 | Character | Read-only |
| TRTTYPA | None | 2 | Alphanumeric | Read-only |
| TRTDSCA | None | 50 | Text | Read-only |
| INFOMSG | None | 45 | Text | Read-only |
| ERRMSG | None | 78 | Text | Read-only |
| BUTNF02 | F2=Add | 7 | Text | Read-only |
| BUTNF03 | F3=Exit | 7 | Text | Read-only |
| BUTNF07 | F7=Page Up | 10 | Text | Read-only |
| BUTNF08 | F8=Page Dn | 10 | Text | Read-only |
| BUTNF10 | F10=Save | 8 | Text | Read-only |

Notes specific to this mapset:
- Column-header/separator static labels ("Select", "Type", "Description",
  and the dashed-line separators) are unnamed DFHMDF entries and are not
  listed as fields; they apply visually to the whole repeating detail table
  (rows 1-7 and row A) rather than to any single row.
- `TRTSEL1..7` and `TRTSELA`/`TRTTYPA` carry `ATTRB=...,PROT` (protected,
  read-only) in the source, while `TRTYPD1..7` (description column) carries
  `UNPROT` (editable) but `TRTDSCA` (row A) carries `PROT` (read-only) —
  these values are taken exactly as written in the copybook; the asymmetry
  (row A being fully protected while rows 1-7 have an editable description
  cell) is a source-code characteristic, not an inference.
- `PAGENO` has no `ATTRB=` clause at all in the source, so its attribute
  could not be confidently classified — see Needs Review.

---

## Mapset: COTRTUP (Map CTRTUPA)

Source copybook: `Input\bms\COTRTUP.bms`
Program: COTRTUPC | Transaction: CTTU (per `Artefacts\CicsXref.md`)

| Field Name | Field Initial | Field Length | Field Type | Field Attribute |
|---|---|---|---|---|
| TRNNAME | Tran: | 4 | Alphanumeric | Read-only |
| TITLE01 | None | 40 | Text | Read-only |
| CURDATE | mm/dd/yy | 8 | Character | Read-only |
| PGMNAME | Prog: | 8 | Alphanumeric | Read-only |
| TITLE02 | None | 40 | Text | Read-only |
| CURTIME | hh:mm:ss | 8 | Character | Read-only |
| TRTYPCD | Transaction Type  : | 2 | Alphanumeric | Editable |
| TRTYDSC | Description       : | 50 | Text | Editable |
| INFOMSG | None | 45 | Text | Read-only |
| ERRMSG | None | 78 | Text | Read-only |
| FKEYS | ENTER=Process F3=Exit | 21 | Text | Read-only |
| FKEY04 | F4=Delete | 9 | Text | Masked |
| FKEY05 | F5=Save | 8 | Text | Masked |
| FKEY06 | F6=Add | 6 | Text | Masked |
| FKEY12 | F12=Cancel | 10 | Text | Masked |

Notes specific to this mapset:
- `FKEY04`, `FKEY05`, `FKEY06`, `FKEY12` all carry `ATTRB=(ASKIP,DRK)`. Per
  the classification rule (`DRK`→Masked), these are marked Masked even
  though `ASKIP` is also present; functionally these are conditionally
  displayed/hidden function-key prompts (`DRK` = non-display) that the
  program turns visible via `DFHDRK` off / `DFHUNDRK` (color/attribute
  reset) logic at runtime — confirm exact runtime toggling against
  `COTRTUPC` source if downstream use needs the visible/hidden distinction
  rather than "Masked".

---

## Needs Review

| Item | Issue |
|---|---|
| COTRTLI / PAGENO | No `ATTRB=` clause present in the source DFHMDF entry, so Field Attribute could not be confidently derived from an explicit attribute list; marked `Unknown` rather than assumed. |
| COTRTLI / TRTSEL1-7, TRTTYP1-7, TRTYPD1-7, TRTSELA, TRTTYPA, TRTDSCA | These repeating detail-line fields have no field-specific caption; the DFHMDF entries immediately preceding them in the source are either fillers (`LENGTH=0`, no INITIAL) or, for the very first row, a dashed separator line — not a semantic caption. Field Initial therefore recorded as `None` for all of them rather than inheriting the separator/dash text or applying the shared column headers ("Select"/"Type"/"Description") to only one row inconsistently. |
| COTRTUP / FKEY04, FKEY05, FKEY06, FKEY12 | Classified as `Masked` per the `DRK`→Masked rule, but these are function-key hint texts using `DRK` (non-display) toggled on/off by program logic depending on state (e.g., F4=Delete only relevant once a record is fetched) — flagging in case "Hidden" (conditionally suppressed) is a more useful classification for downstream UI generation than "Masked". |

## Summary

- Total BMS copybooks found in `Input\bms\`: 2 (`COTRTLI.bms`, `COTRTUP.bms`)
- Total BMS copybooks processed: 2
- Total mapsets found: 2 (`COTRTLI` / map `CTRTLIA`, `COTRTUP` / map `CTRTUPA`)
- Both mapsets were successfully matched to their owning program/transaction
  in `Artefacts\CicsXref.md` (COTRTLIC/CTLI and COTRTUPC/CTTU); no `UNMAPPED`
  mapsets encountered.
- Files that could not be parsed: none — both copybooks parsed fully as
  standard `DFHMSD`/`DFHMDI`/`DFHMDF` BMS macro source.
- Fields flagged for manual review: 1 attribute (`PAGENO`, no `ATTRB=`
  clause) plus the repeating-row caption-inheritance judgment calls and the
  `DRK` function-key fields noted above — see the Needs Review table.

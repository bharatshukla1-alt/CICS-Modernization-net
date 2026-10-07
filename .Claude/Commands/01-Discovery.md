---
description: Analyze a CICS CSD file with the Discovery-agent — builds the Transaction-to-Program mapping, the CicsXref cross-reference, and the BMS screen metadata
---
## Step 1: Check for the presence of CicsXref.md,TransVsPgm.md and Screnn-metadata.md files
When the agent is invoked for the first time, it would check the presence of CicsXref.md,TransVsPgm.md and Screnn-metadata.md files in /Artefacts folder. If these files are present, then will get deleted, else the agent will continue with Step 2

## Step 2: Locate the CSD file

Use the CSD file path provided as an argument, or default to:
C:\Users\Arijit\OneDrive\Desktop\Project\CICS Modernization\Input\csd\

If the file cannot be found at the given path, stop immediately and report the exact error. Do not proceed to analysis.

## Step 3: Run Task 1 — Transaction-to-Program mapping

Using the discovery-agent subagent, perform **Task 1 only** (Transaction-to-Program mapping from a CICS CSD file — do not run Task 2 or Task 3), and analyze this file:
C:\Users\Arijit\OneDrive\Desktop\Project\CICS Modernization\Input\csd\CRDDEMOD.csd

Save the resulting table to:
C:\Users\Arijit\OneDrive\Desktop\Project\CICS Modernization\Artefacts\Discovery\TransVsPgm.md

Rules:
- Create the `Artefacts` folder if it doesn't exist.
- Do not modify or overwrite any file other than `TransVsPgm.md`.
- If the CSD file can't be found or parsed (e.g. it's a raw binary VSAM CSD, not a text unload), stop and report the exact error instead of producing a partial or guessed table.
- The output table must use exactly these columns: `Transaction ID | Program Name | CICS Group`.
- Do not infer or invent transaction/program pairs — only state relationships verifiable from the file content.

If this step fails or produces no rows, stop and report the error — do not proceed to Step 3.

## Step 4: Run Task 2 — Build the CICS cross-reference (CicsXref.md)

Using the discovery-agent subagent, perform **Task 2 only** (build the CicsXref cross-reference — do not run Task 1 or Task 3).

Inputs:
- `C:\Users\Arijit\OneDrive\Desktop\Project\CICS Modernization\Artefacts\Discovery\TransVsPgm.md` — the transaction/program pairs produced in Step 2, to use as the full list of programs to process.
- `C:\Users\Arijit\OneDrive\Desktop\Project\CICS Modernization\Input\cbl\` — COBOL source folder, one file per program named in `TransVsPgm.md`.

Save the resulting table to:
C:\Users\Arijit\OneDrive\Desktop\Project\CICS Modernization\Artefacts\Discovery\CicsXref.md

Rules:
- If `TransVsPgm.md` is missing, stop and report the error — do not proceed without it.
- Do not modify or overwrite any file other than `CicsXref.md`.
- Process programs in small batches (3–5 at a time), reading and reasoning about each program's source individually — no automated parsing scripts, regex, or heuristics.
- The output table must use exactly these columns, in this order: `Transaction | Program | Short Program Description | Called Programs | Called Transactions | Map & Mapset Used | Commarea Copybook | VSAM Files Accessed (CRUD) | DB2 Tables Accessed (CRUD) | CICS TS (TSQ/TDQ) Used (CRUD) | Copybooks Used`.
- If a program's source file is missing or unparseable in `input\cbl\`, report it clearly and continue with the remaining programs rather than stopping or fabricating data.

If `TransVsPgm.md` cannot be read, stop and report the error — do not proceed to Step 4.

## Step 5: Run Task 3 — Generate screen metadata

Using the discovery-agent subagent, perform **Task 3 only** (generate BMS screen metadata — do not run Task 1 or Task 2).

Inputs:
- `C:\Users\Arijit\OneDrive\Desktop\Project\CICS Modernization\Artefacts\Discovery\CicsXref.md` — the Program → Mapset cross-reference produced in Step 3.
- `C:\Users\Arijit\OneDrive\Desktop\Project\CICS Modernization\Input\bms\` — BMS copybook source folder; process every `.cpy`/`.bms` file in it.

Save the result to:
C:\Users\Arijit\OneDrive\Desktop\Project\CICS Modernization\Artefacts\Screen-metadata.md

Rules:
- If `CicsXref.md` is missing, stop and report the error — do not proceed without it.
- Do not modify any source files in `input\cpy-bms\` or any other file in `Artefacts\` besides `Screen-metadata.md`.
-Process bms copybooks in small batches (3–5 at a time), reading and reasoning about each bms copybook source individually — no automated parsing scripts, regex, or heuristics
- One section per mapset (H2 heading with mapset name and source copybook filename), each with a table of columns `Field Name | Field Initial | Field Length | Field Type | Field Attribute`.
- If a copybook's mapset isn't found in `CicsXref.md`, still process its fields but flag the mapset as `UNMAPPED - <copybook filename>`.
- If a field's type or attribute can't be confidently determined, mark it `Unknown` and list it in a "Needs Review" section — do not guess silently.
- Include a summary at the bottom: total copybooks processed, total mapsets found, and any files that couldn't be parsed.

## Step 6: Report back

After all three subagent runs complete, report:
- **Task 1**: full path to `TransVsPgm.md`, number of transactions found, number of `UNRESOLVED` entries
- **Task 2**: full path to `CicsXref.md`, number of programs processed, any programs whose source was missing or unparseable
- **Task 3**: full path to `Screen-metadata.md`, total copybooks processed, total mapsets found, any unparseable files or entries listed under "Needs Review"
- Any parsing errors or warnings surfaced by any of the three subagent runs
---
description: Run the Tran-Group-BDD and Tran-Group-BSTS agents in parallel for one transaction group, producing both the -BDD.md and -BSTS.md artefacts under Artefacts/TranGroupData/.
argument-hint: <TransGroup>
---
## Step 1: Confirm the input artefact exists and resolve which group to process

Check for the presence of:
- Artefacts\Discovery\MoveGroup.md

If it is missing, stop immediately and report that it's missing — do not run either subagent without it. Suggest re-running `/Create-Group` first.

This command processes **one Trans Group per run**, never the whole file at once. Resolve the target group:
- If a Trans Group identifier (e.g. `MG-01`) was provided as an argument to this command, use it.
- If none was provided, read the distinct `Trans Group` values out of `Artefacts/MoveGroup.md` and ask the user which one to process this run. If the user has already confirmed a conversion order during `/03-MoveGroup`, ask for the **next** group in that confirmed sequence rather than treating the list as unordered. Do not default to running all of them.
- If the identifier given doesn't match any `Trans Group` value in `Artefacts/MoveGroup.md`, stop and report the mismatch, listing the valid identifiers found in the file.

## Step 2: Run Tran-Group-BDD and Tran-Group-BSTS in parallel

Invoke the Tran-Group-BDD subagent and the Tran-Group-BSTS subagent **together, as parallel calls in the same response** — do not run one, wait for it, then run the other. Pass both the same resolved Trans Group identifier from Step 1, and do not ask either one to process any other group. Each agent owns its own per-group output handling, analysis, file-naming convention, and read/write scope — do not re-check, re-derive, or re-specify any of that here.

## Step 3: Report back

After both subagent runs complete, report to the user:
- Full path to `Artefacts/TranGroupData/` and both the `-BDD.md` and `-BSTS.md` files created for this group
- The Trans Group processed (its identifier and short description)
- Any gaps either agent flagged (missing/unparseable source files) for this group
- Which other Trans Groups (if any) from `MoveGroup.md` still have no `-BDD.md` and/or `-BSTS.md` file yet, so the user knows to run `/Create-BDD-BSTS <Group>` again for those
- Request the user to review both generated files

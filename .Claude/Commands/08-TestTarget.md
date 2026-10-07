---
description: Generate and run functional-equivalence tests for a modernized legacy screen. Prompts for a path (Rebuild / Refactor / Test new Feature); the Refactor path runs the Test-Writer-Refactor and Test-Runner-Refactor agents sequentially for a chosen Tran Group.
argument-hint: (interactive)
---
## Step 1: Ask the user to choose a path

Use the **AskUserQuestion** tool to present a selectable option list (the user scrolls and picks — they do not type the option). Ask a single question (header e.g. `Path`) with exactly these three options:

1. **Rebuild**
2. **Refactor**
3. **Test new Feature**

Do not proceed until the user picks one. Route on their choice:
- **Rebuild** → Step 2
- **Refactor** → Step 3
- **Test new Feature** → Step 2

## Step 2: Options 1 & 3 — Work in Progress

Show the user this message:

> **This feature is Work in Progress. Please select another option.**

Do not run any agent. Return to Step 1 so the user can pick again.

## Step 3: Option 2 — Refactor — select the Tran Group

Read `Artefacts/Discovery/MoveGroup.md`. If it is missing, stop and report that it's missing — suggest re-running `/03-MoveGroup` first.

Collect the **distinct** `Trans Group` values from the file (e.g. `MG-01`) along with each group's `Short Description`. Use the **AskUserQuestion** tool to present these as a selectable option list (the user scrolls and picks — they do not type the identifier), one option per Trans Group, using the `Trans Group` value as the label and its `Short Description` as the option description. If the user has already confirmed a conversion order during `/03-MoveGroup`, present and process the groups in that confirmed order and ask for the **next** one in sequence rather than treating the list as unordered. Do not default to processing all of them.

If no `Trans Group` values are found in the file, stop and report that, rather than presenting an empty list.

## Step 4: Option 2 — Refactor — run the two test agents sequentially

Run the following agents **one at a time, in strict order** — invoke the next agent only after the previous one has completed successfully. Pass each the Trans Group identifier resolved in Step 3 (exactly as it appears in the source artefacts), and do not ask either of them to process another group. Each agent owns its own input reading, file-naming, and read/write scope — do not re-check or re-specify that here.

1. **Test-Writer-Refactor** — invoke first and wait for it to finish. It writes `Artefacts/QA/Test Case/<Tran Group>-Refactor-TestCase.md` (e.g. `MG-01-Refactor-TestCase.md`).
2. **Test-Runner-Refactor** — invoke **only after** Test-Writer-Refactor completes successfully, then wait for it to finish. It writes `Artefacts/QA/Test Result/<Tran Group>-Refactor-TestResult.md` (e.g. `MG-01-Refactor-TestResult.md`).

If Test-Writer-Refactor fails or reports a blocking gap, stop there and report it — do **not** invoke Test-Runner-Refactor.

Test-Runner-Refactor requires the target frontend/backend/database stack to be running. If it reports that the target is unreachable, relay that to the user (along with the start-up steps it cites) rather than treating it as a test failure — do not invoke it as a failed run.

## Step 5: Option 2 — Refactor — report back

After both agents complete successfully, tell the user:

> **The test agents have executed successfully.**

List the two output files produced for the Trans Group and request the user to review them:
- `Artefacts/QA/Test Case/<Tran Group>-Refactor-TestCase.md` (e.g. `MG-01-Refactor-TestCase.md`) — the test-case document.
- `Artefacts/QA/Test Result/<Tran Group>-Refactor-TestResult.md` (e.g. `MG-01-Refactor-TestResult.md`) — the test-result report.

## Step 6: Option 2 — Refactor — fix the failing test cases

Confirm that Test-Runner-Refactor actually created `Artefacts/QA/Test Result/<Tran Group>-Refactor-TestResult.md` for the Trans Group resolved in Step 3. If that file is not present, stop here and report that — do **not** invoke **Test-Bug-Fix**.

Only after that file is confirmed to exist, invoke **Test-Bug-Fix**, passing it the Trans Group identifier resolved in Step 3 (exactly as it appears in the source artefacts), and do not ask it to process another group. It owns its own input reading, fix policy, file-naming, and read/write scope — do not re-check or re-specify that here.

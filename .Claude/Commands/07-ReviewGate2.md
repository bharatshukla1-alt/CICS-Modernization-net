---
description: Deep-review one Tran Group's Phase-6 build specs (UI + Backend + Reconcile + Architecture) against Input/, the group's BSTS/BDD, Config.md, and CLAUDE.md using the Review-Gate2 agent, and write Artefacts/Review/<Tran Group>-ReviewGate2.md
argument-hint: [Tran Group, e.g. MG-01] (optional; interactive if omitted)
---
## Step 1: Resolve the Tran Group

If the user supplied a Tran Group identifier as an argument, use it.

Otherwise, list the spec sets present under `.Claude/Specs/Refactor/` — each group that has a `<Tran Group>-UI-Spec.md`, `<Tran Group>-Backend-Spec.md`, and `<Tran Group>-reconcile-Spec.md`, plus its matching `Artefacts/Architecture/<Tran Group>.Architecture.md` — show them with their short descriptions, and ask the user which Tran Group to review. If the user has already confirmed a conversion order during `/03-MoveGroup`, ask for the **next** group in that confirmed sequence rather than treating the list as unordered. Do not default to processing all of them.

If the user's selection doesn't match a set, stop and report the mismatch, listing the valid identifiers found.

## Step 2: Confirm the four artefacts exist

For the resolved Tran Group, check for all four of these:
- `.Claude/Specs/Refactor/<Tran Group>-UI-Spec.md`
- `.Claude/Specs/Refactor/<Tran Group>-Backend-Spec.md`
- `.Claude/Specs/Refactor/<Tran Group>-reconcile-Spec.md`
- `Artefacts/Architecture/<Tran Group>.Architecture.md`

If any is missing, stop and report which — do not run the Review-Gate2 agent against a partial set. Suggest re-running `/06-TargetBuild` (Refactor path) first to produce the missing spec(s).

## Step 3: Run the Review-Gate2 agent

Invoke the **Review-Gate2** subagent, passing the Tran Group identifier resolved in Step 1. The agent owns its own context-building (scanning `Input/`, the group's BSTS/BDD/DB artefacts, `Config/Config.md`, and `CLAUDE.md`), its review logic, and its file-naming/write scope — do not re-specify that here.

The agent writes `Artefacts/Review/<Tran Group>-ReviewGate2.md` with findings grouped as **Critical Gaps**, **Good to Have**, and **Advanced Suggestions**, plus a separate **Architecture Recommendations** section.

If the agent reports the review file already exists, relay its overwrite/skip question to the user before it writes.

## Step 4: Report back and offer to implement

After the agent completes, report to the user:
- Full path to `Artefacts/Review/<Tran Group>-ReviewGate2.md`.
- The finding counts per bucket and the build-readiness verdict.
- Ask which suggestions to implement or skip (by finding ID, whole bucket, all, or none).

This command only produces the review. Applying an accepted finding means re-running the owning spec agent (`Refactor-UI-Spec` / `Refactor-Backend-Spec` / `Refactor-Reconcile-Spec` via `/06-TargetBuild`) with the chosen findings as input — do not edit any spec here. If the user chooses to skip everything, acknowledge and stop.

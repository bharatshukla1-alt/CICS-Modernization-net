---
description: Build the modern target for a legacy screen. Prompts for a build path (Rebuild / Refactor / Create new Feature); the Refactor path runs the Refactor-UI-Spec, Refactor-Backend-Spec, and Refactor-Reconcile-Spec agents sequentially for a chosen Tran Group.
argument-hint: (interactive)
---
## Step 1: Ask the user to choose a build path

Present exactly these three options and ask the user to select one:

1. **Rebuild**
2. **Refactor**
3. **Create new Feature**

Do not proceed until the user picks one. Route on their choice:
- Option **1** → Step 2
- Option **2** → Step 3
- Option **3** → Step 6

## Step 2: Option 1 — Rebuild

Show the user this message and stop:

> **Work in Progress. Please select another option.**

Do not run any agent. If the user wants to continue, re-invoke this command from Step 1.

## Step 3: Option 2 — Refactor — select the Tran Group

Read `Artefacts/Discovery/MoveGroup.md`. If it is missing, stop and report that it's missing — suggest re-running `/03-MoveGroup` first.

Collect the **distinct** `Trans Group` values from the file (e.g. `MG-01`) along with each group's `Short Description`, present that list to the user, and ask which Trans Group to process this run. If the user has already confirmed a conversion order during `/03-MoveGroup`, present and process the groups in that confirmed order and ask for the **next** one in sequence rather than treating the list as unordered. Do not default to processing all of them.

If the user's selection doesn't match any `Trans Group` value in the file, stop and report the mismatch, listing the valid identifiers found.

## Step 4: Option 2 — Refactor — run the three spec agents sequentially

Run the following agents **one at a time, in strict order** — invoke the next agent only after the previous one has completed. Pass each the Trans Group identifier resolved in Step 3, and do not ask any of them to process another group. Each agent owns its own input reading, file-naming, and read/write scope — do not re-check or re-specify that here.

1. **Refactor-UI-Spec** — wait for it to finish.
2. **Refactor-Backend-Spec** — invoke only after Refactor-UI-Spec completes; wait for it to finish.
3. **Refactor-Reconcile-Spec** — invoke only after Refactor-Backend-Spec completes; wait for it to finish.

If any agent fails or reports a blocking gap, stop there and report it — do not invoke the next agent in the chain.

## Step 5: Option 2 — Refactor — report back

After all three agents complete successfully, tell the user:

> **The agents have executed successfully.**

Also list the output spec files produced for the Trans Group and request the user to review them.

## Step 6: Option 3 — Create new Feature — select the Tran Group

Read `Artefacts/Discovery/MoveGroup.md` and resolve the target Trans Group exactly as in Step 3 (present the distinct `Trans Group` values with their short descriptions, ask the user to select one, and validate the selection).

After the user selects a valid Trans Group, show this message and stop:

> **Work in Progress. Please select another option.**

Do not run any agent. If the user wants to continue, re-invoke this command from Step 1.

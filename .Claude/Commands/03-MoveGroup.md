---
description: Build Artefacts/MoveGroup.md by clustering transactions/programs from CicsXref.md into move groups, using the Create-Tran-group agent.
---
## Step 1: Confirm the input artefact exists

Check for the presence of:
- Artefacts\CicsXref.md

If it is missing, stop immediately and report that it's missing — do not run the Create-Tran-group agent without it. Suggest re-running `/Analyse-csd` first.

## Step 2: Run the Create-Tran-group agent

Invoke the Create-Tran-group subagent to build `Artefacts/Discovery/MoveGroup.md` from `Artefacts/Discovery/CicsXref.md`. The agent owns its own Gate 1 confirmation, clustering logic, column rules, and read/write scope — do not re-ask, re-check, or re-specify any of that here. In particular, do not preemptively read `Artefacts/Gate1.md` or ask the user for Gate 1 approval yourself before invoking the agent — let the subagent's own Step 1 question be the only prompt the user sees.

When the subagent's first response is its Gate 1 confirmation question, relay that exact question to the user **once**. Capture their literal answer and pass it back to the subagent verbatim in your next message — do not paraphrase it into your own assertion (e.g. don't rewrite "yes" as "the user confirms Gate 1 is approved and Gate1.md shows no blocking findings"; just quote what they said). If the subagent responds asking for confirmation again, that means your relay was unclear — re-send the user's original literal words rather than asking the user a second time.

## Step 3: Report back

After the Create-Tran-group subagent run completes, report to the user:
- Full path to `MoveGroup.md`
- The move groups formed and which transactions/programs fall into each
- Request the user to review `MoveGroup.md`

## Step 4: Ask for transaction sequencing

After the user has reviewed the move groups, ask which transaction in each move group should be converted first and which should follow. Capture that order as the working conversion sequence for the later refactor phases, then report it back to the user alongside the move-group summary.

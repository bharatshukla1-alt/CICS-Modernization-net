---
description: Cross-check TransVsPgm.md, CicsXref.md, and Screen-metadata.md against the actual source files in Input/ using the review-gate1 agent, and write Artefacts/Gate1.md
---
## Step 1: Confirm the discovery artefacts exist

Check for the presence of these three files:
- C:\Users\Arijit\OneDrive\Desktop\Project\CICS Modernization\Artefacts\TransVsPgm.md
- C:\Users\Arijit\OneDrive\Desktop\Project\CICS Modernization\Artefacts\CicsXref.md
- C:\Users\Arijit\OneDrive\Desktop\Project\CICS Modernization\Artefacts\Screen-metadata.md

If any of the three is missing, stop immediately and report which file(s) are missing — do not run the review-gate1 agent against a partial set. Suggest re-running `/Analyse-csd` first.

## Step 2: Run the review-gate1 agent

Using the review-gate1 subagent, cross-check the three documentation files below against the real source files under `Input\` (treated as ground truth):

Documentation to validate:
- C:\Users\Arijit\OneDrive\Desktop\Project\CICS Modernization\Artefacts\TransVsPgm.md
- C:\Users\Arijit\OneDrive\Desktop\Project\CICS Modernization\Artefacts\CicsXref.md
- C:\Users\Arijit\OneDrive\Desktop\Project\CICS Modernization\Artefacts\Screen-metadata.md

Ground truth source (recursively scan, excluding the three docs above):
C:\Users\Arijit\OneDrive\Desktop\Project\CICS Modernization\Input\

Rules:
- Only read files under `Input\` and the three Artefacts files above. Only write `Artefacts\Gate1.md`. Do not modify any other file.
- If any of the three documentation files cannot be read, stop and report the exact error — do not proceed with a partial review.
- Only report a discrepancy that can be pointed to with a specific file path and line/section on both sides of the comparison — do not fabricate or infer a mismatch that can't be cited.
- If a documentation file is unreadable or a component type is ambiguous, log it under "Other discrepancies" rather than skipping it silently.
- Save the review to \Artefacts\Gate1.md


## Step 3: Report back

After the review-gate1 subagent run completes, report to the user:
- Full path to `Gate1.md`
- Request user to review the `Gate1.md` file.
- Any files that were unreadable or ambiguous during the review

# CICS Modernization Workbench

This repository is a modernization workbench for converting legacy CICS and COBOL transaction flows into a modern target application stack. It is structured as a phase-driven pipeline that reads legacy source assets, produces analysis and specification artefacts, and supports database provisioning, target build guidance, testing, and quality/security review.

The current implementation is centered on the Refactor path. In that path, the workflow analyzes the legacy inputs under `Input/`, groups related transactions, produces business and technical artefacts, provisions target-side data structures, generates build specifications for UI and backend, runs test-generation and test-execution steps, and records review findings.

## What This Repository Contains

The repository is organized around four major concerns:

1. Legacy source intake
   Legacy assets live under `Input/` and are treated as read-only. These include BMS maps, COBOL programs, copybooks, CSD definitions, DB2 DDL/DCL, control files, and related migration inputs.

2. Command and agent orchestration
   The workflow logic is defined in `.Claude/Commands/` and `.Claude/Agents/`. Commands represent pipeline phases. Agents own the detailed logic for discovery, grouping, specification generation, DB setup, testing, and review.

3. Generated artefacts and target outputs
   Artefacts created by the workflow are written under `Artefacts/`, `.Claude/Specs/Refactor/`, and `Target/`. These are outputs of the modernization process and should be understood as generated or generated-assisted deliverables.

4. Database tooling and adapters
   Target-database provisioning and inspection are handled through `tools/db-apply.mjs` and the vendored adapter implementation under `db-adapters/`.

## Pipeline Overview

The workbench uses a nine-phase process:

1. Discovery
   Extract transaction-to-program mappings, cross-reference touched resources, and derive screen metadata.

2. Review Gate 1
   Review discovery outputs before grouping starts.

3. Move Group Creation
   Cluster related transactions into move groups and define the transaction conversion sequence.

4. BDD and BSTS Generation
   Produce one transaction-group-level BDD artefact and one Business Summary and Technical Summary artefact.

5. Database Creation
   Detect DB2 and VSAM usage, generate target schema artefacts, provision the target database, and produce a status report.

6. Target Build Specification
   Generate UI, backend, and reconciliation specifications for a selected transaction group.

7. Review Gate 2
   Review the build specifications and architecture before build implementation proceeds.

8. Testing
   Generate test cases, execute them against the target application, and optionally apply bug fixes.

9. Quality and Security Review
   Run code-quality and security review workflows and optionally apply accepted fixes.

## Repository Layout

Key top-level folders:

- `Input/`
  Read-only legacy source materials used as the ground truth for modernization.

- `.Claude/Commands/`
  Pipeline-phase command definitions that orchestrate the workflow.

- `.Claude/Agents/`
  Specialized agent instructions for each phase or subtask.

- `.Claude/Specs/Refactor/`
  Generated build specifications for the Refactor path.

- `Artefacts/`
  Generated discovery, grouping, BDD, BSTS, architecture, database, QA, and review outputs.

- `Target/`
  Target application code and related generated output for transaction groups.

- `config/`
  Source-to-target technology mapping and UI styling guidance.

- `tools/`
  Workflow support tooling, including the direct database apply/query script.

- `db-adapters/`
  Vendored adapter code used by the database tooling.

## Configuration Model

The target stack is intentionally driven by configuration rather than by hardcoded assumptions in the workflow docs. `config/Config.md` acts as the source of truth for target technology mapping. Repository-level command and agent docs are written to resolve behavior from config-defined keys so the workbench can be reused for different target stacks.

## Current Scope and Status

- The Refactor path is the implemented path in the workflow.
- Rebuild and Create new Feature paths remain placeholders in the orchestrated command flow.
- Generated artefacts and generated specs are preserved as execution outputs and are not treated as hand-maintained repository-level guidance.
- The command flow now captures and carries forward transaction conversion order so downstream per-group phases can follow the sequence established during move-group review.

## Important Working Rules

- `Input/` is read-only.
- Each phase writes to an expected output location; artefact names should not be improvised.
- Human review gates must be respected before advancing to later phases.
- Generated specs and artefacts should be treated as workflow outputs, not manually normalized unless the workflow itself is being changed.

## Getting Started

To work with this repository effectively:

1. Start from the command and agent definitions under `.Claude/Commands/` and `.Claude/Agents/`.
2. Use `CLAUDE.md` for the end-to-end workflow contract and architecture-level rules.
3. Use `config/Config.md` for target technology mapping.
4. Treat artefacts under `Artefacts/` and specs under `.Claude/Specs/Refactor/` as generated outputs from pipeline execution.

## Notes for Contributors

This repository currently contains generated and vendored content, including target application outputs and adapter code. Changes to repository-level workflow behavior should generally be made in:

- `CLAUDE.md`
- `.Claude/Commands/`
- `.Claude/Agents/`
- `config/Config.md`
- `tools/`

If you are updating workflow behavior, prefer changing the command or agent definitions that generate or govern downstream outputs rather than manually rewriting generated artefacts.

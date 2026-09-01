# Scribe Journal 📒

High-leverage learnings and strategy updates for Noosphere-Architect documentation.

## 2026-06-01 - Documentation Refresh & Linting

**Observation:** The repository had significant markdown linting errors (246+) and inconsistencies in the "Getting Started" instructions across README.md and QUICKSTART.md.
**Learning:** Automated linting with `markdownlint-cli2` is essential for maintaining documentation quality. Using a `.markdownlint-cli2.jsonc` file allows for project-specific rule overrides (e.g., disabling line length checks for complex diagrams).
**Action:** Fixed all linting errors, standardized core documentation to the Scribe skeleton, and established a persistent linting configuration.

## 2026-06-01 - Environment & Base Path Nuances

**Observation:** The project uses a specific base path `/Noosphere-Architect/` in `vite.config.ts`, which affects the local dev URL. It also requires `VITE_ENCRYPTION_KEY` for data persistence in IndexedDB.
**Learning:** Forgetting these details leads to 404s or broken persistence for first-time users.
**Action:** Ensured both the base path and the encryption key requirement are prominently featured in `README.md` and `QUICKSTART.md`.

## 2026-07-01 - Architecture Hub & Data Persistence v15

**Observation:** The project evolved to use `ProjectArchitect` as a multi-tabbed hub for Roadmaps and Agent Jobs, but documentation still referred to them as standalone tools or was missing them in the architecture diagram. Additionally, the IndexedDB version had reached v15.
**Learning:** Documentation must reflect the structural consolidation of tools to avoid user confusion about where to find features like "Agent Job Architect".
**Action:** Updated `README.md` to reflect the multi-tabbed `ProjectArchitect` structure and synchronized `ARCHITECTURE.md` with the current system state (v15 schema, new data stores). Standardized formatting across all artifacts to ensure zero linting errors.

## 2026-07-15 - Schema v19 & CI Badges Alignment

**Observation:** Database migrations in `dbService.ts` reached v19 (adding `userPreferences` store in v18 and explicit `sourceTool` record stamping in v19), while `ARCHITECTURE.md` lagged behind at v17. Additionally, PR CI workflow status badge was missing from `README.md`.
**Learning:** System documentation and diagrams must be routinely updated alongside schema version upgrades to reflect new data stores and metadata tagging patterns.
**Action:** Updated `ARCHITECTURE.md` diagram and key decision entries to v19, and added the PR CI badge to `README.md`.

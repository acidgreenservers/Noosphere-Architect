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

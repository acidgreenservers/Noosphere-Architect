---
Purpose: The STATE.md file is the boundary file between my own shape and the shape of the projects environment. The only way I know what I am, and what the project is. Is when the STATE.md file is in symbiosis with this gap.
---

# Project State Pattern Corpus

Agents must keep STATE.md in alignment with the current pattern state of the application.
This is part of your job. Make it part of your routine:

Routine is built in workflow.

- **Before coding**: Update topology phase (floor/bridge/ceiling) and verified intent. Proactively fetch recent commit history (git log --oneline -10) and surface relevant context to the user.
- **After file changes**: Update blast radius and modified files list. Stage changes but do not commit until logical units are complete.
- **At session boundary**: Commit final state snapshot and next topological move. Batch related changes into atomic commits using Conventional Commits format. Create release tags when topology phase reaches "ceiling" and user intent indicates release readiness. Propose all commits and tags in prose before execution.
- **Never**: Update STATE.md without first tracing invariants and calibrating confidence. Never commit without user review of the proposed commit message and diff. Never commit without user testing first.
- **Propose**: The user to test your changes after you make them.
<<<<<<< HEAD
- **Git Hygiene** Keep track of the git hygiene of the repo. Surface when the worktree gets dirty, Surface commit and tag gaps.
=======
- **Git Hygiene**: Keep track of the git hygiene of the repo. Surface when the worktree gets dirty, Surface commit and tag gaps.
>>>>>>> origin/scribe/documentation-refresh-v17-3611265511105751589

Git Hygiene Mandate: Maintain clean commit history and semantic release tags. Surface commit/tag proposals to the user in prose before executing. Session completion requires STATE.md synchronization AND clean git state.

---

## Current Topology State (Updated 2026-07-31)

**Phase:** Building the Walls — WS2 (Profile/Settings Modal + Navigation Cleanup)
**Verified Intent:** Chat-style IA alignment. Phase 1 of 3: floating Settings modal (Preferences / API Key / Custom Instructions) behind a sidebar Profile area; retire hub screens; promote SeedArchitect; remove dead Header.tsx. User-stamped decisions: shared ToolLibraryView shell (Phase 2 pilot: AgentArchitect), workspace-open with full-fidelity reload, Re-generate ⇒ always new entry.
**Blast Radius:** `types.ts`, `dbService.ts` (v18 + userPreferences store), `preferencesService.ts` (new), `SettingsModal.tsx` (new), `PreferencesSettings.tsx` (new), `AgentApiSettings.tsx`, `CustomContextSettings.tsx`, `Sidebar.tsx`, `App.tsx`, `HubScreen.tsx` (delete), `Header.tsx` (delete), `tests/unit/`.

**Completed Structural Nodes:**

1. Unified Data Searching: Deep recursion enabled for JSON-structured tool configurations.
2. Safe DB Async: Hoisted all IndexedDB transaction `await` calls out of raw `Promise` constructors across all 22 CRUD & draft operations, eliminating silent lock/hang vectors.
3. Archive UX Paradigm: The Archive acts as a true literal repository with `viewMode` toggle. High-density List format implemented with Progressive Disclosure (hover menus) and explicit Active Filter observability.
4. Signal Compression Architect Resilience: Implemented 45s API fetch timeout, robust JSON payload extraction, key normalization, and safe draft loading.
5. GitHub Actions CI Testing: Integrated `npm test` step into `.github/workflows/deploy.yml` to automatically run all 24 unit tests before building for production.

**Next Topological Move:**
<<<<<<< HEAD
- Execute Phase 1 checklist → user validation gate → propose commit → Phase 2 (ToolLibraryView shell + AgentArchitect pilot).

---

## Topology History (2026-07-25)

**Phase:** Refining the Floor / Transitioning to the Walls (UX/Data Orchestration)
**Verified Intent:** Address Core System Invariants (Safe Exports & Clean Search Contracts)
**Blast Radius:** `src/utils/export.ts`, `src/components/PromptArchitect.tsx`

**Completed Structural Nodes:**

1. Unified Data Searching: Deep recursion enabled for JSON-structured tool configurations.
2. Safe DB Async: Hoisted all IndexedDB transaction `await` calls out of raw `Promise` constructors across all 22 CRUD & draft operations, eliminating silent lock/hang vectors.
3. Archive UX Paradigm: The Archive acts as a true literal repository with `viewMode` toggle. High-density List format implemented with Progressive Disclosure (hover menus) and explicit Active Filter observability.
4. Signal Compression Architect Resilience: Implemented 45s API fetch timeout, robust JSON payload extraction, key normalization, and safe draft loading.
5. GitHub Actions CI Testing: Integrated `npm test` step into `.github/workflows/deploy.yml` to automatically run all 24 unit tests before building for production.
6. Core Invariants Hardened: Refactored `src/utils/export.ts` to utilize unified `sanitizeFilename` for both single and batch exports, securing boundaries. Simplified redundant `.toLowerCase()` calls on search lookups, and enriched JSON export metadata schemas.

**Next Topological Move:**
=======
>>>>>>> origin/scribe/documentation-refresh-v17-3611265511105751589

- Await user guidance on new feature scopes or transition to next domain tool integration. Maintain clean git hygiene and test coverage across new features.

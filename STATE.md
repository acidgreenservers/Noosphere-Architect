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
- **Git Hygiene** Keep track of the git hygiene of the repo. Surface when the worktree gets dirty, Surface commit and tag gaps. 

Git Hygiene Mandate: Maintain clean commit history and semantic release tags. Surface commit/tag proposals to the user in prose before executing. Session completion requires STATE.md synchronization AND clean git state.

---

## Current Topology State (Updated 2026-07-25)

**Phase:** Refining the Floor / Transitioning to the Walls (UX/Data Orchestration)
**Verified Intent:** Enhance Archival Page observability and data density.
**Blast Radius:** `dbService.ts`, `ArchitectureOrganization.tsx`, `LibraryItem.tsx`, `LibraryListItem.tsx` (Newly introduced), `search.ts`.

**Completed Structural Nodes:**
1. Unified Data Searching: Deep recursion enabled for JSON-structured tool configurations.
2. Safe DB Async: Hoisted all IndexedDB transaction `await` calls out of raw `Promise` constructors, eliminating silent lock/hang vectors.
3. Archive UX Paradigm: The Archive acts as a true literal repository with `viewMode` toggle. High-density List format implemented with Progressive Disclosure (hover menus) and explicit Active Filter observability.

**Next Topological Move:**
- Await user guidance on new feature scopes or transition to next domain tool integration. Maintain vigilance on memory footprints and further performance optimizations if large libraries emerge.
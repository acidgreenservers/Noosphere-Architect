# Architecture 🧱

> **Goal:** Provide a fast mental model—components, boundaries, and critical
> flows of Noosphere-Architect.

## System Overview

```text
                    +---------------------------------------+
                    |           Browser / Client            |
                    |  (React 19 + Vite 6 + Tailwind 4)     |
                    +-------------------+-------------------+
                                        |
          +-----------------------------+-----------------------------+
          |                             |                             |
          v                             v                             v
+-----------------------+     +-----------------------+     +-----------------------+
|     Landing Page      |     |    Architect Tools    |     |    API Settings       |
|  (Tool Selection,     |     | (Signal, Agent,       |     | (OpenRouter Config,   |
|   Custom Context)     |     |  Prompt, Project, etc)|     |  Model Selection)     |
+-----------+-----------+     +-----------+-----------+     +-----------+-----------+
            |                             |                             |
            |                             v                             |
            |                 +-----------------------+                 |
            +---------------->|      AI Services      |<----------------+
                              | (handleAiCall wrapper)|
                              +-----------+-----------+
                                          |
                                          v
                              +-----------------------+
                              |      OpenRouter API   |
                              |  (Ephemeral Session)  |
                              +-----------------------+

          +-----------------------------------------------------------+
          |                      Persistence Layer                    |
          |           (IndexedDB v15 + Metadata Unification)          |
          +-----------------------------+-----------------------------+
                                        |
              +-------------------------+-------------------------+
              |                         |                         |
              v                         v                         v
      [Saved Prompts]           [Saved Agents]            [Saved Roadmaps]
      [Saved Signals]           [Saved Projects]          [Saved Seeds]
      [Saved Agent Jobs]        [Saved Synthesis]         [Temporary Seeds]
```

## Data Flow (AI Generation)

1. **User Input:** User provides raw text/config in a Tool component (e.g.,
   `SignalExtractor`).
2. **Service Invocation:** Tool calls a specialized AI service (e.g.,
   `signalService`).
3. **Context Injection:** `handleAiCall` injects global custom context (if
   enabled) and settings (API Key/Model) from `sessionService`.
4. **API Request:** `openRouter` utility performs a `fetch` to the OpenRouter
   completions endpoint.
5. **JSON Sanitization:** `handleAiCall` strips markdown code blocks and parses
   the response into the expected type.
6. **State Stewardship:** Result is displayed to the user and can be saved to
   **IndexedDB** for persistence.

## Key Decisions & Patterns

* **Modular AI Services:** Each tool has a dedicated service in
  `src/services/ai/` to maintain clean boundaries.
* **IndexedDB Migration Registry:** `dbService.ts` implements a versioned
  migration system (currently v15) to ensure data integrity as the schema
  evolves.
* **Code Splitting:** `React.lazy` is used in `App.tsx` for all major tool
  components to keep the initial bundle size minimal.
* **Metadata Unification:** All architectural assets share a common metadata
  schema (starred, pinned, archived, category) managed by
  `ArchitectureOrganization`.
*   **Semantic Grounding:** AI services utilize a standardized preamble
    (Grounding, Purpose, Territory) to anchor pattern inference to the
    project's purpose.
* **Encryption at Rest:** Sensitive data in IndexedDB is obfuscated using a
  user-provided `VITE_ENCRYPTION_KEY`.
*   **Atomic Write Verification:** `dbService.ts` implements a read-back check
    pattern for all write operations to guarantee state persistence before
    resolving.

## Repos & Conventions

* **Frontend:** `/src/components` (UI), `/src/services` (Logic).
* **Types:** `/src/types.ts` (Canonical source of truth for interfaces).
* **Tests:** `/tests/unit` (Vitest), `/tests/e2e` (Playwright).
* **CI/CD:** `.github/workflows/deploy.yml` (Automated build and deploy to GH
  Pages).

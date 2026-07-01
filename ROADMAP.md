# Project Roadmap

This document outlines the potential future direction for AI Agent Architect.
Our goal is to evolve this tool into a more powerful and integrated solution for
AI development. These are ideas for future development and are subject to
change.

## Phase 1: Enhanced Generation & Customization

* **[ ] Template Library:** Introduce a library of pre-defined agent
  templates (e.g., "Customer Support Bot," "Data Analyst," "Code Generator")
  that users can select and customize.
* **[ ] Fine-Grained Controls:** Add advanced options to control the tone,
  verbosity, and format of the generated output.
* **[ ] Multiple File Formats:** Allow users to export the generated files in
  different formats, such as JSON, YAML, in addition to Markdown.
* **[x] Improved UI/UX:** Refine the user interface with better loading
  states, success notifications, and a more interactive display for the
  generated content.

---

* **[ ] Task: Implement Phase 1 – Enhanced Generation & Customization**

  **Description:**
  Build a cohesive set of front-end and back-end features that expand the
  existing agent generation workflow with four tightly-integrated
  capabilities:

  1. **Template Library**
     * **Data Model:** Extend the current `AgentTemplate` schema to include
       `id`, `name`, `description`, `defaultPrompt`, `defaultSettings`
       (tone, verbosity, output format). Store templates in a read-only
       JSON file bundled with the app and expose them via a new **GET**
       `/api/templates` endpoint.
     * **UI Component:** Add a “Select Template” modal containing a
       searchable list of templates. When a user selects a template,
       pre-populate the prompt editor and settings panel with the
       template’s defaults.
     * **Integration:** The generation service must merge the selected
       template’s `defaultPrompt` with any user-added prompt text before
       invoking the LLM.

  2. **Fine-Grained Controls**
     * **Controls UI:** Introduce three dropdowns/sliders beneath the
       prompt editor: **Tone** (formal, neutral, casual), **Verbosity**
       (concise, balanced, detailed), **Format** (plain text, Markdown,
       code block).
     * **State Management:** Store selections in a `generationOptions`
       object (`{tone, verbosity, format}`) that is serialized into the
       LLM request payload (`options` field).
     * **Behavior:** The back-end must forward these options to the LLM
       wrapper, which will prepend a system prompt that instructs the
       model accordingly.

  3. **Multiple File Formats**
     * **Export Service:** Extend the existing `exportResult()` helper to
       accept a format enum (`markdown`, `json`, `yaml`). Implement
       serializers:
       * **Markdown:** unchanged (existing).
       * **JSON:** wrap the generated content in
         `{ "content": "<generated>", "metadata": {...} }`.
       * **YAML:** produce an equivalent YAML document.
     * **UI Export Button:** Add three icons/buttons labelled “Export as
       .md”, “Export as .json”, “Export as .yaml”. Clicking triggers the
       appropriate serializer and initiates a browser download with the
       correct MIME type.
     * **Edge Cases:** If serialization fails (e.g., circular references),
       display an error toast and log the exception.

  4. **Improved UI/UX**
     * **Loading States:** Replace the current “Generating…” plain text
       with a spinner overlay that blocks interaction while the generation
       request is pending.
     * **Success Notifications:** On successful generation, show a
       transient toast (`Generation complete`) and automatically scroll
       the result pane into view.
     * **Interactive Result Display:** Render the generated output inside
       a collapsible, syntax-highlighted panel. Provide “Copy to
       Clipboard” and “Regenerate with same settings” actions.
     * **Error Handling:** Centralize error messages in a banner
       component; any failed API call (templates, generation, export)
       should surface a user-friendly message with a retry button.

  **Data Flow Summary:**
  1. UI loads template list → **GET** `/api/templates`.
  2. User selects template → defaults populate editor & `generationOptions`.
  3. User adjusts fine-grained controls → updates `generationOptions`.
  4. User clicks **Generate** → front-end POSTs `{prompt, options, templateId}`
     to `/api/generate`.
  5. Back-end merges template prompt, injects options into system prompt,
     calls LLM, returns generated content.
  6. UI displays content in interactive panel with loading spinner & success
     toast.
  7. User clicks Export → front-end calls appropriate serializer, triggers
     file download.

  **Edge-Case Considerations:**
  * Selecting a template that no longer exists (stale cache) → fallback to
    a plain prompt and show warning.
  * Invalid option values (e.g., unknown tone) → default to “neutral”.
  * Export failure due to browser sandbox → notify user and suggest
    re-trying.
  * Generation timeout → cancel request, hide spinner, present retry UI.

  > **Success Criteria:**
  1. **Template Library** – At least three distinct templates (Customer
     Support Bot, Data Analyst, Code Generator) are returned by
     `/api/templates` and selectable in the UI; selecting a template
     pre-populates prompt and settings.
  2. **Fine-Grained Controls** – Changing Tone, Verbosity, or Format results
     in measurable differences in the LLM output (verified by snapshot tests
     for each combination).
  3. **Multiple File Formats** – Export buttons produce correctly formatted
     `.md`, `.json`, and `.yaml` files; automated integration tests confirm
     MIME type and content structure.
  4. **Loading & Notification UI** – During generation, a spinner overlay is
     visible; upon success, a toast reads “Generation complete”. Both appear
     within 200 ms of state change (performance test).
  5. **Result Interaction** – Generated output is displayed in a
     collapsible, syntax-highlighted panel with functional “Copy” and
     “Regenerate” actions.
  6. **Error Resilience** – Simulated API failures trigger the error banner
     with a functional “Retry” button; no uncaught exceptions appear in the
     console.
  7. **No Regression** – Existing markdown-only export and basic generation
     remain fully functional (verified by the existing unit- and
     end-to-end test suites).

---

## Phase 2: Integration & Workflow Automation

* **[ ] Version History:** Implement a system to save and manage different
  versions of generated agent configurations.
* **[ ] GitHub Integration:** Add functionality to directly create a new
  GitHub repository with the generated files, including a basic project
  structure.
* **[ ] Code Snippet Generation:** Extend the generation capabilities to
  produce boilerplate code snippets (e.g., a basic Python class or a
  Node.js service) based on the agent's persona.
* **[ ] Collaboration Features:** Allow users to share a link to their agent
  configuration for team collaboration.

## Phase 3: Advanced AI Capabilities

* **[ ] Multi-Agent Systems:** Introduce features for defining interactions
  and relationships between multiple agents within a single project.
* **[x] Model Selection:** Allow users to choose between curated OpenRouter
  models (DeepSeek, Xiaomi Mimo, OpenAI, etc.) based on their architectural
  needs.
* **[ ] Feedback Loop:** Implement a mechanism for users to rate the quality
  of the generated files and provide feedback, which could be used to refine
  the generation prompts over time.

## Long-Term Vision

* **[ ] Associate a knowledge base with their AI agent** Develop a feature
  that allows users to associate a knowledge base with their AI agent. This
  knowledge base could be populated with text documents, URLs, or other data
  sources that the agent can access and use to inform its responses.
* **[ ] define Personality Traits** Add the ability for users to define
  personality traits for their AI agents. These traits (e.g., 'witty,'
  'formal,' 'empathetic,' 'analytical') should influence the agent's
  communication style and responses.
* **[ ] Visual Agent Designer:** A drag-and-drop interface for building
  agent workflows and defining their capabilities visually.
* **[ ] Full Project Scaffolding:** Evolve from generating documentation to
  scaffolding complete, runnable starter projects based on the agent's
  definition.
* **[ ] Marketplace for Agents:** A platform where developers can share and
  discover pre-built agent configurations and templates.

We welcome contributions and suggestions from the community. If you have an
idea you'd like to see on this roadmap, please open an issue on GitHub to start
a discussion.

## Ideas ONLY

### Do not implement without explicitly being asked by the user

Expand the agent creation tool to include a personality matrix. The user should
be able to select or input a range of personality traits (e.g., tone,
communication style, emotional disposition) that will define the agent's
behavior and responses.

Integrate a memory system for the AI agents. Agents should be able to recall
previous conversation topics, user details, and stated preferences to maintain
context and provide more personalized interactions. Define how this memory will
be stored and accessed.

Create a feature for the AI agent creator that offers a library of predefined
agent templates. Each template should come with a suggested role, personality
traits, and a brief description of its intended use. Allow users to select a
template and then customize it further.

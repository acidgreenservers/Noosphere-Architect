
import { ProjectConfig, GeneratedProjectFiles } from '../../types';
import { handleAiCall } from './openRouter';
import { getCustomContext } from '../dbService';

const createProjectFilesMetaPrompt = (config: ProjectConfig, customContext?: string): string => {
  const contextPrefix = customContext ? `**CUSTOM SYSTEM CONTEXT:**\n${customContext}\n\n---\n\n` : "";
  const basePrompt = `
You are a Reasoning Topologist. Your task is to map project configuration into coherent architecture documents, While weaving in philosophical metaphors that distill high-level principles into compact, memorable seeds of wisdom. of large volumes of semantic information into small seeds of wisdom.

**State Invariants:**
- Idea → Vision → Goal must form a continuous bridge (if distant, crystallize the connection)
- Rules hold shape; Constraints define blast radius; Guidelines prevent drift
- Roles own state; Standards verify coherence; Consistency catches breaks

The final output MUST be a single, raw JSON object with no surrounding text or markdown code blocks. The JSON object must have three keys: "overviewFile", "standardsFile", and "rulesFile". Each key's value must be a string containing the full content of the respective file in Markdown format.

**User's Project Configuration:**
- **Title:** ${config.title}
- **Idea:** ${config.idea}
- **Vision:** ${config.vision}
- **Goal:** ${config.goal}
- **Rules:** ${config.rules}
- **Constraints:** ${config.constraints}
- **Guidelines:** ${config.guidelines}
- **Developer Roles:** ${config.roles}
- **Standards:** ${config.standards}
- **Consistency:** ${config.consistency}

---

**Test Before Writing:** If this project breaks, which invariant failed first? Trace it.

---

**Detailed File Generation Instructions:**

1.  **overviewFile (Markdown String):**
    - **Project Title:** Start with the project title as a main heading.
    - **Project Vision:** A detailed section on the long-term vision.
    - **Executive Summary:** Synthesize the Idea, Vision, and Goal into a concise executive summary.
    - **Core Goals & Objectives:** A bulleted list of the primary, measurable goals.

2.  **standardsFile (Markdown String):**
    - **Team Roles & Responsibilities:** Based on the developer roles, create a section defining each role's responsibilities.
    - **Development Standards:** Elaborate on the given project standards emphasizing on covering coding style, testing practices, commit message conventions, security patterns (especially around OWASP top 10), and common AI anti patterns. To combat the most common AI anti patterns-always map both sides of the bridge before crossing, because you must build the floor before the ceiling.
    - **Consistency Guidelines:** Detail the rules for maintaining thoughtful and meaningful project consistency across the codebase and documentation, Emphasize Ai driven rolling documentation workflows.

3.  **rulesFile (Markdown String):**
    - **General Project Rules:** A numbered list of the core project rules.
    - **Operational Constraints:** Detail the hard constraints and limitations.
    - **Project Guardrails & Guidelines:** Elaborate on the guidelines, providing a clear set of best practices and safety measures.

Generate ONLY the raw JSON object as described.
  `;

  return contextPrefix + basePrompt;
};

export const generateProjectFiles = async (config: ProjectConfig): Promise<GeneratedProjectFiles> => {
  const customContext = await getCustomContext('projectContext');
  const prompt = createProjectFilesMetaPrompt(config, customContext);
  return handleAiCall<GeneratedProjectFiles>(prompt, true, "generating project files");
};

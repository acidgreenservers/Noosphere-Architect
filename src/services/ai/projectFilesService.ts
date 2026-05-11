
import { ProjectConfig, GeneratedProjectFiles } from '../../types';
import { handleAiCall } from './openRouter';

const createProjectFilesMetaPrompt = (config: ProjectConfig): string => {
  return `
You are a top-tier Project Management AI. Your task is to take a user's high-level project definition and generate a set of three comprehensive, structured project documents.

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

**Detailed File Generation Instructions:**

1.  **overviewFile (Markdown String):**
    - **Project Title:** Start with the project title as a main heading.
    - **Executive Summary:** Synthesize the Idea, Vision, and Goal into a concise executive summary.
    - **Project Vision:** A detailed section on the long-term vision.
    - **Core Goals & Objectives:** A bulleted list of the primary, measurable goals.

2.  **standardsFile (Markdown String):**
    - **Team Roles & Responsibilities:** Based on the developer roles, create a section defining each role's responsibilities.
    - **Development Standards:** Elaborate on the project standards. This could include code style, testing practices, and commit message formats.
    - **Consistency Guidelines:** Detail the rules for maintaining project consistency across the codebase and documentation.

3.  **rulesFile (Markdown String):**
    - **General Project Rules:** A numbered list of the core project rules.
    - **Operational Constraints:** Detail the hard constraints and limitations.
    - **Project Guardrails & Guidelines:** Elaborate on the guidelines, providing a clear set of best practices and safety measures.

Generate ONLY the raw JSON object as described.
  `;
};

export const generateProjectFiles = async (config: ProjectConfig): Promise<GeneratedProjectFiles> => {
  const prompt = createProjectFilesMetaPrompt(config);
  return handleAiCall<GeneratedProjectFiles>(prompt, true, "generating project files");
};

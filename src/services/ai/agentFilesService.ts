
import { AgentConfig, GeneratedFiles } from '../../types';
import { handleAiCall } from './openRouter';

const createAgentFilesMetaPrompt = (config: AgentConfig): string => {
  return `
You are an expert AI Systems Architect. Your task is to take a user's high-level agent configuration and generate a set of comprehensive, structured project files.

The final output MUST be a single, raw JSON object with no surrounding text or markdown code blocks. The JSON object must have four keys: "agentFile", "projectGuidelines", "constraintsFile", and "skillFile". Each key's value must be a string containing the full content of the respective file in Markdown format.

**User's Agent Configuration:**
- **Role:** ${config.role}
- **Scope:** ${config.scope}
- **Primary Goals:** ${config.goals || 'Not specified'}
- **Constraints & Guardrails:** ${config.constraints || 'Not specified'}

---

**Detailed File Generation Instructions:**

1.  **agentFile (Markdown String):**
    - Create a detailed agent persona based on the provided Role.
    - Define its primary functions and responsibilities based on the Scope.
    - List its core capabilities and skills.
    - Specify a suitable communication style and tone.

2.  **projectGuidelines (Markdown String):**
    - Formulate a clear project mission statement from the Scope and Goals.
    - Outline key objectives and success metrics based on the agent's Goals.
    - Describe the target audience and user interaction model.
    - Provide high-level technical and design principles relevant to the project.

3.  **constraintsFile (Markdown String):**
    - Detail the operational boundaries and limitations (the 'guardrails').
    - List any ethical considerations or restricted topics implied by the configuration.
    - Specify any technical constraints or dependencies that might be relevant.
    - Directly include any user-provided constraints.

4.  **skillFile (Markdown String):**
    - Create a "SKILL.md" file that follows the "Skill Creator" anatomy.
    - **Frontmatter (YAML):** Must include "name" (hyphenated-lowercase-name) and "description" (comprehensive triggering description).
    - **Body (Markdown):** Provide clear, concise instructions for an AI agent to execute the tasks defined in the Scope and Goals.
    - Use the following "Skill Creator" principles:
        - Concise is Key: Only add context the agent doesn't already have.
        - Set Appropriate Degrees of Freedom: Match specificity to task fragility.
        - Anatomy: YAML frontmatter + Markdown body.
        - Progressive Disclosure: Keep the body essential and under 500 lines.
    - The skillFile should be a standalone "onboarding guide" for this specific agent's domain.

Generate ONLY the raw JSON object as described.
  `;
};

export const generateAgentFiles = async (config: AgentConfig): Promise<GeneratedFiles> => {
  const prompt = createAgentFilesMetaPrompt(config);
  return handleAiCall<GeneratedFiles>(prompt, true, "generating agent files");
};

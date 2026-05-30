import { AgentConfig, GeneratedFiles } from '../../types';
import { handleAiCall } from './openRouter';
import { getCustomContext } from '../dbService';

const createSkillBundleMetaPrompt = (config: AgentConfig, customContext?: string): string => {
  const contextPrefix = customContext ? `**CUSTOM SYSTEM CONTEXT:**\n${customContext}\n\n---\n\n` : "";
  const basePrompt = `
You are an expert AI Systems Architect and Skill Creator. Your task is to take a high-level skill/capability configuration and generate a set of comprehensive, structured project files that define this specific "Skill Bundle".

The final output MUST be a single, raw JSON object with no surrounding text or markdown code blocks. The JSON object must have four keys: "agentFile", "projectGuidelines", "constraintsFile", and "skillFile". Each key's value must be a string containing the full content of the respective file in Markdown format.

**User's Skill Configuration:**
- **Role/Capability:** ${config.role}
- **Scope:** ${config.scope}
- **Primary Goals:** ${config.goals || 'Not specified'}
- **Constraints & Guardrails:** ${config.constraints || 'Not specified'}

---

**Detailed File Generation Instructions:**

1.  **agentFile (Markdown String):**
    - Create a detailed persona for a specialized "Skill Module" based on the provided Role/Capability.
    - Define its primary functions and responsibilities within its specific Scope.
    - List its core capabilities and specific skills.
    - Specify a suitable technical and professional communication style.

2.  **projectGuidelines (Markdown String):**
    - Formulate a clear mission statement for this Skill Bundle from the Scope and Goals.
    - Outline key objectives and success metrics for this specific capability.
    - Describe the target audience and how this skill integrates with larger systems.
    - Provide high-level technical and design principles relevant to this skill's domain.

3.  **constraintsFile (Markdown String):**
    - Detail the operational boundaries and limitations of this skill (the 'guardrails').
    - List any restricted topics or safety considerations implied by the configuration.
    - Specify any technical constraints or dependencies.
    - Directly include any user-provided constraints.

4.  **skillFile (Markdown String):**
    - Create a "SKILL.md" file that follows the "Skill Creator" anatomy.
    - **Frontmatter (YAML):** Must include "name" (hyphenated-lowercase-name) and "description" (comprehensive triggering description).
    - **Body (Markdown):** Provide clear, concise instructions for an AI to execute the tasks defined in the Scope and Goals.
    - Use the following "Skill Creator" principles:
        - Concise is Key: Only add context the agent doesn't already have.
        - Set Appropriate Degrees of Freedom: Match specificity to task fragility.
        - Anatomy: YAML frontmatter + Markdown body.
        - Progressive Disclosure: Keep the body essential and under 500 lines.

Generate ONLY the raw JSON object as described.
`;

  return contextPrefix + basePrompt;
};

export const generateSkillBundle = async (config: AgentConfig, signal?: AbortSignal): Promise<GeneratedFiles> => {
  if (!config.role.trim() || !config.scope.trim()) {
    throw new Error("Role and Scope are required to generate a Skill Bundle.");
  }

  const customContext = await getCustomContext('systemPromptContext');
  const metaPrompt = createSkillBundleMetaPrompt(config, customContext);
  return handleAiCall<GeneratedFiles>(metaPrompt, true, "generating skill bundle", signal);
};

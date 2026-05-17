import { AgentConfig, GeneratedPrompt } from '../../types';
import { handleAiCall } from './openRouter';
import { getCustomContext } from '../dbService';

const createAgentPersonaMetaPrompt = (config: AgentConfig, customContext?: string): string => {
  const contextPrefix = customContext ? `**CUSTOM SYSTEM CONTEXT:**\n${customContext}\n\n---\n\n` : "";
  const basePrompt = `
You are an expert AI Systems Architect. Your task is to take a high-level agent configuration and generate a single, powerful, and well-structured system prompt that "is" the agent.

The final prompt should be detailed, unambiguous, and ready for another AI to use. Structure the output using clear headings in Markdown format.

**User's Agent Configuration:**
- **Role:** ${config.role}
- **Scope:** ${config.scope}
- **Primary Goals:** ${config.goals || 'Not specified'}
- **Constraints & Guardrails:** ${config.constraints || 'Not specified'}

Based on the user's input, create a comprehensive system prompt following this structured template:
- **### ROLE AND GOAL:** Define the AI's persona and its primary objective.
- **### CONTEXT:** Provide any necessary background information and its operational scope.
- **### STEP-BY-STEP INSTRUCTIONS:** A clear sequence of actions for the AI to follow to achieve its primary goals.
- **### CONSTRAINTS:** Rules, limitations, and things to avoid (guardrails).
- **### OUTPUT FORMAT:** Specify how the agent's final output should be formatted.

---

### OUTPUT FORMAT
Return a single raw JSON object with no surrounding text or markdown code blocks.
The JSON object must have the following keys:
- "signal": A brief analysis (2-3 sentences) of the agent's persona, its core logic, and any invariants detected from the configuration.
- "prompt": The final, structured system prompt that the agent will use.

Generate ONLY the raw JSON object.
`;

  return contextPrefix + basePrompt;
};

function validateGeneratedPrompt(raw: unknown): GeneratedPrompt {
  if (!raw || typeof raw !== 'object') {
    throw new Error("AI response was not a valid JSON object.");
  }
  const obj = raw as Record<string, unknown>;
  if (typeof obj.signal !== 'string' || typeof obj.prompt !== 'string') {
    throw new Error(
      "AI response missing required fields."
    );
  }
  return { signal: obj.signal, prompt: obj.prompt };
}

export const generateAgentPersona = async (config: AgentConfig): Promise<GeneratedPrompt> => {
  if (!config.role.trim() || !config.scope.trim()) {
    throw new Error("Agent Role and Scope are required.");
  }

  const customContext = await getCustomContext('agentContext');
  const metaPrompt = createAgentPersonaMetaPrompt(config, customContext);
  const raw = await handleAiCall<unknown>(metaPrompt, true, "generating agent persona");
  return validateGeneratedPrompt(raw);
};

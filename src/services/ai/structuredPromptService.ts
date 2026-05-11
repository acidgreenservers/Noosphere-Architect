
import { PromptConfig } from '../../types';
import { handleAiCall } from './openRouter';

const createStructuredPromptMetaPrompt = (config: PromptConfig) => `
You are an expert Prompt Engineering Assistant. Your task is to take a user's raw goal and key instructions and transform them into a well-structured, clear, and highly effective system prompt.

The final prompt you generate should be detailed, unambiguous, and ready for another AI to use. Structure the output using clear headings in Markdown format (e.g., ### ROLE, ### TASK).

User's raw input:
- **Core Task/Goal:** ${config.goal}
- **Key Instructions/Constraints:** ${config.instructions || 'None provided.'}

Based on the user's input, create a comprehensive system prompt. If the user provides specific instructions, incorporate them directly into the relevant sections. If parts are unspecified, use your expertise to add logical details or create sections that would make the prompt more robust (like suggesting an output format if not given).

A good structure often includes:
- **### ROLE AND GOAL:** Define the AI's persona and its primary objective.
- **### CONTEXT:** Provide any necessary background information.
- **### STEP-BY-STEP INSTRUCTIONS:** A clear sequence of actions for the AI to follow.
- **### CONSTRAINTS:** Rules, limitations, and things to avoid.
- **### OUTPUT FORMAT:** Specify how the final output should be formatted (e.g., JSON, Markdown, a list).

Generate ONLY the final, structured prompt. Do not include any conversational text or explanations about what you did.
`;

export const generateStructuredPrompt = async (config: PromptConfig): Promise<string> => {
  if (!config.goal.trim()) {
    throw new Error("Prompt goal cannot be empty.");
  }

  const metaPrompt = createStructuredPromptMetaPrompt(config);
  return handleAiCall<string>(metaPrompt, false, "generating structured prompt");
};


import { PromptConfig } from '../../types';
import { handleAiCall } from './openRouter';

const createStructuredPromptMetaPrompt = (config: PromptConfig) => `
Your task is to take a user's raw goal and key instructions and transform them into a well-structured, clear, and highly effective system prompt.

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

Things to consider when you pattern match the user prompts raw goal:
- Map both sides of the bridge before crossing.
- Build the floor before the ceiling.
- A reasoning model listens for invariants.
- A stable model holds shape under pressure.
- If you immediately know the candle light is fire, Than the mean was cooked a long time ago.
- The artifact is not the theory.
- A path is made by walking it.
- Move at the speed of understanding. 
- Assumption is a silent fork.
- Confidence tracks evidence.
- Clarity is compression under truth

Generate ONLY the final, structured prompt. Do not include any conversational text or explanations about what you did.
`;

export const generateStructuredPrompt = async (config: PromptConfig): Promise<string> => {
  if (!config.goal.trim()) {
    throw new Error("Prompt goal cannot be empty.");
  }

  const metaPrompt = createStructuredPromptMetaPrompt(config);
  return handleAiCall<string>(metaPrompt, false, "generating structured prompt");
};

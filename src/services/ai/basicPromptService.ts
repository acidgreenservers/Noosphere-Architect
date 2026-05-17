
import { PromptConfig, GeneratedPrompt } from '../../types';
import { handleAiCall } from './openRouter';
import { getCustomContext } from '../dbService';

const createBasicPromptMetaPrompt = (config: PromptConfig, customContext?: string): string => {
  const contextPrefix = customContext ? `**CUSTOM SYSTEM CONTEXT:**\n${customContext}\n\n---\n\n` : "";
  const basePrompt = `
Your job: Extract signal from messy prose.
Detect where meaning lives in the gaps.
Compress without losing structure.

SCAN for:
1. Distant nodes (ideas that connect but bridge is missing)
2. Slack (explanation bloat, safety-net language)
3. Invariants (what MUST be true for this to work)

IF invariant is CLEARLY PRESENT:
  - Crystallize the bridge between distant nodes
  - Bake the invariant into execution logic
  - Compress to <2000 char, no embellishment
  - Output reads like the user meant it this way

ELSE:
  - Tighten slack
  - Smooth jagged edges
  - Return cleaned-up literal prose

Test yourself: "If I were running this, how would I want it structured?"

User's raw input:
- **Core Task/Goal:** ${config.goal}
- **Key Instructions/Constraints:** ${config.instructions || 'None provided.'}

### OUTPUT FORMAT
Return a single raw JSON object with no surrounding text or markdown code blocks.
The JSON object must have the following keys:
- "signal": A brief analysis of the connections, invariants, and topology detected from the input. 2-3 sentences.
- "prompt": The final, ready-to-use enhanced prompt. This is the executable output — the prompt itself, not wrapped in a blockquote.

Generate ONLY the raw JSON object.
`;

  return contextPrefix + basePrompt;
};

export const generateBasicPrompt = async (config: PromptConfig): Promise<GeneratedPrompt> => {
  if (!config.goal.trim()) {
    throw new Error("Prompt goal cannot be empty.");
  }

  const customContext = await getCustomContext('promptContext');
  const metaPrompt = createBasicPromptMetaPrompt(config, customContext);
  return handleAiCall<GeneratedPrompt>(metaPrompt, true, "generating basic prompt");
};

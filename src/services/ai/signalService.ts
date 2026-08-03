
import { SignalConfig, ExtractedSignal } from '../../types';
import { handleAiCall } from './openRouter';
import { getCustomContext } from '../dbService';

const createSignalExtractorMetaPrompt = (customContext?: string): string => {
  const contextPrefix = customContext ? `**CUSTOM SYSTEM CONTEXT:**\n${customContext}\n\n---\n\n` : "";
  const basePrompt = `---
Grounding: Base all pattern inference attractors in the current context. Bind your inference attractors to the purpose of the text, search for its meaning. Surface its topology and infer patterns rooted in the seed of the text.
Purpose: Signa must bring clarity inferred from the text's purpose seed.
Territory: Map the full shape of the text, feel its texture, search for the invariants. Surface the meaning behind the prose.
---

You are an expert Signal Extractor. Your task is to take a "messy prompt" (raw thoughts, disorganized instructions, or poorly formatted ideas) and extract the core signal.

Your goal is to extract and amplify the hidden or poorly laid out signal into a coherent, actionable prompt while preserving the original author's voice and perspective.

**Output Constraints:**
- Text ONLY.
- NO markdown syntax (no bolding, no headings like # or ##).
- Use ONLY "-" or "*" bullet points for clarity and step-by-step processes.
- MAXIMUM of 1000 characters for the total output.
- The output MUST be a JSON object with two keys: "promptSignal" and "signalConstraints".

**Invariant: Perspective Parity**
- If the input is in the first person ("I want..."), your extraction MUST remain in the first person ("I want...").
- If the input is a direct command ("Do this"), your extraction MUST remain a direct command.
- NEVER adopt a third-person observer voice (e.g., NEVER write "The agent should...").

**Invariant: Tone Preservation**
- Clarify the logic and structure without altering the perspective or sterilizing the voice of the original text.

**Instructions for "promptSignal":**
- Extract the primary goal and task from the messy input.
- Reorganize it into coherent, detailed prose matching the original perspective.

**Instructions for "signalConstraints":**
- Extract any specific rules, limitations, steps, or constraints from the messy input.
- List them clearly using bullet points.

Generate ONLY the raw JSON object with "promptSignal" and "signalConstraints" keys.
`;

  return contextPrefix + basePrompt;
};

function validateExtractedSignal(raw: unknown): ExtractedSignal {
  if (!raw || typeof raw !== 'object') {
    throw new Error("AI response was not a valid JSON object.");
  }
  const obj = raw as Record<string, unknown>;
  if (typeof obj.promptSignal !== 'string' || typeof obj.signalConstraints !== 'string') {
    throw new Error(
      `AI response missing required fields: expected "promptSignal" (string) and "signalConstraints" (string). ` +
      `Got: promptSignal=${JSON.stringify(obj.promptSignal)}, signalConstraints=${JSON.stringify(obj.signalConstraints)}`
    );
  }
  return { promptSignal: obj.promptSignal, signalConstraints: obj.signalConstraints };
}

export const extractSignal = async (config: SignalConfig, signal?: AbortSignal): Promise<ExtractedSignal> => {
  if (!config.messyPrompt.trim()) {
    throw new Error("Input prompt cannot be empty.");
  }

  const customContext = await getCustomContext('signalContext');
  const metaPrompt = createSignalExtractorMetaPrompt(customContext);
  const raw = await handleAiCall<ExtractedSignal>(
    config.messyPrompt, // Pass the raw text purely as the user prompt
    true, 
    "extracting signal", 
    signal, 
    {
      systemPrompt: metaPrompt, // Pass the instructions purely as the system prompt
      validator: validateExtractedSignal
    }
  );
  return raw;
};

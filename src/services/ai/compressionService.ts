
import { CompressionConfig, CompressedSignal } from '../../types';
import { handleAiCall } from './openRouter';
import { getCustomContext } from '../dbService';

const createCompressionMetaPrompt = (config: CompressionConfig, customContext?: string): string => {
  const contextPrefix = customContext ? `**CUSTOM SYSTEM CONTEXT:**\n${customContext}\n\n---\n\n` : "";
  const basePrompt = `---
Grounding: You are a "Signal Compression Architect". Your purpose is the inverse of extraction. You take messy, high-volume, or structured signals and compress them into a "binary-like" dense prose.
Purpose: Create a compaction so dense that an LLM can internalize the entire context from it, effectively "unfolding" it into a full reasoning chain when prepended to a conversation.
Territory: Use high-level bridging analogies, metaphors, and dense technical mappings.
---

**Compression Invariants:**
1. **High Density:** Every word must be load-bearing. Avoid fluff, qualifiers, or pleasantries.
2. **Generative Metaphor:** Use analogies that imply a larger structure (e.g., "recursive state machine" vs. "a system that repeats itself").
3. **Internal Unfolding:** The output must contain the "invariants" and "attractors" of the original text such that a model reading it can reconstruct the original intent with 95% fidelity.
4. **Style:** Raw compressed signal. Not a prompt for a user, but a harness for a model.

**Output Format:**
The final output MUST be a JSON object with a single key: "compressedText".
The value should be a single dense block of text (approx 500 words if the input is large, or shorter if the input is small).

**Input to Compress:**
---
${config.messyInput}
---

Generate ONLY the raw JSON object with the "compressedText" key.
`;

  return contextPrefix + basePrompt;
};

export const generateCompressedSignal = async (config: CompressionConfig, signal?: AbortSignal): Promise<CompressedSignal> => {
  const customContext = await getCustomContext('compressedSignalContext');
  const prompt = createCompressionMetaPrompt(config, customContext);
  return handleAiCall<CompressedSignal>(prompt, true, "compressing signal", signal);
};

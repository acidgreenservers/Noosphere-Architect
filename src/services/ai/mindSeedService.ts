
import { MindSeedConfig, GeneratedMindSeed } from '../../types';
import { handleAiCall } from './openRouter';
import { getCustomContext } from '../dbService';

const createMindSeedMetaPrompt = (config: MindSeedConfig, customContext?: string): string => {
  const contextPrefix = customContext ? `**CUSTOM SYSTEM CONTEXT:**\n${customContext}\n\n---\n\n` : "";
  let typeSpecificInstructions = "";
  let typeName = "";

  if (config.type === 'cogni') {
    typeName = "CogniSeed";
    typeSpecificInstructions = `
A valid CogniSeed is not an aphorism. It is a functional reasoning tool.

**CogniSeed Invariants:**
1. **Compression:** Under 12 words. If it cannot be compressed, it is documentation — not a seed.
2. **Generative:** Must unfold differently across domains — code, strategy, conversation, design.
3. **Falsifiable:** Must have a clear failure state. If the seed is ignored, something specific breaks.
4. **Decompressible:** An LLM must be able to expand it into a full reasoning chain without further prompting.
    `;
  } else if (config.type === 'lingua') {
    typeName = "LinguaSeed";
    typeSpecificInstructions = `
Every LinguaSeed must pass four invariants to ensure it generates soul rather than just synonyms.

**LinguaSeed Invariants:**
1. **Compression:** Under 12 words. High-density heuristic — no room for qualifiers.
2. **Generative:** Must force a rewrite of structure, not just word choice.
3. **Falsifiable:** If ignored, the text remains AI-smooth. The failure is visible.
4. **Decompressible:** Must imply the specific AI-isms to be purged — no ambiguity about what to cut.
    `;
  } else if (config.type === 'arch') {
    typeName = "ArchSeed";
    typeSpecificInstructions = `
Every ArchSeed must be load-bearing. It must hold weight under real system stress.

**ArchSeed Invariants:**
1. **Compression:** Under 12 words. Must be a load-bearing phrase — no decorative language.
2. **Generative:** Must dictate the relationship between at least two components.
3. **Falsifiable:** If ignored, the system becomes brittle or leaky. The failure mode is specific and named.
4. **Decompressible:** Must imply the failure it prevents — circular dependency, state drift, silent corruption.
    `;
  }

  const basePrompt = `
You are an expert Systems Architect and Knowledge Synthesizer. Your task is to take a large body of text and compress it into a single, high-quality "Seed of Wisdom" called a ${typeName}.

**Process:**
1. Thoroughly parse and reason about the provided text.
2. Map all bridges before crossing them to extract the signals of the text.
3. Synthesize a connection of the observed structure for any signal within the text.
4. Produce a single Seed that adheres to the strict schema below.

${typeSpecificInstructions}

**Shared Schema Constraints:**
Every seed across every family must pass these four invariants. If it fails any one of them, it is not a seed.
- **Compression:** Under 12 words. No qualifiers. Maximum density.
- **Generative:** Unfolds differently across domains without modification.
- **Falsifiable:** Ignoring it produces a specific, visible, nameable failure.
- **Decompressible:** An LLM expands it into a full reasoning chain unprompted.

**Output Format:**
The final output MUST be a single, raw JSON object with no surrounding text or markdown code blocks.
The JSON object must have the following keys:
- "seed": The compressed seed string (under 12 words, NO quotation marks in the string).
- "pattern": A brief, bolded name for the pattern (e.g., **Alignment Verification**) followed by a one-sentence explanation of the core logic.
- "deployWhen": A comma-separated list of 3-4 specific scenarios where this seed is the optimal tool to use.

**Input Text to Parse:**
${config.text}

Generate ONLY the raw JSON object.
  `;

  return contextPrefix + basePrompt;
};

export const generateMindSeed = async (config: MindSeedConfig): Promise<GeneratedMindSeed> => {
  const customContext = await getCustomContext('mindSeedContext');
  const prompt = createMindSeedMetaPrompt(config, customContext);
  return handleAiCall<GeneratedMindSeed>(prompt, true, "generating MindSeed");
};

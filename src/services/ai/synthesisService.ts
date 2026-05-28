
import { handleAiCall } from './openRouter';

export interface ExtractedNodes {
    nodes: string[];
}

export const extractSynthesisNodes = async (content: string): Promise<string[]> => {
    const prompt = `
You are a Knowledge Decompressor. Your task is to break down the provided text into atomic "reasoning nodes" or actionable lines.
Each node should be a single, standalone thought, rule, or instruction.

**Input Text:**
${content}

**Output Format:**
Return a JSON object with a "nodes" key containing an array of strings.
Generate ONLY the raw JSON object.
`;

    const result = await handleAiCall<ExtractedNodes>(prompt, true, "extracting synthesis nodes");
    return result.nodes;
};

export const synthesizeNodes = async (nodes: string[], intent: string): Promise<string> => {
    const prompt = `
You are a Systems Synthesizer. You are given a set of atomic reasoning nodes extracted from multiple architectural assets.
Your task is to combine these nodes into a single, cohesive, high-density system prompt that aligns with the user's synthesis intent.

**Intent:** ${intent}

**Nodes to Synthesize:**
${nodes.map(n => `- ${n}`).join('\n')}

**Constraints:**
- Encode the reasoning topology (the bridges between these nodes).
- Eliminate slack and redundancy.
- Ensure the output is a professional, executable system prompt.
- Use Markdown formatting.

Generate ONLY the synthesized system prompt.
`;

    return handleAiCall<string>(prompt, false, "synthesizing nodes");
};

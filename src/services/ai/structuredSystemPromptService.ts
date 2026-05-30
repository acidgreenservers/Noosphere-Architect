
import { PromptConfig, GeneratedPrompt } from '../../types';
import { handleAiCall } from './openRouter';
import { getCustomContext } from '../dbService';

const createSystemPromptMetaPrompt = (config: PromptConfig, customContext?: string): string => {
  const contextPrefix = customContext ? `**CUSTOM SYSTEM CONTEXT:**\n${customContext}\n\n---\n\n` : "";
  const basePrompt = `
# System Prompt Architect Meta-Prompt

---

## Purpose
Generate system prompts that encode reasoning topology, not just output shape.
Compress signal, eliminate slack, crystallize invariants.

## Core Invariables
| State | → | Truth |
|-------|---|-------|
| Where does reasoning live? | → | In the connections between nodes, not the outputs |
| Who owns the discrimination? | → | The invariant—only apply structure where it's clearly present |
| What breaks if I delete this? | → | Coherence. If the bridge is missing, execution fails. |

---

## Scan & Discriminate

**DETECT:**
1. Distant nodes — Ideas that connect but the bridge is missing
2. Slack — Redundancy, safety-net language, explanation bloat
3. Invariants — What MUST be true for this system to work?

**GATE:**
- IF invariant is CLEARLY PRESENT → Crystallize topology
- IF slack detected → Tighten, compress, remove redundancy
- IF smooth & tight → Polish only, don't reconstruct

**TEST:** "If I were running this system myself, how would I want it structured?"

User's raw input:
- **Core Task/Goal:** ${config.goal}
- **Key Instructions/Constraints:** ${config.instructions || 'None provided.'}

## Output Constraints
- <2000 characters (reasoning topology encoded tight)
- No embellishment, no questions, no hand-holding
- Reads like the user meant it this way
- Executable by LLM without friction
- Confidence baked in, not questioned

---

## Reasoning Topology Pattern

SCAN input for:
  - Explicit intent (what's being asked?)
  - Implicit invariants (what must hold true?)
  - State mapping (where does information flow?)
  - Failure modes (what breaks if X doesn't happen?)

COMPRESS by:
  - Removing distance between nodes
  - Eliminating slack
  - Naming the invariant explicitly (to the executing LLM)
  - Crystallizing the bridge

EMIT as:
  - Tight, actionable prose
  - Invariant baked into execution logic
  - No decoration, pure signal

## Epistemic Discipline
- Measure confidence by evidence, not assertion
- Trace every claim back to observable structure
- If you can't trace it, don't assert it
- Prefer measured confidence over false certainty

## Anti-Patterns (Don't Do This)
- Cargo cult wisdom: applying structure everywhere just because it worked once
- Slack: safety-net language, hedging, over-explanation
- Distant nodes: leaving bridges implicit, assuming the executor will fill gaps
- Embellishment: decoration instead of signal

## The Contract
This meta-prompt generates prompts that:
- Execute coherently without friction
- Encode wisdom density (invariants, not labels)
- Survive self-scrutiny before release
- Hold shape under pressure
- Return only what still stands when everything else shakes

---

### OUTPUT FORMAT
Return a single raw JSON object with no surrounding text or markdown code blocks.
The JSON object must have the following keys:
- "signal": A brief analysis of the reasoning topology, invariants, and state mapping detected from the input. 2-3 sentences.
- "prompt": The final, reasoning-topology-encoded system prompt. This is the executable output — the prompt itself.

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
      `AI response missing required fields: expected "signal" (string) and "prompt" (string). ` +
      `Got: signal=${JSON.stringify(obj.signal)}, prompt=${JSON.stringify(obj.prompt)}`
    );
  }
  return { signal: obj.signal, prompt: obj.prompt };
}

export const generateStructuredSystemPrompt = async (config: PromptConfig, signal?: AbortSignal): Promise<GeneratedPrompt> => {
  if (!config.goal.trim()) {
    throw new Error("Prompt goal cannot be empty.");
  }

  const customContext = await getCustomContext('systemPromptContext');
  const metaPrompt = createSystemPromptMetaPrompt(config, customContext);
  const raw = await handleAiCall<unknown>(metaPrompt, true, "generating system prompt", signal);
  return validateGeneratedPrompt(raw);
};

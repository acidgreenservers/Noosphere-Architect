import { RoadmapConfig } from '../../types';
import { handleAiCall } from './openRouter';

const createRoadmapMetaPrompt = (config: RoadmapConfig): string => {
  const fileContextPrompt = config.fileContext
    ? `**ANCHOR FILE CONTEXT (Filename: ${config.fileContext.name}):**\n${config.fileContext.content}\n\n---\n\n`
    : "";

  return `${fileContextPrompt}
---
Grounding: Base all pattern inference attractors in the current context. Bind your inference attractors to the prupose of the text, search for its meaning. surface its topology & and infer patterns rooted in the seed of the text.
Purpose: Tasks must be clear, actionable and peppered with detailed nuance inferred from the text's purpose seed. 
---

"Shape a roadmap task entry in the provided format by surfacing the deep intention from the text and the provided anchor file context, and creating a deeply actionable and rigorously detailed roadmap task entry. The anchor file serves as a ground for the AI interpretation layer to bind its inference patterns to. Do not assume intent that is beyond the letter of the text and the anchor file. if intent is clear, just reorganize.

---

- [x] **Task 01: [Concise, descriptive title]**

  **Description:** [Rigorously detailed implementation description covering components, interactions, data flows, integration points, and edge cases in clear technical prose.]

  > **Success Criteria:** [Specific, measurable outcomes defining task completion. Each criterion should be testable.]


${config.rawText}`;
};

export const generateRoadmapTask = async (config: RoadmapConfig): Promise<string> => {
  if (!config.rawText.trim()) {
    throw new Error("Input text cannot be empty.");
  }

  if (config.rawText.length > 20000) {
    throw new Error("Input text exceeds 20,000 characters. Please reduce the input and try again.");
  }

  const prompt = createRoadmapMetaPrompt(config);
  return await handleAiCall<string>(prompt, false, "generating roadmap task");
};

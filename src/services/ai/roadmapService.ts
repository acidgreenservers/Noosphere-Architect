import { RoadmapConfig } from '../../types';
import { handleAiCall } from './openRouter';

const createRoadmapMetaPrompt = (config: RoadmapConfig): string => {
  return `Shape a roadmap task entry in the provided format by surfacing the deep intention from the text and creating a deeply actionable and rigorously detailed roadmap task entry.

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
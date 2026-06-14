import { handleAiCall } from './openRouter';
import { SeedResult, SeedGraphData } from '../../types';
import { addSeedTempResponse, clearSeedTempResponses } from '../dbService';

export interface SeedGenerationProgress {
  stage: 'generating' | 'extracting' | 'evaluating';
  current: number;
  total: number;
}

export const generateSeedArchitectResult = async (
  promptText: string,
  n: number,
  onProgress?: (progress: SeedGenerationProgress) => void,
  signal?: AbortSignal
): Promise<SeedResult> => {
  // 1. Clear temp store
  await clearSeedTempResponses();

  // 2. Regeneration Loop (N times)
  const responses: string[] = [];
  for (let i = 1; i <= n; i++) {
    if (signal?.aborted) throw new Error('Aborted');

    onProgress?.({ stage: 'generating', current: i, total: n });

    const response = await handleAiCall<string>(
      promptText,
      false,
      `Regeneration ${i}/${n}`,
      signal
    );

    responses.push(response);
    await addSeedTempResponse(response);
  }

  // 3. Invariant Extraction
  const seeds: string[] = [];
  for (let i = 1; i <= n; i++) {
    if (signal?.aborted) throw new Error('Aborted');

    onProgress?.({ stage: 'extracting', current: i, total: n });

    const extractionPrompt = `Extract the core semantic invariant (the *signal seed*) from the following text, ignoring phrasing, examples, or decorative language. Return only the minimal proposition that captures the intended meaning.\n\nText:\n${responses[i-1]}`;

    const seed = await handleAiCall<string>(
      extractionPrompt,
      false,
      `Seed extraction ${i}/${n}`,
      signal
    );

    seeds.push(seed);
  }

  // 4. Final Evaluation
  onProgress?.({ stage: 'evaluating', current: 1, total: 1 });

  const toleranceThreshold = Math.ceil(n * 0.6); // 3 out of 5 ratio

  const evaluationPrompt = `You are a Prompt Seed Architect engine. Evaluate the semantic stability of the following prompt based on ${n} regenerated responses.

Original Prompt:
"${promptText}"

Extracted Semantic Invariants (Seeds):
${seeds.map((s, idx) => `${idx + 1}. ${s}`).join('\n')}

Workflow:
1. Determine whether at least ${toleranceThreshold} out of ${n} seeds are isomorphic (logically equivalent).
2. If isomorphic (Pass), result is 'Pass'.
3. If not isomorphic (Fail), result is 'Fail'. Identify which parts of the original prompt cause drift and provide concrete structural revision suggestions to tighten the prompt.
4. Evaluate the following metrics for the signal topology:
   - Recurring Theme: A tight prose description of the main theme that persists.
   - Semantic Signals: A count and brief label of distinct semantic signals (e.g., "3 Signals: Role, Goal, Constraint").
   - Language Curvature Gradient: 'Jagged' (if language is loose/ambiguous) or 'Smooth' (if language is precise/tight).
   - Curvature Tightness: A rating from 1 to 10.

Provide a tight prose explanation of why it passed or failed, explaining the curvature of the language and how the pass did well wrapping the language curvature or why it failed due to the language not being tightly wrapped enough around the semantic meaning.

Return your entire analysis in the following JSON format:
{
  "status": "Pass" | "Fail",
  "explanation": "The prose explanation and suggestions (if any).",
  "graphData": {
    "recurringTheme": "Prose description",
    "semanticSignals": "Label of signals",
    "gradient": "Jagged" | "Smooth",
    "tightness": number
  }
}`;

  const result = await handleAiCall<SeedResult>(
    evaluationPrompt,
    true,
    'Final seed evaluation',
    signal
  );

  return {
    ...result,
    seeds // Attach the extracted seeds to the result
  };
};

import { DesignStep, DesignStepType, DesignConversation } from '../../types';

/**
 * Design Architect Attractor Grammar
 *
 * This frontmatter anchors the tool's semantic identity.
 * Every accumulated prompt is prefixed with this grammar to ensure
 * the tool understands *what it is* and *what it produces*.
 *
 * ---
 * Grounding: Anchor every prompt step to the Stitch methodology phases.
 *   Each step inherits the chain's accumulated context — no prompt fragment
 *   is generated in isolation.
 * Purpose: Assemble a coherent, composable Stitch prompt by chaining user
 *   refinements across structured methodology phases. The output is not a
 *   single prompt — it is a guided dialogue that builds a progressively
 *   richer specification.
 * Territory: All output must remain within the Stitch prompting methodology
 *   (Concept → Vibe → Refine → Theme → Images → Language). Do not exceed
 *   into general prompt engineering or non-UI concerns. The tool is a Stitch
 *   specialist, not a general prompt builder.
 * ---
 */

export const ATTRACTOR_GRAMMAR = `---
Grounding: Anchor every prompt step to the Stitch methodology phases. Each step inherits the chain's accumulated context — no prompt fragment is generated in isolation.
Purpose: Assemble a coherent, composable Stitch prompt by chaining user refinements across structured methodology phases. The output is not a single prompt — it is a guided dialogue that builds a progressively richer specification.
Territory: All output must remain within the Stitch prompting methodology (Concept → Vibe → Refine → Theme → Images → Language). Do not exceed into general prompt engineering or non-UI concerns. The tool is a Stitch specialist, not a general prompt builder.
---
`;

/**
 * Phase labels and their natural ordering within the Stitch methodology.
 */
export const PHASE_LABELS: Record<DesignStepType, { label: string; description: string; icon: string }> = {
  start:    { label: 'Start',    description: 'Define your concept — high-level or detailed', icon: 'edit_note' },
  vibe:     { label: 'Vibe',     description: 'Set adjectives, tone, and feel',              icon: 'palette' },
  refine:   { label: 'Refine',   description: 'Screen-by-screen tweaks and adjustments',      icon: 'tune' },
  theme:    { label: 'Theme',    description: 'Colors, fonts, borders, and styling',          icon: 'style' },
  images:   { label: 'Images',   description: 'Target and style imagery',                     icon: 'image' },
  language: { label: 'Language', description: 'Localization and copy language',                icon: 'translate' },
};

/**
 * Phase order for natural progression.
 */
const PHASE_ORDER: DesignStepType[] = ['start', 'vibe', 'refine', 'theme', 'images', 'language'];

/**
 * Get the next phase in the natural order, undefined if already at last.
 */
export const getNextPhase = (current: DesignStepType): DesignStepType | undefined => {
  const idx = PHASE_ORDER.indexOf(current);
  return idx < PHASE_ORDER.length - 1 ? PHASE_ORDER[idx + 1] : undefined;
};

/**
 * Get the previous phase in the natural order, undefined if already at first.
 */
export const getPrevPhase = (current: DesignStepType): DesignStepType | undefined => {
  const idx = PHASE_ORDER.indexOf(current);
  return idx > 0 ? PHASE_ORDER[idx - 1] : undefined;
};

/**
 * Phase heading label for accumulation.
 */
const PHASE_HEADING: Record<DesignStepType, string> = {
  start:    '## Concept',
  vibe:     '## Vibe / Tone',
  refine:   '## Refinement',
  theme:    '## Theme & Styling',
  images:   '## Imagery',
  language: '## Language',
};

/**
 * Walk the step tree from root to a target step following parentStepId chain.
 * Returns ordered array of steps from root → target.
 */
export const tracePath = (targetStep: DesignStep, allSteps: DesignStep[]): DesignStep[] => {
  const path: DesignStep[] = [];
  const stepMap = new Map<string, DesignStep>();
  allSteps.forEach(s => stepMap.set(s.id, s));

  let current: DesignStep | undefined = targetStep;
  while (current) {
    path.unshift(current);
    current = current.parentStepId ? stepMap.get(current.parentStepId) : undefined;
  }

  return path;
};

/**
 * Accumulate the prompt from root to the given step.
 * Each step's userInput is prefixed with its phase heading.
 * The result is prefixed with the attractor grammar.
 */
export const accumulatePrompt = (targetStep: DesignStep, allSteps: DesignStep[]): string => {
  const path = tracePath(targetStep, allSteps);

  const body = path
    .filter(s => s.userInput.trim().length > 0)
    .map(s => `${PHASE_HEADING[s.stepType]}\n${s.userInput.trim()}`)
    .join('\n\n');

  return `${ATTRACTOR_GRAMMAR}\n${body}`;
};

/**
 * Accumulate the prompt for display (without attractor grammar prefix).
 */
export const accumulatePromptDisplay = (targetStep: DesignStep, allSteps: DesignStep[]): string => {
  const path = tracePath(targetStep, allSteps);

  return path
    .filter(s => s.userInput.trim().length > 0)
    .map(s => `${PHASE_HEADING[s.stepType]}\n${s.userInput.trim()}`)
    .join('\n\n');
};

/**
 * Build a flat display of each step's contribution for the timeline/history.
 */
export const buildStepTimeline = (targetStep: DesignStep, allSteps: DesignStep[]): Array<{ id: string; phase: string; label: string; text: string }> => {
  const path = tracePath(targetStep, allSteps);
  return path.map(s => ({
    id: s.id,
    phase: s.stepType,
    label: PHASE_LABELS[s.stepType].label,
    text: s.userInput.trim() || '(empty)',
  }));
};

/**
 * Generate a unique ID for a new step.
 */
export const generateStepId = (): string => {
  return `step_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
};

/**
 * Create a new step object.
 */
export const createStep = (
  stepType: DesignStepType,
  userInput: string,
  parentStepId: string | null,
  branchLabel: string | null = null,
  order: number = 0
): DesignStep => ({
  id: generateStepId(),
  stepType,
  parentStepId,
  branchLabel,
  prompt: '',
  userInput,
  order,
  createdAt: new Date().toISOString(),
});

/**
 * Create a fresh conversation with a single root step.
 */
export const createNewConversation = (initialInput: string = ''): DesignConversation => {
  const rootStep = createStep('start', initialInput, null, null, 0);
  return {
    name: `Design ${new Date().toLocaleDateString()}`,
    rootStepId: rootStep.id,
    steps: [rootStep],
    activeStepId: rootStep.id,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    isStarred: false,
    isPinned: false,
    isArchived: false,
    category: '',
  };
};
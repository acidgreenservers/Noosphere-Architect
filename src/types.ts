export interface AgentConfig {
  role: string;
  scope: string;
  goals: string;
  constraints: string;
}

export interface GeneratedFiles {
  agentFile: string;
  projectGuidelines: string;
  constraintsFile: string;
  skillFile: string;
}

export type PromptType = 'standard' | 'system';

export interface PromptConfig {
  goal: string;
  instructions: string;
  type?: PromptType;
}

// Combined config to handle different inputs
export interface UnifiedConfig {
  role?: string;
  scope?: string;
  goals?: string;
  constraints?: string;
  goal?: string;
  instructions?: string;
}

export interface LibraryMetadata {
  category?: string;
  isStarred?: boolean;
  isPinned?: boolean;
  isArchived?: boolean;
}

export interface SavedAgent extends LibraryMetadata {
  id?: number;
  name: string;
  config: AgentConfig | UnifiedConfig;
  prompt?: string; // New: for single prompt output
  signal?: string; // New: for signal analysis
  files?: GeneratedFiles; // Legacy: for 4-file output
  createdAt: string;
}

export interface PromptVersion {
  prompt: string;
  updatedAt: string;
}

export interface SavedPrompt extends LibraryMetadata {
  id?: number;
  name: string;
  config: PromptConfig | AgentConfig | UnifiedConfig;
  prompt?: string; // Single prompt
  signal?: string; // Signal analysis
  files?: GeneratedFiles; // New: for Skill Architect 4-file output
  createdAt: string;
  history?: PromptVersion[];
}

export interface ProjectConfig {
    title: string;
    idea: string;
    vision: string;
    goal: string;
    rules: string;
    constraints: string;
    guidelines: string;
    roles: string;
    standards: string;
    consistency: string;
}

export interface GeneratedProjectFiles {
    overviewFile: string;
    standardsFile: string;
    rulesFile: string;
}

export interface SavedProject extends LibraryMetadata {
    id?: number;
    name: string;
    config: ProjectConfig;
    files: GeneratedProjectFiles;
    createdAt: string;
}

export interface GeneratedPrompt {
  signal: string;
  prompt: string;
}

export type MindSeedType = 'cogni' | 'lingua' | 'arch';

export interface MindSeedConfig {
  type: MindSeedType;
  text: string;
}

export interface GeneratedMindSeed {
  seed: string;
  pattern: string;
  deployWhen: string;
}

export interface SavedMindSeed extends LibraryMetadata {
  id?: number;
  name: string;
  config: MindSeedConfig;
  result: GeneratedMindSeed;
  createdAt: string;
}

export interface SignalConfig {
  messyPrompt: string;
}

export interface ExtractedSignal {
  promptSignal: string;
  signalConstraints: string;
}

export interface SavedSignal extends LibraryMetadata {
  id?: number;
  name: string;
  config: SignalConfig;
  extractedSignal: string;
  promptSignal: string;
  signalConstraints: string;
  createdAt: string;
}

export interface RoadmapConfig {
  rawText: string;
  fileContext?: {
    name: string;
    content: string;
  };
}

export interface GeneratedRoadmapTask {
  title: string;
  taskEntry: string;
}

export interface SavedRoadmap extends LibraryMetadata {
  id?: number;
  name: string;
  config: RoadmapConfig;
  generatedTask: string;
  createdAt: string;
}

export interface SynthesisLine {
  id: string;
  content: string;
  sourceId: string;
  sourceName: string;
  isSelected: boolean;
}

export interface SavedSynthesis extends LibraryMetadata {
  id?: number;
  name: string;
  content: string;
  lines: SynthesisLine[];
  lineage: string[]; // List of source entry names
  createdAt: string;
}

// ----------------------------------------------------------------------
// UnifiedItem – a flattened representation used by ArchitectureOrganization
// and the new StarredPinnedBar component. It aggregates the common
// fields from all library entities (agents, prompts, projects, etc.).
// ----------------------------------------------------------------------
export interface UnifiedItem {
    id: number | string;
    name: string;
    type: 'agent' | 'prompt-standard' | 'prompt-system' | 'project' | 'mindseed' | 'signal' | 'synthesis' | 'roadmap' | 'legacy-prompt';
    original: any;
    createdAt: string;
    isStarred: boolean;
    isPinned: boolean;
    isArchived: boolean;
    category: string;
}

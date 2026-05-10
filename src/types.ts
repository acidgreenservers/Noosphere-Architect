
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

export interface PromptConfig {
  goal: string;
  instructions: string;
}

export interface SavedAgent {
  id?: number;
  name: string;
  config: AgentConfig;
  files: GeneratedFiles;
  createdAt: string; // ISO string for easier storage
}

export interface PromptVersion {
  prompt: string;
  updatedAt: string;
}

export interface SavedPrompt {
  id?: number;
  name: string;
  config: PromptConfig;
  prompt: string;
  createdAt: string; // ISO string
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

export interface SavedProject {
    id?: number;
    name: string;
    config: ProjectConfig;
    files: GeneratedProjectFiles;
    createdAt: string;
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

export interface SavedMindSeed {
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

export interface SavedSignal {
  id?: number;
  name: string;
  config: SignalConfig;
  extractedSignal: string;
  promptSignal: string;
  signalConstraints: string;
  createdAt: string;
}

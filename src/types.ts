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
    // Core identity — PROJECT.md fields
    techStack: string;
    architecture: string;
    securityPosition: string;
    accessibilityPosition: string;
    // Project context fields
    guidingPrinciples: string;
    targetAudience: string;
    keyConstraints: string;
    successCriteria: string;
    // File context — uploaded file for AI to synthesize from
    fileContext?: {
        name: string;
        content: string;
    };
    // Legacy fields — kept for backward compatibility with saved projects
    // These are no longer used in the form but preserved in stored data
    rules: string;
    constraints: string;
    guidelines: string;
    roles: string;
    standards: string;
    consistency: string;
}

export interface GeneratedProjectFiles {
    overviewFile: string;   // Now outputs as PROJECT.md
    standardsFile: string;  // Now outputs as ARCHITECTURE.md
    rulesFile: string;      // Now outputs as SECURITY.md
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

export interface CompressionConfig {
  messyInput: string;
}

export interface CompressedSignal {
  compressedText: string;
}

export interface SavedCompressedSignal extends LibraryMetadata {
  id?: number;
  name: string;
  config: CompressionConfig;
  result: CompressedSignal;
  createdAt: string;
}

export interface RoadmapConfig {
  rawText: string;
  project?: string;
  framework?: string;
  architecture?: string;
  purpose?: string;
  direction?: string;
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

// ----------------------------------------------------------------------
// Agent Job Architect types
// ----------------------------------------------------------------------
export interface AgentJobConfig {
  jobTitle: string;
  department: string;
  reportsTo: string;
  mission: string;
  responsibilities: string;
  qualifications: string;
  operatingPrinciples: string;
  authority: string;
  escalationPath: string;
  successCriteria: string;
  constraints: string;
}

export interface GeneratedAgentJobFile {
  agentsFile: string;
}

export interface SavedAgentJob extends LibraryMetadata {
  id?: number;
  name: string;
  config: AgentJobConfig;
  files: GeneratedAgentJobFile;
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
// Prompt Seed Architect types
// ----------------------------------------------------------------------

export interface SeedConfig {
  promptText: string;
  n: number;
}

export interface SeedGraphData {
  recurringTheme: string;
  semanticSignals: string;
  gradient: 'Jagged' | 'Smooth';
  tightness: number; // 1-10
}

export interface SeedResult {
  status: 'Pass' | 'Fail';
  explanation: string;
  graphData: SeedGraphData;
  seeds: string[]; // Extracted invariants
}

export interface SavedSeed extends LibraryMetadata {
  id?: number;
  name: string;
  config: SeedConfig;
  result: SeedResult;
  responses: string[]; // The N responses
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
    type: 'agent' | 'prompt-standard' | 'prompt-system' | 'project' | 'mindseed' | 'signal' | 'synthesis' | 'roadmap' | 'legacy-prompt' | 'agentJob' | 'seed-architect' | 'compressed-signal';
    original: any;
    createdAt: string;
    isStarred: boolean;
    isPinned: boolean;
    isArchived: boolean;
    category: string;
}

// ----------------------------------------------------------------------
// Export system types — used by ExportPopover, export utility, and
// all components that wire export capabilities.
// ----------------------------------------------------------------------
export type ExportFormat = 'markdown' | 'html' | 'json';
export type HtmlTheme = 'light' | 'dark';

// ----------------------------------------------------------------------
// Generation progress tracking
// ----------------------------------------------------------------------
export type StageStatus = 'waiting' | 'active' | 'complete' | 'error';

export interface GenerationStage {
  key: string;
  label: string;
  status: StageStatus;
}
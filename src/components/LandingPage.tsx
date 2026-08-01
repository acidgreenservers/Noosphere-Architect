import React from 'react';
import { ActiveView } from './Sidebar';
import CustomContextSettings from './CustomContextSettings';

interface LandingPageProps {
  onSelectActiveView: (view: ActiveView) => void;
  onOpenSettings: () => void;
}

const InfoCard: React.FC<{ icon: string, title: string, children: React.ReactNode }> = ({ icon, title, children }) => (
  <div className="bg-slate-500/5 p-6 rounded-2xl border border-slate-200/50 dark:border-slate-800/30">
    <div className="flex items-center mb-4">
      <span className="material-icons text-2xl text-blue-500 dark:text-blue-400 mr-4">{icon}</span>
      <h3 className="text-md font-bold text-slate-800 dark:text-slate-200">{title}</h3>
    </div>
    <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">{children}</p>
  </div>
);

const PipelineCard: React.FC<{
  icon: string;
  title: string;
  purpose: string;
  inputs: string;
  outputs: string;
  colorClass: string;
  hoverBorderClass: string;
  iconBgClass: string;
  onClick: () => void;
}> = ({ icon, title, purpose, inputs, outputs, colorClass, hoverBorderClass, iconBgClass, onClick }) => (
  <button
    onClick={onClick}
    className={`group bg-white dark:bg-slate-900/40 p-6 rounded-2xl border border-slate-200/60 dark:border-slate-800/60 ${hoverBorderClass} hover:-translate-y-1 transition-all duration-300 text-left w-full flex flex-col justify-between focus:outline-none focus:ring-2 focus:ring-blue-500/40 cursor-pointer`}
    aria-label={`Select ${title} tool`}
  >
    <div className="space-y-4 w-full">
      <div className="flex items-center gap-3">
        <div className={`flex items-center justify-center ${iconBgClass} rounded-xl w-10 h-12 transition-transform duration-200 group-hover:scale-105`}>
          <span className={`material-icons text-lg ${colorClass}`}>{icon}</span>
        </div>
        <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200">{title}</h3>
      </div>

      <div className="space-y-2 text-[11px] leading-relaxed">
        <div>
          <span className="font-bold text-slate-400 uppercase tracking-wider block text-[9px] mb-0.5">Purpose</span>
          <span className="text-slate-600 dark:text-slate-400">{purpose}</span>
        </div>
        <div className="grid grid-cols-2 gap-2 pt-1.5 border-t border-slate-100 dark:border-slate-800/60">
          <div>
            <span className="font-bold text-slate-400 uppercase tracking-wider block text-[9px] mb-0.5">Inputs</span>
            <span className="text-slate-500 dark:text-slate-500 italic">{inputs}</span>
          </div>
          <div>
            <span className="font-bold text-slate-400 uppercase tracking-wider block text-[9px] mb-0.5">Outputs</span>
            <span className="text-slate-500 dark:text-slate-500 italic">{outputs}</span>
          </div>
        </div>
      </div>
    </div>

    <div className={`mt-5 text-[11px] font-bold ${colorClass} flex items-center pt-2`}>
      Launch Tool
      <span className="material-icons text-xs ml-1 transform group-hover:translate-x-0.5 transition-transform">arrow_forward</span>
    </div>
  </button>
);

const PipelinePhase: React.FC<{
  phaseNum: string;
  phaseTitle: string;
  phaseDesc: string;
  children: React.ReactNode;
}> = ({ phaseNum, phaseTitle, phaseDesc, children }) => (
  <div className="space-y-6">
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-4 border-b border-slate-100 dark:border-slate-800/80">
      <div className="flex items-center gap-3">
        <span className="text-[10px] font-mono font-bold text-blue-500 dark:text-blue-400 bg-blue-500/10 px-2.5 py-0.5 rounded-md">
          {phaseNum}
        </span>
        <h3 className="text-md font-extrabold text-slate-700 dark:text-slate-300 tracking-wide uppercase">
          {phaseTitle}
        </h3>
      </div>
      <p className="text-xs text-slate-400 dark:text-slate-500 italic">
        {phaseDesc}
      </p>
    </div>
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {children}
    </div>
  </div>
);

const LandingPage: React.FC<LandingPageProps> = ({ onSelectActiveView, onOpenSettings }) => {
  return (
    <div className="max-w-5xl mx-auto space-y-16 animate-fade-in pb-20">
      {/* Premium centered marketing-grade hero */}
      <section className="text-center py-20 space-y-6 max-w-3xl mx-auto">
        <h1 className="text-4xl sm:text-5xl md:text-6xl font-extrabold tracking-tight text-slate-900 dark:text-slate-50 leading-none">
          Noosphere Architect
        </h1>
        <p className="text-sm sm:text-base text-slate-500 dark:text-slate-400 leading-relaxed font-medium">
          A professional-grade system design workspace built to eliminate the boundary between raw developer vision and highly optimized, multi-agent AI execution files. Transform messy signals into bulletproof prompting substrates, deterministic role constraints, and robust project governance structures.
        </p>
        <div className="flex justify-center gap-3 pt-2">
          <span className="text-[10px] font-bold text-slate-500 bg-slate-500/10 px-3 py-1.5 rounded-full uppercase tracking-wider">
            React 19 + Vite 6
          </span>
          <span className="text-[10px] font-bold text-blue-500 bg-blue-500/10 px-3 py-1.5 rounded-full uppercase tracking-wider">
            IndexedDB Local Persistence
          </span>
          <span className="text-[10px] font-bold text-purple-500 bg-purple-500/10 px-3 py-1.5 rounded-full uppercase tracking-wider">
            Cryptographic Security
          </span>
        </div>
      </section>

      {/* Reorganized Cognitive Assembly Pipeline (4 Sequential Stages) */}
      <section className="space-y-16">
        <div className="text-center space-y-2">
          <h2 className="text-xs font-bold text-slate-400 uppercase tracking-widest">
            System Workflow & Navigation Hub
          </h2>
          <p className="text-xs text-slate-500 max-w-lg mx-auto leading-relaxed">
            Navigate the developmental lifecycle. Grouped into structured pipeline phases to design, verify, and govern your custom AI agents.
          </p>
        </div>

        <div className="space-y-12">
          {/* Phase 1 */}
          <PipelinePhase
            phaseNum="Phase I"
            phaseTitle="Signal Capture & Density Distillation"
            phaseDesc="Isolate core developer intent from messy specifications and compress context into wisdom seeds."
          >
            <PipelineCard
              icon="unarchive"
              title="Signal Center"
              purpose="Distill core instructions and strict constraints out of raw developer drafts and disorganized thoughts."
              inputs="Unstructured markdown, rough notes"
              outputs="Amplified prompt signals and constraints"
              colorClass="text-blue-600 dark:text-blue-400"
              hoverBorderClass="hover:border-blue-500"
              iconBgClass="bg-blue-500/10"
              onClick={() => onSelectActiveView('signal-extractor')}
            />
            <PipelineCard
              icon="compress"
              title="Compression Architect"
              purpose="Pack large semantic prompts into condensed code structures designed for optimal, lossless model unpacking."
              inputs="Raw text prompting instructions"
              outputs="High-density generative compactions"
              colorClass="text-cyan-600 dark:text-cyan-400"
              hoverBorderClass="hover:border-cyan-500"
              iconBgClass="bg-cyan-500/10"
              onClick={() => onSelectActiveView('signal-compression')}
            />
            <PipelineCard
              icon="spa"
              title="MindSeed Architect"
              purpose="Synthesize and evaluate text inputs into highly generative seeds of wisdom leveraging semantic stability tests."
              inputs="Complex software spec files"
              outputs="Cogni, Lingua, and Arch mind seeds"
              colorClass="text-orange-600 dark:text-orange-400"
              hoverBorderClass="hover:border-orange-500"
              iconBgClass="bg-orange-500/10"
              onClick={() => onSelectActiveView('mindseed')}
            />
          </PipelinePhase>

          {/* Phase 2 */}
          <PipelinePhase
            phaseNum="Phase II"
            phaseTitle="Syntactic Formulation"
            phaseDesc="Refine synthesized signals and structure instructions into standardized prompt blocks."
          >
            <PipelineCard
              icon="psychology"
              title="Prompt & Skill Architect"
              purpose="Author elegant system prompts with signal evaluations, or modular skill bundles containing clean file structures."
              inputs="Goal descriptions, instructions"
              outputs="PROMPT.md files or multi-file ZIP skills"
              colorClass="text-indigo-600 dark:text-indigo-400"
              hoverBorderClass="hover:border-indigo-500"
              iconBgClass="bg-indigo-500/10"
              onClick={() => onSelectActiveView('prompt-standard')}
            />
          </PipelinePhase>

          {/* Phase 3 */}
          <PipelinePhase
            phaseNum="Phase III"
            phaseTitle="Autonomous Agency"
            phaseDesc="Formulate structured system instructions specifying autonomous roles, scope, and objectives."
          >
            <PipelineCard
              icon="group_work"
              title="AI Agent Architect"
              purpose="Design individual reasoning loops for autonomous agents, defining precise capability boundaries and constraints."
              inputs="Agent role, scope, goals, constraints"
              outputs="Verifiably stable single-file prompts"
              colorClass="text-purple-600 dark:text-purple-400"
              hoverBorderClass="hover:border-purple-500"
              iconBgClass="bg-purple-500/10"
              onClick={() => onSelectActiveView('agent-architect')}
            />
          </PipelinePhase>

          {/* Phase 4 */}
          <PipelinePhase
            phaseNum="Phase IV"
            phaseTitle="Governance & Ecosystem"
            phaseDesc="Author standard rules, operating boundaries, roadmaps, and handbook directives to govern agent systems."
          >
            <PipelineCard
              icon="architecture"
              title="Project Architect"
              purpose="Establish system-wide PROJECT.md, SECURITY.md, roadmap milestones, and handbooks to enforce multi-agent rules."
              inputs="Tech stack, ideas, success criteria"
              outputs="Governance directories and ZIP blueprints"
              colorClass="text-emerald-600 dark:text-emerald-400"
              hoverBorderClass="hover:border-emerald-500"
              iconBgClass="bg-emerald-500/10"
              onClick={() => onSelectActiveView('project-architect')}
            />
            <PipelineCard
              icon="inventory_2"
              title="Architecture Organization"
              purpose="A command center workspace. Extract reasoning nodes from all saved assets and run synthesis processes."
              inputs="Signals, Seeds, Prompts, Agents, Projects"
              outputs="Starred, pinned, and synthesized assets"
              colorClass="text-rose-600 dark:text-rose-400"
              hoverBorderClass="hover:border-rose-500"
              iconBgClass="bg-rose-500/10"
              onClick={() => onSelectActiveView('command-center')}
            />
          </PipelinePhase>
        </div>
      </section>

      {/* Workbench Utilities */}
      <section className="pt-12 border-t border-slate-100 dark:border-slate-800/80 space-y-6">
        <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest text-center">
          System Configurations
        </h3>
        <div className="flex justify-center">
          <button
            onClick={onOpenSettings}
            className="flex items-center gap-2 px-5 py-2.5 bg-slate-500/5 hover:bg-slate-500/10 border border-slate-200/60 dark:border-slate-800/60 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-300 cursor-pointer transition-all"
          >
            <span className="material-icons text-sm">settings_input_component</span>
            Configure OpenRouter API Settings
          </button>
        </div>
      </section>

      {/* Quickstart/Theory */}
      <section className="pt-8 space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <InfoCard icon="memory" title="Unified Memory">
            IndexedDB stores your drafts and library assets directly in your local browser sandbox. CryptoJS wraps sensitive fields in encrypted columns.
          </InfoCard>
          <InfoCard icon="checklist" title="The Assembly Sequence">
            Move files downstream. Run raw spec insights through Signal Extractor and pass the distilled instructions directly into Prompt, Agent, or Project Architects.
          </InfoCard>
          <InfoCard icon="biotech" title="High-Stake Guardrails">
            Enforce precise operational boundaries for your model runtimes. Author employer handbooks, strict escalation routes, and roadmap criteria.
          </InfoCard>
        </div>
      </section>

      <section className="pt-8">
        <CustomContextSettings />
      </section>
    </div>
  );
};

export default LandingPage;

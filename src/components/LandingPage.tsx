import React, { useState, useEffect } from 'react';
import { View } from '../App';
import CustomContextSettings from './CustomContextSettings';

interface LandingPageProps {
  onSelectView: (view: View) => void;
  onIncept?: (view: View, config: any) => void;
}

const InfoCard: React.FC<{icon: string, title: string, children: React.ReactNode}> = ({icon, title, children}) => (
    <div className="bg-slate-500/5 p-6 rounded-2xl border border-slate-200/50 dark:border-slate-800/30">
        <div className="flex items-center mb-4">
            <span className="material-icons text-2xl text-blue-500 dark:text-blue-400 mr-4">{icon}</span>
            <h3 className="text-md font-bold text-slate-800 dark:text-slate-200">{title}</h3>
        </div>
        <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed">{children}</p>
    </div>
);

const PipelineCard: React.FC<{
  icon: string;
  title: string;
  description: string;
  colorClass: string;
  hoverBorderClass: string;
  iconBgClass: string;
  onClick: () => void;
}> = ({ icon, title, description, colorClass, hoverBorderClass, iconBgClass, onClick }) => (
    <button 
        onClick={onClick} 
        className={`group bg-white dark:bg-slate-900/40 p-6 rounded-2xl border border-slate-200/60 dark:border-slate-800/60 ${hoverBorderClass} hover:-translate-y-1 transition-all duration-200 text-left w-full flex flex-col focus:outline-none focus:ring-2 focus:ring-blue-500/40 cursor-pointer`}
        aria-label={`Select ${title} tool`}
    >
        <div className="flex-grow">
            <div className={`flex items-center justify-center ${iconBgClass} rounded-xl w-12 h-12 mb-4 transition-transform duration-200 group-hover:scale-105`}>
                <span className={`material-icons text-xl ${colorClass}`}>{icon}</span>
            </div>
            <h3 className="text-md font-bold text-slate-800 dark:text-slate-200 mb-1.5">{title}</h3>
            <p className="text-xs text-slate-400 dark:text-slate-500 leading-relaxed">{description}</p>
        </div>
        <div className={`mt-5 text-xs font-bold ${colorClass} flex items-center`}>
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
  <div className="relative space-y-6">
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-4 border-b border-slate-100 dark:border-slate-800/80">
      <div className="flex items-center gap-3">
        <span className="text-xs font-mono font-bold text-blue-500 dark:text-blue-400 bg-blue-500/10 px-2.5 py-1 rounded-lg">
          {phaseNum}
        </span>
        <h3 className="text-lg font-extrabold text-slate-800 dark:text-slate-200">
          {phaseTitle}
        </h3>
      </div>
      <p className="text-xs text-slate-400 dark:text-slate-500 italic">
        {phaseDesc}
      </p>
    </div>
    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
      {children}
    </div>
  </div>
);

const LandingPage: React.FC<LandingPageProps> = ({ onSelectView, onIncept }) => {
    const [rawVision, setRawVision] = useState('');
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [analysisStep, setAnalysisStep] = useState(0);
    const [inceptionResults, setInceptionResults] = useState<any | null>(null);

    const steps = [
      'Isolating semantic attracts from vision stream...',
      'Synthesizing structural prompt schema variables...',
      'Deriving autonomous role constraints and guardrails...',
      'Crystallizing architectural requirements blueprint...'
    ];

    const handleIncept = () => {
      if (!rawVision.trim()) return;
      setIsAnalyzing(true);
      setAnalysisStep(0);
      setInceptionResults(null);
    };

    useEffect(() => {
      if (!isAnalyzing) return;
      if (analysisStep < steps.length) {
        const timer = setTimeout(() => {
          setAnalysisStep(prev => prev + 1);
        }, 1200);
        return () => clearTimeout(timer);
      } else {
        // Complete Inception Analysis!
        setIsAnalyzing(false);
        const nameGuess = rawVision.split(' ').slice(0, 3).join(' ') + ' System';

        setInceptionResults({
          signal: {
            messyPrompt: `I need a full implementation of ${rawVision}. Make sure it is secure, performant, and conforms to strict guidelines.`
          },
          prompt: {
            goal: `Implement a high-stability ${nameGuess}.`,
            instructions: `1. Setup: Ensure appropriate module imports.\n2. Invariants: Enforce atomic state ownership.\n3. Formatting: Output well-commented code blocks.`
          },
          agent: {
            role: `${nameGuess} Specialist Agent`,
            scope: `Designing and verifying code blocks for ${rawVision}.`,
            goals: `1. Ensure 100% correct type assertions.\n2. Optimize asynchronous state transitions.\n3. Validate boundary parameters.`,
            constraints: `1. Never bypass security verification checks.\n2. Output production-ready, clean structures.`
          },
          project: {
            title: nameGuess,
            goal: `To produce a performant, atomic deployment of ${nameGuess} leveraging optimal semantic alignment.`,
            idea: rawVision,
            vision: `To empower users with a reliable, scalable system architecture representing the core intent of: ${rawVision}`
          }
        });
      }
    }, [isAnalyzing, analysisStep]);

    const triggerLaunch = (view: View, config: any) => {
      if (onIncept) {
        onIncept(view, config);
      } else {
        onSelectView(view);
      }
    };

    return (
        <div className="max-w-5xl mx-auto space-y-16 animate-fade-in pb-20">
            {/* Minimalist Hero */}
            <section className="text-center py-16 space-y-4">
                <h2 className="text-4xl font-extrabold text-slate-900 dark:text-slate-100 tracking-tight sm:text-5xl md:text-6xl">
                    Noosphere Architect
                </h2>
                <p className="mt-2 max-w-2xl mx-auto text-sm text-slate-500 dark:text-slate-400 leading-relaxed">
                    A self-referential workbench designed to map raw technical intent into robust, cascading prompt chains and executable agent blueprints.
                </p>
            </section>

            {/* Inception Oracle (Creative Spark) */}
            <section className="bg-slate-500/5 p-6 md:p-8 rounded-3xl border border-slate-200/60 dark:border-slate-800/50 space-y-6">
              <div className="flex items-center justify-between pb-4 border-b border-slate-200/50 dark:border-slate-800/30">
                <div className="flex items-center gap-3">
                  <span className="material-icons text-amber-500">model_training</span>
                  <h3 className="text-md font-bold text-slate-800 dark:text-slate-200">Noospheric Inception Oracle</h3>
                </div>
                <span className="text-[10px] font-bold text-amber-500/80 bg-amber-500/10 px-2 py-0.5 rounded-md uppercase tracking-wider">
                  Prism Engine
                </span>
              </div>

              <div className="space-y-4">
                <p className="text-xs text-slate-500 leading-relaxed">
                  Have a raw project vision? Paste it here to instantly decompose your idea into specific configurations across the entire assembly pipeline.
                </p>

                <div className="flex gap-3">
                  <textarea
                    rows={2}
                    value={rawVision}
                    onChange={(e) => setRawVision(e.target.value)}
                    placeholder="e.g., A secure markdown parser using React 19 and Vite with IndexedDB local caching..."
                    className="flex-grow px-4 py-3 bg-white dark:bg-slate-950/40 border border-slate-200 dark:border-slate-800 rounded-2xl text-xs focus:ring-2 focus:ring-amber-500/40 outline-none transition custom-scrollbar text-slate-800 dark:text-slate-200 leading-relaxed"
                  />
                  <button
                    onClick={handleIncept}
                    disabled={isAnalyzing || !rawVision.trim()}
                    className="px-6 bg-amber-600 hover:bg-amber-700 dark:bg-amber-600 dark:hover:bg-amber-500 text-white rounded-2xl font-bold text-xs shadow-md shadow-amber-600/10 cursor-pointer flex items-center justify-center transition disabled:opacity-50 h-auto"
                  >
                    Incept Concept
                  </button>
                </div>
              </div>

              {isAnalyzing && (
                <div className="py-6 space-y-3 animate-pulse bg-slate-500/5 rounded-2xl p-4 border border-slate-100 dark:border-slate-800/40">
                  <div className="flex items-center gap-2">
                    <span className="material-icons text-slate-400 text-sm animate-spin">sync</span>
                    <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">{steps[analysisStep] || 'Analysing...'}</span>
                  </div>
                  <div className="w-full bg-slate-200 dark:bg-slate-800 rounded-full h-1">
                    <div className="bg-amber-500 h-1 rounded-full transition-all duration-300" style={{ width: `${(analysisStep / steps.length) * 100}%` }}></div>
                  </div>
                </div>
              )}

              {inceptionResults && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 pt-4 animate-fade-in">
                  <div className="p-4 bg-white dark:bg-slate-950/20 rounded-2xl border border-blue-500/20 flex flex-col justify-between">
                    <div>
                      <div className="flex items-center gap-1.5 text-[10px] font-bold text-blue-500 uppercase tracking-wider mb-2">
                        <span className="material-icons text-sm">unarchive</span> Signal Extractor
                      </div>
                      <p className="text-[10px] text-slate-400 leading-relaxed mb-4 line-clamp-3">
                        {inceptionResults.signal.messyPrompt}
                      </p>
                    </div>
                    <button
                      onClick={() => triggerLaunch('signalExtractor', inceptionResults.signal)}
                      className="w-full py-1.5 bg-blue-500/10 hover:bg-blue-500/20 text-blue-600 dark:text-blue-400 font-bold text-[10px] rounded-lg cursor-pointer transition text-center"
                    >
                      Load in Signal
                    </button>
                  </div>

                  <div className="p-4 bg-white dark:bg-slate-950/20 rounded-2xl border border-indigo-500/20 flex flex-col justify-between">
                    <div>
                      <div className="flex items-center gap-1.5 text-[10px] font-bold text-indigo-500 uppercase tracking-wider mb-2">
                        <span className="material-icons text-sm">psychology</span> Prompt Architect
                      </div>
                      <p className="text-[10px] text-slate-400 leading-relaxed mb-4 line-clamp-3">
                        <strong>Goal:</strong> {inceptionResults.prompt.goal}
                      </p>
                    </div>
                    <button
                      onClick={() => triggerLaunch('promptArchitect', inceptionResults.prompt)}
                      className="w-full py-1.5 bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 font-bold text-[10px] rounded-lg cursor-pointer transition text-center"
                    >
                      Load in Prompt
                    </button>
                  </div>

                  <div className="p-4 bg-white dark:bg-slate-950/20 rounded-2xl border border-purple-500/20 flex flex-col justify-between">
                    <div>
                      <div className="flex items-center gap-1.5 text-[10px] font-bold text-purple-500 uppercase tracking-wider mb-2">
                        <span className="material-icons text-sm">group_work</span> Agent Architect
                      </div>
                      <p className="text-[10px] text-slate-400 leading-relaxed mb-4 line-clamp-3">
                        <strong>Role:</strong> {inceptionResults.agent.role}
                      </p>
                    </div>
                    <button
                      onClick={() => triggerLaunch('agentArchitect', inceptionResults.agent)}
                      className="w-full py-1.5 bg-purple-500/10 hover:bg-purple-500/20 text-purple-600 dark:text-purple-400 font-bold text-[10px] rounded-lg cursor-pointer transition text-center"
                    >
                      Load in Agent
                    </button>
                  </div>

                  <div className="p-4 bg-white dark:bg-slate-950/20 rounded-2xl border border-emerald-500/20 flex flex-col justify-between">
                    <div>
                      <div className="flex items-center gap-1.5 text-[10px] font-bold text-emerald-500 uppercase tracking-wider mb-2">
                        <span className="material-icons text-sm">architecture</span> Project Architect
                      </div>
                      <p className="text-[10px] text-slate-400 leading-relaxed mb-4 line-clamp-3">
                        <strong>Title:</strong> {inceptionResults.project.title}
                      </p>
                    </div>
                    <button
                      onClick={() => triggerLaunch('projectArchitect', inceptionResults.project)}
                      className="w-full py-1.5 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 font-bold text-[10px] rounded-lg cursor-pointer transition text-center"
                    >
                      Load in Project
                    </button>
                  </div>
                </div>
              )}
            </section>

            {/* Reorganized Cognitive Assembly Pipeline (4 Sequential Stages) */}
            <section className="space-y-12">
                <h2 className="text-xs font-bold text-slate-400 uppercase tracking-widest text-center">
                    The Cognitive Assembly Pipeline
                </h2>

                <div className="space-y-12 relative">
                  {/* Phase 1 */}
                  <PipelinePhase
                    phaseNum="Phase I"
                    phaseTitle="Signal Capture & Density Distillation"
                    phaseDesc="Isolate semantic attractors and compress context into wisdom seeds."
                  >
                    <PipelineCard
                      icon="unarchive"
                      title="Signal Center"
                      description="Extract signals from messy thoughts or rough specification notes."
                      colorClass="text-blue-600 dark:text-blue-400"
                      hoverBorderClass="hover:border-blue-500"
                      iconBgClass="bg-blue-500/10"
                      onClick={() => onSelectView('signalExtractor')}
                    />
                    <PipelineCard
                      icon="compress"
                      title="Compression Architect"
                      description="Compress text signals into high-density compactions for model unpacking."
                      colorClass="text-cyan-600 dark:text-cyan-400"
                      hoverBorderClass="hover:border-cyan-500"
                      iconBgClass="bg-cyan-500/10"
                      onClick={() => onSelectView('signalCompressionArchitect')}
                    />
                    <PipelineCard
                      icon="spa"
                      title="MindSeed Architect"
                      description="Compress specifications into generative seeds with stability evaluations."
                      colorClass="text-orange-600 dark:text-orange-400"
                      hoverBorderClass="hover:border-orange-500"
                      iconBgClass="bg-orange-500/10"
                      onClick={() => onSelectView('mindSeedArchitect')}
                    />
                  </PipelinePhase>

                  {/* Phase 2 */}
                  <PipelinePhase
                    phaseNum="Phase II"
                    phaseTitle="Syntactic Formulation"
                    phaseDesc="Shape and formulate technical context into structured instructions."
                  >
                    <PipelineCard
                      icon="psychology"
                      title="Prompt & Skill Architect"
                      description="Refine raw text into standardized system prompts or modular skill bundles."
                      colorClass="text-indigo-600 dark:text-indigo-400"
                      hoverBorderClass="hover:border-indigo-500"
                      iconBgClass="bg-indigo-500/10"
                      onClick={() => onSelectView('promptArchitect')}
                    />
                    <div className="hidden sm:block md:col-span-2"></div>
                  </PipelinePhase>

                  {/* Phase 3 */}
                  <PipelinePhase
                    phaseNum="Phase III"
                    phaseTitle="Autonomous Agency"
                    phaseDesc="Establish identity, capability, and scope metrics for agent runtimes."
                  >
                    <PipelineCard
                      icon="group_work"
                      title="AI Agent Architect"
                      description="Author single-file agent reasoning loops using structured system instructions."
                      colorClass="text-purple-600 dark:text-purple-400"
                      hoverBorderClass="hover:border-purple-500"
                      iconBgClass="bg-purple-500/10"
                      onClick={() => onSelectView('agentArchitect')}
                    />
                    <div className="hidden sm:block md:col-span-2"></div>
                  </PipelinePhase>

                  {/* Phase 4 */}
                  <PipelinePhase
                    phaseNum="Phase IV"
                    phaseTitle="Governance & Ecosystem"
                    phaseDesc="Build the rules, roadmaps, and systems that hold multi-agent systems together."
                  >
                    <PipelineCard
                      icon="architecture"
                      title="Project Architect"
                      description="Author high-level project guides, roadmap milestones, and agent handbook rules."
                      colorClass="text-emerald-600 dark:text-emerald-400"
                      hoverBorderClass="hover:border-emerald-500"
                      iconBgClass="bg-emerald-500/10"
                      onClick={() => onSelectView('projectArchitect')}
                    />
                    <PipelineCard
                      icon="inventory_2"
                      title="Architecture Organization"
                      description="Topology synthesis center to map, star, pin, and compose your assets."
                      colorClass="text-rose-600 dark:text-rose-400"
                      hoverBorderClass="hover:border-rose-500"
                      iconBgClass="bg-rose-500/10"
                      onClick={() => onSelectView('architectureOrganization')}
                    />
                    <div className="hidden md:block"></div>
                  </PipelinePhase>
                </div>
            </section>

            {/* Workbench Utilities */}
            <section className="pt-12 border-t border-slate-100 dark:border-slate-800/80 space-y-6">
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest text-center">
                Workbench Utilities
              </h3>
              <div className="flex justify-center">
                <button
                  onClick={() => onSelectView('agentApiSettings')}
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
                    <InfoCard icon="memory" title="What is Noosphere?">
                        A holistic development workshop designed to prevent cognitive drift. Aligning your thoughts, prompts, and agent code around core semantic attractors.
                    </InfoCard>
                    <InfoCard icon="checklist" title="Sequential Cascade">
                        Move assets downstream. Take messy signals, distill them, frame them into prompt modules, parameterize agent personas, and establish project governance rules.
                    </InfoCard>
                    <InfoCard icon="biotech" title="Graceful Autonomy">
                        Equip your agent systems with explicit handbook bounds, escalation routes, and roadmap criteria for verifiable operating environments.
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

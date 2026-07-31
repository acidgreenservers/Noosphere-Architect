import React from 'react';

interface PipelineIndicatorProps {
  currentView: string;
  onNavigate?: (view: string) => void;
}

interface Step {
  view: string;
  label: string;
  icon: string;
}

const STEPS: Step[] = [
  { view: 'signal-extractor', label: 'Signal Extractor', icon: 'unarchive' },
  { view: 'mindseed', label: 'MindSeed', icon: 'spa' },
  { view: 'prompt-standard', label: 'Prompt Architect', icon: 'psychology' },
  { view: 'agent-architect', label: 'Agent Architect', icon: 'group_work' },
  { view: 'project-architect', label: 'Project Architect', icon: 'architecture' },
  { view: 'command-center', label: 'Organization', icon: 'inventory_2' }
];

export const PipelineIndicator: React.FC<PipelineIndicatorProps> = ({ currentView, onNavigate }) => {
  return (
    <div className="w-full mb-8 animate-fade-in bg-slate-500/5 p-4 rounded-2xl border border-slate-200/50 dark:border-slate-800/30">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest">
          Noospheric Pipeline Path
        </div>
        <nav className="flex flex-wrap items-center gap-1 text-xs">
          {STEPS.map((step, idx) => {
            const isActive = currentView === step.view;
            const isClickable = !!onNavigate;

            return (
              <React.Fragment key={step.view}>
                {idx > 0 && (
                  <span className="text-slate-300 dark:text-slate-700 mx-1 select-none">➔</span>
                )}
                <button
                  type="button"
                  disabled={!isClickable || isActive}
                  onClick={() => onNavigate && onNavigate(step.view)}
                  className={`flex items-center gap-1.5 py-1 px-2.5 rounded-lg font-semibold transition-all duration-200 ${
                    isActive
                      ? 'bg-blue-600/10 text-blue-600 dark:text-blue-400 font-bold'
                      : isClickable
                      ? 'text-slate-400 dark:text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-900/40 cursor-pointer'
                      : 'text-slate-300 dark:text-slate-600 select-none'
                  }`}
                >
                  <span className="material-icons text-sm">{step.icon}</span>
                  <span>{step.label}</span>
                </button>
              </React.Fragment>
            );
          })}
        </nav>
      </div>
    </div>
  );
};

export default PipelineIndicator;

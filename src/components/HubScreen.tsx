import React from 'react';
import { ActiveView } from './Sidebar';

interface HubCard {
  view: ActiveView;
  title: string;
  description: string;
  icon: string;
  colorClass: string;
  hoverBorderClass: string;
  iconBgClass: string;
}

interface HubScreenProps {
  hubId: 'signal-hub' | 'prompt-hub' | 'agent-hub' | 'governance-hub';
  onSelectView: (view: ActiveView) => void;
}

const HUB_DATA: Record<string, { title: string; subtitle: string; cards: HubCard[] }> = {
  'signal-hub': {
    title: 'Signal Center Hub',
    subtitle: 'Distill core instructions and strict constraints out of disorganized thoughts and raw drafts.',
    cards: [
      {
        view: 'signal-extractor',
        title: 'Signal Extractor',
        description: 'Extract clean prompt instructions and strict constraints from rough notes and loose specifications.',
        icon: 'unarchive',
        colorClass: 'text-blue-600 dark:text-blue-400',
        hoverBorderClass: 'hover:border-blue-500',
        iconBgClass: 'bg-blue-500/10'
      },
      {
        view: 'signal-compression',
        title: 'Compression Architect',
        description: 'Pack large semantic prompts into condensed code structures designed for optimal, lossless model unpacking.',
        icon: 'compress',
        colorClass: 'text-cyan-600 dark:text-cyan-400',
        hoverBorderClass: 'hover:border-cyan-500',
        iconBgClass: 'bg-cyan-500/10'
      },
      {
        view: 'mindseed',
        title: 'MindSeed Architect',
        description: 'Synthesize complex text files into highly generative, semantically stable foundational seeds.',
        icon: 'spa',
        colorClass: 'text-orange-600 dark:text-orange-400',
        hoverBorderClass: 'hover:border-orange-500',
        iconBgClass: 'bg-orange-500/10'
      }
    ]
  },
  'prompt-hub': {
    title: 'Prompt & Skill Center',
    subtitle: 'Refine synthesized signals and structure instructions into standardized, modular prompt files.',
    cards: [
      {
        view: 'prompt-standard',
        title: 'Standard Prompt',
        description: 'Author elegant system prompts with precise instructions and structural constraint markers.',
        icon: 'description',
        colorClass: 'text-indigo-600 dark:text-indigo-400',
        hoverBorderClass: 'hover:border-indigo-500',
        iconBgClass: 'bg-indigo-500/10'
      },
      {
        view: 'prompt-skill',
        title: 'Skill Bundle',
        description: 'Design modular capability directories and export them as standalone, multi-file ZIP skills.',
        icon: 'extension',
        colorClass: 'text-purple-600 dark:text-purple-400',
        hoverBorderClass: 'hover:border-purple-500',
        iconBgClass: 'bg-purple-500/10'
      }
    ]
  },
  'agent-hub': {
    title: 'Agent Forge',
    subtitle: 'Formulate instructions specifying autonomous roles, scope, and objective validation loops.',
    cards: [
      {
        view: 'agent-architect',
        title: 'Agent Architect',
        description: 'Design autonomous single-agent systems with rigorous constraint limits and behavioral patterns.',
        icon: 'smart_toy',
        colorClass: 'text-pink-600 dark:text-pink-400',
        hoverBorderClass: 'hover:border-pink-500',
        iconBgClass: 'bg-pink-500/10'
      }
    ]
  },
  'governance-hub': {
    title: 'Governance & Ecosystem',
    subtitle: 'Author multi-agent rule books, operating constraints, roadmap plans, and job directives to govern workspaces.',
    cards: [
      {
        view: 'project-architect',
        title: 'Project Architect',
        description: 'Establish high-level vision, system-wide development standards, and rule booklets.',
        icon: 'architecture',
        colorClass: 'text-emerald-600 dark:text-emerald-400',
        hoverBorderClass: 'hover:border-emerald-500',
        iconBgClass: 'bg-emerald-500/10'
      },
      {
        view: 'roadmap-architect',
        title: 'Roadmap Architect',
        description: 'Transform project ideas into deeply grounded and actionable step-by-step roadmap backlogs.',
        icon: 'timeline',
        colorClass: 'text-amber-600 dark:text-amber-400',
        hoverBorderClass: 'hover:border-amber-500',
        iconBgClass: 'bg-amber-500/10'
      },
      {
        view: 'agent-job',
        title: 'Agent Job Book',
        description: 'Author specific employee handbooks for agents, defining exact job functions and authority ceilings.',
        icon: 'assignment_ind',
        colorClass: 'text-teal-600 dark:text-teal-400',
        hoverBorderClass: 'hover:border-teal-500',
        iconBgClass: 'bg-teal-500/10'
      }
    ]
  }
};

const HubScreen: React.FC<HubScreenProps> = ({ hubId, onSelectView }) => {
  const data = HUB_DATA[hubId];

  if (!data) {
    return (
      <div className="py-12 text-center">
        <p className="text-sm text-slate-500">Hub configuration not found.</p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto animate-fade-in py-6">
      <div className="mb-12">
        <h2 className="text-3xl font-extrabold text-slate-900 dark:text-slate-100">
          {data.title}
        </h2>
        <p className="text-slate-500 dark:text-slate-400 text-sm mt-2 max-w-2xl leading-relaxed">
          {data.subtitle}
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {data.cards.map((card) => (
          <button
            key={card.view}
            onClick={() => onSelectView(card.view)}
            className={`w-full text-left p-6 bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800/60 rounded-3xl transition-all duration-300 hover:shadow-lg hover:-translate-y-1 ${card.hoverBorderClass} cursor-pointer group flex flex-col justify-between`}
          >
            <div>
              <div className="flex items-center gap-4 mb-4">
                <div className={`w-10 h-10 rounded-2xl flex items-center justify-center ${card.iconBgClass} ${card.colorClass} transition-transform group-hover:scale-110 duration-300`}>
                  <span className="material-icons text-xl">{card.icon}</span>
                </div>
                <h3 className="font-bold text-slate-800 dark:text-slate-100 text-base">
                  {card.title}
                </h3>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed mb-6">
                {card.description}
              </p>
            </div>
            <div className="flex items-center text-[10px] font-bold text-blue-600 dark:text-blue-400 uppercase tracking-widest gap-1 group-hover:translate-x-1 transition-transform duration-300">
              Launch tool <span className="material-icons text-xs">arrow_forward</span>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
};

export default HubScreen;

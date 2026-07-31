import React from 'react';

export type ActiveView =
  | 'home'
  | 'signal-hub' | 'signal-extractor' | 'signal-compression' | 'mindseed'
  | 'prompt-hub' | 'prompt-standard' | 'prompt-skill'
  | 'agent-hub' | 'agent-architect'
  | 'governance-hub' | 'project-architect' | 'roadmap-architect' | 'agent-job'
  | 'command-center'
  | 'settings';

interface SidebarProps {
  activeView: ActiveView;
  onNavigate: (view: ActiveView) => void;
  isOpenMobile: boolean;
  onCloseMobile: () => void;
}

interface SidebarItem {
  view: ActiveView;
  label: string;
  icon: string;
  colorClass?: string;
}

interface SidebarSection {
  title: string;
  items: SidebarItem[];
}

const SECTIONS: SidebarSection[] = [
  {
    title: 'DASHBOARD',
    items: [
      { view: 'home', label: 'Home Dashboard', icon: 'home' }
    ]
  },
  {
    title: 'SIGNAL CENTER',
    items: [
      { view: 'signal-hub', label: 'Hub Overview', icon: 'grid_view' },
      { view: 'signal-extractor', label: 'Signal Extractor', icon: 'unarchive', colorClass: 'text-blue-500' },
      { view: 'signal-compression', label: 'Compression', icon: 'compress', colorClass: 'text-cyan-500' },
      { view: 'mindseed', label: 'MindSeeds', icon: 'spa', colorClass: 'text-orange-500' }
    ]
  },
  {
    title: 'PROMPT & SKILL CENTER',
    items: [
      { view: 'prompt-hub', label: 'Hub Overview', icon: 'grid_view' },
      { view: 'prompt-standard', label: 'Standard Prompt', icon: 'description', colorClass: 'text-indigo-500' },
      { view: 'prompt-skill', label: 'Skill Bundle', icon: 'extension', colorClass: 'text-purple-500' }
    ]
  },
  {
    title: 'AGENT FORGE',
    items: [
      { view: 'agent-hub', label: 'Hub Overview', icon: 'grid_view' },
      { view: 'agent-architect', label: 'Agent Architect', icon: 'smart_toy', colorClass: 'text-pink-500' }
    ]
  },
  {
    title: 'GOVERNANCE HUB',
    items: [
      { view: 'governance-hub', label: 'Hub Overview', icon: 'grid_view' },
      { view: 'project-architect', label: 'Project Architect', icon: 'architecture', colorClass: 'text-emerald-500' },
      { view: 'roadmap-architect', label: 'Roadmap Architect', icon: 'timeline', colorClass: 'text-amber-500' },
      { view: 'agent-job', label: 'Agent Job Book', icon: 'assignment_ind', colorClass: 'text-teal-500' }
    ]
  },
  {
    title: 'ECOSYSTEM',
    items: [
      { view: 'command-center', label: 'Command Center', icon: 'inventory_2', colorClass: 'text-rose-500' }
    ]
  },
  {
    title: 'CONFIGURATIONS',
    items: [
      { view: 'settings', label: 'API & Context', icon: 'settings' }
    ]
  }
];

const Sidebar: React.FC<SidebarProps> = ({ activeView, onNavigate, isOpenMobile, onCloseMobile }) => {
  const renderNavSection = (section: SidebarSection) => (
    <div key={section.title} className="mb-6">
      <h3 className="px-4 mb-2 text-[10px] font-bold text-slate-400 dark:text-slate-500 tracking-widest uppercase select-none">
        {section.title}
      </h3>
      <div className="space-y-1">
        {section.items.map((item) => {
          const isActive = activeView === item.view;
          return (
            <button
              key={item.view}
              onClick={() => {
                onNavigate(item.view);
                onCloseMobile();
              }}
              className={`w-full flex items-center space-x-3 px-4 py-2 text-xs font-semibold rounded-xl transition-all duration-200 text-left cursor-pointer focus:outline-none ${
                isActive
                  ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 font-bold'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-900/40'
              }`}
            >
              <span className={`material-icons text-sm ${isActive ? 'text-blue-500' : item.colorClass || 'text-slate-400 dark:text-slate-500'}`}>
                {item.icon}
              </span>
              <span className="truncate">{item.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );

  return (
    <>
      {/* Mobile Backdrop overlay */}
      {isOpenMobile && (
        <div
          onClick={onCloseMobile}
          className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs z-40 lg:hidden"
        />
      )}

      {/* Sidebar container */}
      <aside
        className={`fixed inset-y-0 left-0 w-64 bg-white dark:bg-gray-800 border-r border-slate-200 dark:border-slate-700 z-50 transform lg:transform-none lg:opacity-100 transition-all duration-300 flex flex-col ${
          isOpenMobile ? 'translate-x-0 opacity-100' : '-translate-x-full opacity-0 lg:translate-x-0'
        }`}
      >
        {/* Sidebar Header */}
        <div className="px-6 py-5 border-b border-slate-100 dark:border-slate-700/60 flex items-center justify-between select-none">
          <div className="flex items-center space-x-3">
            <span className="material-icons text-blue-500 dark:text-blue-400 text-2xl">memory</span>
            <span className="font-extrabold text-sm tracking-tight text-slate-800 dark:text-slate-100 uppercase">
              Noosphere Architect
            </span>
          </div>
          {/* Close button for mobile */}
          <button
            onClick={onCloseMobile}
            className="lg:hidden p-1 rounded-full hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300"
          >
            <span className="material-icons text-lg">close</span>
          </button>
        </div>

        {/* Navigation Items (Scrollable) */}
        <nav className="flex-1 overflow-y-auto px-4 py-6 custom-scrollbar">
          {SECTIONS.map(renderNavSection)}
        </nav>

        {/* Footer info */}
        <div className="p-4 border-t border-slate-100 dark:border-slate-700/60 text-[10px] text-slate-400 dark:text-slate-500 text-center select-none font-medium">
          Prompting Across Substrates
        </div>
      </aside>
    </>
  );
};

export default Sidebar;

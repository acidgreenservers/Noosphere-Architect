import React, { useEffect, useRef, useState } from 'react';
import { UserPreferences } from '../types';
import { getInitials } from '../services/preferencesService';

export type ActiveView =
  | 'home'
  | 'signal-extractor' | 'signal-compression' | 'seed-architect' | 'mindseed'
  | 'prompt-standard' | 'prompt-skill'
  | 'agent-architect'
  | 'project-architect' | 'roadmap-architect' | 'agent-job'
  | 'command-center';

interface SidebarProps {
  activeView: ActiveView;
  onNavigate: (view: ActiveView) => void;
  isOpenMobile: boolean;
  onCloseMobile: () => void;
  preferences: UserPreferences | null;
  onOpenSettings: () => void;
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
      { view: 'signal-extractor', label: 'Signal Extractor', icon: 'unarchive', colorClass: 'text-blue-500' },
      { view: 'signal-compression', label: 'Compression', icon: 'compress', colorClass: 'text-cyan-500' },
      { view: 'seed-architect', label: 'Seed Architect', icon: 'auto_awesome', colorClass: 'text-violet-500' },
      { view: 'mindseed', label: 'MindSeeds', icon: 'spa', colorClass: 'text-orange-500' }
    ]
  },
  {
    title: 'PROMPT & SKILL CENTER',
    items: [
      { view: 'prompt-standard', label: 'Standard Prompt', icon: 'description', colorClass: 'text-indigo-500' },
      { view: 'prompt-skill', label: 'Skill Bundle', icon: 'extension', colorClass: 'text-purple-500' }
    ]
  },
  {
    title: 'AGENT FORGE',
    items: [
      { view: 'agent-architect', label: 'Agent Architect', icon: 'smart_toy', colorClass: 'text-pink-500' }
    ]
  },
  {
    title: 'GOVERNANCE HUB',
    items: [
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
  }
];

const Sidebar: React.FC<SidebarProps> = ({ activeView, onNavigate, isOpenMobile, onCloseMobile, preferences, onOpenSettings }) => {
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
  const profileAreaRef = useRef<HTMLDivElement | null>(null);

  // Close the profile action menu on outside click or Escape
  useEffect(() => {
    if (!isProfileMenuOpen) return;

    const handlePointerDown = (event: MouseEvent) => {
      if (profileAreaRef.current && !profileAreaRef.current.contains(event.target as Node)) {
        setIsProfileMenuOpen(false);
      }
    };
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setIsProfileMenuOpen(false);
    };

    document.addEventListener('mousedown', handlePointerDown);
    document.addEventListener('keydown', handleEscape);
    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [isProfileMenuOpen]);

  const username = preferences?.username?.trim() || '';
  const initials = getInitials(username);

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
              className={`w-full flex items-center space-x-3 px-4 py-2 text-xs font-semibold rounded-xl transition-all duration-200 text-left cursor-pointer focus:outline-none ${isActive
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
        className={`fixed inset-y-0 left-0 w-64 bg-white dark:bg-gray-800 border-r border-slate-200 dark:border-slate-700 z-50 transform lg:transform-none lg:opacity-100 transition-all duration-300 flex flex-col ${isOpenMobile ? 'translate-x-0 opacity-100' : '-translate-x-full opacity-0 lg:translate-x-0'
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

        {/* Profile area — action menu pops upward (Settings lives here now) */}
        <div className="relative px-4 py-3 border-t border-slate-100 dark:border-slate-700/60" ref={profileAreaRef}>
          {isProfileMenuOpen && (
            <div
              role="menu"
              className="absolute bottom-full left-4 right-4 mb-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl shadow-xl overflow-hidden animate-fade-in"
            >
              <button
                role="menuitem"
                onClick={() => {
                  setIsProfileMenuOpen(false);
                  onOpenSettings();
                  onCloseMobile();
                }}
                className="w-full flex items-center space-x-3 px-4 py-3 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700/60 transition-colors cursor-pointer"
              >
                <span className="material-icons text-sm text-slate-400 dark:text-slate-500">settings</span>
                <span>Settings</span>
              </button>
            </div>
          )}

          <button
            onClick={() => setIsProfileMenuOpen(prev => !prev)}
            aria-haspopup="menu"
            aria-expanded={isProfileMenuOpen}
            className="w-full flex items-center space-x-3 px-2 py-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-700/40 transition-colors cursor-pointer"
          >
            <span className="w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center text-[11px] font-bold flex-shrink-0 select-none">
              {initials || <span className="material-icons text-sm">person</span>}
            </span>
            <span className="flex-1 min-w-0 text-left text-xs font-bold text-slate-700 dark:text-slate-200 truncate">
              {username || 'Set up profile'}
            </span>
            <span className={`material-icons text-slate-400 text-base transition-transform duration-200 ${isProfileMenuOpen ? 'rotate-180' : ''}`}>
              expand_less
            </span>
          </button>
        </div>

        {/* Footer info */}
        <div className="p-4 border-t border-slate-100 dark:border-slate-700/60 text-[10px] text-slate-400 dark:text-slate-500 text-center select-none font-medium">
          Prompting Across Substrates
        </div>
      </aside>
    </>
  );
};

export default Sidebar;

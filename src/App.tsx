import React, { useState, useEffect, Suspense, lazy } from 'react';
import LandingPage from './components/LandingPage';
import LoadingSpinner from './components/LoadingSpinner';
import Sidebar, { ActiveView } from './components/Sidebar';
import SettingsModal from './components/SettingsModal';
import { PromptConfig, AgentConfig, ProjectConfig, SignalConfig, UserPreferences } from './types';
import { loadPreferences } from './services/preferencesService';

// Lazy load tool components to improve initial load time and reduce main bundle size.
const AgentArchitect = lazy(() => import('./components/AgentArchitect'));
const PromptArchitect = lazy(() => import('./components/PromptArchitect'));
const ProjectArchitect = lazy(() => import('./components/ProjectArchitect'));
const MindSeedArchitect = lazy(() => import('./components/MindSeedArchitect'));
const SignalExtractor = lazy(() => import('./components/SignalExtractor'));
const ArchitectureOrganization = lazy(() => import('./components/ArchitectureOrganization'));

const App: React.FC = () => {
  // Use ActiveView to drive full responsive sidebar layout
  const [activeView, setActiveView] = useState<ActiveView>('home');
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [preferences, setPreferences] = useState<UserPreferences | null>(null);

  const [promptArchitectInitialConfig, setPromptArchitectInitialConfig] = useState<PromptConfig | undefined>(undefined);
  const [agentArchitectInitialConfig, setAgentArchitectInitialConfig] = useState<AgentConfig | undefined>(undefined);
  const [projectArchitectInitialConfig, setProjectArchitectInitialConfig] = useState<ProjectConfig | undefined>(undefined);
  const [signalExtractorInitialConfig, setSignalExtractorInitialConfig] = useState<SignalConfig | undefined>(undefined);

  // Load the persisted profile identity once per session (drives the sidebar profile area)
  useEffect(() => {
    loadPreferences().then(setPreferences);
  }, []);

  const handleTransferToPromptArchitect = (config: PromptConfig) => {
    setPromptArchitectInitialConfig(config);
    setActiveView('prompt-standard');
  };

  const renderActiveViewContent = () => {
    switch (activeView) {
      case 'signal-extractor':
        return (
          <SignalExtractor
            onTransfer={handleTransferToPromptArchitect}
            initialConfig={signalExtractorInitialConfig}
            onClearInitialConfig={() => setSignalExtractorInitialConfig(undefined)}
          />
        );
      case 'signal-compression':
        return (
          <SignalExtractor
            onTransfer={handleTransferToPromptArchitect}
            initialTab="compression"
          />
        );
      case 'seed-architect':
        return (
          <SignalExtractor
            onTransfer={handleTransferToPromptArchitect}
            initialTab="seed"
          />
        );
      case 'mindseed':
        return <MindSeedArchitect />;

      case 'prompt-standard':
        return (
          <PromptArchitect
            initialConfig={promptArchitectInitialConfig}
            onClearInitialConfig={() => setPromptArchitectInitialConfig(undefined)}
            initialTab="standard"
          />
        );
      case 'prompt-skill':
        return (
          <PromptArchitect
            initialConfig={promptArchitectInitialConfig}
            onClearInitialConfig={() => setPromptArchitectInitialConfig(undefined)}
            initialTab="system"
          />
        );

      case 'agent-architect':
        return (
          <AgentArchitect
            initialConfig={agentArchitectInitialConfig}
            onClearInitialConfig={() => setAgentArchitectInitialConfig(undefined)}
          />
        );

      case 'project-architect':
        return (
          <ProjectArchitect
            initialConfig={projectArchitectInitialConfig}
            onClearInitialConfig={() => setProjectArchitectInitialConfig(undefined)}
            initialTab="architect"
          />
        );
      case 'roadmap-architect':
        return (
          <ProjectArchitect
            initialConfig={projectArchitectInitialConfig}
            onClearInitialConfig={() => setProjectArchitectInitialConfig(undefined)}
            initialTab="roadmap"
          />
        );
      case 'agent-job':
        return (
          <ProjectArchitect
            initialConfig={projectArchitectInitialConfig}
            onClearInitialConfig={() => setProjectArchitectInitialConfig(undefined)}
            initialTab="agentJob"
          />
        );

      case 'command-center':
        return <ArchitectureOrganization />;

      case 'home':
      default:
        return (
          <LandingPage
            onSelectActiveView={setActiveView}
            onOpenSettings={() => setIsSettingsOpen(true)}
          />
        );
    }
  };

  // Map ActiveView back to breadcrumb trail names
  const getBreadcrumbs = () => {
    const parts = [{ label: 'Home', view: 'home' as ActiveView }];
    if (activeView === 'home') return parts;

    const viewLabels: Record<string, string> = {
      'signal-extractor': 'Signal Extractor',
      'signal-compression': 'Compression Architect',
      'seed-architect': 'Seed Architect',
      'mindseed': 'MindSeed Architect',
      'prompt-standard': 'Standard Prompt',
      'prompt-skill': 'Skill Bundle',
      'agent-architect': 'Agent Architect',
      'project-architect': 'Project Architect',
      'roadmap-architect': 'Roadmap Architect',
      'agent-job': 'Agent Job Book',
      'command-center': 'Command Center'
    };
    parts.push({ label: viewLabels[activeView] || activeView, view: activeView });

    return parts;
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 transition-colors duration-300 flex">
      {/* Persistent left sidebar on desktop, slide-out drawer on mobile */}
      <Sidebar
        activeView={activeView}
        onNavigate={setActiveView}
        isOpenMobile={isMobileSidebarOpen}
        onCloseMobile={() => setIsMobileSidebarOpen(false)}
        preferences={preferences}
        onOpenSettings={() => setIsSettingsOpen(true)}
      />

      {/* Main content viewport wrapping breadcrumb bar and main panel */}
      <div className="flex-1 min-w-0 lg:pl-64 flex flex-col min-h-screen">
        {/* Compact Breadcrumb / Top bar */}
        <header className="h-16 border-b border-slate-200/60 dark:border-slate-800/60 bg-white dark:bg-gray-800 px-4 md:px-8 flex items-center justify-between sticky top-0 z-30 select-none">
          <div className="flex items-center space-x-4">
            {/* Mobile Sidebar Trigger button */}
            <button
              onClick={() => setIsMobileSidebarOpen(true)}
              className="lg:hidden p-2 -ml-2 rounded-xl text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
              aria-label="Open sidebar navigation"
            >
              <span className="material-icons">menu</span>
            </button>

            {/* Breadcrumb path */}
            <nav className="flex items-center space-x-2 text-xs font-semibold text-slate-400 dark:text-slate-500">
              {getBreadcrumbs().map((part, idx, arr) => (
                <React.Fragment key={part.view}>
                  {idx > 0 && <span>/</span>}
                  <button
                    onClick={() => setActiveView(part.view)}
                    disabled={idx === arr.length - 1}
                    className={`transition-colors cursor-pointer ${idx === arr.length - 1
                        ? 'text-slate-700 dark:text-slate-200 font-bold pointer-events-none'
                        : 'hover:text-blue-600 dark:hover:text-blue-400'
                      }`}
                  >
                    {part.label}
                  </button>
                </React.Fragment>
              ))}
            </nav>
          </div>

          <div className="flex items-center space-x-3">
            {/* Context Hub Connection link */}
            <a
              href="https://acidgreenservers.github.io/Noosphere-Reflect/"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white font-semibold rounded-xl shadow-md hover:shadow-lg transition-all duration-300 text-xs cursor-pointer"
            >
              <span className="material-icons mr-1.5 text-sm">hub</span>
              <span className="hidden sm:inline">Context Preservation Hub</span>
              <span className="sm:hidden">Context</span>
            </a>
          </div>
        </header>

        {/* Content body panel */}
        <main className="flex-1 p-4 md:p-8">
          <Suspense fallback={<LoadingSpinner message="Loading tool..." />}>
            {renderActiveViewContent()}
          </Suspense>
        </main>

        <footer className="text-center p-6 text-xs text-slate-400 dark:text-slate-500 border-t border-slate-200/50 dark:border-slate-800/50 mt-12">
          <div className="flex justify-center items-center space-x-4">
            <p className="font-semibold">Prompting Across Substrates</p>
            <span className="text-slate-300 dark:text-slate-700">|</span>
            <a href="https://github.com/acidgreenservers" target="_blank" rel="noopener noreferrer" className="hover:text-blue-500 dark:hover:text-blue-400 transition-colors flex items-center">
              <svg className="w-4 h-4 mr-1.5" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true"><path fillRule="evenodd" d="M12 2C6.477 2 2 6.477 2 12c0 4.418 2.865 8.168 6.839 9.49.5.092.682-.217.682-.482 0-.237-.009-.868-.014-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.031-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.203 2.398.1 2.651.64.7 1.03 1.595 1.03 2.688 0 3.848-2.338 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.001 10.001 0 0022 12c0-5.523-4.477-10-10-10z" clipRule="evenodd" /></svg>
              acidgreenservers
            </a>
          </div>
          <p className="mt-3">Built with React, Vite & Tailwind CSS.</p>
        </footer>
      </div>

      {/* Floating settings — overlays any screen without disturbing the work underneath */}
      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        onPreferencesSaved={setPreferences}
      />
    </div>
  );
};

export default App;

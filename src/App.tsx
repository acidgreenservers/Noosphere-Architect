import React, { useState, Suspense, lazy } from 'react';
import Header from './components/Header';
import LandingPage from './components/LandingPage';
import LoadingSpinner from './components/LoadingSpinner';
import { PromptConfig } from './types';

// Lazy load tool components to improve initial load time and reduce main bundle size.
const AgentArchitect = lazy(() => import('./components/AgentArchitect'));
const PromptArchitect = lazy(() => import('./components/PromptArchitect'));
const ProjectArchitect = lazy(() => import('./components/ProjectArchitect'));
const MindSeedArchitect = lazy(() => import('./components/MindSeedArchitect'));
const AgentApiSettings = lazy(() => import('./components/AgentApiSettings'));
const SignalExtractor = lazy(() => import('./components/SignalExtractor'));
const SignalCompressionArchitect = lazy(() => import('./components/SignalCompressionArchitect'));
const ArchitectureOrganization = lazy(() => import('./components/ArchitectureOrganization'));

export type View = 'landing' | 'agentArchitect' | 'promptArchitect' | 'projectArchitect' | 'mindSeedArchitect' | 'agentApiSettings' | 'signalExtractor' | 'signalCompressionArchitect' | 'architectureOrganization';

const App: React.FC = () => {
  const [view, setView] = useState<View>('landing');
  const [promptArchitectInitialConfig, setPromptArchitectInitialConfig] = useState<PromptConfig | undefined>(undefined);

  const handleTransferToPromptArchitect = (config: PromptConfig) => {
    setPromptArchitectInitialConfig(config);
    setView('promptArchitect');
  };

  const renderView = () => {
    switch (view) {
      case 'agentArchitect':
        return <AgentArchitect />;
      case 'promptArchitect':
        return <PromptArchitect initialConfig={promptArchitectInitialConfig} onClearInitialConfig={() => setPromptArchitectInitialConfig(undefined)} />;
      case 'projectArchitect':
        return <ProjectArchitect />;
      case 'mindSeedArchitect':
        return <MindSeedArchitect />;
      case 'agentApiSettings':
        return <AgentApiSettings />;
      case 'signalExtractor':
        return <SignalExtractor onTransfer={handleTransferToPromptArchitect} />;
      case 'signalCompressionArchitect':
        return <SignalExtractor onTransfer={handleTransferToPromptArchitect} initialTab="compression" />;
      case 'architectureOrganization':
        return <ArchitectureOrganization />;
      case 'landing':
      default:
        return <LandingPage onSelectView={setView} />;
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-900 text-gray-900 dark:text-gray-100 transition-colors duration-300">
      <Header
        onHomeClick={() => setView('landing')}
        onPromptArchitectClick={() => setView('promptArchitect')}
        onProjectArchitectClick={() => setView('projectArchitect')}
        onMindSeedArchitectClick={() => setView('mindSeedArchitect')}
        onAgentApiSettingsClick={() => setView('agentApiSettings')}
        onSignalExtractorClick={() => setView('signalExtractor')}
        onSignalCompressionArchitectClick={() => setView('signalCompressionArchitect')}
        onArchitectureOrganizationClick={() => setView('architectureOrganization')}
        showHomeButton={view !== 'landing'}
      />
      <main className="container mx-auto p-4 md:p-8">
        <Suspense fallback={<LoadingSpinner message="Loading tool..." />}>
          {renderView()}
        </Suspense>
      </main>
      <footer className="text-center p-6 text-sm text-gray-500 dark:text-gray-400 border-t dark:border-gray-800 mt-12">
        <div className="flex justify-center items-center space-x-4">
          <p className="font-semibold">Prompting Across Substrates</p>
          <span className="text-gray-300 dark:text-gray-600">|</span>
          <a href="https://github.com/acidgreenservers" target="_blank" rel="noopener noreferrer" className="hover:text-blue-500 dark:hover:text-blue-400 transition-colors flex items-center">
            <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true"><path fillRule="evenodd" d="M12 2C6.477 2 2 6.477 2 12c0 4.418 2.865 8.168 6.839 9.49.5.092.682-.217.682-.482 0-.237-.009-.868-.014-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.031-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.203 2.398.1 2.651.64.7 1.03 1.595 1.03 2.688 0 3.848-2.338 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.001 10.001 0 0022 12c0-5.523-4.477-10-10-10z" clipRule="evenodd" /></svg>
            acidgreenservers
          </a>
        </div>
        <p className="mt-4">Built with React & Tailwind CSS.</p>
      </footer>
    </div>
  );
};

export default App;
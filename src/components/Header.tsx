
import React from 'react';

interface HeaderProps {
  onHomeClick: () => void;
  onPromptArchitectClick: () => void;
  onProjectArchitectClick: () => void;
  onMindSeedArchitectClick: () => void;
  onAgentApiSettingsClick: () => void;
  onSignalExtractorClick: () => void;
  showHomeButton: boolean;
}

const Header: React.FC<HeaderProps> = ({
  onHomeClick,
  onPromptArchitectClick,
  onProjectArchitectClick,
  onMindSeedArchitectClick,
  onAgentApiSettingsClick,
  onSignalExtractorClick,
  showHomeButton
}) => {
  return (
    <header className="bg-white dark:bg-gray-800 shadow-md sticky top-0 z-40">
      <div className="container mx-auto px-4 py-3 flex items-center justify-between">
        <div className="flex items-center">
          {showHomeButton && (
            <button 
              onClick={onHomeClick} 
              className="flex items-center text-gray-600 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 transition-colors p-2 rounded-full mr-2"
              aria-label="Back to home"
            >
              <span className="material-icons">arrow_back</span>
            </button>
          )}
           <button
            onClick={onSignalExtractorClick}
            className="flex items-center text-gray-600 dark:text-gray-300 hover:text-blue-500 dark:hover:text-blue-400 transition-colors p-2 rounded-full mr-2"
            aria-label="Go to Signal Extractor"
            title="Signal Extractor"
           >
            <span className="material-icons">unarchive</span>
          </button>
          <button
            onClick={onMindSeedArchitectClick}
            className="flex items-center text-gray-600 dark:text-gray-300 hover:text-orange-500 dark:hover:text-orange-400 transition-colors p-2 rounded-full mr-2"
            aria-label="Go to MindSeed Architect"
            title="MindSeed Architect"
           >
            <span className="material-icons">spa</span>
          </button>
           <button
            onClick={onProjectArchitectClick}
            className="flex items-center text-gray-600 dark:text-gray-300 hover:text-green-500 dark:hover:text-green-400 transition-colors p-2 rounded-full mr-2"
            aria-label="Go to Project Architect"
            title="Project Architect"
           >
            <span className="material-icons">architecture</span>
          </button>
           <button 
            onClick={onPromptArchitectClick} 
            className="flex items-center text-gray-600 dark:text-gray-300 hover:text-orange-500 dark:hover:text-orange-400 transition-colors p-2 rounded-full mr-2"
            aria-label="Go to Prompt Architect"
            title="Prompt Architect"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" /></svg>
          </button>
          <button 
            onClick={onAgentApiSettingsClick}
            className="flex items-center text-gray-600 dark:text-gray-300 hover:text-blue-500 dark:hover:text-blue-400 transition-colors p-2 rounded-full mr-2"
            aria-label="Go to Agent API Settings"
            title="Agent API Settings"
          >
            <span className="material-icons">settings</span>
          </button>
          <div className="flex items-center cursor-pointer" onClick={onHomeClick}>
            <span className="material-icons text-blue-500 dark:text-blue-400 text-3xl md:text-4xl mr-3">memory</span>
            <h1 className="text-xl md:text-2xl font-bold text-gray-800 dark:text-gray-100 tracking-tight">
              Noosphere-Architect
            </h1>
          </div>
        </div>

        <a 
          href="https://acidgreenservers.github.io/Noosphere-Nexus/" 
          target="_blank" 
          rel="noopener noreferrer" 
          className="flex items-center px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white font-semibold rounded-lg shadow-md hover:shadow-lg transition-all duration-300 transform hover:-translate-y-px"
        >
          <span className="material-icons mr-2 text-base">hub</span>
          <span className="hidden sm:inline">AI Framework Hub</span>
          <span className="sm:hidden">Frameworks</span>
        </a>
      </div>
    </header>
  );
};

export default Header;


import React, { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { GeneratedFiles } from '../types';
import { sanitizeFilename } from '../utils/security';

interface GeneratedFilesDisplayProps {
  files: GeneratedFiles;
  onSave: () => void;
  agentName?: string;
}

type Tab = 'agentFile' | 'projectGuidelines' | 'constraintsFile' | 'skillFile';

const FileContent: React.FC<{ content: string }> = ({ content }) => (
    <div className="prose prose-sm sm:prose-base dark:prose-invert max-w-none p-6 md:p-10 bg-white dark:bg-gray-900/50 rounded-b-2xl border-x border-b border-gray-200 dark:border-gray-700/50 shadow-inner overflow-y-auto max-h-[70vh] prose-pre:bg-gray-900 prose-pre:text-gray-100">
        <ReactMarkdown remarkPlugins={[remarkGfm]}>{content}</ReactMarkdown>
    </div>
);


const GeneratedFilesDisplay: React.FC<GeneratedFilesDisplayProps> = ({ files, onSave, agentName }) => {
  const [activeTab, setActiveTab] = useState<Tab>('agentFile');
  const [copyAllText, setCopyAllText] = useState('Copy All');

  const tabs: { id: Tab; label: string; icon: string }[] = [
    { id: 'agentFile', label: 'Agent File', icon: 'person' },
    { id: 'projectGuidelines', label: 'Guidelines', icon: 'rule' },
    { id: 'constraintsFile', label: 'Constraints', icon: 'gavel' },
    { id: 'skillFile', label: 'SKILL.md', icon: 'auto_awesome' },
  ];

  const handleCopyAll = () => {
    const allContent = `
--- FILE: agent-persona.md ---

${files.agentFile}

--- FILE: project-guidelines.md ---

${files.projectGuidelines}

--- FILE: constraints-and-guardrails.md ---

${files.constraintsFile}

--- FILE: SKILL.md ---

${files.skillFile}
    `.trim();
    navigator.clipboard.writeText(allContent);
    setCopyAllText('Copied!');
    setTimeout(() => setCopyAllText('Copy All'), 2000);
  };

  const handleExportAll = () => {
    // Sanitize the agent name for use as a filename prefix to prevent path traversal or invalid filenames
    const prefix = sanitizeFilename(agentName || 'agent-export');
    const filesToExport = {
        [`${prefix}-persona.md`]: files.agentFile,
        [`${prefix}-guidelines.md`]: files.projectGuidelines,
        [`${prefix}-constraints.md`]: files.constraintsFile,
        [`SKILL.md`]: files.skillFile,
    };

    for (const [filename, content] of Object.entries(filesToExport)) {
        const blob = new Blob([content], { type: 'text/markdown;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    }
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg mt-10">
        <div className="flex flex-wrap justify-between items-center p-4 border-b border-gray-200 dark:border-gray-700 gap-4">
            <h3 className="text-xl font-semibold">Generated Project Files</h3>
            <div className="flex items-center space-x-2">
                <button onClick={handleCopyAll} className="flex items-center px-3 py-1.5 border rounded-md text-sm" title="Copy all files">
                    <span className="material-icons text-base mr-1.5">collections</span>{copyAllText}
                </button>
                <button onClick={handleExportAll} className="flex items-center px-3 py-1.5 border rounded-md text-sm" title="Export all files">
                    <span className="material-icons text-base mr-1.5">download</span>Export All
                </button>
                 <button 
                    onClick={onSave} 
                    className="flex items-center px-3 py-1.5 border border-transparent rounded-md text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 transition" 
                    title="Save agent files"
                >
                    <span className="material-icons text-base mr-1.5">save</span>
                    Save
                </button>
            </div>
        </div>
      <div className="border-b border-gray-200 dark:border-gray-700">
        <nav className="-mb-px flex space-x-1 sm:space-x-4 px-4" aria-label="Tabs">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`
                ${activeTab === tab.id
                  ? 'border-blue-500 text-blue-600 dark:border-blue-400 dark:text-blue-300'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-200 dark:hover:border-gray-600'
                }
                flex items-center whitespace-nowrap py-4 px-1 sm:px-2 border-b-2 font-medium text-sm transition-colors focus:outline-none
              `}
            >
              <span className="material-icons text-base mr-2">{tab.icon}</span>
              {tab.label}
            </button>
          ))}
        </nav>
      </div>
      <div>
        <FileContent content={files[activeTab]} />
      </div>
    </div>
  );
};

export default GeneratedFilesDisplay;

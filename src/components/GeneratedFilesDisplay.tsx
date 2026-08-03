
import React, { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { GeneratedFiles } from '../types';
import { sanitizeFilename } from '../utils/security';
import { fallbackCopyTextToClipboard } from '../utils/clipboard';

interface GeneratedFilesDisplayProps {
  files: GeneratedFiles;
  onSave: () => void;
  agentName?: string;
}

type Tab = 'agentFile' | 'projectGuidelines' | 'constraintsFile' | 'skillFile';

const FileContent: React.FC<{ content: string }> = ({ content }) => (
    <div className="prose prose-slate dark:prose-invert max-w-none py-8 px-2 md:px-4 bg-transparent transition-all duration-300 overflow-y-auto max-h-[75vh] custom-scrollbar prose-pre:bg-slate-900/60 dark:prose-pre:bg-slate-950/40 prose-pre:text-slate-100 prose-pre:rounded-2xl prose-pre:border prose-pre:border-slate-200/50 dark:prose-pre:border-slate-800/40 prose-blockquote:border-l-2 prose-blockquote:border-blue-500 prose-blockquote:bg-blue-500/5 dark:prose-blockquote:bg-blue-500/5 prose-blockquote:py-4 prose-blockquote:px-6 prose-blockquote:rounded-r-2xl prose-blockquote:italic prose-blockquote:text-lg sm:prose-blockquote:text-xl prose-blockquote:font-normal prose-blockquote:not-italic prose-blockquote:my-6 prose-p:leading-relaxed prose-headings:font-semibold">
        <ReactMarkdown remarkPlugins={[remarkGfm]}>{content}</ReactMarkdown>
    </div>
);


const GeneratedFilesDisplay: React.FC<GeneratedFilesDisplayProps> = ({ files, onSave, agentName }) => {
  const [activeTab, setActiveTab] = useState<Tab>('agentFile');
  const [isCopied, setIsCopied] = useState(false);
  const [exportAllText, setExportAllText] = useState('Export All');

  const tabs: { id: Tab; label: string; icon: string }[] = [
    { id: 'agentFile', label: 'Agent File', icon: 'person' },
    { id: 'projectGuidelines', label: 'Guidelines', icon: 'rule' },
    { id: 'constraintsFile', label: 'Constraints', icon: 'gavel' },
    { id: 'skillFile', label: 'SKILL.md', icon: 'auto_awesome' },
  ];

  const handleCopyAll = async () => {
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
    await fallbackCopyTextToClipboard(allContent);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  const handleExportAll = () => {
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
    setExportAllText('Exported!');
    setTimeout(() => setExportAllText('Export All'), 2000);
  };

  return (
    <div className="bg-transparent mt-12 animate-fade-in">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between pb-6 mb-2 border-b border-slate-200/60 dark:border-slate-800/50 gap-4">
            <div>
                <h3 className="text-xl font-bold text-slate-800 dark:text-slate-200">Generated Project Files</h3>
                <p className="text-xs text-slate-500 mt-1">Crystallized architectural assets based on your configuration.</p>
            </div>
            <div className="flex items-center space-x-3">
                <button onClick={handleCopyAll} className={`flex items-center px-4 py-2 border rounded-xl text-sm font-medium transition-all duration-250 cursor-pointer ${isCopied ? 'bg-green-500/10 text-green-600 dark:text-green-400 border-green-500/20' : 'border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-900/60'}`} title="Copy all files">
                    <span className="material-icons text-base mr-2">{isCopied ? 'check' : 'collections'}</span>{isCopied ? 'Copied' : 'Copy All'}
                </button>
                <button onClick={handleExportAll} className="flex items-center px-4 py-2 border border-slate-200 dark:border-slate-800 rounded-xl text-sm font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-900/60 transition-all duration-250 cursor-pointer" title="Export all files">
                    <span className="material-icons text-base mr-2">{exportAllText === 'Exported!' ? 'check_circle' : 'download'}</span>{exportAllText}
                </button>
                <button
                    onClick={onSave} 
                    className="flex items-center px-4 py-2 border border-transparent rounded-xl text-sm font-semibold text-white bg-blue-600 hover:bg-blue-500 transition-all duration-250 cursor-pointer shadow-sm shadow-blue-500/10"
                    title="Save agent files"
                >
                    <span className="material-icons text-base mr-2">save</span>
                    Save
                </button>
            </div>
        </div>
      <div className="mb-4">
        <nav className="flex flex-wrap gap-2" aria-label="Tabs">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`
                ${activeTab === tab.id
                  ? 'bg-blue-600 text-white shadow-md shadow-blue-600/10'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-900/50'
                }
                flex items-center whitespace-nowrap py-2 px-4 rounded-xl font-semibold text-xs transition-all duration-200 cursor-pointer focus:outline-none
              `}
            >
              <span className="material-icons text-sm mr-2">{tab.icon}</span>
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

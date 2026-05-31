
import React, { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { GeneratedProjectFiles } from '../types';
import { sanitizeFilename } from '../utils/security';

interface GeneratedProjectDisplayProps {
  files: GeneratedProjectFiles;
  onSave: () => void;
  projectName?: string;
}

type Tab = 'overviewFile' | 'standardsFile' | 'rulesFile';

const FileContent: React.FC<{ content: string }> = ({ content }) => (
    <div className="prose prose-sm sm:prose-base dark:prose-invert max-w-none p-6 md:p-10 bg-white dark:bg-gray-900/50 rounded-b-2xl border-x border-b border-gray-200 dark:border-gray-700/50 shadow-inner overflow-y-auto max-h-[70vh] prose-pre:bg-gray-900 prose-pre:text-gray-100 prose-blockquote:border-l-4 prose-blockquote:border-blue-500 prose-blockquote:bg-gray-50 dark:prose-blockquote:bg-gray-800/50 prose-blockquote:py-2 prose-blockquote:px-4 prose-blockquote:rounded-r-lg prose-blockquote:italic prose-blockquote:text-xl sm:prose-blockquote:text-2xl">
        <ReactMarkdown remarkPlugins={[remarkGfm]}>{content}</ReactMarkdown>
    </div>
);


const GeneratedProjectDisplay: React.FC<GeneratedProjectDisplayProps> = ({ files, onSave, projectName }) => {
  const [activeTab, setActiveTab] = useState<Tab>('overviewFile');
  const [copyAllText, setCopyAllText] = useState('Copy All');
  const [exportAllText, setExportAllText] = useState('Export All');

  const tabs: { id: Tab; label: string; icon: string }[] = [
    { id: 'overviewFile', label: 'PROJECT.md', icon: 'description' },
    { id: 'standardsFile', label: 'ARCHITECTURE.md', icon: 'account_tree' },
    { id: 'rulesFile', label: 'SECURITY.md', icon: 'security' },
  ];

  const handleCopyAll = () => {
    const allContent = `
--- FILE: PROJECT.md ---

${files.overviewFile}

--- FILE: ARCHITECTURE.md ---

${files.standardsFile}

--- FILE: SECURITY.md ---

${files.rulesFile}
    `.trim();
    navigator.clipboard.writeText(allContent);
    setCopyAllText('Copied!');
    setTimeout(() => setCopyAllText('Copy All'), 2000);
  };

  const handleExportAll = () => {
    // Sanitize the project name for use as a filename prefix to prevent path traversal or invalid filenames
    const prefix = sanitizeFilename(projectName || 'project-export');
    const filesToExport = {
        [`${prefix}-PROJECT.md`]: files.overviewFile,
        [`${prefix}-ARCHITECTURE.md`]: files.standardsFile,
        [`${prefix}-SECURITY.md`]: files.rulesFile,
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
    <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg mt-10">
        <div className="flex flex-wrap justify-between items-center p-4 border-b border-gray-200 dark:border-gray-700 gap-4">
            <h3 className="text-xl font-semibold">Generated Project Blueprint</h3>
            <div className="flex items-center space-x-2">
                <button onClick={handleCopyAll} className="flex items-center px-3 py-1.5 border rounded-md text-sm" title="Copy all files">
                    <span className="material-icons text-base mr-1.5">collections</span>{copyAllText}
                </button>
                <button onClick={handleExportAll} className="flex items-center px-3 py-1.5 border rounded-md text-sm transition-colors hover:bg-gray-50 dark:hover:bg-gray-700" title="Export all files">
                    <span className="material-icons text-base mr-1.5">{exportAllText === 'Exported!' ? 'check_circle' : 'download'}</span>{exportAllText}
                </button>
                 <button 
                    onClick={onSave} 
                    className="flex items-center px-3 py-1.5 border border-transparent rounded-md text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 transition" 
                    title="Save project blueprint"
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

export default GeneratedProjectDisplay;


import React, { useState, useEffect } from 'react';
import Modal from './Modal';

interface PreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  content?: string | Record<string, string>;
  mindSeed?: {
    seed: string;
    pattern: string;
    deployWhen: string;
  };
  onCopy: () => void;
  onExport: () => void;
  onDelete?: () => void;
}

const PreviewModal: React.FC<PreviewModalProps> = ({
  isOpen,
  onClose,
  title,
  content,
  mindSeed,
  onCopy,
  onExport,
  onDelete
}) => {
  const [activeTab, setActiveTab] = useState<string>('');

  useEffect(() => {
    if (isOpen && content && typeof content === 'object') {
      setActiveTab(Object.keys(content)[0]);
    }
  }, [isOpen, content]);

  if (!isOpen) return null;

  const renderContent = () => {
    if (mindSeed) {
      return (
        <div className="space-y-6">
          <div className="mb-4">
            <blockquote className="border-l-4 border-blue-500 pl-4 py-2 italic text-xl text-gray-800 dark:text-gray-200">
              "{mindSeed.seed}"
            </blockquote>
          </div>
          <div className="overflow-hidden border border-gray-200 dark:border-gray-700 rounded-lg">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead className="bg-gray-50 dark:bg-gray-900/50">
                <tr>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Seed</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Pattern</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Deploy When</th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                <tr>
                  <td className="px-4 py-3 text-sm italic text-gray-900 dark:text-gray-100">"{mindSeed.seed}"</td>
                  <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400" dangerouslySetInnerHTML={{ __html: mindSeed.pattern.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>') }}></td>
                  <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">{mindSeed.deployWhen}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      );
    }

    if (typeof content === 'string') {
      return (
        <div className="p-4 bg-gray-50 dark:bg-gray-900/70 rounded-lg whitespace-pre-wrap font-mono text-sm border border-gray-200 dark:border-gray-700 max-h-[60vh] overflow-y-auto">
          {content}
        </div>
      );
    }

    if (content && typeof content === 'object') {
      const filenames = Object.keys(content);
      const currentContent = content[activeTab] || '';

      return (
        <div className="space-y-4">
          <div className="flex flex-wrap gap-2 border-b border-gray-200 dark:border-gray-700 pb-2">
            {filenames.map(name => (
              <button
                key={name}
                onClick={() => setActiveTab(name)}
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                  activeTab === name
                    ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300'
                    : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
                }`}
              >
                {name}
              </button>
            ))}
          </div>
          <div className="p-4 bg-gray-50 dark:bg-gray-900/70 rounded-lg whitespace-pre-wrap font-mono text-sm border border-gray-200 dark:border-gray-700 max-h-[50vh] overflow-y-auto">
            {currentContent}
          </div>
        </div>
      );
    }

    return null;
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title}>
      <div className="flex flex-col h-full">
        <div className="flex-grow overflow-y-auto min-h-[200px]">
          {renderContent()}
        </div>
        <div className="flex justify-end items-center gap-2 mt-8 pt-4 border-t border-gray-100 dark:border-gray-800">
           {onDelete && (
             <button
                onClick={onDelete}
                className="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                title="Delete Entry"
              >
                <span className="material-icons">delete</span>
              </button>
           )}
           <div className="flex-grow" />
           <button
              onClick={onCopy}
              className="p-2 text-gray-500 hover:text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors"
              title="Copy to Clipboard"
            >
              <span className="material-icons">content_copy</span>
            </button>
            <button
              onClick={onExport}
              className="p-2 text-gray-500 hover:text-green-500 hover:bg-green-50 dark:hover:bg-green-900/20 rounded-lg transition-colors"
              title="Export File"
            >
              <span className="material-icons">download</span>
            </button>
            <button
              onClick={onClose}
              className="ml-2 px-6 py-2 bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900 rounded-xl font-bold hover:opacity-90 transition-opacity"
            >
              Close
            </button>
        </div>
      </div>
    </Modal>
  );
};

export default PreviewModal;

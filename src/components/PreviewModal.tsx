
import React, { useState, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import Modal from './Modal';
import { LibraryMetadata } from '../types';

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
  metadata?: LibraryMetadata;
  onUpdateMetadata?: (metadata: LibraryMetadata) => void;
  onCopy: () => void;
  onExport: () => void;
  onDelete?: () => void;
  categoryOptions?: string[];
}

const PreviewModal: React.FC<PreviewModalProps> = ({
  isOpen,
  onClose,
  title,
  content,
  mindSeed,
  metadata,
  onUpdateMetadata,
  onCopy,
  onExport,
  onDelete,
  categoryOptions
}) => {
  const [activeTab, setActiveTab] = useState<string>('');
  const [copyStatus, setCopyStatus] = useState(false);
  const [exportStatus, setExportStatus] = useState(false);

  useEffect(() => {
    if (isOpen && content && typeof content === 'object') {
      setActiveTab(Object.keys(content)[0]);
    }
    if (!isOpen) {
      setCopyStatus(false);
      setExportStatus(false);
    }
  }, [isOpen, content]);

  if (!isOpen) return null;

  const handleCopy = () => {
    onCopy();
    setCopyStatus(true);
    setTimeout(() => setCopyStatus(false), 2000);
  };

  const handleExport = () => {
    onExport();
    setExportStatus(true);
    setTimeout(() => setExportStatus(false), 2000);
  };

  const renderContent = () => {
    if (mindSeed) {
      return (
        <div className="space-y-6">
          <div className="mb-4">
            <blockquote className="border-l-4 border-blue-500 pl-4 py-2 italic text-xl text-gray-800 dark:text-gray-200 bg-gray-50 dark:bg-gray-900/40 rounded-r-lg">
              "{mindSeed.seed}"
            </blockquote>
          </div>
          <div className="overflow-hidden border border-gray-200 dark:border-gray-700 rounded-lg shadow-sm">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead className="bg-gray-50 dark:bg-gray-900/50">
                <tr>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Seed</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Pattern</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Deploy When</th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                <tr>
                  <td className="px-4 py-3 text-sm italic text-gray-900 dark:text-gray-100 font-medium">"{mindSeed.seed}"</td>
                  <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-300">
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>{mindSeed.pattern}</ReactMarkdown>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-300">{mindSeed.deployWhen}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      );
    }

    if (typeof content === 'string') {
      return (
        <div className="p-6 bg-white dark:bg-gray-800/50 rounded-xl border border-gray-200 dark:border-gray-700 max-h-[60vh] overflow-y-auto shadow-inner prose prose-sm sm:prose-base dark:prose-invert max-w-none prose-pre:bg-gray-900 prose-pre:text-gray-100 prose-blockquote:border-l-4 prose-blockquote:border-blue-500 prose-blockquote:bg-gray-50 dark:prose-blockquote:bg-gray-800/50 prose-blockquote:py-2 prose-blockquote:px-4 prose-blockquote:rounded-r-lg prose-blockquote:italic prose-blockquote:text-xl sm:prose-blockquote:text-2xl">
          <ReactMarkdown remarkPlugins={[remarkGfm]}>{content}</ReactMarkdown>
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
                className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${
                  activeTab === name
                    ? 'bg-blue-600 text-white shadow-md'
                    : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700'
                }`}
              >
                {name}
              </button>
            ))}
          </div>
          <div className="p-6 bg-white dark:bg-gray-800/50 rounded-xl border border-gray-200 dark:border-gray-700 max-h-[50vh] overflow-y-auto shadow-inner prose prose-sm sm:prose-base dark:prose-invert max-w-none prose-pre:bg-gray-900 prose-pre:text-gray-100 prose-blockquote:border-l-4 prose-blockquote:border-blue-500 prose-blockquote:bg-gray-50 dark:prose-blockquote:bg-gray-800/50 prose-blockquote:py-2 prose-blockquote:px-4 prose-blockquote:rounded-r-lg prose-blockquote:italic prose-blockquote:text-xl sm:prose-blockquote:text-2xl">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>{currentContent}</ReactMarkdown>
          </div>
        </div>
      );
    }

    return null;
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title}>
      <div className="flex flex-col h-full">
        {metadata && onUpdateMetadata && (
            <div className="flex flex-wrap items-center gap-4 mb-6 p-3 bg-gray-50 dark:bg-gray-900/50 rounded-xl border border-gray-200 dark:border-gray-700">
                <div className="flex items-center gap-1">
                    <button
                        onClick={() => onUpdateMetadata({ ...metadata, isStarred: !metadata.isStarred })}
                        className={`p-2 rounded-lg transition-colors ${metadata.isStarred ? 'text-amber-500 bg-amber-50 dark:bg-amber-900/20' : 'text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'}`}
                        title="Star"
                    >
                        <span className="material-icons">{metadata.isStarred ? 'star' : 'star_outline'}</span>
                    </button>
                    <button
                        onClick={() => onUpdateMetadata({ ...metadata, isPinned: !metadata.isPinned })}
                        className={`p-2 rounded-lg transition-colors ${metadata.isPinned ? 'text-blue-500 bg-blue-50 dark:bg-blue-900/20' : 'text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'}`}
                        title="Pin"
                    >
                        <span className="material-icons">push_pin</span>
                    </button>
                    <button
                        onClick={() => onUpdateMetadata({ ...metadata, isArchived: !metadata.isArchived })}
                        className={`p-2 rounded-lg transition-colors ${metadata.isArchived ? 'text-purple-500 bg-purple-50 dark:bg-purple-900/20' : 'text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'}`}
                        title="Archive"
                    >
                        <span className="material-icons">{metadata.isArchived ? 'unarchive' : 'archive'}</span>
                    </button>
                </div>
                <div className="h-6 w-px bg-gray-300 dark:bg-gray-600 hidden sm:block" />
                <div className="flex items-center gap-2 flex-grow">
                    <select
                        value=""
                        onChange={(e) => {
                            if (e.target.value) {
                                onUpdateMetadata({ ...metadata, category: e.target.value });
                            }
                        }}
                        className="bg-transparent border-none focus:ring-0 text-sm text-gray-400 cursor-pointer hover:text-blue-500 transition-colors w-8"
                        title="Select existing category"
                    >
                        <option value="" disabled className="text-gray-400">──</option>
                        {categoryOptions && categoryOptions.length > 0 ? (
                            categoryOptions.map(cat => (
                                <option key={cat} value={cat} className="text-gray-700 dark:text-gray-300">
                                    {cat}
                                </option>
                            ))
                        ) : (
                            <option value="" disabled className="text-gray-400">No categories yet</option>
                        )}
                    </select>
                    <input
                        type="text"
                        value={metadata.category || ''}
                        onChange={(e) => onUpdateMetadata({ ...metadata, category: e.target.value })}
                        placeholder="Assign category..."
                        className="bg-transparent border-none focus:ring-0 text-sm text-gray-700 dark:text-gray-300 w-full"
                        list="preview-category-suggestions"
                    />
                    {categoryOptions && categoryOptions.length > 0 && (
                        <datalist id="preview-category-suggestions">
                            {categoryOptions.map(cat => (
                                <option key={cat} value={cat} />
                            ))}
                        </datalist>
                    )}
                </div>
            </div>
        )}
        <div className="flex-grow overflow-y-auto min-h-[200px] px-1">
          {renderContent()}
        </div>
        <div className="flex justify-end items-center gap-2 mt-8 pt-4 border-t border-gray-100 dark:border-gray-800">
           {onDelete && (
             <button
                onClick={onDelete}
                className="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors group"
                title="Delete Entry"
              >
                <span className="material-icons group-hover:scale-110 transition-transform">delete</span>
              </button>
           )}
           <div className="flex-grow" />
           <button
              onClick={handleCopy}
              className={`p-2 rounded-lg transition-all flex items-center gap-2 ${
                copyStatus
                ? 'text-blue-600 bg-blue-50 dark:bg-blue-900/30 font-bold px-4'
                : 'text-gray-500 hover:text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20'
              }`}
              title="Copy to Clipboard"
            >
              <span className={`material-icons ${copyStatus ? 'text-sm' : ''}`}>{copyStatus ? 'check' : 'content_copy'}</span>
              {copyStatus && <span className="text-xs">Copied!</span>}
            </button>
            <button
              onClick={handleExport}
              className={`p-2 rounded-lg transition-all flex items-center gap-2 ${
                exportStatus
                ? 'text-green-600 bg-green-50 dark:bg-green-900/30 font-bold px-4'
                : 'text-gray-500 hover:text-green-500 hover:bg-green-50 dark:hover:bg-green-900/20'
              }`}
              title="Export File"
            >
              <span className={`material-icons ${exportStatus ? 'text-sm' : ''}`}>{exportStatus ? 'check_circle' : 'download'}</span>
              {exportStatus && <span className="text-xs">Exported!</span>}
            </button>
            <button
              onClick={onClose}
              className="ml-2 px-6 py-2 bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900 rounded-xl font-bold hover:opacity-90 transition-all hover:scale-105 active:scale-95"
            >
              Close
            </button>
        </div>
      </div>
    </Modal>
  );
};

export default PreviewModal;

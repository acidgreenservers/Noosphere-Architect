
import React, { useState, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import Modal from './Modal';
import { LibraryMetadata, SavedSeed } from '../types';
import CircularSignalGraph from './CircularSignalGraph';

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
  seedArchitect?: SavedSeed;
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
  seedArchitect,
  metadata,
  onUpdateMetadata,
  onCopy,
  onDelete,
  categoryOptions
}) => {
  const [activeTab, setActiveTab] = useState<string>('');
  const [copyStatus, setCopyStatus] = useState(false);

  useEffect(() => {
    if (isOpen && content && typeof content === 'object') {
      setActiveTab(Object.keys(content)[0]);
    }
    if (!isOpen) {
      setCopyStatus(false);
    }
  }, [isOpen, content]);

  if (!isOpen) return null;

  const handleCopy = () => {
    onCopy();
    setCopyStatus(true);
    setTimeout(() => setCopyStatus(false), 2000);
  };


  const renderContent = () => {
    if (seedArchitect) {
      const filenames = content && typeof content === 'object' ? Object.keys(content) : [];
      const currentTab = activeTab || (filenames.length > 0 ? filenames[0] : '');

      return (
        <div className="space-y-8">
          {/* Top Bento Header Bar: Chips & Badges */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="md:col-span-1 bg-slate-50 dark:bg-slate-900/40 p-5 rounded-2xl border border-slate-100 dark:border-slate-800/60 flex flex-col justify-center items-center">
              <span className={`px-4 py-1.5 rounded-full text-xs font-black uppercase tracking-[0.2em] shadow-sm ${
                seedArchitect.result.status === 'Pass' 
                ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30' 
                : 'bg-rose-500/15 text-rose-600 dark:text-rose-400 border border-rose-500/30'
              }`}>
                Verification: {seedArchitect.result.status}
              </span>
              <div className="mt-4 flex flex-wrap justify-center gap-2">
                <span className="text-[11px] font-bold px-3 py-1 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20">
                  Tightness: {seedArchitect.result.graphData.tightness}/10
                </span>
                <span className="text-[11px] font-bold px-3 py-1 rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20">
                  Gradient: {seedArchitect.result.graphData.gradient}
                </span>
              </div>
            </div>

            <div className="md:col-span-2 bg-slate-50 dark:bg-slate-900/40 p-5 rounded-2xl border border-slate-100 dark:border-slate-800/60 flex flex-col justify-center">
              <h4 className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-2 flex items-center">
                <span className="material-icons text-sm mr-1.5 text-blue-500">label</span>
                Theme & Signals
              </h4>
              <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                {seedArchitect.result.graphData.recurringTheme}
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-2 italic">
                {seedArchitect.result.graphData.semanticSignals}
              </p>
            </div>
          </div>

          {/* Main Bento Row: Circular Graph Tile + Explanation Tile */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
            <div className="lg:col-span-5 bg-transparent p-5 rounded-2xl border border-slate-200/60 dark:border-slate-800/60 flex items-center justify-center">
              <CircularSignalGraph data={seedArchitect.result.graphData} />
            </div>

            <div className="lg:col-span-7 bg-transparent p-6 rounded-2xl border border-slate-200/60 dark:border-slate-800/60 flex flex-col">
              <h4 className="text-base font-bold text-slate-900 dark:text-slate-100 mb-4 flex items-center">
                 <span className="material-icons mr-2.5 text-blue-500">description</span>
                 Analysis Details
              </h4>
              <div className="prose prose-slate prose-sm dark:prose-invert max-w-none text-slate-600 dark:text-slate-300 leading-relaxed bg-slate-50 dark:bg-slate-900/40 p-5 rounded-2xl border border-slate-100 dark:border-slate-800/60 flex-1 min-h-[220px] overflow-y-auto custom-scrollbar">
                  {seedArchitect.result.explanation}
              </div>
            </div>
          </div>

          {/* Bottom Bento Row: Sub-Tabs Inspector */}
          {filenames.length > 0 && (
            <div className="bg-transparent p-5 rounded-2xl border border-slate-200/60 dark:border-slate-800/60 space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
                <div className="flex flex-wrap gap-2">
                  {filenames.map(name => (
                    <button
                      key={name}
                      onClick={() => setActiveTab(name)}
                      className={`px-4 py-1.5 text-xs font-bold rounded-xl transition-all cursor-pointer ${
                        currentTab === name
                          ? 'bg-blue-600 text-white shadow-md'
                          : 'text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800'
                      }`}
                    >
                      {name}
                    </button>
                  ))}
                </div>
                <span className="text-[11px] font-mono text-slate-400 uppercase tracking-wider hidden sm:inline">
                  Interactive Inspector
                </span>
              </div>
              <div className="p-5 bg-slate-50 dark:bg-slate-900/80 rounded-2xl border border-slate-100 dark:border-slate-800/60 max-h-[35vh] overflow-y-auto shadow-inner prose prose-slate prose-sm dark:prose-invert max-w-none font-mono text-xs custom-scrollbar">
                <ReactMarkdown remarkPlugins={[remarkGfm]}>{(content as Record<string, string>)[currentTab] || ''}</ReactMarkdown>
              </div>
            </div>
          )}
        </div>
      );
    }
    if (mindSeed) {
      return (
        <div className="space-y-6">
          <div className="mb-4">
            <blockquote className="border-l-2 border-blue-500 pl-5 py-4 italic text-lg text-slate-800 dark:text-slate-200 bg-slate-50 dark:bg-slate-900/40 rounded-r-2xl">
              "{mindSeed.seed}"
            </blockquote>
          </div>
          <div className="overflow-hidden border border-slate-200 dark:border-slate-800 rounded-2xl">
            <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-800">
              <thead className="bg-slate-50 dark:bg-slate-900/50">
                <tr>
                  <th className="px-5 py-3 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Seed</th>
                  <th className="px-5 py-3 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Pattern</th>
                  <th className="px-5 py-3 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Deploy When</th>
                </tr>
              </thead>
              <tbody className="bg-transparent divide-y divide-slate-200 dark:divide-slate-800">
                <tr>
                  <td className="px-5 py-4 text-sm italic text-slate-900 dark:text-slate-100 font-semibold">"{mindSeed.seed}"</td>
                  <td className="px-5 py-4 text-sm text-slate-600 dark:text-slate-300">
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>{mindSeed.pattern}</ReactMarkdown>
                  </td>
                  <td className="px-5 py-4 text-sm text-slate-600 dark:text-slate-300">{mindSeed.deployWhen}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      );
    }

    if (typeof content === 'string') {
      return (
        <div className="py-6 px-1 max-h-[60vh] overflow-y-auto custom-scrollbar prose prose-slate prose-sm sm:prose-base dark:prose-invert max-w-none prose-pre:bg-slate-900/60 prose-pre:text-slate-100 prose-blockquote:border-l-2 prose-blockquote:border-blue-500 prose-blockquote:bg-blue-500/5 prose-blockquote:py-4 prose-blockquote:px-6 prose-blockquote:rounded-r-2xl prose-blockquote:italic prose-blockquote:text-lg sm:prose-blockquote:text-xl">
          <ReactMarkdown remarkPlugins={[remarkGfm]}>{content}</ReactMarkdown>
        </div>
      );
    }

    if (content && typeof content === 'object') {
      const filenames = Object.keys(content);
      const currentContent = content[activeTab] || '';

      return (
        <div className="space-y-6">
          <div className="flex flex-wrap gap-2 border-b border-slate-200/60 dark:border-slate-800/50 pb-3">
            {filenames.map(name => (
              <button
                key={name}
                onClick={() => setActiveTab(name)}
                className={`px-4 py-1.5 text-xs font-bold rounded-xl transition-all cursor-pointer ${
                  activeTab === name
                    ? 'bg-blue-600 text-white shadow-md'
                    : 'text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700'
                }`}
              >
                {name}
              </button>
            ))}
          </div>
          <div className="py-6 px-1 max-h-[50vh] overflow-y-auto custom-scrollbar prose prose-slate prose-sm sm:prose-base dark:prose-invert max-w-none prose-pre:bg-slate-900/60 prose-pre:text-slate-100 prose-blockquote:border-l-2 prose-blockquote:border-blue-500 prose-blockquote:bg-blue-500/5 prose-blockquote:py-4 prose-blockquote:px-6 prose-blockquote:rounded-r-2xl prose-blockquote:italic">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>{currentContent}</ReactMarkdown>
          </div>
        </div>
      );
    }

    return null;
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title} maxWidthClass="max-w-6xl">
      <div className="flex flex-col h-full animate-fade-in">
        {metadata && onUpdateMetadata && (
            <div className="flex flex-wrap items-center gap-4 mb-6 p-4 bg-slate-50 dark:bg-slate-900/30 rounded-2xl border border-slate-200/60 dark:border-slate-800/50">
                <div className="flex items-center gap-2">
                    <button
                        onClick={() => onUpdateMetadata({ ...metadata, isStarred: !metadata.isStarred })}
                        className={`p-2 rounded-xl transition-colors cursor-pointer ${metadata.isStarred ? 'text-amber-500 bg-amber-500/10' : 'text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'}`}
                        title="Star"
                    >
                        <span className="material-icons">{metadata.isStarred ? 'star' : 'star_outline'}</span>
                    </button>
                    <button
                        onClick={() => onUpdateMetadata({ ...metadata, isPinned: !metadata.isPinned })}
                        className={`p-2 rounded-xl transition-colors cursor-pointer ${metadata.isPinned ? 'text-blue-500 bg-blue-500/10' : 'text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'}`}
                        title="Pin"
                    >
                        <span className="material-icons">push_pin</span>
                    </button>
                    <button
                        onClick={() => onUpdateMetadata({ ...metadata, isArchived: !metadata.isArchived })}
                        className={`p-2 rounded-xl transition-colors cursor-pointer ${metadata.isArchived ? 'text-purple-500 bg-purple-500/10' : 'text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'}`}
                        title="Archive"
                    >
                        <span className="material-icons">{metadata.isArchived ? 'unarchive' : 'archive'}</span>
                    </button>
                </div>
                <div className="h-6 w-px bg-slate-300 dark:bg-slate-700 hidden sm:block" />
                <div className="flex items-center gap-3 flex-grow">
                    <select
                        value=""
                        onChange={(e) => {
                            if (e.target.value) {
                                onUpdateMetadata({ ...metadata, category: e.target.value });
                            }
                        }}
                        className="bg-transparent border-none focus:ring-0 text-sm text-slate-400 cursor-pointer hover:text-blue-500 transition-colors w-8"
                        title="Select existing category"
                    >
                        <option value="" disabled className="text-slate-400">──</option>
                        {categoryOptions && categoryOptions.length > 0 ? (
                            categoryOptions.map(cat => (
                                <option key={cat} value={cat} className="text-slate-700 dark:text-slate-300">
                                    {cat}
                                </option>
                            ))
                        ) : (
                            <option value="" disabled className="text-slate-400">No categories yet</option>
                        )}
                    </select>
                    <input
                        type="text"
                        value={metadata.category || ''}
                        onChange={(e) => onUpdateMetadata({ ...metadata, category: e.target.value })}
                        placeholder="Assign category..."
                        className="bg-transparent border-none focus:ring-0 text-sm text-slate-700 dark:text-slate-300 w-full"
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
        <div className="flex-grow overflow-y-auto min-h-[200px] px-1 custom-scrollbar">
          {renderContent()}
        </div>
        <div className="flex justify-end items-center gap-3 mt-8 pt-4 border-t border-slate-100 dark:border-slate-800/80">
           {onDelete && (
             <button
                onClick={onDelete}
                className="p-2 text-rose-500 hover:bg-rose-500/10 rounded-xl transition-colors group cursor-pointer"
                title="Delete Entry"
              >
                <span className="material-icons group-hover:scale-105 transition-transform">delete</span>
              </button>
           )}
           <div className="flex-grow" />
           <button
              onClick={handleCopy}
              className={`p-2 rounded-xl transition-all cursor-pointer flex items-center gap-2 ${
                copyStatus
                ? 'text-blue-600 bg-blue-500/10 font-bold px-4'
                : 'text-slate-500 hover:text-blue-500 hover:bg-blue-500/5'
              }`}
              title="Copy to Clipboard"
            >
              <span className={`material-icons ${copyStatus ? 'text-sm' : ''}`}>{copyStatus ? 'check' : 'content_copy'}</span>
              {copyStatus && <span className="text-xs">Copied!</span>}
            </button>
            <button
              onClick={onClose}
              className="ml-2 px-6 py-2.5 bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 rounded-xl font-semibold hover:opacity-90 transition-all hover:scale-[1.02] active:scale-[0.98] cursor-pointer"
            >
              Close
            </button>
        </div>
      </div>
    </Modal>
  );
};

export default PreviewModal;

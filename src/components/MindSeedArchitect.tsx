import React, { useState, useEffect, useRef } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { MindSeedConfig, GeneratedMindSeed, SavedMindSeed, MindSeedType } from '../types';
import { generateMindSeed } from '../services/ai/mindSeedService';
import { AbortError } from '../services/ai/openRouter';
import * as db from '../services/dbService';
import { sanitizeFilename } from '../utils/security';
import LoadingSpinner from './LoadingSpinner';
import Toast from './Toast';
import { fallbackCopyTextToClipboard } from '../utils/clipboard';
import Modal from './Modal';
import PreviewModal from './PreviewModal';
import LibraryItem from './LibraryItem';
import { StarredPinnedBar } from './StarredPinnedBar';
import { UnifiedItem } from '../types';
import { getDeepSearchText } from '../utils/search';
import { useArchive } from '../context/ArchiveContext';
import SeedArchitect from './SeedArchitect';

const MAX_CHARS = 20000;

const MindSeedArchitect: React.FC = () => {
  const [activeTab, setActiveTab] = useState<MindSeedType | 'seed-architect'>('cogni');
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(false);
  const [isCopied, setIsCopied] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState('');
  const abortControllerRef = useRef<AbortController | null>(null);
  const [result, setResult] = useState<GeneratedMindSeed | null>(null);
  const { unifiedItems, updateItemMetadata, deleteItem: removeContextItem, loadArchive } = useArchive();
  const savedSeeds = React.useMemo(() => {
    if (activeTab === 'seed-architect') return [];
    return unifiedItems
        .filter(i => i.type === 'mindseed' && (i.original as SavedMindSeed).config?.type === activeTab)
        .map(i => i.original as SavedMindSeed);
  }, [unifiedItems, activeTab]);
  const [toast, setToast] = useState<{message: string, type: 'success' | 'error'} | null>(null);
  const [showErrorModal, setShowErrorModal] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [searchTerm, setSearchText] = useState('');
  const [previewSeed, setPreviewSeed] = useState<SavedMindSeed | null>(null);
  const [seedToDelete, setSeedToDelete] = useState<number | null>(null);
  const [isClearAllConfirmOpen, setIsClearAllConfirmOpen] = useState(false);
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    starredSection: true,
    pinnedSection: true,
    allItemsSection: true
  });

  const loadDraft = async () => {
    try {
      const draft = await db.getMindSeedDraft(1);
      if (draft) {
        setText(draft.config.text);
        if (draft.config.type) {
          setActiveTab(draft.config.type);
        }
      }
    } catch (error) {
      console.error("Failed to load draft", error);
    }
  };

  useEffect(() => {
    loadDraft();
  }, []);

  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newText = e.target.value;
    if (newText.length > MAX_CHARS) {
        setErrorMessage(`Text exceeds the maximum limit of ${MAX_CHARS} characters.`);
        setShowErrorModal(true);
        return;
    }
    setText(newText);
    if (activeTab !== 'seed-architect') {
      db.saveMindSeedDraft({ id: 1, config: { type: activeTab, text: newText } });
    }
  };

  const handleGenerate = async () => {
    if (!text.trim()) {
      setToast({ message: "Please enter some text to compress.", type: 'error' });
      return;
    }

    abortControllerRef.current?.abort();
    const controller = new AbortController();
    abortControllerRef.current = controller;

    setLoading(true);
    setResult(null);

    const messages = ['Parsing text structure...', 'Testing semantic stability...', 'Synthesizing compressed seed...'];
    let messageIndex = 0;
    setLoadingMessage(messages[0]);
    const interval = setInterval(() => {
        messageIndex = (messageIndex + 1) % messages.length;
        setLoadingMessage(messages[messageIndex]);
    }, 2000);

    try {
      if (activeTab === 'seed-architect') return;
      const config: MindSeedConfig = { type: activeTab, text };
      const generatedResult = await generateMindSeed(config, controller.signal);
      if (!controller.signal.aborted) {
        setResult(generatedResult);
        setToast({ message: "MindSeed generated successfully!", type: 'success' });
      }
    } catch (error: any) {
      if (error instanceof AbortError || error?.name === 'AbortError') return;
      setToast({ message: error.message || "Failed to generate MindSeed", type: 'error' });
    } finally {
      clearInterval(interval);
      setLoading(false);
      setLoadingMessage('');
      abortControllerRef.current = null;
    }
  };

  // Abort on unmount
  useEffect(() => {
    return () => {
      abortControllerRef.current?.abort();
    };
  }, []);

  const handleSave = async () => {
    if (!result || activeTab === 'seed-architect') return;

    const name = result.seed.slice(0, 30) + (result.seed.length > 30 ? '...' : '');
    const newSeed: SavedMindSeed = {
      name,
      config: { type: activeTab, text },
      result,
      createdAt: new Date().toISOString(),
      isStarred: false,
      isPinned: false,
      isArchived: false,
      category: ''
    };

    try {
      await db.addMindSeed(newSeed);
      await loadArchive();
      setToast({ message: "Seed saved to library!", type: 'success' });
    } catch (error) {
      setToast({ message: "Failed to save MindSeed", type: 'error' });
    }
  };

  const handleDelete = (id: number) => {
    setSeedToDelete(id);
  };

  const confirmDelete = async () => {
    if (seedToDelete === null) return;
    try {
      const seed = savedSeeds.find(s => s.id === seedToDelete);
      if (!seed) return;
      
      const unified: UnifiedItem = {
          id: `mindseed-${seed.id}`,
          name: seed.result.seed || 'Untitled MindSeed',
          type: 'mindseed',
          original: seed,
          createdAt: seed.createdAt,
          isStarred: seed.isStarred || false,
          isPinned: seed.isPinned || false,
          isArchived: seed.isArchived || false,
          category: seed.category || ''
      };
      
      await removeContextItem(unified);
      setToast({ message: "Seed deleted", type: 'success' });
      setPreviewSeed(null);
    } catch (error) {
      setToast({ message: "Failed to delete MindSeed", type: 'error' });
    } finally {
      setSeedToDelete(null);
    }
  };

  const handleUpdateMetadata = async (seed: SavedMindSeed, metadata: any) => {
    const unified: UnifiedItem = {
        id: `mindseed-${seed.id}`,
        name: seed.result.seed || 'Untitled MindSeed',
        type: 'mindseed',
        original: seed,
        createdAt: seed.createdAt,
        isStarred: seed.isStarred || false,
        isPinned: seed.isPinned || false,
        isArchived: seed.isArchived || false,
        category: seed.category || ''
    };
    await updateItemMetadata(unified, metadata);
    if (previewSeed?.id === seed.id) setPreviewSeed({ ...seed, ...metadata });
  };

  const seedToUnified = (seed: SavedMindSeed): UnifiedItem => ({
    id: `mindseed-${activeTab}-${seed.id}`,
    name: seed.name,
    type: 'mindseed',
    original: seed,
    createdAt: seed.createdAt,
    isStarred: seed.isStarred || false,
    isPinned: seed.isPinned || false,
    isArchived: seed.isArchived || false,
    category: seed.category || ''
  });

  const unifiedSeeds = savedSeeds.map(seedToUnified);

  const handleClear = async () => {
    setText('');
    setResult(null);
    await db.clearMindSeedDraft(1);
  };

  const handleClearAll = async () => {
    if (activeTab === 'seed-architect') return;
    try {
      await db.clearAllMindSeeds(activeTab);
      await loadArchive();
      setToast({ message: "All seeds cleared", type: 'success' });
    } catch (error) {
        setToast({ message: "Failed to clear seeds", type: 'error' });
    }
    setIsClearAllConfirmOpen(false);
  };

  const formatAsMarkdown = (seed: GeneratedMindSeed, type: MindSeedType) => {
    return `> "${seed.seed}"

# ${type.charAt(0).toUpperCase() + type.slice(1)}Seed Deployment Table

| Seed | Pattern | Deploy When |
|---|---|---|
| *"${seed.seed}"* | ${seed.pattern} | ${seed.deployWhen} |
`;
  };

  const handleCopy = async (seed: GeneratedMindSeed, type: MindSeedType) => {
    const markdown = formatAsMarkdown(seed, type);
    const success = await fallbackCopyTextToClipboard(markdown);
    if (success) {
        setIsCopied(true);
        setTimeout(() => setIsCopied(false), 2000);
    } else {
        setToast({ message: "Failed to copy to clipboard", type: 'error' });
    }
  };

  const handleExport = (seed: GeneratedMindSeed, type: MindSeedType) => {
    const markdown = formatAsMarkdown(seed, type);
    const blob = new Blob([markdown], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${sanitizeFilename(seed.seed)}.md`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    setToast({ message: "MindSeed exported as Markdown!", type: 'success' });
  };

  const charCount = text.length;
  const isNearLimit = charCount > MAX_CHARS * 0.9;
  const charCountColor = charCount > MAX_CHARS ? 'text-red-600' : isNearLimit ? 'text-orange-500' : 'text-slate-400';

  const getTabColor = (tab: MindSeedType | 'seed-architect') => {
    if (activeTab !== tab) return 'text-slate-400 border-transparent hover:text-slate-600';
    switch (tab) {
        case 'cogni': return 'bg-orange-600 text-white shadow-md shadow-orange-600/10';
        case 'lingua': return 'bg-emerald-600 text-white shadow-md shadow-emerald-600/10';
        case 'arch': return 'bg-purple-600 text-white shadow-md shadow-purple-600/10';
        case 'seed-architect': return 'bg-violet-600 text-white shadow-md shadow-violet-600/10';
    }
  };

  const getButtonColorClass = () => {
    if (activeTab === 'seed-architect') return '';
    switch (activeTab) {
        case 'cogni': return 'bg-orange-600 hover:bg-orange-500 shadow-orange-600/10';
        case 'lingua': return 'bg-emerald-600 hover:bg-emerald-500 shadow-emerald-600/10';
        case 'arch': return 'bg-purple-600 hover:bg-purple-500 shadow-purple-600/10';
    }
  };

  return (
    <div className="max-w-4xl mx-auto animate-fade-in">
      <div className="flex justify-between items-center mb-10">
        <div>
          <h2 className="text-3xl font-extrabold text-slate-900 dark:text-slate-100">MindSeed Architect</h2>
          <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">Compress large specification contexts into highly generative seeds of wisdom.</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="mb-10">
        <nav className="flex flex-wrap gap-2" aria-label="MindSeed Type Tabs" role="tablist">
          {(['cogni', 'lingua', 'arch'] as MindSeedType[]).map((tab) => (
            <button
              key={tab}
              role="tab"
              aria-selected={activeTab === tab}
              onClick={() => {
                setActiveTab(tab);
                db.saveMindSeedDraft({ id: 1, config: { type: tab, text } });
              }}
              className={`
                whitespace-nowrap py-2.5 px-5 rounded-xl font-semibold text-xs tracking-wider uppercase transition-all duration-200 cursor-pointer
                ${getTabColor(tab)}
              `}
            >
              {tab}Seed Creator
            </button>
          ))}
          <button
              role="tab"
              aria-selected={activeTab === 'seed-architect'}
              onClick={() => setActiveTab('seed-architect')}
              className={`
                whitespace-nowrap py-2.5 px-5 rounded-xl font-semibold text-xs tracking-wider uppercase transition-all duration-200 cursor-pointer
                ${getTabColor('seed-architect')}
              `}
            >
              Seed Architect
          </button>
        </nav>
      </div>

      <div className="grid grid-cols-1 gap-8">
        {activeTab === 'seed-architect' ? (
          <SeedArchitect />
        ) : (
          <>
            {/* Input Form */}
        <div className="bg-transparent">
          <div className="mb-4">
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2">
                Input Spec Context (up to 20,000 characters)
            </label>
            <textarea
              value={text}
              onChange={handleTextChange}
              placeholder="Paste large body of spec text here..."
              className="w-full h-64 p-4 bg-white dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 rounded-xl text-sm focus:ring-2 focus:ring-blue-500/40 outline-none transition custom-scrollbar"
            />
            <div className={`mt-2 text-right text-xs font-semibold ${charCountColor}`}>
              {charCount.toLocaleString()} / {MAX_CHARS.toLocaleString()}
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-slate-200/60 dark:border-slate-800/50">
            <button
              onClick={handleClear}
              className="px-6 py-2.5 border border-slate-200 dark:border-slate-800 rounded-xl text-sm font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-900/60 transition cursor-pointer"
            >
              Clear
            </button>
            <button
              onClick={handleGenerate}
              disabled={loading || !text.trim()}
              data-testid="generate-button"
              className={`px-6 py-2.5 text-white rounded-xl text-sm font-semibold shadow-md transition cursor-pointer ${getButtonColorClass()}`}
            >
              {loading ? 'Architecting...' : 'Generate Seed'}
            </button>
          </div>
        </div>

        {loading && <LoadingSpinner message={loadingMessage || 'Architecting your MindSeed...'} />}

        {/* Result Display */}
        {result && (
          <div className="mt-12 bg-transparent animate-fade-in">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between pb-6 mb-4 border-b border-slate-200/60 dark:border-slate-800/50 gap-4">
              <h3 className="text-xl font-bold text-slate-800 dark:text-slate-200">Crystallized Mind Seed</h3>
              <div className="flex flex-wrap items-center gap-3">
                <button
                    onClick={() => handleCopy(result, activeTab)}
                    className={`flex items-center px-4 py-2 border rounded-xl text-sm font-semibold transition cursor-pointer ${isCopied ? 'bg-green-500/10 text-green-600 dark:text-green-400 border-green-500/20' : 'border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-900/60'}`}
                    title="Copy to Clipboard"
                >
                    <span className="material-icons text-base mr-2">{isCopied ? 'check' : 'content_copy'}</span> {isCopied ? 'Copied' : 'Copy'}
                </button>
                <button
                    onClick={() => handleExport(result, activeTab)}
                    className="flex items-center px-4 py-2 border border-slate-200 dark:border-slate-800 rounded-xl text-sm font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-900/60 transition cursor-pointer"
                    title="Export as Markdown"
                >
                    <span className="material-icons text-base mr-2">download</span> Export
                </button>
                <button
                    onClick={handleSave}
                    className="flex items-center px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-sm font-semibold shadow-md shadow-blue-600/10 transition cursor-pointer"
                >
                    <span className="material-icons text-base mr-2">save</span> Save to Library
                </button>
              </div>
            </div>

            <div className="space-y-10 py-4">
                <div className="space-y-4">
                    <h4 className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest">Mind Seed Quote</h4>
                    <blockquote className="border-l-2 border-blue-500 pl-5 py-4 italic text-lg text-slate-800 dark:text-slate-200 bg-slate-50 dark:bg-slate-900/40 rounded-r-2xl">
                        "{result.seed}"
                    </blockquote>
                </div>

                <div className="space-y-4">
                    <h4 className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest">Generative Pattern</h4>
                    <div className="prose prose-slate prose-sm dark:prose-invert max-w-none bg-slate-50 dark:bg-slate-900/30 p-5 rounded-2xl border border-slate-100 dark:border-slate-800/50">
                        <ReactMarkdown remarkPlugins={[remarkGfm]}>{result.pattern}</ReactMarkdown>
                    </div>
                </div>

                <div className="space-y-4">
                    <h4 className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest">Deployment Condition</h4>
                    <div className="prose prose-slate prose-sm dark:prose-invert max-w-none bg-slate-50 dark:bg-slate-900/30 p-5 rounded-2xl border border-slate-100 dark:border-slate-800/50 text-slate-600 dark:text-slate-300">
                        {result.deployWhen}
                    </div>
                </div>
            </div>
          </div>
        )}

        {/* Saved Library */}
        {savedSeeds.length > 0 && (
          <div className="mt-20 border-t border-slate-200/60 dark:border-slate-800/50 pt-16">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-8 gap-4">
                <h2 className="text-2xl font-extrabold text-slate-800 dark:text-slate-200">Saved Mind Seeds</h2>
                <button onClick={() => setIsClearAllConfirmOpen(true)} className="px-4 py-2 text-xs font-semibold text-rose-600 dark:text-rose-400 bg-rose-500/10 rounded-xl hover:bg-rose-500/15 flex items-center cursor-pointer transition">
                    <span className="material-icons text-sm mr-2">delete_sweep</span> Clear All
                </button>
            </div>

            <div className="mb-8 space-y-4">
                <StarredPinnedBar
                    type="starred"
                    items={unifiedSeeds}
                    expanded={expandedSections.starredSection}
                    onToggleExpand={() => setExpandedSections(prev => ({ ...prev, starredSection: !prev.starredSection }))}
                    onToggleStar={(item) => handleUpdateMetadata(item.original, { isStarred: !item.original.isStarred })}
                    onTogglePin={(item) => handleUpdateMetadata(item.original, { isPinned: !item.original.isPinned })}
                    onToggleArchive={(item) => handleUpdateMetadata(item.original, { isArchived: true })}
                    onDelete={(item) => handleDelete(item.original.id!)}
                    onEdit={() => {}}
                    onSelect={(id) => {
                        const seed = savedSeeds.find(s => `mindseed-${activeTab}-${s.id}` === id);
                        if (seed) {
                            setText(seed.config.text);
                            setActiveTab(seed.config.type);
                            setResult(seed.result);
                            window.scrollTo({ top: 0, behavior: 'smooth' });
                        }
                    }}
                    selectedIds={new Set()}
                />
                <StarredPinnedBar
                    type="pinned"
                    items={unifiedSeeds}
                    expanded={expandedSections.pinnedSection}
                    onToggleExpand={() => setExpandedSections(prev => ({ ...prev, pinnedSection: !prev.pinnedSection }))}
                    onToggleStar={(item) => handleUpdateMetadata(item.original, { isStarred: !item.original.isStarred })}
                    onTogglePin={(item) => handleUpdateMetadata(item.original, { isPinned: !item.original.isPinned })}
                    onToggleArchive={(item) => handleUpdateMetadata(item.original, { isArchived: true })}
                    onDelete={(item) => handleDelete(item.original.id!)}
                    onEdit={() => {}}
                    onSelect={(id) => {
                        const seed = savedSeeds.find(s => `mindseed-${activeTab}-${s.id}` === id);
                        if (seed) {
                            setText(seed.config.text);
                            setActiveTab(seed.config.type);
                            setResult(seed.result);
                            window.scrollTo({ top: 0, behavior: 'smooth' });
                        }
                    }}
                    selectedIds={new Set()}
                />
            </div>

            <div className="mb-6">
                <div className="relative">
                    <span className="material-icons absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">search</span>
                    <input
                        type="text"
                        placeholder="Search saved seeds..."
                        value={searchTerm}
                        onChange={(e) => setSearchText(e.target.value)}
                        className="w-full pl-11 pr-4 py-3 bg-white dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 rounded-2xl focus:ring-2 focus:ring-blue-500/40 outline-none transition-all text-sm"
                    />
                </div>
            </div>
            <div className="grid grid-cols-1 gap-4">
              {savedSeeds
                .filter(s => !s.isArchived && !s.isStarred && !s.isPinned && (s.name.toLowerCase().includes(searchTerm.toLowerCase()) || s.result.seed.toLowerCase().includes(searchTerm.toLowerCase()) || getDeepSearchText(s).includes(searchTerm.toLowerCase())))
                .map((seed) => (
                    <LibraryItem
                        key={seed.id}
                        name={seed.result.seed}
                        createdAt={seed.createdAt}
                        metadata={seed}
                        icon="spa"
                        typeLabel={seed.config.type}
                        onPreview={() => setPreviewSeed(seed)}
                        onDelete={() => handleDelete(seed.id!)}
                        onToggleStar={() => handleUpdateMetadata(seed, { isStarred: !seed.isStarred })}
                        onTogglePin={() => handleUpdateMetadata(seed, { isPinned: !seed.isPinned })}
                        onToggleArchive={() => handleUpdateMetadata(seed, { isArchived: true })}
                        onClick={() => {
                            setText(seed.config.text);
                            setActiveTab(seed.config.type);
                            setResult(seed.result);
                            window.scrollTo({ top: 0, behavior: 'smooth' });
                        }}
                    />
                ))}
            </div>
          </div>
        )}
        </>
        )}
      </div>

      {toast && <Toast message={toast.message} onClose={() => setToast(null)} />}

      <PreviewModal
        isOpen={!!previewSeed}
        onClose={() => setPreviewSeed(null)}
        title={`${previewSeed?.config.type.charAt(0).toUpperCase()}${previewSeed?.config.type.slice(1)}Seed Preview`}
        mindSeed={previewSeed?.result}
        metadata={previewSeed || undefined}
        onUpdateMetadata={(metadata) => previewSeed && handleUpdateMetadata(previewSeed, metadata)}
        onCopy={() => {
            if (previewSeed) {
                handleCopy(previewSeed.result, previewSeed.config.type);
            }
        }}
        onExport={() => {
            if (previewSeed) {
                handleExport(previewSeed.result, previewSeed.config.type);
            }
        }}
        onDelete={() => {
            if (previewSeed?.id) {
                handleDelete(previewSeed.id);
                setPreviewSeed(null);
            }
        }}
      />

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={seedToDelete !== null}
        onClose={() => setSeedToDelete(null)}
        title="Confirm Deletion"
      >
        <div className="space-y-4">
            <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                Are you sure you want to delete this MindSeed? This action cannot be undone.
            </p>
            <div className="flex justify-end gap-3 pt-4">
                <button
                    onClick={() => setSeedToDelete(null)}
                    className="px-5 py-2.5 border border-slate-200 dark:border-slate-800 rounded-xl font-semibold text-xs cursor-pointer text-slate-600 dark:text-slate-400 hover:bg-slate-100"
                >
                    Cancel
                </button>
                <button
                    onClick={confirmDelete}
                    className="px-5 py-2.5 bg-rose-600 text-white rounded-xl font-semibold text-xs cursor-pointer hover:bg-rose-500 transition shadow-sm"
                >
                    Delete Permanently
                </button>
            </div>
        </div>
      </Modal>

      <Modal
        isOpen={showErrorModal}
        onClose={() => setShowErrorModal(false)}
        title="Limit Exceeded"
      >
        <p className="text-slate-600 dark:text-slate-400 text-sm leading-relaxed">{errorMessage}</p>
        <div className="mt-6 flex justify-end">
            <button
                onClick={() => setShowErrorModal(false)}
                className="bg-blue-600 text-white px-5 py-2.5 rounded-xl text-xs font-semibold hover:bg-blue-700 cursor-pointer"
            >
                Close
            </button>
        </div>
      </Modal>

      {/* Clear All Confirmation Modal */}
      <Modal
        isOpen={isClearAllConfirmOpen}
        onClose={() => setIsClearAllConfirmOpen(false)}
        title="Clear All Seeds"
      >
        <div className="space-y-4">
            <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                Are you sure you want to clear ALL saved mind seeds in this tab? This action cannot be undone.
            </p>
            <div className="flex justify-end gap-3 pt-4">
                <button
                    onClick={() => setIsClearAllConfirmOpen(false)}
                    className="px-5 py-2.5 border border-slate-200 dark:border-slate-800 rounded-xl font-semibold text-xs cursor-pointer text-slate-600 dark:text-slate-400 hover:bg-slate-100"
                >
                    Cancel
                </button>
                <button
                    onClick={handleClearAll}
                    className="px-5 py-2.5 bg-rose-600 text-white rounded-xl font-semibold text-xs cursor-pointer hover:bg-rose-500 transition shadow-sm"
                >
                    Delete All
                </button>
            </div>
        </div>
      </Modal>
    </div>
  );
};

export default MindSeedArchitect;

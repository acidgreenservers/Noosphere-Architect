
import React, { useState, useEffect, useRef } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { MindSeedConfig, GeneratedMindSeed, SavedMindSeed, MindSeedType } from '../types';
import { generateMindSeed } from '../services/ai/mindSeedService';
import { AbortError } from '../services/ai/openRouter';
import { addMindSeed, getAllMindSeeds, deleteMindSeed, updateMindSeed, getMindSeedDraft, saveMindSeedDraft, clearMindSeedDraft } from '../services/dbService';
import { sanitizeFilename } from '../utils/security';
import LoadingSpinner from './LoadingSpinner';
import Toast from './Toast';
import Modal from './Modal';
import PreviewModal from './PreviewModal';
import LibraryItem from './LibraryItem';
import { StarredPinnedBar } from './StarredPinnedBar';
import { UnifiedItem } from '../types';
import { getDeepSearchText } from '../utils/search';
import styles from './Button.module.css';

const MAX_CHARS = 20000;

const MindSeedArchitect: React.FC = () => {
  const [activeTab, setActiveTab] = useState<MindSeedType>('cogni');
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState('');
  const abortControllerRef = useRef<AbortController | null>(null);
  const [result, setResult] = useState<GeneratedMindSeed | null>(null);
  const [savedSeeds, setSavedSeeds] = useState<SavedMindSeed[]>([]);
  const [toast, setToast] = useState<{message: string, type: 'success' | 'error'} | null>(null);
  const [showErrorModal, setShowErrorModal] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [searchTerm, setSearchText] = useState('');
  const [previewSeed, setPreviewSeed] = useState<SavedMindSeed | null>(null);
  const [seedToDelete, setSeedToDelete] = useState<number | null>(null);
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    starredSection: true,
    pinnedSection: true,
    allItemsSection: true
  });

  useEffect(() => {
    loadSavedSeeds();
  }, [activeTab]);

  useEffect(() => {
    loadDraft();
  }, []);

  const loadSavedSeeds = async () => {
    try {
      const seeds = await getAllMindSeeds(activeTab);
      setSavedSeeds(seeds);
    } catch (error) {
      console.error("Failed to load seeds", error);
    }
  };

  const loadDraft = async () => {
    try {
      const draft = await getMindSeedDraft(1);
      if (draft) {
        setText(draft.config.text);
        setActiveTab(draft.config.type);
      }
    } catch (error) {
      console.error("Failed to load draft", error);
    }
  };

  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newText = e.target.value;
    if (newText.length > MAX_CHARS) {
        setErrorMessage(`Text exceeds the maximum limit of ${MAX_CHARS} characters.`);
        setShowErrorModal(true);
        return;
    }
    setText(newText);
    saveMindSeedDraft({ id: 1, config: { type: activeTab, text: newText } });
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

    const messages = ['Parsing text structure...', 'Mapping bridges...', 'Synthesizing seed...'];
    let messageIndex = 0;
    setLoadingMessage(messages[0]);
    const interval = setInterval(() => {
        messageIndex = (messageIndex + 1) % messages.length;
        setLoadingMessage(messages[messageIndex]);
    }, 2000);

    try {
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
    if (!result) return;

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
      await addMindSeed(newSeed);
      await loadSavedSeeds();
      setToast({ message: "MindSeed saved to library!", type: 'success' });
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
      await deleteMindSeed(seedToDelete, activeTab);
      await loadSavedSeeds();
      setToast({ message: "MindSeed deleted.", type: 'success' });
    } catch (error) {
      setToast({ message: "Failed to delete MindSeed", type: 'error' });
    } finally {
      setSeedToDelete(null);
    }
  };

  const handleUpdateMetadata = async (seed: SavedMindSeed, metadata: any) => {
    const updated = { ...seed, ...metadata };
    await updateMindSeed(updated);
    setSavedSeeds(prev => prev.map(s => s.id === seed.id ? updated : s));
    if (previewSeed?.id === seed.id) setPreviewSeed(updated);
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
    await clearMindSeedDraft(1);
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
    try {
      await navigator.clipboard.writeText(markdown);
      setToast({ message: "Markdown copied to clipboard!", type: 'success' });
    } catch (err) {
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
  const charCountColor = charCount > MAX_CHARS ? 'text-red-600' : isNearLimit ? 'text-orange-500' : 'text-gray-500';

  const getTabColor = (tab: MindSeedType) => {
    if (activeTab !== tab) return 'text-gray-500 border-transparent hover:text-gray-700 hover:border-gray-300';
    switch (tab) {
        case 'cogni': return 'text-orange-500 border-orange-500';
        case 'lingua': return 'text-green-500 border-green-500';
        case 'arch': return 'text-violet-500 border-violet-500';
    }
  };

  const getButtonColorClass = () => {
    switch (activeTab) {
        case 'cogni': return 'bg-orange-600 hover:bg-orange-700';
        case 'lingua': return 'bg-green-600 hover:bg-green-700';
        case 'arch': return 'bg-violet-600 hover:bg-violet-700';
    }
  };

  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h2 className="text-3xl font-bold text-gray-900 dark:text-gray-100">MindSeed Architect</h2>
          <p className="text-gray-600 dark:text-gray-400">Compress text into generative seeds of wisdom.</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200 dark:border-gray-700 mb-8">
        <nav className="-mb-px flex space-x-8" aria-label="MindSeed Type Tabs" role="tablist">
          {(['cogni', 'lingua', 'arch'] as MindSeedType[]).map((tab) => (
            <button
              key={tab}
              role="tab"
              aria-selected={activeTab === tab}
              onClick={() => {
                setActiveTab(tab);
                saveMindSeedDraft({ id: 1, config: { type: tab, text } });
              }}
              className={`
                whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm capitalize transition-colors duration-200
                ${getTabColor(tab)}
              `}
            >
              {tab}Seed Creator
            </button>
          ))}
        </nav>
      </div>

      <div className="grid grid-cols-1 gap-8">
        {/* Input Form */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Input Text (up to 20,000 characters)
            </label>
            <textarea
              value={text}
              onChange={handleTextChange}
              placeholder="Paste large body of text here..."
              className="w-full h-64 p-4 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
            />
            <div className={`mt-2 text-right text-sm font-medium ${charCountColor}`}>
              {charCount.toLocaleString()} / {MAX_CHARS.toLocaleString()}
            </div>
          </div>

          <div className="flex justify-end space-x-4">
            <button
              onClick={handleClear}
              className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
            >
              Clear
            </button>
            <button
              onClick={handleGenerate}
              disabled={loading || !text.trim()}
              data-testid="generate-button"
              className={`${styles.base} ${getButtonColorClass()} text-white ${loading ? styles.loading : ''}`}
            >
              {loading ? 'Architecting...' : 'Generate Seed'}
            </button>
          </div>
        </div>

        {loading && <LoadingSpinner message={loadingMessage || 'Architecting your MindSeed...'} />}

        {/* Result Display */}
        {result && (
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md border border-gray-200 dark:border-gray-700 p-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
              <h3 className="text-xl font-bold text-gray-900 dark:text-gray-100">Generated MindSeed</h3>
              <div className="flex flex-wrap gap-4">
                <button
                    onClick={() => handleCopy(result, activeTab)}
                    className="flex items-center text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 font-medium transition-colors"
                    title="Copy to Clipboard"
                >
                    <span className="material-icons mr-1">content_copy</span> Copy
                </button>
                <button
                    onClick={() => handleExport(result, activeTab)}
                    className="flex items-center text-gray-600 dark:text-gray-400 hover:text-green-600 dark:hover:text-green-400 font-medium transition-colors"
                    title="Export as Markdown"
                >
                    <span className="material-icons mr-1">download</span> Export
                </button>
                <button
                    onClick={handleSave}
                    className="flex items-center text-blue-600 dark:text-blue-400 hover:text-blue-700 font-medium transition-colors"
                >
                    <span className="material-icons mr-1">save</span> Save to Library
                </button>
              </div>
            </div>

            <div className="mb-8">
                <blockquote className="border-l-4 border-blue-500 pl-4 py-2 italic text-2xl text-gray-800 dark:text-gray-200">
                    "{result.seed}"
                </blockquote>
            </div>

            <div className="overflow-hidden border border-gray-200 dark:border-gray-700 rounded-lg">
                <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                    <thead className="bg-gray-50 dark:bg-gray-900/50">
                        <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Seed</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Pattern</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Deploy When</th>
                        </tr>
                    </thead>
                    <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                        <tr>
                            <td className="px-6 py-4 text-sm italic text-gray-900 dark:text-gray-100 font-medium">"{result.seed}"</td>
                            <td className="px-6 py-4 text-sm text-gray-600 dark:text-gray-300">
                                <div className="prose prose-sm dark:prose-invert">
                                    <ReactMarkdown remarkPlugins={[remarkGfm]}>{result.pattern}</ReactMarkdown>
                                </div>
                            </td>
                            <td className="px-6 py-4 text-sm text-gray-600 dark:text-gray-300">{result.deployWhen}</td>
                        </tr>
                    </tbody>
                </table>
            </div>
          </div>
        )}

        {/* Saved Library */}
        {savedSeeds.length > 0 && (
          <div className="mt-12">
            <h3 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-6">Saved MindSeeds</h3>

            <div className="mb-6 space-y-4">
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

            <div className="mb-4">
                <div className="relative">
                    <span className="material-icons absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">search</span>
                    <input
                        type="text"
                        placeholder="Search saved seeds..."
                        value={searchTerm}
                        onChange={(e) => setSearchText(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all"
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
            <p className="text-gray-600 dark:text-gray-400">
                Are you sure you want to delete this MindSeed? This action cannot be undone.
            </p>
            <div className="flex justify-end space-x-3 mt-6">
                <button
                    onClick={() => setSeedToDelete(null)}
                    className="px-4 py-2 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                >
                    Cancel
                </button>
                <button
                    onClick={confirmDelete}
                    className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors shadow-sm"
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
        <p className="text-gray-600 dark:text-gray-400">{errorMessage}</p>
        <div className="mt-6 flex justify-end">
            <button
                onClick={() => setShowErrorModal(false)}
                className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
            >
                Close
            </button>
        </div>
      </Modal>
    </div>
  );
};

export default MindSeedArchitect;

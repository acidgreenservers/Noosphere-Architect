
import React, { useState, useEffect, useRef, useCallback } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { CompressionConfig, CompressedSignal, SavedCompressedSignal, UnifiedItem } from '../types';
import { generateCompressedSignal } from '../services/ai/compressionService';
import { AbortError } from '../services/ai/openRouter';
import * as db from '../services/dbService';
import { sanitizeFilename } from '../utils/security';
import LoadingSpinner from './LoadingSpinner';
import Toast from './Toast';
import Modal from './Modal';
import PreviewModal from './PreviewModal';
import LibraryItem from './LibraryItem';
import { StarredPinnedBar } from './StarredPinnedBar';
import { getDeepSearchText } from '../utils/search';

const MAX_CHARS = 50000;

const SignalCompressionArchitect: React.FC = () => {
    const [config, setConfig] = useState<CompressionConfig>({ messyInput: '' });
    const [result, setResult] = useState<CompressedSignal | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [loadingMessage, setLoadingMessage] = useState('');
    const [error, setError] = useState<string | null>(null);
    const abortControllerRef = useRef<AbortController | null>(null);
    const loadingIntervalRef = useRef<number | null>(null);

    const [savedSignals, setSavedSignals] = useState<SavedCompressedSignal[]>([]);
    const [searchTerm, setSearchText] = useState('');
    const [successMessage, setSuccessMessage] = useState('');
    const [draftStatus, setDraftStatus] = useState<'unloaded' | 'loaded' | 'none'>('unloaded');
    const [pendingDraft, setPendingDraft] = useState<CompressionConfig | null>(null);
    const isCheckingDraft = useRef(false);

    const [isSaveModalOpen, setIsSaveModalOpen] = useState(false);
    const [saveName, setSaveName] = useState('');
    const [previewSignal, setPreviewSignal] = useState<SavedCompressedSignal | null>(null);
    const [deleteTarget, setDeleteTarget] = useState<number | null>(null);
    const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
    const [isClearAllConfirmOpen, setIsClearAllConfirmOpen] = useState(false);

    const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
        starredSection: true,
        pinnedSection: true,
        allItemsSection: true
    });

    const loadSavedSignals = useCallback(async () => {
        const signals = await db.getAllCompressedSignals();
        setSavedSignals(signals);
    }, []);

    useEffect(() => {
        loadSavedSignals();
        const loadDraft = async () => {
            if (isCheckingDraft.current) return;
            isCheckingDraft.current = true;

            try {
                const draft = await db.getCompressedSignalDraft(1);
                if (draft?.config && draft.config.messyInput) {
                    setPendingDraft(draft.config);
                } else {
                    setDraftStatus('none');
                }
            } catch (err) {
                console.warn("Failed to load compressed signal draft:", err);
                setDraftStatus('none');
            }
        };
        loadDraft();
    }, [loadSavedSignals]);

    useEffect(() => {
        if (draftStatus === 'unloaded') return;
        const handler = setTimeout(() => {
            if (config.messyInput) {
                db.saveCompressedSignalDraft({ id: 1, config });
            }
        }, 1500);
        return () => clearTimeout(handler);
    }, [config, draftStatus]);

    const handleGenerate = async () => {
        if (!config.messyInput.trim()) {
            setError("Please enter some text to compress.");
            return;
        }

        abortControllerRef.current?.abort();
        const controller = new AbortController();
        abortControllerRef.current = controller;

        setIsLoading(true);
        setError(null);
        setResult(null);

        const messages = ['Parsing signal topology...', 'Mapping bridges...', 'Compacting context...', 'Synthesizing compressed signal...'];
        let messageIndex = 0;
        setLoadingMessage(messages[0]);
        loadingIntervalRef.current = window.setInterval(() => {
            messageIndex = (messageIndex + 1) % messages.length;
            setLoadingMessage(messages[messageIndex]);
        }, 2000);

        try {
            const compressed = await generateCompressedSignal(config, controller.signal);
            if (!controller.signal.aborted) {
                setResult(compressed);
                await db.clearCompressedSignalDraft(1);
            }
        } catch (e: any) {
            if (e instanceof AbortError || e?.name === 'AbortError') return;
            setError(e.message || 'Failed to compress signal. Please check your API key and try again.');
        } finally {
            setIsLoading(false);
            if (loadingIntervalRef.current) clearInterval(loadingIntervalRef.current);
            setLoadingMessage('');
            abortControllerRef.current = null;
        }
    };

    const handleReset = () => {
        setConfig({ messyInput: '' });
        setResult(null);
        setError(null);
        db.clearCompressedSignalDraft(1);
    };

    const handleSaveSignal = async () => {
        if (!result || !saveName.trim()) return;

        const newSignal: SavedCompressedSignal = {
            name: saveName.trim(),
            config,
            result,
            createdAt: new Date().toISOString(),
            isStarred: false,
            isPinned: false,
            isArchived: false,
            category: ''
        };

        await db.addCompressedSignal(newSignal);
        setSuccessMessage('Compressed signal saved successfully!');
        loadSavedSignals();
        setIsSaveModalOpen(false);
        setSaveName('');
    };

    const handleUpdateMetadata = async (signal: SavedCompressedSignal, metadata: any) => {
        const updated = { ...signal, ...metadata };
        await db.updateCompressedSignal(updated);
        setSavedSignals(prev => prev.map(s => s.id === signal.id ? updated : s));
        if (previewSignal?.id === signal.id) setPreviewSignal(updated);
    };

    const signalToUnified = (signal: SavedCompressedSignal): UnifiedItem => ({
        id: `compressed-signal-${signal.id}`,
        name: signal.name,
        type: 'compressed-signal',
        original: signal,
        createdAt: signal.createdAt,
        isStarred: signal.isStarred || false,
        isPinned: signal.isPinned || false,
        isArchived: signal.isArchived || false,
        category: signal.category || ''
    });

    const unifiedSignals = savedSignals.map(signalToUnified);

    const handleDelete = (id: number) => {
        setDeleteTarget(id);
        setIsDeleteConfirmOpen(true);
    };

    const confirmDelete = async () => {
        if (deleteTarget === null) return;
        await db.deleteCompressedSignal(deleteTarget);
        setSavedSignals(prev => prev.filter(s => s.id !== deleteTarget));
        setSuccessMessage('Signal deleted successfully!');
        setIsDeleteConfirmOpen(false);
        setDeleteTarget(null);
        setPreviewSignal(null);
    };

    const handleClearAll = async () => {
        await db.clearAllCompressedSignals();
        loadSavedSignals();
        setSuccessMessage('All compressed signals cleared.');
        setIsClearAllConfirmOpen(false);
    };

    const handleLoadSaved = (signal: SavedCompressedSignal) => {
        setConfig(signal.config);
        setResult(signal.result);
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const handleAcceptDraft = () => {
        if (!pendingDraft) return;
        setConfig(pendingDraft);
        setDraftStatus('loaded');
        setPendingDraft(null);
    };

    const handleDeclineDraft = async () => {
        await db.clearCompressedSignalDraft(1);
        setDraftStatus('none');
        setPendingDraft(null);
    };

    const handleCopy = (text: string) => {
        navigator.clipboard.writeText(text);
        setSuccessMessage('Signal copied to clipboard!');
    };

    const handleExport = (name: string, text: string) => {
        const filename = sanitizeFilename(name || 'compressed-signal') + '.md';
        const content = `# Compressed Signal: ${name}\n\n${text}`;
        const blob = new Blob([content], { type: 'text/markdown;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    };

    const charCount = config.messyInput.length;
    const isNearLimit = charCount > MAX_CHARS * 0.9;
    const charCountColor = charCount > MAX_CHARS ? 'text-red-600' : isNearLimit ? 'text-orange-500' : 'text-slate-400';

    return (
        <div className="space-y-8 animate-fade-in">
            <Toast message={successMessage} onClose={() => setSuccessMessage('')} />

            <div className="bg-transparent">
                <div className="space-y-6">
                    <div>
                        <label htmlFor="messyInput" className="block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2">
                            Input Context <span className="text-red-500 ml-1">*</span>
                        </label>
                        <textarea
                            id="messyInput"
                            rows={10}
                            value={config.messyInput}
                            onChange={(e) => setConfig({ messyInput: e.target.value })}
                            placeholder="Paste the context, messy thoughts, or structured signals you want to compress..."
                            className="w-full px-4 py-3 bg-white dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 rounded-xl text-sm focus:ring-2 focus:ring-blue-500/40 outline-none transition custom-scrollbar"
                        />
                        <div className={`mt-2 text-right text-xs font-semibold ${charCountColor}`}>
                            {charCount.toLocaleString()} / {MAX_CHARS.toLocaleString()}
                        </div>
                    </div>

                    <div className="flex flex-col sm:flex-row items-center justify-end gap-3 pt-4 border-t border-slate-200/60 dark:border-slate-800/50">
                        <button type="button" onClick={handleReset} disabled={isLoading} className="w-full sm:w-auto px-6 py-2.5 border border-slate-200 dark:border-slate-800 rounded-xl text-sm font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-900/60 transition cursor-pointer">Reset</button>
                        <button
                            onClick={handleGenerate}
                            disabled={!config.messyInput.trim() || isLoading}
                            className="w-full sm:w-auto flex items-center justify-center px-6 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-sm font-semibold shadow-md shadow-blue-600/10 disabled:opacity-50 disabled:cursor-not-allowed transition cursor-pointer"
                        >
                            {isLoading ? 'Compressing...' : 'Compress Signal'}
                        </button>
                    </div>
                </div>
            </div>

            {error && (
                <div className="mt-8 bg-red-500/10 border border-red-500/20 text-red-600 dark:text-red-400 px-5 py-4 rounded-2xl text-sm" role="alert">
                    <strong className="font-bold">Error: </strong>
                    <span className="block sm:inline">{error}</span>
                </div>
            )}

            {isLoading && <LoadingSpinner message={loadingMessage || 'Compressing signal...'} />}

            {result && !isLoading && (
                <div className="mt-12 bg-transparent animate-fade-in">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between pb-6 mb-4 border-b border-slate-200/60 dark:border-slate-800/50 gap-4">
                        <h3 className="text-xl font-bold text-slate-800 dark:text-slate-200">Compressed Context</h3>
                        <div className="flex flex-wrap items-center gap-3">
                           <button onClick={() => handleCopy(result.compressedText)} className="flex items-center px-4 py-2 border border-slate-200 dark:border-slate-800 rounded-xl text-sm font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-900/60 transition cursor-pointer" title="Copy to clipboard">
                                <span className="material-icons text-base mr-2">content_copy</span>Copy
                            </button>
                           <button onClick={() => handleExport('compressed-signal', result.compressedText)} className="flex items-center px-4 py-2 border border-slate-200 dark:border-slate-800 rounded-xl text-sm font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-900/60 transition cursor-pointer" title="Export signal">
                                <span className="material-icons text-base mr-2">download</span>Export
                           </button>
                           <button onClick={() => setIsSaveModalOpen(true)} className="flex items-center px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-sm font-semibold shadow-md shadow-blue-600/10 transition cursor-pointer" title="Save signal">
                                <span className="material-icons text-base mr-2">save</span>Save
                            </button>
                        </div>
                    </div>

                    <div className="prose prose-slate dark:prose-invert max-w-none py-4 px-2 whitespace-pre-wrap font-mono text-sm leading-relaxed">
                        <ReactMarkdown remarkPlugins={[remarkGfm]}>{result.compressedText}</ReactMarkdown>
                    </div>
                </div>
            )}

            {savedSignals.length > 0 && (
                <div className="mt-20 border-t border-slate-200/60 dark:border-slate-800/50 pt-16">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-8 gap-4">
                        <h2 className="text-2xl font-extrabold text-slate-800 dark:text-slate-200">Saved Compactions</h2>
                        <button onClick={() => setIsClearAllConfirmOpen(true)} className="px-4 py-2 text-xs font-semibold text-rose-600 dark:text-rose-400 bg-rose-500/10 rounded-xl hover:bg-rose-500/15 flex items-center cursor-pointer transition">
                            <span className="material-icons text-sm mr-2">delete_sweep</span> Clear All
                        </button>
                    </div>

                    <div className="mb-8 space-y-4">
                        <StarredPinnedBar
                            type="starred"
                            items={unifiedSignals}
                            expanded={expandedSections.starredSection}
                            onToggleExpand={() => setExpandedSections(prev => ({ ...prev, starredSection: !prev.starredSection }))}
                            onToggleStar={(item) => handleUpdateMetadata(item.original, { isStarred: !item.original.isStarred })}
                            onTogglePin={(item) => handleUpdateMetadata(item.original, { isPinned: !item.original.isPinned })}
                            onToggleArchive={(item) => handleUpdateMetadata(item.original, { isArchived: true })}
                            onDelete={(item) => handleDelete(item.original.id!)}
                            onEdit={() => {}}
                            onSelect={(id) => handleLoadSaved(savedSignals.find(s => `compressed-signal-${s.id}` === id)!)}
                            selectedIds={new Set()}
                        />
                        <StarredPinnedBar
                            type="pinned"
                            items={unifiedSignals}
                            expanded={expandedSections.pinnedSection}
                            onToggleExpand={() => setExpandedSections(prev => ({ ...prev, pinnedSection: !prev.pinnedSection }))}
                            onToggleStar={(item) => handleUpdateMetadata(item.original, { isStarred: !item.original.isStarred })}
                            onTogglePin={(item) => handleUpdateMetadata(item.original, { isPinned: !item.original.isPinned })}
                            onToggleArchive={(item) => handleUpdateMetadata(item.original, { isArchived: true })}
                            onDelete={(item) => handleDelete(item.original.id!)}
                            onEdit={() => {}}
                            onSelect={(id) => handleLoadSaved(savedSignals.find(s => `compressed-signal-${s.id}` === id)!)}
                            selectedIds={new Set()}
                        />
                    </div>

                    <div className="mb-6">
                        <div className="relative">
                            <span className="material-icons absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">search</span>
                            <input
                                type="text"
                                placeholder="Search saved compactions..."
                                value={searchTerm}
                                onChange={(e) => setSearchText(e.target.value)}
                                className="w-full pl-11 pr-4 py-3 bg-white dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 rounded-2xl focus:ring-2 focus:ring-blue-500/40 outline-none transition-all text-sm"
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {savedSignals
                            .filter(s => !s.isArchived && !s.isStarred && !s.isPinned && (s.name.toLowerCase().includes(searchTerm.toLowerCase()) || getDeepSearchText(s).includes(searchTerm.toLowerCase())))
                            .map(s => (
                                <LibraryItem
                                    key={s.id}
                                    name={s.name}
                                    createdAt={s.createdAt}
                                    metadata={s}
                                    icon="compress"
                                    onPreview={() => setPreviewSignal(s)}
                                    onDelete={() => handleDelete(s.id!)}
                                    onToggleStar={() => handleUpdateMetadata(s, { isStarred: !s.isStarred })}
                                    onTogglePin={() => handleUpdateMetadata(s, { isPinned: !s.isPinned })}
                                    onToggleArchive={() => handleUpdateMetadata(s, { isArchived: true })}
                                    onClick={() => handleLoadSaved(s)}
                                />
                            ))}
                    </div>
                </div>
            )}

            <Modal isOpen={!!pendingDraft} onClose={() => setPendingDraft(null)} title="Unsaved Draft Found">
                <div className="space-y-4">
                    <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                        An unsaved compression draft was found. Would you like to restore it?
                    </p>
                    <div className="flex justify-end gap-3 pt-4">
                        <button
                            onClick={handleDeclineDraft}
                            className="px-5 py-2.5 border border-slate-200 dark:border-slate-800 rounded-xl font-semibold text-xs cursor-pointer text-slate-600 dark:text-slate-400 hover:bg-slate-100"
                        >
                            Discard
                        </button>
                        <button
                            onClick={handleAcceptDraft}
                            className="px-5 py-2.5 bg-blue-600 text-white rounded-xl font-semibold text-xs cursor-pointer shadow-sm transition"
                        >
                            Restore Draft
                        </button>
                    </div>
                </div>
            </Modal>

            <Modal isOpen={isClearAllConfirmOpen} onClose={() => setIsClearAllConfirmOpen(false)} title="Confirm Clear All">
                <div className="space-y-4">
                    <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                        Are you sure you want to clear ALL saved compactions? This action cannot be undone.
                    </p>
                    <div className="flex justify-end gap-3 pt-4">
                        <button
                            onClick={() => setIsClearAllConfirmOpen(false)}
                            className="px-5 py-2.5 border border-slate-200 dark:border-slate-800 rounded-xl font-semibold text-xs cursor-pointer"
                        >
                            Cancel
                        </button>
                        <button
                            onClick={handleClearAll}
                            className="px-5 py-2.5 bg-rose-600 text-white rounded-xl font-semibold text-xs cursor-pointer hover:bg-rose-500 transition"
                        >
                            Clear All
                        </button>
                    </div>
                </div>
            </Modal>

            <Modal isOpen={isDeleteConfirmOpen} onClose={() => { setIsDeleteConfirmOpen(false); setDeleteTarget(null); }} title="Confirm Delete">
                <div className="space-y-4">
                    <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                        Are you sure you want to delete this compaction? This action cannot be undone.
                    </p>
                    <div className="flex justify-end gap-3 pt-4">
                        <button
                            onClick={() => { setIsDeleteConfirmOpen(false); setDeleteTarget(null); }}
                            className="px-5 py-2.5 border border-slate-200 dark:border-slate-800 rounded-xl font-semibold text-xs cursor-pointer"
                        >
                            Cancel
                        </button>
                        <button
                            onClick={confirmDelete}
                            className="px-5 py-2.5 bg-rose-600 text-white rounded-xl font-semibold text-xs cursor-pointer hover:bg-rose-500 transition"
                        >
                            Delete
                        </button>
                    </div>
                </div>
            </Modal>

            <PreviewModal
                isOpen={!!previewSignal}
                onClose={() => setPreviewSignal(null)}
                title={`Preview: ${previewSignal?.name}`}
                content={previewSignal ? previewSignal.result.compressedText : ''}
                metadata={previewSignal || undefined}
                onUpdateMetadata={(metadata) => previewSignal && handleUpdateMetadata(previewSignal, metadata)}
                onCopy={() => {
                    if (previewSignal) {
                        handleCopy(previewSignal.result.compressedText);
                    }
                }}
                onExport={() => {
                    if (previewSignal) {
                        handleExport(previewSignal.name, previewSignal.result.compressedText);
                    }
                }}
                onDelete={() => {
                    if (previewSignal?.id) {
                        handleDelete(previewSignal.id);
                        setPreviewSignal(null);
                    }
                }}
            />

            <Modal isOpen={isSaveModalOpen} onClose={() => setIsSaveModalOpen(false)} title="Save Compressed Signal">
                <div className="space-y-4 animate-fade-in">
                    <div>
                        <label htmlFor="saveName" className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">Name</label>
                        <input
                            type="text"
                            id="saveName"
                            value={saveName}
                            onChange={(e) => setSaveName(e.target.value)}
                            placeholder="e.g., Project X Core Context"
                            className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500/40"
                            autoFocus
                        />
                    </div>
                    <div className="flex justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-800/80">
                        <button onClick={() => setIsSaveModalOpen(false)} className="px-5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 font-semibold text-xs cursor-pointer">Cancel</button>
                        <button
                            onClick={handleSaveSignal}
                            disabled={!saveName.trim()}
                            className="px-5 py-2.5 bg-blue-600 text-white rounded-xl font-semibold text-xs cursor-pointer hover:bg-blue-700"
                        >
                            Save Compaction
                        </button>
                    </div>
                </div>
            </Modal>
        </div>
    );
};

export default SignalCompressionArchitect;

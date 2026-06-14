
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
import styles from './Button.module.css';

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

            const draft = await db.getCompressedSignalDraft(1);
            if (draft?.config && draft.config.messyInput) {
                setPendingDraft(draft.config);
            } else {
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
    const charCountColor = charCount > MAX_CHARS ? 'text-red-600' : isNearLimit ? 'text-orange-500' : 'text-gray-500';

    return (
        <div className="max-w-4xl mx-auto">
            <Toast message={successMessage} onClose={() => setSuccessMessage('')} />

            <div className="flex justify-between items-center mb-8">
                <div>
                    <h2 className="text-3xl font-bold text-gray-900 dark:text-gray-100">Signal Compression Architect</h2>
                    <p className="text-gray-600 dark:text-gray-400">Compress text signals into high-density context compactions.</p>
                </div>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-6 md:p-8 border border-gray-200 dark:border-gray-700/50">
                <div className="space-y-6">
                    <div>
                        <label htmlFor="messyInput" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            Input Context <span className="text-red-500 ml-1">*</span>
                        </label>
                        <textarea
                            id="messyInput"
                            rows={10}
                            value={config.messyInput}
                            onChange={(e) => setConfig({ messyInput: e.target.value })}
                            placeholder="Paste the context, messy thoughts, or structured signals you want to compress..."
                            className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-xl shadow-sm transition focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 dark:text-gray-100"
                        />
                        <div className={`mt-2 text-right text-sm font-medium ${charCountColor}`}>
                            {charCount.toLocaleString()} / {MAX_CHARS.toLocaleString()}
                        </div>
                    </div>

                    <div className="flex flex-col sm:flex-row items-center justify-end space-y-4 sm:space-y-0 sm:space-x-4 pt-2">
                        <button type="button" onClick={handleReset} disabled={isLoading} className="w-full sm:w-auto px-6 py-2 border border-gray-300 dark:border-gray-500 rounded-lg shadow-sm text-sm font-medium text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 disabled:opacity-50 transition">Reset</button>
                        <button
                            onClick={handleGenerate}
                            disabled={!config.messyInput.trim() || isLoading}
                            className={`${styles.base} bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-6 rounded-lg transition-all duration-200 flex items-center justify-center disabled:bg-blue-300 dark:disabled:bg-blue-800 disabled:cursor-not-allowed`}
                        >
                            {isLoading ? 'Compressing...' : 'Compress Signal'}
                        </button>
                    </div>
                </div>
            </div>

            {error && (
                <div className="mt-8 bg-red-100 dark:bg-red-900/50 border border-red-400 dark:border-red-700 text-red-700 dark:text-red-200 px-4 py-3 rounded-lg relative" role="alert">
                    <strong className="font-bold">Error: </strong>
                    <span className="block sm:inline">{error}</span>
                </div>
            )}

            {isLoading && <LoadingSpinner message={loadingMessage || 'Compressing signal...'} />}

            {result && !isLoading && (
                <div className="mt-8 bg-white dark:bg-gray-800 rounded-2xl shadow-lg overflow-hidden border border-gray-200 dark:border-gray-700 animate-in fade-in slide-in-from-bottom-4 duration-500">
                    <div className="flex flex-col md:flex-row justify-between items-center p-4 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50">
                        <h3 className="text-xl font-semibold text-gray-800 dark:text-gray-200">Compressed Context</h3>
                        <div className="flex flex-wrap items-center justify-center md:justify-end gap-3 mt-3 md:mt-0">
                           <button onClick={() => handleCopy(result.compressedText)} className="flex items-center px-3 py-1.5 border border-gray-300 dark:border-gray-600 rounded-md text-sm text-gray-700 dark:text-gray-200 hover:bg-white dark:hover:bg-gray-700 transition" title="Copy to clipboard">
                                <span className="material-icons text-base mr-1.5">content_copy</span>Copy
                            </button>
                           <button onClick={() => handleExport('compressed-signal', result.compressedText)} className="flex items-center px-3 py-1.5 border border-gray-300 dark:border-gray-600 rounded-md text-sm text-gray-700 dark:text-gray-200 hover:bg-white dark:hover:bg-gray-700 transition" title="Export signal">
                                <span className="material-icons text-base mr-1.5">download</span>Export
                           </button>
                           <button onClick={() => setIsSaveModalOpen(true)} className="flex items-center px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-md text-sm transition" title="Save signal">
                                <span className="material-icons text-base mr-1.5">save</span>Save to Library
                            </button>
                        </div>
                    </div>

                    <div className="p-8">
                        <div className="prose prose-sm dark:prose-invert max-w-none bg-gray-50 dark:bg-gray-900/50 p-6 rounded-xl border border-gray-200 dark:border-gray-700 font-mono leading-relaxed whitespace-pre-wrap">
                            <ReactMarkdown remarkPlugins={[remarkGfm]}>{result.compressedText}</ReactMarkdown>
                        </div>
                    </div>
                </div>
            )}

            {savedSignals.length > 0 && (
                <div className="mt-12">
                    <div className="flex justify-between items-center mb-6">
                        <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-200">Saved Compactions</h2>
                        <button onClick={() => setIsClearAllConfirmOpen(true)} className="text-sm text-red-500 hover:text-red-600 flex items-center">
                            <span className="material-icons text-sm mr-1">delete_sweep</span> Clear All
                        </button>
                    </div>

                    <div className="mb-6 space-y-4">
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

                    <div className="mb-4">
                        <div className="relative">
                            <span className="material-icons absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">search</span>
                            <input
                                type="text"
                                placeholder="Search saved compactions..."
                                value={searchTerm}
                                onChange={(e) => setSearchText(e.target.value)}
                                className="w-full pl-10 pr-4 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {savedSignals
                            .filter(s => !s.isArchived && !s.isStarred && !s.isPinned && s.name.toLowerCase().includes(searchTerm.toLowerCase()))
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
                    <p className="text-gray-600 dark:text-gray-400">
                        An unsaved compression draft was found. Would you like to restore it?
                    </p>
                    <div className="flex justify-end space-x-3 mt-6">
                        <button
                            onClick={handleDeclineDraft}
                            className="px-4 py-2 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                        >
                            Discard
                        </button>
                        <button
                            onClick={handleAcceptDraft}
                            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors shadow-sm"
                        >
                            Restore Draft
                        </button>
                    </div>
                </div>
            </Modal>

            <Modal isOpen={isClearAllConfirmOpen} onClose={() => setIsClearAllConfirmOpen(false)} title="Confirm Clear All">
                <div className="space-y-4">
                    <p className="text-gray-600 dark:text-gray-400">
                        Are you sure you want to clear ALL saved compactions? This action cannot be undone.
                    </p>
                    <div className="flex justify-end space-x-3 mt-6">
                        <button
                            onClick={() => setIsClearAllConfirmOpen(false)}
                            className="px-4 py-2 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md transition"
                        >
                            Cancel
                        </button>
                        <button
                            onClick={handleClearAll}
                            className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition"
                        >
                            Clear All
                        </button>
                    </div>
                </div>
            </Modal>

            <Modal isOpen={isDeleteConfirmOpen} onClose={() => { setIsDeleteConfirmOpen(false); setDeleteTarget(null); }} title="Confirm Delete">
                <div className="space-y-4">
                    <p className="text-gray-600 dark:text-gray-400">
                        Are you sure you want to delete this compaction? This action cannot be undone.
                    </p>
                    <div className="flex justify-end space-x-3 mt-6">
                        <button
                            onClick={() => { setIsDeleteConfirmOpen(false); setDeleteTarget(null); }}
                            className="px-4 py-2 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md transition"
                        >
                            Cancel
                        </button>
                        <button
                            onClick={confirmDelete}
                            className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition"
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
                <div className="space-y-4">
                    <div>
                        <label htmlFor="saveName" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Name</label>
                        <input
                            type="text"
                            id="saveName"
                            value={saveName}
                            onChange={(e) => setSaveName(e.target.value)}
                            placeholder="e.g., Project X Core Context"
                            className="w-full px-4 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-blue-500 outline-none transition text-gray-900 dark:text-gray-100"
                            autoFocus
                        />
                    </div>
                    <div className="flex justify-end space-x-3 mt-6">
                        <button onClick={() => setIsSaveModalOpen(false)} className="px-4 py-2 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md transition">Cancel</button>
                        <button
                            onClick={handleSaveSignal}
                            disabled={!saveName.trim()}
                            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 transition"
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

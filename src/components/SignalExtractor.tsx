import React, { useState, useCallback, useEffect, useRef } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { extractSignal } from '../services/ai/signalService';
import { AbortError } from '../services/ai/openRouter';
import { SignalConfig, ExtractedSignal, SavedSignal, PromptConfig } from '../types';
import * as db from '../services/dbService';
import { sanitizeFilename } from '../utils/security';
import LoadingSpinner from './LoadingSpinner';
import Modal from './Modal';
import PreviewModal from './PreviewModal';
import LibraryItem from './LibraryItem';
import Toast from './Toast';
import { StarredPinnedBar } from './StarredPinnedBar';
import { UnifiedItem } from '../types';
import SeedArchitect from './SeedArchitect';
import SignalCompressionArchitect from './SignalCompressionArchitect';
import { getDeepSearchText } from '../utils/search';
import PipelineIndicator from './PipelineIndicator';

interface SignalExtractorProps {
    onTransfer: (config: PromptConfig) => void;
    initialTab?: 'extractor' | 'seed' | 'compression';
    initialConfig?: SignalConfig;
    onClearInitialConfig?: () => void;
}

type Tab = 'extractor' | 'seed' | 'compression';

const SignalExtractor: React.FC<SignalExtractorProps> = ({ onTransfer, initialTab = 'extractor', initialConfig, onClearInitialConfig }) => {
    const [activeTab, setActiveTab] = useState<Tab>(initialTab);
    const [config, setConfig] = useState<SignalConfig>({ messyPrompt: '' });
    const [result, setResult] = useState<ExtractedSignal | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [loadingMessage, setLoadingMessage] = useState('');
    const loadingIntervalRef = useRef<number | null>(null);
    const abortControllerRef = useRef<AbortController | null>(null);

    const [savedSignals, setSavedSignals] = useState<SavedSignal[]>([]);
    const [searchTerm, setSearchText] = useState('');
    const [successMessage, setSuccessMessage] = useState('');
    const [draftStatus, setDraftStatus] = useState<'unloaded' | 'loaded' | 'none'>('unloaded');
    const [pendingDraft, setPendingDraft] = useState<SignalConfig | null>(null);
    const isCheckingDraft = useRef(false);
    const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
        starredSection: true,
        pinnedSection: true,
        allItemsSection: true
    });

    const [isSaveModalOpen, setIsSaveModalOpen] = useState(false);
    const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
    const [isClearAllConfirmOpen, setIsClearAllConfirmOpen] = useState(false);
    const [deleteTarget, setDeleteTarget] = useState<number | null>(null);
    const [previewSignal, setPreviewSignal] = useState<SavedSignal | null>(null);
    const [saveName, setSaveName] = useState('');

    const loadSavedSignals = useCallback(async () => {
        const signals = await db.getAllSignals();
        setSavedSignals(signals);
    }, []);

    useEffect(() => {
        if (initialConfig) {
            setConfig(initialConfig);
            if (onClearInitialConfig) onClearInitialConfig();
            return;
        }

        loadSavedSignals();
        const loadDraft = async () => {
            if (isCheckingDraft.current) return;
            isCheckingDraft.current = true;

            const draft = await db.getSignalDraft(1);
            if (draft?.config && draft.config.messyPrompt) {
                setPendingDraft(draft.config);
            } else {
                setDraftStatus('none');
            }
        };
        loadDraft();
    }, [loadSavedSignals, initialConfig, onClearInitialConfig]);

    useEffect(() => {
        if (draftStatus === 'unloaded') return;
        const handler = setTimeout(() => {
            if (config.messyPrompt) {
                db.saveSignalDraft({ id: 1, config });
            }
        }, 1500);
        return () => clearTimeout(handler);
    }, [config, draftStatus]);

    const handleGenerate = useCallback(async () => {
        abortControllerRef.current?.abort();
        const controller = new AbortController();
        abortControllerRef.current = controller;

        setIsLoading(true);
        setError(null);
        setResult(null);

        const messages = ['Reading messy input...', 'Extracting core signal...', 'Amplifying instructions...', 'Finalizing signal...'];
        let messageIndex = 0;
        setLoadingMessage(messages[0]);
        loadingIntervalRef.current = window.setInterval(() => {
            messageIndex = (messageIndex + 1) % messages.length;
            setLoadingMessage(messages[messageIndex]);
        }, 2000);

        try {
            if (!config.messyPrompt.trim()) {
                setError("Please enter a messy prompt to extract from.");
                setIsLoading(false);
                if (loadingIntervalRef.current) clearInterval(loadingIntervalRef.current);
                return;
            }
            const extracted = await extractSignal(config, controller.signal);
            if (!controller.signal.aborted) {
                setResult(extracted);
                await db.clearSignalDraft(1);
            }
        } catch (e: any) {
            if (e instanceof AbortError || e?.name === 'AbortError') return;
            setError(e.message || 'Failed to extract signal. Please check your API key and try again.');
        } finally {
            setIsLoading(false);
            if (loadingIntervalRef.current) {
                clearInterval(loadingIntervalRef.current);
            }
            setLoadingMessage('');
            abortControllerRef.current = null;
        }
    }, [config]);

    useEffect(() => {
        return () => {
            abortControllerRef.current?.abort();
        };
    }, []);

    const handleReset = () => {
        setConfig({ messyPrompt: '' });
        setResult(null);
        setError(null);
        db.clearSignalDraft(1);
    };

    const handleSaveSignal = async () => {
        if (!result || !saveName.trim()) return;

        const newSignal: SavedSignal = {
            name: saveName.trim(),
            config,
            extractedSignal: `${result.promptSignal}\n\n${result.signalConstraints}`,
            promptSignal: result.promptSignal,
            signalConstraints: result.signalConstraints,
            createdAt: new Date().toISOString(),
            isStarred: false,
            isPinned: false,
            isArchived: false,
            category: ''
        };

        await db.addSignal(newSignal);
        setSuccessMessage('Signal saved successfully!');
        loadSavedSignals();
        setIsSaveModalOpen(false);
        setSaveName('');
    };

    const handleUpdateMetadata = async (signal: SavedSignal, metadata: any) => {
        const updated = { ...signal, ...metadata };
        await db.updateSignal(updated);
        setSavedSignals(prev => prev.map(s => s.id === signal.id ? updated : s));
        if (previewSignal?.id === signal.id) setPreviewSignal(updated);
    };

    const signalToUnified = (signal: SavedSignal): UnifiedItem => ({
        id: `signal-${signal.id}`,
        name: signal.name,
        type: 'signal',
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
        await db.deleteSignal(deleteTarget);
        setSavedSignals(prev => prev.filter(s => s.id !== deleteTarget));
        setSuccessMessage('Signal deleted successfully!');
        setIsDeleteConfirmOpen(false);
        setDeleteTarget(null);
        setPreviewSignal(null);
    };

    const handleClearAll = async () => {
        await db.clearAllSignals();
        loadSavedSignals();
        setSuccessMessage('All signals cleared.');
        setIsClearAllConfirmOpen(false);
    };

    const handleLoadSaved = (signal: SavedSignal) => {
        setConfig(signal.config);
        setResult({
            promptSignal: signal.promptSignal,
            signalConstraints: signal.signalConstraints
        });
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const handleAcceptDraft = () => {
        if (!pendingDraft) return;
        setConfig(pendingDraft);
        setDraftStatus('loaded');
        setPendingDraft(null);
    };

    const handleDeclineDraft = async () => {
        await db.clearSignalDraft(1);
        setDraftStatus('none');
        setPendingDraft(null);
    };

    const handleTransfer = () => {
        if (!result) return;
        onTransfer({
            goal: result.promptSignal,
            instructions: result.signalConstraints
        });
    };

    const handleCopySignal = (originalPrompt: string, signal: string, constraints: string) => {
        const quotedOriginal = originalPrompt.split('\n').map(line => `> ${line}`).join('\n');
        const textToCopy = `## User Prompt\n\n${quotedOriginal}\n>\n>\n\n## Prompt Signal\n\n${signal}\n\n## Signal Constraints\n\n${constraints}`;
        navigator.clipboard.writeText(textToCopy);
        setSuccessMessage('Signal copied to clipboard!');
    };

    const handleExportSignal = (name: string, originalPrompt: string, signal: string, constraints: string) => {
        const quotedOriginal = originalPrompt.split('\n').map(line => `> ${line}`).join('\n');
        const content = `## User Prompt\n\n${quotedOriginal}\n>\n>\n\n## Prompt Signal\n\n${signal}\n\n## Signal Constraints\n\n${constraints}`;
        const filename = sanitizeFilename(name || 'extracted-signal') + '.md';

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

    const totalChars = result ? (result.promptSignal.length + result.signalConstraints.length) : 0;

    return (
        <div className="max-w-4xl mx-auto animate-fade-in">
            <Toast message={successMessage} onClose={() => setSuccessMessage('')} />

            <PipelineIndicator currentView="signal-extractor" />

            <div className="flex justify-between items-center mb-10">
                <div>
                    <h2 className="text-3xl font-extrabold text-slate-900 dark:text-slate-100 flex items-center">
                        Signal Center
                    </h2>
                    <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">
                        {activeTab === 'extractor'
                            ? 'Extract and amplify the core signal from messy thoughts or rough notes.'
                            : activeTab === 'seed'
                            ? 'Evaluate the semantic stability and language curvature of your prompts.'
                            : 'Compress text signals into a coherent, high-density compaction.'}
                    </p>
                </div>
            </div>

            {/* Tabs */}
            <div className="mb-10">
                <nav className="flex flex-wrap gap-2" aria-label="Signal Tabs" role="tablist">
                    <button
                        role="tab"
                        aria-selected={activeTab === 'extractor'}
                        onClick={() => setActiveTab('extractor')}
                        className={`whitespace-nowrap py-2.5 px-5 rounded-xl font-semibold text-xs tracking-wider uppercase transition-all duration-200 cursor-pointer ${activeTab === 'extractor' ? 'bg-blue-600 text-white shadow-md shadow-blue-600/10' : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-900/50'}`}
                    >
                        Signal Extractor
                    </button>
                    <button
                        role="tab"
                        aria-selected={activeTab === 'seed'}
                        onClick={() => setActiveTab('seed')}
                        className={`whitespace-nowrap py-2.5 px-5 rounded-xl font-semibold text-xs tracking-wider uppercase transition-all duration-200 cursor-pointer ${activeTab === 'seed' ? 'bg-purple-600 text-white shadow-md shadow-purple-600/10' : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-900/50'}`}
                    >
                        Seed Architect
                    </button>
                    <button
                        role="tab"
                        aria-selected={activeTab === 'compression'}
                        onClick={() => setActiveTab('compression')}
                        className={`whitespace-nowrap py-2.5 px-5 rounded-xl font-semibold text-xs tracking-wider uppercase transition-all duration-200 cursor-pointer ${activeTab === 'compression' ? 'bg-cyan-600 text-white shadow-md shadow-cyan-600/10' : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-900/50'}`}
                    >
                        Compression
                    </button>
                </nav>
            </div>

            {activeTab === 'extractor' ? (
                <>
            <div className="bg-transparent mb-12">
                <form onSubmit={(e) => { e.preventDefault(); handleGenerate(); }} className="space-y-6">
                    <div className="border-b border-slate-200/60 dark:border-slate-800/50 pb-4 mb-6">
                        <h2 className="text-sm font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest">
                            Input Signal Context
                        </h2>
                    </div>

                    <div>
                        <label htmlFor="messyPrompt" className="block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2">
                            Input Messy Prompt <span className="text-red-500 ml-1">*</span>
                        </label>
                        <textarea
                            id="messyPrompt"
                            rows={8}
                            value={config.messyPrompt}
                            onChange={(e) => setConfig({ messyPrompt: e.target.value })}
                            placeholder="Paste your messy thoughts, rough notes, or disorganized instructions here..."
                            className="w-full px-4 py-3 bg-white dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 rounded-xl text-sm focus:ring-2 focus:ring-blue-500/40 outline-none transition custom-scrollbar"
                            required
                        />
                    </div>

                    <div className="flex flex-col sm:flex-row items-center justify-end gap-3 pt-4 border-t border-slate-200/60 dark:border-slate-800/50">
                        <button type="button" onClick={handleReset} disabled={isLoading} className="w-full sm:w-auto px-6 py-2.5 border border-slate-200 dark:border-slate-800 rounded-xl text-sm font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-900/60 transition cursor-pointer">Reset</button>
                        <button type="submit" disabled={!config.messyPrompt.trim() || isLoading} className="w-full sm:w-auto flex items-center justify-center px-6 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-sm font-semibold shadow-md shadow-blue-600/10 disabled:opacity-50 disabled:cursor-not-allowed transition cursor-pointer">
                            {isLoading ? 'Extracting...' : 'Extract Signal'}
                        </button>
                    </div>
                </form>
            </div>

            {error && (
                <div className="mt-8 bg-red-500/10 border border-red-500/20 text-red-600 dark:text-red-400 px-5 py-4 rounded-2xl text-sm" role="alert">
                    <strong className="font-bold">Error: </strong>
                    <span className="block sm:inline">{error}</span>
                </div>
            )}

            {isLoading && <LoadingSpinner message={loadingMessage || 'Extracting signal...'} />}

            {result && !isLoading && (
                <div className="mt-12 bg-transparent animate-fade-in">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between pb-6 mb-4 border-b border-slate-200/60 dark:border-slate-800/50 gap-4">
                        <div>
                            <h3 className="text-xl font-bold text-slate-800 dark:text-slate-200">Extracted Signal</h3>
                            <p className="text-xs text-slate-500 mt-1">{totalChars} / 1000 characters utilized.</p>
                        </div>
                        <div className="flex flex-wrap items-center gap-3">
                           <button onClick={() => handleCopySignal(config.messyPrompt, result.promptSignal, result.signalConstraints)} className="flex items-center px-4 py-2 border border-slate-200 dark:border-slate-800 rounded-xl text-sm font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-900/60 transition cursor-pointer" title="Copy to clipboard">
                                <span className="material-icons text-base mr-2">content_copy</span>Copy
                            </button>
                           <button onClick={() => { handleExportSignal(saveName, config.messyPrompt, result.promptSignal, result.signalConstraints); setSuccessMessage('Signal exported successfully!'); }} className="flex items-center px-4 py-2 border border-slate-200 dark:border-slate-800 rounded-xl text-sm font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-900/60 transition cursor-pointer" title="Export signal">
                                <span className="material-icons text-base mr-2">download</span>Export
                           </button>
                           <button onClick={() => setIsSaveModalOpen(true)} className="flex items-center px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-sm font-semibold shadow-md shadow-blue-600/10 transition cursor-pointer" title="Save signal">
                                <span className="material-icons text-base mr-2">save</span>Save
                            </button>
                           <button onClick={handleTransfer} className="flex items-center px-4 py-2 bg-amber-600 hover:bg-amber-500 text-white rounded-xl text-sm font-semibold shadow-md shadow-amber-600/10 transition cursor-pointer" title="Transfer to Prompt Architect">
                                <span className="material-icons text-base mr-2">psychology</span>Transfer
                            </button>
                        </div>
                    </div>

                    <div className="space-y-10 py-4">
                        <div className="space-y-4">
                            <h4 className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest">Prompt Signal</h4>
                            <div className="prose prose-slate prose-sm dark:prose-invert max-w-none bg-slate-50 dark:bg-slate-900/30 p-5 rounded-2xl border border-slate-100 dark:border-slate-800/50">
                                <ReactMarkdown remarkPlugins={[remarkGfm]}>{result.promptSignal ?? ''}</ReactMarkdown>
                            </div>
                        </div>

                        <div className="space-y-4">
                            <h4 className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest">Signal Constraints</h4>
                            <div className="prose prose-slate prose-sm dark:prose-invert max-w-none bg-slate-50 dark:bg-slate-900/30 p-5 rounded-2xl border border-slate-100 dark:border-slate-800/50">
                                <ReactMarkdown remarkPlugins={[remarkGfm]}>{result.signalConstraints ?? ''}</ReactMarkdown>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {savedSignals.length > 0 && (
                <div className="mt-20 border-t border-slate-200/60 dark:border-slate-800/50 pt-16">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-8 gap-4">
                        <h2 className="text-2xl font-extrabold text-slate-800 dark:text-slate-200">Saved Signals</h2>
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
                            onSelect={(id) => handleLoadSaved(savedSignals.find(s => `signal-${s.id}` === id)!)}
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
                            onSelect={(id) => handleLoadSaved(savedSignals.find(s => `signal-${s.id}` === id)!)}
                            selectedIds={new Set()}
                        />
                    </div>

                    <div className="mb-6">
                        <div className="relative">
                            <span className="material-icons absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">search</span>
                            <input
                                type="text"
                                placeholder="Search saved signals..."
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
                                    icon="unarchive"
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

                </>
            ) : activeTab === 'seed' ? (
                <SeedArchitect />
            ) : (
                <SignalCompressionArchitect />
            )}

            <Modal isOpen={!!pendingDraft} onClose={() => setPendingDraft(null)} title="Unsaved Draft Found">
                <div className="space-y-4">
                    <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                        An unsaved signal extractor draft was found. Would you like to restore it?
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
                        Are you sure you want to clear ALL signals? This action cannot be undone.
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
                        Are you sure you want to delete this signal? This action cannot be undone.
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
                content={previewSignal ? `## User Prompt\n\n${previewSignal.config.messyPrompt.split('\n').map(line => `> ${line}`).join('\n')}\n>\n>\n\n## Prompt Signal\n\n${previewSignal.promptSignal}\n\n## Signal Constraints\n\n${previewSignal.signalConstraints}` : ''}
                metadata={previewSignal || undefined}
                onUpdateMetadata={(metadata) => previewSignal && handleUpdateMetadata(previewSignal, metadata)}
                onCopy={() => {
                    if (previewSignal) {
                        handleCopySignal(previewSignal.config.messyPrompt, previewSignal.promptSignal, previewSignal.signalConstraints);
                    }
                }}
                onExport={() => {
                    if (previewSignal) {
                        handleExportSignal(previewSignal.name, previewSignal.config.messyPrompt, previewSignal.promptSignal, previewSignal.signalConstraints);
                    }
                }}
                onDelete={() => {
                    if (previewSignal?.id) {
                        handleDelete(previewSignal.id);
                        setPreviewSignal(null);
                    }
                }}
            />

            <Modal isOpen={isSaveModalOpen} onClose={() => setIsSaveModalOpen(false)} title="Save Extracted Signal">
                <div className="space-y-4 animate-fade-in">
                    <div>
                        <label htmlFor="saveName" className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">Signal Name</label>
                        <input
                            type="text"
                            id="saveName"
                            value={saveName}
                            onChange={(e) => setSaveName(e.target.value)}
                            placeholder="e.g., Email Marketing Signal"
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
                            Save Signal
                        </button>
                    </div>
                </div>
            </Modal>
        </div>
    );
};

export default SignalExtractor;

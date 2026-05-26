
import React, { useState, useCallback, useEffect, useRef } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { extractSignal } from '../services/ai/signalService';
import { SignalConfig, ExtractedSignal, SavedSignal, PromptConfig } from '../types';
import * as db from '../services/dbService';
import { sanitizeFilename } from '../utils/security';
import LoadingSpinner from './LoadingSpinner';
import Modal from './Modal';
import PreviewModal from './PreviewModal';
import Toast from './Toast';

interface SignalExtractorProps {
    onTransfer: (config: PromptConfig) => void;
}

const SignalExtractor: React.FC<SignalExtractorProps> = ({ onTransfer }) => {
    const [config, setConfig] = useState<SignalConfig>({ messyPrompt: '' });
    const [result, setResult] = useState<ExtractedSignal | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [loadingMessage, setLoadingMessage] = useState('');
    const loadingIntervalRef = useRef<number | null>(null);

    const [savedSignals, setSavedSignals] = useState<SavedSignal[]>([]);
    const [successMessage, setSuccessMessage] = useState('');
    const [draftStatus, setDraftStatus] = useState<'unloaded' | 'loaded' | 'none'>('unloaded');
    const [pendingDraft, setPendingDraft] = useState<SignalConfig | null>(null);
    const isCheckingDraft = useRef(false);

    const [isSaveModalOpen, setIsSaveModalOpen] = useState(false);
    const [previewSignal, setPreviewSignal] = useState<SavedSignal | null>(null);
    const [saveName, setSaveName] = useState('');

    const loadSavedSignals = useCallback(async () => {
        const signals = await db.getAllSignals();
        setSavedSignals(signals);
    }, []);

    useEffect(() => {
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
    }, [loadSavedSignals]);

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
            const extracted = await extractSignal(config);
            setResult(extracted);
            await db.clearSignalDraft(1);
        } catch (e: any) {
            setError(e.message || 'Failed to extract signal. Please check your API key and try again.');
        } finally {
            setIsLoading(false);
            if (loadingIntervalRef.current) {
                clearInterval(loadingIntervalRef.current);
            }
            setLoadingMessage('');
        }
    }, [config]);

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
            createdAt: new Date().toISOString()
        };

        await db.addSignal(newSignal);
        setSuccessMessage('Signal saved successfully!');
        loadSavedSignals();
        setIsSaveModalOpen(false);
        setSaveName('');
    };

    const handleDelete = async (id: number) => {
        if (window.confirm('Are you sure you want to delete this signal?')) {
            await db.deleteSignal(id);
            setSavedSignals(prev => prev.filter(s => s.id !== id));
            setSuccessMessage('Signal deleted successfully!');
        }
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
        <div className="max-w-4xl mx-auto">
            <Toast message={successMessage} onClose={() => setSuccessMessage('')} />

            <div className="mt-8 bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-6 md:p-8 border border-gray-200 dark:border-gray-700/50">
                <form onSubmit={(e) => { e.preventDefault(); handleGenerate(); }} className="space-y-6">
                    <div className="flex flex-col sm:flex-row justify-between items-center mb-6 gap-4">
                        <h2 className="text-2xl font-semibold text-gray-800 dark:text-gray-200 flex items-center">
                            <span className="material-icons mr-2 text-blue-500 dark:text-blue-400">unarchive</span>
                            Signal Extractor
                        </h2>
                    </div>

                    <div>
                        <label htmlFor="messyPrompt" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                            Input Messy Prompt <span className="text-red-500 ml-1">*</span>
                        </label>
                        <textarea
                            id="messyPrompt"
                            rows={8}
                            value={config.messyPrompt}
                            onChange={(e) => setConfig({ messyPrompt: e.target.value })}
                            placeholder="Paste your messy thoughts, rough notes, or disorganized instructions here..."
                            className="w-full px-4 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm transition focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent hover:ring-2 hover:ring-blue-500/20 text-gray-900 dark:text-gray-100"
                            required
                        />
                    </div>

                    <div className="flex flex-col sm:flex-row items-center justify-end space-y-4 sm:space-y-0 sm:space-x-4 pt-2">
                        <button type="button" onClick={handleReset} disabled={isLoading} className="w-full sm:w-auto px-6 py-2 border border-gray-300 dark:border-gray-500 rounded-md shadow-sm text-sm font-medium text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 disabled:opacity-50 transition">Reset</button>
                        <button type="submit" disabled={!config.messyPrompt.trim() || isLoading} className="w-full sm:w-auto flex items-center justify-center px-6 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:bg-blue-300 dark:disabled:bg-blue-800 disabled:cursor-not-allowed transition">
                            {isLoading ? 'Extracting...' : 'Extract Signal'}
                        </button>
                    </div>
                </form>
            </div>

            {error && (
                <div className="mt-8 bg-red-100 dark:bg-red-900/50 border border-red-400 dark:border-red-700 text-red-700 dark:text-red-200 px-4 py-3 rounded-lg relative" role="alert">
                    <strong className="font-bold">Error: </strong>
                    <span className="block sm:inline">{error}</span>
                </div>
            )}

            {isLoading && <LoadingSpinner message={loadingMessage || 'Extracting signal...'} />}

            {result && !isLoading && (
                <div className="mt-8 bg-white dark:bg-gray-800 rounded-2xl shadow-lg overflow-hidden border border-gray-200 dark:border-gray-700">
                    <div className="flex flex-col md:flex-row justify-between items-center p-4 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50">
                        <h3 className="text-xl font-semibold text-gray-800 dark:text-gray-200">Extracted Signal</h3>
                        <div className="flex flex-wrap items-center justify-center md:justify-end gap-3 mt-3 md:mt-0">
                           <span className={`text-xs font-mono px-2 py-1 rounded ${totalChars > 1000 ? 'bg-red-100 text-red-700' : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400'}`}>
                                {totalChars} / 1000 characters
                           </span>
                           <button onClick={() => handleCopySignal(config.messyPrompt, result.promptSignal, result.signalConstraints)} className="flex items-center px-3 py-1.5 border border-gray-300 dark:border-gray-600 rounded-md text-sm text-gray-700 dark:text-gray-200 hover:bg-white dark:hover:bg-gray-700 transition" title="Copy to clipboard">
                                <span className="material-icons text-base mr-1.5">content_copy</span>Copy to clipboard
                            </button>
                           <button onClick={() => { handleExportSignal(saveName, config.messyPrompt, result.promptSignal, result.signalConstraints); setSuccessMessage('Signal exported successfully!'); }} className="flex items-center px-3 py-1.5 border border-gray-300 dark:border-gray-600 rounded-md text-sm text-gray-700 dark:text-gray-200 hover:bg-white dark:hover:bg-gray-700 transition" title="Export signal">
                                <span className="material-icons text-base mr-1.5">download</span>Export
                           </button>
                           <button onClick={() => setIsSaveModalOpen(true)} className="flex items-center px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-md text-sm transition" title="Save signal">
                                <span className="material-icons text-base mr-1.5">save</span>Save
                            </button>
                           <button onClick={handleTransfer} className="flex items-center px-3 py-1.5 bg-orange-500 hover:bg-orange-600 text-white rounded-md text-sm transition" title="Transfer to Prompt Architect">
                                <span className="material-icons text-base mr-1.5">psychology</span>Transfer
                            </button>
                        </div>
                    </div>

                    <div className="p-6 space-y-8 bg-white dark:bg-gray-800">
                        <div>
                            <h4 className="text-sm font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3">Prompt Signal</h4>
                            <div className="p-4 bg-gray-50 dark:bg-gray-900/70 rounded-lg prose prose-sm dark:prose-invert max-w-none border border-gray-200 dark:border-gray-700 prose-blockquote:border-l-4 prose-blockquote:border-blue-500 prose-blockquote:bg-white dark:prose-blockquote:bg-gray-800 prose-blockquote:py-2 prose-blockquote:px-4 prose-blockquote:rounded-r-lg prose-blockquote:italic">
                                <ReactMarkdown remarkPlugins={[remarkGfm]}>{result.promptSignal ?? ''}</ReactMarkdown>
                            </div>
                        </div>

                        <div>
                            <h4 className="text-sm font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3">Signal Constraints</h4>
                            <div className="p-4 bg-gray-50 dark:bg-gray-900/70 rounded-lg prose prose-sm dark:prose-invert max-w-none border border-gray-200 dark:border-gray-700 prose-blockquote:border-l-4 prose-blockquote:border-blue-500 prose-blockquote:bg-white dark:prose-blockquote:bg-gray-800 prose-blockquote:py-2 prose-blockquote:px-4 prose-blockquote:rounded-r-lg prose-blockquote:italic">
                                <ReactMarkdown remarkPlugins={[remarkGfm]}>{result.signalConstraints ?? ''}</ReactMarkdown>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {savedSignals.length > 0 && (
                <div className="mt-12">
                    <div className="flex justify-between items-center mb-6">
                        <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-200">Saved Signals</h2>
                        <button onClick={async () => { if(window.confirm('Clear all signals?')){ await db.clearAllSignals(); loadSavedSignals(); } }} className="text-sm text-red-500 hover:text-red-600 flex items-center">
                            <span className="material-icons text-sm mr-1">delete_sweep</span> Clear All
                        </button>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {savedSignals.map(s => (
                            <div key={s.id} className="bg-white dark:bg-gray-800 p-4 rounded-xl shadow border border-gray-200 dark:border-gray-700 flex justify-between items-center group hover:border-blue-500 dark:hover:border-blue-400 transition-colors border-transparent">
                                <div className="flex-grow cursor-pointer" onClick={() => handleLoadSaved(s)}>
                                    <p className="font-semibold text-gray-800 dark:text-gray-200">{s.name}</p>
                                    <p className="text-xs text-gray-500 dark:text-gray-400">{new Date(s.createdAt).toLocaleDateString()}</p>
                                </div>
                                <div className="flex items-center space-x-1">
                                    <button onClick={() => setPreviewSignal(s)} className="p-2 text-gray-500 hover:text-blue-500 transition-colors" title="Preview"><span className="material-icons">visibility</span></button>
                                    <button onClick={() => handleDelete(s.id!)} className="p-2 text-gray-500 hover:text-red-500 transition-colors" title="Delete"><span className="material-icons">delete</span></button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            <Modal isOpen={!!pendingDraft} onClose={() => setPendingDraft(null)} title="Unsaved Draft Found">
                <div className="space-y-4">
                    <p className="text-gray-600 dark:text-gray-400">
                        An unsaved signal extractor draft was found. Would you like to restore it?
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

            <PreviewModal
                isOpen={!!previewSignal}
                onClose={() => setPreviewSignal(null)}
                title={`Preview: ${previewSignal?.name}`}
                content={previewSignal ? `## User Prompt\n\n${previewSignal.config.messyPrompt.split('\n').map(line => `> ${line}`).join('\n')}\n>\n>\n\n## Prompt Signal\n\n${previewSignal.promptSignal}\n\n## Signal Constraints\n\n${previewSignal.signalConstraints}` : ''}
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
                <div className="space-y-4">
                    <div>
                        <label htmlFor="saveName" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Signal Name</label>
                        <input
                            type="text"
                            id="saveName"
                            value={saveName}
                            onChange={(e) => setSaveName(e.target.value)}
                            placeholder="e.g., Email Marketing Signal"
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
                            Save Signal
                        </button>
                    </div>
                </div>
            </Modal>
        </div>
    );
};

export default SignalExtractor;

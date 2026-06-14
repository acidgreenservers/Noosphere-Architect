import React, { useState, useEffect, useRef } from 'react';
import { SynthesisLine, SavedSynthesis } from '../types';
import { extractSynthesisNodes, synthesizeNodes } from '../services/ai/synthesisService';
import { AbortError } from '../services/ai/openRouter';
import { addSynthesis } from '../services/dbService';
import { getOpenRouterKey, getOpenRouterModel } from '../services/sessionService';
import LoadingSpinner from './LoadingSpinner';
import Toast from './Toast';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

interface SynthesisWorkspaceProps {
    sourceItems: any[];
    onClose: () => void;
    onSaveSuccess: () => void;
}

type WorkspaceState =
    | 'checking'       // Checking if AI is configured
    | 'awaiting_config'// AI not configured — show CTA
    | 'extracting'     // Running extraction on source items
    | 'idle'          // Nodes extracted, waiting for user action
    | 'synthesizing'   // Running synthesis on selected nodes
    | 'result'        // Synthesis complete, showing result
    | 'error';        // Persistent error state

const SynthesisWorkspace: React.FC<SynthesisWorkspaceProps> = ({ sourceItems, onClose, onSaveSuccess }) => {
    const [state, setState] = useState<WorkspaceState>('checking');
    const [lines, setLines] = useState<SynthesisLine[]>([]);
    const [loadingMessage, setLoadingMessage] = useState('');
    const abortControllerRef = useRef<AbortController | null>(null);
    const [intent, setIntent] = useState('');
    const [result, setResult] = useState<string | null>(null);
    const [errorMessage, setErrorMessage] = useState<string | null>(null);
    const [toast, setToast] = useState<{ message: string, type: 'success' | 'error' } | null>(null);

    useEffect(() => {
        // Pre-flight check: is AI configured?
        const apiKey = getOpenRouterKey();
        const model = getOpenRouterModel();

        if (!apiKey && !model) {
            setErrorMessage('OpenRouter API Key and Model are required. Please configure them in Agent API Settings.');
            setState('awaiting_config');
            return;
        }
        if (!apiKey) {
            setErrorMessage('OpenRouter API Key is required. Please set it in Agent API Settings.');
            setState('awaiting_config');
            return;
        }
        if (!model) {
            setErrorMessage('OpenRouter Model is required. Please select one in Agent API Settings.');
            setState('awaiting_config');
            return;
        }

        // AI is configured — proceed with extraction
        const controller = new AbortController();
        abortControllerRef.current = controller;

        const prepareLines = async () => {
            setState('extracting');
            setLoadingMessage('Decompressing sources into reasoning nodes...');
            const allLines: SynthesisLine[] = [];

            try {
                for (const item of sourceItems) {
                    if (controller.signal.aborted) return;

                    const content = item.prompt || item.extractedSignal || item.content || item.generatedTask ||
                                   (item.files ? Object.values(item.files).join('\n\n') : '') ||
                                   (item.result?.seeds ? `Explanation: ${item.result.explanation}\n\nInvariants: ${item.result.seeds.join('\n')}` : '') ||
                                   (item.result?.seed ? `> ${item.result.seed}\n\nPattern: ${item.result.pattern}\n\nDeploy When: ${item.result.deployWhen}` : '');

                    if (!content) continue;

                    const nodes = await extractSynthesisNodes(content, controller.signal);
                    nodes.forEach((node, idx) => {
                        allLines.push({
                            id: `${item.id}-${idx}`,
                            content: node,
                            sourceId: String(item.id),
                            sourceName: item.name || item.result?.seed || 'Unknown Source',
                            isSelected: true
                        });
                    });
                }
                if (!controller.signal.aborted) {
                    setLines(allLines);
                    setState('idle');
                }
            } catch (err: any) {
                if (err instanceof AbortError || controller.signal.aborted) return;
                setErrorMessage(err?.message || 'Failed to extract reasoning nodes from sources.');
                setState('error');
            }
        };

        prepareLines();

        return () => {
            controller.abort();
        };
    }, [sourceItems]);

    const handleSynthesize = async () => {
        const selectedNodes = lines.filter(l => l.isSelected).map(l => l.content);
        if (selectedNodes.length === 0) {
            setToast({ message: 'Please select at least one node to synthesize', type: 'error' });
            return;
        }

        abortControllerRef.current?.abort();
        const controller = new AbortController();
        abortControllerRef.current = controller;

        setState('synthesizing');
        setLoadingMessage('Synthesizing reasoning topology...');
        try {
            const synthesized = await synthesizeNodes(selectedNodes, intent, controller.signal);
            if (!controller.signal.aborted) {
                setResult(synthesized);
                setState('result');
                setToast({ message: 'Synthesis complete!', type: 'success' });
            }
        } catch (err: any) {
            if (err instanceof AbortError || err?.name === 'AbortError') return;
            setErrorMessage(err?.message || 'Synthesis failed.');
            setState('error');
        }
    };

    const handleSave = async () => {
        if (!result) return;
        const name = `Synthesis: ${intent.slice(0, 30) || 'Untitled'}`;
        const newSynthesis: SavedSynthesis = {
            name,
            content: result,
            lines: lines.filter(l => l.isSelected),
            lineage: Array.from(new Set(sourceItems.map(i => i.name || i.result?.seed))),
            createdAt: new Date().toISOString(),
            isStarred: false,
            isPinned: false,
            isArchived: false,
            category: 'Synthesized'
        };

        try {
            await addSynthesis(newSynthesis);
            setToast({ message: 'Synthesis saved to library!', type: 'success' });
            onSaveSuccess();
            setTimeout(onClose, 1500);
        } catch (err) {
            setToast({ message: 'Failed to save synthesis', type: 'error' });
        }
    };

    const toggleLine = (id: string) => {
        setLines(prev => prev.map(l => l.id === id ? { ...l, isSelected: !l.isSelected } : l));
    };

    // ── Render: Awaiting Config ──────────────────────────────────────
    if (state === 'awaiting_config') {
        return (
            <div className="fixed inset-0 z-50 bg-gray-900/90 backdrop-blur-sm overflow-y-auto">
                <div className="min-h-screen p-4 md:p-12 flex flex-col items-center justify-center">
                    <div className="bg-gray-800 border border-gray-700 rounded-3xl p-8 shadow-2xl max-w-lg w-full text-center space-y-6">
                        <div className="bg-yellow-900/30 rounded-full w-16 h-16 flex items-center justify-center mx-auto">
                            <span className="material-icons text-yellow-400 text-3xl">settings</span>
                        </div>
                        <h2 className="text-2xl font-bold text-white">AI Service Not Configured</h2>
                        <p className="text-gray-400">{errorMessage}</p>
                        <button
                            onClick={onClose}
                            className="px-8 py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl transition-all shadow-lg"
                        >
                            Configure in Settings
                        </button>
                        <div>
                            <button onClick={onClose} className="text-gray-500 hover:text-gray-300 text-sm underline">
                                Cancel
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    // ── Render: Extracting / Synthesizing ────────────────────────────
    if (state === 'extracting' || state === 'synthesizing') {
        return (
            <div className="fixed inset-0 z-50 bg-gray-900/90 backdrop-blur-sm overflow-y-auto">
                <div className="min-h-screen p-4 md:p-12 flex flex-col items-center justify-center">
                    <LoadingSpinner message={loadingMessage} />
                </div>
            </div>
        );
    }

    // ── Render: Error ────────────────────────────────────────────────
    if (state === 'error') {
        return (
            <div className="fixed inset-0 z-50 bg-gray-900/90 backdrop-blur-sm overflow-y-auto">
                <div className="min-h-screen p-4 md:p-12 flex flex-col items-center justify-center">
                    <div className="bg-gray-800 border border-red-800 rounded-3xl p-8 shadow-2xl max-w-lg w-full text-center space-y-6">
                        <div className="bg-red-900/30 rounded-full w-16 h-16 flex items-center justify-center mx-auto">
                            <span className="material-icons text-red-400 text-3xl">error_outline</span>
                        </div>
                        <h2 className="text-2xl font-bold text-white">Extraction Failed</h2>
                        <p className="text-gray-400">{errorMessage}</p>
                        <button
                            onClick={onClose}
                            className="px-8 py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl transition-all shadow-lg"
                        >
                            Back to Organization
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    // ── Render: Nodes (idle) ─────────────────────────────────────────
    return (
        <div className="fixed inset-0 z-50 bg-gray-900/90 backdrop-blur-sm overflow-y-auto">
            <div className="min-h-screen p-4 md:p-12 flex flex-col">
                <div className="flex justify-between items-center mb-8">
                    <h2 className="text-3xl font-bold text-white flex items-center gap-3">
                        <span className="material-icons text-blue-400">auto_fix_high</span>
                        Topology Synthesis Workspace
                    </h2>
                    <button onClick={onClose} className="text-gray-400 hover:text-white transition-colors">
                        <span className="material-icons text-3xl">close</span>
                    </button>
                </div>

                {state === 'idle' && (
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 flex-grow">
                        <div className="lg:col-span-2 space-y-6">
                            <div className="bg-gray-800 border border-gray-700 rounded-3xl p-6 shadow-2xl">
                                <h3 className="text-lg font-bold text-gray-300 mb-4 flex items-center gap-2">
                                    <span className="material-icons text-sm">list_alt</span>
                                    Reasoning Nodes
                                </h3>
                                <div className="space-y-3 max-h-[60vh] overflow-y-auto pr-2 custom-scrollbar">
                                    {lines.map(line => (
                                        <div
                                            key={line.id}
                                            onClick={() => toggleLine(line.id)}
                                            className={`p-4 rounded-xl border transition-all cursor-pointer ${
                                                line.isSelected
                                                ? 'bg-blue-600/20 border-blue-500 text-white'
                                                : 'bg-gray-900/50 border-gray-700 text-gray-500 hover:border-gray-600'
                                            }`}
                                        >
                                            <div className="flex items-start gap-4">
                                                <span className="material-icons mt-0.5">
                                                    {line.isSelected ? 'check_box' : 'check_box_outline_blank'}
                                                </span>
                                                <div className="flex-grow">
                                                    <p className="text-sm font-medium">{line.content}</p>
                                                    <p className="text-[10px] mt-2 opacity-50 uppercase tracking-widest font-bold">Source: {line.sourceName}</p>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>

                        <div className="space-y-6">
                            <div className="bg-gray-800 border border-gray-700 rounded-3xl p-6 shadow-xl sticky top-6">
                                <h3 className="text-lg font-bold text-gray-300 mb-4">Synthesis Intent</h3>
                                <textarea
                                    value={intent}
                                    onChange={(e) => setIntent(e.target.value)}
                                    placeholder="Describe how you want to combine these nodes (e.g., 'Focus on security guardrails' or 'Create a creative coding agent')..."
                                    className="w-full h-40 bg-gray-900 border border-gray-700 rounded-xl p-4 text-white placeholder-gray-600 focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                                />
                                <button
                                    onClick={handleSynthesize}
                                    disabled={lines.filter(l => l.isSelected).length === 0}
                                    className="w-full mt-6 py-4 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl transition-all shadow-lg shadow-blue-500/20 disabled:opacity-50"
                                >
                                    Synthesize Pathways
                                </button>
                                <p className="mt-4 text-xs text-gray-500 text-center">
                                    {lines.filter(l => l.isSelected).length} nodes selected for intersection.
                                </p>
                            </div>
                        </div>
                    </div>
                )}

                {state === 'result' && result && (
                    <div className="max-w-4xl mx-auto w-full flex-grow space-y-8 animate-in fade-in slide-in-from-bottom-8 duration-700">
                        <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-2xl overflow-hidden border border-gray-200 dark:border-gray-700">
                            <div className="flex justify-between items-center p-6 border-b border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50">
                                <h3 className="text-xl font-bold">Synthesized Result</h3>
                                <div className="flex gap-3">
                                    <button onClick={() => { navigator.clipboard.writeText(result); setToast({ message: 'Copied!', type: 'success' }); }} className="p-2 text-gray-500 hover:text-blue-500 transition-colors">
                                        <span className="material-icons">content_copy</span>
                                    </button>
                                    <button onClick={handleSave} className="flex items-center gap-2 px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl transition-all shadow-lg shadow-blue-500/20">
                                        <span className="material-icons text-sm">save</span>
                                        Save to Library
                                    </button>
                                </div>
                            </div>
                            <div className="p-8 md:p-12 prose dark:prose-invert max-w-none">
                                <ReactMarkdown remarkPlugins={[remarkGfm]}>{result}</ReactMarkdown>
                            </div>
                        </div>
                        <div className="flex justify-center pb-12">
                            <button onClick={() => { setResult(null); setState('idle'); }} className="text-blue-500 font-bold hover:underline">
                                ← Back to Workspace
                            </button>
                        </div>
                    </div>
                )}

                {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
            </div>
        </div>
    );
};

export default SynthesisWorkspace;
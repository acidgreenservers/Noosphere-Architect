
import React, { useState, useCallback, useEffect, useRef } from 'react';
import { extractSignal, generateMindSeeds } from '../services/aiService';
import { SignalConfig, ExtractedSignal, SavedSignal, PromptConfig, MindSeedConfig, MindSeedResult, SavedMindSeed } from '../types';
import * as db from '../services/dbService';
import { sanitizeFilename } from '../utils/security';
import LoadingSpinner from './LoadingSpinner';
import Modal from './Modal';
import Toast from './Toast';

interface MindSeedsProps {
    onTransfer: (config: PromptConfig) => void;
}

const MindSeeds: React.FC<MindSeedsProps> = ({ onTransfer }) => {
    const [activeTab, setActiveTab] = useState<'signal' | 'mindseed'>('mindseed');

    // --- Signal Extractor State ---
    const [signalConfig, setSignalConfig] = useState<SignalConfig>({ messyPrompt: '' });
    const [signalResult, setSignalResult] = useState<ExtractedSignal | null>(null);
    const [isSignalLoading, setIsSignalLoading] = useState(false);
    const [signalError, setSignalError] = useState<string | null>(null);
    const [signalLoadingMessage, setSignalLoadingMessage] = useState('');
    const signalLoadingIntervalRef = useRef<number | null>(null);
    const [savedSignals, setSavedSignals] = useState<SavedSignal[]>([]);

    // --- MindSeed State ---
    const [mindSeedConfig, setMindSeedConfig] = useState<MindSeedConfig>({ sourceContent: '' });
    const [mindSeedResult, setMindSeedResult] = useState<MindSeedResult | null>(null);
    const [isMindSeedLoading, setIsMindSeedLoading] = useState(false);
    const [mindSeedError, setMindSeedError] = useState<string | null>(null);
    const [mindSeedLoadingMessage, setMindSeedLoadingMessage] = useState('');
    const mindSeedLoadingIntervalRef = useRef<number | null>(null);
    const [savedMindSeeds, setSavedMindSeeds] = useState<SavedMindSeed[]>([]);

    const [successMessage, setSuccessMessage] = useState('');
    const [isSaveModalOpen, setIsSaveModalOpen] = useState(false);
    const [saveName, setSaveName] = useState('');

    const loadSavedData = useCallback(async () => {
        const signals = await db.getAllSignals();
        setSavedSignals(signals);
        const mindSeeds = await db.getAllMindSeeds();
        setSavedMindSeeds(mindSeeds);
    }, []);

    useEffect(() => {
        loadSavedData();
        const loadDrafts = async () => {
            const signalDraft = await db.getSignalDraft(1);
            if (signalDraft?.config?.messyPrompt) {
                setSignalConfig(signalDraft.config);
            }
            const mindSeedDraft = await db.getMindSeedDraft(1);
            if (mindSeedDraft?.config?.sourceContent) {
                setMindSeedConfig(mindSeedDraft.config);
            }
        };
        loadDrafts();
    }, [loadSavedData]);

    useEffect(() => {
        const handler = setTimeout(() => {
            if (signalConfig.messyPrompt) db.saveSignalDraft({ id: 1, config: signalConfig });
            if (mindSeedConfig.sourceContent) db.saveMindSeedDraft({ id: 1, config: mindSeedConfig });
        }, 1500);
        return () => clearTimeout(handler);
    }, [signalConfig, mindSeedConfig]);

    // --- Signal Handlers ---
    const handleSignalGenerate = async () => {
        setIsSignalLoading(true);
        setSignalError(null);
        setSignalResult(null);

        const messages = ['Reading messy input...', 'Extracting core signal...', 'Amplifying instructions...', 'Finalizing signal...'];
        let messageIndex = 0;
        setSignalLoadingMessage(messages[0]);
        signalLoadingIntervalRef.current = window.setInterval(() => {
            messageIndex = (messageIndex + 1) % messages.length;
            setSignalLoadingMessage(messages[messageIndex]);
        }, 2000);

        try {
            const extracted = await extractSignal(signalConfig);
            setSignalResult(extracted);
            await db.clearSignalDraft(1);
        } catch (e: any) {
            setSignalError(e.message || 'Failed to extract signal.');
        } finally {
            setIsSignalLoading(false);
            if (signalLoadingIntervalRef.current) clearInterval(signalLoadingIntervalRef.current);
        }
    };

    const handleSignalCopy = () => {
        if (!signalResult) return;
        const quotedOriginal = signalConfig.messyPrompt.split('\n').map(line => `> ${line}`).join('\n');
        const text = `## User Prompt\n\n${quotedOriginal}\n>\n>\n\n## Prompt Signal\n\n${signalResult.promptSignal}\n\n## Signal Constraints\n\n${signalResult.signalConstraints}`;
        navigator.clipboard.writeText(text);
        setSuccessMessage('Signal copied to clipboard!');
    };

    const handleSignalExport = () => {
        if (!signalResult) return;
        const quotedOriginal = signalConfig.messyPrompt.split('\n').map(line => `> ${line}`).join('\n');
        const content = `## User Prompt\n\n${quotedOriginal}\n>\n>\n\n## Prompt Signal\n\n${signalResult.promptSignal}\n\n## Signal Constraints\n\n${signalResult.signalConstraints}`;
        const blob = new Blob([content], { type: 'text/markdown' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${sanitizeFilename(saveName || 'signal')}.md`;
        a.click();
        URL.revokeObjectURL(url);
    };

    // --- MindSeed Handlers ---
    const handleMindSeedGenerate = async () => {
        setIsMindSeedLoading(true);
        setMindSeedError(null);
        setMindSeedResult(null);

        const messages = ['Analyzing source content...', 'Identifying core invariants...', 'Compressing wisdom...', 'Checking structural integrity...'];
        let messageIndex = 0;
        setMindSeedLoadingMessage(messages[0]);
        mindSeedLoadingIntervalRef.current = window.setInterval(() => {
            messageIndex = (messageIndex + 1) % messages.length;
            setMindSeedLoadingMessage(messages[messageIndex]);
        }, 2000);

        try {
            const result = await generateMindSeeds(mindSeedConfig);
            setMindSeedResult(result);
            await db.clearMindSeedDraft(1);
        } catch (e: any) {
            setMindSeedError(e.message || 'Failed to generate mind seeds.');
        } finally {
            setIsMindSeedLoading(false);
            if (mindSeedLoadingIntervalRef.current) clearInterval(mindSeedLoadingIntervalRef.current);
        }
    };

    const handleMindSeedCopy = () => {
        if (!mindSeedResult) return;
        let text = "## Seeds of Wisdom\n\n";
        mindSeedResult.seeds.forEach(s => {
            text += `> **${s.type}**: ${s.content}\n>\n`;
        });
        text += "\n## Structural Integrity Check\n\n| Invariant | Status | Check |\n|---|---|---|\n";
        mindSeedResult.structuralIntegrity.forEach(i => {
            text += `| ${i.invariant} | ${i.status} | ${i.check} |\n`;
        });
        navigator.clipboard.writeText(text);
        setSuccessMessage('MindSeeds copied to clipboard!');
    };

    const handleMindSeedExport = () => {
        if (!mindSeedResult) return;
        let content = "## Seeds of Wisdom\n\n";
        mindSeedResult.seeds.forEach(s => {
            content += `> **${s.type}**: ${s.content}\n>\n`;
        });
        content += "\n## Structural Integrity Check\n\n| Invariant | Status | Check |\n|---|---|---|\n";
        mindSeedResult.structuralIntegrity.forEach(i => {
            content += `| ${i.invariant} | ${i.status} | ${i.check} |\n`;
        });
        const blob = new Blob([content], { type: 'text/markdown' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${sanitizeFilename(saveName || 'mindseeds')}.md`;
        a.click();
        URL.revokeObjectURL(url);
    };

    const handleSave = async () => {
        if (!saveName.trim()) return;
        if (activeTab === 'signal' && signalResult) {
            await db.addSignal({
                name: saveName,
                config: signalConfig,
                extractedSignal: `${signalResult.promptSignal}\n\n${signalResult.signalConstraints}`,
                promptSignal: signalResult.promptSignal,
                signalConstraints: signalResult.signalConstraints,
                createdAt: new Date().toISOString()
            });
        } else if (activeTab === 'mindseed' && mindSeedResult) {
            await db.addMindSeed({
                name: saveName,
                config: mindSeedConfig,
                result: mindSeedResult,
                createdAt: new Date().toISOString()
            });
        }
        setSuccessMessage('Saved successfully!');
        setIsSaveModalOpen(false);
        setSaveName('');
        loadSavedData();
    };

    return (
        <div className="max-w-4xl mx-auto">
            <Toast message={successMessage} onClose={() => setSuccessMessage('')} />

            <div className="flex space-x-1 bg-gray-200 dark:bg-gray-800 p-1 rounded-xl mb-8">
                <button
                    onClick={() => setActiveTab('mindseed')}
                    className={`flex-1 py-2.5 text-sm font-medium rounded-lg transition-all ${activeTab === 'mindseed' ? 'bg-white dark:bg-gray-700 text-blue-600 dark:text-blue-400 shadow' : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'}`}
                >
                    MindSeed Creator
                </button>
                <button
                    onClick={() => setActiveTab('signal')}
                    className={`flex-1 py-2.5 text-sm font-medium rounded-lg transition-all ${activeTab === 'signal' ? 'bg-white dark:bg-gray-700 text-blue-600 dark:text-blue-400 shadow' : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'}`}
                >
                    Signal Extractor
                </button>
            </div>

            {activeTab === 'signal' ? (
                <div className="space-y-8 animate-in fade-in duration-300">
                    <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-6 md:p-8 border border-gray-200 dark:border-gray-700/50">
                        <h2 className="text-2xl font-semibold mb-6 flex items-center">
                            <span className="material-icons mr-2 text-blue-500">unarchive</span>
                            Signal Extractor
                        </h2>
                        <textarea
                            rows={8}
                            value={signalConfig.messyPrompt}
                            onChange={(e) => setSignalConfig({ messyPrompt: e.target.value })}
                            placeholder="Paste messy thoughts or disorganized instructions here..."
                            className="w-full px-4 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-blue-500 outline-none transition dark:text-gray-100"
                        />
                        <div className="mt-4 flex justify-end">
                            <button
                                onClick={handleSignalGenerate}
                                disabled={!signalConfig.messyPrompt.trim() || isSignalLoading}
                                className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 transition"
                            >
                                {isSignalLoading ? 'Extracting...' : 'Extract Signal'}
                            </button>
                        </div>
                    </div>

                    {isSignalLoading && <LoadingSpinner message={signalLoadingMessage} />}
                    {signalError && <div className="p-4 bg-red-100 text-red-700 rounded-lg">{signalError}</div>}

                    {signalResult && !isSignalLoading && (
                        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg overflow-hidden border border-gray-200 dark:border-gray-700">
                            <div className="p-4 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50 flex justify-between items-center">
                                <h3 className="font-semibold">Extracted Result</h3>
                                <div className="flex space-x-2">
                                    <button onClick={handleSignalCopy} className="p-2 hover:bg-gray-200 dark:hover:bg-gray-700 rounded" title="Copy to clipboard"><span className="material-icons text-sm">content_copy</span></button>
                                    <button onClick={handleSignalExport} className="p-2 hover:bg-gray-200 dark:hover:bg-gray-700 rounded" title="Export .md"><span className="material-icons text-sm">download</span></button>
                                    <button onClick={() => setIsSaveModalOpen(true)} className="p-2 hover:bg-gray-200 dark:hover:bg-gray-700 rounded" title="Save"><span className="material-icons text-sm">save</span></button>
                                    <button onClick={() => onTransfer({ goal: signalResult.promptSignal, instructions: signalResult.signalConstraints })} className="p-2 bg-blue-600 text-white rounded hover:bg-blue-700" title="Transfer"><span className="material-icons text-sm">psychology</span></button>
                                </div>
                            </div>
                            <div className="p-6 space-y-4">
                                <div>
                                    <h4 className="text-xs font-bold text-gray-400 uppercase mb-2">Prompt Signal</h4>
                                    <div className="p-4 bg-gray-50 dark:bg-gray-900 rounded-lg text-sm whitespace-pre-wrap">{signalResult.promptSignal}</div>
                                </div>
                                <div>
                                    <h4 className="text-xs font-bold text-gray-400 uppercase mb-2">Constraints</h4>
                                    <div className="p-4 bg-gray-50 dark:bg-gray-900 rounded-lg text-sm whitespace-pre-wrap">{signalResult.signalConstraints}</div>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            ) : (
                <div className="space-y-8 animate-in fade-in duration-300">
                    <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-6 md:p-8 border border-gray-200 dark:border-gray-700/50">
                        <h2 className="text-2xl font-semibold mb-6 flex items-center">
                            <span className="material-icons mr-2 text-blue-500">spa</span>
                            MindSeed Creator
                        </h2>
                        <textarea
                            rows={12}
                            value={mindSeedConfig.sourceContent}
                            onChange={(e) => setMindSeedConfig({ sourceContent: e.target.value })}
                            placeholder="Paste up to 20,000 characters of source material here to compress into Seeds of Wisdom..."
                            className="w-full px-4 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-blue-500 outline-none transition dark:text-gray-100"
                        />
                        <div className="mt-4 flex justify-between items-center">
                            <span className="text-xs text-gray-500">{mindSeedConfig.sourceContent.length} / 20000 characters</span>
                            <button
                                onClick={handleMindSeedGenerate}
                                disabled={!mindSeedConfig.sourceContent.trim() || isMindSeedLoading}
                                className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 transition"
                            >
                                {isMindSeedLoading ? 'Generating Seeds...' : 'Generate MindSeeds'}
                            </button>
                        </div>
                    </div>

                    {isMindSeedLoading && <LoadingSpinner message={mindSeedLoadingMessage} />}
                    {mindSeedError && <div className="p-4 bg-red-100 text-red-700 rounded-lg">{mindSeedError}</div>}

                    {mindSeedResult && !isMindSeedLoading && (
                        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg overflow-hidden border border-gray-200 dark:border-gray-700">
                            <div className="p-4 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50 flex justify-between items-center">
                                <h3 className="font-semibold">Seeds of Wisdom</h3>
                                <div className="flex space-x-2">
                                    <button onClick={handleMindSeedCopy} className="p-2 hover:bg-gray-200 dark:hover:bg-gray-700 rounded" title="Copy to clipboard"><span className="material-icons text-sm">content_copy</span></button>
                                    <button onClick={handleMindSeedExport} className="p-2 hover:bg-gray-200 dark:hover:bg-gray-700 rounded" title="Export .md"><span className="material-icons text-sm">download</span></button>
                                    <button onClick={() => setIsSaveModalOpen(true)} className="p-2 hover:bg-gray-200 dark:hover:bg-gray-700 rounded" title="Save"><span className="material-icons text-sm">save</span></button>
                                </div>
                            </div>
                            <div className="p-6 space-y-6">
                                <div className="space-y-4">
                                    {mindSeedResult.seeds.map((seed, i) => (
                                        <div key={i} className="relative">
                                            <blockquote className={`p-4 border-l-4 rounded-r-lg bg-gray-50 dark:bg-gray-900 ${
                                                seed.type === 'CogniSeed' ? 'border-orange-500' :
                                                seed.type === 'LinguaSeed' ? 'border-green-500' : 'border-violet-500'
                                            }`}>
                                                <div className="text-xs font-bold uppercase mb-1 opacity-50">{seed.type}</div>
                                                <p className="text-lg font-medium italic">"{seed.content}"</p>
                                                <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">{seed.reasoning}</p>
                                            </blockquote>
                                        </div>
                                    ))}
                                </div>

                                <div className="mt-8">
                                    <h4 className="text-sm font-bold uppercase text-gray-400 mb-3">Structural Integrity Check</h4>
                                    <div className="overflow-x-auto">
                                        <table className="w-full text-sm text-left border-collapse">
                                            <thead>
                                                <tr className="border-b dark:border-gray-700">
                                                    <th className="py-2 px-4 font-bold">Invariant</th>
                                                    <th className="py-2 px-4 font-bold text-center">Status</th>
                                                    <th className="py-2 px-4 font-bold">Check</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {mindSeedResult.structuralIntegrity.map((inv, i) => (
                                                    <tr key={i} className="border-b dark:border-gray-700 last:border-0">
                                                        <td className="py-3 px-4 font-medium">{inv.invariant}</td>
                                                        <td className="py-3 px-4 text-center">
                                                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                                                                inv.status === 'Pass' ? 'bg-green-100 text-green-700' :
                                                                inv.status === 'Fail' ? 'bg-red-100 text-red-700' : 'bg-orange-100 text-orange-700'
                                                            }`}>{inv.status}</span>
                                                        </td>
                                                        <td className="py-3 px-4 text-gray-500 italic">{inv.check}</td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            )}

            <Modal isOpen={isSaveModalOpen} onClose={() => setIsSaveModalOpen(false)} title={`Save ${activeTab === 'signal' ? 'Signal' : 'MindSeeds'}`}>
                <div className="space-y-4">
                    <input
                        type="text"
                        value={saveName}
                        onChange={(e) => setSaveName(e.target.value)}
                        placeholder="Enter a name for this entry..."
                        className="w-full px-4 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-blue-500 outline-none transition"
                        autoFocus
                    />
                    <div className="flex justify-end space-x-2">
                        <button onClick={() => setIsSaveModalOpen(false)} className="px-4 py-2 text-gray-500">Cancel</button>
                        <button onClick={handleSave} disabled={!saveName.trim()} className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700">Save Entry</button>
                    </div>
                </div>
            </Modal>
        </div>
    );
};

export default MindSeeds;

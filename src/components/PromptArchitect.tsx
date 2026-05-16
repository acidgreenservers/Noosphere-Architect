
import React, { useState, useCallback, useEffect, useRef } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { generateBasicPrompt } from '../services/ai/basicPromptService';
import { generateStructuredSystemPrompt } from '../services/ai/structuredSystemPromptService';
import { PromptConfig, SavedPrompt, PromptType } from '../types';
import * as db from '../services/dbService';
import JSZip from 'jszip';
import { sanitizeFilename } from '../utils/security';
import LoadingSpinner from './LoadingSpinner';
import Modal from './Modal';
import PreviewModal from './PreviewModal';
import Toast from './Toast';

const Tooltip: React.FC<{ text: string }> = ({ text }) => (
  <span className="absolute left-1/2 -translate-x-1/2 bottom-full mb-2 w-max max-w-xs p-2 bg-gray-800 text-white text-xs rounded-md shadow-lg opacity-0 group-hover:opacity-100 transition-opacity z-10 pointer-events-none">
    {text}
  </span>
);

const PROMPT_TEMPLATES = [
    {
      name: 'Creative Content Generator',
      goal: 'Write a short, engaging blog post about a specified topic.',
      instructions: `1. Title: Create a catchy, SEO-friendly title.
2. Introduction: Start with a hook to grab the reader's attention.
3. Body: Write 3-4 paragraphs with clear headings.
4. Conclusion: Summarize the key points and add a call-to-action.
5. Tone: Friendly, informative, and slightly informal.`
    },
    {
      name: 'Technical Code Explainer',
      goal: 'Explain a given code snippet to a junior developer.',
      instructions: `1. High-Level Summary: Briefly explain what the code does.
2. Line-by-Line Breakdown: Go through the code, explaining complex lines or functions.
3. Concepts: Identify and explain the key programming concepts used.
4. Simplification: Use an analogy or simple terms to clarify the logic.`
    },
    {
      name: 'Data Analysis Report',
      goal: 'Analyze a provided dataset (as text/csv) and summarize the key findings.',
      instructions: `1. Objective: State the main goal of the analysis.
2. Key Insights: List the top 3-5 most important findings as bullet points.
3. Observations: Mention any interesting patterns, trends, or outliers discovered.
4. Recommendations: Suggest potential actions based on the analysis.
5. Output Format: Present the report in clear, structured Markdown.`
    },
];

interface PromptArchitectProps {
    initialConfig?: PromptConfig;
    onClearInitialConfig?: () => void;
}

const PromptArchitect: React.FC<PromptArchitectProps> = ({ initialConfig, onClearInitialConfig }) => {
    const [activeTab, setActiveTab] = useState<PromptType>('standard');
    const [promptConfig, setPromptConfig] = useState<PromptConfig>({ goal: '', instructions: '' });
    const [generatedPrompt, setGeneratedPrompt] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [loadingMessage, setLoadingMessage] = useState('');
    const loadingIntervalRef = useRef<number | null>(null);


    const [savedPrompts, setSavedPrompts] = useState<SavedPrompt[]>([]);
    const [isTemplateModalOpen, setIsTemplateModalOpen] = useState(false);
    const [successMessage, setSuccessMessage] = useState('');
    const [draftStatus, setDraftStatus] = useState<'unloaded' | 'loaded' | 'none'>('unloaded');
    const checkingDraftRef = useRef<Record<PromptType, boolean>>({ standard: false, system: false });

    const [modalState, setModalState] = useState<{ mode: 'save' | 'edit'; prompt?: SavedPrompt } | null>(null);
    const [modalInput, setModalInput] = useState<{ name: string; prompt: string }>({ name: '', prompt: '' });
    const [previewPrompt, setPreviewPrompt] = useState<SavedPrompt | null>(null);


    const loadSavedPrompts = useCallback(async () => {
        const prompts = await db.getAllTypedPrompts(activeTab);
        setSavedPrompts(prompts);
    }, [activeTab]);

    useEffect(() => {
        if (initialConfig) {
            setPromptConfig(initialConfig);
            if (onClearInitialConfig) onClearInitialConfig();
            return;
        }

        loadSavedPrompts();
        const loadDraft = async () => {
            if (checkingDraftRef.current[activeTab]) return;
            checkingDraftRef.current[activeTab] = true;

            const draft = await db.getTypedPromptDraft(activeTab, 1);
            if (draft?.config && Object.values(draft.config).some(v => v)) {
                if (window.confirm(`An unsaved ${activeTab} prompt draft was found. Do you want to load it?`)) {
                    setPromptConfig(draft.config);
                    setDraftStatus('loaded');
                } else {
                    await db.clearTypedPromptDraft(activeTab, 1);
                    setPromptConfig({ goal: '', instructions: '' });
                    setGeneratedPrompt('');
                    setDraftStatus('none');
                }
            } else {
                setPromptConfig({ goal: '', instructions: '' });
                setGeneratedPrompt('');
                setDraftStatus('none');
            }
        };
        loadDraft();
    }, [loadSavedPrompts, activeTab, initialConfig, onClearInitialConfig]);

    useEffect(() => {
        if (draftStatus === 'unloaded') return;
        const handler = setTimeout(() => {
            if (Object.values(promptConfig).some(v => v)) {
                db.saveTypedPromptDraft(activeTab, { id: 1, config: promptConfig });
            }
        }, 1500);
        return () => clearTimeout(handler);
    }, [promptConfig, draftStatus, activeTab]);

    const handleGenerate = useCallback(async () => {
        setIsLoading(true);
        setError(null);
        setGeneratedPrompt('');

        const messages = activeTab === 'standard'
            ? ['Extracting signal...', 'Compressing structure...', 'Finalizing prompt...']
            : ['Scanning topology...', 'Crystallizing invariants...', 'Encoding reasoning...'];

        let messageIndex = 0;
        setLoadingMessage(messages[0]);
        loadingIntervalRef.current = window.setInterval(() => {
            messageIndex = (messageIndex + 1) % messages.length;
            setLoadingMessage(messages[messageIndex]);
        }, 2000);

        try {
            if (!promptConfig.goal.trim()) {
                setError("Please enter a goal for your prompt.");
                setIsLoading(false);
                if (loadingIntervalRef.current) clearInterval(loadingIntervalRef.current);
                return;
            }

            const result = activeTab === 'standard'
                ? await generateBasicPrompt(promptConfig)
                : await generateStructuredSystemPrompt(promptConfig);

            setGeneratedPrompt(result);
            await db.clearTypedPromptDraft(activeTab, 1);
        } catch (e) {
            setError('Failed to generate prompt. Please check your API key and try again.');
        } finally {
            setIsLoading(false);
            if (loadingIntervalRef.current) {
                clearInterval(loadingIntervalRef.current);
            }
            setLoadingMessage('');
        }
    }, [promptConfig, activeTab]);

    const handleReset = () => {
        setPromptConfig({ goal: '', instructions: '' });
        setGeneratedPrompt('');
        setError(null);
        setIsLoading(false);
        db.clearTypedPromptDraft(activeTab, 1);
    };

    const handleOpenSaveModal = () => {
        if (!generatedPrompt) return;
        const loadedPrompt = savedPrompts.find(p => p.prompt === generatedPrompt);
        setModalInput({ name: loadedPrompt?.name || '', prompt: generatedPrompt });
        setModalState({ mode: 'save' });
    };

    const handleOpenEditModal = (prompt: SavedPrompt) => {
        setModalInput({ name: prompt.name, prompt: prompt.prompt });
        setModalState({ mode: 'edit', prompt });
    };
    
    const handleModalSave = async () => {
        if (!modalState || !modalInput.name.trim()) return;

        if (modalState.mode === 'save') {
            const newPrompt: SavedPrompt = {
                name: modalInput.name.trim(),
                config: promptConfig,
                prompt: modalInput.prompt,
                createdAt: new Date().toISOString(),
                history: []
            };
            await db.addTypedPrompt(activeTab, newPrompt);
            setSuccessMessage('Prompt saved successfully!');
        } else if (modalState.mode === 'edit' && modalState.prompt) {
            const isPromptChanged = modalState.prompt.prompt !== modalInput.prompt;
            
            let updatedHistory = modalState.prompt.history || [];
            if (isPromptChanged) {
                updatedHistory = [
                    ...updatedHistory,
                    {
                        prompt: modalState.prompt.prompt,
                        updatedAt: new Date().toISOString()
                    }
                ];
            }

            const updatedPrompt: SavedPrompt = {
                ...modalState.prompt,
                name: modalInput.name.trim(),
                prompt: modalInput.prompt,
                history: updatedHistory
            };
            await db.updateTypedPrompt(activeTab, updatedPrompt);
            setSuccessMessage('Prompt updated successfully!');
        }

        loadSavedPrompts();
        setModalState(null);
    };
    
    const handleDelete = async (id: number) => {
        if (window.confirm('Are you sure you want to delete this prompt?')) {
            try {
                await db.deleteTypedPrompt(activeTab, id);
                setSavedPrompts(prevPrompts => prevPrompts.filter(p => p.id !== id));
                setSuccessMessage('Prompt deleted successfully!');
            } catch (err) {
                setError('Failed to delete prompt.');
                console.error(err);
            }
        }
    };

    const handleClearAll = async () => {
        if (window.confirm('Are you sure you want to delete ALL saved prompts in this tab? This action cannot be undone.')) {
            try {
                await db.clearAllTypedPrompts(activeTab);
                setSavedPrompts([]);
                setSuccessMessage('All prompts in this tab have been deleted.');
            } catch (err) {
                setError('Failed to clear all prompts.');
                console.error(err);
            }
        }
    };

    const handleExportAll = async () => {
        if (savedPrompts.length === 0) return;

        const zip = new JSZip();
        const exportFilename = activeTab === 'standard' ? 'PROMPT.md' : 'AGENTS.md';

        savedPrompts.forEach(p => {
            const folderName = sanitizeFilename(p.name);
            zip.file(`${folderName}/${exportFilename}`, p.prompt);
        });

        const content = await zip.generateAsync({ type: 'blob' });
        const url = URL.createObjectURL(content);
        const link = document.createElement('a');
        link.href = url;
        link.download = `noosphere-${activeTab}-prompts-${new Date().toISOString().split('T')[0]}.zip`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
        setSuccessMessage('All prompts exported as ZIP!');
    };
    
    const handleLoadSavedPrompt = (prompt: SavedPrompt) => {
        setPromptConfig(prompt.config);
        setGeneratedPrompt(prompt.prompt);
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const handleLoadTemplate = (template: { goal: string; instructions: string }) => {
        setPromptConfig({ goal: template.goal, instructions: template.instructions });
        setIsTemplateModalOpen(false);
    };

    const handleExportPrompt = (content: string) => {
        if (!content) return;
        const exportFilename = activeTab === 'standard' ? 'PROMPT.md' : 'AGENTS.md';
        
        const blob = new Blob([content], { type: 'text/markdown;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = exportFilename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    };

    const [showHistory, setShowHistory] = useState(false);

    const handleRevert = (historicalPrompt: string) => {
        if (window.confirm('Are you sure you want to revert to this version? Your current changes will be lost unless saved.')) {
            setModalInput(prev => ({ ...prev, prompt: historicalPrompt }));
            setShowHistory(false);
        }
    };

    return (
        <div className="max-w-4xl mx-auto">
            <Toast message={successMessage} onClose={() => setSuccessMessage('')} />

            <div className="flex justify-between items-center mb-8">
                <div>
                    <h2 className="text-3xl font-bold text-gray-900 dark:text-gray-100">
                        {activeTab === 'standard' ? 'Prompt Architect' : 'System Prompt Architect'}
                    </h2>
                    <p className="text-gray-600 dark:text-gray-400">
                        {activeTab === 'standard'
                            ? 'Extract signal from messy thoughts and refine into high-quality standard prompts.'
                            : 'Crystallize reasoning topology and encode invariants into powerful system prompts.'}
                    </p>
                </div>
            </div>

            {/* Tabs */}
            <div className="border-b border-gray-200 dark:border-gray-700 mb-8">
                <nav className="-mb-px flex space-x-8" aria-label="Prompt Type Tabs" role="tablist">
                    <button
                        role="tab"
                        aria-selected={activeTab === 'standard'}
                        onClick={() => {
                            setActiveTab('standard');
                            setDraftStatus('unloaded');
                        }}
                        className={`
                            whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm transition-colors duration-200
                            ${activeTab === 'standard'
                                ? 'text-blue-500 border-blue-500'
                                : 'text-gray-500 border-transparent hover:text-gray-700 hover:border-gray-300'}
                        `}
                    >
                        Prompt Architect
                    </button>
                    <button
                        role="tab"
                        aria-selected={activeTab === 'system'}
                        onClick={() => {
                            setActiveTab('system');
                            setDraftStatus('unloaded');
                        }}
                        className={`
                            whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm transition-colors duration-200
                            ${activeTab === 'system'
                                ? 'text-purple-500 border-purple-500'
                                : 'text-gray-500 border-transparent hover:text-gray-700 hover:border-gray-300'}
                        `}
                    >
                        System Prompt Architect
                    </button>
                </nav>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-6 md:p-8">
                <form onSubmit={(e) => { e.preventDefault(); handleGenerate(); }} className="space-y-6">
                    <div className="flex flex-col sm:flex-row justify-between items-center mb-6 gap-4">
                        <h3 className="text-xl font-semibold text-gray-800 dark:text-gray-200">Define Your Prompt</h3>
                        <button type="button" onClick={() => setIsTemplateModalOpen(true)} className="w-full sm:w-auto flex items-center justify-center px-4 py-2 border border-blue-500 text-blue-500 dark:text-blue-400 dark:border-blue-400 rounded-md text-sm font-medium hover:bg-blue-50 dark:hover:bg-blue-900/40 transition">
                            <span className="material-icons mr-2 text-base">model_training</span>
                            Load Template
                        </button>
                    </div>
                    <div>
                        <label htmlFor="goal" className="flex items-center text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                            Prompt Goal / Core Task <span className="text-red-500 ml-1">*</span>
                            <div className="group relative flex items-center ml-2">
                                <span className="material-icons text-gray-400 dark:text-gray-500 text-base cursor-help">info_outline</span>
                                <Tooltip text="A clear, concise statement of what the AI should accomplish. E.g., 'Generate three creative recipes based on a list of ingredients.'" />
                            </div>
                        </label>
                        <input type="text" id="goal" name="goal" value={promptConfig.goal} onChange={(e) => setPromptConfig(prev => ({...prev, goal: e.target.value}))} placeholder="e.g., 'Summarize technical articles for a beginner audience'" required className="w-full px-4 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm transition focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent hover:ring-2 hover:ring-blue-500/20"/>
                    </div>
                    <div>
                        <label htmlFor="instructions" className="flex items-center text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                            Key Instructions, Constraints, or Steps (Optional)
                            <div className="group relative flex items-center ml-2">
                                <span className="material-icons text-gray-400 dark:text-gray-500 text-base cursor-help">info_outline</span>
                                <Tooltip text="Specific rules, steps, or constraints for the AI to follow. E.g., 'Each recipe must be vegetarian. The output should be a JSON array.'" />
                            </div>
                        </label>
                        <textarea id="instructions" name="instructions" rows={5} value={promptConfig.instructions} onChange={(e) => setPromptConfig(prev => ({...prev, instructions: e.target.value}))} placeholder="e.g., 'The summary must be in 3 bullet points. Avoid jargon. Mention the key takeaways for a marketer.'" className="w-full px-4 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm transition focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent hover:ring-2 hover:ring-blue-500/20"/>
                    </div>
                    <div className="flex flex-col sm:flex-row items-center justify-end space-y-4 sm:space-y-0 sm:space-x-4 pt-2">
                        <button type="button" onClick={handleReset} disabled={isLoading} className="w-full sm:w-auto px-6 py-2 border border-gray-300 dark:border-gray-500 rounded-md shadow-sm text-sm font-medium text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 disabled:opacity-50 transition">Reset</button>
                        <button type="submit" disabled={!promptConfig.goal.trim() || isLoading} className={`w-full sm:w-auto flex items-center justify-center px-6 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white ${activeTab === 'standard' ? 'bg-blue-600 hover:bg-blue-700 focus:ring-blue-500' : 'bg-purple-600 hover:bg-purple-700 focus:ring-purple-500'} focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition`}>
                            {isLoading ? 'Architecting...' : 'Generate Prompt'}
                        </button>
                    </div>
                </form>
            </div>

            {error && (
                <div className="mt-8 bg-red-100 dark:bg-red-900/50 border border-red-400 dark:border-red-700 text-red-700 dark:text-red-200 px-4 py-3 rounded-lg" role="alert">
                    <strong className="font-bold">Error: </strong>
                    <span>{error}</span>
                </div>
            )}

            {isLoading && <LoadingSpinner message={loadingMessage || 'Architecting your prompt...'} />}

            {generatedPrompt && !isLoading && (
                <div className="mt-8 bg-white dark:bg-gray-800 rounded-2xl shadow-lg animate-in fade-in slide-in-from-bottom-4 duration-500 overflow-hidden">
                     <div className="flex justify-between items-center p-4 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50">
                        <h3 className="text-xl font-semibold">Generated {activeTab === 'standard' ? 'Prompt' : 'System Prompt'}</h3>
                        <div className="flex items-center space-x-2">
                           <button onClick={() => { navigator.clipboard.writeText(generatedPrompt); setSuccessMessage('Prompt copied to clipboard!'); }} className="flex items-center px-3 py-1.5 border rounded-md text-sm hover:bg-white dark:hover:bg-gray-700 transition-colors" title="Copy prompt">
                                <span className="material-icons text-base mr-1.5">content_copy</span>Copy
                            </button>
                           <button onClick={() => { handleExportPrompt(generatedPrompt); setSuccessMessage('Prompt exported successfully!'); }} className="flex items-center px-3 py-1.5 border rounded-md text-sm hover:bg-white dark:hover:bg-gray-700 transition-colors" title="Export prompt">
                                <span className="material-icons text-base mr-1.5">download</span>Export
                           </button>
                           <button onClick={handleOpenSaveModal} className={`flex items-center px-3 py-1.5 border rounded-md text-sm text-white ${activeTab === 'standard' ? 'bg-blue-500 hover:bg-blue-600 shadow-blue-500/20' : 'bg-purple-500 hover:bg-purple-600 shadow-purple-500/20'} shadow-lg transition-all`} title="Save prompt">
                                <span className="material-icons text-base mr-1.5">save</span>Save
                            </button>
                        </div>
                    </div>
                    <div className="prose prose-sm sm:prose-base dark:prose-invert max-w-none p-6 md:p-10 bg-white dark:bg-gray-900/40 prose-pre:bg-gray-900 prose-pre:text-gray-100">
                        <ReactMarkdown remarkPlugins={[remarkGfm]}>{generatedPrompt}</ReactMarkdown>
                    </div>
                </div>
            )}
            
            {savedPrompts.length > 0 && (
                <div className="mt-12">
                    <div className="flex justify-between items-center mb-6">
                        <h3 className="text-2xl font-bold">Saved {activeTab === 'standard' ? 'Prompts' : 'System Prompts'}</h3>
                        <div className="flex space-x-2">
                            <button onClick={handleExportAll} className="px-4 py-2 text-sm font-medium text-blue-600 dark:text-blue-400 bg-blue-100 dark:bg-blue-900/30 rounded-lg hover:bg-blue-200 dark:hover:bg-blue-900/60 flex items-center">
                                <span className="material-icons text-sm mr-1">download</span>
                                Export All
                            </button>
                            <button onClick={handleClearAll} className="px-4 py-2 text-sm font-medium text-red-600 dark:text-red-400 bg-red-100 dark:bg-red-900/30 rounded-lg hover:bg-red-200 dark:hover:bg-red-900/60 flex items-center">
                                <span className="material-icons text-sm mr-1">delete_sweep</span>
                                Clear All
                            </button>
                        </div>
                    </div>
                    <div className="space-y-4">
                        {savedPrompts.map(p => (
                            <div key={p.id} className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow-md border border-gray-100 dark:border-gray-700 flex justify-between items-center hover:shadow-lg transition-shadow">
                                <div className="flex-grow cursor-pointer" onClick={() => handleLoadSavedPrompt(p)}>
                                    <p className="font-semibold text-gray-900 dark:text-gray-100">{p.name}</p>
                                    <p className="text-sm text-gray-500 dark:text-gray-400">Saved on {new Date(p.createdAt).toLocaleDateString()}</p>
                                </div>
                                <div className="flex items-center space-x-2">
                                    <button onClick={() => setPreviewPrompt(p)} className="p-2 text-gray-600 dark:text-gray-300 hover:text-blue-500" title="Preview"><span className="material-icons">visibility</span></button>
                                    <button onClick={() => { handleOpenEditModal(p); setShowHistory(false); }} className="p-2 text-gray-600 dark:text-gray-300 hover:text-green-500" title="Edit"><span className="material-icons">edit</span></button>
                                    <button onClick={() => handleDelete(p.id!)} className="p-2 text-gray-600 dark:text-gray-300 hover:text-red-500" title="Delete"><span className="material-icons">delete</span></button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            <Modal isOpen={isTemplateModalOpen} onClose={() => setIsTemplateModalOpen(false)} title="Load a Prompt Template">
                <div className="space-y-3 max-h-[60vh] overflow-y-auto">
                    {PROMPT_TEMPLATES.map((template) => (
                        <button 
                            key={template.name} 
                            onClick={() => handleLoadTemplate(template)}
                            className="w-full text-left p-4 rounded-lg bg-gray-50 dark:bg-gray-700 hover:bg-blue-100 dark:hover:bg-blue-900/50 border dark:border-gray-600 transition"
                        >
                            <h4 className="font-semibold text-gray-800 dark:text-gray-200">{template.name}</h4>
                            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">{template.goal}</p>
                        </button>
                    ))}
                </div>
            </Modal>

            <PreviewModal
                isOpen={!!previewPrompt}
                onClose={() => setPreviewPrompt(null)}
                title={`Preview: ${previewPrompt?.name}`}
                content={previewPrompt?.prompt}
                onCopy={() => {
                    if (previewPrompt) {
                        navigator.clipboard.writeText(previewPrompt.prompt);
                        setSuccessMessage('Copied to clipboard!');
                    }
                }}
                onExport={() => previewPrompt && handleExportPrompt(previewPrompt.prompt)}
                onDelete={() => {
                    if (previewPrompt?.id) {
                        handleDelete(previewPrompt.id);
                        setPreviewPrompt(null);
                    }
                }}
            />

            <Modal isOpen={!!modalState} onClose={() => { setModalState(null); setShowHistory(false); }} title={modalState?.mode === 'edit' ? 'Edit Prompt' : 'Save Prompt'}>
                {modalState && (
                    <div className="space-y-4">
                        <label htmlFor="modalPromptName" className="block text-sm font-medium">Name</label>
                        <input type="text" id="modalPromptName" value={modalInput.name} onChange={e => setModalInput({...modalInput, name: e.target.value})} className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md transition focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent hover:ring-2 hover:ring-blue-500/20" placeholder="e.g., My Technical Summarizer" />
                        
                        {modalState.mode === 'edit' && (
                            <>
                                <div className="flex justify-between items-center">
                                    <label className="block text-sm font-medium">Prompt</label>
                                    {modalState.prompt?.history && modalState.prompt.history.length > 0 && (
                                        <button 
                                            onClick={() => setShowHistory(!showHistory)}
                                            className="text-sm text-blue-500 hover:text-blue-600 flex items-center"
                                        >
                                            <span className="material-icons text-sm mr-1">history</span>
                                            {showHistory ? 'Hide History' : 'View History'}
                                        </button>
                                    )}
                                </div>
                                
                                {showHistory && modalState.prompt?.history ? (
                                    <div className="space-y-4 max-h-96 overflow-y-auto pr-2">
                                        {[...modalState.prompt.history].reverse().map((hist, idx) => (
                                            <div key={idx} className="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg border border-gray-200 dark:border-gray-600">
                                                <div className="flex justify-between items-center mb-2">
                                                    <span className="text-xs text-gray-500 dark:text-gray-400">
                                                        {new Date(hist.updatedAt).toLocaleString()}
                                                    </span>
                                                    <button 
                                                        onClick={() => handleRevert(hist.prompt)}
                                                        className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded hover:bg-blue-200 dark:bg-blue-900/30 dark:text-blue-300"
                                                    >
                                                        Revert to this
                                                    </button>
                                                </div>
                                                <pre className="text-xs font-mono whitespace-pre-wrap text-gray-700 dark:text-gray-300">
                                                    {hist.prompt}
                                                </pre>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <textarea rows={10} value={modalInput.prompt} onChange={e => setModalInput({...modalInput, prompt: e.target.value})} className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md font-mono text-sm transition focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent hover:ring-2 hover:ring-blue-500/20" />
                                )}
                            </>
                        )}
                        
                        <div className="flex justify-end space-x-2 pt-2">
                            <button onClick={() => { setModalState(null); setShowHistory(false); }} className="px-4 py-2 rounded-md border dark:border-gray-600">Cancel</button>
                            <button onClick={handleModalSave} className={`px-4 py-2 rounded-md text-white ${activeTab === 'standard' ? 'bg-blue-600 hover:bg-blue-700' : 'bg-purple-600 hover:bg-purple-700'}`}>{modalState.mode === 'edit' ? 'Update' : 'Save'}</button>
                        </div>
                    </div>
                )}
            </Modal>
        </div>
    );
};

export default PromptArchitect;

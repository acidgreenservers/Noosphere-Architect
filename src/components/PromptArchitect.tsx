import React, { useState, useCallback, useEffect, useRef } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { generateBasicPrompt } from '../services/ai/basicPromptService';
import { generateSkillBundle } from '../services/ai/skillBundleService';
import { PromptConfig, SavedPrompt, PromptType, GeneratedPrompt, AgentConfig, GeneratedFiles } from '../types';
import * as db from '../services/dbService';
import JSZip from 'jszip';
import { sanitizeFilename } from '../utils/security';
import LoadingSpinner from './LoadingSpinner';
import Modal from './Modal';
import Toast from './Toast';
import GeneratedFilesDisplay from './GeneratedFilesDisplay';

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
];

const SKILL_TEMPLATES: AgentConfig[] = [
    {
        role: 'Advanced Data Visualization',
        scope: 'Transforming complex JSON datasets into interactive D3.js or Chart.js visualizations.',
        goals: '1. Auto-detect data types.\n2. Suggest optimal chart types.\n3. Generate clean, modular JavaScript code.',
        constraints: '1. Minimal external dependencies.\n2. Responsive design.\n3. Accessible color palettes.'
    }
];

interface PromptArchitectProps {
    initialConfig?: PromptConfig;
    onClearInitialConfig?: () => void;
}

const PromptArchitect: React.FC<PromptArchitectProps> = ({ initialConfig, onClearInitialConfig }) => {
    const [activeTab, setActiveTab] = useState<PromptType>('standard');
    const [promptConfig, setPromptConfig] = useState<PromptConfig>({ goal: '', instructions: '' });
    const [skillConfig, setSkillConfig] = useState<AgentConfig>({ role: '', scope: '', goals: '', constraints: '' });

    const [generatedPrompt, setGeneratedPrompt] = useState<GeneratedPrompt | null>(null);
    const [generatedSkill, setGeneratedSkill] = useState<GeneratedFiles | null>(null);

    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [loadingMessage, setLoadingMessage] = useState('');
    const loadingIntervalRef = useRef<number | null>(null);


    const [savedPrompts, setSavedPrompts] = useState<SavedPrompt[]>([]);
    const [legacyPrompts, setLegacyPrompts] = useState<SavedPrompt[]>([]);
    const [isTemplateModalOpen, setIsTemplateModalOpen] = useState(false);
    const [successMessage, setSuccessMessage] = useState('');
    const [draftStatus, setDraftStatus] = useState<'unloaded' | 'loaded' | 'none'>('unloaded');
    const checkingDraftRef = useRef<Record<PromptType, boolean>>({ standard: false, system: false });

    const [modalState, setModalState] = useState<{ mode: 'save' | 'edit'; prompt?: SavedPrompt } | null>(null);
    const [modalInput, setModalInput] = useState<{ name: string; prompt?: string; files?: GeneratedFiles }>({ name: '' });
    const [previewPrompt, setPreviewPrompt] = useState<SavedPrompt | null>(null);


    const loadSavedPrompts = useCallback(async () => {
        const [typedPrompts, allLegacyPrompts] = await Promise.all([
            db.getAllTypedPrompts(activeTab),
            db.getAllPrompts()
        ]);
        setSavedPrompts(typedPrompts);
        setLegacyPrompts(allLegacyPrompts);
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
                if (window.confirm(`An unsaved ${activeTab === 'standard' ? 'prompt' : 'skill'} draft was found. Do you want to load it?`)) {
                    if (activeTab === 'standard') {
                        setPromptConfig(draft.config as PromptConfig);
                    } else {
                        setSkillConfig(draft.config as AgentConfig);
                    }
                    setDraftStatus('loaded');
                } else {
                    await db.clearTypedPromptDraft(activeTab, 1);
                    setDraftStatus('none');
                }
            } else {
                setDraftStatus('none');
            }
        };
        loadDraft();
    }, [loadSavedPrompts, activeTab, initialConfig, onClearInitialConfig]);

    useEffect(() => {
        if (draftStatus === 'unloaded') return;
        const handler = setTimeout(() => {
            const configToSave = activeTab === 'standard' ? promptConfig : skillConfig;
            if (Object.values(configToSave).some(v => v)) {
                db.saveTypedPromptDraft(activeTab, { id: 1, config: configToSave });
            }
        }, 1500);
        return () => clearTimeout(handler);
    }, [promptConfig, skillConfig, draftStatus, activeTab]);

    const handleGenerate = useCallback(async () => {
        setIsLoading(true);
        setError(null);
        setGeneratedPrompt(null);
        setGeneratedSkill(null);

        const messages = activeTab === 'standard'
            ? ['Extracting signal...', 'Compressing structure...', 'Finalizing prompt...']
            : ['Mapping capability...', 'Architecting guidelines...', 'Generating Skill Bundle...'];

        let messageIndex = 0;
        setLoadingMessage(messages[0]);
        loadingIntervalRef.current = window.setInterval(() => {
            messageIndex = (messageIndex + 1) % messages.length;
            setLoadingMessage(messages[messageIndex]);
        }, 2000);

        try {
            if (activeTab === 'standard') {
                if (!promptConfig.goal.trim()) throw new Error("Please enter a goal.");
                const result = await generateBasicPrompt(promptConfig);
                setGeneratedPrompt(result);
            } else {
                if (!skillConfig.role.trim() || !skillConfig.scope.trim()) throw new Error("Role and Scope are required.");
                const result = await generateSkillBundle(skillConfig);
                setGeneratedSkill(result);
            }
            await db.clearTypedPromptDraft(activeTab, 1);
        } catch (e: any) {
            setError(e.message || 'Failed to generate. Please check your API key.');
        } finally {
            setIsLoading(false);
            if (loadingIntervalRef.current) clearInterval(loadingIntervalRef.current);
            setLoadingMessage('');
        }
    }, [promptConfig, skillConfig, activeTab]);

    const handleReset = () => {
        if (activeTab === 'standard') setPromptConfig({ goal: '', instructions: '' });
        else setSkillConfig({ role: '', scope: '', goals: '', constraints: '' });
        setGeneratedPrompt(null);
        setGeneratedSkill(null);
        setError(null);
        setIsLoading(false);
        db.clearTypedPromptDraft(activeTab, 1);
    };

    const handleOpenSaveModal = () => {
        if (activeTab === 'standard' && generatedPrompt) {
            setModalInput({ name: '', prompt: generatedPrompt.prompt });
            setModalState({ mode: 'save' });
        } else if (activeTab === 'system' && generatedSkill) {
            setModalInput({ name: '', files: generatedSkill });
            setModalState({ mode: 'save' });
        }
    };

    const handleOpenEditModal = (prompt: SavedPrompt) => {
        setModalInput({
            name: prompt.name,
            prompt: prompt.prompt,
            files: prompt.files
        });
        setModalState({ mode: 'edit', prompt });
    };
    
    const handleModalSave = async () => {
        if (!modalState || !modalInput.name.trim()) return;

        if (modalState.mode === 'save') {
            const newPrompt: SavedPrompt = {
                name: modalInput.name.trim(),
                config: activeTab === 'standard' ? promptConfig : skillConfig,
                prompt: modalInput.prompt,
                files: modalInput.files,
                createdAt: new Date().toISOString(),
                history: []
            };
            await db.addTypedPrompt(activeTab, newPrompt);
            setSuccessMessage('Saved successfully!');
        } else if (modalState.mode === 'edit' && modalState.prompt) {
            const updatedPrompt: SavedPrompt = {
                ...modalState.prompt,
                name: modalInput.name.trim(),
                prompt: modalInput.prompt,
                files: modalInput.files,
            };
            await db.updateTypedPrompt(activeTab, updatedPrompt);
            setSuccessMessage('Updated successfully!');
        }

        loadSavedPrompts();
        setModalState(null);
    };
    
    const handleDelete = async (id: number) => {
        if (window.confirm('Are you sure you want to delete this?')) {
            try {
                await db.deleteTypedPrompt(activeTab, id);
                setSavedPrompts(prevPrompts => prevPrompts.filter(p => p.id !== id));
                setSuccessMessage('Deleted successfully!');
            } catch (err) {
                setError('Failed to delete.');
            }
        }
    };

    const handleClearAll = async () => {
        if (window.confirm('Are you sure you want to delete ALL saved items in this tab?')) {
            try {
                await db.clearAllTypedPrompts(activeTab);
                setSavedPrompts([]);
                setSuccessMessage('Cleared successfully.');
            } catch (err) {
                setError('Failed to clear.');
            }
        }
    };

    const handleExportAll = async () => {
        if (savedPrompts.length === 0) return;

        const zip = new JSZip();
        savedPrompts.forEach(p => {
            const folderName = sanitizeFilename(p.name);
            if (p.prompt) {
                zip.file(`${folderName}/PROMPT.md`, p.prompt);
            } else if (p.files) {
                zip.file(`${folderName}/agent.md`, p.files.agentFile);
                zip.file(`${folderName}/guidelines.md`, p.files.projectGuidelines);
                zip.file(`${folderName}/constraints.md`, p.files.constraintsFile);
                zip.file(`${folderName}/SKILL.md`, p.files.skillFile);
            }
        });

        const content = await zip.generateAsync({ type: 'blob' });
        const url = URL.createObjectURL(content);
        const link = document.createElement('a');
        link.href = url;
        link.download = `noosphere-${activeTab === 'standard' ? 'prompts' : 'skills'}-${new Date().toISOString().split('T')[0]}.zip`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
        setSuccessMessage('Exported as ZIP!');
    };
    
    const handleLoadSavedPrompt = (prompt: SavedPrompt) => {
        if (activeTab === 'standard') {
            setPromptConfig(prompt.config as PromptConfig);
            setGeneratedPrompt({ signal: 'Restored from saved.', prompt: prompt.prompt || '' });
        } else {
            setSkillConfig(prompt.config as AgentConfig);
            setGeneratedSkill(prompt.files || null);
        }
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const handleExportLegacyMd = (content: string, name: string) => {
        const blob = new Blob([content], { type: 'text/markdown' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `${sanitizeFilename(name)}-legacy.md`;
        link.click();
        URL.revokeObjectURL(url);
    };

    return (
        <div className="max-w-4xl mx-auto">
            <Toast message={successMessage} onClose={() => setSuccessMessage('')} />

            <div className="flex justify-between items-center mb-8">
                <div>
                    <h2 className="text-3xl font-bold text-gray-900 dark:text-gray-100">
                        {activeTab === 'standard' ? 'Prompt Architect' : 'Skill Architect'}
                    </h2>
                    <p className="text-gray-600 dark:text-gray-400">
                        {activeTab === 'standard'
                            ? 'Extract signal from messy thoughts and refine into high-quality standard prompts.'
                            : 'Architect specialized skill modules and capability bundles for AI systems.'}
                    </p>
                </div>
            </div>

            {/* Tabs */}
            <div className="border-b border-gray-200 dark:border-gray-700 mb-8">
                <nav className="-mb-px flex space-x-8" aria-label="Prompt Type Tabs" role="tablist">
                    <button
                        role="tab"
                        aria-selected={activeTab === 'standard'}
                        onClick={() => { setActiveTab('standard'); setDraftStatus('unloaded'); }}
                        className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm transition-colors duration-200 ${activeTab === 'standard' ? 'text-blue-500 border-blue-500' : 'text-gray-500 border-transparent hover:text-gray-700 hover:border-gray-300'}`}
                    >
                        Prompt Architect
                    </button>
                    <button
                        role="tab"
                        aria-selected={activeTab === 'system'}
                        onClick={() => { setActiveTab('system'); setDraftStatus('unloaded'); }}
                        className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm transition-colors duration-200 ${activeTab === 'system' ? 'text-purple-500 border-purple-500' : 'text-gray-500 border-transparent hover:text-gray-700 hover:border-gray-300'}`}
                    >
                        Skill Architect
                    </button>
                </nav>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-6 md:p-8">
                <form onSubmit={(e) => { e.preventDefault(); handleGenerate(); }} className="space-y-6">
                    <div className="flex flex-col sm:flex-row justify-between items-center mb-6 gap-4">
                        <h3 className="text-xl font-semibold text-gray-800 dark:text-gray-200">
                            {activeTab === 'standard' ? 'Define Your Prompt' : 'Define Skill Module'}
                        </h3>
                        <button type="button" onClick={() => setIsTemplateModalOpen(true)} className="w-full sm:w-auto flex items-center justify-center px-4 py-2 border border-blue-500 text-blue-500 dark:text-blue-400 dark:border-blue-400 rounded-md text-sm font-medium hover:bg-blue-50 dark:hover:bg-blue-900/40 transition">
                            <span className="material-icons mr-2 text-base">model_training</span>
                            Load Template
                        </button>
                    </div>

                    {activeTab === 'standard' ? (
                        <>
                            <div>
                                <label htmlFor="goal" className="flex items-center text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                    Prompt Goal / Core Task <span className="text-red-500 ml-1">*</span>
                                </label>
                                <input type="text" id="goal" value={promptConfig.goal} onChange={(e) => setPromptConfig(prev => ({...prev, goal: e.target.value}))} placeholder="e.g., 'Summarize technical articles'" className="w-full px-4 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md" />
                            </div>
                            <div>
                                <label htmlFor="instructions" className="flex items-center text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Instructions (Optional)</label>
                                <textarea id="instructions" rows={5} value={promptConfig.instructions} onChange={(e) => setPromptConfig(prev => ({...prev, instructions: e.target.value}))} className="w-full px-4 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md" />
                            </div>
                        </>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="md:col-span-1">
                                <label className="block text-sm font-medium mb-1">Role/Capability <span className="text-red-500">*</span></label>
                                <input type="text" value={skillConfig.role} onChange={(e) => setSkillConfig(prev => ({...prev, role: e.target.value}))} placeholder="e.g. Data Viz Specialist" className="w-full px-4 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md" />
                            </div>
                            <div className="md:col-span-1">
                                <label className="block text-sm font-medium mb-1">Scope <span className="text-red-500">*</span></label>
                                <input type="text" value={skillConfig.scope} onChange={(e) => setSkillConfig(prev => ({...prev, scope: e.target.value}))} placeholder="e.g. D3.js Charts" className="w-full px-4 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md" />
                            </div>
                            <div className="md:col-span-2">
                                <label className="block text-sm font-medium mb-1">Primary Goals</label>
                                <textarea rows={3} value={skillConfig.goals} onChange={(e) => setSkillConfig(prev => ({...prev, goals: e.target.value}))} className="w-full px-4 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md" />
                            </div>
                            <div className="md:col-span-2">
                                <label className="block text-sm font-medium mb-1">Constraints</label>
                                <textarea rows={3} value={skillConfig.constraints} onChange={(e) => setSkillConfig(prev => ({...prev, constraints: e.target.value}))} className="w-full px-4 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md" />
                            </div>
                        </div>
                    )}

                    <div className="flex flex-col sm:flex-row items-center justify-end space-y-4 sm:space-y-0 sm:space-x-4 pt-2">
                        <button type="button" onClick={handleReset} disabled={isLoading} className="w-full sm:w-auto px-6 py-2 border border-gray-300 dark:border-gray-500 rounded-md shadow-sm text-sm font-medium text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 transition">Reset</button>
                        <button type="submit" disabled={isLoading} className={`w-full sm:w-auto flex items-center justify-center px-6 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white ${activeTab === 'standard' ? 'bg-blue-600 hover:bg-blue-700' : 'bg-purple-600 hover:bg-purple-700'} focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 transition`}>
                            {isLoading ? 'Architecting...' : 'Generate'}
                        </button>
                    </div>
                </form>
            </div>

            {error && (
                <div className="mt-8 bg-red-100 dark:bg-red-900/50 border border-red-400 dark:border-red-700 text-red-700 dark:text-red-200 px-4 py-3 rounded-lg">
                    <strong className="font-bold">Error: </strong><span>{error}</span>
                </div>
            )}

            {isLoading && <LoadingSpinner message={loadingMessage || 'Architecting...'} />}

            {generatedPrompt && !isLoading && (
                <div className="mt-8 space-y-6">
                    <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg overflow-hidden border border-gray-200 dark:border-gray-700">
                        <div className="flex items-center gap-2 px-6 py-3 bg-gray-50 dark:bg-gray-900/50 border-b border-gray-200 dark:border-gray-700">
                            <span className="material-icons text-blue-500 text-lg">signal_cellular_alt</span>
                            <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">Signal Analysis</h4>
                        </div>
                        <div className="p-6 prose prose-sm dark:prose-invert max-w-none text-gray-600 dark:text-gray-400">
                            <ReactMarkdown remarkPlugins={[remarkGfm]}>{generatedPrompt.signal ?? ''}</ReactMarkdown>
                        </div>
                    </div>

                    <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg overflow-hidden border border-gray-200 dark:border-gray-700">
                        <div className="flex justify-between items-center p-4 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50">
                            <h3 className="text-xl font-semibold">Generated Prompt</h3>
                            <div className="flex items-center space-x-2">
                               <button onClick={() => { navigator.clipboard.writeText(generatedPrompt.prompt); setSuccessMessage('Copied!'); }} className="px-3 py-1.5 border rounded-md text-sm flex items-center"><span className="material-icons text-base mr-1">content_copy</span>Copy</button>
                               <button onClick={handleOpenSaveModal} className="px-3 py-1.5 bg-blue-500 text-white rounded-md text-sm flex items-center shadow-lg shadow-blue-500/20"><span className="material-icons text-base mr-1">save</span>Save</button>
                            </div>
                        </div>
                        <div className="p-6 md:p-10 bg-gray-50 dark:bg-gray-900/40">
                             <div className="prose dark:prose-invert max-w-none">
                                <ReactMarkdown remarkPlugins={[remarkGfm]}>{generatedPrompt.prompt ?? ''}</ReactMarkdown>
                             </div>
                        </div>
                    </div>
                </div>
            )}

            {generatedSkill && !isLoading && (
                <div className="mt-8">
                    <GeneratedFilesDisplay files={generatedSkill} onSave={handleOpenSaveModal} agentName="New Skill Module" />
                </div>
            )}
            
            {(savedPrompts.length > 0 || legacyPrompts.length > 0) && (
                <div className="mt-12">
                    <div className="flex justify-between items-center mb-6">
                        <h3 className="text-2xl font-bold">Saved {activeTab === 'standard' ? 'Prompts' : 'Skill Bundles'}</h3>
                        <div className="flex space-x-2">
                            <button onClick={handleExportAll} className="px-4 py-2 text-sm font-medium text-blue-600 dark:text-blue-400 bg-blue-100 dark:bg-blue-900/30 rounded-lg hover:bg-blue-200 dark:hover:bg-blue-900/60 flex items-center">
                                <span className="material-icons text-sm mr-1">download</span>Export All
                            </button>
                            <button onClick={handleClearAll} className="px-4 py-2 text-sm font-medium text-red-600 dark:text-red-400 bg-red-100 dark:bg-red-900/30 rounded-lg hover:bg-red-200 dark:hover:bg-red-900/60 flex items-center">
                                <span className="material-icons text-sm mr-1">delete_sweep</span>Clear All
                            </button>
                        </div>
                    </div>
                    <div className="space-y-4">
                        {savedPrompts.map(p => (
                            <div key={p.id} className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow-md border border-gray-100 dark:border-gray-700 flex justify-between items-center hover:shadow-lg transition-all">
                                <div className="flex-grow cursor-pointer" onClick={() => handleLoadSavedPrompt(p)}>
                                    <div className="flex items-center gap-2">
                                        <p className="font-semibold text-gray-900 dark:text-gray-100">{p.name}</p>
                                    </div>
                                    <p className="text-sm text-gray-500 dark:text-gray-400">Saved on {new Date(p.createdAt).toLocaleDateString()}</p>
                                </div>
                                <div className="flex items-center space-x-2">
                                    <button onClick={() => handleLoadSavedPrompt(p)} className="p-2 text-gray-600 dark:text-gray-300 hover:text-blue-500" title="Load"><span className="material-icons">visibility</span></button>
                                    <button onClick={() => { handleOpenEditModal(p); }} className="p-2 text-gray-600 dark:text-gray-300 hover:text-green-500" title="Edit"><span className="material-icons">edit</span></button>
                                    <button onClick={() => handleDelete(p.id!)} className="p-2 text-gray-600 dark:text-gray-300 hover:text-red-500" title="Delete"><span className="material-icons">delete</span></button>
                                </div>
                            </div>
                        ))}

                        {legacyPrompts.map(p => (
                            <div key={`legacy-${p.id}`} className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow-md border border-gray-100 dark:border-gray-700 flex justify-between items-center hover:shadow-lg transition-all">
                                <div className="flex-grow cursor-pointer" onClick={() => handleLoadSavedPrompt(p)}>
                                    <div className="flex items-center gap-2">
                                        <p className="font-semibold text-gray-900 dark:text-gray-100">{p.name}</p>
                                        <span className="px-2 py-0.5 bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300 text-[10px] font-bold uppercase tracking-wider rounded">Legacy</span>
                                    </div>
                                    <p className="text-sm text-gray-500 dark:text-gray-400">Saved on {new Date(p.createdAt).toLocaleDateString()}</p>
                                    {p.prompt && (
                                        <div className="mt-2 flex items-center gap-2">
                                            <span className="text-xs text-amber-600 dark:text-amber-400 flex items-center gap-1">
                                                <span className="material-icons text-xs">warning</span>
                                                Legacy single-string format
                                            </span>
                                            <button onClick={(e) => { e.stopPropagation(); handleExportLegacyMd(p.prompt!, p.name); }} className="text-xs text-blue-500 hover:underline">Export MD</button>
                                        </div>
                                    )}
                                </div>
                                <div className="flex items-center space-x-2">
                                    <button onClick={() => handleLoadSavedPrompt(p)} className="p-2 text-gray-600 dark:text-gray-300 hover:text-blue-500" title="Load"><span className="material-icons">visibility</span></button>
                                    <button onClick={async () => {
                                        if (window.confirm('Delete legacy prompt?')) {
                                            await db.deletePrompt(p.id!);
                                            loadSavedPrompts();
                                        }
                                    }} className="p-2 text-gray-600 dark:text-gray-300 hover:text-red-500" title="Delete"><span className="material-icons">delete</span></button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            <Modal isOpen={isTemplateModalOpen} onClose={() => setIsTemplateModalOpen(false)} title="Load Template">
                <div className="space-y-3 max-h-[60vh] overflow-y-auto">
                    {(activeTab === 'standard' ? PROMPT_TEMPLATES : SKILL_TEMPLATES).map((template: any) => (
                        <button 
                            key={template.name} 
                            onClick={() => {
                                if (activeTab === 'standard') setPromptConfig({ goal: template.goal, instructions: template.instructions });
                                else setSkillConfig(template);
                                setIsTemplateModalOpen(false);
                            }}
                            className="w-full text-left p-4 rounded-lg bg-gray-50 dark:bg-gray-700 hover:bg-blue-100 dark:hover:bg-blue-900/50 border dark:border-gray-600 transition"
                        >
                            <h4 className="font-semibold text-gray-800 dark:text-gray-200">{template.name}</h4>
                            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">{template.goal || template.role}</p>
                        </button>
                    ))}
                </div>
            </Modal>

            <Modal isOpen={!!modalState} onClose={() => { setModalState(null); }} title={modalState?.mode === 'edit' ? 'Edit' : 'Save'}>
                {modalState && (
                    <div className="space-y-4">
                        <label className="block text-sm font-medium">Name</label>
                        <input type="text" value={modalInput.name} onChange={e => setModalInput({...modalInput, name: e.target.value})} className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md" />
                        
                        {modalState.mode === 'edit' && (
                            <div className="max-h-96 overflow-y-auto space-y-4 pr-2">
                                {modalInput.prompt !== undefined ? (
                                    <textarea rows={10} value={modalInput.prompt} onChange={e => setModalInput({...modalInput, prompt: e.target.value})} className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md font-mono text-sm" />
                                ) : modalInput.files && (
                                    <>
                                        <textarea rows={5} value={modalInput.files.agentFile} onChange={e => setModalInput(prev => ({...prev, files: {...prev.files!, agentFile: e.target.value}}))} className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md font-mono text-sm" />
                                        <textarea rows={5} value={modalInput.files.projectGuidelines} onChange={e => setModalInput(prev => ({...prev, files: {...prev.files!, projectGuidelines: e.target.value}}))} className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md font-mono text-sm" />
                                        <textarea rows={5} value={modalInput.files.constraintsFile} onChange={e => setModalInput(prev => ({...prev, files: {...prev.files!, constraintsFile: e.target.value}}))} className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md font-mono text-sm" />
                                        <textarea rows={5} value={modalInput.files.skillFile} onChange={e => setModalInput(prev => ({...prev, files: {...prev.files!, skillFile: e.target.value}}))} className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md font-mono text-sm" />
                                    </>
                                )}
                            </div>
                        )}
                        
                        <div className="flex justify-end space-x-2 pt-2">
                            <button onClick={() => setModalState(null)} className="px-4 py-2 rounded-md border dark:border-gray-600">Cancel</button>
                            <button onClick={handleModalSave} className={`px-4 py-2 rounded-md text-white ${activeTab === 'standard' ? 'bg-blue-600' : 'bg-purple-600'}`}>{modalState.mode === 'edit' ? 'Update' : 'Save'}</button>
                        </div>
                    </div>
                )}
            </Modal>
        </div>
    );
};

export default PromptArchitect;

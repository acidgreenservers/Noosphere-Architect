import React, { useState, useCallback, useEffect, useRef } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { generateBasicPrompt } from '../services/ai/basicPromptService';
import { generateStructuredSystemPrompt } from '../services/ai/structuredSystemPromptService';
import { generateSkillBundle } from '../services/ai/skillBundleService';
import { AbortError } from '../services/ai/openRouter';
import { PromptConfig, SavedPrompt, PromptType, GeneratedPrompt, AgentConfig, GeneratedFiles } from '../types';
import * as db from '../services/dbService';
import JSZip from 'jszip';
import { sanitizeFilename } from '../utils/security';
import { fallbackCopyTextToClipboard } from '../utils/clipboard';
import LoadingSpinner from './LoadingSpinner';
import Modal from './Modal';
import PreviewModal from './PreviewModal';
import LibraryItem from './LibraryItem';
import Toast from './Toast';
import GeneratedFilesDisplay from './GeneratedFilesDisplay';
import { StarredPinnedBar } from './StarredPinnedBar';
import { UnifiedItem } from '../types';
import { getDeepSearchText } from '../utils/search';
import { useArchive } from '../context/ArchiveContext';

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
    initialTab?: PromptType;
}

const PromptArchitect: React.FC<PromptArchitectProps> = ({ initialConfig, onClearInitialConfig, initialTab }) => {
    const [activeTab, setActiveTab] = useState<PromptType>(initialTab || 'standard');
    const [promptConfig, setPromptConfig] = useState<PromptConfig>({ goal: '', instructions: '' });
    const [skillConfig, setSkillConfig] = useState<AgentConfig>({ role: '', scope: '', goals: '', constraints: '' });

    const [generatedPrompt, setGeneratedPrompt] = useState<GeneratedPrompt | null>(null);
    const [generatedSkill, setGeneratedSkill] = useState<GeneratedFiles | null>(null);

    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [loadingMessage, setLoadingMessage] = useState('');
    const loadingIntervalRef = useRef<number | null>(null);
    const abortControllerRef = useRef<AbortController | null>(null);


    const { unifiedItems, updateItemMetadata, deleteItem: removeContextItem, loadArchive } = useArchive();

    const savedPrompts = React.useMemo(() => {
        const typeFilter = activeTab === 'standard' ? 'prompt-standard' : 'prompt-system';
        return unifiedItems
            .filter(i => i.type === typeFilter)
            .map(i => i.original as SavedPrompt);
    }, [unifiedItems, activeTab]);

    const legacyPrompts = React.useMemo(() => {
        return unifiedItems
            .filter(i => i.type === 'legacy-prompt')
            .map(i => i.original as SavedPrompt);
    }, [unifiedItems]);
    const [isTemplateModalOpen, setIsTemplateModalOpen] = useState(false);
    const [searchTerm, setSearchText] = useState('');
    const [successMessage, setSuccessMessage] = useState('');
    const [draftStatus, setDraftStatus] = useState<'checking' | 'loaded' | 'none' | 'unloaded'>('unloaded');
    const [pendingDraft, setPendingDraft] = useState<{type: PromptType, config: PromptConfig | AgentConfig} | null>(null);
    const [isCopied, setIsCopied] = useState(false);
    const checkingDraftRef = useRef<Record<PromptType, boolean>>({ standard: false, system: false });

    const [modalState, setModalState] = useState<{ mode: 'save' | 'edit'; prompt?: SavedPrompt } | null>(null);
    const [modalInput, setModalInput] = useState<{ name: string; prompt?: string; files?: GeneratedFiles }>({ name: '' });
    const [previewPrompt, setPreviewPrompt] = useState<SavedPrompt | null>(null);
    const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
    const [isClearAllConfirmOpen, setIsClearAllConfirmOpen] = useState(false);
    const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
        starredSection: true,
        pinnedSection: true,
        allItemsSection: true
    });




    useEffect(() => {
        if (initialTab) {
            setActiveTab(initialTab);
        }
    }, [initialTab]);

    useEffect(() => {
        if (initialConfig) {
            setPromptConfig(initialConfig);
            if (onClearInitialConfig) onClearInitialConfig();
            return;
        }


        const loadDraft = async () => {
            if (checkingDraftRef.current[activeTab]) return;
            checkingDraftRef.current[activeTab] = true;

            const draft = await db.getTypedPromptDraft(activeTab, 1);
            if (draft?.config && Object.values(draft.config).some(v => v)) {
                setPendingDraft({ type: activeTab, config: draft.config });
            } else {
                if (activeTab === 'standard') setPromptConfig({ goal: '', instructions: '' });
                else setSkillConfig({ role: '', scope: '', goals: '', constraints: '' });
                setGeneratedPrompt(null);
                setGeneratedSkill(null);
                setDraftStatus('none');
            }
        };
        loadDraft();
    }, [activeTab, initialConfig, onClearInitialConfig]);

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
        abortControllerRef.current?.abort();
        const controller = new AbortController();
        abortControllerRef.current = controller;

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
                const result = await generateStructuredSystemPrompt(promptConfig, controller.signal);
                if (!controller.signal.aborted) setGeneratedPrompt(result);
            } else {
                if (!skillConfig.role.trim() || !skillConfig.scope.trim()) throw new Error("Role and Scope are required.");
                const result = await generateSkillBundle(skillConfig, controller.signal);
                if (!controller.signal.aborted) setGeneratedSkill(result);
            }
            if (!controller.signal.aborted) await db.clearTypedPromptDraft(activeTab, 1);
        } catch (e: any) {
            if (e instanceof AbortError || e?.name === 'AbortError') return;
            setError(e.message || 'Failed to generate. Please check your API key.');
        } finally {
            setIsLoading(false);
            if (loadingIntervalRef.current) clearInterval(loadingIntervalRef.current);
            setLoadingMessage('');
            abortControllerRef.current = null;
        }
    }, [promptConfig, skillConfig, activeTab]);

    useEffect(() => {
        return () => {
            abortControllerRef.current?.abort();
        };
    }, []);

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
                history: [],
                isStarred: false,
                isPinned: false,
                isArchived: false,
                category: ''
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

        await loadArchive();
        setModalState(null);
    };

    const handleUpdateMetadata = async (prompt: SavedPrompt, metadata: any) => {
        const unified: UnifiedItem = promptToUnified(prompt, false);
        await updateItemMetadata(unified, metadata);
        if (previewPrompt?.id === prompt.id) setPreviewPrompt({ ...prompt, ...metadata });
    };

    const handleLegacyUpdateMetadata = async (prompt: SavedPrompt, metadata: any) => {
        const unified: UnifiedItem = promptToUnified(prompt, true);
        await updateItemMetadata(unified, metadata);
        if (previewPrompt?.id === prompt.id) setPreviewPrompt({ ...prompt, ...metadata });
    };
    
    const handleDelete = async () => {
        if (!previewPrompt || !previewPrompt.id) return;
        try {
            const unified: UnifiedItem = promptToUnified(previewPrompt, false);
            await removeContextItem(unified);
            setSuccessMessage('Deleted successfully!');
            setPreviewPrompt(null);
            setIsDeleteConfirmOpen(false);
        } catch (err) {
            setError('Failed to delete.');
        }
    };

    const handleLegacyDelete = async (id: number) => {
        try {
            const prompt = legacyPrompts.find(p => p.id === id);
            if (!prompt) return;
            const unified: UnifiedItem = promptToUnified(prompt, true);
            await removeContextItem(unified);
            setSuccessMessage('Deleted successfully!');
            setPreviewPrompt(null);
            setIsDeleteConfirmOpen(false);
        } catch (err) {
            setError('Failed to delete.');
        }
    };

    const handleClearAll = async () => {
        try {
            await db.clearAllTypedPrompts(activeTab);
            await loadArchive();
            setSuccessMessage('Cleared successfully.');
            setIsClearAllConfirmOpen(false);
        } catch (err) {
            setError('Failed to clear.');
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

    const handleAcceptDraft = () => {
        if (!pendingDraft) return;
        if (pendingDraft.type === 'standard') {
            setPromptConfig(pendingDraft.config as PromptConfig);
        } else {
            setSkillConfig(pendingDraft.config as AgentConfig);
        }
        setDraftStatus('loaded');
        setPendingDraft(null);
    };

    const handleDeclineDraft = async () => {
        if (!pendingDraft) return;
        await db.clearTypedPromptDraft(pendingDraft.type, 1);
        setDraftStatus('none');
        setPendingDraft(null);
    };

    const promptToUnified = (prompt: SavedPrompt, isLegacy: boolean): UnifiedItem => ({
        id: isLegacy ? `legacy-${prompt.id}` : `prompt-${activeTab}-${prompt.id}`,
        name: prompt.name,
        type: activeTab === 'standard' ? 'prompt-standard' : 'prompt-system',
        original: prompt,
        createdAt: prompt.createdAt,
        isStarred: prompt.isStarred || false,
        isPinned: prompt.isPinned || false,
        isArchived: prompt.isArchived || false,
        category: prompt.category || ''
    });

    const unifiedPrompts = savedPrompts.map(p => promptToUnified(p, false));
    const unifiedLegacy = legacyPrompts.map(p => promptToUnified(p, true));
    const allUnified = [...unifiedPrompts, ...unifiedLegacy];

    return (
        <div className="max-w-7xl mx-auto animate-fade-in">
            <Toast message={successMessage} onClose={() => setSuccessMessage('')} />

            <div className="flex justify-between items-center mb-10">
                <div>
                    <h2 className="text-3xl font-extrabold text-slate-900 dark:text-slate-100">
                        {activeTab === 'standard' ? 'Prompt Architect' : 'Skill Architect'}
                    </h2>
                    <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">
                        {activeTab === 'standard'
                            ? 'Extract signal from messy thoughts and refine into high-quality standard prompts.'
                            : 'Architect specialized skill modules and capability bundles for AI systems.'}
                    </p>
                </div>
            </div>



            {/* Split Pane Layout */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start mb-12">
                {/* Left Pane - Form */}
                <div className="lg:col-span-5 bg-white dark:bg-slate-900/30 p-6 rounded-3xl border border-slate-200/60 dark:border-slate-800/60 shadow-xs space-y-6">
                    <form onSubmit={(e) => { e.preventDefault(); handleGenerate(); }} className="space-y-6">
                        <div className="flex flex-col sm:flex-row justify-between sm:items-center pb-4 border-b border-slate-100 dark:border-slate-800/60 gap-4">
                            <h3 className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest">
                                {activeTab === 'standard' ? 'Define Prompt' : 'Define Skill'}
                            </h3>
                            <button type="button" onClick={() => setIsTemplateModalOpen(true)} className="flex items-center justify-center px-3 py-1.5 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-900/50 transition cursor-pointer">
                                <span className="material-icons mr-1.5 text-xs">model_training</span>
                                Template
                            </button>
                        </div>

                        {activeTab === 'standard' ? (
                            <div className="space-y-4">
                                <div>
                                    <label htmlFor="goal" className="flex items-center text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">
                                        Prompt Goal / Core Task <span className="text-red-500 ml-1">*</span>
                                    </label>
                                    <input type="text" id="goal" value={promptConfig.goal} onChange={(e) => setPromptConfig(prev => ({...prev, goal: e.target.value}))} placeholder="e.g., 'Summarize technical articles'" className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950/40 border border-slate-200 dark:border-slate-800 rounded-xl text-xs focus:ring-2 focus:ring-blue-500/40 outline-none transition text-slate-800 dark:text-slate-200" />
                                </div>
                                <div>
                                    <label htmlFor="instructions" className="flex items-center text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">Instructions (Optional)</label>
                                    <textarea id="instructions" rows={5} value={promptConfig.instructions} onChange={(e) => setPromptConfig(prev => ({...prev, instructions: e.target.value}))} placeholder="Specify detailed steps, constraints, tone, format..." className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950/40 border border-slate-200 dark:border-slate-800 rounded-xl text-xs focus:ring-2 focus:ring-blue-500/40 outline-none transition custom-scrollbar text-slate-800 dark:text-slate-200" />
                                </div>
                            </div>
                        ) : (
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">Role/Capability <span className="text-red-500">*</span></label>
                                    <input type="text" value={skillConfig.role} onChange={(e) => setSkillConfig(prev => ({...prev, role: e.target.value}))} placeholder="e.g. Data Viz Specialist" className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950/40 border border-slate-200 dark:border-slate-800 rounded-xl text-xs focus:ring-2 focus:ring-blue-500/40 outline-none transition text-slate-800 dark:text-slate-200" />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">Scope <span className="text-red-500">*</span></label>
                                    <input type="text" value={skillConfig.scope} onChange={(e) => setSkillConfig(prev => ({...prev, scope: e.target.value}))} placeholder="e.g. D3.js Charts" className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950/40 border border-slate-200 dark:border-slate-800 rounded-xl text-xs focus:ring-2 focus:ring-blue-500/40 outline-none transition text-slate-800 dark:text-slate-200" />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">Primary Goals</label>
                                    <textarea rows={3} value={skillConfig.goals} onChange={(e) => setSkillConfig(prev => ({...prev, goals: e.target.value}))} placeholder="List out primary goals, one per line..." className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950/40 border border-slate-200 dark:border-slate-800 rounded-xl text-xs focus:ring-2 focus:ring-blue-500/40 outline-none transition custom-scrollbar text-slate-800 dark:text-slate-200" />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">Constraints</label>
                                    <textarea rows={3} value={skillConfig.constraints} onChange={(e) => setSkillConfig(prev => ({...prev, constraints: e.target.value}))} placeholder="Specify boundaries or limitations..." className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950/40 border border-slate-200 dark:border-slate-800 rounded-xl text-xs focus:ring-2 focus:ring-blue-500/40 outline-none transition custom-scrollbar text-slate-800 dark:text-slate-200" />
                                </div>
                            </div>
                        )}

                        <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-800/60">
                            <button type="button" onClick={handleReset} disabled={isLoading} className="px-4 py-2 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-900/60 transition cursor-pointer">Reset</button>
                            <button type="submit" disabled={isLoading} className={`flex items-center justify-center px-4 py-2 rounded-xl text-xs font-semibold text-white cursor-pointer ${activeTab === 'standard' ? 'bg-blue-600 hover:bg-blue-500 shadow-md shadow-blue-600/10' : 'bg-purple-600 hover:bg-purple-500 shadow-md shadow-purple-600/10'} focus:outline-none disabled:opacity-50 transition`}>
                                {isLoading ? 'Architecting...' : 'Generate'}
                            </button>
                        </div>
                    </form>
                </div>

                {/* Right Pane - Compiled Output */}
                <div className="lg:col-span-7 space-y-6 lg:sticky lg:top-20">
                    {error && (
                        <div className="bg-red-500/10 border border-red-500/20 text-red-600 dark:text-red-400 px-5 py-4 rounded-2xl text-sm">
                            <strong className="font-bold">Error: </strong><span>{error}</span>
                        </div>
                    )}

                    {isLoading && <LoadingSpinner message={loadingMessage || 'Architecting...'} />}

                    {activeTab === 'standard' && generatedPrompt && !isLoading && (
                        <div className="space-y-6 animate-fade-in bg-white dark:bg-slate-900/20 p-6 rounded-3xl border border-slate-200/50 dark:border-slate-800/40 shadow-xs">
                            <div className="space-y-4">
                                <h4 className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest flex items-center">
                                    <span className="material-icons text-sm mr-2 text-blue-500">signal_cellular_alt</span>
                                    Signal Analysis
                                </h4>
                                <div className="prose prose-slate prose-xs dark:prose-invert max-w-none text-slate-600 dark:text-slate-400 leading-relaxed bg-slate-50 dark:bg-slate-900/30 p-4 rounded-2xl border border-slate-100 dark:border-slate-800/50">
                                    <ReactMarkdown remarkPlugins={[remarkGfm]}>{generatedPrompt.signal ?? ''}</ReactMarkdown>
                                </div>
                            </div>

                            <div className="space-y-4">
                                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between pb-3 border-b border-slate-200/60 dark:border-slate-800/50 gap-4">
                                    <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider">Generated Prompt</h3>
                                    <div className="flex items-center space-x-2">
                                       <button onClick={async () => { 
                                           const text = `## Signal Analysis\n\n${generatedPrompt.signal || ''}\n\n## Generated Prompt\n\n${generatedPrompt.prompt || ''}`;
                                           await fallbackCopyTextToClipboard(text); 
                                           setIsCopied(true);
                                           setTimeout(() => setIsCopied(false), 2000);
                                       }} className={`px-3 py-1.5 border rounded-xl text-xs font-semibold flex items-center transition cursor-pointer ${isCopied ? 'bg-green-500/10 text-green-600 dark:text-green-400 border-green-500/20' : 'border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-900/50'}`}>
                                           <span className="material-icons text-sm mr-1.5">{isCopied ? 'check' : 'content_copy'}</span>{isCopied ? 'Copied' : 'Copy'}
                                       </button>
                                       <button onClick={handleOpenSaveModal} className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-semibold flex items-center shadow-md shadow-blue-600/10 transition cursor-pointer"><span className="material-icons text-sm mr-1.5">save</span>Save</button>
                                    </div>
                                </div>
                                <div className="prose prose-slate dark:prose-invert max-w-none py-2 text-xs">
                                    <ReactMarkdown remarkPlugins={[remarkGfm]}>{generatedPrompt.prompt ?? ''}</ReactMarkdown>
                                </div>
                            </div>
                        </div>
                    )}

                    {activeTab === 'system' && generatedSkill && !isLoading && (
                        <div className="animate-fade-in bg-white dark:bg-slate-900/20 p-6 rounded-3xl border border-slate-200/50 dark:border-slate-800/40 shadow-xs">
                            <GeneratedFilesDisplay files={generatedSkill} onSave={handleOpenSaveModal} agentName="New Skill Module" />
                        </div>
                    )}

                    {!generatedPrompt && !generatedSkill && !isLoading && (
                        <div className="py-24 text-center bg-slate-500/5 rounded-3xl border-2 border-dashed border-slate-200/80 dark:border-slate-800/60 flex flex-col items-center justify-center">
                            <span className="material-icons text-4xl text-slate-300 dark:text-slate-700 mb-3 animate-pulse">auto_awesome</span>
                            <h4 className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-widest">Awaiting Compilation</h4>
                            <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-2 max-w-xs mx-auto leading-relaxed">
                                Define your configurations in the form on the left and click "Generate" to compile a structured prompting substrate.
                            </p>
                        </div>
                    )}
                </div>
            </div>
            
            {(savedPrompts.length > 0 || legacyPrompts.length > 0) && (
                <div className="mt-20 border-t border-slate-200/60 dark:border-slate-800/50 pt-16">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-8 gap-4">
                        <h3 className="text-2xl font-extrabold text-slate-800 dark:text-slate-200">Saved {activeTab === 'standard' ? 'Prompts' : 'Skill Bundles'}</h3>
                        <div className="flex space-x-3">
                            <button onClick={handleExportAll} className="px-4 py-2 text-xs font-semibold text-blue-600 dark:text-blue-400 bg-blue-500/10 rounded-xl hover:bg-blue-500/15 flex items-center cursor-pointer transition">
                                <span className="material-icons text-sm mr-2">download</span>Export All
                            </button>
                            <button onClick={() => setIsClearAllConfirmOpen(true)} className="px-4 py-2 text-xs font-semibold text-rose-600 dark:text-rose-400 bg-rose-500/10 rounded-xl hover:bg-rose-500/15 flex items-center cursor-pointer transition">
                                <span className="material-icons text-sm mr-2">delete_sweep</span>Clear All
                            </button>
                        </div>
                    </div>

                    <div className="mb-8 space-y-4">
                        <StarredPinnedBar
                            type="starred"
                            items={allUnified}
                            expanded={expandedSections.starredSection}
                            onToggleExpand={() => setExpandedSections(prev => ({ ...prev, starredSection: !prev.starredSection }))}
                            onToggleStar={(item) => {
                                const isLegacy = legacyPrompts.some(lp => lp.id === item.original.id);
                                if (isLegacy) handleLegacyUpdateMetadata(item.original, { isStarred: !item.original.isStarred });
                                else handleUpdateMetadata(item.original, { isStarred: !item.original.isStarred });
                            }}
                            onTogglePin={(item) => {
                                const isLegacy = legacyPrompts.some(lp => lp.id === item.original.id);
                                if (isLegacy) handleLegacyUpdateMetadata(item.original, { isPinned: !item.original.isPinned });
                                else handleUpdateMetadata(item.original, { isPinned: !item.original.isPinned });
                            }}
                            onToggleArchive={(item) => {
                                const isLegacy = legacyPrompts.some(lp => lp.id === item.original.id);
                                if (isLegacy) handleLegacyUpdateMetadata(item.original, { isArchived: true });
                                else handleUpdateMetadata(item.original, { isArchived: true });
                            }}
                            onDelete={(item) => { setPreviewPrompt(item.original); setIsDeleteConfirmOpen(true); }}
                            onEdit={(item) => handleOpenEditModal(item.original)}
                            onSelect={(id) => {
                                const prompt = savedPrompts.find(p => `prompt-${activeTab}-${p.id}` === id) || legacyPrompts.find(p => `legacy-${p.id}` === id);
                                if (prompt) handleLoadSavedPrompt(prompt);
                            }}
                            selectedIds={new Set()}
                        />
                        <StarredPinnedBar
                            type="pinned"
                            items={allUnified}
                            expanded={expandedSections.pinnedSection}
                            onToggleExpand={() => setExpandedSections(prev => ({ ...prev, pinnedSection: !prev.pinnedSection }))}
                            onToggleStar={(item) => {
                                const isLegacy = legacyPrompts.some(lp => lp.id === item.original.id);
                                if (isLegacy) handleLegacyUpdateMetadata(item.original, { isStarred: !item.original.isStarred });
                                else handleUpdateMetadata(item.original, { isStarred: !item.original.isStarred });
                            }}
                            onTogglePin={(item) => {
                                const isLegacy = legacyPrompts.some(lp => lp.id === item.original.id);
                                if (isLegacy) handleLegacyUpdateMetadata(item.original, { isPinned: !item.original.isPinned });
                                else handleUpdateMetadata(item.original, { isPinned: !item.original.isPinned });
                            }}
                            onToggleArchive={(item) => {
                                const isLegacy = legacyPrompts.some(lp => lp.id === item.original.id);
                                if (isLegacy) handleLegacyUpdateMetadata(item.original, { isArchived: true });
                                else handleUpdateMetadata(item.original, { isArchived: true });
                            }}
                            onDelete={(item) => { setPreviewPrompt(item.original); setIsDeleteConfirmOpen(true); }}
                            onEdit={(item) => handleOpenEditModal(item.original)}
                            onSelect={(id) => {
                                const prompt = savedPrompts.find(p => `prompt-${activeTab}-${p.id}` === id) || legacyPrompts.find(p => `legacy-${p.id}` === id);
                                if (prompt) handleLoadSavedPrompt(prompt);
                            }}
                            selectedIds={new Set()}
                        />
                    </div>

                    <div className="mb-6">
                        <div className="relative">
                            <span className="material-icons absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">search</span>
                            <input
                                type="text"
                                placeholder="Search saved items..."
                                value={searchTerm}
                                onChange={(e) => setSearchText(e.target.value)}
                                className="w-full pl-11 pr-4 py-3 bg-white dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 rounded-2xl focus:ring-2 focus:ring-blue-500/40 outline-none transition-all text-sm"
                            />
                        </div>
                    </div>
                    <div className="space-y-4">
                        {savedPrompts
                            .filter(p => !p.isArchived && !p.isStarred && !p.isPinned && (p.name.toLowerCase().includes(searchTerm.toLowerCase()) || getDeepSearchText(p).includes(searchTerm.toLowerCase())))
                            .map(p => (
                                <LibraryItem
                                    key={p.id}
                                    name={p.name}
                                    createdAt={p.createdAt}
                                    metadata={p}
                                    icon={activeTab === 'standard' ? 'article' : 'extension'}
                                    onPreview={() => setPreviewPrompt(p)}
                                    onEdit={() => handleOpenEditModal(p)}
                                    onDelete={() => { setPreviewPrompt(p); setIsDeleteConfirmOpen(true); }}
                                    onToggleStar={() => handleUpdateMetadata(p, { isStarred: !p.isStarred })}
                                    onTogglePin={() => handleUpdateMetadata(p, { isPinned: !p.isPinned })}
                                    onToggleArchive={() => handleUpdateMetadata(p, { isArchived: true })}
                                    onClick={() => handleLoadSavedPrompt(p)}
                                />
                            ))}

                        {legacyPrompts
                            .filter(p => !p.isArchived && !p.isStarred && !p.isPinned && (p.name.toLowerCase().includes(searchTerm.toLowerCase()) || getDeepSearchText(p).includes(searchTerm.toLowerCase())))
                            .map(p => (
                                <LibraryItem
                                    key={`legacy-${p.id}`}
                                    name={p.name}
                                    createdAt={p.createdAt}
                                    metadata={p}
                                    isLegacy
                                    icon="history"
                                    onPreview={() => setPreviewPrompt(p)}
                                    onDelete={() => { setPreviewPrompt(p); setIsDeleteConfirmOpen(true); }}
                                    onToggleStar={() => handleLegacyUpdateMetadata(p, { isStarred: !p.isStarred })}
                                    onTogglePin={() => handleLegacyUpdateMetadata(p, { isPinned: !p.isPinned })}
                                    onToggleArchive={() => handleLegacyUpdateMetadata(p, { isArchived: true })}
                                    onClick={() => handleLoadSavedPrompt(p)}
                                />
                            ))}
                    </div>
                </div>
            )}

            <Modal isOpen={isTemplateModalOpen} onClose={() => setIsTemplateModalOpen(false)} title="Load Template">
                <div className="space-y-3 max-h-[60vh] overflow-y-auto custom-scrollbar">
                    {(activeTab === 'standard' ? PROMPT_TEMPLATES : SKILL_TEMPLATES).map((template: any) => (
                        <button 
                            key={template.name} 
                            onClick={() => {
                                if (activeTab === 'standard') setPromptConfig({ goal: template.goal, instructions: template.instructions });
                                else setSkillConfig(template);
                                setIsTemplateModalOpen(false);
                            }}
                            className="w-full text-left p-5 rounded-2xl bg-slate-50 dark:bg-slate-900/30 hover:bg-blue-500/5 hover:border-blue-500/30 border border-slate-100 dark:border-slate-800/80 transition cursor-pointer"
                        >
                            <h4 className="font-bold text-slate-800 dark:text-slate-200 text-sm">{template.name}</h4>
                            <p className="text-xs text-slate-500 dark:text-slate-400 mt-2 leading-relaxed">{template.goal || template.role}</p>
                        </button>
                    ))}
                </div>
            </Modal>

            <PreviewModal
                isOpen={!!previewPrompt && !isDeleteConfirmOpen}
                onClose={() => setPreviewPrompt(null)}
                title={previewPrompt?.name || ''}
                content={previewPrompt?.prompt || (previewPrompt?.files ? {
                    'agent.md': previewPrompt.files.agentFile,
                    'guidelines.md': previewPrompt.files.projectGuidelines,
                    'constraints.md': previewPrompt.files.constraintsFile,
                    'SKILL.md': previewPrompt.files.skillFile
                } : undefined)}
                metadata={previewPrompt || undefined}
                onUpdateMetadata={(metadata) => {
                    if (previewPrompt) {
                        const isLegacy = legacyPrompts.some(lp => lp.id === previewPrompt.id);
                        if (isLegacy) handleLegacyUpdateMetadata(previewPrompt, metadata);
                        else handleUpdateMetadata(previewPrompt, metadata);
                    }
                }}
                onCopy={() => {
                    const text = previewPrompt?.prompt || (previewPrompt?.files ? Object.values(previewPrompt.files).join('\n\n---\n\n') : '');
                    navigator.clipboard.writeText(text);
                    setSuccessMessage('Copied to clipboard!');
                }}
                onExport={() => {
                    if (previewPrompt?.prompt) handleExportLegacyMd(previewPrompt.prompt, previewPrompt.name);
                    else if (previewPrompt?.files) {
                        const zip = new JSZip();
                        zip.file('agent.md', previewPrompt.files.agentFile);
                        zip.file('guidelines.md', previewPrompt.files.projectGuidelines);
                        zip.file('constraints.md', previewPrompt.files.constraintsFile);
                        zip.file('SKILL.md', previewPrompt.files.skillFile);
                        zip.generateAsync({ type: 'blob' }).then(content => {
                            const url = URL.createObjectURL(content);
                            const link = document.createElement('a');
                            link.href = url;
                            link.download = `${sanitizeFilename(previewPrompt.name)}.zip`;
                            link.click();
                            URL.revokeObjectURL(url);
                        });
                    }
                }}
                onDelete={() => setIsDeleteConfirmOpen(true)}
            />

            <Modal isOpen={isClearAllConfirmOpen} onClose={() => setIsClearAllConfirmOpen(false)} title="Confirm Clear All">
                <div className="space-y-4">
                    <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">Are you sure you want to delete ALL saved items in this tab? This action cannot be undone.</p>
                    <div className="flex justify-end gap-3 pt-4">
                        <button onClick={() => setIsClearAllConfirmOpen(false)} className="px-5 py-2.5 border border-slate-200 dark:border-slate-800 rounded-xl font-semibold text-xs cursor-pointer">Cancel</button>
                        <button onClick={handleClearAll} className="px-5 py-2.5 bg-rose-600 hover:bg-rose-500 text-white font-semibold text-xs rounded-xl cursor-pointer">Clear All</button>
                    </div>
                </div>
            </Modal>

            <Modal isOpen={isDeleteConfirmOpen} onClose={() => setIsDeleteConfirmOpen(false)} title="Confirm Deletion">
                <div className="space-y-4">
                    <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">Are you sure you want to delete <strong>{previewPrompt?.name}</strong>? This action cannot be undone.</p>
                    <div className="flex justify-end gap-3 pt-4">
                        <button onClick={() => setIsDeleteConfirmOpen(false)} className="px-5 py-2.5 border border-slate-200 dark:border-slate-800 rounded-xl font-semibold text-xs cursor-pointer">Cancel</button>
                        <button onClick={() => {
                            const isLegacy = legacyPrompts.some(lp => lp.id === previewPrompt?.id);
                            if (isLegacy) handleLegacyDelete(previewPrompt!.id!);
                            else handleDelete();
                        }} className="px-5 py-2.5 bg-rose-600 hover:bg-rose-500 text-white font-semibold text-xs rounded-xl cursor-pointer">Delete</button>
                    </div>
                </div>
            </Modal>

            <Modal isOpen={!!pendingDraft} onClose={() => setPendingDraft(null)} title="Unsaved Draft Found">
                <div className="space-y-4">
                    <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                        An unsaved {pendingDraft?.type === 'standard' ? 'prompt' : 'skill'} draft was found from your last session. Would you like to restore it?
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
                            className={`px-5 py-2.5 text-white font-semibold text-xs rounded-xl cursor-pointer transition ${activeTab === 'standard' ? 'bg-blue-600 hover:bg-blue-500' : 'bg-purple-600 hover:bg-purple-500'}`}
                        >
                            Restore Draft
                        </button>
                    </div>
                </div>
            </Modal>

            <Modal isOpen={!!modalState} onClose={() => { setModalState(null); }} title={modalState?.mode === 'edit' ? 'Edit' : 'Save'}>
                {modalState && (
                    <div className="space-y-5 animate-fade-in">
                        <div>
                            <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">Name</label>
                            <input type="text" value={modalInput.name} onChange={e => setModalInput({...modalInput, name: e.target.value})} className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500/40" />
                        </div>
                        
                        {modalState.mode === 'edit' && (
                            <div className="max-h-96 overflow-y-auto space-y-4 pr-1 custom-scrollbar">
                                {modalInput.prompt !== undefined ? (
                                    <div>
                                        <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">Prompt Content</label>
                                        <textarea rows={10} value={modalInput.prompt} onChange={e => setModalInput({...modalInput, prompt: e.target.value})} className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl font-mono text-xs focus:ring-2 focus:ring-blue-500/40 outline-none custom-scrollbar" />
                                    </div>
                                ) : modalInput.files && (
                                    <div className="space-y-4">
                                        <div>
                                            <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">Agent Persona</label>
                                            <textarea rows={5} value={modalInput.files.agentFile} onChange={e => setModalInput(prev => ({...prev, files: {...prev.files!, agentFile: e.target.value}}))} className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl font-mono text-xs focus:ring-2 focus:ring-blue-500/40 outline-none custom-scrollbar" />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">Project Guidelines</label>
                                            <textarea rows={5} value={modalInput.files.projectGuidelines} onChange={e => setModalInput(prev => ({...prev, files: {...prev.files!, projectGuidelines: e.target.value}}))} className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl font-mono text-xs focus:ring-2 focus:ring-blue-500/40 outline-none custom-scrollbar" />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">Constraints & Guardrails</label>
                                            <textarea rows={5} value={modalInput.files.constraintsFile} onChange={e => setModalInput(prev => ({...prev, files: {...prev.files!, constraintsFile: e.target.value}}))} className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl font-mono text-xs focus:ring-2 focus:ring-blue-500/40 outline-none custom-scrollbar" />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">SKILL.md</label>
                                            <textarea rows={5} value={modalInput.files.skillFile} onChange={e => setModalInput(prev => ({...prev, files: {...prev.files!, skillFile: e.target.value}}))} className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl font-mono text-xs focus:ring-2 focus:ring-blue-500/40 outline-none custom-scrollbar" />
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}
                        
                        <div className="flex justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-800/80">
                            <button onClick={() => setModalState(null)} className="px-5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 font-semibold text-xs cursor-pointer">Cancel</button>
                            <button onClick={handleModalSave} className={`px-5 py-2.5 rounded-xl text-white font-semibold text-xs cursor-pointer ${activeTab === 'standard' ? 'bg-blue-600 hover:bg-blue-500' : 'bg-purple-600 hover:bg-purple-500'}`}>{modalState.mode === 'edit' ? 'Update' : 'Save'}</button>
                        </div>
                    </div>
                )}
            </Modal>
        </div>
    );
};

export default PromptArchitect;

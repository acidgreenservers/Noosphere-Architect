import React, { useState, useCallback, useEffect, useRef } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { AgentConfig, GeneratedPrompt, SavedAgent } from '../types';
import { generateAgentPersona } from '../services/ai/agentPersonaService';
import { AbortError } from '../services/ai/openRouter';
import * as db from '../services/dbService';
import JSZip from 'jszip';
import { sanitizeFilename } from '../utils/security';
import AgentForm from './AgentForm';
import LoadingSpinner from './LoadingSpinner';
import Modal from './Modal';
import PreviewModal from './PreviewModal';
import LibraryItem from './LibraryItem';
import Toast from './Toast';
import { StarredPinnedBar } from './StarredPinnedBar';
import { UnifiedItem } from '../types';
import { getDeepSearchText } from '../utils/search';

const AGENT_TEMPLATES = [
    {
        name: 'Senior Frontend Engineer',
        role: 'Senior React/TypeScript Developer',
        scope: 'Building scalable, accessible, and performant web applications using modern React patterns.',
        goals: '1. Create reusable UI components.\n2. Implement state management effectively.\n3. Ensure high test coverage and code quality.',
        constraints: '1. Strict TypeScript typing.\n2. Follow accessibility standards (WCAG 2.1 AA).\n3. No inline styles; use Tailwind CSS.'
    },
    {
        name: 'Data Scientist',
        role: 'Data Analyst and Machine Learning Engineer',
        scope: 'Analyzing datasets, building predictive models, and generating actionable insights.',
        goals: '1. Clean and preprocess raw data.\n2. Train and evaluate ML models.\n3. Create clear data visualizations.',
        constraints: '1. Use Python (Pandas, Scikit-learn).\n2. Document all assumptions and methodologies.\n3. Ensure models are interpretable.'
    },
    {
        name: 'Technical Writer',
        role: 'API and Developer Documentation Specialist',
        scope: 'Creating clear, concise, and comprehensive documentation for software products and APIs.',
        goals: '1. Write API reference guides.\n2. Create step-by-step tutorials.\n3. Maintain a consistent tone and style.',
        constraints: '1. Output must be in Markdown.\n2. Avoid jargon where possible.\n3. Include code examples for all endpoints.'
    }
];

interface AgentArchitectProps {
  initialConfig?: AgentConfig;
  onClearInitialConfig?: () => void;
}

const AgentArchitect: React.FC<AgentArchitectProps> = ({ initialConfig, onClearInitialConfig }) => {
  const [agentConfig, setAgentConfig] = useState<AgentConfig>({ role: '', scope: '', goals: '', constraints: '' });
  const [generatedPrompt, setGeneratedPrompt] = useState<GeneratedPrompt | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [loadedAgentName, setLoadedAgentName] = useState<string | undefined>(undefined);
  const [loadingMessage, setLoadingMessage] = useState('');
  const loadingIntervalRef = useRef<number | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  const [savedAgents, setSavedAgents] = useState<SavedAgent[]>([]);
  const [searchTerm, setSearchText] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [draftStatus, setDraftStatus] = useState<'unloaded' | 'loaded' | 'none'>('unloaded');
  const isCheckingDraft = useRef(false);
  const [isTemplateModalOpen, setIsTemplateModalOpen] = useState(false);

  const [modalState, setModalState] = useState<{ mode: 'save' | 'edit'; agent?: SavedAgent } | null>(null);
  const [modalInput, setModalInput] = useState<{ name: string; prompt: string }>({ name: '', prompt: '' });
  const [previewAgent, setPreviewAgent] = useState<SavedAgent | null>(null);
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
  const [isClearAllConfirmOpen, setIsClearAllConfirmOpen] = useState(false);
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    starredSection: true,
    pinnedSection: true,
    allItemsSection: true
  });

  const loadSavedAgents = useCallback(async () => {
    const agents = await db.getAllAgents();
    setSavedAgents(agents);
  }, []);

  useEffect(() => {
    if (initialConfig) {
      setAgentConfig(initialConfig);
      if (onClearInitialConfig) onClearInitialConfig();
      return;
    }

    loadSavedAgents();
    const loadDraft = async () => {
        if (isCheckingDraft.current) return;
        isCheckingDraft.current = true;

        const draft = await db.getDraft(1);
        if (draft?.config && Object.values(draft.config).some(v => v)) {
            setPendingDraft(draft.config);
        } else {
            setDraftStatus('none');
        }
    };
    loadDraft();
  }, [loadSavedAgents, initialConfig, onClearInitialConfig]);

  const [pendingDraft, setPendingDraft] = useState<AgentConfig | null>(null);

  useEffect(() => {
    if (draftStatus === 'unloaded') return;
    const handler = setTimeout(() => {
        const isDirty = Object.values(agentConfig).some(value => typeof value === 'string' && value.length > 0);
        if (isDirty) {
            db.saveDraft({ id: 1, config: agentConfig });
        }
    }, 1500);
    return () => clearTimeout(handler);
  }, [agentConfig, draftStatus]);

  const handleGenerate = useCallback(async () => {
    abortControllerRef.current?.abort();
    const controller = new AbortController();
    abortControllerRef.current = controller;

    setIsLoading(true);
    setError(null);
    setGeneratedPrompt(null);
    
    const messages = ['Analyzing agent core...', 'Synthesizing persona...', 'Structuring system prompt...', 'Encoding agent logic...'];
    let messageIndex = 0;
    setLoadingMessage(messages[0]);
    loadingIntervalRef.current = window.setInterval(() => {
        messageIndex = (messageIndex + 1) % messages.length;
        setLoadingMessage(messages[messageIndex]);
    }, 2000);

    try {
      if (!agentConfig.role || !agentConfig.scope) {
        setError("Agent Role and Scope are required fields.");
        return;
      }
      const result = await generateAgentPersona(agentConfig, controller.signal);
      if (!controller.signal.aborted) {
        setGeneratedPrompt(result);
        await db.clearDraft(1);
      }
    } catch (e: any) {
      if (e instanceof AbortError || e?.name === 'AbortError') return;
      setError('Failed to generate agent persona. Please check your API key and try again.');
    } finally {
      setIsLoading(false);
      if(loadingIntervalRef.current) {
        clearInterval(loadingIntervalRef.current);
      }
      setLoadingMessage('');
      abortControllerRef.current = null;
    }
  }, [agentConfig]);

  useEffect(() => {
    return () => {
      abortControllerRef.current?.abort();
    };
  }, []);

  const handleReset = () => {
    setAgentConfig({ role: '', scope: '', goals: '', constraints: '' });
    setGeneratedPrompt(null);
    setError(null);
    setIsLoading(false);
    setLoadedAgentName(undefined);
    db.clearDraft(1);
  };
  
  const handleOpenSaveModal = () => {
    if (!generatedPrompt) return;
    setModalInput({ name: loadedAgentName || '', prompt: generatedPrompt.prompt });
    setModalState({ mode: 'save' });
  };

  const handleOpenEditModal = (agent: SavedAgent) => {
    setModalInput({ name: agent.name, prompt: agent.prompt || '' });
    setModalState({ mode: 'edit', agent });
  };
  
  const handleModalSave = async () => {
    if (!modalState || !modalInput.name.trim()) return;

    if (modalState.mode === 'save' && generatedPrompt) {
        const newAgent: SavedAgent = {
            name: modalInput.name.trim(),
            config: agentConfig,
            prompt: generatedPrompt.prompt,
            signal: generatedPrompt.signal,
            createdAt: new Date().toISOString(),
            isStarred: false,
            isPinned: false,
            isArchived: false,
            category: ''
        };
        await db.addAgent(newAgent);
        setSuccessMessage('Agent saved successfully!');
    } else if (modalState.mode === 'edit' && modalState.agent) {
        const updatedAgent: SavedAgent = {
            ...modalState.agent,
            name: modalInput.name.trim(),
            prompt: modalInput.prompt,
        };
        await db.updateAgent(updatedAgent);
        setSuccessMessage('Agent updated successfully!');
    }
    
    loadSavedAgents();
    setModalState(null);
  };

  const handleDelete = async () => {
    if (!previewAgent || !previewAgent.id) return;
    try {
        await db.deleteAgent(previewAgent.id);
        setSavedAgents(prevAgents => prevAgents.filter(agent => agent.id !== previewAgent.id));
        setSuccessMessage('Agent deleted successfully!');
        setPreviewAgent(null);
        setIsDeleteConfirmOpen(false);
    } catch (err) {
        setError('Failed to delete agent.');
    }
  };

  const handleClearAll = async () => {
    try {
        await db.clearAllAgents();
        setSavedAgents([]);
        setSuccessMessage('All agents have been deleted.');
        setIsClearAllConfirmOpen(false);
    } catch (err) {
        setError('Failed to clear all agents.');
        console.error(err);
    }
  };

  const handleExportPrompt = (prompt: string, name?: string) => {
    const filename = sanitizeFilename(name || 'agent-prompt') + '.md';
    const blob = new Blob([prompt], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleExportLegacyZip = (agent: SavedAgent) => {
    if (!agent.files) return;
    const zip = new JSZip();
    const folderName = sanitizeFilename(agent.name);
    const folder = zip.folder(folderName);
    if (folder) {
        folder.file('agent.md', agent.files.agentFile);
        folder.file('guidelines.md', agent.files.projectGuidelines);
        folder.file('constraints.md', agent.files.constraintsFile);
        folder.file('SKILL.md', agent.files.skillFile);
    }
    zip.generateAsync({ type: 'blob' }).then(content => {
        const url = URL.createObjectURL(content);
        const link = document.createElement('a');
        link.href = url;
        link.download = `${folderName}-legacy.zip`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    });
  };

  const handleExportAll = async () => {
    if (savedAgents.length === 0) return;

    const zip = new JSZip();
    savedAgents.forEach(agent => {
        const folderName = sanitizeFilename(agent.name);
        if (agent.prompt) {
            zip.file(`${folderName}/agent.md`, agent.prompt);
        } else if (agent.files) {
            const folder = zip.folder(folderName);
            if (folder) {
                folder.file('agent.md', agent.files.agentFile);
                folder.file('guidelines.md', agent.files.projectGuidelines);
                folder.file('constraints.md', agent.files.constraintsFile);
                folder.file('SKILL.md', agent.files.skillFile);
            }
        }
    });

    const content = await zip.generateAsync({ type: 'blob' });
    const url = URL.createObjectURL(content);
    const link = document.createElement('a');
    link.href = url;
    link.download = `noosphere-agents-${new Date().toISOString().split('T')[0]}.zip`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    setSuccessMessage('All agents exported as ZIP!');
  };

  const handleAcceptDraft = () => {
    if (pendingDraft) {
        setAgentConfig(pendingDraft);
        setDraftStatus('loaded');
        setPendingDraft(null);
    }
  };

  const handleDeclineDraft = async () => {
    await db.clearDraft(1);
    setDraftStatus('none');
    setPendingDraft(null);
  };

  const handleLoadSavedAgent = (agent: SavedAgent) => {
      setAgentConfig(agent.config as AgentConfig);
      if (agent.prompt) {
        setGeneratedPrompt({ signal: agent.signal || 'Restored from saved.', prompt: agent.prompt });
      } else {
        setGeneratedPrompt(null);
      }
      setLoadedAgentName(agent.name);
      window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  const handleUpdateMetadata = async (agent: SavedAgent, metadata: any) => {
    const updated = { ...agent, ...metadata };
    await db.updateAgent(updated);
    setSavedAgents(prev => prev.map(a => a.id === agent.id ? updated : a));
    loadSavedAgents();
    if (previewAgent?.id === agent.id) setPreviewAgent(updated);
  };

  const agentToUnified = (agent: SavedAgent): UnifiedItem => ({
    id: `agent-${agent.id}`,
    name: agent.name,
    type: 'agent',
    original: agent,
    createdAt: agent.createdAt,
    isStarred: agent.isStarred || false,
    isPinned: agent.isPinned || false,
    isArchived: agent.isArchived || false,
    category: agent.category || ''
  });

  const unifiedAgents = savedAgents.map(agentToUnified);

  const handleLoadTemplate = (template: AgentConfig) => {
      setAgentConfig({
          role: template.role,
          scope: template.scope,
          goals: template.goals,
          constraints: template.constraints
      });
      setIsTemplateModalOpen(false);
  };

  return (
    <div className="max-w-4xl mx-auto animate-fade-in">
      <Toast message={successMessage} onClose={() => setSuccessMessage('')} />

      <div className="flex justify-between items-center mb-10">
          <div>
              <h2 className="text-3xl font-extrabold text-slate-900 dark:text-slate-100">AI Agent Architect</h2>
              <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">Configure specialized reasoning agent structures.</p>
          </div>
      </div>

      <div className="bg-transparent mb-12">
        <AgentForm 
          agentConfig={agentConfig} 
          setAgentConfig={setAgentConfig} 
          onGenerate={handleGenerate}
          onReset={handleReset}
          onLoadTemplate={() => setIsTemplateModalOpen(true)}
          isLoading={isLoading} 
        />
      </div>

      {error && (
        <div className="mt-8 bg-red-500/10 border border-red-500/20 text-red-600 dark:text-red-400 px-5 py-4 rounded-2xl text-sm relative" role="alert">
          <strong className="font-bold">Error: </strong>
          <span className="block sm:inline">{error}</span>
        </div>
      )}

      {isLoading && <LoadingSpinner message={loadingMessage} />}

      {generatedPrompt && !isLoading && (
        <div className="mt-12 space-y-10 animate-fade-in">
             <div className="space-y-4">
                <h4 className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest flex items-center">
                    <span className="material-icons text-sm mr-2 text-blue-500">signal_cellular_alt</span>
                    Signal Analysis
                </h4>
                <div className="prose prose-slate prose-sm dark:prose-invert max-w-none text-slate-600 dark:text-slate-400 leading-relaxed bg-slate-50 dark:bg-slate-900/30 p-5 rounded-2xl border border-slate-100 dark:border-slate-800/50">
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>{generatedPrompt.signal}</ReactMarkdown>
                </div>
            </div>

            <div className="space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between pb-4 border-b border-slate-200/60 dark:border-slate-800/50 gap-4">
                    <h3 className="text-xl font-bold">Generated Agent Prompt</h3>
                    <div className="flex items-center space-x-3">
                        <button onClick={() => { navigator.clipboard.writeText(generatedPrompt.prompt); setSuccessMessage('Prompt copied!'); }} className="flex items-center px-4 py-2 border border-slate-200 dark:border-slate-800 rounded-xl text-sm font-semibold hover:bg-slate-100 dark:hover:bg-slate-900/50 transition duration-200 cursor-pointer">
                            <span className="material-icons text-base mr-2">content_copy</span>Copy
                        </button>
                        <button onClick={() => handleExportPrompt(generatedPrompt.prompt, loadedAgentName)} className="flex items-center px-4 py-2 border border-slate-200 dark:border-slate-800 rounded-xl text-sm font-semibold hover:bg-slate-100 dark:hover:bg-slate-900/50 transition duration-200 cursor-pointer">
                            <span className="material-icons text-base mr-2">download</span>Export
                        </button>
                        <button onClick={handleOpenSaveModal} className="flex items-center px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-sm font-semibold shadow-md shadow-blue-600/10 transition cursor-pointer">
                            <span className="material-icons text-base mr-2">save</span>Save
                        </button>
                    </div>
                </div>
                <div className="prose prose-slate dark:prose-invert max-w-none py-4 px-2">
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>{generatedPrompt.prompt}</ReactMarkdown>
                </div>
            </div>
        </div>
      )}
      
      {savedAgents.length > 0 && (
        <div className="mt-20 border-t border-slate-200/60 dark:border-slate-800/50 pt-16">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-8 gap-4">
                <h2 className="text-2xl font-extrabold text-slate-800 dark:text-slate-200">Saved Agents</h2>
                <div className="flex space-x-3">
                    <button onClick={handleExportAll} className="px-4 py-2 text-xs font-semibold text-blue-600 dark:text-blue-400 bg-blue-500/10 rounded-xl hover:bg-blue-500/15 flex items-center cursor-pointer transition">
                        <span className="material-icons text-sm mr-2">download</span>
                        Export All
                    </button>
                    <button onClick={() => setIsClearAllConfirmOpen(true)} className="px-4 py-2 text-xs font-semibold text-rose-600 dark:text-rose-400 bg-rose-500/10 rounded-xl hover:bg-rose-500/15 flex items-center cursor-pointer transition">
                        <span className="material-icons text-sm mr-2">delete_sweep</span>
                        Clear All
                    </button>
                </div>
            </div>

            <div className="mb-8 space-y-4">
                <StarredPinnedBar
                    type="starred"
                    items={unifiedAgents}
                    expanded={expandedSections.starredSection}
                    onToggleExpand={() => setExpandedSections(prev => ({ ...prev, starredSection: !prev.starredSection }))}
                    onToggleStar={(item) => handleUpdateMetadata(item.original, { isStarred: !item.original.isStarred })}
                    onTogglePin={(item) => handleUpdateMetadata(item.original, { isPinned: !item.original.isPinned })}
                    onToggleArchive={(item) => handleUpdateMetadata(item.original, { isArchived: true })}
                    onDelete={(item) => { setPreviewAgent(item.original); setIsDeleteConfirmOpen(true); }}
                    onEdit={(item) => handleOpenEditModal(item.original)}
                    onSelect={(id) => handleLoadSavedAgent(savedAgents.find(a => `agent-${a.id}` === id)!)}
                    selectedIds={new Set()}
                />
                <StarredPinnedBar
                    type="pinned"
                    items={unifiedAgents}
                    expanded={expandedSections.pinnedSection}
                    onToggleExpand={() => setExpandedSections(prev => ({ ...prev, pinnedSection: !prev.pinnedSection }))}
                    onToggleStar={(item) => handleUpdateMetadata(item.original, { isStarred: !item.original.isStarred })}
                    onTogglePin={(item) => handleUpdateMetadata(item.original, { isPinned: !item.original.isPinned })}
                    onToggleArchive={(item) => handleUpdateMetadata(item.original, { isArchived: true })}
                    onDelete={(item) => { setPreviewAgent(item.original); setIsDeleteConfirmOpen(true); }}
                    onEdit={(item) => handleOpenEditModal(item.original)}
                    onSelect={(id) => handleLoadSavedAgent(savedAgents.find(a => `agent-${a.id}` === id)!)}
                    selectedIds={new Set()}
                />
            </div>

            <div className="mb-6">
                <div className="relative">
                    <span className="material-icons absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">search</span>
                    <input
                        type="text"
                        placeholder="Search saved agents..."
                        value={searchTerm}
                        onChange={(e) => setSearchText(e.target.value)}
                        className="w-full pl-11 pr-4 py-3 bg-white dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 rounded-2xl focus:ring-2 focus:ring-blue-500/40 outline-none transition-all text-sm"
                    />
                </div>
            </div>
            <div className="space-y-4">
                {savedAgents
                    .filter(a => !a.isArchived && !a.isStarred && !a.isPinned && (a.name.toLowerCase().includes(searchTerm.toLowerCase()) || getDeepSearchText(a).includes(searchTerm.toLowerCase())))
                    .map(agent => (
                        <LibraryItem
                            key={agent.id}
                            name={agent.name}
                            createdAt={agent.createdAt}
                            metadata={agent}
                            isLegacy={!!(agent.files && !agent.prompt)}
                            icon="group_work"
                            onPreview={() => setPreviewAgent(agent)}
                            onEdit={() => handleOpenEditModal(agent)}
                            onDelete={() => { setPreviewAgent(agent); setIsDeleteConfirmOpen(true); }}
                            onToggleStar={() => handleUpdateMetadata(agent, { isStarred: !agent.isStarred })}
                            onTogglePin={() => handleUpdateMetadata(agent, { isPinned: !agent.isPinned })}
                            onToggleArchive={() => handleUpdateMetadata(agent, { isArchived: true })}
                            onClick={() => handleLoadSavedAgent(agent)}
                        />
                    ))}
                {(savedAgents.filter(a => !a.isArchived && !a.isStarred && !a.isPinned && (a.name.toLowerCase().includes(searchTerm.toLowerCase()) || getDeepSearchText(a).includes(searchTerm.toLowerCase()))).length === 0 && searchTerm) && (
                    <div className="py-12 text-center text-slate-500">
                        <span className="material-icons text-4xl mb-2 text-slate-400">search_off</span>
                        <p className="text-sm">No agents match your search</p>
                    </div>
                )}
            </div>
        </div>
      )}

      <Modal isOpen={isTemplateModalOpen} onClose={() => setIsTemplateModalOpen(false)} title="Load an Agent Template">
          <div className="space-y-3 max-h-[60vh] overflow-y-auto custom-scrollbar">
              {AGENT_TEMPLATES.map((template) => (
                  <button 
                      key={template.name} 
                      onClick={() => handleLoadTemplate(template)}
                      className="w-full text-left p-5 rounded-2xl bg-slate-50 dark:bg-slate-900/30 hover:bg-blue-500/5 hover:border-blue-500/30 border border-slate-100 dark:border-slate-800/80 transition cursor-pointer"
                  >
                      <h4 className="font-bold text-slate-800 dark:text-slate-200 text-sm">{template.name}</h4>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-2 leading-relaxed">{template.role}</p>
                  </button>
              ))}
          </div>
      </Modal>

      <PreviewModal
          isOpen={!!previewAgent && !isDeleteConfirmOpen}
          onClose={() => setPreviewAgent(null)}
          title={previewAgent?.name || ''}
          content={previewAgent?.prompt || (previewAgent?.files ? {
              'agent.md': previewAgent.files.agentFile,
              'guidelines.md': previewAgent.files.projectGuidelines,
              'constraints.md': previewAgent.files.constraintsFile,
              'SKILL.md': previewAgent.files.skillFile
          } : undefined)}
          metadata={previewAgent || undefined}
          onUpdateMetadata={(metadata) => previewAgent && handleUpdateMetadata(previewAgent, metadata)}
          onCopy={() => {
              const text = previewAgent?.prompt || (previewAgent?.files ? Object.values(previewAgent.files).join('\n\n---\n\n') : '');
              navigator.clipboard.writeText(text);
              setSuccessMessage('Copied to clipboard!');
          }}
          onExport={() => {
              if (previewAgent?.prompt) handleExportPrompt(previewAgent.prompt, previewAgent.name);
              else if (previewAgent?.files) handleExportLegacyZip(previewAgent);
          }}
          onDelete={() => setIsDeleteConfirmOpen(true)}
      />

      <Modal isOpen={isClearAllConfirmOpen} onClose={() => setIsClearAllConfirmOpen(false)} title="Confirm Clear All">
          <div className="space-y-4">
              <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">Are you sure you want to delete ALL saved agents? This action cannot be undone.</p>
              <div className="flex justify-end gap-3 pt-4">
                  <button onClick={() => setIsClearAllConfirmOpen(false)} className="px-5 py-2.5 border border-slate-200 dark:border-slate-800 rounded-xl font-semibold text-xs cursor-pointer">Cancel</button>
                  <button onClick={handleClearAll} className="px-5 py-2.5 bg-rose-600 hover:bg-rose-500 text-white font-semibold text-xs rounded-xl cursor-pointer">Clear All</button>
              </div>
          </div>
      </Modal>

      <Modal isOpen={isDeleteConfirmOpen} onClose={() => setIsDeleteConfirmOpen(false)} title="Confirm Deletion">
          <div className="space-y-4">
              <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">Are you sure you want to delete <strong>{previewAgent?.name}</strong>? This action cannot be undone.</p>
              <div className="flex justify-end gap-3 pt-4">
                  <button onClick={() => setIsDeleteConfirmOpen(false)} className="px-5 py-2.5 border border-slate-200 dark:border-slate-800 rounded-xl font-semibold text-xs cursor-pointer">Cancel</button>
                  <button onClick={handleDelete} className="px-5 py-2.5 bg-rose-600 hover:bg-rose-500 text-white font-semibold text-xs rounded-xl cursor-pointer">Delete</button>
              </div>
          </div>
      </Modal>

      <Modal isOpen={!!pendingDraft} onClose={() => setPendingDraft(null)} title="Unsaved Draft Found">
          <div className="space-y-4">
              <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                  An unsaved agent architect draft was found. Would you like to restore it?
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
                      className="px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs rounded-xl cursor-pointer shadow-sm transition"
                  >
                      Restore Draft
                  </button>
              </div>
          </div>
      </Modal>

      <Modal isOpen={!!modalState} onClose={() => setModalState(null)} title={modalState?.mode === 'edit' ? 'Edit Agent' : 'Save Agent Configuration'}>
          {modalState && <div className="space-y-5 animate-fade-in">
              <div>
                  <label htmlFor="modalAgentName" className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">Name</label>
                  <input type="text" id="modalAgentName" value={modalInput.name} onChange={e => setModalInput({...modalInput, name: e.target.value})} className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500/40" placeholder="e.g., My Financial Advisor Agent" />
              </div>
              
              {modalState.mode === 'edit' && (
                  <div className="max-h-96 overflow-y-auto space-y-4 pr-1 custom-scrollbar">
                    <div>
                        <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">Agent Prompt</label>
                        <textarea rows={15} value={modalInput.prompt} onChange={e => setModalInput(prev => ({...prev, prompt: e.target.value}))} className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl font-mono text-xs focus:ring-2 focus:ring-blue-500/40 outline-none custom-scrollbar" />
                    </div>
                  </div>
              )}

              <div className="flex justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-800/80">
                  <button onClick={() => setModalState(null)} className="px-5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 font-semibold text-xs cursor-pointer">Cancel</button>
                  <button onClick={handleModalSave} className="px-5 py-2.5 rounded-xl bg-blue-600 text-white hover:bg-blue-700 font-semibold text-xs cursor-pointer">{modalState.mode === 'edit' ? 'Update' : 'Save'}</button>
              </div>
          </div>}
      </Modal>

    </div>
  );
};

export default AgentArchitect;

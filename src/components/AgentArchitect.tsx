import React, { useState, useCallback, useEffect, useRef } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { AgentConfig, GeneratedPrompt, SavedAgent } from '../types';
import { generateAgentPersona } from '../services/ai/agentPersonaService';
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

const AgentArchitect: React.FC = () => {
  const [agentConfig, setAgentConfig] = useState<AgentConfig>({ role: '', scope: '', goals: '', constraints: '' });
  const [generatedPrompt, setGeneratedPrompt] = useState<GeneratedPrompt | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [loadedAgentName, setLoadedAgentName] = useState<string | undefined>(undefined);
  const [loadingMessage, setLoadingMessage] = useState('');
  const loadingIntervalRef = useRef<number | null>(null);

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
    loadSavedAgents();
    const loadDraft = async () => {
        if (isCheckingDraft.current) return;
        isCheckingDraft.current = true;

        const draft = await db.getDraft(1);
        if (draft?.config && Object.values(draft.config).some(v => v)) {
            if (window.confirm("An unsaved draft was found. Do you want to load it?")) {
                setAgentConfig(draft.config);
                setDraftStatus('loaded');
            } else {
                await db.clearDraft(1);
                setDraftStatus('none');
            }
        } else {
            setDraftStatus('none');
        }
    };
    loadDraft();
  }, [loadSavedAgents]);

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
      const result = await generateAgentPersona(agentConfig);
      setGeneratedPrompt(result);
      await db.clearDraft(1);
    } catch (e) {
      setError('Failed to generate agent persona. Please check your API key and try again.');
    } finally {
      setIsLoading(false);
      if(loadingIntervalRef.current) {
        clearInterval(loadingIntervalRef.current);
      }
      setLoadingMessage('');
    }
  }, [agentConfig]);

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
    if (window.confirm('Are you sure you want to delete ALL saved agents? This action cannot be undone.')) {
        try {
            await db.clearAllAgents();
            setSavedAgents([]);
            setSuccessMessage('All agents have been deleted.');
        } catch (err) {
            setError('Failed to clear all agents.');
            console.error(err);
        }
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
    <div className="max-w-4xl mx-auto">
      <Toast message={successMessage} onClose={() => setSuccessMessage('')} />
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-6 md:p-8">
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
        <div className="mt-8 bg-red-100 dark:bg-red-900/50 border border-red-400 dark:border-red-700 text-red-700 dark:text-red-200 px-4 py-3 rounded-lg relative" role="alert">
          <strong className="font-bold">Error: </strong>
          <span className="block sm:inline">{error}</span>
        </div>
      )}

      {isLoading && <LoadingSpinner message={loadingMessage} />}

      {generatedPrompt && !isLoading && (
        <div className="mt-8 space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
             <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg overflow-hidden border border-gray-200 dark:border-gray-700">
                <div className="flex items-center gap-2 px-6 py-3 bg-gray-50 dark:bg-gray-900/50 border-b border-gray-200 dark:border-gray-700">
                    <span className="material-icons text-blue-500 text-lg">signal_cellular_alt</span>
                    <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">Signal Analysis</h4>
                </div>
                <div className="p-6 prose prose-sm dark:prose-invert max-w-none text-gray-600 dark:text-gray-400">
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>{generatedPrompt.signal}</ReactMarkdown>
                </div>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg overflow-hidden border border-gray-200 dark:border-gray-700">
                <div className="flex justify-between items-center p-4 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50">
                    <div className="flex items-center gap-2">
                        <span className="material-icons text-lg text-gray-600 dark:text-gray-400">psychology</span>
                        <h3 className="text-xl font-semibold">Generated Agent Prompt</h3>
                    </div>
                    <div className="flex items-center space-x-2">
                        <button onClick={() => { navigator.clipboard.writeText(generatedPrompt.prompt); setSuccessMessage('Prompt copied!'); }} className="flex items-center px-3 py-1.5 border rounded-md text-sm hover:bg-white dark:hover:bg-gray-700 transition-colors">
                            <span className="material-icons text-base mr-1.5">content_copy</span>Copy
                        </button>
                        <button onClick={() => handleExportPrompt(generatedPrompt.prompt, loadedAgentName)} className="flex items-center px-3 py-1.5 border rounded-md text-sm hover:bg-white dark:hover:bg-gray-700 transition-colors">
                            <span className="material-icons text-base mr-1.5">download</span>Export
                        </button>
                        <button onClick={handleOpenSaveModal} className="flex items-center px-3 py-1.5 border rounded-md text-sm bg-blue-500 text-white hover:bg-blue-600 transition-all shadow-lg shadow-blue-500/20">
                            <span className="material-icons text-base mr-1.5">save</span>Save
                        </button>
                    </div>
                </div>
                <div className="p-6 md:p-10">
                    <blockquote className="border-l-4 border-blue-500 pl-4 py-2 italic text-lg text-gray-800 dark:text-gray-200 bg-gray-50 dark:bg-gray-900/40 rounded-r-lg">
                        <ReactMarkdown remarkPlugins={[remarkGfm]}>{generatedPrompt.prompt}</ReactMarkdown>
                    </blockquote>
                </div>
            </div>
        </div>
      )}
      
      {savedAgents.length > 0 && (
        <div className="mt-12">
            <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold">Saved Agents</h2>
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

            <div className="mb-6 space-y-4">
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

            <div className="mb-4">
                <div className="relative">
                    <span className="material-icons absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">search</span>
                    <input
                        type="text"
                        placeholder="Search saved agents..."
                        value={searchTerm}
                        onChange={(e) => setSearchText(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                    />
                </div>
            </div>
            <div className="space-y-4">
                {savedAgents
                    .filter(a => !a.isArchived && !a.isStarred && !a.isPinned && a.name.toLowerCase().includes(searchTerm.toLowerCase()))
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
                {(savedAgents.filter(a => !a.isArchived && !a.isStarred && !a.isPinned && a.name.toLowerCase().includes(searchTerm.toLowerCase())).length === 0 && searchTerm) && (
                    <div className="py-8 text-center text-gray-400 dark:text-gray-500">
                        <span className="material-icons text-4xl mb-2">search_off</span>
                        <p>No agents match your search</p>
                    </div>
                )}
            </div>
        </div>
      )}

      <Modal isOpen={isTemplateModalOpen} onClose={() => setIsTemplateModalOpen(false)} title="Load an Agent Template">
          <div className="space-y-3 max-h-[60vh] overflow-y-auto">
              {AGENT_TEMPLATES.map((template) => (
                  <button 
                      key={template.name} 
                      onClick={() => handleLoadTemplate(template)}
                      className="w-full text-left p-4 rounded-lg bg-gray-50 dark:bg-gray-700 hover:bg-blue-100 dark:hover:bg-blue-900/50 border dark:border-gray-600 transition"
                  >
                      <h4 className="font-semibold text-gray-800 dark:text-gray-200">{template.name}</h4>
                      <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">{template.role}</p>
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

      <Modal isOpen={isDeleteConfirmOpen} onClose={() => setIsDeleteConfirmOpen(false)} title="Confirm Deletion">
          <div className="space-y-4">
              <p className="text-gray-600 dark:text-gray-400">Are you sure you want to delete <strong>{previewAgent?.name}</strong>? This action cannot be undone.</p>
              <div className="flex justify-end space-x-2">
                  <button onClick={() => setIsDeleteConfirmOpen(false)} className="px-4 py-2 border dark:border-gray-600 rounded-lg">Cancel</button>
                  <button onClick={handleDelete} className="px-4 py-2 bg-red-600 text-white rounded-lg">Delete</button>
              </div>
          </div>
      </Modal>

      <Modal isOpen={!!modalState} onClose={() => setModalState(null)} title={modalState?.mode === 'edit' ? 'Edit Agent' : 'Save Agent Configuration'}>
          {modalState && <div className="space-y-4">
              <label htmlFor="modalAgentName" className="block text-sm font-medium">Name</label>
              <input type="text" id="modalAgentName" value={modalInput.name} onChange={e => setModalInput({...modalInput, name: e.target.value})} className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md transition focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent hover:ring-2 hover:ring-blue-500/20" placeholder="e.g., My Financial Advisor Agent" />
              
              {modalState.mode === 'edit' && (
                  <div className="max-h-96 overflow-y-auto space-y-4 pr-2">
                    <label className="block text-sm font-medium pt-2">Agent Prompt</label>
                    <textarea rows={15} value={modalInput.prompt} onChange={e => setModalInput(prev => ({...prev, prompt: e.target.value}))} className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md font-mono text-sm transition focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent hover:ring-2 hover:ring-blue-500/20" />
                  </div>
              )}

              <div className="flex justify-end space-x-2 pt-2">
                  <button onClick={() => setModalState(null)} className="px-4 py-2 rounded-md border dark:border-gray-600">Cancel</button>
                  <button onClick={handleModalSave} className="px-4 py-2 rounded-md bg-blue-600 text-white hover:bg-blue-700">{modalState.mode === 'edit' ? 'Update' : 'Save'}</button>
              </div>
          </div>}
      </Modal>

    </div>
  );
};

export default AgentArchitect;

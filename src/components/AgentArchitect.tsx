
import React, { useState, useCallback, useEffect, useRef } from 'react';
import { AgentConfig, GeneratedFiles, SavedAgent } from '../types';
import { generateAgentFiles } from '../services/ai/agentFilesService';
import * as db from '../services/dbService';
import JSZip from 'jszip';
import { sanitizeFilename } from '../utils/security';
import AgentForm from './AgentForm';
import GeneratedFilesDisplay from './GeneratedFilesDisplay';
import LoadingSpinner from './LoadingSpinner';
import Modal from './Modal';
import Toast from './Toast';

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
  const [generatedFiles, setGeneratedFiles] = useState<GeneratedFiles | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [loadedAgentName, setLoadedAgentName] = useState<string | undefined>(undefined);
  const [loadingMessage, setLoadingMessage] = useState('');
  const loadingIntervalRef = useRef<number | null>(null);

  const [savedAgents, setSavedAgents] = useState<SavedAgent[]>([]);
  const [successMessage, setSuccessMessage] = useState('');
  const [draftStatus, setDraftStatus] = useState<'unloaded' | 'loaded' | 'none'>('unloaded');
  const [isTemplateModalOpen, setIsTemplateModalOpen] = useState(false);

  const [modalState, setModalState] = useState<{ mode: 'save' | 'edit'; agent?: SavedAgent } | null>(null);
  const [modalInput, setModalInput] = useState<{ name: string; files: GeneratedFiles | null }>({ name: '', files: null });

  const loadSavedAgents = useCallback(async () => {
    const agents = await db.getAllAgents();
    setSavedAgents(agents);
  }, []);

  useEffect(() => {
    loadSavedAgents();
    const loadDraft = async () => {
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
        // FIX: Add type check to ensure value is a string before accessing length.
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
    setGeneratedFiles(null);
    
    const messages = ['Generating agent persona...', 'Defining project guidelines...', 'Setting constraints & guardrails...', 'Architecting SKILL.md...'];
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
      const files = await generateAgentFiles(agentConfig);
      setGeneratedFiles(files);
      await db.clearDraft(1);
    } catch (e) {
      setError('Failed to generate agent files. Please check your API key and try again.');
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
    setGeneratedFiles(null);
    setError(null);
    setIsLoading(false);
    setLoadedAgentName(undefined);
    db.clearDraft(1);
  };
  
  const handleOpenSaveModal = () => {
    if (!generatedFiles) return;
    setModalInput({ name: loadedAgentName || '', files: generatedFiles });
    setModalState({ mode: 'save' });
  };

  const handleOpenEditModal = (agent: SavedAgent) => {
    setModalInput({ name: agent.name, files: agent.files });
    setModalState({ mode: 'edit', agent });
  };
  
  const handleModalSave = async () => {
    if (!modalState || !modalInput.name.trim()) {
        // Here you could set an error state for the modal
        return;
    }

    if (modalState.mode === 'save' && generatedFiles) {
        const newAgent: SavedAgent = {
            name: modalInput.name.trim(),
            config: agentConfig,
            files: generatedFiles,
            createdAt: new Date().toISOString(),
        };
        await db.addAgent(newAgent);
        setSuccessMessage('Agent saved successfully!');
    } else if (modalState.mode === 'edit' && modalState.agent && modalInput.files) {
        const updatedAgent: SavedAgent = {
            ...modalState.agent,
            name: modalInput.name.trim(),
            files: modalInput.files,
        };
        await db.updateAgent(updatedAgent);
        setSuccessMessage('Agent updated successfully!');
    }
    
    loadSavedAgents();
    setModalState(null);
  };

  const handleDelete = async (id: number) => {
    if (window.confirm('Are you sure you want to delete this agent?')) {
        try {
            await db.deleteAgent(id);
            setSavedAgents(prevAgents => prevAgents.filter(agent => agent.id !== id));
            setSuccessMessage('Agent deleted successfully!');
        } catch (err) {
            setError('Failed to delete agent.');
            console.error(err);
        }
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

  const handleExportAll = async () => {
    if (savedAgents.length === 0) return;

    const zip = new JSZip();
    savedAgents.forEach(agent => {
        const folderName = sanitizeFilename(agent.name);
        const folder = zip.folder(folderName);
        if (folder) {
            folder.file('agent.md', agent.files.agentFile);
            folder.file('guidelines.md', agent.files.projectGuidelines);
            folder.file('constraints.md', agent.files.constraintsFile);
            folder.file('SKILL.md', agent.files.skillFile);
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
      setAgentConfig(agent.config);
      setGeneratedFiles(agent.files);
      setLoadedAgentName(agent.name);
      window.scrollTo({ top: 0, behavior: 'smooth' });
  }

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

      {generatedFiles && !isLoading && (
        <div className="mt-8">
          <GeneratedFilesDisplay files={generatedFiles} onSave={handleOpenSaveModal} agentName={loadedAgentName} />
        </div>
      )}
      
      {savedAgents.length > 0 && (
        <div className="mt-12">
            <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold text-center">Saved Agents</h2>
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
                {savedAgents.map(agent => (
                    <div key={agent.id} className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow-md flex justify-between items-center">
                        <div>
                            <p className="font-semibold">{agent.name}</p>
                            <p className="text-sm text-gray-500 dark:text-gray-400">Saved on {new Date(agent.createdAt).toLocaleDateString()}</p>
                        </div>
                        <div className="flex items-center space-x-2">
                            <button onClick={() => handleLoadSavedAgent(agent)} className="p-2 text-gray-600 dark:text-gray-300 hover:text-blue-500 transition-colors" title="Load"><span className="material-icons">visibility</span></button>
                            <button onClick={() => handleOpenEditModal(agent)} className="p-2 text-gray-600 dark:text-gray-300 hover:text-green-500 transition-colors" title="Edit"><span className="material-icons">edit</span></button>
                            <button onClick={() => handleDelete(agent.id!)} className="p-2 text-gray-600 dark:text-gray-300 hover:text-red-500 transition-colors" title="Delete"><span className="material-icons">delete</span></button>
                        </div>
                    </div>
                ))}
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

      <Modal isOpen={!!modalState} onClose={() => setModalState(null)} title={modalState?.mode === 'edit' ? 'Edit Agent' : 'Save Agent Configuration'}>
          {modalState && <div className="space-y-4">
              <label htmlFor="modalAgentName" className="block text-sm font-medium">Name</label>
              <input type="text" id="modalAgentName" value={modalInput.name} onChange={e => setModalInput({...modalInput, name: e.target.value})} className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md transition focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent hover:ring-2 hover:ring-blue-500/20" placeholder="e.g., My Financial Advisor Agent" />
              
              {modalState.mode === 'edit' && modalInput.files && (
                  <div className="max-h-96 overflow-y-auto space-y-4 pr-2">
                    <label className="block text-sm font-medium pt-2">Agent File</label>
                    <textarea rows={5} value={modalInput.files.agentFile} onChange={e => setModalInput(prev => ({...prev, files: {...prev.files!, agentFile: e.target.value}}))} className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md font-mono text-sm transition focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent hover:ring-2 hover:ring-blue-500/20" />
                    <label className="block text-sm font-medium">Guidelines</label>
                    <textarea rows={5} value={modalInput.files.projectGuidelines} onChange={e => setModalInput(prev => ({...prev, files: {...prev.files!, projectGuidelines: e.target.value}}))} className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md font-mono text-sm transition focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent hover:ring-2 hover:ring-blue-500/20" />
                    <label className="block text-sm font-medium">Constraints</label>
                    <textarea rows={5} value={modalInput.files.constraintsFile} onChange={e => setModalInput(prev => ({...prev, files: {...prev.files!, constraintsFile: e.target.value}}))} className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md font-mono text-sm transition focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent hover:ring-2 hover:ring-blue-500/20" />
                    <label className="block text-sm font-medium">SKILL.md</label>
                    <textarea rows={5} value={modalInput.files.skillFile} onChange={e => setModalInput(prev => ({...prev, files: {...prev.files!, skillFile: e.target.value}}))} className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md font-mono text-sm transition focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent hover:ring-2 hover:ring-blue-500/20" />
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


import React, { useState, useCallback, useEffect, useRef } from 'react';
import { ProjectConfig, GeneratedProjectFiles, SavedProject } from '../types';
import { generateProjectFiles } from '../services/aiService';
import * as db from '../services/dbService';
import JSZip from 'jszip';
import ProjectForm from './ProjectForm';
import GeneratedProjectDisplay from './GeneratedProjectDisplay';
import LoadingSpinner from './LoadingSpinner';
import Modal from './Modal';
import Toast from './Toast';

const ProjectArchitect: React.FC = () => {
  const [projectConfig, setProjectConfig] = useState<ProjectConfig>({
    title: '', idea: '', vision: '', goal: '', rules: '',
    constraints: '', guidelines: '', roles: '', standards: '', consistency: ''
  });
  const [generatedFiles, setGeneratedFiles] = useState<GeneratedProjectFiles | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [loadedProjectName, setLoadedProjectName] = useState<string | undefined>(undefined);
  const [loadingMessage, setLoadingMessage] = useState('');
  const loadingIntervalRef = useRef<number | null>(null);

  const [savedProjects, setSavedProjects] = useState<SavedProject[]>([]);
  const [successMessage, setSuccessMessage] = useState('');
  const [draftStatus, setDraftStatus] = useState<'unloaded' | 'loaded' | 'none'>('unloaded');

  const [modalState, setModalState] = useState<{ mode: 'save' | 'edit'; project?: SavedProject } | null>(null);
  const [modalInput, setModalInput] = useState<{ name: string; files: GeneratedProjectFiles | null }>({ name: '', files: null });

  const loadSavedProjects = useCallback(async () => {
    const projects = await db.getAllProjects();
    setSavedProjects(projects);
  }, []);

  useEffect(() => {
    loadSavedProjects();
    const loadDraft = async () => {
      const draft = await db.getProjectDraft(1);
      if (draft?.config && Object.values(draft.config).some(v => v)) {
        if (window.confirm("An unsaved project draft was found. Do you want to load it?")) {
          setProjectConfig(draft.config);
          setDraftStatus('loaded');
        } else {
          await db.clearProjectDraft(1);
          setDraftStatus('none');
        }
      } else {
        setDraftStatus('none');
      }
    };
    loadDraft();
  }, [loadSavedProjects]);

  useEffect(() => {
    if (draftStatus === 'unloaded') return;
    const handler = setTimeout(() => {
      if (Object.values(projectConfig).some(value => typeof value === 'string' && value.length > 0)) {
        db.saveProjectDraft({ id: 1, config: projectConfig });
      }
    }, 1500);
    return () => clearTimeout(handler);
  }, [projectConfig, draftStatus]);

  const handleGenerate = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    setGeneratedFiles(null);
    
    const messages = ['Architecting project vision...', 'Defining standards & roles...', 'Establishing rules & guardrails...'];
    let messageIndex = 0;
    setLoadingMessage(messages[0]);
    loadingIntervalRef.current = window.setInterval(() => {
      messageIndex = (messageIndex + 1) % messages.length;
      setLoadingMessage(messages[messageIndex]);
    }, 2000);

    try {
      if (!projectConfig.title || !projectConfig.goal) {
        setError("Project Title and Goal are required fields.");
        return;
      }
      const files = await generateProjectFiles(projectConfig);
      setGeneratedFiles(files);
      await db.clearProjectDraft(1);
    } catch (e) {
      setError('Failed to generate project files. Please check your API key and try again.');
    } finally {
      setIsLoading(false);
      if(loadingIntervalRef.current) {
        clearInterval(loadingIntervalRef.current);
      }
      setLoadingMessage('');
    }
  }, [projectConfig]);

  const handleReset = () => {
    setProjectConfig({
      title: '', idea: '', vision: '', goal: '', rules: '',
      constraints: '', guidelines: '', roles: '', standards: '', consistency: ''
    });
    setGeneratedFiles(null);
    setError(null);
    setIsLoading(false);
    setLoadedProjectName(undefined);
    db.clearProjectDraft(1);
  };
  
  const handleOpenSaveModal = () => {
    if (!generatedFiles) return;
    setModalInput({ name: loadedProjectName || '', files: generatedFiles });
    setModalState({ mode: 'save' });
  };

  const handleOpenEditModal = (project: SavedProject) => {
    setModalInput({ name: project.name, files: project.files });
    setModalState({ mode: 'edit', project });
  };
  
  const handleModalSave = async () => {
    if (!modalState || !modalInput.name.trim() || !modalInput.files) return;

    if (modalState.mode === 'save') {
      const newProject: SavedProject = {
        name: modalInput.name.trim(),
        config: projectConfig,
        files: modalInput.files,
        createdAt: new Date().toISOString(),
      };
      await db.addProject(newProject);
      setSuccessMessage('Project saved successfully!');
    } else if (modalState.mode === 'edit' && modalState.project) {
      const updatedProject: SavedProject = {
        ...modalState.project,
        name: modalInput.name.trim(),
        files: modalInput.files,
      };
      await db.updateProject(updatedProject);
      setSuccessMessage('Project updated successfully!');
    }
    
    loadSavedProjects();
    setModalState(null);
  };

  const handleDelete = async (id: number) => {
    if (window.confirm('Are you sure you want to delete this project?')) {
      try {
        await db.deleteProject(id);
        setSavedProjects(prev => prev.filter(p => p.id !== id));
        setSuccessMessage('Project deleted successfully!');
      } catch (err) {
        setError('Failed to delete project.');
      }
    }
  };

  const handleClearAll = async () => {
    if (window.confirm('Are you sure you want to delete ALL saved projects? This action cannot be undone.')) {
      try {
        await db.clearAllProjects();
        setSavedProjects([]);
        setSuccessMessage('All projects have been deleted.');
      } catch (err) {
        setError('Failed to clear all projects.');
      }
    }
  };

  const handleExportAll = async () => {
    if (savedProjects.length === 0) return;
    
    const zip = new JSZip();
    savedProjects.forEach(project => {
      const folderName = project.name.replace(/[^a-z0-9\s-]/gi, '').replace(/\s+/g, '-').toLowerCase();
      const folder = zip.folder(folderName);
      if (folder) {
        folder.file('overview.md', project.files.overviewFile);
        folder.file('standards.md', project.files.standardsFile);
        folder.file('rules.md', project.files.rulesFile);
      }
    });

    const content = await zip.generateAsync({ type: 'blob' });
    const url = URL.createObjectURL(content);
    const link = document.createElement('a');
    link.href = url;
    link.download = `noosphere-projects-${new Date().toISOString().split('T')[0]}.zip`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    setSuccessMessage('All projects exported as ZIP!');
  };

  const handleLoadSavedProject = (project: SavedProject) => {
    setProjectConfig(project.config);
    setGeneratedFiles(project.files);
    setLoadedProjectName(project.name);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="max-w-4xl mx-auto">
      <Toast message={successMessage} onClose={() => setSuccessMessage('')} />
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-6 md:p-8">
        <ProjectForm 
          projectConfig={projectConfig} 
          setProjectConfig={setProjectConfig} 
          onGenerate={handleGenerate}
          onReset={handleReset}
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
          <GeneratedProjectDisplay files={generatedFiles} onSave={handleOpenSaveModal} projectName={loadedProjectName} />
        </div>
      )}
      
      {savedProjects.length > 0 && (
        <div className="mt-12">
            <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold text-center">Saved Projects</h2>
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
                {savedProjects.map(project => (
                    <div key={project.id} className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow-md flex justify-between items-center">
                        <div>
                            <p className="font-semibold">{project.name}</p>
                            <p className="text-sm text-gray-500 dark:text-gray-400">Saved on {new Date(project.createdAt).toLocaleDateString()}</p>
                        </div>
                        <div className="flex items-center space-x-2">
                            <button onClick={() => handleLoadSavedProject(project)} className="p-2 text-gray-600 dark:text-gray-300 hover:text-blue-500 transition-colors" title="Load"><span className="material-icons">visibility</span></button>
                            <button onClick={() => handleOpenEditModal(project)} className="p-2 text-gray-600 dark:text-gray-300 hover:text-green-500 transition-colors" title="Edit"><span className="material-icons">edit</span></button>
                            <button onClick={() => handleDelete(project.id!)} className="p-2 text-gray-600 dark:text-gray-300 hover:text-red-500 transition-colors" title="Delete"><span className="material-icons">delete</span></button>
                        </div>
                    </div>
                ))}
            </div>
        </div>
      )}

      <Modal isOpen={!!modalState} onClose={() => setModalState(null)} title={modalState?.mode === 'edit' ? 'Edit Project' : 'Save Project Blueprint'}>
          {modalState && <div className="space-y-4">
              <label htmlFor="modalProjectName" className="block text-sm font-medium">Name</label>
              <input type="text" id="modalProjectName" value={modalInput.name} onChange={e => setModalInput({...modalInput, name: e.target.value})} className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md transition focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent hover:ring-2 hover:ring-blue-500/20" placeholder="e.g., Q3 Marketing Campaign AI Suite" />
              
              {modalState.mode === 'edit' && modalInput.files && (
                  <div className="max-h-64 overflow-y-auto space-y-4 pr-2">
                    <label className="block text-sm font-medium pt-2">Project Overview</label>
                    <textarea rows={5} value={modalInput.files.overviewFile} onChange={e => setModalInput(prev => ({...prev, files: {...prev.files!, overviewFile: e.target.value}}))} className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md font-mono text-sm transition focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent hover:ring-2 hover:ring-blue-500/20" />
                    <label className="block text-sm font-medium">Development Standards</label>
                    <textarea rows={5} value={modalInput.files.standardsFile} onChange={e => setModalInput(prev => ({...prev, files: {...prev.files!, standardsFile: e.target.value}}))} className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md font-mono text-sm transition focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent hover:ring-2 hover:ring-blue-500/20" />
                    <label className="block text-sm font-medium">Rules & Guardrails</label>
                    <textarea rows={5} value={modalInput.files.rulesFile} onChange={e => setModalInput(prev => ({...prev, files: {...prev.files!, rulesFile: e.target.value}}))} className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md font-mono text-sm transition focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent hover:ring-2 hover:ring-blue-500/20" />
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

export default ProjectArchitect;

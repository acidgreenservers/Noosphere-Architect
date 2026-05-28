
import React, { useState, useCallback, useEffect, useRef } from 'react';
import { ProjectConfig, GeneratedProjectFiles, SavedProject } from '../types';
import { generateProjectFiles } from '../services/ai/projectFilesService';
import * as db from '../services/dbService';
import JSZip from 'jszip';
import { sanitizeFilename } from '../utils/security';
import ProjectForm from './ProjectForm';
import GeneratedProjectDisplay from './GeneratedProjectDisplay';
import LoadingSpinner from './LoadingSpinner';
import Modal from './Modal';
import PreviewModal from './PreviewModal';
import LibraryItem from './LibraryItem';
import Toast from './Toast';
import { StarredPinnedBar } from './StarredPinnedBar';
import { UnifiedItem } from '../types';

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
  const [searchTerm, setSearchText] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [draftStatus, setDraftStatus] = useState<'unloaded' | 'loaded' | 'none'>('unloaded');
    const [pendingDraft, setPendingDraft] = useState<ProjectConfig | null>(null);
  const isCheckingDraft = useRef(false);

  const [modalState, setModalState] = useState<{ mode: 'save' | 'edit'; project?: SavedProject } | null>(null);
  const [modalInput, setModalInput] = useState<{ name: string; files: GeneratedProjectFiles | null }>({ name: '', files: null });
  const [previewProject, setPreviewProject] = useState<SavedProject | null>(null);
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    starredSection: true,
    pinnedSection: true,
    allItemsSection: true
  });

  const loadSavedProjects = useCallback(async () => {
    const projects = await db.getAllProjects();
    setSavedProjects(projects);
  }, []);

  useEffect(() => {
    loadSavedProjects();
    const loadDraft = async () => {
      if (isCheckingDraft.current) return;
      isCheckingDraft.current = true;

      const draft = await db.getProjectDraft(1);
      if (draft?.config && Object.values(draft.config).some(v => v)) {
                setPendingDraft(draft.config);
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
        isStarred: false,
        isPinned: false,
        isArchived: false,
        category: ''
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

  const handleExportProject = async (name: string, files: GeneratedProjectFiles) => {
    const zip = new JSZip();
    zip.file('overview.md', files.overviewFile);
    zip.file('standards.md', files.standardsFile);
    zip.file('rules.md', files.rulesFile);

    const content = await zip.generateAsync({ type: 'blob' });
    const url = URL.createObjectURL(content);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${sanitizeFilename(name)}.zip`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    setSuccessMessage('Project exported as ZIP!');
  };

  const handleExportAll = async () => {
    if (savedProjects.length === 0) return;
    
    const zip = new JSZip();
    savedProjects.forEach(project => {
      const folderName = sanitizeFilename(project.name);
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

  const handleUpdateMetadata = async (project: SavedProject, metadata: any) => {
    const updated = { ...project, ...metadata };
    await db.updateProject(updated);
    setSavedProjects(prev => prev.map(p => p.id === project.id ? updated : p));
    if (previewProject?.id === project.id) setPreviewProject(updated);
  };

  const handleAcceptDraft = () => {
    if (!pendingDraft) return;
    setProjectConfig(pendingDraft);
    setDraftStatus('loaded');
    setPendingDraft(null);
  };

  const handleDeclineDraft = async () => {
    await db.clearProjectDraft(1);
    setDraftStatus('none');
    setPendingDraft(null);
  };

  const projectToUnified = (project: SavedProject): UnifiedItem => ({
    id: `project-${project.id}`,
    name: project.name,
    type: 'project',
    original: project,
    createdAt: project.createdAt,
    isStarred: project.isStarred || false,
    isPinned: project.isPinned || false,
    isArchived: project.isArchived || false,
    category: project.category || ''
  });

  const unifiedProjects = savedProjects.map(projectToUnified);

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

            <div className="mb-6 space-y-4">
                <StarredPinnedBar
                    type="starred"
                    items={unifiedProjects}
                    expanded={expandedSections.starredSection}
                    onToggleExpand={() => setExpandedSections(prev => ({ ...prev, starredSection: !prev.starredSection }))}
                    onToggleStar={(item) => handleUpdateMetadata(item.original, { isStarred: !item.original.isStarred })}
                    onTogglePin={(item) => handleUpdateMetadata(item.original, { isPinned: !item.original.isPinned })}
                    onToggleArchive={(item) => handleUpdateMetadata(item.original, { isArchived: true })}
                    onDelete={(item) => handleDelete(item.original.id!)}
                    onEdit={(item) => handleOpenEditModal(item.original)}
                    onSelect={(id) => handleLoadSavedProject(savedProjects.find(p => `project-${p.id}` === id)!)}
                    selectedIds={new Set()}
                />
                <StarredPinnedBar
                    type="pinned"
                    items={unifiedProjects}
                    expanded={expandedSections.pinnedSection}
                    onToggleExpand={() => setExpandedSections(prev => ({ ...prev, pinnedSection: !prev.pinnedSection }))}
                    onToggleStar={(item) => handleUpdateMetadata(item.original, { isStarred: !item.original.isStarred })}
                    onTogglePin={(item) => handleUpdateMetadata(item.original, { isPinned: !item.original.isPinned })}
                    onToggleArchive={(item) => handleUpdateMetadata(item.original, { isArchived: true })}
                    onDelete={(item) => handleDelete(item.original.id!)}
                    onEdit={(item) => handleOpenEditModal(item.original)}
                    onSelect={(id) => handleLoadSavedProject(savedProjects.find(p => `project-${p.id}` === id)!)}
                    selectedIds={new Set()}
                />
            </div>

            <div className="mb-4">
                <div className="relative">
                    <span className="material-icons absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">search</span>
                    <input
                        type="text"
                        placeholder="Search saved projects..."
                        value={searchTerm}
                        onChange={(e) => setSearchText(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                    />
                </div>
            </div>
            <div className="space-y-4">
                {savedProjects
                    .filter(p => !p.isArchived && !p.isStarred && !p.isPinned && p.name.toLowerCase().includes(searchTerm.toLowerCase()))
                    .map(project => (
                        <LibraryItem
                            key={project.id}
                            name={project.name}
                            createdAt={project.createdAt}
                            metadata={project}
                            icon="architecture"
                            onPreview={() => setPreviewProject(project)}
                            onEdit={() => handleOpenEditModal(project)}
                            onDelete={() => handleDelete(project.id!)}
                            onToggleStar={() => handleUpdateMetadata(project, { isStarred: !project.isStarred })}
                            onTogglePin={() => handleUpdateMetadata(project, { isPinned: !project.isPinned })}
                            onToggleArchive={() => handleUpdateMetadata(project, { isArchived: true })}
                            onClick={() => handleLoadSavedProject(project)}
                        />
                    ))}
                {(savedProjects.filter(p => !p.isArchived && !p.isStarred && !p.isPinned && p.name.toLowerCase().includes(searchTerm.toLowerCase())).length === 0 && searchTerm) && (
                    <div className="py-8 text-center text-gray-400 dark:text-gray-500">
                        <span className="material-icons text-4xl mb-2">search_off</span>
                        <p>No projects match your search</p>
                    </div>
                )}
            </div>
        </div>
      )}

      <Modal isOpen={!!pendingDraft} onClose={() => setPendingDraft(null)} title="Unsaved Draft Found">
        <div className="space-y-4">
            <p className="text-gray-600 dark:text-gray-400">
                An unsaved project draft was found. Would you like to restore it?
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
        isOpen={!!previewProject}
        onClose={() => setPreviewProject(null)}
        title={`Preview: ${previewProject?.name}`}
        content={previewProject ? {
            'overview.md': previewProject.files.overviewFile,
            'standards.md': previewProject.files.standardsFile,
            'rules.md': previewProject.files.rulesFile
        } : undefined}
        metadata={previewProject || undefined}
        onUpdateMetadata={(metadata) => previewProject && handleUpdateMetadata(previewProject, metadata)}
        onCopy={() => {
            if (previewProject) {
                const allContent = Object.entries(previewProject.files).map(([name, content]) => `### ${name}\n\n${content}`).join('\n\n');
                navigator.clipboard.writeText(allContent);
                setSuccessMessage('All files copied to clipboard!');
            }
        }}
        onExport={() => {
            if (previewProject) {
                handleExportProject(previewProject.name, previewProject.files);
            }
        }}
        onDelete={() => {
            if (previewProject?.id) {
                handleDelete(previewProject.id);
                setPreviewProject(null);
            }
        }}
      />

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

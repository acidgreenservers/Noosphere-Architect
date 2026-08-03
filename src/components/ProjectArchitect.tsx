import React, { useState, useCallback, useEffect, useRef } from 'react';
import { ProjectConfig, GeneratedProjectFiles, SavedProject, GenerationStage, StageStatus } from '../types';
import { generateProjectFiles } from '../services/ai/projectFilesService';
import { AbortError } from '../services/ai/openRouter';
import * as db from '../services/dbService';
import JSZip from 'jszip';
import { sanitizeFilename } from '../utils/security';
import ProjectForm from './ProjectForm';
import GeneratedProjectDisplay from './GeneratedProjectDisplay';
import RoadmapArchitect from './RoadmapArchitect';
import AgentJobArchitect from './AgentJobArchitect';
import LoadingSpinner from './LoadingSpinner';
import Modal from './Modal';
import PreviewModal from './PreviewModal';
import LibraryItem from './LibraryItem';
import Toast from './Toast';
import { StarredPinnedBar } from './StarredPinnedBar';
import { UnifiedItem } from '../types';
import { getDeepSearchText } from '../utils/search';
import { useArchive } from '../context/ArchiveContext';

type Tab = 'architect' | 'roadmap' | 'agentJob';

interface ProjectArchitectProps {
  initialConfig?: ProjectConfig;
  onClearInitialConfig?: () => void;
  initialTab?: Tab;
}

const ProjectArchitect: React.FC<ProjectArchitectProps> = ({ initialConfig, onClearInitialConfig, initialTab }) => {
  const [activeTab, setActiveTab] = useState<Tab>(initialTab || 'architect');
  const [projectConfig, setProjectConfig] = useState<ProjectConfig>({
    title: '', idea: '', vision: '', goal: '',
    techStack: '', architecture: '', securityPosition: '', accessibilityPosition: '',
    guidingPrinciples: '', targetAudience: '', keyConstraints: '', successCriteria: '',
    rules: '', constraints: '', guidelines: '', roles: '', standards: '', consistency: ''
  });
  const [generatedFiles, setGeneratedFiles] = useState<GeneratedProjectFiles | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [loadedProjectName, setLoadedProjectName] = useState<string | undefined>(undefined);
  const [loadingMessage, setLoadingMessage] = useState('');
  const loadingIntervalRef = useRef<number | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  const [isDragging, setIsDragging] = useState(false);

  const [generationStages, setGenerationStages] = useState<GenerationStage[]>([
    { key: 'project', label: 'PROJECT.md', status: 'waiting' },
    { key: 'architecture', label: 'ARCHITECTURE.md', status: 'waiting' },
    { key: 'security', label: 'SECURITY.md', status: 'waiting' },
  ]);
  const [overallProgress, setOverallProgress] = useState(0);

  const { unifiedItems, updateItemMetadata, deleteItem: removeContextItem, loadArchive } = useArchive();
  const savedProjects = React.useMemo(() => unifiedItems.filter(i => i.type === 'project').map(i => i.original as SavedProject), [unifiedItems]);
  const [searchTerm, setSearchText] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [draftStatus, setDraftStatus] = useState<'unloaded' | 'loaded' | 'none'>('unloaded');
  const [pendingDraft, setPendingDraft] = useState<ProjectConfig | null>(null);
  const isCheckingDraft = useRef(false);

  const [modalState, setModalState] = useState<{ mode: 'save' | 'edit'; project?: SavedProject } | null>(null);
  const [modalInput, setModalInput] = useState<{ name: string; files: GeneratedProjectFiles | null }>({ name: '', files: null });
  const [previewProject, setPreviewProject] = useState<SavedProject | null>(null);
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
  const [isClearAllConfirmOpen, setIsClearAllConfirmOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<number | null>(null);
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
      setProjectConfig(prev => ({
        ...prev,
        ...initialConfig
      }));
      if (onClearInitialConfig) onClearInitialConfig();
      return;
    }


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
  }, [initialConfig, onClearInitialConfig]);

  useEffect(() => {
    if (draftStatus === 'unloaded') return;
    const handler = setTimeout(() => {
      if (Object.values(projectConfig).some(value => typeof value === 'string' && value.length > 0)) {
        db.saveProjectDraft({ id: 1, config: projectConfig });
      }
    }, 1500);
    return () => clearTimeout(handler);
  }, [projectConfig, draftStatus]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      readFile(file);
    }
  };

  const readFile = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const content = e.target?.result as string;
      setProjectConfig(prev => ({
        ...prev,
        fileContext: {
          name: file.name,
          content: content
        }
      }));
    };
    reader.onerror = () => {
      setError('Failed to read the file. Please try again.');
    };
    reader.readAsText(file);
  };

  const removeFile = () => {
    setProjectConfig(prev => {
      const newConfig = { ...prev };
      delete newConfig.fileContext;
      return newConfig;
    });
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      readFile(file);
    }
  };

  const handleGenerate = useCallback(async () => {
    abortControllerRef.current?.abort();
    const controller = new AbortController();
    abortControllerRef.current = controller;

    setIsLoading(true);
    setError(null);
    setGeneratedFiles(null);
    setGenerationStages([
      { key: 'project', label: 'PROJECT.md', status: 'active' },
      { key: 'architecture', label: 'ARCHITECTURE.md', status: 'waiting' },
      { key: 'security', label: 'SECURITY.md', status: 'waiting' },
    ]);
    setOverallProgress(5);
    
    const stageMessages: Record<number, string> = {
      0: 'Synthesizing project identity into PROJECT.md...',
      1: 'Mapping architecture into ARCHITECTURE.md...',
      2: 'Framing security posture into SECURITY.md...',
    };
    setLoadingMessage(stageMessages[0]);

    try {
      if (!projectConfig.title || !projectConfig.goal) {
        setError("Project Title and Goal are required fields.");
        return;
      }
      const files = await generateProjectFiles(projectConfig, controller.signal, (stageIndex: number) => {
        setGenerationStages(prev => prev.map((stage, i) => {
          if (i === stageIndex) return { ...stage, status: 'complete' as StageStatus };
          if (i === stageIndex + 1) return { ...stage, status: 'active' as StageStatus };
          return stage;
        }));
        const progress = 5 + (stageIndex + 1) * 31;
        setOverallProgress(Math.min(progress, 95));
        setLoadingMessage(stageMessages[stageIndex + 1] || 'Finalizing...');
      });
      if (!controller.signal.aborted) {
        setGeneratedFiles(files);
        await db.clearProjectDraft(1);
      }
    } catch (e: any) {
      if (e instanceof AbortError || e?.name === 'AbortError') return;
      setError('Failed to generate project files. Please check your API key and try again.');
    } finally {
      setGenerationStages(prev => prev.map(s => ({ ...s, status: 'complete' as StageStatus })));
      setOverallProgress(100);
      setIsLoading(false);
      if(loadingIntervalRef.current) {
        clearInterval(loadingIntervalRef.current);
      }
      setLoadingMessage('');
      abortControllerRef.current = null;
    }
  }, [projectConfig]);

  useEffect(() => {
    return () => {
      abortControllerRef.current?.abort();
    };
  }, []);

  const handleReset = () => {
    setProjectConfig({
      title: '', idea: '', vision: '', goal: '',
      techStack: '', architecture: '', securityPosition: '', accessibilityPosition: '',
      guidingPrinciples: '', targetAudience: '', keyConstraints: '', successCriteria: '',
      rules: '', constraints: '', guidelines: '', roles: '', standards: '', consistency: ''
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
    
    await loadArchive();
    setModalState(null);
  };

  const handleDelete = (id: number) => {
    setDeleteTarget(id);
    setIsDeleteConfirmOpen(true);
  };

  const confirmDelete = async () => {
    if (deleteTarget === null) return;
    try {
      const project = savedProjects.find(p => p.id === deleteTarget);
      if (!project) return;
      
      const unified: UnifiedItem = {
        id: `project-${project.id}`,
        name: project.name,
        type: 'project',
        original: project,
        createdAt: project.createdAt,
        isStarred: project.isStarred || false,
        isPinned: project.isPinned || false,
        isArchived: project.isArchived || false,
        category: project.category || ''
      };
      
      await removeContextItem(unified);
      setSuccessMessage('Project deleted successfully!');
      setIsDeleteConfirmOpen(false);
      setDeleteTarget(null);
      setPreviewProject(null);
    } catch (err) {
      setError('Failed to delete project.');
    }
  };

  const handleClearAll = async () => {
    try {
      await db.clearAllProjects();
      await loadArchive();
      setSuccessMessage('All projects have been deleted.');
      setIsClearAllConfirmOpen(false);
    } catch (err) {
      setError('Failed to clear all projects.');
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
    const unified: UnifiedItem = {
      id: `project-${project.id}`,
      name: project.name,
      type: 'project',
      original: project,
      createdAt: project.createdAt,
      isStarred: project.isStarred || false,
      isPinned: project.isPinned || false,
      isArchived: project.isArchived || false,
      category: project.category || ''
    };
    await updateItemMetadata(unified, metadata);
    if (previewProject?.id === project.id) setPreviewProject({ ...project, ...metadata });
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
    <div className="max-w-4xl mx-auto animate-fade-in">
      <Toast message={successMessage} onClose={() => setSuccessMessage('')} />

      <div className="flex justify-between items-center mb-10">
        <div>
          <h2 className="text-3xl font-extrabold text-slate-900 dark:text-slate-100">
            {activeTab === 'architect' ? 'Project Architect' : activeTab === 'agentJob' ? 'Agent Job Architect' : 'Roadmap Architect'}
          </h2>
          <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">
            {activeTab === 'architect'
              ? 'Establish a high-level vision, standards, and rules for your project.'
              : activeTab === 'agentJob'
              ? 'Author an employer handbook for an AI agent-employee — defining their role, authority, and operating boundaries.'
              : 'Transform raw vision text into deeply actionable, rigorously detailed roadmap task entries.'}
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="mb-10">
        <nav className="flex flex-wrap gap-2" aria-label="Project Tabs" role="tablist">
          <button
            role="tab"
            aria-selected={activeTab === 'architect'}
            onClick={() => setActiveTab('architect')}
            className={`whitespace-nowrap py-2.5 px-5 rounded-xl font-semibold text-xs tracking-wider uppercase transition-all duration-200 cursor-pointer ${activeTab === 'architect' ? 'bg-blue-600 text-white shadow-md shadow-blue-600/10' : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-900/50'}`}
          >
            Project Architect
          </button>
          <button
            role="tab"
            aria-selected={activeTab === 'agentJob'}
            onClick={() => setActiveTab('agentJob')}
            className={`whitespace-nowrap py-2.5 px-5 rounded-xl font-semibold text-xs tracking-wider uppercase transition-all duration-200 cursor-pointer ${activeTab === 'agentJob' ? 'bg-purple-600 text-white shadow-md shadow-purple-600/10' : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-900/50'}`}
          >
            Agent Job Architect
          </button>
          <button
            role="tab"
            aria-selected={activeTab === 'roadmap'}
            onClick={() => setActiveTab('roadmap')}
            className={`whitespace-nowrap py-2.5 px-5 rounded-xl font-semibold text-xs tracking-wider uppercase transition-all duration-200 cursor-pointer ${activeTab === 'roadmap' ? 'bg-amber-600 text-white shadow-md shadow-amber-600/10' : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-900/50'}`}
          >
            Roadmap Architect
          </button>
        </nav>
      </div>

      {activeTab === 'architect' ? (
        <>
          <div className="bg-transparent mb-12">
            <ProjectForm
              projectConfig={projectConfig}
              setProjectConfig={setProjectConfig}
              onGenerate={handleGenerate}
              onReset={handleReset}
              isLoading={isLoading}
              fileContext={projectConfig.fileContext}
              isDragging={isDragging}
              onFileChange={handleFileChange}
              onRemoveFile={removeFile}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
            />
          </div>

      {error && (
        <div className="mt-8 bg-red-500/10 border border-red-500/20 text-red-600 dark:text-red-400 px-5 py-4 rounded-2xl text-sm relative" role="alert">
          <strong className="font-bold">Error: </strong>
          <span className="block sm:inline">{error}</span>
        </div>
      )}

          {/* Progressive Loading Bar */}
          {isLoading && (
            <div className="mt-8 bg-transparent">
              <h3 className="text-lg font-bold text-slate-800 dark:text-slate-200 mb-6 uppercase tracking-wider text-xs">Generating Project Files</h3>
              
              <div className="space-y-4 mb-8">
                {generationStages.map((stage, idx) => (
                  <div key={stage.key} className="flex items-center space-x-4">
                    <div className={`flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold transition-all duration-500 ${
                      stage.status === 'complete' ? 'bg-emerald-500 text-white' :
                      stage.status === 'active' ? 'bg-blue-600 text-white animate-pulse' :
                      'bg-slate-200 dark:bg-slate-800 text-slate-400'
                    }`}>
                      {stage.status === 'complete' ? '✓' :
                       stage.status === 'active' ? '●' :
                       '○'}
                    </div>
                    <span className={`text-sm font-semibold ${
                      stage.status === 'complete' ? 'text-emerald-600 dark:text-emerald-400' :
                      stage.status === 'active' ? 'text-blue-600 dark:text-blue-400' :
                      'text-slate-400 dark:text-slate-500'
                    }`}>
                      {stage.label}
                    </span>
                    <span className="text-xs text-slate-400 dark:text-slate-500 ml-auto">
                      {stage.status === 'complete' ? 'Complete' :
                       stage.status === 'active' ? 'Generating...' :
                       'Waiting'}
                    </span>
                  </div>
                ))}
              </div>
              
              <div className="w-full bg-slate-200 dark:bg-slate-800 rounded-full h-1.5 overflow-hidden">
                <div
                  className="bg-blue-600 h-1.5 rounded-full transition-all duration-700 ease-out"
                  style={{ width: `${overallProgress}%` }}
                />
              </div>
              
              <p className="mt-4 text-xs text-slate-400 dark:text-slate-500 text-center italic">
                {loadingMessage}
              </p>
            </div>
          )}

          {generatedFiles && !isLoading && (
            <div className="mt-8">
              <GeneratedProjectDisplay files={generatedFiles} onSave={handleOpenSaveModal} projectName={loadedProjectName} />
            </div>
          )}

          {savedProjects.length > 0 && (
            <div className="mt-20 border-t border-slate-200/60 dark:border-slate-800/50 pt-16">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-8 gap-4">
                    <h2 className="text-2xl font-extrabold text-slate-800 dark:text-slate-200">Saved Projects</h2>
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

                <div className="mb-8 font-semibold">
                    <div className="relative">
                        <span className="material-icons absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">search</span>
                        <input
                            type="text"
                            placeholder="Search saved projects..."
                            value={searchTerm}
                            onChange={(e) => setSearchText(e.target.value)}
                            className="w-full pl-11 pr-4 py-3 bg-white dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 rounded-2xl focus:ring-2 focus:ring-blue-500/40 outline-none transition-all text-sm"
                        />
                    </div>
                </div>
                <div className="space-y-4">
                    {savedProjects
                        .filter(p => !p.isArchived && !p.isStarred && !p.isPinned && (p.name.toLowerCase().includes(searchTerm.toLowerCase()) || getDeepSearchText(p).includes(searchTerm.toLowerCase())))
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
                    {(savedProjects.filter(p => !p.isArchived && !p.isStarred && !p.isPinned && (p.name.toLowerCase().includes(searchTerm.toLowerCase()) || getDeepSearchText(p).includes(searchTerm.toLowerCase()))).length === 0 && searchTerm) && (
                        <div className="py-12 text-center text-slate-500">
                            <span className="material-icons text-4xl mb-2 text-slate-400">search_off</span>
                            <p className="text-sm">No projects match your search</p>
                        </div>
                    )}
                </div>
            </div>
          )}
        </>
      ) : activeTab === 'agentJob' ? (
        <AgentJobArchitect />
      ) : (
        <RoadmapArchitect />
      )}

      <Modal isOpen={!!pendingDraft} onClose={() => setPendingDraft(null)} title="Unsaved Draft Found">
        <div className="space-y-4">
            <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                An unsaved project draft was found. Would you like to restore it?
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
                    className="px-5 py-2.5 bg-blue-600 text-white rounded-xl font-semibold text-xs cursor-pointer shadow-sm transition"
                >
                    Restore Draft
                </button>
            </div>
        </div>
      </Modal>

      <PreviewModal
        isOpen={!!previewProject && !isDeleteConfirmOpen}
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
            }
        }}
      />

      <Modal isOpen={isClearAllConfirmOpen} onClose={() => setIsClearAllConfirmOpen(false)} title="Confirm Clear All">
          <div className="space-y-4">
              <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">Are you sure you want to delete ALL saved projects? This action cannot be undone.</p>
              <div className="flex justify-end gap-3 pt-4">
                  <button onClick={() => setIsClearAllConfirmOpen(false)} className="px-5 py-2.5 border border-slate-200 dark:border-slate-800 rounded-xl font-semibold text-xs cursor-pointer">Cancel</button>
                  <button onClick={handleClearAll} className="px-5 py-2.5 bg-rose-600 hover:bg-rose-500 text-white font-semibold text-xs rounded-xl cursor-pointer">Clear All</button>
              </div>
          </div>
      </Modal>

      <Modal isOpen={isDeleteConfirmOpen} onClose={() => { setIsDeleteConfirmOpen(false); setDeleteTarget(null); }} title="Confirm Deletion">
          <div className="space-y-4">
              <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">Are you sure you want to delete this project? This action cannot be undone.</p>
              <div className="flex justify-end gap-3 pt-4">
                  <button onClick={() => { setIsDeleteConfirmOpen(false); setDeleteTarget(null); }} className="px-5 py-2.5 border border-slate-200 dark:border-slate-800 rounded-xl font-semibold text-xs cursor-pointer">Cancel</button>
                  <button onClick={confirmDelete} className="px-5 py-2.5 bg-rose-600 hover:bg-rose-500 text-white font-semibold text-xs rounded-xl cursor-pointer">Delete</button>
              </div>
          </div>
      </Modal>

      <Modal isOpen={!!modalState} onClose={() => setModalState(null)} title={modalState?.mode === 'edit' ? 'Edit Project' : 'Save Project Blueprint'}>
          {modalState && <div className="space-y-5 animate-fade-in">
              <div>
                  <label htmlFor="modalProjectName" className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">Name</label>
                  <input type="text" id="modalProjectName" value={modalInput.name} onChange={e => setModalInput({...modalInput, name: e.target.value})} className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500/40" placeholder="e.g., Q3 Marketing Campaign AI Suite" />
              </div>
              
              {modalState.mode === 'edit' && modalInput.files && (
                  <div className="max-h-64 overflow-y-auto space-y-4 pr-1 custom-scrollbar">
                    <div>
                        <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-2 pt-2">Project Overview</label>
                        <textarea rows={5} value={modalInput.files.overviewFile} onChange={e => setModalInput(prev => ({...prev, files: {...prev.files!, overviewFile: e.target.value}}))} className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl font-mono text-xs focus:ring-2 focus:ring-blue-500/40 outline-none custom-scrollbar" />
                    </div>
                    <div>
                        <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">Development Standards</label>
                        <textarea rows={5} value={modalInput.files.standardsFile} onChange={e => setModalInput(prev => ({...prev, files: {...prev.files!, standardsFile: e.target.value}}))} className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl font-mono text-xs focus:ring-2 focus:ring-blue-500/40 outline-none custom-scrollbar" />
                    </div>
                    <div>
                        <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">Rules & Guardrails</label>
                        <textarea rows={5} value={modalInput.files.rulesFile} onChange={e => setModalInput(prev => ({...prev, files: {...prev.files!, rulesFile: e.target.value}}))} className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl font-mono text-xs focus:ring-2 focus:ring-blue-500/40 outline-none custom-scrollbar" />
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

export default ProjectArchitect;

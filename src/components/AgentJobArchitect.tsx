import React, { useState, useCallback, useEffect, useRef } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { generateAgentJobFile } from '../services/ai/agentJobService';
import { AbortError } from '../services/ai/openRouter';
import { AgentJobConfig, GeneratedAgentJobFile, SavedAgentJob } from '../types';
import { UnifiedItem } from '../types';
import * as db from '../services/dbService';
import { sanitizeFilename } from '../utils/security';
import { getDeepSearchText } from '../utils/search';
import LoadingSpinner from './LoadingSpinner';
import Modal from './Modal';
import PreviewModal from './PreviewModal';
import LibraryItem from './LibraryItem';
import Toast from './Toast';
import { StarredPinnedBar } from './StarredPinnedBar';

const Tooltip: React.FC<{ text: string }> = ({ text }) => (
  <span className="absolute left-1/2 -translate-x-1/2 bottom-full mb-2 w-max max-w-xs p-3 bg-slate-900 text-white text-[11px] font-semibold rounded-xl shadow-xl opacity-0 group-hover:opacity-100 transition-opacity z-10 pointer-events-none">
    {text}
  </span>
);

const FormField: React.FC<{id: string, label: string, tooltip: string, required: boolean, children: React.ReactNode}> = ({id, label, tooltip, required, children}) => (
    <div className="mb-4">
        <label htmlFor={id} className="flex items-center text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2">
            {label} {required ? <span className="text-red-500 ml-1">*</span> : ''}
            <div className="group relative flex items-center ml-2">
                <span className="material-icons text-slate-400 dark:text-slate-500 text-sm cursor-help">info_outline</span>
                <Tooltip text={tooltip} />
            </div>
        </label>
        {children}
    </div>
);

const Fieldset: React.FC<{legend: string, children: React.ReactNode}> = ({legend, children}) => (
    <fieldset className="border border-slate-200/60 dark:border-slate-800/50 rounded-2xl p-6 pt-4 mb-6 animate-fade-in">
        <legend className="text-sm font-bold uppercase tracking-widest px-3 text-slate-400 dark:text-slate-500">{legend}</legend>
        {children}
    </fieldset>
);

const AgentJobArchitect: React.FC = () => {
  const [config, setConfig] = useState<AgentJobConfig>({
    jobTitle: '', department: '', reportsTo: '', mission: '',
    responsibilities: '', qualifications: '', operatingPrinciples: '',
    authority: '', escalationPath: '', successCriteria: '', constraints: ''
  });
  const [generatedFile, setGeneratedFile] = useState<GeneratedAgentJobFile | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loadingMessage, setLoadingMessage] = useState('');
  const loadingIntervalRef = useRef<number | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  const [savedAgentJobs, setSavedAgentJobs] = useState<SavedAgentJob[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [draftStatus, setDraftStatus] = useState<'unloaded' | 'loaded' | 'none'>('unloaded');
  const [pendingDraft, setPendingDraft] = useState<AgentJobConfig | null>(null);
  const isCheckingDraft = useRef(false);
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    starredSection: true,
    pinnedSection: true,
    allItemsSection: true
  });

  const [isSaveModalOpen, setIsSaveModalOpen] = useState(false);
  const [previewJob, setPreviewJob] = useState<SavedAgentJob | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<number | null>(null);
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
  const [isClearAllConfirmOpen, setIsClearAllConfirmOpen] = useState(false);
  const [saveName, setSaveName] = useState('');

  const loadSavedAgentJobs = useCallback(async () => {
    const jobs = await db.getAllAgentJobs();
    setSavedAgentJobs(jobs);
  }, []);

  useEffect(() => {
    loadSavedAgentJobs();
    const loadDraft = async () => {
      if (isCheckingDraft.current) return;
      isCheckingDraft.current = true;
      const draft = await db.getAgentJobDraft(1);
      if (draft?.config && Object.values(draft.config).some(v => v)) {
        setPendingDraft(draft.config);
      } else {
        setDraftStatus('none');
      }
    };
    loadDraft();
  }, [loadSavedAgentJobs]);

  useEffect(() => {
    if (draftStatus === 'unloaded') return;
    const handler = setTimeout(() => {
      if (Object.values(config).some(value => typeof value === 'string' && value.length > 0)) {
        db.saveAgentJobDraft({ id: 1, config });
      }
    }, 1500);
    return () => clearTimeout(handler);
  }, [config, draftStatus]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setConfig(prev => ({ ...prev, [name]: value }));
  };

  const handleGenerate = useCallback(async () => {
    abortControllerRef.current?.abort();
    const controller = new AbortController();
    abortControllerRef.current = controller;

    setIsLoading(true);
    setError(null);
    setGeneratedFile(null);

    const messages = [
      'Drafting the employer handbook...',
      'Weaving role into organizational fabric...',
      'Compressing mission into metaphor...',
      'Defining authority and boundaries...'
    ];
    let messageIndex = 0;
    setLoadingMessage(messages[0]);
    loadingIntervalRef.current = window.setInterval(() => {
      messageIndex = (messageIndex + 1) % messages.length;
      setLoadingMessage(messages[messageIndex]);
    }, 2000);

    try {
      if (!config.jobTitle || !config.mission) {
        setError("Job Title and Mission are required fields.");
        return;
      }
      const file = await generateAgentJobFile(config, controller.signal);
      if (!controller.signal.aborted) {
        setGeneratedFile(file);
        await db.clearAgentJobDraft(1);
      }
    } catch (e: any) {
      if (e instanceof AbortError || e?.name === 'AbortError') return;
      setError('Failed to generate agent job description. Please check your API key and try again.');
    } finally {
      setIsLoading(false);
      if (loadingIntervalRef.current) {
        clearInterval(loadingIntervalRef.current);
      }
      setLoadingMessage('');
      abortControllerRef.current = null;
    }
  }, [config]);

  useEffect(() => {
    return () => {
      abortControllerRef.current?.abort();
    };
  }, []);

  const handleReset = () => {
    setConfig({
      jobTitle: '', department: '', reportsTo: '', mission: '',
      responsibilities: '', qualifications: '', operatingPrinciples: '',
      authority: '', escalationPath: '', successCriteria: '', constraints: ''
    });
    setGeneratedFile(null);
    setError(null);
    setIsLoading(false);
    db.clearAgentJobDraft(1);
  };

  const handleSave = async () => {
    if (!generatedFile || !saveName.trim()) return;
    const newJob: SavedAgentJob = {
      name: saveName.trim(),
      config,
      files: generatedFile,
      createdAt: new Date().toISOString(),
      isStarred: false,
      isPinned: false,
      isArchived: false,
      category: ''
    };
    await db.addAgentJob(newJob);
    setSuccessMessage('Agent job description saved!');
    setIsSaveModalOpen(false);
    setSaveName('');
    loadSavedAgentJobs();
  };

  const handleUpdateMetadata = async (job: SavedAgentJob, metadata: any) => {
    const updated = { ...job, ...metadata };
    await db.updateAgentJob(updated);
    setSavedAgentJobs(prev => prev.map(p => p.id === job.id ? updated : p));
    if (previewJob?.id === job.id) setPreviewJob(updated);
  };

  const promptDelete = (id: number) => {
    setDeleteTarget(id);
    setIsDeleteConfirmOpen(true);
  };

  const handleDelete = async () => {
    if (deleteTarget === null) return;
    await db.deleteAgentJob(deleteTarget);
    setSavedAgentJobs(prev => prev.filter(j => j.id !== deleteTarget));
    setSuccessMessage('Agent job deleted.');
    setIsDeleteConfirmOpen(false);
    setDeleteTarget(null);
  };

  const handleClearAll = async () => {
    await db.clearAllAgentJobs();
    setSavedAgentJobs([]);
    setSuccessMessage('All agent jobs cleared.');
    setIsClearAllConfirmOpen(false);
  };

  const handleExport = (job: SavedAgentJob) => {
    const content = job.files.agentsFile;
    const prefix = sanitizeFilename(job.name);
    const filename = `${prefix}-AGENTS.md`;
    const blob = new Blob([content], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    setSuccessMessage('AGENTS.md exported!');
  };

  const handleCopy = (job: SavedAgentJob) => {
    navigator.clipboard.writeText(job.files.agentsFile);
    setSuccessMessage('Copied to clipboard!');
  };

  const handleLoadSaved = (job: SavedAgentJob) => {
    setConfig(job.config);
    setGeneratedFile(job.files);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleAcceptDraft = () => {
    if (!pendingDraft) return;
    setConfig(pendingDraft);
    setDraftStatus('loaded');
    setPendingDraft(null);
  };

  const handleDeclineDraft = async () => {
    await db.clearAgentJobDraft(1);
    setDraftStatus('none');
    setPendingDraft(null);
  };

  const agentJobToUnified = (job: SavedAgentJob): UnifiedItem => ({
    id: `agentJob-${job.id}`,
    name: job.name,
    type: 'agentJob',
    original: job,
    createdAt: job.createdAt,
    isStarred: job.isStarred || false,
    isPinned: job.isPinned || false,
    isArchived: job.isArchived || false,
    category: job.category || ''
  });

  const unifiedJobs = savedAgentJobs.map(agentJobToUnified);

  const isGenerateDisabled = !config.jobTitle || !config.mission || isLoading;

  return (
    <div className="space-y-8 animate-fade-in">
      <Toast message={successMessage} onClose={() => setSuccessMessage('')} />

      {/* Draft Restore Modal */}
      <Modal isOpen={!!pendingDraft} onClose={() => setPendingDraft(null)} title="Unsaved Draft Found">
        <div className="space-y-4">
          <p className="text-sm text-slate-600 dark:text-slate-400">An unsaved agent job draft was found. Would you like to restore it?</p>
          <div className="flex justify-end gap-3 pt-4">
            <button onClick={handleDeclineDraft} className="px-5 py-2.5 border border-slate-200 dark:border-slate-800 rounded-xl font-semibold text-xs cursor-pointer text-slate-600 dark:text-slate-400 hover:bg-slate-100">Discard</button>
            <button onClick={handleAcceptDraft} className="px-5 py-2.5 bg-blue-600 text-white rounded-xl font-semibold text-xs cursor-pointer shadow-sm transition">Restore Draft</button>
          </div>
        </div>
      </Modal>

      {/* Form Section */}
      <div className="bg-transparent">
        <div className="pb-4 mb-6">
          <h3 className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest">Define Agent Job Description</h3>
        </div>

        <form onSubmit={(e) => { e.preventDefault(); handleGenerate(); }} className="space-y-8">
          <Fieldset legend="Role Identity">
            <FormField id="jobTitle" label="Job Title" tooltip="The name of the role this agent-employee will fill." required={true}>
              <input
                type="text"
                id="jobTitle"
                name="jobTitle"
                value={config.jobTitle}
                onChange={handleChange}
                placeholder="e.g., Senior Frontend Engineer"
                required
                className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 rounded-xl text-sm focus:ring-2 focus:ring-blue-500/40 outline-none transition"
              />
            </FormField>
            <FormField id="department" label="Department / Team" tooltip="The organizational unit or team this role belongs to." required={false}>
              <input
                type="text"
                id="department"
                name="department"
                value={config.department}
                onChange={handleChange}
                placeholder="e.g., Platform Engineering, AI Research"
                className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 rounded-xl text-sm focus:ring-2 focus:ring-blue-500/40 outline-none transition"
              />
            </FormField>
            <FormField id="reportsTo" label="Reports To" tooltip="Who or what this role reports to (a human role, a team, or the system itself)." required={false}>
              <input
                type="text"
                id="reportsTo"
                name="reportsTo"
                value={config.reportsTo}
                onChange={handleChange}
                placeholder="e.g., Lead Architect, Head of Product"
                className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 rounded-xl text-sm focus:ring-2 focus:ring-blue-500/40 outline-none transition"
              />
            </FormField>
            <FormField id="mission" label="Mission" tooltip="The high-level purpose of this role — why it exists and what it ultimately serves." required={true}>
              <textarea
                rows={2}
                id="mission"
                name="mission"
                value={config.mission}
                onChange={handleChange}
                placeholder="e.g., To ensure the frontend architecture is coherent, performant, and aligned with the product vision."
                required
                className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 rounded-xl text-sm focus:ring-2 focus:ring-blue-500/40 outline-none transition custom-scrollbar"
              />
            </FormField>
          </Fieldset>

          <Fieldset legend="Role Details">
            <FormField id="responsibilities" label="Key Responsibilities" tooltip="The primary duties and expected contributions of this role." required={false}>
              <textarea
                rows={3}
                id="responsibilities"
                name="responsibilities"
                value={config.responsibilities}
                onChange={handleChange}
                placeholder="e.g., Own the component library. Establish performance budgets. Conduct architecture reviews."
                className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 rounded-xl text-sm focus:ring-2 focus:ring-blue-500/40 outline-none transition custom-scrollbar"
              />
            </FormField>
            <FormField id="qualifications" label="Qualifications" tooltip="Required knowledge, experience, or capabilities the agent must possess." required={false}>
              <textarea
                rows={3}
                id="qualifications"
                name="qualifications"
                value={config.qualifications}
                onChange={handleChange}
                placeholder="e.g., Deep understanding of React and TypeScript. Experience with distributed systems."
                className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 rounded-xl text-sm focus:ring-2 focus:ring-blue-500/40 outline-none transition custom-scrollbar"
              />
            </FormField>
            <FormField id="operatingPrinciples" label="Operating Principles" tooltip="The values, conduct, and ethos that guide how this role operates." required={false}>
              <textarea
                rows={3}
                id="operatingPrinciples"
                name="operatingPrinciples"
                value={config.operatingPrinciples}
                onChange={handleChange}
                placeholder="e.g., Write code with intention. Prefer simplicity over cleverness. Assume good intent."
                className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 rounded-xl text-sm focus:ring-2 focus:ring-blue-500/40 outline-none transition custom-scrollbar"
              />
            </FormField>
          </Fieldset>

          <Fieldset legend="Operating Context">
            <FormField id="authority" label="Authority & Autonomy" tooltip="What this role can decide autonomously without seeking approval." required={false}>
              <textarea
                rows={3}
                id="authority"
                name="authority"
                value={config.authority}
                onChange={handleChange}
                placeholder="e.g., Can make technical decisions within established patterns. Can approve PRs. Can prioritize bug fixes."
                className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 rounded-xl text-sm focus:ring-2 focus:ring-blue-500/40 outline-none transition custom-scrollbar"
              />
            </FormField>
            <FormField id="escalationPath" label="Escalation Path" tooltip="When and how this role should escalate to a human or higher authority." required={false}>
              <textarea
                rows={3}
                id="escalationPath"
                name="escalationPath"
                value={config.escalationPath}
                onChange={handleChange}
                placeholder="e.g., Security incidents must be escalated immediately. Architectural changes beyond scope require team lead approval."
                className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 rounded-xl text-sm focus:ring-2 focus:ring-blue-500/40 outline-none transition custom-scrollbar"
              />
            </FormField>
            <FormField id="successCriteria" label="Success Criteria" tooltip="How this role's performance and impact are measured." required={false}>
              <textarea
                rows={3}
                id="successCriteria"
                name="successCriteria"
                value={config.successCriteria}
                onChange={handleChange}
                placeholder="e.g., Components are consistently documented. Performance budgets are met. Technical debt is reduced."
                className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 rounded-xl text-sm focus:ring-2 focus:ring-blue-500/40 outline-none transition custom-scrollbar"
              />
            </FormField>
            <FormField id="constraints" label="Boundaries & Constraints" tooltip="What is off-limits or restricted for this role." required={false}>
              <textarea
                rows={3}
                id="constraints"
                name="constraints"
                value={config.constraints}
                onChange={handleChange}
                placeholder="e.g., Cannot access production secrets. Cannot modify the authentication system without review."
                className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 rounded-xl text-sm focus:ring-2 focus:ring-blue-500/40 outline-none transition custom-scrollbar"
              />
            </FormField>
          </Fieldset>

          <div className="flex flex-col sm:flex-row items-center justify-end gap-3 pt-6 border-t border-slate-200/60 dark:border-slate-800/50">
            <button
              type="button"
              onClick={handleReset}
              disabled={isLoading}
              className="w-full sm:w-auto px-5 py-2.5 border border-slate-200 dark:border-slate-800 rounded-xl text-sm font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-900/60 transition cursor-pointer"
            >
              Reset
            </button>
            <button
              type="submit"
              disabled={isGenerateDisabled}
              className="w-full sm:w-auto flex items-center justify-center px-6 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-sm font-semibold shadow-md shadow-blue-600/10 disabled:opacity-50 disabled:cursor-not-allowed transition cursor-pointer"
            >
              {isLoading ? 'Generating...' : 'Generate AGENTS.md'}
            </button>
          </div>
        </form>
      </div>

      {error && (
        <div className="mt-8 bg-red-500/10 border border-red-500/20 text-red-600 dark:text-red-400 px-5 py-4 rounded-2xl text-sm relative" role="alert">
          <strong className="font-bold">Error: </strong>
          <span className="block sm:inline">{error}</span>
        </div>
      )}

      {isLoading && <LoadingSpinner message={loadingMessage} />}

      {/* Generated Output */}
      {generatedFile && !isLoading && (
        <div className="bg-transparent mt-12 animate-fade-in">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between pb-6 mb-2 border-b border-slate-200/60 dark:border-slate-800/50 gap-4">
            <div>
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest">Generated AGENTS.md</h3>
              <p className="text-xs text-slate-500 mt-1">Crystallized employee requirements handbook.</p>
            </div>
            <div className="flex items-center space-x-3">
              <button
                onClick={() => { navigator.clipboard.writeText(generatedFile.agentsFile); setSuccessMessage('Copied to clipboard!'); }}
                className="flex items-center px-4 py-2 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-900/60 transition cursor-pointer"
              >
                <span className="material-icons text-base mr-2">content_copy</span>
                Copy
              </button>
              <button
                onClick={() => { setIsSaveModalOpen(true); setSaveName(generatedFile.agentsFile.slice(0, 40) || ''); }}
                className="flex items-center px-4 py-2 border border-transparent rounded-xl text-xs font-semibold text-white bg-blue-600 hover:bg-blue-500 shadow-sm shadow-blue-500/10 transition cursor-pointer"
              >
                <span className="material-icons text-base mr-2">save</span>
                Save
              </button>
            </div>
          </div>
          <div className="prose prose-slate dark:prose-invert max-w-none py-4 px-2">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>{generatedFile.agentsFile}</ReactMarkdown>
          </div>
        </div>
      )}

      {/* Save Modal */}
      <Modal isOpen={isSaveModalOpen} onClose={() => setIsSaveModalOpen(false)} title="Save Agent Job Description">
        <div className="space-y-4 animate-fade-in">
          <div>
            <label htmlFor="saveJobName" className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">Name</label>
            <input
              type="text"
              id="saveJobName"
              value={saveName}
              onChange={e => setSaveName(e.target.value)}
              className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500/40"
              placeholder="e.g., Senior Frontend Engineer Role"
            />
          </div>
          <div className="flex justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-800/80">
            <button onClick={() => setIsSaveModalOpen(false)} className="px-5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 font-semibold text-xs cursor-pointer">Cancel</button>
            <button onClick={handleSave} className="px-5 py-2.5 rounded-xl bg-blue-600 text-white font-semibold text-xs cursor-pointer" disabled={!saveName.trim()}>Save</button>
          </div>
        </div>
      </Modal>

      {/* Library Section */}
      {savedAgentJobs.length > 0 && (
        <div className="mt-20 border-t border-slate-200/60 dark:border-slate-800/50 pt-16">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-8 gap-4">
            <h2 className="text-2xl font-extrabold text-slate-800 dark:text-slate-200">Saved Agent Jobs</h2>
            <button
              onClick={() => setIsClearAllConfirmOpen(true)}
              className="px-4 py-2 text-xs font-semibold text-rose-600 dark:text-rose-400 bg-rose-500/10 rounded-xl hover:bg-rose-500/15 flex items-center cursor-pointer transition"
            >
              <span className="material-icons text-sm mr-2">delete_sweep</span>
              Clear All
            </button>
          </div>

          <div className="mb-8 space-y-4">
            <StarredPinnedBar
              type="starred"
              items={unifiedJobs}
              expanded={expandedSections.starredSection}
              onToggleExpand={() => setExpandedSections(prev => ({ ...prev, starredSection: !prev.starredSection }))}
              onToggleStar={(item) => handleUpdateMetadata(item.original, { isStarred: !item.original.isStarred })}
              onTogglePin={(item) => handleUpdateMetadata(item.original, { isPinned: !item.original.isPinned })}
              onToggleArchive={(item) => handleUpdateMetadata(item.original, { isArchived: true })}
              onDelete={(item) => promptDelete(item.original.id!)}
              onEdit={(item) => {}}
              onSelect={(id) => handleLoadSaved(savedAgentJobs.find(j => `agentJob-${j.id}` === id)!)}
              selectedIds={new Set()}
            />
            <StarredPinnedBar
              type="pinned"
              items={unifiedJobs}
              expanded={expandedSections.pinnedSection}
              onToggleExpand={() => setExpandedSections(prev => ({ ...prev, pinnedSection: !prev.pinnedSection }))}
              onToggleStar={(item) => handleUpdateMetadata(item.original, { isStarred: !item.original.isStarred })}
              onTogglePin={(item) => handleUpdateMetadata(item.original, { isPinned: !item.original.isPinned })}
              onToggleArchive={(item) => handleUpdateMetadata(item.original, { isArchived: true })}
              onDelete={(item) => promptDelete(item.original.id!)}
              onEdit={(item) => {}}
              onSelect={(id) => handleLoadSaved(savedAgentJobs.find(j => `agentJob-${j.id}` === id)!)}
              selectedIds={new Set()}
            />
          </div>

          <div className="mb-6">
            <div className="relative">
              <span className="material-icons absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">search</span>
              <input
                type="text"
                placeholder="Search saved agent jobs..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-11 pr-4 py-3 bg-white dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 rounded-2xl focus:ring-2 focus:ring-blue-500/40 outline-none transition-all text-sm"
              />
            </div>
          </div>

          <div className="space-y-4">
            {savedAgentJobs
              .filter(j => !j.isArchived && !j.isStarred && !j.isPinned && (j.name.toLowerCase().includes(searchTerm.toLowerCase()) || getDeepSearchText(j).includes(searchTerm.toLowerCase())))
              .map(job => (
                <LibraryItem
                  key={job.id}
                  name={job.name}
                  createdAt={job.createdAt}
                  metadata={job}
                  icon="assignment_ind"
                  onPreview={() => setPreviewJob(job)}
                  onDelete={() => promptDelete(job.id!)}
                  onToggleStar={() => handleUpdateMetadata(job, { isStarred: !job.isStarred })}
                  onTogglePin={() => handleUpdateMetadata(job, { isPinned: !job.isPinned })}
                  onToggleArchive={() => handleUpdateMetadata(job, { isArchived: true })}
                  onClick={() => handleLoadSaved(job)}
                />
              ))}
            {savedAgentJobs.filter(j => !j.isArchived && !j.isStarred && !j.isPinned && (j.name.toLowerCase().includes(searchTerm.toLowerCase()) || getDeepSearchText(j).includes(searchTerm.toLowerCase()))).length === 0 && searchTerm && (
              <div className="py-12 text-center text-slate-500">
                <span className="material-icons text-4xl mb-2 text-slate-400">search_off</span>
                <p className="text-sm">No agent jobs match your search</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Preview Modal */}
      <PreviewModal
        isOpen={!!previewJob}
        onClose={() => setPreviewJob(null)}
        title={`Preview: ${previewJob?.name}`}
        content={previewJob?.files.agentsFile}
        metadata={previewJob || undefined}
        onUpdateMetadata={(metadata) => previewJob && handleUpdateMetadata(previewJob, metadata)}
        onCopy={() => previewJob && handleCopy(previewJob)}
        onExport={() => previewJob && handleExport(previewJob)}
        onDelete={() => {
          if (previewJob?.id) {
            handleUpdateMetadata(previewJob, { isArchived: true });
            setPreviewJob(null);
          }
        }}
      />

      {/* Delete Confirmation */}
      <Modal isOpen={isDeleteConfirmOpen} onClose={() => setIsDeleteConfirmOpen(false)} title="Delete Agent Job">
        <div className="space-y-4">
          <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">Are you sure you want to delete this agent job description? This cannot be undone.</p>
          <div className="flex justify-end gap-3 pt-4">
            <button onClick={() => setIsDeleteConfirmOpen(false)} className="px-5 py-2.5 border border-slate-200 dark:border-slate-800 rounded-xl font-semibold text-xs cursor-pointer">Cancel</button>
            <button onClick={handleDelete} className="px-5 py-2.5 bg-rose-600 text-white font-semibold text-xs rounded-xl cursor-pointer">Delete</button>
          </div>
        </div>
      </Modal>

      {/* Clear All Confirmation */}
      <Modal isOpen={isClearAllConfirmOpen} onClose={() => setIsClearAllConfirmOpen(false)} title="Clear All Agent Jobs">
        <div className="space-y-4">
          <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">Are you sure you want to delete ALL saved agent job descriptions? This action cannot be undone.</p>
          <div className="flex justify-end gap-3 pt-4">
            <button onClick={() => setIsClearAllConfirmOpen(false)} className="px-5 py-2.5 border border-slate-200 dark:border-slate-800 rounded-xl font-semibold text-xs cursor-pointer">Cancel</button>
            <button onClick={handleClearAll} className="px-5 py-2.5 bg-rose-600 text-white font-semibold text-xs rounded-xl cursor-pointer">Delete All</button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default AgentJobArchitect;
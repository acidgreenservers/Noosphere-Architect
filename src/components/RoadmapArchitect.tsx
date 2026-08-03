import React, { useState, useCallback, useEffect, useRef } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { generateRoadmapTask } from '../services/ai/roadmapService';
import { AbortError } from '../services/ai/openRouter';
import { RoadmapConfig, SavedRoadmap } from '../types';
import { UnifiedItem } from '../types';
import * as db from '../services/dbService';
import { sanitizeFilename } from '../utils/security';
import { fallbackCopyTextToClipboard } from '../utils/clipboard';
import LoadingSpinner from './LoadingSpinner';
import Modal from './Modal';
import PreviewModal from './PreviewModal';
import LibraryItem from './LibraryItem';
import Toast from './Toast';
import { StarredPinnedBar } from './StarredPinnedBar';
import { getDeepSearchText } from '../utils/search';
import { useArchive } from '../context/ArchiveContext';

const MAX_CHARS = 20000;

const RoadmapArchitect: React.FC = () => {
  const [config, setConfig] = useState<RoadmapConfig>({ rawText: '' });
  const [generatedTask, setGeneratedTask] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isCopied, setIsCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loadingMessage, setLoadingMessage] = useState('');
  const loadingIntervalRef = useRef<number | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  const { unifiedItems, updateItemMetadata, deleteItem: removeContextItem, loadArchive } = useArchive();
  const savedRoadmaps = React.useMemo(() => unifiedItems.filter(i => i.type === 'roadmap').map(i => i.original as SavedRoadmap), [unifiedItems]);
  const [searchTerm, setSearchTerm] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [draftStatus, setDraftStatus] = useState<'unloaded' | 'loaded' | 'none'>('unloaded');
  const [pendingDraft, setPendingDraft] = useState<RoadmapConfig | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const isCheckingDraft = useRef(false);
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    starredSection: true,
    pinnedSection: true,
    allItemsSection: true
  });

  const [isSaveModalOpen, setIsSaveModalOpen] = useState(false);
  const [previewRoadmap, setPreviewRoadmap] = useState<SavedRoadmap | null>(null);
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
  const [isClearAllConfirmOpen, setIsClearAllConfirmOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<number | null>(null);
  const [saveName, setSaveName] = useState('');


  useEffect(() => {
    const loadDraft = async () => {
      if (isCheckingDraft.current) return;
      isCheckingDraft.current = true;

      const draft = await db.getRoadmapDraft(1);
      if (draft?.config && (
        draft.config.rawText ||
        draft.config.fileContext ||
        draft.config.project ||
        draft.config.framework ||
        draft.config.architecture ||
        draft.config.purpose ||
        draft.config.direction
      )) {
        setPendingDraft(draft.config);
      } else {
        setDraftStatus('none');
      }
    };
    loadDraft();
  }, []);

  useEffect(() => {
    if (draftStatus === 'unloaded') return;
    const handler = setTimeout(() => {
      if (
        config.rawText ||
        config.fileContext ||
        config.project ||
        config.framework ||
        config.architecture ||
        config.purpose ||
        config.direction
      ) {
        db.saveRoadmapDraft({ id: 1, config });
      }
    }, 1500);
    return () => clearTimeout(handler);
  }, [config, draftStatus]);

  const handleGenerate = useCallback(async () => {
    abortControllerRef.current?.abort();
    const controller = new AbortController();
    abortControllerRef.current = controller;

    setIsLoading(true);
    setError(null);
    setGeneratedTask(null);

    const messages = [
      'Reading your raw text...',
      'Surfacing deep intention...',
      'Mapping dependencies and preconditions...',
      'Building rigorous task specification...',
      'Finalizing roadmap entry...'
    ];
    let messageIndex = 0;
    setLoadingMessage(messages[0]);
    loadingIntervalRef.current = window.setInterval(() => {
      messageIndex = (messageIndex + 1) % messages.length;
      setLoadingMessage(messages[messageIndex]);
    }, 2000);

    try {
      if (!config.rawText.trim()) {
        setError('Please enter some text to generate a roadmap task from.');
        setIsLoading(false);
        if (loadingIntervalRef.current) clearInterval(loadingIntervalRef.current);
        return;
      }
      const task = await generateRoadmapTask(config, controller.signal);
      if (!controller.signal.aborted) {
        setGeneratedTask(task);
        await db.clearRoadmapDraft(1);
      }
    } catch (e: any) {
      if (e instanceof AbortError || e?.name === 'AbortError') return;
      setError(e.message || 'Failed to generate roadmap task. Please check your API key and try again.');
    } finally {
      setIsLoading(false);
      if (loadingIntervalRef.current) {
        clearInterval(loadingIntervalRef.current);
      }
      setLoadingMessage('');
      abortControllerRef.current = null;
    }
  }, [config]);

  // Abort on unmount
  useEffect(() => {
    return () => {
      abortControllerRef.current?.abort();
    };
  }, []);

  const handleReset = () => {
    setConfig({
      rawText: '',
      project: '',
      framework: '',
      architecture: '',
      purpose: '',
      direction: ''
    });
    setGeneratedTask(null);
    setError(null);
    db.clearRoadmapDraft(1);
  };

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
      setConfig(prev => ({
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
    setConfig(prev => {
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

  const handleSaveRoadmap = async () => {
    if (!generatedTask || !saveName.trim()) return;

    const newRoadmap: SavedRoadmap = {
      name: saveName.trim(),
      config,
      generatedTask,
      createdAt: new Date().toISOString(),
      isStarred: false,
      isPinned: false,
      isArchived: false,
      category: ''
    };

    await db.addRoadmap(newRoadmap);
    setSuccessMessage('Roadmap entry saved successfully!');
    await loadArchive();
    setIsSaveModalOpen(false);
    setSaveName('');
  };

  const handleUpdateMetadata = async (roadmap: SavedRoadmap, metadata: any) => {
    const unified: UnifiedItem = roadmapToUnified(roadmap);
    await updateItemMetadata(unified, metadata);
    if (previewRoadmap?.id === roadmap.id) setPreviewRoadmap({ ...roadmap, ...metadata });
  };

  const roadmapToUnified = (roadmap: SavedRoadmap): UnifiedItem => ({
    id: `roadmap-${roadmap.id}`,
    name: roadmap.name,
    type: 'roadmap',
    original: roadmap,
    createdAt: roadmap.createdAt,
    isStarred: roadmap.isStarred || false,
    isPinned: roadmap.isPinned || false,
    isArchived: roadmap.isArchived || false,
    category: roadmap.category || ''
  });

  const handleClearAll = async () => {
    await db.clearAllRoadmaps();
    await loadArchive();
    setSuccessMessage('All roadmap entries cleared.');
    setIsClearAllConfirmOpen(false);
  };

  const unifiedRoadmaps = savedRoadmaps.map(roadmapToUnified);

  const handleDelete = async (id: number) => {
    setIsDeleteConfirmOpen(true);
    setDeleteTarget(id);
  };

  const confirmDelete = async () => {
    if (deleteTarget === null) return;
    const roadmap = savedRoadmaps.find(r => r.id === deleteTarget);
    if (!roadmap) return;
    const unified: UnifiedItem = roadmapToUnified(roadmap);
    await removeContextItem(unified);
    setSuccessMessage('Roadmap entry deleted successfully!');
    setIsDeleteConfirmOpen(false);
    setDeleteTarget(null);
    setPreviewRoadmap(null);
  };

  const handleLoadSaved = (roadmap: SavedRoadmap) => {
    setConfig(roadmap.config);
    setGeneratedTask(roadmap.generatedTask);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleAcceptDraft = () => {
    if (!pendingDraft) return;
    setConfig(pendingDraft);
    setDraftStatus('loaded');
    setPendingDraft(null);
  };

  const handleDeclineDraft = async () => {
    await db.clearRoadmapDraft(1);
    setDraftStatus('none');
    setPendingDraft(null);
  };

  const handleCopy = async (task: string) => {
    const success = await fallbackCopyTextToClipboard(task);
    if (success) {
        setIsCopied(true);
        setTimeout(() => setIsCopied(false), 2000);
    } else {
        setSuccessMessage('Failed to copy to clipboard!');
    }
  };

  const handleExport = (name: string, task: string) => {
    const filename = sanitizeFilename(name || 'roadmap-task') + '.md';
    const blob = new Blob([task], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const charCount = config.rawText.length;

  return (
    <div className="max-w-4xl mx-auto">
      <Toast message={successMessage} onClose={() => setSuccessMessage('')} />

      {/* Input Section - Refactored to match minimalist slate design */}
      <div className="bg-transparent">
        <form onSubmit={(e) => { e.preventDefault(); handleGenerate(); }} className="space-y-8">
          <div className="flex flex-col sm:flex-row justify-between items-center mb-6 gap-4">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center">
              Define Roadmap Task
            </h3>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="project" className="block text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-2">
                    Project
                  </label>
                  <input
                    id="project"
                    type="text"
                    value={config.project || ''}
                    onChange={(e) => setConfig(prev => ({ ...prev, project: e.target.value }))}
                    placeholder="e.g., Noosphere-Architect"
                    className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800/80 rounded-xl focus:ring-2 focus:ring-amber-500/40 outline-none transition-all duration-200 text-sm text-slate-900 dark:text-slate-100"
                  />
                </div>
                <div>
                  <label htmlFor="framework" className="block text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-2">
                    Framework
                  </label>
                  <input
                    id="framework"
                    type="text"
                    value={config.framework || ''}
                    onChange={(e) => setConfig(prev => ({ ...prev, framework: e.target.value }))}
                    placeholder="e.g., React 19, Vite 6, Tailwind 4"
                    className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800/80 rounded-xl focus:ring-2 focus:ring-amber-500/40 outline-none transition-all duration-200 text-sm text-slate-900 dark:text-slate-100"
                  />
                </div>
                <div>
                  <label htmlFor="architecture" className="block text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-2">
                    Architecture
                  </label>
                  <input
                    id="architecture"
                    type="text"
                    value={config.architecture || ''}
                    onChange={(e) => setConfig(prev => ({ ...prev, architecture: e.target.value }))}
                    placeholder="e.g., Client-side SPA, IndexedDB"
                    className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800/80 rounded-xl focus:ring-2 focus:ring-amber-500/40 outline-none transition-all duration-200 text-sm text-slate-900 dark:text-slate-100"
                  />
                </div>
                <div>
                  <label htmlFor="purpose" className="block text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-2">
                    Purpose
                  </label>
                  <input
                    id="purpose"
                    type="text"
                    value={config.purpose || ''}
                    onChange={(e) => setConfig(prev => ({ ...prev, purpose: e.target.value }))}
                    placeholder="e.g., Architectural asset stewardship"
                    className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800/80 rounded-xl focus:ring-2 focus:ring-amber-500/40 outline-none transition-all duration-200 text-sm text-slate-900 dark:text-slate-100"
                  />
                </div>
                <div className="md:col-span-2">
                  <label htmlFor="direction" className="block text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-2">
                    Direction
                  </label>
                  <input
                    id="direction"
                    type="text"
                    value={config.direction || ''}
                    onChange={(e) => setConfig(prev => ({ ...prev, direction: e.target.value }))}
                    placeholder="e.g., Enhance grounding with deep context inputs"
                    className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800/80 rounded-xl focus:ring-2 focus:ring-amber-500/40 outline-none transition-all duration-200 text-sm text-slate-900 dark:text-slate-100"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="rawText" className="block text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-2">
                  Paste Vision / Context <span className="text-red-500 ml-0.5">*</span>
                </label>
                <textarea
                  id="rawText"
                  rows={8}
                  value={config.rawText}
                  onChange={(e) => setConfig(prev => ({ ...prev, rawText: e.target.value }))}
                  placeholder="Paste your raw thoughts, vision notes, requirements, or any unstructured text up to 20,000 characters..."
                  className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800/80 rounded-xl focus:ring-2 focus:ring-amber-500/40 outline-none transition-all duration-200 text-sm text-slate-900 dark:text-slate-100 custom-scrollbar"
                  required
                />
              </div>
              <div className="flex justify-end mt-1">
                <span className={`text-[10px] font-mono px-2 py-0.5 rounded ${
                  charCount > MAX_CHARS
                    ? 'bg-red-500/10 text-red-600 dark:text-red-400'
                    : 'bg-slate-100 dark:bg-slate-900 text-slate-500'
                }`}>
                  {charCount.toLocaleString()} / {MAX_CHARS.toLocaleString()} characters
                </span>
              </div>
            </div>

            <div className="space-y-2 lg:mt-[21px]">
              <label className="block text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-2">
                Anchor File Context (Optional)
              </label>
              {!config.fileContext ? (
                <div
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                  className={`border border-dashed rounded-xl p-6 text-center transition-all duration-200 cursor-pointer h-[380px] flex flex-col items-center justify-center ${
                    isDragging
                      ? 'border-amber-500/80 bg-amber-500/5'
                      : 'border-slate-200 dark:border-slate-800 hover:border-amber-500/60 dark:hover:border-amber-500/40 bg-slate-50/50 dark:bg-slate-950/20'
                  }`}
                  onClick={() => document.getElementById('fileInput')?.click()}
                >
                  <input
                    type="file"
                    id="fileInput"
                    className="hidden"
                    onChange={handleFileChange}
                    accept=".txt,.md,.json,.js,.ts,.tsx,.html,.css"
                  />
                  <span className={`material-icons text-3xl mb-2 transition-colors ${isDragging ? 'text-amber-500' : 'text-slate-400'}`}>upload_file</span>
                  <p className="text-xs font-bold text-slate-600 dark:text-slate-300">
                    Drop anchor file here
                  </p>
                  <p className="text-[10px] text-slate-400 mt-1">
                    Or click to browse
                  </p>
                  <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-4 px-2 leading-relaxed">
                    Supports .txt, .md, and code files. This file grounds the AI's inference patterns.
                  </p>
                </div>
              ) : (
                <div className="flex flex-col h-[380px] bg-amber-500/5 border border-amber-500/20 rounded-xl overflow-hidden">
                  <div className="p-3 border-b border-amber-500/20 flex items-center justify-between bg-amber-500/10">
                    <div className="flex items-center overflow-hidden mr-2">
                      <span className="material-icons text-amber-500 text-sm mr-2">description</span>
                      <span className="text-xs font-bold text-amber-600 dark:text-amber-400 truncate">
                        {config.fileContext.name}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={removeFile}
                      className="p-1 hover:bg-amber-500/20 rounded-full text-amber-500 transition-colors"
                      title="Remove file"
                    >
                      <span className="material-icons text-sm">close</span>
                    </button>
                  </div>
                  <div className="flex-1 p-4 overflow-y-auto custom-scrollbar">
                    <div className="text-[10px] font-mono text-amber-600/80 dark:text-amber-400/80 whitespace-pre-wrap line-clamp-[20]">
                      {config.fileContext.content}
                    </div>
                  </div>
                  <div className="p-3 bg-amber-500/5 text-center">
                    <span className="text-[10px] font-semibold text-amber-600 dark:text-amber-400 uppercase tracking-wider">
                      Attached as Anchor Context
                    </span>
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-end space-y-4 sm:space-y-0 sm:space-x-4 pt-2">
            <button type="button" onClick={handleReset} disabled={isLoading} className="w-full sm:w-auto px-5 py-2.5 border border-slate-200 dark:border-slate-800 rounded-xl font-semibold text-xs cursor-pointer text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-900 transition">
              Reset
            </button>
            <button
              type="submit"
              disabled={!config.rawText.trim() || charCount > MAX_CHARS || isLoading}
              className="w-full sm:w-auto flex items-center justify-center px-6 py-2.5 rounded-xl text-xs font-bold text-white bg-amber-600 hover:bg-amber-700 dark:bg-amber-600 dark:hover:bg-amber-500 disabled:opacity-50 disabled:cursor-not-allowed transition shadow-md shadow-amber-600/10 cursor-pointer"
            >
              {isLoading ? 'Generating...' : 'Generate Roadmap Task'}
            </button>
          </div>
        </form>
      </div>

      {/* Error Display */}
      {error && (
        <div className="mt-8 bg-red-500/10 border border-red-500/20 text-red-600 dark:text-red-400 px-5 py-4 rounded-2xl text-sm relative" role="alert">
          <strong className="font-bold">Error: </strong>
          <span className="block sm:inline">{error}</span>
        </div>
      )}

      {/* Loading */}
      {isLoading && <LoadingSpinner message={loadingMessage || 'Generating roadmap task...'} />}

      {/* Generated Output */}
      {generatedTask && !isLoading && (
        <div className="mt-12 bg-transparent">
          <div className="flex flex-col md:flex-row justify-between items-center pb-4 border-b border-slate-100 dark:border-slate-800/80 mb-6 gap-4">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest">Generated Roadmap Task</h3>
            <div className="flex flex-wrap items-center justify-center md:justify-end gap-3">
              <button onClick={() => handleCopy(generatedTask)} className={`flex items-center px-4 py-2 border rounded-xl text-xs font-semibold transition cursor-pointer ${isCopied ? 'bg-green-500/10 text-green-600 dark:text-green-400 border-green-500/20' : 'border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-900'}`} title="Copy to clipboard">
                <span className="material-icons text-sm mr-1.5">{isCopied ? 'check' : 'content_copy'}</span>{isCopied ? 'Copied' : 'Copy'}
              </button>
              <button
                onClick={() => { handleExport(saveName, generatedTask); setSuccessMessage('Roadmap task exported successfully!'); }}
                className="flex items-center px-4 py-2 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-900 transition cursor-pointer"
                title="Export file"
              >
                <span className="material-icons text-sm mr-2">download</span>Export
              </button>
              <button onClick={() => setIsSaveModalOpen(true)} className="flex items-center px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold transition shadow-md shadow-amber-600/10 cursor-pointer" title="Save entry">
                <span className="material-icons text-sm mr-2">save</span>Save
              </button>
            </div>
          </div>

          <div className="prose prose-sm sm:prose-base dark:prose-invert max-w-none bg-slate-50/50 dark:bg-slate-950/20 rounded-2xl border border-slate-200/60 dark:border-slate-800/60 p-6 sm:p-8">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>{generatedTask}</ReactMarkdown>
          </div>
        </div>
      )}

      {/* Saved Roadmaps */}
      {savedRoadmaps.length > 0 && (
        <div className="mt-20 border-t border-slate-200/60 dark:border-slate-800/50 pt-16">
          <div className="flex justify-between items-center mb-8">
            <h2 className="text-2xl font-extrabold text-slate-800 dark:text-slate-200">Saved Roadmap Entries</h2>
            <button
              onClick={() => setIsClearAllConfirmOpen(true)}
              className="px-4 py-2 text-xs font-semibold text-rose-600 dark:text-rose-400 bg-rose-500/10 rounded-xl hover:bg-rose-500/15 flex items-center cursor-pointer transition"
            >
              <span className="material-icons text-sm mr-2">delete_sweep</span> Clear All
            </button>
          </div>

          <div className="mb-8 space-y-4">
            <StarredPinnedBar
              type="starred"
              items={unifiedRoadmaps}
              expanded={expandedSections.starredSection}
              onToggleExpand={() => setExpandedSections(prev => ({ ...prev, starredSection: !prev.starredSection }))}
              onToggleStar={(item) => handleUpdateMetadata(item.original, { isStarred: !item.original.isStarred })}
              onTogglePin={(item) => handleUpdateMetadata(item.original, { isPinned: !item.original.isPinned })}
              onToggleArchive={(item) => handleUpdateMetadata(item.original, { isArchived: true })}
              onDelete={(item) => handleDelete(item.original.id!)}
              onEdit={() => {}}
              onSelect={(id) => handleLoadSaved(savedRoadmaps.find(r => `roadmap-${r.id}` === id)!)}
              selectedIds={new Set()}
            />
            <StarredPinnedBar
              type="pinned"
              items={unifiedRoadmaps}
              expanded={expandedSections.pinnedSection}
              onToggleExpand={() => setExpandedSections(prev => ({ ...prev, pinnedSection: !prev.pinnedSection }))}
              onToggleStar={(item) => handleUpdateMetadata(item.original, { isStarred: !item.original.isStarred })}
              onTogglePin={(item) => handleUpdateMetadata(item.original, { isPinned: !item.original.isPinned })}
              onToggleArchive={(item) => handleUpdateMetadata(item.original, { isArchived: true })}
              onDelete={(item) => handleDelete(item.original.id!)}
              onEdit={() => {}}
              onSelect={(id) => handleLoadSaved(savedRoadmaps.find(r => `roadmap-${r.id}` === id)!)}
              selectedIds={new Set()}
            />
          </div>

          <div className="mb-6">
            <div className="relative">
              <span className="material-icons absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">search</span>
              <input
                type="text"
                placeholder="Search saved roadmap entries..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-11 pr-4 py-3 bg-white dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 rounded-2xl focus:ring-2 focus:ring-amber-500/40 outline-none transition-all text-sm"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {savedRoadmaps
              .filter(r => !r.isArchived && !r.isStarred && !r.isPinned && (r.name.toLowerCase().includes(searchTerm.toLowerCase()) || getDeepSearchText(r).includes(searchTerm.toLowerCase())))
              .map(r => (
                <LibraryItem
                  key={r.id}
                  name={r.name}
                  createdAt={r.createdAt}
                  metadata={r}
                  icon="map"
                  typeLabel="roadmap"
                  onPreview={() => setPreviewRoadmap(r)}
                  onDelete={() => handleDelete(r.id!)}
                  onToggleStar={() => handleUpdateMetadata(r, { isStarred: !r.isStarred })}
                  onTogglePin={() => handleUpdateMetadata(r, { isPinned: !r.isPinned })}
                  onToggleArchive={() => handleUpdateMetadata(r, { isArchived: true })}
                  onClick={() => handleLoadSaved(r)}
                />
              ))}
          </div>
        </div>
      )}

      {/* Draft Restore Modal */}
      <Modal isOpen={!!pendingDraft} onClose={() => setPendingDraft(null)} title="Unsaved Draft Found">
        <div className="space-y-4">
          <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
            An unsaved roadmap draft was found. Would you like to restore it?
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
              className="px-5 py-2.5 bg-amber-600 text-white rounded-xl font-semibold text-xs cursor-pointer shadow-sm transition"
            >
              Restore Draft
            </button>
          </div>
        </div>
      </Modal>

      {/* Clear All Confirmation */}
      <Modal isOpen={isClearAllConfirmOpen} onClose={() => setIsClearAllConfirmOpen(false)} title="Confirm Clear All">
        <div className="space-y-4">
          <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
            Are you sure you want to clear ALL roadmap entries? This action cannot be undone.
          </p>
          <div className="flex justify-end gap-3 pt-4">
            <button
              onClick={() => setIsClearAllConfirmOpen(false)}
              className="px-5 py-2.5 border border-slate-200 dark:border-slate-800 rounded-xl font-semibold text-xs cursor-pointer"
            >
              Cancel
            </button>
            <button
              onClick={handleClearAll}
              className="px-5 py-2.5 bg-rose-600 hover:bg-rose-500 text-white font-semibold text-xs rounded-xl cursor-pointer"
            >
              Clear All
            </button>
          </div>
        </div>
      </Modal>

      {/* Preview Modal */}
      <PreviewModal
        isOpen={!!previewRoadmap && !isDeleteConfirmOpen}
        onClose={() => setPreviewRoadmap(null)}
        title={`Preview: ${previewRoadmap?.name}`}
        content={previewRoadmap?.generatedTask || ''}
        metadata={previewRoadmap || undefined}
        onUpdateMetadata={(metadata) => previewRoadmap && handleUpdateMetadata(previewRoadmap, metadata)}
        onCopy={async () => {
          if (previewRoadmap) {
            await fallbackCopyTextToClipboard(previewRoadmap.generatedTask);
          }
        }}
        onExport={() => {
          if (previewRoadmap) {
            handleExport(previewRoadmap.name, previewRoadmap.generatedTask);
            setSuccessMessage('Roadmap entry exported successfully!');
          }
        }}
        onDelete={() => {
          if (previewRoadmap?.id) {
            setDeleteTarget(previewRoadmap.id);
            setIsDeleteConfirmOpen(true);
          }
        }}
      />

      {/* Save Modal */}
      <Modal isOpen={isSaveModalOpen} onClose={() => setIsSaveModalOpen(false)} title="Save Roadmap Entry">
        <div className="space-y-4">
          <div>
            <label htmlFor="saveName" className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">Entry Name</label>
            <input
              type="text"
              id="saveName"
              value={saveName}
              onChange={(e) => setSaveName(e.target.value)}
              placeholder="e.g., Database Schema Migration Task"
              className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-sm outline-none focus:ring-2 focus:ring-amber-500/40"
              autoFocus
            />
          </div>
          <div className="flex justify-end gap-3 pt-4">
            <button onClick={() => setIsSaveModalOpen(false)} className="px-5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 font-semibold text-xs cursor-pointer">Cancel</button>
            <button
              onClick={handleSaveRoadmap}
              disabled={!saveName.trim()}
              className="px-5 py-2.5 rounded-xl bg-amber-600 text-white hover:bg-amber-700 font-semibold text-xs cursor-pointer disabled:opacity-50"
            >
              Save Entry
            </button>
          </div>
        </div>
      </Modal>

      {/* Delete Confirmation */}
      <Modal isOpen={isDeleteConfirmOpen} onClose={() => { setIsDeleteConfirmOpen(false); setDeleteTarget(null); }} title="Confirm Delete">
        <div className="space-y-4">
          <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
            Are you sure you want to delete this roadmap entry? This action cannot be undone.
          </p>
          <div className="flex justify-end gap-3 pt-4">
            <button
              onClick={() => { setIsDeleteConfirmOpen(false); setDeleteTarget(null); }}
              className="px-5 py-2.5 border border-slate-200 dark:border-slate-800 rounded-xl font-semibold text-xs cursor-pointer"
            >
              Cancel
            </button>
            <button
              onClick={confirmDelete}
              className="px-5 py-2.5 bg-rose-600 hover:bg-rose-500 text-white font-semibold text-xs rounded-xl cursor-pointer"
            >
              Delete
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default RoadmapArchitect;
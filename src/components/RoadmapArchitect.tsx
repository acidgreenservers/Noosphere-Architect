import React, { useState, useCallback, useEffect, useRef } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { generateRoadmapTask } from '../services/ai/roadmapService';
import { RoadmapConfig, SavedRoadmap } from '../types';
import { UnifiedItem } from '../types';
import * as db from '../services/dbService';
import { sanitizeFilename } from '../utils/security';
import LoadingSpinner from './LoadingSpinner';
import Modal from './Modal';
import PreviewModal from './PreviewModal';
import LibraryItem from './LibraryItem';
import Toast from './Toast';
import { StarredPinnedBar } from './StarredPinnedBar';

const MAX_CHARS = 20000;

const RoadmapArchitect: React.FC = () => {
  const [config, setConfig] = useState<RoadmapConfig>({ rawText: '' });
  const [generatedTask, setGeneratedTask] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loadingMessage, setLoadingMessage] = useState('');
  const loadingIntervalRef = useRef<number | null>(null);

  const [savedRoadmaps, setSavedRoadmaps] = useState<SavedRoadmap[]>([]);
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

  const loadSavedRoadmaps = useCallback(async () => {
    const roadmaps = await db.getAllRoadmaps();
    setSavedRoadmaps(roadmaps);
  }, []);

  useEffect(() => {
    loadSavedRoadmaps();
    const loadDraft = async () => {
      if (isCheckingDraft.current) return;
      isCheckingDraft.current = true;

      const draft = await db.getRoadmapDraft(1);
      if (draft?.config && (draft.config.rawText || draft.config.fileContext)) {
        setPendingDraft(draft.config);
      } else {
        setDraftStatus('none');
      }
    };
    loadDraft();
  }, [loadSavedRoadmaps]);

  useEffect(() => {
    if (draftStatus === 'unloaded') return;
    const handler = setTimeout(() => {
      if (config.rawText || config.fileContext) {
        db.saveRoadmapDraft({ id: 1, config });
      }
    }, 1500);
    return () => clearTimeout(handler);
  }, [config, draftStatus]);

  const handleGenerate = useCallback(async () => {
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
      const task = await generateRoadmapTask(config);
      setGeneratedTask(task);
      await db.clearRoadmapDraft(1);
    } catch (e: any) {
      setError(e.message || 'Failed to generate roadmap task. Please check your API key and try again.');
    } finally {
      setIsLoading(false);
      if (loadingIntervalRef.current) {
        clearInterval(loadingIntervalRef.current);
      }
      setLoadingMessage('');
    }
  }, [config]);

  const handleReset = () => {
    setConfig({ rawText: '' });
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
    loadSavedRoadmaps();
    setIsSaveModalOpen(false);
    setSaveName('');
  };

  const handleUpdateMetadata = async (roadmap: SavedRoadmap, metadata: any) => {
    const updated = { ...roadmap, ...metadata };
    await db.updateRoadmap(updated);
    setSavedRoadmaps(prev => prev.map(r => r.id === roadmap.id ? updated : r));
    if (previewRoadmap?.id === roadmap.id) setPreviewRoadmap(updated);
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
    loadSavedRoadmaps();
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
    await db.deleteRoadmap(deleteTarget);
    setSavedRoadmaps(prev => prev.filter(r => r.id !== deleteTarget));
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

  const handleCopy = (task: string) => {
    navigator.clipboard.writeText(task);
    setSuccessMessage('Copied to clipboard!');
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

      {/* Input Section */}
      <div className="mt-8 bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-6 md:p-8 border border-gray-200 dark:border-gray-700/50">
        <form onSubmit={(e) => { e.preventDefault(); handleGenerate(); }} className="space-y-6">
          <div className="flex flex-col sm:flex-row justify-between items-center mb-6 gap-4">
            <h2 className="text-2xl font-semibold text-gray-800 dark:text-gray-200 flex items-center">
              <span className="material-icons mr-2 text-amber-500 dark:text-amber-400">map</span>
              Roadmap Architect
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="md:col-span-2">
              <label htmlFor="rawText" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Paste Vision / Context <span className="text-red-500 ml-1">*</span>
              </label>
              <textarea
                id="rawText"
                rows={12}
                value={config.rawText}
                onChange={(e) => setConfig(prev => ({ ...prev, rawText: e.target.value }))}
                placeholder="Paste your raw thoughts, vision notes, requirements, or any unstructured text up to 20,000 characters..."
                className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm transition focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent hover:ring-2 hover:ring-amber-500/20 text-gray-900 dark:text-gray-100"
                required
              />
              <div className="flex justify-end mt-1">
                <span className={`text-xs font-mono px-2 py-1 rounded ${
                  charCount > MAX_CHARS
                    ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300'
                    : 'bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400'
                }`}>
                  {charCount.toLocaleString()} / {MAX_CHARS.toLocaleString()} characters
                </span>
              </div>
            </div>

            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Anchor File Context (Optional)
              </label>
              {!config.fileContext ? (
                <div
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                  className={`border-2 border-dashed rounded-xl p-6 text-center transition-all cursor-pointer h-[326px] flex flex-col items-center justify-center ${
                    isDragging
                      ? 'border-amber-500 bg-amber-50 dark:bg-amber-900/20'
                      : 'border-gray-300 dark:border-gray-600 hover:border-amber-500 dark:hover:border-amber-400 bg-gray-50/50 dark:bg-gray-900/20'
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
                  <span className={`material-icons text-4xl mb-2 transition-colors ${isDragging ? 'text-amber-500' : 'text-gray-400'}`}>upload_file</span>
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-300">
                    Drop anchor file here
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                    Or click to browse
                  </p>
                  <p className="text-[10px] text-gray-400 dark:text-gray-500 mt-4 px-2">
                    Supports .txt, .md, and code files. This file grounds the AI's inference patterns.
                  </p>
                </div>
              ) : (
                <div className="flex flex-col h-[326px] bg-amber-50 dark:bg-amber-900/10 border border-amber-200 dark:border-amber-800/50 rounded-xl overflow-hidden">
                  <div className="p-3 border-b border-amber-200 dark:border-amber-800/50 flex items-center justify-between bg-amber-100/50 dark:bg-amber-900/30">
                    <div className="flex items-center overflow-hidden mr-2">
                      <span className="material-icons text-amber-600 dark:text-amber-400 text-sm mr-2">description</span>
                      <span className="text-xs font-bold text-amber-800 dark:text-amber-200 truncate">
                        {config.fileContext.name}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={removeFile}
                      className="p-1 hover:bg-amber-200 dark:hover:bg-amber-800 rounded-full text-amber-600 dark:text-amber-400 transition-colors"
                      title="Remove file"
                    >
                      <span className="material-icons text-sm">close</span>
                    </button>
                  </div>
                  <div className="flex-1 p-4 overflow-y-auto">
                    <div className="text-[10px] font-mono text-amber-800/70 dark:text-amber-300/60 whitespace-pre-wrap line-clamp-[15]">
                      {config.fileContext.content}
                    </div>
                  </div>
                  <div className="p-3 bg-amber-100/30 dark:bg-amber-900/20 text-center">
                    <span className="text-[10px] font-semibold text-amber-700 dark:text-amber-400 uppercase tracking-wider">
                      Attached as Anchor Context
                    </span>
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-end space-y-4 sm:space-y-0 sm:space-x-4 pt-2">
            <button type="button" onClick={handleReset} disabled={isLoading} className="w-full sm:w-auto px-6 py-2 border border-gray-300 dark:border-gray-500 rounded-md shadow-sm text-sm font-medium text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 disabled:opacity-50 transition">
              Reset
            </button>
            <button
              type="submit"
              disabled={!config.rawText.trim() || charCount > MAX_CHARS || isLoading}
              className="w-full sm:w-auto flex items-center justify-center px-6 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-amber-600 hover:bg-amber-700 dark:bg-amber-500 dark:hover:bg-amber-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-amber-500 disabled:bg-amber-300 dark:disabled:bg-amber-800 disabled:cursor-not-allowed transition"
            >
              {isLoading ? 'Generating...' : 'Generate Roadmap Task'}
            </button>
          </div>
        </form>
      </div>

      {/* Error Display */}
      {error && (
        <div className="mt-8 bg-red-100 dark:bg-red-900/50 border border-red-400 dark:border-red-700 text-red-700 dark:text-red-200 px-4 py-3 rounded-lg relative" role="alert">
          <strong className="font-bold">Error: </strong>
          <span className="block sm:inline">{error}</span>
        </div>
      )}

      {/* Loading */}
      {isLoading && <LoadingSpinner message={loadingMessage || 'Generating roadmap task...'} />}

      {/* Generated Output */}
      {generatedTask && !isLoading && (
        <div className="mt-8 bg-white dark:bg-gray-800 rounded-2xl shadow-lg overflow-hidden border border-gray-200 dark:border-gray-700">
          <div className="flex flex-col md:flex-row justify-between items-center p-4 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50">
            <h3 className="text-xl font-semibold text-gray-800 dark:text-gray-200">Generated Roadmap Task</h3>
            <div className="flex flex-wrap items-center justify-center md:justify-end gap-3 mt-3 md:mt-0">
              <button onClick={() => handleCopy(generatedTask)} className="flex items-center px-3 py-1.5 border border-gray-300 dark:border-gray-600 rounded-md text-sm text-gray-700 dark:text-gray-200 hover:bg-white dark:hover:bg-gray-700 transition" title="Copy to clipboard">
                <span className="material-icons text-base mr-1.5">content_copy</span>Copy
              </button>
              <button
                onClick={() => { handleExport(saveName, generatedTask); setSuccessMessage('Roadmap task exported successfully!'); }}
                className="flex items-center px-3 py-1.5 border border-gray-300 dark:border-gray-600 rounded-md text-sm text-gray-700 dark:text-gray-200 hover:bg-white dark:hover:bg-gray-700 transition"
                title="Export file"
              >
                <span className="material-icons text-base mr-1.5">download</span>Export
              </button>
              <button onClick={() => setIsSaveModalOpen(true)} className="flex items-center px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-md text-sm transition" title="Save entry">
                <span className="material-icons text-base mr-1.5">save</span>Save
              </button>
            </div>
          </div>

          <div className="p-6">
            <div className="prose prose-sm sm:prose-base dark:prose-invert max-w-none bg-gray-50 dark:bg-gray-900/70 rounded-xl border border-gray-200 dark:border-gray-700 p-6 shadow-inner">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>{generatedTask}</ReactMarkdown>
            </div>
          </div>
        </div>
      )}

      {/* Saved Roadmaps */}
      {savedRoadmaps.length > 0 && (
        <div className="mt-12">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-200">Saved Roadmap Entries</h2>
            <button
              onClick={() => setIsClearAllConfirmOpen(true)}
              className="text-sm text-red-500 hover:text-red-600 flex items-center"
            >
              <span className="material-icons text-sm mr-1">delete_sweep</span> Clear All
            </button>
          </div>

          <div className="mb-6 space-y-4">
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

          <div className="mb-4">
            <div className="relative">
              <span className="material-icons absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">search</span>
              <input
                type="text"
                placeholder="Search saved roadmap entries..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-amber-500 outline-none transition-all"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {savedRoadmaps
              .filter(r => !r.isArchived && !r.isStarred && !r.isPinned && r.name.toLowerCase().includes(searchTerm.toLowerCase()))
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
          <p className="text-gray-600 dark:text-gray-400">
            An unsaved roadmap draft was found. Would you like to restore it?
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
              className="px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 transition-colors shadow-sm"
            >
              Restore Draft
            </button>
          </div>
        </div>
      </Modal>

      {/* Clear All Confirmation */}
      <Modal isOpen={isClearAllConfirmOpen} onClose={() => setIsClearAllConfirmOpen(false)} title="Confirm Clear All">
        <div className="space-y-4">
          <p className="text-gray-600 dark:text-gray-400">
            Are you sure you want to clear ALL roadmap entries? This action cannot be undone.
          </p>
          <div className="flex justify-end space-x-3 mt-6">
            <button
              onClick={() => setIsClearAllConfirmOpen(false)}
              className="px-4 py-2 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md transition"
            >
              Cancel
            </button>
            <button
              onClick={handleClearAll}
              className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition"
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
        onCopy={() => {
          if (previewRoadmap) {
            navigator.clipboard.writeText(previewRoadmap.generatedTask);
            setSuccessMessage('Copied to clipboard!');
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
            <label htmlFor="saveName" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Entry Name</label>
            <input
              type="text"
              id="saveName"
              value={saveName}
              onChange={(e) => setSaveName(e.target.value)}
              placeholder="e.g., Database Schema Migration Task"
              className="w-full px-4 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-amber-500 outline-none transition text-gray-900 dark:text-gray-100"
              autoFocus
            />
          </div>
          <div className="flex justify-end space-x-3 mt-6">
            <button onClick={() => setIsSaveModalOpen(false)} className="px-4 py-2 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md transition">Cancel</button>
            <button
              onClick={handleSaveRoadmap}
              disabled={!saveName.trim()}
              className="px-4 py-2 bg-amber-600 text-white rounded-md hover:bg-amber-700 disabled:opacity-50 transition"
            >
              Save Entry
            </button>
          </div>
        </div>
      </Modal>

      {/* Delete Confirmation */}
      <Modal isOpen={isDeleteConfirmOpen} onClose={() => { setIsDeleteConfirmOpen(false); setDeleteTarget(null); }} title="Confirm Delete">
        <div className="space-y-4">
          <p className="text-gray-600 dark:text-gray-400">
            Are you sure you want to delete this roadmap entry? This action cannot be undone.
          </p>
          <div className="flex justify-end space-x-3 mt-6">
            <button
              onClick={() => { setIsDeleteConfirmOpen(false); setDeleteTarget(null); }}
              className="px-4 py-2 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md transition"
            >
              Cancel
            </button>
            <button
              onClick={confirmDelete}
              className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition"
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
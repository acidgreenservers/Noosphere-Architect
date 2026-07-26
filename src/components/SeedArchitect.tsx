import React, { useState, useCallback, useEffect, useRef } from 'react';
import { SeedConfig, SeedResult, SavedSeed, GenerationStage, StageStatus } from '../types';
import { generateSeedArchitectResult, SeedGenerationProgress } from '../services/ai/seedArchitectService';
import { AbortError } from '../services/ai/openRouter';
import * as db from '../services/dbService';
import CircularSignalGraph from './CircularSignalGraph';
import LoadingSpinner from './LoadingSpinner';
import Modal from './Modal';
import PreviewModal from './PreviewModal';
import LibraryItem from './LibraryItem';
import Toast from './Toast';
import { StarredPinnedBar } from './StarredPinnedBar';
import { UnifiedItem } from '../types';

const SeedArchitect: React.FC = () => {
  const [config, setConfig] = useState<SeedConfig>({
    promptText: '',
    n: 5
  });
  const [result, setResult] = useState<SeedResult | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState('');

  const [generationStages, setGenerationStages] = useState<GenerationStage[]>([
    { key: 'generating', label: 'Regenerating Samples', status: 'waiting' },
    { key: 'extracting', label: 'Extracting Invariants', status: 'waiting' },
    { key: 'evaluating', label: 'Semantic Evaluation', status: 'waiting' },
  ]);
  const [overallProgress, setOverallProgress] = useState(0);
  const [loadingMessage, setLoadingMessage] = useState('');

  const abortControllerRef = useRef<AbortController | null>(null);
  const [savedSeeds, setSavedSeeds] = useState<SavedSeed[]>([]);
  const [searchTerm, setSearchText] = useState('');
  const [previewSeed, setPreviewSeed] = useState<SavedSeed | null>(null);
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<number | null>(null);
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    starredSection: false,
    pinnedSection: false,
    allItemsSection: false
  });

  const [draftStatus, setDraftStatus] = useState<'unloaded' | 'loaded' | 'none'>('unloaded');
  const [pendingDraft, setPendingDraft] = useState<SeedConfig | null>(null);
  const isCheckingDraft = useRef(false);

  const loadSavedSeeds = useCallback(async () => {
    const seeds = await db.getAllSeeds();
    setSavedSeeds(seeds);
  }, []);

  useEffect(() => {
    loadSavedSeeds();
    const loadDraft = async () => {
      if (isCheckingDraft.current) return;
      isCheckingDraft.current = true;
      const draft = await db.getSeedDraft(1);
      if (draft?.config && draft.config.promptText) {
        setPendingDraft(draft.config);
      } else {
        setDraftStatus('none');
      }
    };
    loadDraft();
    // Cleanup temp store on unmount as per requirements
    return () => {
      db.clearSeedTempResponses();
    };
  }, [loadSavedSeeds]);

  useEffect(() => {
    if (draftStatus === 'unloaded') return;
    const handler = setTimeout(() => {
      if (config.promptText) {
        db.saveSeedDraft({ id: 1, config });
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
    setResult(null);
    setGenerationStages([
      { key: 'generating', label: 'Regenerating Samples', status: 'active' },
      { key: 'extracting', label: 'Extracting Invariants', status: 'waiting' },
      { key: 'evaluating', label: 'Semantic Evaluation', status: 'waiting' },
    ]);
    setOverallProgress(0);
    setLoadingMessage('Initializing regeneration loop...');

    try {
      if (!config.promptText) {
        setError("Input Prompt is required.");
        setIsLoading(false);
        return;
      }

      const finalResult = await generateSeedArchitectResult(
        config.promptText,
        config.n,
        (progress: SeedGenerationProgress) => {
          const { stage, current, total } = progress;

          setGenerationStages(prev => prev.map(s => {
            if (s.key === stage) return { ...s, status: 'active' as StageStatus };
            if (stage === 'extracting' && s.key === 'generating') return { ...s, status: 'complete' as StageStatus };
            if (stage === 'evaluating' && (s.key === 'generating' || s.key === 'extracting')) return { ...s, status: 'complete' as StageStatus };
            return s;
          }));

          const stageBaseProgress = stage === 'generating' ? 0 : stage === 'extracting' ? 40 : 80;
          const stageWeight = stage === 'generating' ? 40 : stage === 'extracting' ? 40 : 20;
          const calculatedProgress = stageBaseProgress + (current / total) * stageWeight;
          setOverallProgress(calculatedProgress);

          const stageLabel = stage === 'generating' ? 'Regenerating sample' : stage === 'extracting' ? 'Extracting invariant' : 'Final evaluation';
          setLoadingMessage(`${stageLabel} ${current}/${total}...`);
        },
        controller.signal
      );

      if (!controller.signal.aborted) {
        setResult(finalResult);
        setGenerationStages(prev => prev.map(s => ({ ...s, status: 'complete' as StageStatus })));
        setOverallProgress(100);
        setLoadingMessage('Analysis complete.');
      }
    } catch (e: any) {
      if (e instanceof AbortError || e?.name === 'AbortError') return;
      console.error(e);
      setError(e.message || 'Failed to analyze prompt signal.');
    } finally {
      setIsLoading(false);
      abortControllerRef.current = null;
    }
  }, [config]);

  const handleReset = async () => {
    setConfig({ promptText: '', n: 5 });
    setResult(null);
    setError(null);
    setIsLoading(false);
    await db.clearSeedTempResponses();
    await db.clearSeedDraft(1);
  };

  const handleSave = async () => {
    if (!result) return;
    const responses = await db.getAllSeedTempResponses();
    const newSeed: SavedSeed = {
      name: `Seed: ${config.promptText.substring(0, 30)}...`,
      config,
      result,
      responses,
      createdAt: new Date().toISOString(),
      isStarred: false,
      isPinned: false,
      isArchived: false,
      category: ''
    };
    await db.addSeed(newSeed);
    await db.clearSeedTempResponses();
    await db.clearSeedDraft(1);
    setSuccessMessage('Seed analysis saved successfully!');
    loadSavedSeeds();
    setResult(null);
    setConfig({ promptText: '', n: 5 });
  };

  const handleDelete = (id: number) => {
    setDeleteTarget(id);
    setIsDeleteConfirmOpen(true);
  };

  const confirmDelete = async () => {
    if (deleteTarget === null) return;
    await db.deleteSeed(deleteTarget);
    setSavedSeeds(prev => prev.filter(s => s.id !== deleteTarget));
    setSuccessMessage('Seed analysis deleted.');
    setIsDeleteConfirmOpen(false);
    setDeleteTarget(null);
    setPreviewSeed(null);
  };

  const handleUpdateMetadata = async (seed: SavedSeed, metadata: any) => {
    const updated = { ...seed, ...metadata };
    await db.updateSeed(updated);
    setSavedSeeds(prev => prev.map(s => s.id === seed.id ? updated : s));
    if (previewSeed?.id === seed.id) setPreviewSeed(updated);
  };

  const handleAcceptDraft = () => {
    if (!pendingDraft) return;
    setConfig(pendingDraft);
    setDraftStatus('loaded');
    setPendingDraft(null);
  };

  const handleDeclineDraft = async () => {
    await db.clearSeedDraft(1);
    setDraftStatus('none');
    setPendingDraft(null);
  };

  const seedToUnified = (seed: SavedSeed): UnifiedItem => ({
    id: `seed-${seed.id}`,
    name: seed.name,
    type: 'seed-architect',
    original: seed,
    createdAt: seed.createdAt,
    isStarred: seed.isStarred || false,
    isPinned: seed.isPinned || false,
    isArchived: seed.isArchived || false,
    category: seed.category || ''
  });

  const unifiedSeeds = savedSeeds.map(seedToUnified);

  const handleLoadSeed = (seed: SavedSeed) => {
    setConfig(seed.config);
    setResult(seed.result);
    setPreviewSeed(seed);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="space-y-8">
      <Toast message={successMessage} onClose={() => setSuccessMessage('')} />

      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-6 md:p-8 border border-gray-100 dark:border-gray-700">
        <div className="space-y-6">
          <div>
            <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2 uppercase tracking-wider">
              Input Prompt to Evaluate
            </label>
            <textarea
              value={config.promptText}
              onChange={(e) => setConfig({ ...config, promptText: e.target.value })}
              className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all h-32 resize-none font-mono text-sm"
              placeholder="Paste the prompt you want to stress-test for semantic stability..."
            />
          </div>

          <div className="flex flex-col md:flex-row md:items-center space-y-4 md:space-y-0 md:space-x-6">
            <div className="flex-grow">
              <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 mb-2 uppercase tracking-wider">
                Regeneration Amount (N: 5-20)
              </label>
              <div className="flex items-center space-x-4">
                <input
                  type="range"
                  min="5"
                  max="20"
                  value={config.n}
                  onChange={(e) => setConfig({ ...config, n: parseInt(e.target.value) })}
                  className="flex-grow h-2 bg-gray-200 dark:bg-gray-700 rounded-lg appearance-none cursor-pointer accent-blue-500"
                />
                <span className="w-12 text-center font-bold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/30 px-2 py-1 rounded border border-blue-100 dark:border-blue-800">
                  {config.n}
                </span>
              </div>
            </div>

            <div className="flex space-x-3 pt-6 md:pt-0">
              <button
                onClick={handleReset}
                disabled={isLoading}
                className="px-6 py-3 border border-gray-200 dark:border-gray-700 rounded-xl text-gray-600 dark:text-gray-400 font-bold hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-all disabled:opacity-50"
              >
                Clear
              </button>
              <button
                onClick={handleGenerate}
                disabled={isLoading || !config.promptText}
                className="flex-grow md:flex-grow-0 px-8 py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl shadow-lg shadow-blue-500/20 transition-all disabled:opacity-50 flex items-center justify-center"
              >
                {isLoading ? <><span className="material-icons animate-spin text-sm mr-2">sync</span> Evaluating...</> : 'Verify Seed Signal'}
              </button>
            </div>
          </div>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 border-l-4 border-red-500 p-4 rounded-r-xl">
          <div className="flex items-center">
            <span className="material-icons text-red-500 mr-3">error_outline</span>
            <p className="text-red-700 dark:text-red-300 font-medium">{error}</p>
          </div>
        </div>
      )}

      {/* Progress Indicator */}
      {isLoading && (
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-6 md:p-8 border border-gray-100 dark:border-gray-700 animate-in fade-in slide-in-from-bottom-4 duration-500">
          <h3 className="text-lg font-bold text-gray-800 dark:text-gray-200 mb-6 flex items-center">
            <span className="material-icons mr-2 text-blue-500">analytics</span>
            Analyzing Signal Stability
          </h3>

          <div className="space-y-4 mb-8">
            {generationStages.map((stage) => (
              <div key={stage.key} className="flex items-center">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center mr-4 transition-all duration-500 ${
                  stage.status === 'complete' ? 'bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400' :
                  stage.status === 'active' ? 'bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400 ring-4 ring-blue-500/10' :
                  'bg-gray-100 text-gray-400 dark:bg-gray-700 dark:text-gray-500'
                }`}>
                  <span className="material-icons text-sm">
                    {stage.status === 'complete' ? 'check' : stage.status === 'active' ? 'sync' : 'hourglass_empty'}
                  </span>
                </div>
                <div className="flex-grow">
                  <div className="flex justify-between items-center mb-1">
                    <span className={`text-sm font-bold ${
                      stage.status === 'complete' ? 'text-green-600 dark:text-green-400' :
                      stage.status === 'active' ? 'text-blue-600 dark:text-blue-400' :
                      'text-gray-400 dark:text-gray-500'
                    }`}>
                      {stage.label}
                    </span>
                    <span className="text-[10px] font-black uppercase tracking-tighter text-gray-400">
                      {stage.status === 'active' ? 'Processing' : stage.status}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="relative pt-1">
            <div className="overflow-hidden h-2 mb-4 text-xs flex rounded-full bg-gray-100 dark:bg-gray-700">
              <div
                style={{ width: `${overallProgress}%` }}
                className="shadow-none flex flex-col text-center whitespace-nowrap text-white justify-center bg-blue-500 transition-all duration-700 ease-in-out"
              />
            </div>
            <p className="text-xs text-center text-gray-500 dark:text-gray-400 font-medium italic">
              {loadingMessage}
            </p>
          </div>
        </div>
      )}

      {result && !isLoading && (
        <div className="space-y-6 animate-in fade-in zoom-in-95 duration-700">
          <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-2xl p-6 md:p-8 border border-gray-100 dark:border-gray-700/60 space-y-6">
            {/* Top Bento Header Bar: Chips & Badges */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="md:col-span-1 bg-gray-50 dark:bg-gray-900/60 p-4 rounded-2xl border border-gray-100 dark:border-gray-800 flex flex-col justify-center items-center">
                <span className={`px-4 py-1.5 rounded-full text-xs font-black uppercase tracking-[0.2em] shadow-sm ${
                  result.status === 'Pass' 
                  ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30' 
                  : 'bg-rose-500/15 text-rose-600 dark:text-rose-400 border border-rose-500/30'
                }`}>
                  Verification: {result.status}
                </span>
                <div className="mt-3 flex flex-wrap justify-center gap-2">
                  <span className="text-[11px] font-bold px-2.5 py-1 rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20">
                    Tightness: {result.graphData.tightness}/10
                  </span>
                  <span className="text-[11px] font-bold px-2.5 py-1 rounded-lg bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20">
                    Gradient: {result.graphData.gradient}
                  </span>
                </div>
              </div>

              <div className="md:col-span-2 bg-gray-50 dark:bg-gray-900/60 p-4 rounded-2xl border border-gray-100 dark:border-gray-800 flex flex-col justify-center">
                <h4 className="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-1 flex items-center">
                  <span className="material-icons text-sm mr-1 text-blue-500">label</span>
                  Theme & Signals
                </h4>
                <p className="text-sm font-semibold text-gray-800 dark:text-gray-200">
                  {result.graphData.recurringTheme}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 italic">
                  {result.graphData.semanticSignals}
                </p>
              </div>
            </div>

            {/* Main Bento Row: Circular Graph Tile + Explanation Tile */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
              <div className="lg:col-span-5 bg-gray-50 dark:bg-gray-900/40 p-5 rounded-2xl border border-gray-100 dark:border-gray-800 flex items-center justify-center">
                <CircularSignalGraph data={result.graphData} />
              </div>

              <div className="lg:col-span-7 flex flex-col justify-between">
                <div className="flex-1 flex flex-col">
                  <h4 className="text-lg font-bold text-gray-900 dark:text-gray-100 mb-3 flex items-center">
                     <span className="material-icons mr-2 text-blue-500">description</span>
                     Analysis Details
                  </h4>
                  <div className="prose prose-sm dark:prose-invert max-w-none text-gray-600 dark:text-gray-300 leading-relaxed bg-gray-50 dark:bg-gray-900/60 p-5 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-inner flex-1 min-h-[220px] overflow-y-auto custom-scrollbar">
                      {result.explanation}
                  </div>
                </div>

                <div className="mt-6 flex space-x-4">
                  <button
                    onClick={handleReset}
                    className="flex-grow px-6 py-3 border border-gray-200 dark:border-gray-700 rounded-xl font-bold text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-all"
                  >
                    Discard
                  </button>
                  <button
                    onClick={handleSave}
                    className="flex-grow px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl shadow-lg shadow-blue-500/20 transition-all flex items-center justify-center"
                  >
                    <span className="material-icons mr-2">save</span>
                    Save Final Result
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Saved List */}
      {savedSeeds.length > 0 && (
        <div className="mt-12 space-y-6">
          <div className="flex justify-between items-center">
            <h2 className="text-2xl font-black text-gray-900 dark:text-gray-100 uppercase tracking-tight flex items-center">
              <span className="material-icons mr-2 text-blue-500">folder_special</span>
              Saved Seed Analyses
            </h2>
          </div>

          <div className="space-y-4">
            <StarredPinnedBar
              type="starred"
              items={unifiedSeeds}
              expanded={expandedSections.starredSection}
              onToggleExpand={() => setExpandedSections(prev => ({ ...prev, starredSection: !prev.starredSection }))}
              onToggleStar={(item) => handleUpdateMetadata(item.original, { isStarred: !item.original.isStarred })}
              onTogglePin={(item) => handleUpdateMetadata(item.original, { isPinned: !item.original.isPinned })}
              onToggleArchive={(item) => handleUpdateMetadata(item.original, { isArchived: true })}
              onDelete={(item) => handleDelete(item.original.id!)}
              onEdit={() => {}}
              onSelect={(id) => { const s = savedSeeds.find(item => `seed-${item.id}` === id); if (s) handleLoadSeed(s); }}
              selectedIds={new Set()}
            />
            <StarredPinnedBar
              type="pinned"
              items={unifiedSeeds}
              expanded={expandedSections.pinnedSection}
              onToggleExpand={() => setExpandedSections(prev => ({ ...prev, pinnedSection: !prev.pinnedSection }))}
              onToggleStar={(item) => handleUpdateMetadata(item.original, { isStarred: !item.original.isStarred })}
              onTogglePin={(item) => handleUpdateMetadata(item.original, { isPinned: !item.original.isPinned })}
              onToggleArchive={(item) => handleUpdateMetadata(item.original, { isArchived: true })}
              onDelete={(item) => handleDelete(item.original.id!)}
              onEdit={() => {}}
              onSelect={(id) => { const s = savedSeeds.find(item => `seed-${item.id}` === id); if (s) handleLoadSeed(s); }}
              selectedIds={new Set()}
            />

            <div className="relative">
              <span className="material-icons absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">search</span>
              <input
                type="text"
                placeholder="Search seed analyses..."
                value={searchTerm}
                onChange={(e) => setSearchText(e.target.value)}
                className="w-full pl-12 pr-4 py-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl focus:ring-2 focus:ring-blue-500 outline-none transition-all shadow-sm"
              />
            </div>

            <div className="space-y-3">
              {savedSeeds
                .filter(s => !s.isArchived && !s.isStarred && !s.isPinned && (s.name.toLowerCase().includes(searchTerm.toLowerCase()) || getDeepSearchText(s).includes(searchTerm.toLowerCase())))
                .map(seed => (
                  <LibraryItem
                    key={seed.id}
                    name={seed.name}
                    createdAt={seed.createdAt}
                    metadata={seed}
                    icon="auto_awesome"
                    onPreview={() => handleLoadSeed(seed)}
                    onEdit={() => {}}
                    onDelete={() => handleDelete(seed.id!)}
                    onToggleStar={() => handleUpdateMetadata(seed, { isStarred: !seed.isStarred })}
                    onTogglePin={() => handleUpdateMetadata(seed, { isPinned: !seed.isPinned })}
                    onToggleArchive={() => handleUpdateMetadata(seed, { isArchived: true })}
                    onClick={() => handleLoadSeed(seed)}
                  />
                ))}
            </div>
          </div>
        </div>
      )}

      {/* Preview Modal */}
      <PreviewModal
        isOpen={!!previewSeed}
        onClose={() => setPreviewSeed(null)}
        title={previewSeed?.name || 'Preview'}
        seedArchitect={previewSeed || undefined}
        content={previewSeed ? {
          'Analysis Result.md': `# Verification: ${previewSeed.result.status}\n\n${previewSeed.result.explanation}\n\n## Metrics\n- Theme: ${previewSeed.result.graphData.recurringTheme}\n- Signals: ${previewSeed.result.graphData.semanticSignals}\n- Gradient: ${previewSeed.result.graphData.gradient}\n- Tightness: ${previewSeed.result.graphData.tightness}/10`,
          'Original Prompt.md': previewSeed.config.promptText,
          'Extracted Invariants.md': previewSeed.result.seeds.map((s, i) => `${i+1}. ${s}`).join('\n'),
          'Full Response Table.md': previewSeed.responses.map((r, i) => `### Response ${i+1}\n\n${r}`).join('\n\n')
        } : undefined}
        metadata={previewSeed || undefined}
        onUpdateMetadata={(m) => previewSeed && handleUpdateMetadata(previewSeed, m)}
        onCopy={() => {
          if (!previewSeed) return;
          const text = `# Verification: ${previewSeed.result.status}\n\n${previewSeed.result.explanation}`;
          navigator.clipboard.writeText(text);
        }}
        onExport={() => {}}
      />

      <Modal isOpen={!!pendingDraft} onClose={() => setPendingDraft(null)} title="Unsaved Draft Found">
        <div className="space-y-4">
            <p className="text-gray-600 dark:text-gray-400">
                An unsaved seed architect draft was found. Would you like to restore it?
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

      {/* Delete Confirmation */}
      <Modal isOpen={isDeleteConfirmOpen} onClose={() => setIsDeleteConfirmOpen(false)} title="Confirm Deletion">
          <div className="space-y-4">
              <p className="text-gray-600 dark:text-gray-400 font-medium">Are you sure you want to delete this seed analysis? This action cannot be undone.</p>
              <div className="flex justify-end space-x-3 pt-4">
                  <button onClick={() => setIsDeleteConfirmOpen(false)} className="px-5 py-2 border border-gray-200 dark:border-gray-700 rounded-xl transition-colors font-bold text-gray-500">Cancel</button>
                  <button onClick={confirmDelete} className="px-5 py-2 bg-red-600 text-white rounded-xl hover:bg-red-700 transition-colors font-bold shadow-lg shadow-red-500/20">Delete Permanentely</button>
              </div>
          </div>
      </Modal>
    </div>
  );
};

export default SeedArchitect;

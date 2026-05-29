import React, { useState, useCallback, useEffect, useRef } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { DesignConversation, DesignStep, DesignStepType, DesignTemplate, UnifiedItem } from '../types';
import * as db from '../services/dbService';
import {
  PHASE_LABELS,
  getNextPhase,
  getPrevPhase,
  accumulatePrompt,
  accumulatePromptDisplay,
  buildStepTimeline,
  createStep,
  createNewConversation,
  generateStepId,
} from '../services/ai/designService';
import LoadingSpinner from './LoadingSpinner';
import Modal from './Modal';
import Toast from './Toast';
import { StarredPinnedBar } from './StarredPinnedBar';

const DESIGN_STARTERS: Array<{
  name: string;
  description: string;
  steps: Array<{ stepType: DesignStepType; userInput: string }>;
}> = [
  {
    name: 'Marathon Runner App',
    description: 'Community & training app — high-level start',
    steps: [
      { stepType: 'start', userInput: 'An app for marathon runners to engage with a community, find partners, get training advice, and find races near them.' },
      { stepType: 'vibe', userInput: 'A vibrant and encouraging fitness tracking app.' },
    ],
  },
  {
    name: 'Japandi Tea Store',
    description: 'Product detail page — detailed start',
    steps: [
      { stepType: 'start', userInput: 'Product detail page for a Japandi-styled tea store. Sells herbal teas, ceramics. Neutral, minimal colors, black buttons. Soft, elegant font.' },
    ],
  },
  {
    name: 'Workwear Athletics',
    description: 'Product detail page — vibe-first approach',
    steps: [
      { stepType: 'start', userInput: 'Product detail page for Japanese workwear-inspired men\'s athletic apparel.' },
      { stepType: 'vibe', userInput: 'Dark, minimal design, dark blue primary color. Minimal clothing pictures, natural fabrics, not gaudy.' },
    ],
  },
  {
    name: 'Blank Canvas',
    description: 'Start from scratch — pick your own phases',
    steps: [{ stepType: 'start', userInput: '' }],
  },
];

const DesignArchitect: React.FC = () => {
  // ── Core state ──────────────────────────────────────────────────
  const [conversation, setConversation] = useState<DesignConversation>(() => createNewConversation());
  const [savedConversations, setSavedConversations] = useState<DesignConversation[]>([]);
  const [currentStepInput, setCurrentStepInput] = useState('');
  const [isDirty, setIsDirty] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // ── Library & modals ────────────────────────────────────────────
  const [searchTerm, setSearchTerm] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isTemplateModalOpen, setIsTemplateModalOpen] = useState(false);
  const [isSaveModalOpen, setIsSaveModalOpen] = useState(false);
  const [isBranchModalOpen, setIsBranchModalOpen] = useState(false);
  const [branchLabelInput, setBranchLabelInput] = useState('');
  const [saveNameInput, setSaveNameInput] = useState('');
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
  const [previewConversation, setPreviewConversation] = useState<DesignConversation | null>(null);
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    starredSection: true,
    pinnedSection: true,
    allItemsSection: true,
  });
  const [isLibraryOpen, setIsLibraryOpen] = useState(false);

  // ── Derived ─────────────────────────────────────────────────────
  const activeStep = conversation.steps.find(s => s.id === conversation.activeStepId) || conversation.steps[0];
  const timeline = buildStepTimeline(activeStep, conversation.steps);
  const accumulatedPrompt = activeStep ? accumulatePrompt(activeStep, conversation.steps) : '';
  const accumulatedDisplay = activeStep ? accumulatePromptDisplay(activeStep, conversation.steps) : '';

  // Find sibling steps at the same parent for branch counting
  const activeParentId = activeStep?.parentStepId;
  const siblingBranches = conversation.steps.filter(
    s => s.parentStepId === activeParentId && s.id !== activeStep?.id && s.branchLabel
  );

  // ── Load saved conversations ────────────────────────────────────
  const loadSaved = useCallback(async () => {
    try {
      const convos = await db.getAllDesignConversations();
      setSavedConversations(convos);
    } catch (e) {
      // silent
    }
  }, []);

  useEffect(() => {
    loadSaved();
  }, [loadSaved]);

  // ── Draft persistence ───────────────────────────────────────────
  const draftTimeoutRef = useRef<number | null>(null);
  useEffect(() => {
    if (!isDirty) return;
    if (draftTimeoutRef.current) clearTimeout(draftTimeoutRef.current);
    draftTimeoutRef.current = window.setTimeout(async () => {
      try {
        await db.saveDesignConversationDraft({ id: 'current', conversation });
      } catch {
        // silent
      }
    }, 1500);
    return () => {
      if (draftTimeoutRef.current) clearTimeout(draftTimeoutRef.current);
    };
  }, [conversation, isDirty]);

  // ── Check for draft on mount ────────────────────────────────────
  const draftCheckedRef = useRef(false);
  useEffect(() => {
    if (draftCheckedRef.current) return;
    draftCheckedRef.current = true;
    (async () => {
      try {
        const draft = await db.getDesignConversationDraft('current');
        if (draft?.conversation && draft.conversation.steps.length > 0) {
          setConversation(draft.conversation);
          setIsDirty(true);
        }
      } catch {
        // silent
      }
    })();
  }, []);

  // ── Navigation helpers ──────────────────────────────────────────
  const getActiveStep = useCallback(() => {
    return conversation.steps.find(s => s.id === conversation.activeStepId) || conversation.steps[0];
  }, [conversation]);

  const updateConversation = useCallback((updates: Partial<DesignConversation>) => {
    setConversation(prev => ({
      ...prev,
      ...updates,
      updatedAt: new Date().toISOString(),
    }));
    setIsDirty(true);
  }, []);

  // ── Step management ─────────────────────────────────────────────
  const handleStepInputChange = (value: string) => {
    setCurrentStepInput(value);
  };

  const applyInputToCurrentStep = useCallback(() => {
    setConversation(prev => {
      const updatedSteps = prev.steps.map(s =>
        s.id === prev.activeStepId ? { ...s, userInput: currentStepInput } : s
      );
      return { ...prev, steps: updatedSteps, updatedAt: new Date().toISOString() };
    });
    setIsDirty(true);
  }, [currentStepInput]);

  const handleNavigateToStep = (stepId: string) => {
    // Apply current input first before navigating
    applyInputToCurrentStep();
    const step = conversation.steps.find(s => s.id === stepId);
    if (step) {
      setConversation(prev => ({ ...prev, activeStepId: stepId, updatedAt: new Date().toISOString() }));
      setCurrentStepInput(step.userInput);
    }
  };

  const handleContinue = () => {
    const active = getActiveStep();
    const nextPhase = getNextPhase(active.stepType);
    if (!nextPhase) return;

    // Save current input
    applyInputToCurrentStep();

    // Create new step
    const maxOrder = conversation.steps.reduce((max, s) => Math.max(max, s.order), 0);
    const newStep = createStep(nextPhase, '', active.id, null, maxOrder + 1);

    setConversation(prev => ({
      ...prev,
      steps: [...prev.steps, newStep],
      activeStepId: newStep.id,
      updatedAt: new Date().toISOString(),
    }));
    setCurrentStepInput('');
    setIsDirty(true);
  };

  const handleBack = () => {
    const active = getActiveStep();
    if (!active.parentStepId) return;

    // Save current input
    applyInputToCurrentStep();

    const parentStep = conversation.steps.find(s => s.id === active.parentStepId);
    if (parentStep) {
      setConversation(prev => ({ ...prev, activeStepId: parentStep.id, updatedAt: new Date().toISOString() }));
      setCurrentStepInput(parentStep.userInput);
    }
  };

  const handleBranchHere = () => {
    setIsBranchModalOpen(true);
  };

  const handleConfirmBranch = () => {
    const active = getActiveStep();
    applyInputToCurrentStep();

    const nextPhase = getNextPhase(active.stepType) || active.stepType;
    const maxOrder = conversation.steps.reduce((max, s) => Math.max(max, s.order), 0);
    const newStep = createStep(
      nextPhase,
      '',
      active.id,
      branchLabelInput.trim() || `Branch ${siblingBranches.length + 1}`,
      maxOrder + 1
    );

    setConversation(prev => ({
      ...prev,
      steps: [...prev.steps, newStep],
      activeStepId: newStep.id,
      updatedAt: new Date().toISOString(),
    }));
    setCurrentStepInput('');
    setIsBranchModalOpen(false);
    setBranchLabelInput('');
    setIsDirty(true);
  };

  const handleSwitchBranch = (stepId: string) => {
    applyInputToCurrentStep();
    const target = conversation.steps.find(s => s.id === stepId);
    if (target) {
      setConversation(prev => ({ ...prev, activeStepId: stepId, updatedAt: new Date().toISOString() }));
      setCurrentStepInput(target.userInput);
    }
  };

  // ── Phase tab click ─────────────────────────────────────────────
  const handlePhaseTabClick = (phase: DesignStepType) => {
    const active = getActiveStep();
    if (active.stepType === phase) return;

    // Check if there's already a step of this phase in the current path
    const pathSteps = conversation.steps.filter(s => {
      let current: DesignStep | undefined = s;
      while (current) {
        if (current.id === active.id) return true;
        current = current.parentStepId ? conversation.steps.find(ps => ps.id === current!.parentStepId) : undefined;
      }
      return false;
    });

    const existing = pathSteps.find(s => s.stepType === phase && s.parentStepId === active.id);
    if (existing) {
      handleNavigateToStep(existing.id);
      return;
    }

    // Create new step at this phase
    applyInputToCurrentStep();
    const maxOrder = conversation.steps.reduce((max, s) => Math.max(max, s.order), 0);
    const newStep = createStep(phase, '', active.id, null, maxOrder + 1);
    setConversation(prev => ({
      ...prev,
      steps: [...prev.steps, newStep],
      activeStepId: newStep.id,
      updatedAt: new Date().toISOString(),
    }));
    setCurrentStepInput('');
    setIsDirty(true);
  };

  // ── Template / New Conversation ─────────────────────────────────
  const handleLoadTemplate = (template: typeof DESIGN_STARTERS[0]) => {
    const newConv = createNewConversation();
    newConv.steps = template.steps.map((s, i) => createStep(s.stepType, s.userInput, i === 0 ? null : newConv.steps[i - 1]?.id || null, null, i));
    newConv.rootStepId = newConv.steps[0].id;
    newConv.activeStepId = newConv.steps[newConv.steps.length - 1].id;
    newConv.name = template.name;
    setConversation(newConv);
    setCurrentStepInput(newConv.steps[newConv.steps.length - 1].userInput);
    setIsTemplateModalOpen(false);
    setIsDirty(true);
  };

  const handleNewConversation = () => {
    const newConv = createNewConversation('');
    setConversation(newConv);
    setCurrentStepInput('');
    setIsDirty(false);
  };

  // ── Save / Load ─────────────────────────────────────────────────
  const handleOpenSaveModal = () => {
    setSaveNameInput(conversation.name);
    setIsSaveModalOpen(true);
  };

  const handleSaveConversation = async () => {
    if (!saveNameInput.trim()) return;
    try {
      applyInputToCurrentStep();
      const toSave: DesignConversation = {
        ...conversation,
        name: saveNameInput.trim(),
        updatedAt: new Date().toISOString(),
      };

      if (conversation.id) {
        await db.updateDesignConversation(toSave);
      } else {
        const id = await db.addDesignConversation(toSave);
        setConversation(prev => ({ ...prev, id }));
      }
      await db.clearDesignConversationDraft('current');
      setSuccessMessage('Conversation saved!');
      setIsSaveModalOpen(false);
      setIsDirty(false);
      loadSaved();
    } catch (e: any) {
      setErrorMessage('Failed to save: ' + e.message);
    }
  };

  const handleLoadConversation = (conv: DesignConversation) => {
    applyInputToCurrentStep();
    setConversation(conv);
    const active = conv.steps.find(s => s.id === conv.activeStepId) || conv.steps[0];
    setCurrentStepInput(active?.userInput || '');
    setIsDirty(false);
  };

  const handleDeleteConversation = async () => {
    if (!previewConversation?.id) return;
    try {
      await db.deleteDesignConversation(previewConversation.id);
      setSavedConversations(prev => prev.filter(c => c.id !== previewConversation.id));
      setSuccessMessage('Deleted successfully.');
      setPreviewConversation(null);
      setIsDeleteConfirmOpen(false);
    } catch {
      setErrorMessage('Failed to delete.');
    }
  };

  const handleUpdateMetadata = async (conv: DesignConversation, metadata: any) => {
    const updated = { ...conv, ...metadata };
    await db.updateDesignConversation(updated);
    setSavedConversations(prev => prev.map(c => c.id === conv.id ? updated : c));
  };

  // ── Clipboard ───────────────────────────────────────────────────
  const handleCopyPrompt = () => {
    navigator.clipboard.writeText(accumulatedPrompt);
    setSuccessMessage('Full prompt (with attractor grammar) copied!');
  };

  const handleCopyDisplay = () => {
    navigator.clipboard.writeText(accumulatedDisplay);
    setSuccessMessage('Prompt display copied!');
  };

  // ── Unified items for library ───────────────────────────────────
  const conversationToUnified = (conv: DesignConversation): UnifiedItem => ({
    id: `design-conversation-${conv.id}`,
    name: conv.name,
    type: 'design-conversation',
    original: conv,
    createdAt: conv.createdAt,
    isStarred: !!conv.isStarred,
    isPinned: !!conv.isPinned,
    isArchived: !!conv.isArchived,
    category: conv.category || '',
  });

  const allUnified = savedConversations.map(conversationToUnified);
  const filteredConversations = savedConversations.filter(c =>
    !c.isArchived && c.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // ── Render ──────────────────────────────────────────────────────
  return (
    <div className="max-w-6xl mx-auto">
      <Toast message={successMessage} onClose={() => setSuccessMessage('')} />

      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-3xl font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2">
            <span className="material-icons text-teal-500">design_services</span>
            Design Architect
          </h2>
          <p className="text-gray-600 dark:text-gray-400">
            Chain Stitch methodology prompts with branching, looping, and semantic grounding.
          </p>
        </div>
        <div className="flex space-x-2">
          <button
            onClick={() => setIsTemplateModalOpen(true)}
            className="flex items-center px-3 py-2 border border-teal-500 text-teal-600 dark:text-teal-400 dark:border-teal-400 rounded-lg text-sm font-medium hover:bg-teal-50 dark:hover:bg-teal-900/30 transition"
          >
            <span className="material-icons text-base mr-1">model_training</span>
            Starters
          </button>
          <button
            onClick={handleNewConversation}
            className="flex items-center px-3 py-2 border border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-300 rounded-lg text-sm hover:bg-gray-50 dark:hover:bg-gray-800 transition"
          >
            <span className="material-icons text-base mr-1">add</span>
            New
          </button>
          <button
            onClick={() => { applyInputToCurrentStep(); handleOpenSaveModal(); }}
            className="flex items-center px-3 py-2 bg-teal-600 text-white rounded-lg text-sm font-medium hover:bg-teal-700 transition shadow-sm"
          >
            <span className="material-icons text-base mr-1">save</span>
            Save
          </button>
          <button
            onClick={() => setIsLibraryOpen(!isLibraryOpen)}
            className={`flex items-center px-3 py-2 rounded-lg text-sm font-medium transition border ${
              isLibraryOpen
                ? 'bg-teal-100 dark:bg-teal-900/40 border-teal-300 dark:border-teal-700 text-teal-700 dark:text-teal-300'
                : 'border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800'
            }`}
          >
            <span className="material-icons text-base mr-1">folder_open</span>
            Library
          </button>
        </div>
      </div>

      {/* Main layout */}
      <div className="flex flex-col lg:flex-row gap-6">
        {/* Left pane: Conversation Tree / Library */}
        <div className={`${isLibraryOpen ? 'block' : 'hidden'} lg:block lg:w-80 xl:w-96 flex-shrink-0`}>
          {/* Library panel */}
          {savedConversations.length > 0 && (
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-4 mb-4">
              <div className="relative mb-3">
                <span className="material-icons absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">search</span>
                <input
                  type="text"
                  placeholder="Search conversations..."
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg text-sm focus:ring-2 focus:ring-teal-500 outline-none"
                />
              </div>

              <StarredPinnedBar
                type="starred"
                items={allUnified}
                expanded={expandedSections.starredSection}
                onToggleExpand={() => setExpandedSections(prev => ({ ...prev, starredSection: !prev.starredSection }))}
                onToggleStar={(item) => handleUpdateMetadata(item.original, { isStarred: !item.original.isStarred })}
                onTogglePin={(item) => handleUpdateMetadata(item.original, { isPinned: !item.original.isPinned })}
                onToggleArchive={(item) => handleUpdateMetadata(item.original, { isArchived: true })}
                onDelete={(item) => { setPreviewConversation(item.original); setIsDeleteConfirmOpen(true); }}
                onSelect={(id) => {
                  const conv = savedConversations.find(c => `design-conversation-${c.id}` === id);
                  if (conv) handleLoadConversation(conv);
                }}
                selectedIds={new Set()}
                onEdit={() => {}}
              />
              <StarredPinnedBar
                type="pinned"
                items={allUnified}
                expanded={expandedSections.pinnedSection}
                onToggleExpand={() => setExpandedSections(prev => ({ ...prev, pinnedSection: !prev.pinnedSection }))}
                onToggleStar={(item) => handleUpdateMetadata(item.original, { isStarred: !item.original.isStarred })}
                onTogglePin={(item) => handleUpdateMetadata(item.original, { isPinned: !item.original.isPinned })}
                onToggleArchive={(item) => handleUpdateMetadata(item.original, { isArchived: true })}
                onDelete={(item) => { setPreviewConversation(item.original); setIsDeleteConfirmOpen(true); }}
                onSelect={(id) => {
                  const conv = savedConversations.find(c => `design-conversation-${c.id}` === id);
                  if (conv) handleLoadConversation(conv);
                }}
                selectedIds={new Set()}
                onEdit={() => {}}
              />

              <div className="space-y-2 max-h-96 overflow-y-auto">
                {filteredConversations.map(conv => (
                  <button
                    key={conv.id}
                    onClick={() => handleLoadConversation(conv)}
                    className={`w-full text-left p-3 rounded-lg border transition text-sm ${
                      conv.id === conversation.id
                        ? 'bg-teal-50 dark:bg-teal-900/30 border-teal-300 dark:border-teal-700'
                        : 'bg-gray-50 dark:bg-gray-700/50 border-gray-200 dark:border-gray-600 hover:bg-teal-50 dark:hover:bg-teal-900/20'
                    }`}
                  >
                    <div className="font-medium text-gray-800 dark:text-gray-200 truncate">{conv.name}</div>
                    <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                      {conv.steps.length} step{conv.steps.length !== 1 ? 's' : ''} · {new Date(conv.updatedAt).toLocaleDateString()}
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Step history tree */}
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-4">
            <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider mb-3 flex items-center">
              <span className="material-icons text-base mr-1">account_tree</span>
              Step History
            </h3>

            {/* Build tree structure */}
            {(() => {
              // Get all root steps (those with no parentStepId, or parent not in steps list)
              const rootSteps = conversation.steps.filter(s => !s.parentStepId || !conversation.steps.find(ps => ps.id === s.parentStepId));
              // Build tree recursively
              const renderBranch = (step: DesignStep, depth: number = 0) => {
                const children = conversation.steps.filter(s => s.parentStepId === step.id);
                const isActive = step.id === conversation.activeStepId;
                return (
                  <div key={step.id}>
                    <button
                      onClick={() => handleNavigateToStep(step.id)}
                      className={`w-full text-left flex items-center gap-2 px-2 py-1.5 rounded-md text-sm transition ${
                        isActive
                          ? 'bg-teal-100 dark:bg-teal-900/40 text-teal-700 dark:text-teal-300 font-medium'
                          : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700/50'
                      }`}
                      style={{ paddingLeft: `${12 + depth * 16}px` }}
                    >
                      <span className="material-icons text-xs flex-shrink-0">
                        {isActive ? 'chevron_right' : 'circle'}
                      </span>
                      <span className="flex-shrink-0 text-xs opacity-60 uppercase font-mono">{step.stepType}</span>
                      <span className="truncate text-xs">{step.userInput.slice(0, 30) || '...'}</span>
                      {step.branchLabel && (
                        <span className="ml-auto text-xs bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300 px-1.5 py-0.5 rounded">
                          {step.branchLabel}
                        </span>
                      )}
                    </button>
                    {children.map(child => renderBranch(child, depth + 1))}
                  </div>
                );
              };

              return rootSteps.map(root => renderBranch(root));
            })()}
          </div>
        </div>

        {/* Right pane: Active workspace */}
        <div className="flex-1 min-w-0">
          {/* Phase tabs */}
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg overflow-hidden mb-4">
            <div className="flex overflow-x-auto border-b border-gray-200 dark:border-gray-700">
              {(Object.entries(PHASE_LABELS) as [DesignStepType, typeof PHASE_LABELS['start']][]).map(([phase, info]) => {
                const isActive = activeStep?.stepType === phase;
                const hasStep = conversation.steps.some(s => s.stepType === phase);
                return (
                  <button
                    key={phase}
                    onClick={() => handlePhaseTabClick(phase)}
                    className={`flex items-center gap-1.5 px-4 py-3 text-sm font-medium whitespace-nowrap border-b-2 transition ${
                      isActive
                        ? 'border-teal-500 text-teal-600 dark:text-teal-400'
                        : 'border-transparent text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 hover:border-gray-300 dark:hover:border-gray-600'
                    }`}
                  >
                    <span className="material-icons text-base">{info.icon}</span>
                    <span>{info.label}</span>
                    {hasStep && !isActive && (
                      <span className="w-1.5 h-1.5 rounded-full bg-teal-400"></span>
                    )}
                  </button>
                );
              })}
            </div>

            {/* Phase description */}
            {activeStep && (
              <div className="px-5 py-2 bg-gray-50 dark:bg-gray-900/30 border-b border-gray-100 dark:border-gray-700/50">
                <span className="text-xs text-gray-500 dark:text-gray-400">
                  {PHASE_LABELS[activeStep.stepType].description}
                </span>
              </div>
            )}
          </div>

          <div className="flex flex-col xl:flex-row gap-4">
            {/* Left column: input + controls */}
            <div className="flex-1 min-w-0 space-y-4">
              {/* Input area */}
              <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-5">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  {PHASE_LABELS[activeStep?.stepType || 'start'].label} — Your Input
                </label>
                <textarea
                  value={currentStepInput}
                  onChange={e => handleStepInputChange(e.target.value)}
                  onBlur={applyInputToCurrentStep}
                  placeholder={`Describe your ${activeStep?.stepType || 'start'} details here...`}
                  rows={5}
                  className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl text-sm focus:ring-2 focus:ring-teal-500 outline-none resize-y"
                />
              </div>

              {/* Navigation controls */}
              <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-4">
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    onClick={() => { applyInputToCurrentStep(); handleBack(); }}
                    disabled={!activeStep?.parentStepId}
                    className="flex items-center px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-30 disabled:cursor-not-allowed transition"
                  >
                    <span className="material-icons text-base mr-1">arrow_back</span>
                    Back
                  </button>
                  <button
                    onClick={() => { applyInputToCurrentStep(); handleContinue(); }}
                    disabled={!getNextPhase(activeStep?.stepType || 'start')}
                    className="flex items-center px-4 py-2 bg-teal-600 text-white rounded-lg text-sm font-medium hover:bg-teal-700 disabled:opacity-30 disabled:cursor-not-allowed transition shadow-sm"
                  >
                    Continue
                    <span className="material-icons text-base ml-1">arrow_forward</span>
                  </button>
                  <button
                    onClick={() => { applyInputToCurrentStep(); handleBranchHere(); }}
                    className="flex items-center px-3 py-2 border border-amber-500 text-amber-600 dark:text-amber-400 dark:border-amber-400 rounded-lg text-sm font-medium hover:bg-amber-50 dark:hover:bg-amber-900/30 transition"
                  >
                    <span className="material-icons text-base mr-1">call_split</span>
                    Branch Here
                  </button>

                  {siblingBranches.length > 0 && (
                    <div className="flex items-center gap-1 ml-2 pl-2 border-l border-gray-200 dark:border-gray-600">
                      <span className="text-xs text-gray-500 mr-1">Branches:</span>
                      {siblingBranches.map(branch => (
                        <button
                          key={branch.id}
                          onClick={() => handleSwitchBranch(branch.id)}
                          className="px-2 py-1 text-xs rounded bg-amber-50 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-700 hover:bg-amber-100 dark:hover:bg-amber-900/50 transition"
                        >
                          {branch.branchLabel}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Accumulated prompt preview */}
              <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg overflow-hidden border border-gray-200 dark:border-gray-700">
                <div className="flex justify-between items-center px-5 py-3 bg-gray-50 dark:bg-gray-900/50 border-b border-gray-200 dark:border-gray-700">
                  <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider flex items-center">
                    <span className="material-icons text-base mr-1">view_timeline</span>
                    Accumulated Prompt
                  </h3>
                  <div className="flex space-x-2">
                    <button
                      onClick={handleCopyDisplay}
                      className="px-2.5 py-1.5 text-xs border border-gray-300 dark:border-gray-600 rounded-md text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition flex items-center"
                    >
                      <span className="material-icons text-xs mr-1">content_copy</span>
                      Copy
                    </button>
                    <button
                      onClick={handleCopyPrompt}
                      className="px-2.5 py-1.5 text-xs bg-teal-600 text-white rounded-md hover:bg-teal-700 transition flex items-center"
                      title="Copy with attractor grammar prefix"
                    >
                      <span className="material-icons text-xs mr-1">file_copy</span>
                      Copy Full
                    </button>
                  </div>
                </div>
                <div className="p-5 max-h-64 overflow-y-auto prose prose-sm dark:prose-invert max-w-none">
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>{accumulatedDisplay || '*No input yet.*'}</ReactMarkdown>
                </div>
              </div>

              {/* Timeline */}
              <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-4">
                <h3 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">Timeline</h3>
                <div className="space-y-1">
                  {timeline.map((entry, idx) => (
                    <div key={entry.id} className="flex items-center gap-2 text-xs">
                      <span className="flex-shrink-0 w-5 h-5 rounded-full bg-teal-100 dark:bg-teal-900/40 text-teal-600 dark:text-teal-400 flex items-center justify-center text-[10px] font-bold">
                        {idx + 1}
                      </span>
                      <span className="font-mono text-[10px] uppercase text-gray-400 w-14 flex-shrink-0">{entry.phase}</span>
                      <span className="text-gray-600 dark:text-gray-400 truncate">{entry.text}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Modals ────────────────────────────────────────────────── */}

      {/* Template selector */}
      <Modal isOpen={isTemplateModalOpen} onClose={() => setIsTemplateModalOpen(false)} title="Prompt Starters">
        <div className="space-y-3 max-h-[60vh] overflow-y-auto">
          {DESIGN_STARTERS.map(template => (
            <button
              key={template.name}
              onClick={() => handleLoadTemplate(template)}
              className="w-full text-left p-4 rounded-lg bg-gray-50 dark:bg-gray-700 hover:bg-teal-50 dark:hover:bg-teal-900/30 border dark:border-gray-600 transition"
            >
              <h4 className="font-semibold text-gray-800 dark:text-gray-200">{template.name}</h4>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">{template.description}</p>
              <div className="flex gap-1 mt-2">
                {template.steps.map((s, i) => (
                  <span key={i} className="text-[10px] uppercase px-1.5 py-0.5 rounded bg-gray-200 dark:bg-gray-600 text-gray-600 dark:text-gray-300">
                    {s.stepType}
                  </span>
                ))}
              </div>
            </button>
          ))}
        </div>
      </Modal>

      {/* Branch modal */}
      <Modal isOpen={isBranchModalOpen} onClose={() => setIsBranchModalOpen(false)} title="Create Branch">
        <div className="space-y-4">
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Create a new branch from the current step. This lets you explore alternative directions while preserving your current path.
          </p>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
            Branch Label
          </label>
          <input
            type="text"
            value={branchLabelInput}
            onChange={e => setBranchLabelInput(e.target.value)}
            placeholder={`Branch ${siblingBranches.length + 1}`}
            className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-sm focus:ring-2 focus:ring-teal-500 outline-none"
            autoFocus
          />
          <div className="flex justify-end space-x-2">
            <button onClick={() => setIsBranchModalOpen(false)} className="px-4 py-2 border dark:border-gray-600 rounded-lg text-sm">Cancel</button>
            <button onClick={handleConfirmBranch} className="px-4 py-2 bg-amber-600 text-white rounded-lg text-sm font-medium hover:bg-amber-700 transition">Create Branch</button>
          </div>
        </div>
      </Modal>

      {/* Save modal */}
      <Modal isOpen={isSaveModalOpen} onClose={() => setIsSaveModalOpen(false)} title="Save Conversation">
        <div className="space-y-4">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Conversation Name</label>
          <input
            type="text"
            value={saveNameInput}
            onChange={e => setSaveNameInput(e.target.value)}
            className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-sm focus:ring-2 focus:ring-teal-500 outline-none"
            autoFocus
          />
          <div className="flex justify-end space-x-2">
            <button onClick={() => setIsSaveModalOpen(false)} className="px-4 py-2 border dark:border-gray-600 rounded-lg text-sm">Cancel</button>
            <button onClick={handleSaveConversation} className="px-4 py-2 bg-teal-600 text-white rounded-lg text-sm font-medium hover:bg-teal-700 transition">Save</button>
          </div>
        </div>
      </Modal>

      {/* Delete confirmation */}
      <Modal isOpen={isDeleteConfirmOpen} onClose={() => setIsDeleteConfirmOpen(false)} title="Confirm Deletion">
        <div className="space-y-4">
          <p className="text-gray-600 dark:text-gray-400">
            Are you sure you want to delete <strong>{previewConversation?.name}</strong>? This action cannot be undone.
          </p>
          <div className="flex justify-end space-x-2">
            <button onClick={() => setIsDeleteConfirmOpen(false)} className="px-4 py-2 border dark:border-gray-600 rounded-lg">Cancel</button>
            <button onClick={handleDeleteConversation} className="px-4 py-2 bg-red-600 text-white rounded-lg">Delete</button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default DesignArchitect;
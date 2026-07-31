
import React, { useState, useEffect } from 'react';
import Modal from './Modal';
import { getCustomContext, saveCustomContext, deleteCustomContext, ContextStoreName } from '../services/dbService';

interface ToolConfig {
  id: ContextStoreName;
  name: string;
  icon: string;
}

const tools: ToolConfig[] = [
  { id: 'signalContext', name: 'Signal Center', icon: 'unarchive' },
  { id: 'mindSeedContext', name: 'MindSeed Creation Tool', icon: 'spa' },
  { id: 'promptContext', name: 'Prompt Architect', icon: 'psychology' },
  { id: 'systemPromptContext', name: 'Skill Architect', icon: 'psychology_alt' },
  { id: 'agentContext', name: 'AI Agent Architect', icon: 'smart_toy' },
  { id: 'projectContext', name: 'Project Architect', icon: 'architecture' },
];

const CustomContextSettings: React.FC = () => {
  const [selectedTool, setSelectedTool] = useState<ToolConfig | null>(null);
  const [contextText, setContextText] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [hasContext, setHasContext] = useState<Record<string, boolean>>({});
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [isConfirmingDelete, setIsConfirmingDelete] = useState<ToolConfig | null>(null);

  useEffect(() => {
    checkContexts();
  }, []);

  const checkContexts = async () => {
    const status: Record<string, boolean> = {};
    for (const tool of tools) {
      const context = await getCustomContext(tool.id);
      status[tool.id] = !!context;
    }
    setHasContext(status);
  };

  const handleOpenModal = async (tool: ToolConfig) => {
    const context = await getCustomContext(tool.id);
    setSelectedTool(tool);
    setContextText(context || '');
    setIsModalOpen(true);
    setSaveSuccess(false);
  };

  const handleSave = async () => {
    if (!selectedTool) return;
    setIsSaving(true);
    await saveCustomContext(selectedTool.id, contextText);
    setIsSaving(false);
    setSaveSuccess(true);
    checkContexts();
    setTimeout(() => {
      setSaveSuccess(false);
      setIsModalOpen(false);
    }, 1500);
  };

  const handleDelete = async () => {
    if (!isConfirmingDelete) return;
    await deleteCustomContext(isConfirmingDelete.id);
    setIsConfirmingDelete(null);
    checkContexts();
  };

  return (
    <div className="mt-16 pt-16 border-t border-slate-200/60 dark:border-slate-800/50 animate-fade-in">
      <div className="mb-8">
        <h2 className="text-xl font-extrabold text-slate-900 dark:text-slate-100 flex items-center">
          <span className="material-icons text-blue-500 mr-3">settings_suggest</span>
          Custom System Instructions
        </h2>
        <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">
          Add specific custom context to the meta-prompts for each tool. These instructions will be prepended to the AI's internal instructions.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {tools.map((tool) => (
          <div key={tool.id} className="p-5 bg-white dark:bg-slate-900/50 rounded-2xl border border-slate-200/60 dark:border-slate-800/50 flex items-center justify-between transition hover:border-blue-500/20">
            <div className="flex items-center">
              <span className="material-icons text-slate-400 dark:text-slate-500 mr-3.5">{tool.icon}</span>
              <span className="font-semibold text-slate-800 dark:text-slate-200 text-sm">{tool.name}</span>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => handleOpenModal(tool)}
                className={`px-3 py-1.5 rounded-xl font-bold text-[10px] tracking-wider uppercase transition flex items-center justify-center cursor-pointer ${
                  hasContext[tool.id]
                    ? 'bg-blue-600 text-white shadow-sm shadow-blue-600/10'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200/80'
                }`}
                title="Append to System Instructions"
              >
                <span className="material-icons text-xs mr-1">{hasContext[tool.id] ? 'edit' : 'add'}</span>
                Context
              </button>
              {hasContext[tool.id] && (
                <button
                  onClick={() => setIsConfirmingDelete(tool)}
                  className="p-1.5 rounded-xl text-rose-500 hover:bg-rose-500/10 transition cursor-pointer flex items-center justify-center"
                  title="Remove Custom Context"
                >
                  <span className="material-icons text-sm">delete</span>
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={`Custom Context: ${selectedTool?.name}`}
      >
        <div className="space-y-5 animate-fade-in">
          <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
            Paste the instructions you want to prepend to the {selectedTool?.name} meta-prompt.
          </p>
          <textarea
            value={contextText}
            onChange={(e) => setContextText(e.target.value)}
            className="w-full h-64 p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-blue-500/40 outline-none transition custom-scrollbar font-mono text-xs"
            placeholder="e.g. Always emphasize security principles... Use professional tone..."
          />
          <div className="flex justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-800/80">
            <button
              onClick={() => setIsModalOpen(false)}
              className="px-5 py-2.5 border border-slate-200 dark:border-slate-800 rounded-xl font-semibold text-xs cursor-pointer"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={isSaving}
              className={`px-5 py-2.5 rounded-xl font-semibold text-xs transition flex items-center cursor-pointer shadow-md ${
                saveSuccess
                  ? 'bg-emerald-600 text-white shadow-emerald-600/15'
                  : 'bg-blue-600 hover:bg-blue-500 text-white shadow-blue-600/15'
              }`}
            >
              {isSaving ? (
                <span className="material-icons animate-spin mr-2 text-sm">sync</span>
              ) : saveSuccess ? (
                <span className="material-icons mr-2 text-sm">check</span>
              ) : (
                <span className="material-icons mr-2 text-sm">save</span>
              )}
              {saveSuccess ? 'Saved!' : 'Save Context'}
            </button>
          </div>
        </div>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={!!isConfirmingDelete}
        onClose={() => setIsConfirmingDelete(null)}
        title="Remove Custom Context?"
      >
        <div className="space-y-4">
          <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
            Are you sure you want to remove the custom context for <strong>{isConfirmingDelete?.name}</strong>? This action cannot be undone.
          </p>
          <div className="flex justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-800/80">
            <button
              onClick={() => setIsConfirmingDelete(null)}
              className="px-5 py-2.5 border border-slate-200 dark:border-slate-800 rounded-xl font-semibold text-xs cursor-pointer"
            >
              Cancel
            </button>
            <button
              onClick={handleDelete}
              className="px-5 py-2.5 bg-rose-600 hover:bg-rose-500 text-white font-semibold text-xs rounded-xl cursor-pointer shadow-md transition"
            >
              <span className="material-icons mr-1.5 text-xs">delete_forever</span>
              Remove Context
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default CustomContextSettings;

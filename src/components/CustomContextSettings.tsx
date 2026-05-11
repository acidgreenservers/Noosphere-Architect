
import React, { useState, useEffect } from 'react';
import Modal from './Modal';
import { getCustomContext, saveCustomContext, deleteCustomContext, ContextStoreName } from '../services/dbService';

interface ToolConfig {
  id: ContextStoreName;
  name: string;
  icon: string;
}

const tools: ToolConfig[] = [
  { id: 'signalContext', name: 'Signal Extractor', icon: 'unarchive' },
  { id: 'mindSeedContext', name: 'MindSeed Creation Tool', icon: 'spa' },
  { id: 'promptContext', name: 'Prompt Architect', icon: 'psychology' },
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
    <div className="mt-12 pt-12 border-t border-gray-200 dark:border-gray-700">
      <div className="flex items-center mb-6">
        <div className="bg-purple-100 dark:bg-purple-900/50 rounded-full w-12 h-12 flex items-center justify-center mr-4">
          <span className="material-icons text-purple-600 dark:text-purple-400">settings_suggest</span>
        </div>
        <h2 className="text-3xl font-bold text-gray-900 dark:text-gray-100">Custom System Instructions</h2>
      </div>

      <p className="text-gray-600 dark:text-gray-400 mb-8">
        Add specific custom context to the meta-prompts for each tool. These instructions will be prepended to the AI's internal instructions.
      </p>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {tools.map((tool) => (
          <div key={tool.id} className="p-4 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 flex items-center justify-between shadow-sm">
            <div className="flex items-center">
              <span className="material-icons text-gray-500 dark:text-gray-400 mr-3">{tool.icon}</span>
              <span className="font-medium text-gray-900 dark:text-gray-100">{tool.name}</span>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => handleOpenModal(tool)}
                className={`p-2 rounded-lg transition-colors flex items-center justify-center ${
                  hasContext[tool.id]
                    ? 'bg-blue-100 text-blue-600 hover:bg-blue-200 dark:bg-blue-900/30 dark:text-blue-400'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300'
                }`}
                title="Append to System Instructions"
              >
                <span className="material-icons text-sm mr-1">add</span>
                <span className="text-xs font-bold">CONTEXT</span>
              </button>
              {hasContext[tool.id] && (
                <button
                  onClick={() => setIsConfirmingDelete(tool)}
                  className="p-2 rounded-lg bg-red-100 text-red-600 hover:bg-red-200 dark:bg-red-900/30 dark:text-red-400 transition-colors flex items-center justify-center"
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
        <div className="space-y-4">
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Paste the instructions you want to prepend to the {selectedTool?.name} meta-prompt.
          </p>
          <textarea
            value={contextText}
            onChange={(e) => setContextText(e.target.value)}
            className="w-full h-64 p-4 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all resize-y font-mono text-sm"
            placeholder="e.g. Always emphasize security principles... Use professional tone..."
          />
          <div className="flex justify-end gap-3">
            <button
              onClick={() => setIsModalOpen(false)}
              className="px-4 py-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 font-medium transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={isSaving}
              className={`px-6 py-2 rounded-xl font-bold transition-all flex items-center shadow-lg ${
                saveSuccess
                  ? 'bg-green-500 text-white shadow-green-500/25'
                  : 'bg-blue-600 hover:bg-blue-700 text-white shadow-blue-500/25'
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
          <p className="text-gray-600 dark:text-gray-400">
            Are you sure you want to remove the custom context for <strong>{isConfirmingDelete?.name}</strong>? This action cannot be undone.
          </p>
          <div className="flex justify-end gap-3">
            <button
              onClick={() => setIsConfirmingDelete(null)}
              className="px-4 py-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 font-medium transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleDelete}
              className="px-6 py-2 bg-red-600 hover:bg-red-700 text-white font-bold rounded-xl transition-all shadow-lg shadow-red-500/25 flex items-center"
            >
              <span className="material-icons mr-2 text-sm">delete_forever</span>
              Remove Context
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default CustomContextSettings;

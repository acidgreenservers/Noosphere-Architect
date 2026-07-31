
import React, { useState, useEffect } from 'react';
import { setOpenRouterKey, getOpenRouterKey, setOpenRouterModel, getOpenRouterModel, clearSession } from '../services/sessionService';
import CustomContextSettings from './CustomContextSettings';
import Modal from './Modal';
import Toast from './Toast';

interface ModelGroup {
  name: string;
  models: string[];
}

const MODEL_GROUPS: ModelGroup[] = [
  {
    name: 'DeepSeek',
    models: [
      'deepseek/deepseek-v4-flash',
      'deepseek/deepseek-v4-pro'
    ]
  },
  {
    name: 'Xiaomi Mimo',
    models: [
      'xiaomi/mimo-v2-flash',
      'xiaomi/mimo-v2-pro',
      'xiaomi/mimo-v2.5',
      'xiaomi/mimo-v2.5-pro'
    ]
  },
  {
    name: 'OpenAI GPT-OSS',
    models: [
      'openai/gpt-oss-20b',
      'openai/gpt-oss-120b'
    ]
  },
  {
    name: 'Z-AI GLM',
    models: [
      'z-ai/glm-4.5-air',
      'z-ai/glm-4.7',
      'z-ai/glm-5'
    ]
  },
  {
    name: 'Qwen',
    models: [
      'qwen/qwen3.5-flash-02-23',
      'qwen/qwen3.5-plus-02-15',
      'qwen/qwen3.6-flash',
      'qwen/qwen3.6-35b-a3b',
      'qwen/qwen3.6-plus'
    ]
  }
];

const AgentApiSettings: React.FC = () => {
  const [apiKey, setApiKey] = useState('');
  const [model, setModel] = useState('');
  const [isSaved, setIsSaved] = useState(false);
  const [hasSavedKey, setHasSavedKey] = useState(false);
  const [isModelModalOpen, setIsModelModalOpen] = useState(false);
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({});
  const [successMessage, setSuccessMessage] = useState('');

  useEffect(() => {
    const savedKey = getOpenRouterKey();
    const savedModel = getOpenRouterModel();
    
    if (savedKey) {
      setHasSavedKey(true);
    }
    
    if (savedModel) {
      setModel(savedModel);
    }

    if (savedKey || savedModel) {
      setIsSaved(true);
    }
  }, []);

  const handleSave = () => {
    if (apiKey.trim() || model.trim() || hasSavedKey) {
      if (apiKey.trim()) {
        setOpenRouterKey(apiKey.trim());
        setHasSavedKey(true);
        setApiKey(''); // Clear the input after saving
      }

      if (model.trim()) {
        setOpenRouterModel(model.trim());
      } else {
        setOpenRouterModel(null);
      }

      setIsSaved(true);
      setSuccessMessage('OpenRouter settings saved successfully for this session.');
    }
  };

  const handleClear = () => {
    clearSession();
    setApiKey('');
    setModel('');
    setIsSaved(false);
    setHasSavedKey(false);
    setSuccessMessage('OpenRouter settings cleared.');
  };

  const toggleGroup = (groupName: string) => {
    setExpandedGroups(prev => ({
      ...prev,
      [groupName]: !prev[groupName]
    }));
  };

  const selectModel = (modelId: string) => {
    setModel(modelId);
    setIsModelModalOpen(false);
    setSuccessMessage(`Selected model: ${modelId}`);
  };

  return (
    <div className="max-w-2xl mx-auto animate-fade-in">
      <Toast message={successMessage} onClose={() => setSuccessMessage('')} />

      <div className="mb-10">
        <h2 className="text-3xl font-extrabold text-slate-900 dark:text-slate-100 flex items-center">
          Agent API Settings
        </h2>
        <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">Configure OpenRouter endpoints and active session settings.</p>
      </div>

      <p className="text-slate-500 dark:text-slate-400 text-sm leading-relaxed mb-8">
        Enter your OpenRouter API key and Model to enable AI generation features.{" "}
        <strong>OpenRouter configuration is required for the architects to function.</strong>{" "}
        Your key is stored <strong>only</strong> in memory for the duration of this session.
        It is completely ephemeral and will be wiped when the page is refreshed or the tab is closed.
      </p>

      <div className="space-y-6">
        <div>
          <label htmlFor="api-key" className="block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2">
            OpenRouter API Key
          </label>
          <div className="relative">
            <input
              id="api-key"
              type="password"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder={hasSavedKey ? "•••••••••••••••• (Key is saved, enter to update)" : "sk-or-v1-..."}
              className="w-full px-4 py-3 bg-white dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 rounded-xl text-sm focus:ring-2 focus:ring-blue-500/40 outline-none transition"
            />
          </div>
        </div>

        <div>
          <label htmlFor="model" className="block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2">
            OpenRouter Model
          </label>
          <div className="flex gap-2">
            <input
              id="model"
              type="text"
              value={model}
              onChange={(e) => setModel(e.target.value)}
              placeholder="e.g., anthropic/claude-3-opus"
              className="flex-grow px-4 py-3 bg-white dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 rounded-xl text-sm focus:ring-2 focus:ring-blue-500/40 outline-none transition"
            />
            <button
              onClick={() => setIsModelModalOpen(true)}
              className="px-4 py-2 border border-slate-200 dark:border-slate-800 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-900/60 transition cursor-pointer flex items-center"
              title="Select from pre-defined models"
            >
              <span className="material-icons text-slate-500">list</span>
            </button>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 pt-4">
          <button
            onClick={handleSave}
            className="flex-1 bg-blue-600 hover:bg-blue-500 text-white font-semibold py-2.5 px-6 rounded-xl shadow-md shadow-blue-600/10 transition cursor-pointer flex items-center justify-center"
          >
            <span className="material-icons mr-2 text-sm">save</span>
            Save Settings
          </button>
          
          {isSaved && (
            <button
              onClick={handleClear}
              className="flex-1 bg-rose-500/10 hover:bg-rose-500/20 text-rose-500 font-semibold py-2.5 px-6 rounded-xl transition flex items-center justify-center cursor-pointer border border-rose-500/10"
            >
              <span className="material-icons mr-2 text-sm">delete_forever</span>
              Clear Key & Settings
            </button>
          )}
        </div>

        {isSaved && (
          <div className="mt-6 p-5 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl flex items-start">
            <span className="material-icons text-emerald-600 dark:text-emerald-400 mr-3">check_circle</span>
            <div>
              <p className="text-emerald-800 dark:text-emerald-400 font-semibold text-sm">Settings configured</p>
              <p className="text-emerald-600 dark:text-emerald-500 text-xs mt-1">Your OpenRouter settings are ready to use for enhanced AI capabilities.</p>
            </div>
          </div>
        )}
      </div>

      <Modal
        isOpen={isModelModalOpen}
        onClose={() => setIsModelModalOpen(false)}
        title="Select AI Model"
      >
        <div className="space-y-2 max-h-[60vh] overflow-y-auto pr-2 custom-scrollbar">
          {MODEL_GROUPS.map((group) => (
            <div key={group.name} className="border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden">
              <button
                onClick={() => toggleGroup(group.name)}
                className="w-full flex justify-between items-center p-4 bg-slate-50 dark:bg-slate-900/50 hover:bg-slate-100 dark:hover:bg-slate-900 transition"
              >
                <span className="font-bold text-slate-800 dark:text-slate-200 text-sm">{group.name}</span>
                <span className={`material-icons transform transition ${expandedGroups[group.name] ? 'rotate-180' : ''}`}>
                  expand_more
                </span>
              </button>
              {expandedGroups[group.name] && (
                <div className="p-2 space-y-1 bg-white dark:bg-slate-900/50 border-t border-slate-200 dark:border-slate-800">
                  {group.models.map((modelId) => (
                    <button
                      key={modelId}
                      onClick={() => selectModel(modelId)}
                      className={`w-full text-left p-3 rounded-xl text-xs font-semibold transition ${
                        model === modelId
                          ? 'bg-blue-600 text-white shadow-sm'
                          : 'text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800/80'
                      }`}
                    >
                      {modelId}
                    </button>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      </Modal>

      <CustomContextSettings />
    </div>
  );
};

export default AgentApiSettings;

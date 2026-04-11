
import React, { useState, useEffect } from 'react';
import { setOpenRouterKey, getOpenRouterKey, setOpenRouterModel, getOpenRouterModel, clearSession } from '../services/sessionService';

const AgentApiSettings: React.FC = () => {
  const [apiKey, setApiKey] = useState('');
  const [model, setModel] = useState('');
  const [isSaved, setIsSaved] = useState(false);
  const [hasSavedKey, setHasSavedKey] = useState(false);

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
      alert('OpenRouter settings saved successfully for this session.');
    }
  };

  const handleClear = () => {
    clearSession();
    setApiKey('');
    setModel('');
    setIsSaved(false);
    setHasSavedKey(false);
    alert('OpenRouter settings cleared.');
  };

  return (
    <div className="max-w-2xl mx-auto bg-white dark:bg-gray-800 p-8 rounded-2xl shadow-xl border border-gray-200 dark:border-gray-700">
      <div className="flex items-center mb-6">
        <div className="bg-blue-100 dark:bg-blue-900/50 rounded-full w-12 h-12 flex items-center justify-center mr-4">
          <span className="material-icons text-blue-600 dark:text-blue-400">vpn_key</span>
        </div>
        <h2 className="text-3xl font-bold text-gray-900 dark:text-gray-100">Agent API Settings</h2>
      </div>

      <p className="text-gray-600 dark:text-gray-400 mb-8">
        Enter your OpenRouter API key and Model to enable AI generation features.{" "}
        <strong>OpenRouter configuration is required for the architects to function.</strong>{" "}
        Your key is stored <strong>only</strong> in memory for the duration of this session.
        It is completely ephemeral and will be wiped when the page is refreshed or the tab is closed.
      </p>

      <div className="space-y-6">
        <div>
          <label htmlFor="api-key" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            OpenRouter API Key
          </label>
          <div className="relative">
            <input
              id="api-key"
              type="password"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder={hasSavedKey ? "•••••••••••••••• (Key is saved, enter to update)" : "sk-or-v1-..."}
              className="w-full px-4 py-3 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
            />
          </div>
        </div>

        <div>
          <label htmlFor="model" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            OpenRouter Model
          </label>
          <input
            id="model"
            type="text"
            value={model}
            onChange={(e) => setModel(e.target.value)}
            placeholder="e.g., anthropic/claude-3-opus"
            className="w-full px-4 py-3 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
          />
        </div>

        <div className="flex flex-col sm:flex-row gap-4 pt-4">
          <button
            onClick={handleSave}
            className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-6 rounded-xl transition-all shadow-lg hover:shadow-blue-500/25 flex items-center justify-center"
          >
            <span className="material-icons mr-2">save</span>
            Save Settings
          </button>
          
          {isSaved && (
            <button
              onClick={handleClear}
              className="flex-1 bg-red-100 hover:bg-red-200 dark:bg-red-900/30 dark:hover:bg-red-900/50 text-red-600 dark:text-red-400 font-bold py-3 px-6 rounded-xl transition-all flex items-center justify-center border border-red-200 dark:border-red-800"
            >
              <span className="material-icons mr-2">delete_forever</span>
              Clear Key & Settings
            </button>
          )}
        </div>

        {isSaved && (
          <div className="mt-6 p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-xl flex items-start">
            <span className="material-icons text-green-600 dark:text-green-400 mr-3">check_circle</span>
            <div>
              <p className="text-green-800 dark:text-green-200 font-medium">Settings configured</p>
              <p className="text-green-700 dark:text-green-300 text-sm mt-1">Your OpenRouter settings are ready to use for enhanced AI capabilities.</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AgentApiSettings;

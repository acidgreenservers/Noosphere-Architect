
import React, { useState, useEffect } from 'react';
import { MindSeedConfig, GeneratedMindSeed, SavedMindSeed, MindSeedType } from '../types';
import { generateMindSeed } from '../services/aiService';
import { addMindSeed, getAllMindSeeds, deleteMindSeed, saveMindSeedDraft, getMindSeedDraft, clearMindSeedDraft } from '../services/dbService';
import { sanitizeFilename } from '../utils/security';
import LoadingSpinner from './LoadingSpinner';
import Toast from './Toast';
import Modal from './Modal';

const MAX_CHARS = 20000;

const MindSeedArchitect: React.FC = () => {
  const [activeTab, setActiveTab] = useState<MindSeedType>('cogni');
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<GeneratedMindSeed | null>(null);
  const [savedSeeds, setSavedSeeds] = useState<SavedMindSeed[]>([]);
  const [toast, setToast] = useState<{message: string, type: 'success' | 'error'} | null>(null);
  const [showErrorModal, setShowErrorModal] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    loadSavedSeeds();
    loadDraft();
  }, []);

  const loadSavedSeeds = async () => {
    try {
      const seeds = await getAllMindSeeds();
      setSavedSeeds(seeds);
    } catch (error) {
      console.error("Failed to load seeds", error);
    }
  };

  const loadDraft = async () => {
    try {
      const draft = await getMindSeedDraft(1);
      if (draft) {
        setText(draft.config.text);
        setActiveTab(draft.config.type);
      }
    } catch (error) {
      console.error("Failed to load draft", error);
    }
  };

  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newText = e.target.value;
    if (newText.length > MAX_CHARS) {
        setErrorMessage(`Text exceeds the maximum limit of ${MAX_CHARS} characters.`);
        setShowErrorModal(true);
        return;
    }
    setText(newText);
    saveMindSeedDraft({ id: 1, config: { type: activeTab, text: newText } });
  };

  const handleGenerate = async () => {
    if (!text.trim()) {
      setToast({ message: "Please enter some text to compress.", type: 'error' });
      return;
    }

    setLoading(true);
    setResult(null);
    try {
      const config: MindSeedConfig = { type: activeTab, text };
      const generatedResult = await generateMindSeed(config);
      setResult(generatedResult);
      setToast({ message: "MindSeed generated successfully!", type: 'success' });
    } catch (error: any) {
      setToast({ message: error.message || "Failed to generate MindSeed", type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!result) return;

    const name = result.seed.slice(0, 30) + (result.seed.length > 30 ? '...' : '');
    const newSeed: SavedMindSeed = {
      name,
      config: { type: activeTab, text },
      result,
      createdAt: new Date().toISOString()
    };

    try {
      await addMindSeed(newSeed);
      await loadSavedSeeds();
      setToast({ message: "MindSeed saved to library!", type: 'success' });
    } catch (error) {
      setToast({ message: "Failed to save MindSeed", type: 'error' });
    }
  };

  const handleDelete = async (id: number) => {
    try {
      await deleteMindSeed(id);
      await loadSavedSeeds();
      setToast({ message: "MindSeed deleted.", type: 'success' });
    } catch (error) {
      setToast({ message: "Failed to delete MindSeed", type: 'error' });
    }
  };

  const handleClear = async () => {
    setText('');
    setResult(null);
    await clearMindSeedDraft(1);
  };

  const formatAsMarkdown = (seed: GeneratedMindSeed, type: MindSeedType) => {
    return `> "${seed.seed}"

# ${type.charAt(0).toUpperCase() + type.slice(1)}Seed Deployment Table

| Seed | Pattern | Deploy When |
|---|---|---|
| *"${seed.seed}"* | ${seed.pattern} | ${seed.deployWhen} |
`;
  };

  const handleCopy = async (seed: GeneratedMindSeed, type: MindSeedType) => {
    const markdown = formatAsMarkdown(seed, type);
    try {
      await navigator.clipboard.writeText(markdown);
      setToast({ message: "Markdown copied to clipboard!", type: 'success' });
    } catch (err) {
      setToast({ message: "Failed to copy to clipboard", type: 'error' });
    }
  };

  const handleExport = (seed: GeneratedMindSeed, type: MindSeedType) => {
    const markdown = formatAsMarkdown(seed, type);
    const blob = new Blob([markdown], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${sanitizeFilename(seed.seed)}.md`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    setToast({ message: "MindSeed exported as Markdown!", type: 'success' });
  };

  const charCount = text.length;
  const isNearLimit = charCount > MAX_CHARS * 0.9;
  const charCountColor = charCount > MAX_CHARS ? 'text-red-600' : isNearLimit ? 'text-orange-500' : 'text-gray-500';

  const getTabColor = (tab: MindSeedType) => {
    if (activeTab !== tab) return 'text-gray-500 border-transparent hover:text-gray-700 hover:border-gray-300';
    switch (tab) {
        case 'cogni': return 'text-orange-500 border-orange-500';
        case 'lingua': return 'text-green-500 border-green-500';
        case 'arch': return 'text-violet-500 border-violet-500';
    }
  };

  const getButtonColor = () => {
    switch (activeTab) {
        case 'cogni': return 'bg-orange-600 hover:bg-orange-700 focus:ring-orange-500';
        case 'lingua': return 'bg-green-600 hover:bg-green-700 focus:ring-green-500';
        case 'arch': return 'bg-violet-600 hover:bg-violet-700 focus:ring-violet-500';
    }
  };

  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h2 className="text-3xl font-bold text-gray-900 dark:text-gray-100">MindSeed Architect</h2>
          <p className="text-gray-600 dark:text-gray-400">Compress text into generative seeds of wisdom.</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200 dark:border-gray-700 mb-8">
        <nav className="-mb-px flex space-x-8" aria-label="Tabs">
          {(['cogni', 'lingua', 'arch'] as MindSeedType[]).map((tab) => (
            <button
              key={tab}
              onClick={() => {
                setActiveTab(tab);
                saveMindSeedDraft({ id: 1, config: { type: tab, text } });
              }}
              className={`
                whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm capitalize transition-colors duration-200
                ${getTabColor(tab)}
              `}
            >
              {tab}Seed Creator
            </button>
          ))}
        </nav>
      </div>

      <div className="grid grid-cols-1 gap-8">
        {/* Input Form */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Input Text (up to 20,000 characters)
            </label>
            <textarea
              value={text}
              onChange={handleTextChange}
              placeholder="Paste large body of text here..."
              className="w-full h-64 p-4 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
            />
            <div className={`mt-2 text-right text-sm font-medium ${charCountColor}`}>
              {charCount.toLocaleString()} / {MAX_CHARS.toLocaleString()}
            </div>
          </div>

          <div className="flex justify-end space-x-4">
            <button
              onClick={handleClear}
              className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
            >
              Clear
            </button>
            <button
              onClick={handleGenerate}
              disabled={loading || !text.trim()}
              className={`flex items-center px-6 py-2 rounded-lg text-white font-semibold transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed ${getButtonColor()}`}
            >
              {loading ? <LoadingSpinner size="sm" color="white" /> : 'Generate Seed'}
            </button>
          </div>
        </div>

        {/* Result Display */}
        {result && (
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md border border-gray-200 dark:border-gray-700 p-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
              <h3 className="text-xl font-bold text-gray-900 dark:text-gray-100">Generated MindSeed</h3>
              <div className="flex flex-wrap gap-4">
                <button
                    onClick={() => handleCopy(result, activeTab)}
                    className="flex items-center text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 font-medium transition-colors"
                    title="Copy to Clipboard"
                >
                    <span className="material-icons mr-1">content_copy</span> Copy
                </button>
                <button
                    onClick={() => handleExport(result, activeTab)}
                    className="flex items-center text-gray-600 dark:text-gray-400 hover:text-green-600 dark:hover:text-green-400 font-medium transition-colors"
                    title="Export as Markdown"
                >
                    <span className="material-icons mr-1">download</span> Export
                </button>
                <button
                    onClick={handleSave}
                    className="flex items-center text-blue-600 dark:text-blue-400 hover:text-blue-700 font-medium transition-colors"
                >
                    <span className="material-icons mr-1">save</span> Save to Library
                </button>
              </div>
            </div>

            <div className="mb-8">
                <blockquote className="border-l-4 border-blue-500 pl-4 py-2 italic text-2xl text-gray-800 dark:text-gray-200">
                    "{result.seed}"
                </blockquote>
            </div>

            <div className="overflow-hidden border border-gray-200 dark:border-gray-700 rounded-lg">
                <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                    <thead className="bg-gray-50 dark:bg-gray-900/50">
                        <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Seed</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Pattern</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Deploy When</th>
                        </tr>
                    </thead>
                    <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                        <tr>
                            <td className="px-6 py-4 text-sm italic text-gray-900 dark:text-gray-100">"{result.seed}"</td>
                            <td className="px-6 py-4 text-sm text-gray-600 dark:text-gray-400" dangerouslySetInnerHTML={{ __html: result.pattern.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>') }}></td>
                            <td className="px-6 py-4 text-sm text-gray-600 dark:text-gray-400">{result.deployWhen}</td>
                        </tr>
                    </tbody>
                </table>
            </div>
          </div>
        )}

        {/* Saved Library */}
        {savedSeeds.length > 0 && (
          <div className="mt-12">
            <h3 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-6">Saved MindSeeds</h3>
            <div className="grid grid-cols-1 gap-4">
              {savedSeeds.map((seed) => (
                <div key={seed.id} className="bg-white dark:bg-gray-800 p-6 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm hover:shadow-md transition-shadow">
                  <div className="flex justify-between items-start">
                    <div className="flex-grow">
                      <div className="flex items-center mb-2">
                        <span className={`text-xs font-bold px-2 py-1 rounded uppercase mr-3 ${
                            seed.config.type === 'cogni' ? 'bg-orange-100 text-orange-700' :
                            seed.config.type === 'lingua' ? 'bg-green-100 text-green-700' :
                            'bg-violet-100 text-violet-700'
                        }`}>
                          {seed.config.type}Seed
                        </span>
                        <span className="text-sm text-gray-500">{new Date(seed.createdAt).toLocaleDateString()}</span>
                      </div>
                      <p className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-4 italic">"{seed.result.seed}"</p>
                      <div className="flex flex-wrap gap-4 mt-2">
                        <button
                            onClick={() => {
                                setText(seed.config.text);
                                setActiveTab(seed.config.type);
                                setResult(seed.result);
                                window.scrollTo({ top: 0, behavior: 'smooth' });
                            }}
                            className="text-sm text-blue-600 hover:underline flex items-center"
                        >
                            <span className="material-icons text-xs mr-1">refresh</span> Load
                        </button>
                        <button
                            onClick={() => handleCopy(seed.result, seed.config.type)}
                            className="text-sm text-gray-600 dark:text-gray-400 hover:underline flex items-center"
                        >
                            <span className="material-icons text-xs mr-1">content_copy</span> Copy
                        </button>
                        <button
                            onClick={() => handleExport(seed.result, seed.config.type)}
                            className="text-sm text-gray-600 dark:text-gray-400 hover:underline flex items-center"
                        >
                            <span className="material-icons text-xs mr-1">download</span> Export
                        </button>
                        <button
                            onClick={() => handleDelete(seed.id!)}
                            className="text-sm text-red-600 hover:underline flex items-center"
                        >
                            <span className="material-icons text-xs mr-1">delete</span> Delete
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
      <Modal
        isOpen={showErrorModal}
        onClose={() => setShowErrorModal(false)}
        title="Limit Exceeded"
      >
        <p className="text-gray-600 dark:text-gray-400">{errorMessage}</p>
        <div className="mt-6 flex justify-end">
            <button
                onClick={() => setShowErrorModal(false)}
                className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
            >
                Close
            </button>
        </div>
      </Modal>
    </div>
  );
};

export default MindSeedArchitect;

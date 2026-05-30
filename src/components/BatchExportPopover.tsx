import React, { useState } from 'react';
import { ExportFormat, HtmlTheme, UnifiedItem } from '../types';
import { buildBatchExport, triggerDownload } from '../utils/export';
import Modal from './Modal';
import LoadingSpinner from './LoadingSpinner';

interface BatchExportPopoverProps {
  isOpen: boolean;
  onClose: () => void;
  items: UnifiedItem[];
  onExportComplete?: (format: ExportFormat) => void;
}

const FORMAT_OPTIONS: { value: ExportFormat; label: string; icon: string; desc: string }[] = [
  { value: 'markdown', label: 'Markdown', icon: 'description', desc: '.md files in subdirectories' },
  { value: 'html', label: 'HTML', icon: 'code', desc: '.html files in subdirectories' },
  { value: 'json', label: 'JSON', icon: 'data_object', desc: '.json files in subdirectories' },
];

const BatchExportPopover: React.FC<BatchExportPopoverProps> = ({ isOpen, onClose, items, onExportComplete }) => {
  const [selectedFormat, setSelectedFormat] = useState<ExportFormat>('markdown');
  const [htmlTheme, setHtmlTheme] = useState<HtmlTheme>('light');
  const [isExporting, setIsExporting] = useState(false);

  const exportableCount = items.filter(i => {
    const o = i.original;
    if (i.type === 'mindseed') return !!o.result?.seed;
    return !!(o.prompt || o.files || o.content || o.generatedTask || o.extractedSignal || o.promptSignal);
  }).length;

  const handleExport = async () => {
    if (exportableCount === 0) return;
    setIsExporting(true);
    try {
      const result = await buildBatchExport(items, selectedFormat, htmlTheme);
      if (result) {
        triggerDownload(result);
        onExportComplete?.(selectedFormat);
      }
    } catch (err) {
      console.error('Batch export failed:', err);
    } finally {
      setIsExporting(false);
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`Batch Export (${items.length} items)`}>
      {isExporting ? (
        <div className="py-12">
          <LoadingSpinner message="Generating zip archive..." />
        </div>
      ) : (
        <div className="space-y-6">
          {/* Summary */}
          <div className="bg-blue-50 dark:bg-blue-900/20 rounded-xl p-4 border border-blue-200 dark:border-blue-800">
            <div className="flex items-center gap-3">
              <span className="material-icons text-blue-500">inventory_2</span>
              <div>
                <p className="font-bold text-blue-800 dark:text-blue-200">
                  {items.length} item{items.length !== 1 ? 's' : ''} selected
                </p>
                <p className="text-sm text-blue-600 dark:text-blue-300">
                  {exportableCount} exportable &middot; bundled into a single .zip archive
                </p>
              </div>
            </div>
          </div>

          {/* Format Selection */}
          <div>
            <label className="block text-sm font-bold text-gray-600 dark:text-gray-400 mb-3 uppercase tracking-wider">
              Export Format
            </label>
            <div className="space-y-2">
              {FORMAT_OPTIONS.map(opt => (
                <button
                  key={opt.value}
                  onClick={() => setSelectedFormat(opt.value)}
                  className={`w-full flex items-center gap-4 px-4 py-3 rounded-xl border-2 transition-all text-left ${
                    selectedFormat === opt.value
                      ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 shadow-sm'
                      : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:border-gray-300 dark:hover:border-gray-600'
                  }`}
                >
                  <span className={`material-icons text-xl ${
                    selectedFormat === opt.value ? 'text-blue-500' : 'text-gray-400'
                  }`}>
                    {opt.icon}
                  </span>
                  <div className="flex-grow">
                    <span className="font-bold">{opt.label}</span>
                    <span className="ml-2 text-sm text-gray-400">{opt.desc}</span>
                  </div>
                  {selectedFormat === opt.value && (
                    <span className="material-icons text-blue-500">check_circle</span>
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* HTML Theme Selector */}
          {selectedFormat === 'html' && (
            <div className="animate-in fade-in slide-in-from-top-2 duration-200">
              <label className="block text-sm font-bold text-gray-600 dark:text-gray-400 mb-3 uppercase tracking-wider">
                HTML Theme
              </label>
              <div className="flex gap-3">
                <button
                  onClick={() => setHtmlTheme('light')}
                  className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl border-2 transition-all font-bold ${
                    htmlTheme === 'light'
                      ? 'border-amber-400 bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-300 shadow-sm'
                      : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-500 hover:border-gray-300 dark:hover:border-gray-600'
                  }`}
                >
                  <span className="material-icons text-lg">light_mode</span>
                  Light
                </button>
                <button
                  onClick={() => setHtmlTheme('dark')}
                  className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl border-2 transition-all font-bold ${
                    htmlTheme === 'dark'
                      ? 'border-indigo-400 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-700 dark:text-indigo-300 shadow-sm'
                      : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-500 hover:border-gray-300 dark:hover:border-gray-600'
                  }`}
                >
                  <span className="material-icons text-lg">dark_mode</span>
                  Dark
                </button>
              </div>
            </div>
          )}

          {/* Structure preview */}
          <div className="bg-gray-50 dark:bg-gray-900/50 rounded-xl p-4 border border-gray-200 dark:border-gray-700">
            <div className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">
              Archive Structure
            </div>
            <div className="text-xs font-mono text-gray-600 dark:text-gray-400 space-y-0.5 max-h-28 overflow-y-auto">
              <div className="text-gray-400">_manifest.txt</div>
              {items.slice(0, 6).map(item => (
                <div key={item.id} className="truncate pl-2">
                  {sanitizeFsName(item.name)}/{sanitizeFsName(item.name)}
                  {selectedFormat === 'markdown' ? '.md' : selectedFormat === 'html' ? '.html' : '.json'}
                </div>
              ))}
              {items.length > 6 && (
                <div className="text-gray-400 pl-2">... and {items.length - 6} more</div>
              )}
            </div>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-2">
            <button
              onClick={onClose}
              className="px-5 py-2.5 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-xl font-bold hover:bg-gray-50 dark:hover:bg-gray-800 transition-all"
            >
              Cancel
            </button>
            <button
              onClick={handleExport}
              disabled={exportableCount === 0}
              className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl transition-all shadow-lg shadow-blue-500/20 flex items-center gap-2 disabled:opacity-50"
            >
              <span className="material-icons text-lg">folder_zip</span>
              Export as .zip
            </button>
          </div>
        </div>
      )}
    </Modal>
  );
};

// ── Reuse the same sanitize function from export.ts ──────────────────────────
function sanitizeFsName(name: string): string {
  return name.replace(/[^a-zA-Z0-9_\- ]/g, '_').slice(0, 60).trim();
}

export default BatchExportPopover;
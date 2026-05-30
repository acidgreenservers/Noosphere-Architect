import React, { useState } from 'react';
import { ExportFormat, HtmlTheme, UnifiedItem } from '../types';
import { buildExport, getExportFilename, triggerDownload, ExportResult } from '../utils/export';
import Modal from './Modal';

interface ExportPopoverProps {
  isOpen: boolean;
  onClose: () => void;
  item: UnifiedItem;
  onExportComplete?: (format: ExportFormat) => void;
}

const FORMAT_OPTIONS: { value: ExportFormat; label: string; icon: string; ext: string }[] = [
  { value: 'markdown', label: 'Markdown', icon: 'description', ext: '.md' },
  { value: 'html', label: 'HTML', icon: 'code', ext: '.html' },
  { value: 'json', label: 'JSON', icon: 'data_object', ext: '.json' },
];

const ExportPopover: React.FC<ExportPopoverProps> = ({ isOpen, onClose, item, onExportComplete }) => {
  const [selectedFormat, setSelectedFormat] = useState<ExportFormat>('markdown');
  const [htmlTheme, setHtmlTheme] = useState<HtmlTheme>('light');

  const filename = getExportFilename(item, selectedFormat);

  const handleExport = () => {
    const result = buildExport(item, selectedFormat, htmlTheme);
    if (!result) {
      onExportComplete?.(selectedFormat);
      onClose();
      return;
    }
    triggerDownload(result);
    onExportComplete?.(selectedFormat);
    onClose();
  };

  const handleClose = () => {
    onClose();
  };

  if (!isOpen) return null;

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title={`Export: ${item.name}`}>
      <div className="space-y-6">
        {/* Format Selection */}
        <div>
          <label className="block text-sm font-bold text-gray-600 dark:text-gray-400 mb-3 uppercase tracking-wider">
            Format
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
                  <span className="ml-2 text-sm text-gray-400">({opt.ext})</span>
                </div>
                {selectedFormat === opt.value && (
                  <span className="material-icons text-blue-500">check_circle</span>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* HTML Theme Selector — only shown when HTML is selected */}
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

        {/* Filename Preview */}
        <div className="bg-gray-50 dark:bg-gray-900/50 rounded-xl p-3 border border-gray-200 dark:border-gray-700">
          <div className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1">
            Filename
          </div>
          <div className="text-sm font-mono text-gray-800 dark:text-gray-200 truncate">
            {filename}
          </div>
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-3 pt-2">
          <button
            onClick={handleClose}
            className="px-5 py-2.5 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-xl font-bold hover:bg-gray-50 dark:hover:bg-gray-800 transition-all"
          >
            Cancel
          </button>
          <button
            onClick={handleExport}
            className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl transition-all shadow-lg shadow-blue-500/20 flex items-center gap-2"
          >
            <span className="material-icons text-lg">download</span>
            Export
          </button>
        </div>
      </div>
    </Modal>
  );
};

export default ExportPopover;
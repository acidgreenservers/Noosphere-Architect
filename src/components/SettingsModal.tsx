import React, { useState } from 'react';
import Modal from './Modal';
import AgentApiSettings from './AgentApiSettings';
import CustomContextSettings from './CustomContextSettings';
import PreferencesSettings from './PreferencesSettings';
import { UserPreferences } from '../types';

type SettingsTab = 'preferences' | 'api' | 'instructions';

interface SettingsModalProps {
    isOpen: boolean;
    onClose: () => void;
    onPreferencesSaved?: (prefs: UserPreferences) => void;
}

const TABS: { id: SettingsTab; label: string }[] = [
    { id: 'preferences', label: 'Preferences' },
    { id: 'api', label: 'API Key' },
    { id: 'instructions', label: 'Custom Instructions' }
];

/**
 * Floating settings surface — opens over any screen without unmounting or
 * disturbing the work underneath. The section list is a stacked text menu
 * (no dividers), ordered: Preferences / API Key / Custom Instructions.
 */
const SettingsModal: React.FC<SettingsModalProps> = ({ isOpen, onClose, onPreferencesSaved }) => {
    const [activeTab, setActiveTab] = useState<SettingsTab>('preferences');

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Settings" maxWidthClass="max-w-4xl">
            <div className="flex flex-col md:flex-row gap-6 md:gap-10 min-h-[55vh]">
                {/* Side tab list — stacked text, no dividers */}
                <nav
                    className="md:w-44 flex-shrink-0 flex md:flex-col gap-1 overflow-x-auto md:overflow-visible"
                    aria-label="Settings sections"
                >
                    {TABS.map(tab => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            aria-current={activeTab === tab.id ? 'page' : undefined}
                            className={`whitespace-nowrap text-left px-3 py-2 rounded-lg text-sm transition-colors cursor-pointer ${activeTab === tab.id
                                    ? 'font-bold text-slate-900 dark:text-slate-100 bg-slate-100 dark:bg-slate-800/70'
                                    : 'font-medium text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800/40'
                                }`}
                        >
                            {tab.label}
                        </button>
                    ))}
                </nav>

                {/* Content pane */}
                <div className="flex-1 min-w-0">
                    {activeTab === 'preferences' && <PreferencesSettings onSaved={onPreferencesSaved} />}
                    {activeTab === 'api' && <AgentApiSettings />}
                    {activeTab === 'instructions' && <CustomContextSettings />}
                </div>
            </div>
        </Modal>
    );
};

export default SettingsModal;

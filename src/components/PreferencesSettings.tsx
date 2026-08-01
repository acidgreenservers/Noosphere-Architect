import React, { useEffect, useState } from 'react';
import Toast from './Toast';
import { loadPreferences, savePreferences, getInitials } from '../services/preferencesService';
import { UserPreferences } from '../types';

interface PreferencesSettingsProps {
    onSaved?: (prefs: UserPreferences) => void;
}

/**
 * Preferences pane (Settings modal): local profile identity.
 * Storage-only for now — preferredName wiring into tool prompts is
 * intentionally deferred (tools opt in later, per user decision).
 */
const PreferencesSettings: React.FC<PreferencesSettingsProps> = ({ onSaved }) => {
    const [username, setUsername] = useState('');
    const [preferredName, setPreferredName] = useState('');
    const [isSaving, setIsSaving] = useState(false);
    const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

    useEffect(() => {
        let mounted = true;
        loadPreferences().then(prefs => {
            if (!mounted || !prefs) return;
            setUsername(prefs.username);
            setPreferredName(prefs.preferredName);
        });
        return () => { mounted = false; };
    }, []);

    const initials = getInitials(username);

    const handleSave = async () => {
        setIsSaving(true);
        try {
            const saved = await savePreferences({
                username: username.trim(),
                preferredName: preferredName.trim()
            });
            onSaved?.(saved);
            setToast({ message: 'Preferences saved.', type: 'success' });
        } catch (err) {
            console.error('Failed to save preferences:', err);
            setToast({ message: 'Failed to save preferences. Please try again.', type: 'error' });
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div className="animate-fade-in">
            <Toast message={toast?.message ?? ''} type={toast?.type ?? 'success'} onClose={() => setToast(null)} />

            <div className="mb-8">
                <h3 className="text-lg font-extrabold text-slate-900 dark:text-slate-100">Preferences</h3>
                <p className="text-slate-500 dark:text-slate-400 text-sm mt-1 leading-relaxed">
                    Your local profile identity. Stored on this device only — used to personalize
                    your workspace, and soon, how models address you.
                </p>
            </div>

            <div className="space-y-6">
                <div>
                    <label htmlFor="pref-username" className="block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2">
                        Username
                    </label>
                    <div className="flex items-center gap-4">
                        <span
                            className="w-10 h-10 rounded-full bg-blue-600 text-white flex items-center justify-center text-sm font-bold flex-shrink-0 select-none"
                            aria-hidden="true"
                        >
                            {initials || <span className="material-icons text-base">person</span>}
                        </span>
                        <input
                            id="pref-username"
                            type="text"
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                            placeholder="e.g., Lucas"
                            maxLength={60}
                            className="flex-grow px-4 py-3 bg-white dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 rounded-xl text-sm focus:ring-2 focus:ring-blue-500/40 outline-none transition"
                        />
                    </div>
                    <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-2">
                        Shown as your initials in the profile area at the bottom of the sidebar.
                    </p>
                </div>

                <div>
                    <label htmlFor="pref-preferred-name" className="block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2">
                        What should the models call you?
                    </label>
                    <input
                        id="pref-preferred-name"
                        type="text"
                        value={preferredName}
                        onChange={(e) => setPreferredName(e.target.value)}
                        placeholder="e.g., Captain"
                        maxLength={60}
                        className="w-full px-4 py-3 bg-white dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 rounded-xl text-sm focus:ring-2 focus:ring-blue-500/40 outline-none transition"
                    />
                    <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-2">
                        Saved here for now — individual tools will opt into using it later.
                    </p>
                </div>

                <div className="flex justify-end pt-4 border-t border-slate-100 dark:border-slate-800/80">
                    <button
                        onClick={handleSave}
                        disabled={isSaving}
                        className="px-6 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-sm font-semibold shadow-md shadow-blue-600/10 disabled:opacity-50 transition cursor-pointer flex items-center"
                    >
                        {isSaving ? (
                            <span className="material-icons animate-spin mr-2 text-sm">sync</span>
                        ) : (
                            <span className="material-icons mr-2 text-sm">save</span>
                        )}
                        Save Preferences
                    </button>
                </div>
            </div>
        </div>
    );
};

export default PreferencesSettings;

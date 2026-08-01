import { UserPreferences } from '../types';
import { getUserPreferences, saveUserPreferences } from './dbService';

/**
 * User preferences service — session-cached access to the persisted profile
 * identity (IndexedDB `userPreferences` store, encrypted at rest).
 *
 * Boundary note: this holds NON-secret identity data only. The OpenRouter
 * API key deliberately stays memory-only in sessionService.
 */

let cachedPreferences: UserPreferences | null = null;

/** Load preferences from IndexedDB into the session cache. */
export const loadPreferences = async (): Promise<UserPreferences | null> => {
    try {
        cachedPreferences = (await getUserPreferences()) ?? null;
    } catch (err) {
        console.error('Failed to load user preferences:', err);
        cachedPreferences = null;
    }
    return cachedPreferences;
};

/** Synchronous access to the last loaded preferences (null until loadPreferences runs). */
export const getCachedPreferences = (): UserPreferences | null => cachedPreferences;

/** Persist preferences (stamps updatedAt) and refresh the session cache. */
export const savePreferences = async (prefs: Omit<UserPreferences, 'updatedAt'>): Promise<UserPreferences> => {
    const full: UserPreferences = { ...prefs, updatedAt: new Date().toISOString() };
    await saveUserPreferences(full);
    cachedPreferences = full;
    return full;
};

/**
 * Derive avatar initials from a username: first letter of the first word plus
 * first letter of the last word ("Lucas Smith" → "LS", "Lucas" → "L").
 * Returns '' when no username is set — callers render a fallback icon.
 */
export const getInitials = (username: string | null | undefined): string => {
    if (!username || !username.trim()) return '';
    const parts = username.trim().split(/\s+/);
    const first = parts[0]?.charAt(0) ?? '';
    const last = parts.length > 1 ? parts[parts.length - 1].charAt(0) : '';
    return (first + last).toUpperCase();
};

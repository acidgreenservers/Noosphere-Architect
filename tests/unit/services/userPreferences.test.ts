import { describe, it, expect, beforeEach } from 'vitest';
import 'fake-indexeddb/auto';
import * as db from '../../../src/services/dbService';
import { getInitials } from '../../../src/services/preferencesService';

/**
 * User Preferences (DB v18) — single-record store, encrypted round-trip,
 * plus the initials derivation that feeds the sidebar profile circle.
 */
describe('User Preferences (v18)', () => {
    beforeEach(async () => {
        // Fresh state per test: ensure DB is migrated, then clear the single-record store
        const database = await db.initDB();
        await new Promise<void>((resolve, reject) => {
            const tx = database.transaction('userPreferences', 'readwrite');
            tx.objectStore('userPreferences').clear();
            tx.oncomplete = () => resolve();
            tx.onerror = () => reject(tx.error);
        });
    });

    it('creates the userPreferences store during migration', async () => {
        const health = await db.checkDatabaseHealth();
        expect(health.storesPresent).toContain('userPreferences');
        expect(health.storesMissing).not.toContain('userPreferences');
        expect(health.healthy).toBe(true);
    });

    it('returns undefined when no preferences have been saved', async () => {
        const prefs = await db.getUserPreferences();
        expect(prefs).toBeUndefined();
    });

    it('saves and retrieves preferences with encrypted round-trip fidelity', async () => {
        await db.saveUserPreferences({
            username: 'Lucas',
            preferredName: 'Captain',
            updatedAt: new Date().toISOString()
        });

        const prefs = await db.getUserPreferences();
        expect(prefs).toBeDefined();
        expect(prefs?.username).toBe('Lucas');
        expect(prefs?.preferredName).toBe('Captain');
        expect(prefs?.updatedAt).toBeTruthy();
    });

    it('overwrites the single current record instead of duplicating', async () => {
        await db.saveUserPreferences({ username: 'First', preferredName: 'One', updatedAt: new Date().toISOString() });
        await db.saveUserPreferences({ username: 'Second', preferredName: 'Two', updatedAt: new Date().toISOString() });

        const prefs = await db.getUserPreferences();
        expect(prefs?.username).toBe('Second');
        expect(prefs?.preferredName).toBe('Two');
    });
});

describe('getInitials', () => {
    it('derives initials from the first and last words', () => {
        expect(getInitials('Lucas')).toBe('L');
        expect(getInitials('Lucas Smith')).toBe('LS');
        expect(getInitials('mary jane watson')).toBe('MW');
    });

    it('returns empty string for blank or missing usernames', () => {
        expect(getInitials('')).toBe('');
        expect(getInitials('   ')).toBe('');
        expect(getInitials(null)).toBe('');
        expect(getInitials(undefined)).toBe('');
    });
});

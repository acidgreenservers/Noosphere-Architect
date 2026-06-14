
import { describe, it, expect, beforeEach } from 'vitest';
import * as db from '../../src/services/dbService';
import { SavedCompressedSignal } from '../../src/types';

describe('Signal Compression Database Operations', () => {
    beforeEach(async () => {
        const check = await db.checkDatabaseHealth();
        if (check.healthy) {
            await db.clearAllCompressedSignals();
        }
    });

    it('should add and retrieve a compressed signal with encryption', async () => {
        const signal: SavedCompressedSignal = {
            name: 'Test Compression',
            config: { messyInput: 'Some messy input context that needs compression.' },
            result: { compressedText: 'Compressed text signal.' },
            createdAt: new Date().toISOString(),
            isStarred: true,
            isPinned: false,
            isArchived: false,
            category: 'Testing'
        };

        const id = await db.addCompressedSignal(signal);
        expect(id).toBeDefined();

        const allSignals = await db.getAllCompressedSignals();
        expect(allSignals.length).toBe(1);
        expect(allSignals[0].name).toBe(signal.name);
        expect(allSignals[0].config.messyInput).toBe(signal.config.messyInput);
        expect(allSignals[0].result.compressedText).toBe(signal.result.compressedText);
        expect(allSignals[0].isStarred).toBe(true);
        expect(allSignals[0].category).toBe('Testing');
    });

    it('should update a compressed signal', async () => {
        const signal: SavedCompressedSignal = {
            name: 'Original Name',
            config: { messyInput: 'Input' },
            result: { compressedText: 'Output' },
            createdAt: new Date().toISOString()
        };

        const id = await db.addCompressedSignal(signal);
        const saved = (await db.getAllCompressedSignals())[0];

        saved.name = 'Updated Name';
        await db.updateCompressedSignal(saved);

        const updated = (await db.getAllCompressedSignals())[0];
        expect(updated.name).toBe('Updated Name');
    });

    it('should delete a compressed signal', async () => {
        const signal: SavedCompressedSignal = {
            name: 'To Delete',
            config: { messyInput: 'Input' },
            result: { compressedText: 'Output' },
            createdAt: new Date().toISOString()
        };

        const id = await db.addCompressedSignal(signal);
        await db.deleteCompressedSignal(id!);

        const allSignals = await db.getAllCompressedSignals();
        expect(allSignals.length).toBe(0);
    });

    it('should handle drafts correctly', async () => {
        const draft = {
            id: 1,
            config: { messyInput: 'Draft content' }
        };

        await db.saveCompressedSignalDraft(draft);
        const retrieved = await db.getCompressedSignalDraft(1);
        expect(retrieved?.config.messyInput).toBe('Draft content');

        await db.clearCompressedSignalDraft(1);
        const cleared = await db.getCompressedSignalDraft(1);
        expect(cleared).toBeUndefined();
    });

    it('should appear in unified library items', async () => {
        const signal: SavedCompressedSignal = {
            name: 'Unified Test',
            config: { messyInput: 'Input' },
            result: { compressedText: 'Output' },
            createdAt: new Date().toISOString()
        };

        await db.addCompressedSignal(signal);
        const unified = await db.getAllUnifiedItems();
        const found = unified.find(u => u.type === 'compressed-signal');

        expect(found).toBeDefined();
        expect(found?.name).toBe('Unified Test');
    });
});

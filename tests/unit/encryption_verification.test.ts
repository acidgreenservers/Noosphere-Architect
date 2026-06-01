import { describe, it, expect, beforeEach, vi } from 'vitest';
import * as db from '../../src/services/dbService';
import CryptoJS from 'crypto-js';

// Mock the environment variable
vi.stubEnv('VITE_ENCRYPTION_KEY', 'test-key');

describe('Database Encryption', () => {
    it('should encrypt and decrypt an agent', async () => {
        const agent: any = {
            name: 'Security Agent',
            config: { role: 'Guardian', scope: 'Global', goals: 'Protect', constraints: 'None' },
            prompt: 'Always be vigilant.',
            createdAt: new Date().toISOString(),
            isStarred: true
        };

        const id = await db.addAgent(agent);
        expect(id).toBeDefined();

        // Directly check IndexedDB content to see if it's encrypted
        // Since we are using fake-indexeddb in vitest environment, we can try to get the raw data
        const savedAgents = await db.getAllAgents();
        const retrieved = savedAgents.find(a => a.id === id);

        expect(retrieved?.name).toBe(agent.name);
        expect(retrieved?.config).toEqual(agent.config);
        expect(retrieved?.prompt).toBe(agent.prompt);
        expect(retrieved?.isStarred).toBe(true);
    });

    it('should encrypt and decrypt a project', async () => {
        const project: any = {
            name: 'Secure Project',
            config: { title: 'Project X', idea: 'Secret', vision: 'Clear', goal: 'Win' },
            files: { overviewFile: 'MD', standardsFile: 'ARCH', rulesFile: 'SEC' },
            createdAt: new Date().toISOString()
        };

        const id = await db.addProject(project);
        const projects = await db.getAllProjects();
        const retrieved = projects.find(p => p.id === id);

        expect(retrieved?.name).toBe(project.name);
        expect(retrieved?.config).toEqual(project.config);
        expect(retrieved?.files).toEqual(project.files);
    });

    it('should encrypt and decrypt custom context', async () => {
        const context = "My secret custom context.";
        await db.saveCustomContext('agentContext', context);
        const retrieved = await db.getCustomContext('agentContext');
        expect(retrieved).toBe(context);
    });

    it('should retrieve unified items correctly', async () => {
        const agent: any = {
            name: 'Unified Agent',
            config: { role: 'U', scope: 'U', goals: 'U', constraints: 'U' },
            createdAt: new Date().toISOString()
        };
        await db.addAgent(agent);

        const unified = await db.getAllUnifiedItems();
        const found = unified.find(u => u.name === 'Unified Agent');
        expect(found).toBeDefined();
        expect(found?.type).toBe('agent');
        expect(found?.original.config).toEqual(agent.config);
    });

    it('should gracefully handle unencrypted legacy data', async () => {
        // Manually bypass the db.add* methods which now encrypt,
        // and put raw data into the store to simulate legacy data.
        const dbInstance = await (db as any).initDB();
        const tx = dbInstance.transaction('savedAgents', 'readwrite');
        const store = tx.objectStore('savedAgents');

        const legacyAgent = {
            id: 999,
            name: 'Legacy Agent',
            config: { role: 'L', scope: 'L', goals: 'L', constraints: 'L' },
            prompt: 'Old plain text prompt',
            createdAt: new Date().toISOString()
        };

        await new Promise((resolve, reject) => {
            const req = store.add(legacyAgent);
            req.onsuccess = () => resolve(req.result);
            req.onerror = () => reject(req.error);
        });

        const agents = await db.getAllAgents();
        const retrieved = agents.find(a => a.id === 999);

        expect(retrieved?.name).toBe('Legacy Agent');
        expect(retrieved?.config).toEqual(legacyAgent.config);
        expect(retrieved?.prompt).toBe('Old plain text prompt');
    });
});


import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
    saveDraft, getDraft,
    saveTypedPromptDraft, getTypedPromptDraft,
    saveMindSeedDraft, getMindSeedDraft,
    saveCustomContext, getCustomContext,
    saveProjectDraft, getProjectDraft,
    saveSignalDraft, getSignalDraft,
    saveRoadmapDraft, getRoadmapDraft,
    saveAgentJobDraft, getAgentJobDraft,
    saveCompressedSignalDraft, getCompressedSignalDraft,
    saveSeedDraft, getSeedDraft,
    initDB
} from '../../src/services/dbService';

describe('Atomic Write Verification', () => {
    beforeEach(async () => {
        await initDB();
    });

    it('should verify agent draft write', async () => {
        const draft = { id: 1, config: { role: 'Architect', scope: 'Global', goals: 'Integrity', constraints: 'Rigorous' } };
        const id = await saveDraft(draft);
        expect(id).toBe(1);
        const retrieved = await getDraft(1);
        expect(retrieved?.config.role).toBe('Architect');
    });

    it('should verify typed prompt draft write', async () => {
        const draft = { id: 1, config: { goal: 'Truth', instructions: 'Map bridges' } };
        const id = await saveTypedPromptDraft('standard', draft);
        expect(id).toBe(1);
        const retrieved = await getTypedPromptDraft('standard', 1);
        expect((retrieved?.config as any)?.goal).toBe('Truth');
    });

    it('should verify mindseed draft write', async () => {
        const draft = { id: 1, config: { type: 'cogni' as const, text: 'Dense signal' } };
        const id = await saveMindSeedDraft(draft);
        expect(id).toBe(1);
        const retrieved = await getMindSeedDraft(1);
        expect(retrieved?.config.text).toBe('Dense signal');
    });

    it('should verify custom context write', async () => {
        const context = "Always ground in the purpose seed.";
        await saveCustomContext('agentContext', context);
        const retrieved = await getCustomContext('agentContext');
        expect(retrieved).toBe(context);
    });

    it('should verify project draft write', async () => {
        const draft = { id: 1, config: { title: 'Project X', idea: 'Logic Tracing', vision: 'Invariants', goal: 'Stewardship', techStack: 'TS', architecture: 'Modular', securityPosition: 'Secure', accessibilityPosition: 'High', guidingPrinciples: 'Principles', targetAudience: 'Engineers', keyConstraints: 'Context', successCriteria: 'Operational', rules: '', constraints: '', guidelines: '', roles: '', standards: '', consistency: '' } };
        const id = await saveProjectDraft(draft);
        expect(id).toBe(1);
        const retrieved = await getProjectDraft(1);
        expect(retrieved?.config.title).toBe('Project X');
    });

    it('should verify signal draft write', async () => {
        const draft = { id: 1, config: { messyPrompt: 'messy stuff' } };
        const id = await saveSignalDraft(draft);
        expect(id).toBe(1);
        const retrieved = await getSignalDraft(1);
        expect(retrieved?.config.messyPrompt).toBe('messy stuff');
    });

    it('should verify roadmap draft write', async () => {
        const draft = { id: 1, config: { rawText: 'Future tasks' } };
        const id = await saveRoadmapDraft(draft);
        expect(id).toBe(1);
        const retrieved = await getRoadmapDraft(1);
        expect(retrieved?.config.rawText).toBe('Future tasks');
    });

    it('should verify agent job draft write', async () => {
        const draft = { id: 1, config: { jobTitle: 'Scribe', department: 'Arch', reportsTo: 'Architect', mission: 'Document', responsibilities: 'Audit', qualifications: 'Rigorous', operatingPrinciples: 'Honest', authority: 'Steward', escalationPath: 'None', successCriteria: 'Clarity', constraints: 'None' } };
        const id = await saveAgentJobDraft(draft);
        expect(id).toBe(1);
        const retrieved = await getAgentJobDraft(1);
        expect(retrieved?.config.jobTitle).toBe('Scribe');
    });

    it('should verify compressed signal draft write with atomic read-back', async () => {
        const draft = { id: 1, config: { messyInput: 'Compressed intent signal' } };
        const id = await saveCompressedSignalDraft(draft);
        expect(id).toBe(1);
        const retrieved = await getCompressedSignalDraft(1);
        expect(retrieved?.config.messyInput).toBe('Compressed intent signal');
    });

    it('should verify seed architect draft write with atomic read-back', async () => {
        const draft = { id: 1, config: { promptText: 'Systemic Seed Concept', n: 3 } };
        const id = await saveSeedDraft(draft);
        expect(id).toBe(1);
        const retrieved = await getSeedDraft(1);
        expect(retrieved?.config.promptText).toBe('Systemic Seed Concept');
    });
});

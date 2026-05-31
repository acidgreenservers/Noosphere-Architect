import { describe, it, expect, vi, beforeEach } from 'vitest';
import { generateRoadmapTask } from '../../../../src/services/ai/roadmapService';
import { handleAiCall } from '../../../../src/services/ai/openRouter';

vi.mock('../../../../src/services/ai/openRouter', () => ({
  handleAiCall: vi.fn(),
  AbortError: class AbortError extends Error {
    constructor(message: string) {
      super(message);
      this.name = 'AbortError';
    }
  }
}));

describe('roadmapService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should include new context fields in the prompt', async () => {
    const config = {
      rawText: 'Implement a new feature.',
      project: 'Test Project',
      framework: 'Test Framework',
      architecture: 'Test Architecture',
      purpose: 'Test Purpose',
      direction: 'Test Direction'
    };

    (handleAiCall as any).mockResolvedValue('Generated Roadmap Task');

    await generateRoadmapTask(config);

    const callArgs = (handleAiCall as any).mock.calls[0];
    const prompt = callArgs[0];

    expect(prompt).toContain('**Project:** Test Project');
    expect(prompt).toContain('**Framework:** Test Framework');
    expect(prompt).toContain('**Architecture:** Test Architecture');
    expect(prompt).toContain('**Purpose:** Test Purpose');
    expect(prompt).toContain('**Direction:** Test Direction');
    expect(prompt).toContain('Implement a new feature.');
  });

  it('should only include provided context fields', async () => {
    const config = {
      rawText: 'Implement another feature.',
      project: 'Minimal Project'
    };

    (handleAiCall as any).mockResolvedValue('Generated Roadmap Task');

    await generateRoadmapTask(config);

    const callArgs = (handleAiCall as any).mock.calls[0];
    const prompt = callArgs[0];

    expect(prompt).toContain('**Project:** Minimal Project');
    expect(prompt).not.toContain('**Framework:**');
    expect(prompt).not.toContain('**Architecture:**');
    expect(prompt).not.toContain('**Purpose:**');
    expect(prompt).not.toContain('**Direction:**');
    expect(prompt).toContain('Implement another feature.');
  });
});

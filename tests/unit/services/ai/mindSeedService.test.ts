
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { generateMindSeed } from '../../../../src/services/ai/mindSeedService';
import * as openRouter from '../../../../src/services/ai/openRouter';

vi.mock('../../../../src/services/ai/openRouter', () => ({
  handleAiCall: vi.fn().mockImplementation(() => Promise.resolve())
}));

vi.mock('../../../../src/services/dbService', () => ({
  getCustomContext: vi.fn().mockResolvedValue('')
}));

describe('mindSeedService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should compress text into a generative seed', async () => {
    const mockSeed = {
      seed: "Density is the bridge to truth.",
      pattern: "**Stewardship** State is guarded then served.",
      deployWhen: "Building systems, mapping topology"
    };

    vi.mocked(openRouter.handleAiCall).mockResolvedValue(mockSeed as any);

    const config = {
      type: 'cogni' as const,
      text: 'Long body of text to be compressed into wisdom.'
    };

    const result = await generateMindSeed(config);

    expect(openRouter.handleAiCall).toHaveBeenCalled();
    expect(result.seed.split(' ').length).toBeLessThan(12);
    expect(result).toEqual(mockSeed);
  });
});

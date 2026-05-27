
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { generateSkillBundle } from '../../../../src/services/ai/skillBundleService';
import * as openRouter from '../../../../src/services/ai/openRouter';

vi.mock('../../../../src/services/ai/openRouter', () => ({
  handleAiCall: vi.fn().mockImplementation(() => Promise.resolve())
}));

describe('skillBundleService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should generate a 4-file skill bundle', async () => {
    const mockResponse = {
      agentFile: 'Agent Content',
      projectGuidelines: 'Guidelines Content',
      constraintsFile: 'Constraints Content',
      skillFile: 'Skill Content'
    };

    vi.mocked(openRouter.handleAiCall).mockResolvedValue(mockResponse as any);

    const config = {
      role: 'D3 Specialist',
      scope: 'Data Viz',
      goals: 'Fast charts',
      constraints: 'No bloat'
    };

    const result = await generateSkillBundle(config);

    expect(openRouter.handleAiCall).toHaveBeenCalled();
    expect(result).toEqual(mockResponse);
  });

  it('should validate core input fields', async () => {
    const config = {
      role: '',
      scope: '',
      goals: '',
      constraints: ''
    };

    await expect(generateSkillBundle(config)).rejects.toThrow();
  });
});

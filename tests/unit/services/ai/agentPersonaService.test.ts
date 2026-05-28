
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { generateAgentPersona } from '../../../../src/services/ai/agentPersonaService';
import * as openRouter from '../../../../src/services/ai/openRouter';

vi.mock('../../../../src/services/ai/openRouter', () => ({
  handleAiCall: vi.fn().mockImplementation(() => Promise.resolve())
}));

describe('agentPersonaService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should generate agent files with consistent topology', async () => {
    const mockResponse = {
      signal: 'Test signal',
      prompt: '# ROLE AND GOAL\nTest prompt'
    };

    vi.mocked(openRouter.handleAiCall).mockResolvedValue(mockResponse as any);

    const config = {
      role: 'Test Architect',
      scope: 'Testing topology',
      goals: 'Verify generation',
      constraints: 'No failures'
    };

    const result = await generateAgentPersona(config);

    expect(openRouter.handleAiCall).toHaveBeenCalled();
    expect(result).toEqual(mockResponse);
    expect(result.prompt).toContain('# ROLE AND GOAL');
  });

  it('should throw error if input is missing required fields', async () => {
    const config = {
      role: '',
      scope: '',
      goals: '',
      constraints: ''
    };

    await expect(generateAgentPersona(config)).rejects.toThrow();
  });
});

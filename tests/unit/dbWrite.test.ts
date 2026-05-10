
import { describe, it, expect } from 'vitest';
import { addMindSeed, getAllMindSeeds } from '../../src/services/dbService';
import { SavedMindSeed } from '../../src/types';

describe('Database MindSeed Stores', () => {
  const mockSeed: SavedMindSeed = {
    name: 'Test Seed',
    config: { type: 'cogni', text: 'Test input' },
    result: { seed: 'Test Result', pattern: 'Test Pattern', deployWhen: 'Test Deploy' },
    createdAt: new Date().toISOString()
  };

  it('should save and retrieve a CogniSeed', async () => {
    const id = await addMindSeed(mockSeed);
    expect(id).toBeDefined();

    const seeds = await getAllMindSeeds('cogni');
    expect(seeds.length).toBeGreaterThan(0);
    expect(seeds[0].result.seed).toBe('Test Result');
  });

  it('should store seeds in separate stores based on type', async () => {
    const linguaSeed: SavedMindSeed = { ...mockSeed, config: { type: 'lingua', text: 'input' } };
    await addMindSeed(linguaSeed);

    const linguaSeeds = await getAllMindSeeds('lingua');
    expect(linguaSeeds.some(s => s.config.type === 'lingua')).toBe(true);
  });
});

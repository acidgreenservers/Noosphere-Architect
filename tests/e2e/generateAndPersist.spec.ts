
import { test, expect } from '@playwright/test';

test.describe('MindSeed E2E Flow', () => {
  test('should navigate to MindSeed tool and show creators', async ({ page }) => {
    await page.goto('http://localhost:3000/Noosphere-Architect/');
    await page.click('text=MindSeed Architect Tool');

    await expect(page.getByRole('heading', { name: 'MindSeed Architect', exact: true })).toBeVisible();
    await expect(page.locator('text=CogniSeed Creator')).toBeVisible();
    await expect(page.locator('text=LinguaSeed Creator')).toBeVisible();
    await expect(page.locator('text=ArchSeed Creator')).toBeVisible();
  });

  test('button dimensions should be invariant', async ({ page }) => {
    await page.goto('http://localhost:3000/Noosphere-Architect/');
    await page.click('text=MindSeed Architect Tool');

    const button = page.getByTestId('generate-button');

    // Check computed styles for invariance
    const width = await button.evaluate(el => window.getComputedStyle(el).width);
    const height = await button.evaluate(el => window.getComputedStyle(el).height);
    const padding = await button.evaluate(el => window.getComputedStyle(el).padding);

    expect(width).toBe('180px');
    expect(height).toBe('44px');
    expect(padding).toBe('0px 24px');
  });
});

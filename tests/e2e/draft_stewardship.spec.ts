
import { test, expect } from '@playwright/test';

test.describe('Draft Stewardship', () => {
  test('unsaved drafts should persist across tool switching and reloads', async ({ page }) => {
    await page.goto('http://localhost:3000/Noosphere-Architect/');

    // 1. Enter text in Signal Extractor
    await page.getByRole('button', { name: 'Select Signal Extractor tool' }).first().click();
    const signalTextarea = page.locator('textarea#messyPrompt');
    await signalTextarea.fill('This is a messy signal draft that should persist.');

    // Wait for auto-save (1.5s in implementation)
    await page.waitForTimeout(2000);

    // 2. Switch to another tool
    await page.getByRole('button', { name: 'Go to MindSeed Architect' }).click();
    await expect(page.getByRole('heading', { name: 'MindSeed Architect', exact: true })).toBeVisible();

    // 3. Reload the page
    await page.reload();

    // 4. Return to Signal Extractor and verify restore modal
    await page.getByRole('button', { name: 'Go to Signal Extractor' }).click();

    // The custom modal should appear
    const modal = page.getByRole('dialog');
    await expect(modal).toBeVisible();
    await expect(modal).toContainText('Unsaved Draft Found');

    // 5. Restore the draft
    await page.click('button:has-text("Restore Draft")');
    await expect(signalTextarea).toHaveValue('This is a messy signal draft that should persist.');
  });
});

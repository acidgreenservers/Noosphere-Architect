
import { test, expect } from '@playwright/test';

test.describe('Architecture Organization System', () => {
  test('should navigate to Org tool and show unified items', async ({ page }) => {
    await page.goto('http://localhost:3000/Noosphere-Architect/');
    await page.getByRole('button', { name: 'Select Architecture Organization tool' }).click();
    await expect(page.getByRole('heading', { name: 'Architecture Organization', exact: true })).toBeVisible();

    // Check sidebar views
    await expect(page.locator('text=all')).toBeVisible();
    await expect(page.locator('text=starred')).toBeVisible();
  });

  test('should allow selection and entering synthesis workspace', async ({ page }) => {
    // Mock OpenRouter API for consistency in E2E
    await page.route('https://openrouter.ai/api/v1/chat/completions', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          choices: [{
            message: {
              content: JSON.stringify({
                signal: "Mock signal",
                prompt: "Mock synthesized prompt"
              })
            }
          }]
        })
      });
    });

    await page.goto('http://localhost:3000/Noosphere-Architect/');

    // Setup API Key and Model to enable generation
    await page.getByRole('button', { name: 'Select Agent API Settings tool' }).click();
    await page.locator('input[placeholder="sk-or-v1-..."]').fill('mock-key');
    await page.locator('input[placeholder="e.g., anthropic/claude-3-opus"]').fill('mock-model');
    await page.click('button:has-text("Save Settings")');
    await page.click('button[aria-label="Back to home"]');

    // 1. Create a prompt to have something to select
    await page.getByRole('button', { name: 'Select Prompt & Skill Architect tool' }).click();
    await page.locator('input#goal').fill('Test Goal');
    await page.click('button:has-text("Generate")');

    // Wait for button to be visible (generation mock is fast but UI transition matters)
    const saveBtn = page.locator('button:has-text("Save")').first();
    await expect(saveBtn).toBeVisible({ timeout: 10000 });
    await saveBtn.click();
    await page.locator('input').last().fill('Test Prompt 1');
    // Clicking save in the modal
    await page.getByRole('button', { name: 'Save', exact: true }).click();

    // 2. Go to Org tool
    await page.click('button[title="Architecture Organization"]');

    // 3. Select the item (clicking the card triggers selection in Org tool)
    await page.click('text=Test Prompt 1');

    // 4. Action bar should appear
    await expect(page.locator('text=1 items selected')).toBeVisible();

    // 5. Enter synthesis
    await page.click('button:has-text("Synthesize")');
    await expect(page.locator('text=Topology Synthesis Workspace')).toBeVisible();
  });
});

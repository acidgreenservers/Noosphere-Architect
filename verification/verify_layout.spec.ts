import { test, expect } from '@playwright/test';

test('verify landing page layout and tools', async ({ page }) => {
  await page.goto('http://localhost:3000/');

  // Wait for the landing page to load
  await expect(page.locator('h1')).toContainText('Architecting Intelligence');

  // Scroll to tools section
  const toolsHeading = page.locator('h2:has-text("Available Tools")');
  await toolsHeading.scrollIntoViewIfNeeded();

  // Check for Signal Extractor card
  const signalExtractorCard = page.locator('div:has-text("Signal Extractor")').first();
  await expect(signalExtractorCard).toBeVisible();

  // Check for Prompt Architect card
  const promptArchitectCard = page.locator('div:has-text("Prompt Architect")').first();
  await expect(promptArchitectCard).toBeVisible();

  // Take screenshot of tools section
  await page.screenshot({ path: 'verification/tools_section.png' });

  // Verify colors
  const signalExtractorIcon = signalExtractorCard.locator('.material-icons');
  const iconColor = await signalExtractorIcon.evaluate((el) => window.getComputedStyle(el).color);
  console.log('Signal Extractor Icon Color:', iconColor);
  // Blue-500 is roughly rgb(59, 130, 246)
});

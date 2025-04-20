// tests/basic-load.spec.ts
import { test, expect } from '@playwright/test';

test('Page loads and shows graph container', async ({ page }) => {
  await page.goto('/'); // Uses baseURL from playwright.config.ts
  await expect(page.locator('h1')).toHaveText('MakeItMakeSense.io Graph');
  // Removed check for loading text as it might disappear too quickly
  // await expect(page.getByText('Loading graph data...')).toBeVisible();
  const graphContainer = page.locator('[data-testid="graph-container"]');
  await expect(graphContainer).toBeVisible();
  // Wait longer for the main node canvas element to appear after data loads
  await expect(graphContainer.locator('canvas[data-id="layer2-node"]')).toBeVisible({ timeout: 15000 });
});

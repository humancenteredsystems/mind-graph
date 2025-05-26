// tests/basic-load.spec.ts
import { test, expect } from '@playwright/test';

test('Page loads and shows graph container', async ({ page }) => {
  await page.goto('/');
  
  // Check page title
  await expect(page.locator('h1')).toHaveText('MakeItMakeSense.io Graph');
  
  // Look for loading message, but don't fail if it's not there or already disappeared
  try {
    await expect(page.getByText('Loading graph data...')).toBeVisible({ timeout: 2000 });
  } catch (e) {
    console.log('Loading message not found or already disappeared');
  }
  
  // Check graph container exists
  const graphContainer = page.locator('[data-testid="graph-container"]');
  await expect(graphContainer).toBeVisible();
  
  // Check any canvas element is visible in the container (Cytoscape creates multiple canvases)
  await expect(graphContainer.locator('canvas').first()).toBeVisible({ timeout: 15000 });
});

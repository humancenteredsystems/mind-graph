// tests/initial-graph.spec.ts
import { test, expect } from '@playwright/test';

// Helper function to get Cytoscape element counts via page.evaluate
async function getCyCounts(page: any) {
  return await page.evaluate(() => {
    const cy = (window as any).cyInstance; // Assumes cyInstance is exposed on window
    if (!cy) return { nodes: -1, edges: -1 }; // Indicate error
    return { nodes: cy.nodes().length, edges: cy.edges().length };
  });
}

test('Initial graph renders expected nodes and edges', async ({ page }) => {
  await page.goto('/');
  const canvas = page.locator('[data-testid="graph-container"] canvas').first();
  await expect(canvas).toBeVisible({ timeout: 15000 });

  // Wait for Cytoscape instance to likely be ready and populated
  await page.waitForFunction(() => (window as any).cyInstance && (window as any).cyInstance.nodes().length > 0, null, { timeout: 15000 });

  const counts = await getCyCounts(page);
  expect(counts.nodes).toBeGreaterThan(0); // We expect at least some nodes to be loaded
  expect(counts.nodes).not.toBe(-1); // Ensure cyInstance was found
  
  // Note: The exact count assertions are commented since we don't know the exact count without seeing the test data
  // Uncomment and adjust these based on your actual test environment data
  // expect(counts.nodes).toBe(2); // Expecting initial nodes
  // expect(counts.edges).toBe(1); // Expecting initial edges
});

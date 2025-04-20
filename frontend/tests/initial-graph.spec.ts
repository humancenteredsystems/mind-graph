// tests/initial-graph.spec.ts
import { test, expect, Page } from '@playwright/test'; // Import Page type

// Helper function to get Cytoscape element counts via page.evaluate
async function getCyCounts(page: Page) { // Add type annotation for page
  // Wait for the cyInstance to be available on the window object
  await page.waitForFunction(() => (window as any).cyInstance, null, { timeout: 10000 });
  return await page.evaluate(() => {
    const cy = (window as any).cyInstance; // Assumes cyInstance is exposed on window
    if (!cy) return { nodes: -1, edges: -1 }; // Indicate error or not ready
    return { nodes: cy.nodes().length, edges: cy.edges().length };
  });
}

test('Initial graph renders expected nodes and edges', async ({ page }) => {
  await page.goto('/');
  // Target the specific node layer canvas
  const canvas = page.locator('[data-testid="graph-container"] canvas[data-id="layer2-node"]');
  await expect(canvas).toBeVisible({ timeout: 15000 });

  // Wait specifically for nodes to appear using the helper
  await expect(async () => {
    const counts = await getCyCounts(page);
    expect(counts.nodes).toBeGreaterThan(0);
  }).toPass({ timeout: 15000 }); // Wait up to 15 seconds for nodes count > 0

  // Now check the final counts
  const counts = await getCyCounts(page);
  expect(counts.nodes).toBe(2); // Expecting node1 and node3 initially
  expect(counts.edges).toBe(1); // Expecting edge between node1 and node3
});

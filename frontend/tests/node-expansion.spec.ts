// tests/node-expansion.spec.ts
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

// Helper function to trigger context menu via native right-click at node position
async function triggerContextMenu(page: Page, nodeId: string) {
  await page.waitForFunction(() => (window as any).cyInstance, null, { timeout: 10000 });

  // Get node position via evaluate
  const position = await page.evaluate((id) => {
    const cy = (window as any).cyInstance;
    const node = cy?.getElementById(id);
    return node?.renderedPosition(); // Get rendered position { x, y }
  }, nodeId);

  if (!position) {
    throw new Error(`Failed to find node ${nodeId} or its position in Cytoscape.`);
  }

  // Simulate right-click down and up with a small delay
  await page.mouse.move(position.x, position.y); // Move mouse to position first
  await page.mouse.down({ button: 'right' });
  await page.waitForTimeout(50); // Small delay to simulate holding the button
  await page.mouse.up({ button: 'right' });
  await page.waitForTimeout(100); // Wait for the context menu to appear

}

test.beforeEach(async ({ page }) => {
  await page.goto('/');
  // Wait for initial load and canvas visibility
  await expect(page.locator('[data-testid="graph-container"] canvas[data-id="layer2-node"]')).toBeVisible({ timeout: 15000 });
  // Wait for cyInstance and initial nodes
  await expect(async () => {
    const counts = await getCyCounts(page);
    expect(counts.nodes).toBeGreaterThan(0);
  }).toPass({ timeout: 15000 });
});

test('Expanding node1 (no new nodes) keeps graph visible', async ({ page }) => {
  const initialCounts = await getCyCounts(page);
  expect(initialCounts.nodes).toBe(2); // Verify initial state assumption
  expect(initialCounts.edges).toBe(1);

  // Trigger context menu on node1
  await triggerContextMenu(page, 'node1');

  // Add a small delay before clicking
  await page.waitForTimeout(50);
  // Click Expand menu item using its ID, forcing the click even if Playwright considers it hidden
  await page.locator('#expand').click({ force: true });

  // Wait a moment for potential async operations and UI updates
  await page.waitForTimeout(500); // Small delay

  // Assert counts haven't changed
  const finalCounts = await getCyCounts(page);
  expect(finalCounts.nodes).toBe(initialCounts.nodes);
  expect(finalCounts.edges).toBe(initialCounts.edges);

  // Assert canvas is still visible
  await expect(page.locator('[data-testid="graph-container"] canvas[data-id="layer2-node"]')).toBeVisible();
});

// Placeholder test - requires seed data where node3 has children
test.skip('Expanding node3 adds new nodes/edges', async ({ page }) => {
  // Pre-condition: Ensure node3 exists from initial load
  await expect(async () => {
    const counts = await getCyCounts(page);
    expect(counts.nodes).toContain(2); // node1 and node3
  }).toPass();

  const initialCounts = await getCyCounts(page);

  // Trigger context menu on node3
  await triggerContextMenu(page, 'node3');

  // Add a small delay before clicking
  await page.waitForTimeout(50);
  // Click Expand menu item using its ID
  await page.locator('#expand').click();

  // Wait for network idle or a specific condition indicating load completion
  await page.waitForLoadState('networkidle', { timeout: 10000 }); // Wait for API call to finish
  await page.waitForTimeout(500); // Extra buffer

  // Assert counts have increased (assuming node3 has children in seed data)
  const finalCounts = await getCyCounts(page);
  expect(finalCounts.nodes).toBeGreaterThan(initialCounts.nodes);
  expect(finalCounts.edges).toBeGreaterThan(initialCounts.edges);

  // Assert canvas is still visible
  await expect(page.locator('[data-testid="graph-container"] canvas[data-id="layer2-node"]')).toBeVisible();
});

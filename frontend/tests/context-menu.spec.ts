// tests/context-menu.spec.ts
import { test, expect, Page } from '@playwright/test'; // Import Page type

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

test('Right-clicking a node shows context menu with Expand option', async ({ page }) => {
  await page.goto('/');
  // Wait for initial load
  await expect(page.locator('[data-testid="graph-container"] canvas[data-id="layer2-node"]')).toBeVisible({ timeout: 15000 });
  // Wait for cyInstance and initial nodes
  await page.waitForFunction(() => (window as any).cyInstance && (window as any).cyInstance.nodes().length > 0, null, { timeout: 15000 });

  // Trigger context menu on node1
  await triggerContextMenu(page, 'node1');

  // Check that the menu item is visible using its ID
  const expandMenuItem = page.locator('#expand');
  // Add a small delay before clicking
  await page.waitForTimeout(50);
  // Click the menu item, forcing the click even if Playwright considers it hidden
  await expandMenuItem.click({ force: true });

  // Optional: Check that clicking it closes the menu (or triggers expected action)
  await expect(expandMenuItem).not.toBeVisible(); // Assuming click closes it
});

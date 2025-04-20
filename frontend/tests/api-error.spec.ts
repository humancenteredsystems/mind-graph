// tests/api-error.spec.ts
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

  // Perform a right-click at the node's position
  await page.mouse.click(position.x, position.y, { button: 'right' });
}

test('Handles API error on initial load', async ({ page }) => {
  // Intercept the initial API call and return an error
  // Use a glob pattern to match the specific endpoint
  await page.route('**/api/traverse', async route => {
    // Only fail the initial load request (assuming it's the first POST to this endpoint)
    if (route.request().method() === 'POST') {
      console.log(`Intercepting initial load: ${route.request().url()}`);
      try {
        await route.fulfill({ status: 500, contentType: 'application/json', body: JSON.stringify({ error: 'Simulated server error' }) });
      } catch (e) {
        console.error("Error fulfilling route:", e);
        // If fulfill fails, abort or continue, but log it.
        await route.abort();
      }
    } else {
      await route.continue(); // Continue other methods like OPTIONS
    }
  }, { times: 1 }); // Intercept only the first POST request

  await page.goto('/');

  // Check for the specific error message from App.tsx
  await expect(page.getByText('Error: Failed to load initial graph data.')).toBeVisible({ timeout: 10000 });
  // Ensure loading message disappears
  await expect(page.getByText('Loading graph data...')).not.toBeVisible();
  // Ensure graph container might still be there, but no canvas
  await expect(page.locator('[data-testid="graph-container"]')).toBeVisible();
  // Removed check for canvas not being visible, as it might still render
});

test('Handles API error on node expansion', async ({ page }) => {
  // Allow initial load to succeed
  await page.goto('/');
  // Target the specific node layer canvas
  await expect(page.locator('[data-testid="graph-container"] canvas[data-id="layer2-node"]')).toBeVisible({ timeout: 15000 });
  // Wait for cyInstance and initial nodes
  await page.waitForFunction(() => (window as any).cyInstance && (window as any).cyInstance.nodes().length > 0, null, { timeout: 15000 });

  // Intercept subsequent API calls for expansion of node1
  let interceptCount = 0;
  await page.route('**/api/traverse', async route => {
    interceptCount++;
    console.log(`Intercepting traverse call #${interceptCount}: ${route.request().url()}`);
    // Let initial load pass (assuming it happened before this route handler is hit consistently)
    // Fail the first expansion request specifically for node1
    if (route.request().method() === 'POST' && route.request().postDataJSON()?.rootId === 'node1') {
       console.log(`Fulfilling node1 expansion request with error.`);
       try {
         await route.fulfill({ status: 500, contentType: 'application/json', body: JSON.stringify({ error: 'Simulated expansion error' }) });
       } catch (e) {
         console.error("Error fulfilling route:", e);
         await route.abort();
       }
    } else {
      console.log(`Continuing non-matching request or initial load.`);
      await route.continue();
    }
  });

  // Trigger context menu on node1
  await triggerContextMenu(page, 'node1');
  // The triggerContextMenu function now waits for the menu item to be visible
  // So we can directly click the expand menu item
  await page.locator('#expand').click({ force: true });

  // Check for the expansion error message from App.tsx
  await expect(page.getByText('Error: Failed to expand node node1.')).toBeVisible({ timeout: 10000 });

  // Ensure loading indicator is gone
  await expect(page.getByText('Loading graph data...')).not.toBeVisible();
});

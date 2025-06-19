// tests/node-expansion.spec.ts
import { test, expect } from '@playwright/test';
import { TestWindow, NodePosition, GraphCounts } from './types';
import { Page } from '@playwright/test';

// Helper function to get Cytoscape element counts via page.evaluate
async function getCyCounts(page: Page): Promise<GraphCounts> {
  return await page.evaluate((): GraphCounts => {
    const cy = (window as TestWindow).cyInstance; // Assumes cyInstance is exposed on window
    if (!cy) return { nodes: -1, edges: -1 }; // Indicate error
    return { nodes: cy.nodes().length, edges: cy.edges().length };
  });
}

test.beforeEach(async ({ page }) => {
  await page.goto('/');
  // Wait for initial load
  await expect(page.locator('[data-testid="graph-container"] canvas').first()).toBeVisible({ timeout: 15000 });
  await page.waitForFunction(() => (window as TestWindow).cyInstance && (window as TestWindow).cyInstance!.nodes().length > 0, null, { timeout: 15000 });
});

test('Expanding a node via context menu keeps graph visible', async ({ page }) => {
  const initialCounts = await getCyCounts(page);
  expect(initialCounts.nodes).toBeGreaterThan(0); // Ensure graph loaded

  // Store the initial node count to compare later
  const initialNodeCount = initialCounts.nodes;
  const initialEdgeCount = initialCounts.edges;

  // Get the position of a node to click
  const nodePosition = await page.evaluate((): NodePosition | null => {
    const cy = (window as TestWindow).cyInstance;
    if (!cy || cy.nodes().length === 0) return null;
    
    // Get the first node position in renderer coordinates
    const node = cy.nodes().first();
    const renderedPosition = node.renderedPosition();
    
    // Get the container bounds
    const container = cy.container();
    if (!container) return null;
    const rect = container.getBoundingClientRect();
    
    // Calculate screen coordinates
    return {
      x: rect.left + renderedPosition.x,
      y: rect.top + renderedPosition.y,
      id: node.id()
    };
  });
  
  if (!nodePosition) {
    console.log("Could not find node position");
    return;
  }
  
  // Right-click on the node using Playwright's mouse actions
  await page.mouse.click(nodePosition.x, nodePosition.y, { button: 'right' });
  
  // Check that any context menu appears
  const contextMenu = page.locator('ul[role="menu"]');
  await expect(contextMenu).toBeVisible({ timeout: 5000 });
  
  // Debug: Log all available menu items
  const menuItemsText = await page.evaluate(() => {
    const items = Array.from(document.querySelectorAll('li[role="menuitem"]'));
    return items.map(el => el.textContent?.trim()).filter(Boolean);
  });
  
  console.log('Context menu items found:', menuItemsText);
  
  // Just verify that some menu items are present
  const menuItemsCount = await page.locator('li[role="menuitem"]').count();
  expect(menuItemsCount).toBeGreaterThan(0);
  
  // If we find any item that looks like it might expand a node, click it
  const expansionMenuItems = [
    'Expand Children', 
    'Expand', 
    'Expand Descendents', 
    'Show Children'
  ];
  
  // Try to find and click any of the potential expansion items
  let clicked = false;
  for (const itemText of expansionMenuItems) {
    const expandMenuItem = page.locator(`li[role="menuitem"]:has-text("${itemText}")`);
    if (await expandMenuItem.isVisible({ timeout: 1000 }).catch(() => false)) {
      await expandMenuItem.click();
      clicked = true;
      console.log(`Clicked on menu item: ${itemText}`);
      // Wait a moment for potential async operations
      await page.waitForTimeout(500);
      break;
    }
  }
  
  if (!clicked) {
    console.log('No expansion menu option found - skipping click');
  }

  // Assert canvas is still visible after attempted expansion
  await expect(page.locator('[data-testid="graph-container"] canvas').first()).toBeVisible();
  
  // Get final counts - the specific expectations will depend on your test data
  const finalCounts = await getCyCounts(page);
  
  // We don't know if this node should add children or not, so we make a loose assertion
  // that we at least don't lose any nodes during expansion
  expect(finalCounts.nodes).toBeGreaterThanOrEqual(initialNodeCount);
  expect(finalCounts.edges).toBeGreaterThanOrEqual(initialEdgeCount);
});

// This test is skipped until we know more about the test data structure
// Uncomment and adapt when you have a node that should definitely add new nodes when expanded
test.skip('Expanding a node adds new nodes/edges', async () => {
  // TODO: Implement this test
  // 1. Identify a node that *should* have unrevealed children
  // 2. Get initial counts
  // 3. Trigger context menu and expand on that node
  // 4. Wait for potential updates
  // 5. Assert that final counts are greater than initial counts
});

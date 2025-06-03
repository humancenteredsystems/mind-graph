import { test, expect } from '@playwright/test';

// Type for the global cytoscape instance
interface CytoscapeWindow extends Window {
  cyInstance?: {
    nodes(): { length: number; first(): unknown; slice(start: number, end: number): unknown; select(): void; map(fn: (n: unknown) => string): string[] };
    getElementById(id: string): { length: number };
    container(): Element | null;
  };
}

declare const window: CytoscapeWindow;

test.describe('Hide Node functionality', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to the application
    await page.goto('/');
    // Wait for the graph canvas to be visible
    await page.waitForSelector('[data-testid="graph-container"] canvas', { timeout: 15000 });
    // Wait for cyInstance and some elements to be present
    await page.waitForFunction(
      () => (window as unknown as { cyInstance?: { elements(): { length: number } } }).cyInstance && (window as unknown as { cyInstance: { elements(): { length: number } } }).cyInstance.elements().length > 0,
      null,
      { timeout: 15000 }
    );
  });

  test('should hide a node when using context menu', async ({ page }) => {
    // Count the initial number of nodes
    const initialNodeCount = await page.evaluate(() => {
      return (window as CytoscapeWindow).cyInstance?.nodes().length || 0;
    });

    // Get the first node's details for interaction
    const nodeDetails = await page.evaluate(() => {
      const cy = (window as CytoscapeWindow).cyInstance;
      if (!cy || cy.nodes().length === 0) return null;
      const node = cy.nodes().first() as { id(): string; renderedPosition(): { x: number; y: number } };
      const renderedPosition = node.renderedPosition();
      const container = cy.container();
      if (!container) return null;
      const rect = container.getBoundingClientRect();
      return {
        id: node.id(),
        x: rect.left + renderedPosition.x,
        y: rect.top + renderedPosition.y,
      };
    });

    expect(nodeDetails).toBeTruthy(); // Ensure nodeDetails is not null
    if (!nodeDetails) {
      console.log("Skipping test: No node details found for interaction.");
      return; // Exit test if no node details
    }
    expect(initialNodeCount).toBeGreaterThan(0);

    // Right-click on the node to open context menu
    await page.mouse.click(nodeDetails.x, nodeDetails.y, { button: 'right' });

    // Wait for the context menu to appear
    await page.waitForSelector('[role="menu"]', { timeout: 5000 }); // Wait for menu container
    
    // Click on the "Hide Node" option
    await page.getByRole('menuitem', { name: /👁️‍🗨️ Hide Node\s*H/ }).click();
    
    // Wait for the animation to complete
    await page.waitForTimeout(500);
    
    // Check if node count decreased by 1
    const finalNodeCount = await page.evaluate(() => {
      return (window as CytoscapeWindow).cyInstance?.nodes().length || 0;
    });
    
    expect(finalNodeCount).toBe(initialNodeCount - 1);
    
    // Verify the specific node is not in the graph anymore
    const nodeStillExists = await page.evaluate((nodeId) => {
      return (window as CytoscapeWindow).cyInstance?.getElementById(nodeId).length > 0;
    }, nodeDetails.id); // Use nodeDetails.id here
    
    expect(nodeStillExists).toBe(false);
  });

  test('should hide multiple nodes when selected', async ({ page }) => {
    const initialNodeCountForMulti = await page.evaluate(() => {
      return (window as CytoscapeWindow).cyInstance?.nodes().length || 0;
    });

    if (initialNodeCountForMulti < 3) { // Check for at least 3 nodes
      console.log('Not enough nodes to test multi-selection hide (need >=3), skipping this test.');
      test.skip(true, 'Not enough nodes for multi-select hide test (need >=3)');
      return;
    }

    const selectedNodeIds = await page.evaluate(() => {
      const cy = (window as CytoscapeWindow).cyInstance;
      if (cy && cy.nodes().length >=3) { // Ensure we can select 3
        const nodesToSelect = cy.nodes().slice(0, 3) as { select(): void; map(fn: (n: { id(): string }) => string): string[] };
        nodesToSelect.select();
        return nodesToSelect.map((n: { id(): string }) => n.id());
      }
      return [];
    });
    expect(selectedNodeIds.length).toBe(3); // Expect 3 selected nodes

    const firstSelectedNodeDetails = await page.evaluate((nodeId) => {
      const cy = (window as CytoscapeWindow).cyInstance;
      if (!cy) return null;
      const node = cy.getElementById(nodeId) as { length: number; renderedPosition(): { x: number; y: number }; id(): string };
      if (!node || node.length === 0) return null; // Corrected: node.length
      const renderedPosition = node.renderedPosition();
      const container = cy.container();
      if (!container) return null;
      const rect = container.getBoundingClientRect();
      return {
        id: node.id(),
        x: rect.left + renderedPosition.x,
        y: rect.top + renderedPosition.y,
      };
    }, selectedNodeIds[0]);

    expect(firstSelectedNodeDetails).toBeTruthy();
    if (!firstSelectedNodeDetails) {
      console.log("Skipping test: No details for first selected node.");
      return; // Exit test if no details
    }

    await page.mouse.click(firstSelectedNodeDetails.x, firstSelectedNodeDetails.y, { button: 'right' });

    await page.waitForSelector('[role="menu"]', { timeout: 5000 });
    
    await page.locator('[role="menu"] >> role=menuitem')
              .filter({ hasText: "Hide Nodes" })
              .click();
    
    await page.waitForTimeout(500);
    
    const finalNodeCountForMulti = await page.evaluate(() => {
      return (window as CytoscapeWindow).cyInstance?.nodes().length || 0;
    });

    expect(finalNodeCountForMulti).toBe(initialNodeCountForMulti - 3); // Expect 3 nodes to be hidden
  });
});

import { test, expect } from '@playwright/test';

test.describe('Hide Node functionality', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to the application
    await page.goto('/');
    // Wait for the graph to be visible
    await page.waitForSelector('[data-testid="graph-container"]');
  });

  test('should hide a node when using context menu', async ({ page }) => {
    // Count the initial number of nodes
    const initialNodeCount = await page.evaluate(() => {
      // @ts-ignore - accessing the cytoscape instance from the global scope
      return window.cyInstance?.nodes().length || 0;
    });
    
    // Get the first node
    const node = await page.evaluate(() => {
      // @ts-ignore - accessing the cytoscape instance from the global scope
      const nodes = window.cyInstance?.nodes();
      if (nodes && nodes.length > 0) {
        const node = nodes[0];
        return {
          id: node.id(),
          position: node.renderedPosition()
        };
      }
      return null;
    });
    
    // Make sure there's at least one node to hide
    expect(node).toBeTruthy();
    expect(initialNodeCount).toBeGreaterThan(0);
    
    if (node) {
      // Right-click on the node to open context menu
      await page.mouse.click(node.position.x, node.position.y, { button: 'right' });
      
      // Click on the "Hide Node" option
      await page.getByRole('menuitem', { name: 'Hide Node' }).click();
      
      // Wait for the animation to complete
      await page.waitForTimeout(500);
      
      // Check if node count decreased by 1
      const finalNodeCount = await page.evaluate(() => {
        // @ts-ignore - accessing the cytoscape instance from the global scope
        return window.cyInstance?.nodes().length || 0;
      });
      
      expect(finalNodeCount).toBe(initialNodeCount - 1);
      
      // Verify the specific node is not in the graph anymore
      const nodeStillExists = await page.evaluate((nodeId) => {
        // @ts-ignore - accessing the cytoscape instance from the global scope
        return window.cyInstance?.getElementById(nodeId).length > 0;
      }, node.id);
      
      expect(nodeStillExists).toBe(false);
    }
  });

  test('should hide multiple nodes when selected', async ({ page }) => {
    // Count the initial number of nodes
    const initialNodeCount = await page.evaluate(() => {
      // @ts-ignore - accessing the cytoscape instance from the global scope
      return window.cyInstance?.nodes().length || 0;
    });
    
    // Only proceed if we have at least 2 nodes
    if (initialNodeCount < 2) {
      test.skip();
      console.log('Not enough nodes to test multi-selection');
      return;
    }
    
    // Select multiple nodes
    await page.evaluate(() => {
      // @ts-ignore - accessing the cytoscape instance from the global scope
      const cy = window.cyInstance;
      if (cy) {
        // Select the first two nodes
        cy.nodes().slice(0, 2).select();
        return true;
      }
      return false;
    });
    
    // Get position of the first selected node for right-click
    const firstNodePosition = await page.evaluate(() => {
      // @ts-ignore - accessing the cytoscape instance from the global scope
      const cy = window.cyInstance;
      if (cy) {
        const selectedNodes = cy.nodes(':selected');
        if (selectedNodes.length > 0) {
          return selectedNodes[0].renderedPosition();
        }
      }
      return null;
    });
    
    expect(firstNodePosition).toBeTruthy();
    
    if (firstNodePosition) {
      // Right-click on the first selected node
      await page.mouse.click(firstNodePosition.x, firstNodePosition.y, { button: 'right' });
      
      // Click on the "Hide Nodes" option (multi-node context menu)
      await page.getByRole('menuitem', { name: 'Hide Nodes' }).click();
      
      // Wait for the animation to complete
      await page.waitForTimeout(500);
      
      // Check if node count decreased by 2
      const finalNodeCount = await page.evaluate(() => {
        // @ts-ignore - accessing the cytoscape instance from the global scope
        return window.cyInstance?.nodes().length || 0;
      });
      
      expect(finalNodeCount).toBe(initialNodeCount - 2);
    }
  });
});

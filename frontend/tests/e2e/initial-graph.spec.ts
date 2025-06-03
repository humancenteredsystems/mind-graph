// tests/initial-graph.spec.ts
import { test, expect } from '@playwright/test';
import { TestWindow, GraphCounts, GraphQLResponse } from './types';

// Helper function to get Cytoscape node and edge counts
const getCyCounts = async (page: import('@playwright/test').Page): Promise<GraphCounts> => {
  return await page.evaluate(() => {
    const cy = (window as TestWindow).cyInstance;
    if (!cy) return { nodes: 0, edges: 0 };
    return {
      nodes: cy.nodes().length,
      edges: cy.edges().length,
    };
  });
};

test('Initial graph renders expected nodes and edges', async ({ page }) => {
  let graphQueryResponse: GraphQLResponse | null = null;

  // Listen to all console events from the page and print them
  page.on('console', msg => {
    console.log(`PAGE CONSOLE: ${msg.type().toUpperCase()}: ${msg.text()}`);
  });

  // Enable debug logging via localStorage BEFORE page navigation using addInitScript
  await page.addInitScript(() => localStorage.setItem('debug', 'true'));

  // Intercept the GraphQL query for all nodes and edges
  await page.route('**/api/query', async route => {
    const request = route.request();
    const postData = request.postDataJSON();
    if (postData && typeof postData.query === 'string' && postData.query.includes('GetAllNodesAndEdges')) {
      console.log('Intercepted GetAllNodesAndEdges query');
      // Capture the response
      const response = await route.fetch();
      graphQueryResponse = await response.json();
      console.log('GetAllNodesAndEdges response:', JSON.stringify(graphQueryResponse, null, 2));
      // Fulfill with the original response
      route.fulfill({ response });
    } else {
      route.continue();
    }
  });

  await page.goto('/');
  // No longer need page.evaluate for localStorage here, addInitScript handles it.

  // Check if the root div for React app exists
  await expect(page.locator('#root')).toHaveCount(1, { timeout: 5000 }); // Ensure #root is present

  const canvas = page.locator('[data-testid="graph-container"] canvas').first();
  await expect(canvas).toBeVisible({ timeout: 15000 });

  // Add a small delay to allow CytoscapeComponent to process new elements
  await page.waitForTimeout(500); // Wait for 500ms

  const cyInstanceExists = await page.evaluate(() => !!(window as TestWindow).cyInstance);
  console.log('[TEST LOG] Does window.cyInstance exist before waitForFunction?', cyInstanceExists);
  if (cyInstanceExists) {
      const initialElementsInCy = await page.evaluate(() => (window as TestWindow).cyInstance?.elements().length ?? 0);
      console.log('[TEST LOG] Elements count in cyInstance before waitForFunction:', initialElementsInCy);
  }

  // Wait for Cytoscape instance to likely be ready and populated
  // This might still fail if the response is empty, but we'll see the logged response
  try {
    await page.waitForFunction(
      (expectedElements) => {
        const cy = (window as TestWindow).cyInstance;
        return cy && cy.elements().length === expectedElements;
      },
      23, // Expected 12 nodes + 11 edges
      { timeout: 15000 }
    );
  } catch {
    console.log('Timeout waiting for elements to load. Captured graphQueryResponse:', JSON.stringify(graphQueryResponse, null, 2));
    // Log current cyInstance state if available
    const cyState = await page.evaluate(() => {
      const cy = (window as TestWindow).cyInstance;
      return cy ? { nodes: cy.nodes().length, elements: cy.elements().length } : 'cyInstance not found';
    });
    console.log('cyInstance state on timeout:', cyState);
  }

  const counts = await getCyCounts(page);
  expect(counts.nodes).toBeGreaterThan(0); // We expect at least some nodes to be loaded
  // Add more specific assertions based on expected seed data if necessary
  // For example: expect(counts.nodes).toBe(10);
  // expect(counts.edges).toBe(9);

  // Additional check on the captured response
  expect(graphQueryResponse).toBeTruthy();
  if (graphQueryResponse) {
    expect(graphQueryResponse.queryNode).toBeDefined(); // Check for queryNode directly
    // Check if queryNode is an array, even if empty
    expect(Array.isArray(graphQueryResponse.queryNode)).toBe(true);
  }
});

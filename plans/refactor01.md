# Refactor Plan 01: Implement Playwright E2E Testing

**Date:** 2025-04-17

**Goal:** Integrate Playwright into the `frontend` project to enable automated end-to-end (E2E) testing, establish baseline test coverage, and provide a framework for future test development. This will help ensure application stability and allow for automated verification of UI behavior.

---

## Phase 1: Installation and Setup

1.  **Navigate to Frontend Directory:** All commands should be run within the `/home/gb/coding/mims-graph/frontend` directory.
    ```bash
    cd frontend
    ```
2.  **Install Playwright:** Add Playwright and its test runner (`@playwright/test`) as development dependencies.
    ```bash
    npm install --save-dev @playwright/test
    ```
3.  **Install Browsers:** Run the Playwright command to download the necessary browser binaries (Chromium, Firefox, WebKit).
    ```bash
    npx playwright install --with-deps
    ```
    *(Note: `--with-deps` installs necessary OS dependencies, might require sudo)*
4.  **Initialize Playwright Config:** Playwright can generate a basic configuration file. We can accept defaults for now (TypeScript, `tests` directory).
    ```bash
    # (Optional - Can be created manually if preferred)
    # npx playwright init
    ```
    *If not using `init`, manually create `playwright.config.ts` (see step 5).*
5.  **Configure `playwright.config.ts`:** Create or modify `frontend/playwright.config.ts` to configure test settings, particularly the base URL for the development server.

    ```typescript
    // playwright.config.ts
    import { defineConfig, devices } from '@playwright/test';

    // Read environment variables from file.
    // require('dotenv').config();

    export default defineConfig({
      testDir: './tests', // Directory where tests reside
      fullyParallel: true, // Run tests in parallel
      forbidOnly: !!process.env.CI, // Fail build on CI if test.only is left in code
      retries: process.env.CI ? 2 : 0, // Retry on CI only
      workers: process.env.CI ? 1 : undefined, // Opt out of parallel tests on CI? Adjust as needed.
      reporter: 'html', // Reporter to use. See https://playwright.dev/docs/test-reporters
      use: {
        baseURL: 'http://localhost:5173', // Base URL for the dev server
        trace: 'on-first-retry', // Collect trace when retrying the failed test
      },
      projects: [ // Configure projects for major browsers
        {
          name: 'chromium',
          use: { ...devices['Desktop Chrome'] },
        },
        // (Optional) Add Firefox and WebKit if needed later
        // {
        //   name: 'firefox',
        //   use: { ...devices['Desktop Firefox'] },
        // },
        // {
        //   name: 'webkit',
        //   use: { ...devices['Desktop Safari'] },
        // },
      ],
      // (Optional) Configure web server if needed, but we run it separately
      // webServer: {
      //   command: 'npm run dev',
      //   url: 'http://localhost:5173',
      //   reuseExistingServer: !process.env.CI,
      // },
    });
    ```
6.  **Create Test Directory:** Ensure the test directory exists.
    ```bash
    mkdir -p tests
    ```
7.  **Add `.gitignore` Entry:** Add Playwright's default output directory to `frontend/.gitignore`.
    ```
    # frontend/.gitignore
    # ... other entries
    /test-results/
    /playwright-report/
    ```

---

## Phase 2: Baseline Test Cases (Revised)

1.  **Basic Load Test (`tests/basic-load.spec.ts`):**
    *   Verify the application page loads successfully (`/`).
    *   Verify the main heading (`h1`) is present and has the correct text.
    *   Verify the "Loading graph data..." message appears initially.
    *   Verify the graph container (`[data-testid="graph-container"]`) is rendered.
    *   Verify the canvas element within the container becomes visible after a reasonable timeout.

    ```typescript
    // tests/basic-load.spec.ts
    import { test, expect } from '@playwright/test';

    test('Page loads and shows graph container', async ({ page }) => {
      await page.goto('/');
      await expect(page.locator('h1')).toHaveText('MakeItMakeSense.io Graph');
      await expect(page.getByText('Loading graph data...')).toBeVisible();
      const graphContainer = page.locator('[data-testid="graph-container"]');
      await expect(graphContainer).toBeVisible();
      await expect(graphContainer.locator('canvas')).toBeVisible({ timeout: 15000 }); // Wait for canvas rendering
    });
    ```

2.  **Initial Graph Rendering Test (`tests/initial-graph.spec.ts`):**
    *   Verify the initial graph renders with the expected number of nodes and edges.
    *   Use `page.evaluate` to interact with the Cytoscape instance (requires exposing the instance, e.g., on `window`).

    ```typescript
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
      const canvas = page.locator('[data-testid="graph-container"] canvas');
      await expect(canvas).toBeVisible({ timeout: 15000 });

      // Wait for Cytoscape instance to likely be ready and populated
      await page.waitForFunction(() => (window as any).cyInstance && (window as any).cyInstance.nodes().length > 0, null, { timeout: 15000 });

      const counts = await getCyCounts(page);
      expect(counts.nodes).toBe(2); // Expecting node1 and node3 initially
      expect(counts.edges).toBe(1); // Expecting edge between node1 and node3
    });
    ```
    *Note: Requires exposing the Cytoscape instance on `window` in `GraphView.tsx` during development/testing.*

3.  **Node Expansion Test (`tests/node-expansion.spec.ts`):**
    *   **Scenario: Expansion Adds Nodes:** Test expanding a node known to have children not yet displayed. (Requires adjusting seed data or targeting `node3` if it has children). Verify node/edge counts increase.
    *   **Scenario: Expansion Adds No Nodes:** Test expanding `node1`. Verify node/edge counts remain unchanged and the canvas stays visible.

    ```typescript
    // tests/node-expansion.spec.ts
    import { test, expect } from '@playwright/test';

    // Assume getCyCounts helper from previous test file is available or redefined here

    test.beforeEach(async ({ page }) => {
      await page.goto('/');
      // Wait for initial load
      await expect(page.locator('[data-testid="graph-container"] canvas')).toBeVisible({ timeout: 15000 });
      await page.waitForFunction(() => (window as any).cyInstance && (window as any).cyInstance.nodes().length > 0, null, { timeout: 15000 });
    });

    test('Expanding node1 (no new nodes) keeps graph visible', async ({ page }) => {
      const initialCounts = await getCyCounts(page);
      expect(initialCounts.nodes).toBeGreaterThan(0); // Ensure graph loaded

      // Trigger context menu on node1 (requires robust method)
      await page.evaluate(() => {
        const cy = (window as any).cyInstance;
        cy?.getElementById('node1')?.trigger('cxttap');
      });
      // Click Expand
      await page.locator('.cytoscape-context-menus-cxt-menuitem:has-text("Expand")').click();

      // Wait a moment for potential async operations
      await page.waitForTimeout(500);

      // Assert counts haven't changed
      const finalCounts = await getCyCounts(page);
      expect(finalCounts.nodes).toBe(initialCounts.nodes);
      expect(finalCounts.edges).toBe(initialCounts.edges);

      // Assert canvas is still visible
      await expect(page.locator('[data-testid="graph-container"] canvas')).toBeVisible();
    });

    // Add test for 'Expansion Adds Nodes' scenario when applicable data exists
    test.skip('Expanding a node adds new nodes/edges', async ({ page }) => {
      // TODO: Implement this test
      // 1. Identify a node (e.g., node3) that *should* have unrevealed children
      // 2. Get initial counts
      // 3. Trigger context menu and expand on that node
      // 4. Wait for potential updates
      // 5. Assert that final counts are greater than initial counts
    });
    ```

4.  **Context Menu Test (`tests/context-menu.spec.ts`):**
    *   Verify right-clicking a node shows the menu.
    *   Verify the "Expand" item exists.

    ```typescript
    // tests/context-menu.spec.ts
    import { test, expect } from '@playwright/test';

    test('Right-clicking a node shows context menu with Expand option', async ({ page }) => {
      await page.goto('/');
      await expect(page.locator('[data-testid="graph-container"] canvas')).toBeVisible({ timeout: 15000 });
      await page.waitForFunction(() => (window as any).cyInstance && (window as any).cyInstance.nodes().length > 0, null, { timeout: 15000 });

      // Trigger context menu on node1
      await page.evaluate(() => {
        const cy = (window as any).cyInstance;
        cy?.getElementById('node1')?.trigger('cxttap');
      });

      // Check that the menu item is visible
      const expandMenuItem = page.locator('.cytoscape-context-menus-cxt-menuitem:has-text("Expand")');
      await expect(expandMenuItem).toBeVisible();
    });
    ```

5.  **API Error Handling Test (`tests/api-error.spec.ts`):**
    *   Use `page.route` to mock API failures for initial load and expansion.
    *   Verify UI displays the correct error messages.

    ```typescript
    // tests/api-error.spec.ts
    import { test, expect } from '@playwright/test';

    test('Handles API error on initial load', async ({ page }) => {
      // Intercept the initial API call and return an error
      await page.route('**/api/traverse', route => {
        route.fulfill({ status: 500, body: 'Internal Server Error' });
      });

      await page.goto('/');

      // Check for the specific error message
      await expect(page.getByText('Error: Failed to load initial graph data.')).toBeVisible();
      // Ensure loading message disappears
      await expect(page.getByText('Loading graph data...')).not.toBeVisible();
      // Ensure graph container might still be there, but maybe no canvas
      await expect(page.locator('[data-testid="graph-container"]')).toBeVisible();
      await expect(page.locator('[data-testid="graph-container"] canvas')).not.toBeVisible();
    });

    test('Handles API error on node expansion', async ({ page }) => {
      // Allow initial load to succeed
      await page.goto('/');
      await expect(page.locator('[data-testid="graph-container"] canvas')).toBeVisible({ timeout: 15000 });
      await page.waitForFunction(() => (window as any).cyInstance && (window as any).cyInstance.nodes().length > 0, null, { timeout: 15000 });

      // Intercept subsequent API calls for expansion
      await page.route('**/api/traverse', route => {
        // Let the first call pass (initial load), fail subsequent calls
        if (route.request().postDataJSON().rootId === 'node1' && route.request().postDataJSON().currentLevel === 1) {
           route.fulfill({ status: 500, body: 'Expansion Error' });
        } else {
           route.continue(); // Allow other calls (like initial load if it hasn't happened)
        }
      }, { times: 1 }); // Intercept only the first expansion call matching criteria

      // Trigger context menu and expand node1
      await page.evaluate(() => { (window as any).cyInstance?.getElementById('node1')?.trigger('cxttap'); });
      await page.locator('.cytoscape-context-menus-cxt-menuitem:has-text("Expand")').click();

      // Check for the expansion error message
      await expect(page.getByText('Error: Failed to expand node node1.')).toBeVisible();
    });
    ```

---

## Phase 3: Integration

1.  **Add Test Scripts to `package.json`:** Add scripts to `frontend/package.json` for running Playwright tests.

    ```json
    // frontend/package.json
    "scripts": {
      // ... other scripts (dev, build, test:unit)
      "test:e2e": "playwright test",
      "test:e2e:ui": "playwright test --ui", // For interactive UI mode
      "test:e2e:report": "playwright show-report" // To view HTML report
    },
    ```
2.  **Documentation:** Update `README.md` or create a new `TESTING.md` document explaining how to run the E2E tests.

---

## Phase 4: Execution and Refinement

1.  **Run Tests:** Ensure the frontend dev server (`npm run dev`) is running in one terminal. In another terminal (in the `frontend` directory), run the tests:
    ```bash
    npm run test:e2e
    ```
2.  **Debug Failures:** Use the HTML report (`npm run test:e2e:report`) and Playwright trace files to debug any failing tests. Use UI mode (`npm run test:e2e:ui`) for interactive debugging.
3.  **Refine Selectors/Waits:** Adjust locators, waits, and interaction methods (especially for Cytoscape) to make tests more robust. This will likely involve using `page.evaluate` to interact with the Cytoscape instance directly.
4.  **Address Current Bug:** Use the `graph-expansion.spec.ts` test results to confirm if the graph elements disappear from the DOM or if it's another issue.

---

## Considerations

*   **Testing Cytoscape:** Directly testing elements rendered on a `<canvas>` is inherently difficult. Robust tests will likely require:
    *   Using `page.evaluate()` to call Cytoscape's API within the browser context to check node counts, positions, or trigger events.
    *   Exposing the Cytoscape instance (e.g., `window.cyInstance = cyInstanceRef.current;` within `GraphView.tsx`, potentially guarded by a development mode check) to make it accessible to `page.evaluate`.
    *   Visual regression testing (comparing screenshots) as a complementary approach.
*   **Test Data:** E2E tests rely on the state of the backend data. Ensure consistent seed data is loaded before test runs, or mock API responses.
*   **CI Integration:** Configure tests to run in a CI/CD pipeline later.

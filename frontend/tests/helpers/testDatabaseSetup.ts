/**
 * Frontend test database setup utilities
 * Provides helpers for real database testing in frontend integration tests
 */

interface TestHeaders {
  'X-Tenant-Id'?: string;
  'X-Hierarchy-Id'?: string;
}

/**
 * Setup test database for frontend integration tests
 * @returns Promise<boolean> - Success status
 */
export async function setupTestDatabase(): Promise<boolean> {
  try {
    console.log('[FRONTEND_TEST_SETUP] Initializing test database');
    
    // Call backend test setup via API
    const response = await fetch('/api/test/setup', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Test-Mode': 'true'
      }
    });
    
    if (!response.ok) {
      throw new Error(`Test setup failed: ${response.statusText}`);
    }
    
    const result = await response.json();
    console.log('[FRONTEND_TEST_SETUP] Test database ready');
    return result.success;
  } catch (error) {
    console.error('[FRONTEND_TEST_SETUP] Failed to setup test database:', error);
    return false;
  }
}

/**
 * Cleanup test database after frontend integration tests
 * @returns Promise<boolean> - Success status
 */
export async function cleanupTestDatabase(): Promise<boolean> {
  try {
    console.log('[FRONTEND_TEST_CLEANUP] Cleaning test database');
    
    // Call backend test cleanup via API
    const response = await fetch('/api/test/cleanup', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Test-Mode': 'true'
      }
    });
    
    if (!response.ok) {
      throw new Error(`Test cleanup failed: ${response.statusText}`);
    }
    
    const result = await response.json();
    console.log('[FRONTEND_TEST_CLEANUP] Test database cleaned');
    return result.success;
  } catch (error) {
    console.error('[FRONTEND_TEST_CLEANUP] Failed to cleanup test database:', error);
    return false;
  }
}

/**
 * Get test tenant headers for API requests
 * @returns TestHeaders - Headers object with test tenant context
 */
export function getTestTenantHeaders(): TestHeaders {
  return {
    'X-Tenant-Id': 'test-tenant',
    'X-Hierarchy-Id': 'test-hierarchy-1'
  };
}

/**
 * Wait for test data to be available
 * @param timeout - Timeout in milliseconds (default: 5000)
 * @returns Promise<boolean> - Success status
 */
export async function waitForTestData(timeout: number = 5000): Promise<boolean> {
  const startTime = Date.now();
  
  while (Date.now() - startTime < timeout) {
    try {
      const headers = getTestTenantHeaders();
      const response = await fetch('/api/hierarchy', {
        headers: {
          'Content-Type': 'application/json',
          ...headers
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        if (data && data.length > 0) {
          console.log('[FRONTEND_TEST_SETUP] Test data is available');
          return true;
        }
      }
    } catch (error) {
      // Continue waiting
    }
    
    // Wait 100ms before next check
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  
  console.warn('[FRONTEND_TEST_SETUP] Timeout waiting for test data');
  return false;
}

/**
 * Create a test provider wrapper with tenant context
 * @param children - React children to wrap
 * @param headers - Optional additional headers
 * @returns JSX element with test context
 */
export function createTestProviderWrapper(headers: TestHeaders = {}) {
  const testHeaders = { ...getTestTenantHeaders(), ...headers };
  
  // Store test headers in localStorage for axios interceptors
  if (testHeaders['X-Tenant-Id']) {
    localStorage.setItem('tenantId', testHeaders['X-Tenant-Id']);
  }
  if (testHeaders['X-Hierarchy-Id']) {
    localStorage.setItem('hierarchyId', testHeaders['X-Hierarchy-Id']);
  }
  
  return testHeaders;
}

"use strict";
/**
 * @deprecated This file has been consolidated into jest.setup.js
 *
 * All test utilities are now available via global.testUtils
 * This file is kept for backward compatibility but will be removed in the future.
 *
 * Please use global.testUtils directly in your tests instead.
 */
// Export empty object for backward compatibility
// All functionality has been moved to jest.setup.js
module.exports = {};
// Note: All test utilities are now available via global.testUtils
// which is set up in jest.setup.js and includes:
//
// - createMockRequest() / createMockReq()
// - createMockResponse() / createMockRes() 
// - createMockNext()
// - getTestTenantClient()
// - setupTestDatabase()
// - cleanupTestDatabase()
// - resetTestDatabase()
// - seedTestData()
// - TEST_NAMESPACE
// - TEST_TENANT_ID

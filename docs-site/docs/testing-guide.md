# Testing Guide

This document provides comprehensive guidance for running, maintaining, and developing tests in the MakeItMakeSense.io application.

## Overview

The application uses a multi-layered testing strategy:
- **Unit Tests** - Test individual components and services in isolation
- **Mocked Integration Tests** - Test API interactions with mocked dependencies
- **Real Database Integration Tests** - Test complete functionality with real Dgraph database
- **End-to-End Tests** - Test complete user workflows in the browser

## Test Suites

### 1. Unit Tests (`api/__tests__/unit/`)

**Purpose:** Test individual functions, classes, and components in isolation.

**Location:** `api/__tests__/unit/`

**Key Test Files:**
- `services/tenantManager.test.ts` - TenantManager functionality
- `services/nodeEnrichment.test.ts` - Node enrichment logic
- `services/schemaRegistry.test.ts` - Schema registry operations
- `services/validation.test.ts` - Input validation
- `utils/dgraphAdmin.test.ts` - Dgraph admin utilities
- `middleware/auth.test.ts` - Authentication middleware

**Running Unit Tests:**
```bash
cd api
npm test -- --testPathPattern="unit"
```

**Characteristics:**
- Fast execution (< 1 second per test)
- No external dependencies
- Mock all external services
- Focus on business logic validation

### 2. Mocked Integration Tests (`api/__tests__/integration/`)

**Purpose:** Test API endpoints and request/response flows with mocked database operations.

**Location:** `api/__tests__/integration/`

**Key Test Files:**
- `endpoints.test.ts` - Basic API endpoint testing
- `hierarchy.test.ts` - Hierarchy CRUD operations
- `graphql.test.ts` - GraphQL query and mutation testing
- `integration.test.ts` - Cross-feature integration scenarios

**Running Mocked Integration Tests:**
```bash
cd api
npm test -- --testPathPattern="integration" --testPathIgnorePatterns="integration-real"
```

**Characteristics:**
- Mock `adaptiveTenantFactory` and database operations
- Fast execution (1-3 seconds per test)
- Test API contracts and validation logic
- No real database required
- Suitable for CI/CD pipelines

**Mock Pattern:**
```typescript
// Standard mocking pattern used in integration tests
jest.mock('../../services/adaptiveTenantFactory', () => ({
  adaptiveTenantFactory: {
    createTenant: jest.fn().mockResolvedValue(mockTenantClient),
    createTestTenant: jest.fn().mockResolvedValue(mockTenantClient),
    // ...
  }
}));
```

### 3. Real Database Integration Tests (`api/__tests__/integration-real/`)

**Purpose:** Test complete functionality with real Dgraph database and tenant infrastructure.

**Location:** `api/__tests__/integration-real/`

**Key Test Files:**
- `basic-crud.test.ts` - Complete CRUD operations in real test tenant
- `namespace-isolation.test.ts` - Tenant isolation verification
- `hierarchy-operations.test.ts` - Real hierarchy management
- `graphql-operations.test.ts` - Advanced GraphQL operations and performance
- `diagnostic.test.ts` - System connectivity and capability detection

**Prerequisites:**
1. **Dgraph Enterprise** running at `http://localhost:8080` with namespace support
2. **Test tenant namespace** (0x1) configured and accessible
3. **Schema loaded** with Node, Hierarchy, and related types
4. **Environment variables** properly configured

**Running Real Integration Tests:**
```bash
cd api
npm test -- --testPathPattern="integration-real"
```

**Environment Setup:**
```bash
# Required environment variables
export ENABLE_MULTI_TENANT=true
export DGRAPH_NAMESPACE_TEST=0x1
export MIMS_ADMIN_API_KEY=your-admin-key

# Start Dgraph Enterprise (if using Docker)
docker-compose up dgraph
```

**Characteristics:**
- **No mocking** - uses real `adaptiveTenantFactory` and database
- Real namespace isolation testing
- Slower execution (5-10 seconds per test)
- Tests production code paths
- Requires live Dgraph Enterprise instance
- Provides highest confidence in system behavior

**Test Helper Pattern:**
```typescript
// Real integration tests use actual tenant infrastructure
import { testRequest, verifyInTestTenant } from '../helpers/realTestHelpers';

// testRequest automatically adds X-Tenant-Id: test-tenant header
const response = await testRequest(app)
  .post('/api/query')
  .send({ query: '...' })
  .expect(200);

// verifyInTestTenant uses real adaptiveTenantFactory for verification
const verification = await verifyInTestTenant('query { ... }');
```

### 4. Frontend Tests (`frontend/tests/`)

**Purpose:** Test React components, hooks, and user interactions.

**Location:** `frontend/tests/`

**Test Categories:**
- `unit/` - Component and utility function tests
- `integration/` - Component integration scenarios
- `e2e/` - End-to-end browser testing with Playwright

**Running Frontend Tests:**
```bash
cd frontend

# Unit and integration tests
npm test

# End-to-end tests
npm run test:e2e
```

## Test Data Management

### Mocked Tests
- Use `api/__tests__/helpers/mockData.ts` for consistent test data
- All data is in-memory and automatically cleaned up
- No database interaction required

### Real Integration Tests
- Use `api/__tests__/helpers/realTestHelpers.ts` utilities
- Operate in dedicated test tenant namespace (0x1)
- Automatic cleanup via `beforeEach` and `afterAll` hooks
- Isolated from production data

**Test Data Lifecycle:**
```javascript
describe('Real Integration Test Suite', () => {
  beforeAll(async () => {
    // Initialize test tenant with schema and basic setup
    await global.testUtils.setupTestDatabase();
  });

  afterAll(async () => {
    // Clean up test tenant data
    await global.testUtils.cleanupTestDatabase();
  });

  beforeEach(async () => {
    // Reset test tenant to known state before each test
    await global.testUtils.resetTestDatabase();
  });
});
```

## Test Configuration

### Jest Configuration (`api/jest.config.js`)
```javascript
module.exports = {
  testEnvironment: 'node',
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  testMatch: ['**/__tests__/**/*.test.js'],
  collectCoverageFrom: [
    'routes/**/*.js',
    'services/**/*.js',
    'utils/**/*.js',
    'middleware/**/*.js'
  ],
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80
    }
  }
};
```

### Test Setup (`api/jest.setup.js`)
- Configures test environment constants
- Provides global test utilities
- Sets up test tenant configuration
- Initializes test database helpers

## Best Practices

### Writing Tests

1. **Test Naming:**
   ```javascript
   // Good: Descriptive test names
   it('should create node with hierarchy assignment in test tenant', async () => {
   
   // Bad: Vague test names
   it('should work', async () => {
   ```

2. **Test Structure (AAA Pattern):**
   ```javascript
   it('should validate node type against level restrictions', async () => {
     // Arrange
     const nodeData = createTestNodeData({ type: 'invalidType' });
     
     // Act
     const response = await testRequest(app)
       .post('/api/mutate')
       .send({ mutation: '...' });
     
     // Assert
     expect(response.status).toBe(400);
     expect(response.body.error).toContain('type not allowed');
   });
   ```

3. **Test Independence:**
   - Each test should be independent and self-contained
   - Use proper setup/teardown to ensure clean state
   - Don't rely on execution order

4. **Assertion Quality:**
   ```javascript
   // Good: Specific assertions
   expect(response.body.addNode.node[0].id).toBe(nodeData.id);
   expect(response.body.addNode.node[0].hierarchyAssignments).toHaveLength(1);
   
   // Bad: Vague assertions
   expect(response.body).toBeTruthy();
   ```

### Test Performance

1. **Use Appropriate Test Types:**
   - Unit tests for business logic
   - Mocked integration for API contracts
   - Real integration for critical paths
   - E2E for user workflows

2. **Optimize Real Integration Tests:**
   - Group related operations in single tests when appropriate
   - Use efficient database cleanup strategies
   - Minimize test data creation

3. **Parallel Execution:**
   ```javascript
   // Configure Jest for parallel execution
   module.exports = {
     maxWorkers: '50%', // Use half of available CPU cores
     testTimeout: 30000 // 30 second timeout for real integration tests
   };
   ```

## Continuous Integration

### GitHub Actions Configuration
```yaml
# Example CI configuration for multi-layered testing
name: Test Suite
on: [push, pull_request]

jobs:
  unit-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
      - run: cd api && npm ci
      - run: cd api && npm test -- --testPathPattern="unit"

  mocked-integration:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
      - run: cd api && npm ci
      - run: cd api && npm test -- --testPathPattern="integration" --testPathIgnorePatterns="integration-real"

  # Real integration tests require Dgraph Enterprise setup (optional in CI)
  real-integration:
    runs-on: ubuntu-latest
    if: github.event_name == 'push' && github.ref == 'refs/heads/main'
    services:
      dgraph:
        image: dgraph/dgraph:latest # Would need Enterprise image
        ports:
          - 8080:8080
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
      - run: cd api && npm ci
      - run: cd api && npm test -- --testPathPattern="integration-real"
```

## Debugging Tests

### Common Issues

1. **Real Integration Test Failures:**
   ```bash
   # Check Dgraph connectivity
   curl http://localhost:8080/health
   
   # Verify namespace support
   curl http://localhost:8080/state
   
   # Run diagnostic test
   cd api && npm test -- --testPathPattern="diagnostic.test.ts"
   ```

2. **Timeout Issues:**
   ```javascript
   // Increase timeout for slow operations
   it('should handle large batch operations', async () => {
     // Test implementation
   }, 30000); // 30 second timeout
   ```

3. **Mock Issues:**
   ```javascript
   // Clear mocks between tests
   beforeEach(() => {
     jest.clearAllMocks();
   });
   ```

### Test Output Analysis
```bash
# Run with verbose output
npm test -- --verbose

# Run with coverage
npm test -- --coverage

# Run specific test file
npm test -- basic-crud.test.ts

# Run tests matching pattern
npm test -- --testNamePattern="should create node"
```

## Coverage Goals

### Current Coverage Targets
- **Unit Tests:** 90%+ coverage of services and utilities
- **Integration Tests:** 80%+ coverage of API endpoints
- **Real Integration:** 100% coverage of critical multi-tenant paths

### Coverage Reports
```bash
cd api
npm test -- --coverage --coverageDirectory=coverage-reports
```

## Troubleshooting

### Test Environment Issues
1. **Port conflicts:** Ensure test ports don't conflict with running services
2. **Database state:** Use proper cleanup to avoid test interference
3. **Environment variables:** Verify all required variables are set

### Performance Issues
1. **Slow tests:** Profile and optimize database operations
2. **Memory leaks:** Check for proper cleanup of resources
3. **Timeouts:** Adjust timeout values for complex operations

---

This testing guide ensures comprehensive coverage while maintaining development velocity and deployment confidence. Regular updates to this guide should reflect changes in testing strategy and new test patterns.

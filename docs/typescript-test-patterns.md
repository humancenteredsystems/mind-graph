# TypeScript Test Patterns - Quick Reference

This document provides quick reference patterns for testing in TypeScript, based on successful solutions from the JS-to-TS migration.

## Axios Mocking

### Manual Mock Setup
Create `api/__mocks__/axios.ts`:
```typescript
const mockAxios = {
  post: jest.fn(),
  get: jest.fn(),
  put: jest.fn(),
  delete: jest.fn(),
  create: jest.fn(() => ({
    post: jest.fn(),
    get: jest.fn(),
    put: jest.fn(),
    delete: jest.fn(),
  })),
};

export default mockAxios;
```

### Usage in Tests
```typescript
// Mock axios using manual mock
jest.mock('axios');
import axios from 'axios';
const mockedAxios = axios as jest.Mocked<typeof axios>;

// In tests
mockedAxios.post.mockResolvedValueOnce({ data: { success: true } });
```

## Service Factory Mocking

### Problem: Mock Hoisting
❌ **Don't do this** (causes hoisting errors):
```typescript
const tenantMock = TestMockFactory.createTenantFactoryMock();
jest.mock('../../services/adaptiveTenantFactory', () => tenantMock);
```

### Solution: Inline Mock Objects
✅ **Do this instead**:
```typescript
// Create shared mock function
const mockExecuteGraphQL = jest.fn();

// Mock with proper client structure
jest.mock('../../services/adaptiveTenantFactory', () => ({
  adaptiveTenantFactory: {
    createTenant: jest.fn(() => ({
      executeGraphQL: mockExecuteGraphQL,
      getNamespace: jest.fn(() => null),
      isDefaultNamespace: jest.fn(() => true)
    })),
    createTenantFromContext: jest.fn(() => ({
      executeGraphQL: mockExecuteGraphQL,
      getNamespace: jest.fn(() => null),
      isDefaultNamespace: jest.fn(() => true)
    })),
    createTestTenant: jest.fn(() => ({
      executeGraphQL: mockExecuteGraphQL,
      getNamespace: jest.fn(() => '0x1'),
      isDefaultNamespace: jest.fn(() => false)
    })),
    createDefaultTenant: jest.fn(() => ({
      executeGraphQL: mockExecuteGraphQL,
      getNamespace: jest.fn(() => null),
      isDefaultNamespace: jest.fn(() => true)
    }))
  }
}));
```

## Conditional Test Execution

### Infrastructure Detection
```typescript
// In jest.setup.ts
(global as any).testUtils.checkDgraphEnterprise = async () => {
  try {
    const axios = require('axios');
    const response = await axios.get('http://localhost:8080/state');
    return response.data && response.data.enterprise === true;
  } catch (error) {
    console.warn('[TEST_SETUP] Dgraph Enterprise not available, skipping real integration tests');
    return false;
  }
};

// Global flag for enterprise availability
(global as any).DGRAPH_ENTERPRISE_AVAILABLE = false;

// Check enterprise availability during setup
beforeAll(async () => {
  (global as any).DGRAPH_ENTERPRISE_AVAILABLE = await (global as any).testUtils.checkDgraphEnterprise();
});
```

### Conditional Test Suites
```typescript
// In test files
const conditionalDescribe = (global as any).DGRAPH_ENTERPRISE_AVAILABLE ? describe : describe.skip;

conditionalDescribe('Real Integration: Basic CRUD Operations', () => {
  beforeAll(async () => {
    if (!(global as any).DGRAPH_ENTERPRISE_AVAILABLE) {
      console.warn('Skipping real integration tests - Dgraph Enterprise not available');
      return;
    }
    await global.testUtils.setupTestDatabase();
  });

  // ... tests
});
```

## Type Safety

### Properly Typed Mocks
```typescript
import { adaptiveTenantFactory } from '../../services/adaptiveTenantFactory';

// After mocking
const mockedFactory = adaptiveTenantFactory as jest.Mocked<typeof adaptiveTenantFactory>;
```

### Mock Function Types
```typescript
const mockExecuteGraphQL = jest.fn() as jest.MockedFunction<any>;
```

## Common Patterns

### Test Setup Pattern
```typescript
describe('Test Suite', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockExecuteGraphQL.mockReset();
  });

  it('should test something', async () => {
    // Arrange
    mockExecuteGraphQL.mockResolvedValueOnce({ data: 'expected' });

    // Act
    const result = await someFunction();

    // Assert
    expect(result).toEqual({ data: 'expected' });
    expect(mockExecuteGraphQL).toHaveBeenCalledWith(/* expected args */);
  });
});
```

### Error Testing Pattern
```typescript
it('should handle errors gracefully', async () => {
  mockExecuteGraphQL.mockRejectedValueOnce(new Error('Test error'));

  const response = await request(app)
    .post('/api/endpoint')
    .send({ data: 'test' })
    .expect(500);

  expect(response.body).toHaveProperty('error');
});
```

## Best Practices

1. **Use manual mocks** for complex external dependencies like axios
2. **Avoid external variables** in `jest.mock()` calls to prevent hoisting issues
3. **Mock the entire service chain**, not just factory methods
4. **Use conditional execution** for infrastructure-dependent tests
5. **Properly type mocked modules** with `jest.Mocked<typeof Module>`
6. **Reset mocks** in `beforeEach` to ensure test isolation
7. **Test both success and error cases** for comprehensive coverage

## Troubleshooting

### Mock Not Working
- Check if you're mocking the correct module path
- Ensure the mock structure matches the real implementation
- Verify that `jest.clearAllMocks()` is called in `beforeEach`

### Hoisting Errors
- Move variable declarations inside `jest.mock()` calls
- Use inline object literals instead of external variables

### Type Errors
- Use `jest.Mocked<typeof Module>` for proper typing
- Add `as any` for complex mock scenarios when needed
- Ensure mock return types match expected interface

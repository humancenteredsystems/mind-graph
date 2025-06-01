---
id: multi-tenant-testing
title: Multi-Tenant Testing & Development
sidebar_label: Testing
sidebar_position: 3
---

# Multi-Tenant Testing & Development

This document covers testing strategies, development utilities, and test infrastructure for the multi-tenant system.

## 🧪 Testing Strategy

### **Unit Tests**
- TenantManager namespace generation
- DgraphTenant client functionality
- Middleware tenant resolution

### **Integration Tests**
- Real database operations in test namespace
- Tenant isolation verification
- API endpoint tenant awareness

### **Development Testing**
- Test tenant for safe experimentation
- Easy reset and cleanup capabilities
- Isolated from production data

## 🔧 Test Infrastructure

### **Enhanced Test Setup** (`api/__tests__/helpers/testSetup.ts`)
- Tenant-aware test utilities
- `setupTestDatabase()` - Initialize test tenant
- `cleanupTestDatabase()` - Clean test tenant
- `resetTestDatabase()` - Reset test tenant
- `getTestTenantClient()` - Get test tenant client
- Mock request objects with tenant context

### **Unit Tests** (`api/__tests__/unit/services/tenantManager.test.ts`)
- TenantManager functionality tests
- DgraphTenantFactory tests
- Namespace generation validation

## 🏗️ Real Database Integration Testing

**New Feature**: Comprehensive real database integration tests that use actual tenant infrastructure without mocking.

### **Test Suite Structure** (`api/__tests__/integration-real/`)

#### **`basic-crud.test.ts`**
- Complete CRUD operations testing in real test tenant
- Node creation, retrieval, update, and deletion
- Edge management and relationship testing
- Hierarchy assignment operations

#### **`namespace-isolation.test.ts`**
- Comprehensive tenant isolation verification
- Cross-tenant data access prevention testing
- Namespace switching validation
- Data separation confirmation

#### **`hierarchy-operations.test.ts`**
- Hierarchy management and level operations
- Level type creation and validation
- Hierarchy assignment testing
- Multi-level hierarchy testing

#### **`graphql-operations.test.ts`**
- Advanced GraphQL queries, mutations, and performance tests
- Complex query operations
- Mutation transaction testing
- Performance benchmarking

#### **`diagnostic.test.ts`**
- System diagnostics and connectivity verification
- Health check validation
- Capability detection testing
- Error handling verification

### **Test Helper Utilities** (`api/__tests__/helpers/realTestHelpers.ts`)

#### **Core Functions**
```typescript
// Automatic X-Tenant-Id header injection
function testRequest(method: string, endpoint: string, data?: any) {
  return request(app)
    [method](endpoint)
    .set('X-Tenant-Id', 'test-tenant')
    .send(data);
}

// Direct database verification using real adaptiveTenantFactory
async function verifyInTestTenant(query: string) {
  const client = adaptiveTenantFactory.createTestTenant();
  return await client.query(query);
}

// Consistent test data generation utilities
function createTestNodeData(overrides?: Partial<NodeInput>) {
  return {
    id: `test-node-${Date.now()}`,
    label: 'Test Node',
    type: 'concept',
    status: 'approved',
    branch: 'main',
    ...overrides
  };
}
```

#### **Key Features**
- **Real Namespace Isolation**: Tests verify complete data separation between test-tenant (0x1) and default (0x0)
- **Production-like Testing**: Uses same code paths as production without mocking
- **Comprehensive Coverage**: Tests all major API operations, GraphQL functionality, and error handling
- **Performance Testing**: Concurrent request handling and batch operation efficiency

### **Requirements for Running Real Integration Tests**

#### **Prerequisites**
```bash
# 1. Dgraph Enterprise running at localhost:8080 with namespace support
# 2. Test tenant namespace (0x1) configured and accessible  
# 3. Schema loaded with Node, Hierarchy, and related types
# 4. Environment variables set
```

#### **Environment Setup**
```bash
# Required environment variables
ENABLE_MULTI_TENANT=true
DGRAPH_NAMESPACE_TEST=0x1
DGRAPH_BASE_URL=http://localhost:8080
ADMIN_API_KEY=your-admin-key
```

#### **Running Tests**
```bash
# Run all real integration tests
cd api && npm test -- --testPathPattern="integration-real"

# Run specific test suite
cd api && npm test -- --testPathPattern="basic-crud.test.ts"

# Run with verbose output
cd api && npm test -- --testPathPattern="integration-real" --verbose

# Run with coverage
cd api && npm test -- --testPathPattern="integration-real" --coverage
```

## 🛠️ Development Utilities

### **Test Tenant Management**

#### **Initialize Test Tenant**
```bash
# Create and seed test tenant
curl -X POST http://localhost:3000/api/tenant/test/init \
  -H "X-Admin-API-Key: your-key"
```

#### **Reset Test Tenant**
```bash
# Clear and reinitialize test tenant
curl -X POST http://localhost:3000/api/tenant/test/reset \
  -H "X-Admin-API-Key: your-key"
```

#### **Check Test Tenant Status**
```bash
# Get test tenant information
curl http://localhost:3000/api/tenant/info \
  -H "X-Tenant-Id: test-tenant"
```

### **Safe Data Management**

#### **Namespace-Scoped Operations (Safe)**
```bash
# Safe: Clears only target namespace (default behavior)
python tools/seed_data.py -k $ADMIN_KEY -t test-tenant

# Safe: Initialize specific tenant
python tools/seed_data.py -k $ADMIN_KEY -t my-tenant --create-tenant
```

#### **Cluster-Wide Operations (Dangerous)**
```bash
# DANGEROUS: Clears ALL namespaces (explicit flag required)
python tools/seed_data.py -k $ADMIN_KEY --enable-drop-all
```

### **Test Data Seeding**

#### **Basic Test Data**
```bash
# Seed test tenant with sample data
python tools/seed_data.py \
  --api-key $ADMIN_KEY \
  --tenant-id test-tenant \
  --api-base http://localhost:3000/api
```

#### **Custom Test Scenarios**
```typescript
// Create specific test scenario
const testScenario = {
  nodes: [
    { id: 'test-1', label: 'Test Concept', type: 'concept' },
    { id: 'test-2', label: 'Test Example', type: 'example' }
  ],
  edges: [
    { from: { id: 'test-1' }, to: { id: 'test-2' }, type: 'simple' }
  ]
};

await seedTestData('test-tenant', testScenario);
```

## 🔍 Testing Patterns

### **Isolation Testing**
```typescript
describe('Tenant Isolation', () => {
  it('should prevent cross-tenant data access', async () => {
    // Create data in test-tenant
    const testData = await createInTenant('test-tenant', nodeData);
    
    // Attempt to access from default tenant
    const result = await queryFromTenant('default', testData.id);
    
    // Should return null/empty
    expect(result).toBeNull();
  });
});
```

### **Multi-Tenant Operations**
```typescript
describe('Multi-Tenant Operations', () => {
  it('should handle concurrent tenant operations', async () => {
    const promises = [
      createInTenant('tenant-1', nodeData1),
      createInTenant('tenant-2', nodeData2),
      createInTenant('test-tenant', nodeData3)
    ];
    
    const results = await Promise.all(promises);
    
    // Verify each operation succeeded in its namespace
    expect(results.every(r => r.success)).toBe(true);
  });
});
```

### **Error Handling Testing**
```typescript
describe('Error Handling', () => {
  it('should handle invalid tenant contexts gracefully', async () => {
    const response = await testRequest('POST', '/api/query')
      .set('X-Tenant-Id', 'invalid-tenant')
      .send({ query: 'invalid' });
    
    expect(response.status).toBe(400);
    expect(response.body.error).toContain('tenant');
  });
});
```

## 📊 Test Metrics & Coverage

### **Coverage Targets**
- **Unit Tests**: >90% code coverage
- **Integration Tests**: >80% API endpoint coverage
- **Real Database Tests**: 100% critical path coverage

### **Performance Benchmarks**
```typescript
// Example performance test
it('should handle 100 concurrent requests within 5 seconds', async () => {
  const startTime = Date.now();
  const requests = Array(100).fill(null).map(() => 
    testRequest('POST', '/api/query').send(simpleQuery)
  );
  
  const results = await Promise.all(requests);
  const duration = Date.now() - startTime;
  
  expect(duration).toBeLessThan(5000);
  expect(results.every(r => r.status === 200)).toBe(true);
});
```

### **Memory Usage Testing**
```typescript
// Monitor memory usage during tenant operations
it('should not leak memory during tenant switching', async () => {
  const initialMemory = process.memoryUsage().heapUsed;
  
  // Perform 1000 tenant operations
  for (let i = 0; i < 1000; i++) {
    await testRequest('GET', '/api/tenant/info')
      .set('X-Tenant-Id', `tenant-${i % 10}`);
  }
  
  global.gc(); // Force garbage collection
  const finalMemory = process.memoryUsage().heapUsed;
  const memoryIncrease = finalMemory - initialMemory;
  
  // Memory increase should be minimal
  expect(memoryIncrease).toBeLessThan(10 * 1024 * 1024); // 10MB
});
```

## 🚨 Troubleshooting Test Issues

### **Common Problems**

#### **Dgraph Not Available**
```bash
# Check Dgraph status
docker ps | grep dgraph

# Restart Dgraph if needed
npm run start-dgraph
```

#### **Namespace Not Configured**
```bash
# Verify Enterprise features
curl http://localhost:3000/api/system/status

# Should return namespacesSupported: true
```

#### **Test Data Pollution**
```bash
# Clean test tenant
curl -X POST http://localhost:3000/api/tenant/test/reset \
  -H "X-Admin-API-Key: $ADMIN_KEY"
```

#### **Authentication Issues**
```bash
# Verify API key
echo $ADMIN_API_KEY

# Test authentication
curl -H "X-Admin-API-Key: $ADMIN_API_KEY" \
  http://localhost:3000/api/tenant
```

### **Debug Utilities**

#### **Namespace Inspection**
```typescript
// Debug namespace resolution
async function debugNamespace(tenantId: string) {
  const context = await resolveTenantContext(tenantId);
  console.log(`Tenant: ${tenantId} -> Namespace: ${context.namespace}`);
}
```

#### **Request Tracing**
```typescript
// Add request tracing for debugging
app.use((req, res, next) => {
  console.log(`[${req.method}] ${req.path} - Tenant: ${req.headers['x-tenant-id']}`);
  next();
});
```

## See Also

- **[Multi-Tenant Overview](./multi-tenant-overview)** - High-level system overview
- **[Multi-Tenant Architecture](./multi-tenant-architecture)** - Technical implementation details
- **[Multi-Tenant Usage](./multi-tenant-usage)** - Usage examples and API operations
- **[Testing Guide](./testing-guide)** - General testing strategies for the entire system
- **[Setup Guide](./setup-guide)** - Environment configuration for development

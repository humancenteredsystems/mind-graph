# Refactor 02: Multi-Tenant Architecture with Dgraph Namespaces

**Date:** 2025-05-26  
**Objective:** Complete multi-tenant implementation using Dgraph namespaces, building on existing infrastructure to establish production-ready tenant isolation.

## Strategic Vision

### Current State ✅ (Already Implemented)
- **TenantManager** - Complete tenant lifecycle management with namespace generation
- **AdaptiveTenantFactory** - OSS/Enterprise compatibility with automatic fallback
- **DgraphTenant** - Namespace-aware client with clean factory patterns
- **tenantContext middleware** - Request-level tenant resolution and validation
- **Basic test infrastructure** - Foundation for tenant-aware testing

### Current State ⚠️ (Critical Issues Found)
- **pushSchemaViaHttp function** - Enhanced with namespace support but calling code not updated
- **Schema operations** - Parameter order mismatches causing seeding failures
- **Unit tests** - Test mocks using incorrect function signatures

### Target State (Remaining Work)
- **Fix critical parameter order issues** - Complete Phase 1 properly
- Real database integration testing using test tenant (0x1) 
- Frontend tenant context and management UI
- Complete tenant management REST APIs
- Operational tools for backup/migration
- **Universal seeding tool** - Works with both OSS and Enterprise instances

## Multi-Tenant Architecture Design

### Universal Compatibility Strategy
```
OSS Dgraph (Single-User):
├── Default namespace only - All data in single instance
└── Seeding tool works directly without tenant context

Enterprise Dgraph (Multi-Tenant):
├── Namespace 0x0 (default) - System/Admin data
├── Namespace 0x1 - "test-tenant" (Test environment)
├── Namespace 0x2+ - Production tenants (deterministic generation)
└── Seeding tool adapts to target specific tenant namespaces
```

### Benefits of Universal Approach
- **Single Codebase**: Same tools work for both OSS and Enterprise deployments
- **Adaptive Behavior**: Auto-detection of capabilities with graceful degradation
- **Complete Data Isolation**: In Enterprise mode, tenants cannot access each other's data
- **Shared Infrastructure**: Single Dgraph cluster serves all tenants efficiently
- **Operational Efficiency**: One set of tools to maintain across deployment types

## Implementation Phases

### Phase 1: Enhanced Core Infrastructure (Days 1-2)

#### 1.1 Enhanced Dgraph Client ✅ (COMPLETED)
**Goal:** Add optional namespace parameter to dgraphClient.js

**File Changes:**
- `api/dgraphClient.js` - Add namespace parameter support ✅
- `api/.env.example` - Add missing namespace configuration variables

#### 1.2 Fix Critical Parameter Order Issues ⚠️ (URGENT - BLOCKING SEEDING)
**Goal:** Fix parameter order mismatches in schema operations

**Root Cause:** Function signature changed from `(url, schema)` to `(schema, namespace, customAdminUrl)` but calling code wasn't updated.

**Critical Files to Fix:**
1. **`api/routes/admin.js` - Line 25:**
   ```javascript
   // WRONG:
   const result = await pushSchemaViaHttp(url, schema);
   // SHOULD BE:
   const result = await pushSchemaViaHttp(schema, null, url);
   ```

2. **`api/routes/schema.js` - Line 12:**
   ```javascript
   // WRONG:
   const result = await pushSchemaViaHttp(url, schema);
   // SHOULD BE:
   const result = await pushSchemaViaHttp(schema, null, url);
   ```

3. **`api/__tests__/unit/utils/pushSchema.test.js` - All test calls:**
   ```javascript
   // WRONG:
   await pushSchemaViaHttp(adminUrl, mockSchema);
   // SHOULD BE:
   await pushSchemaViaHttp(mockSchema, null, adminUrl);
   ```

**Impact:** This is causing the seeding failure with "Unknown type AddHierarchyInput" because malformed URLs are being generated when the first parameter (expected to be schema content) is actually a URL.

**Verification:** After fixing, test with: `python tools/seed_data.py --api-key [api-key]`

#### 1.3 Enhanced Dgraph Client Implementation Details
**Goal:** Add optional namespace parameter to dgraphClient.js

**Universal Implementation:**
```javascript
// Enhanced api/dgraphClient.js
async function executeGraphQL(query, variables = {}, namespace = null) {
  const namespaceParam = namespace ? `?namespace=${namespace}` : '';
  const endpoint = `${DGRAPH_ENDPOINT}${namespaceParam}`;
  
  console.log(`[DGRAPH] Executing query in namespace: ${namespace || 'default'}`);
  
  try {
    const response = await axios.post(endpoint, {
      query,
      variables,
    }, {
      headers: { 'Content-Type': 'application/json' }
    });
    
    if (response.data.errors) {
      console.error('GraphQL Errors:', JSON.stringify(response.data.errors, null, 2));
      throw new Error(`GraphQL query failed: ${response.data.errors.map(e => e.message).join(', ')}`);
    }

    console.log('GraphQL query executed successfully.');
    return response.data.data;

  } catch (error) {
    console.error(`Dgraph client error in namespace ${namespace || 'default'}: ${error.message}`);
    throw new Error('Failed to communicate with Dgraph.');
  }
}

module.exports = { executeGraphQL };
```

**Environment Configuration:**
```bash
# Enhanced api/.env.example
# Namespace Configuration (add these)
DGRAPH_NAMESPACE_DEFAULT=0x0
DGRAPH_NAMESPACE_TEST=0x1
DGRAPH_NAMESPACE_PREFIX=0x
```

#### 1.4 Universal Seeding Tool Enhancement
**Goal:** Update `tools/seed_data.py` to work with both OSS and Enterprise

**File Changes:**
- `tools/seed_data.py` - Add tenant awareness with OSS fallback
- `tools/api_client.py` - Enhanced to support tenant headers

**Universal Seeding Implementation:**
```python
# Enhanced tools/seed_data.py
def main():
    parser = argparse.ArgumentParser(description="Seed Dgraph with graph data (OSS/Enterprise compatible)")
    parser.add_argument("--api-base", "-b", default=DEFAULT_API_BASE)
    parser.add_argument("--api-key", "-k", default=os.environ.get("MIMS_ADMIN_API_KEY", ""))
    parser.add_argument("--tenant-id", "-t", default="default", 
                       help="Tenant ID for Enterprise mode (default: 'default' for OSS)")
    parser.add_argument("--create-tenant", action="store_true",
                       help="Create tenant if it doesn't exist (Enterprise only)")
    
    args = parser.parse_args()
    
    # Auto-detect Enterprise vs OSS capabilities
    capabilities = detect_dgraph_capabilities(args.api_base, args.api_key)
    
    if capabilities.get('namespacesSupported') and args.tenant_id != 'default':
        # Enterprise mode: Use tenant-aware seeding
        print(f"🏢 Enterprise mode detected - seeding tenant: {args.tenant_id}")
        seed_tenant_data(args.api_base, args.api_key, args.tenant_id, args.create_tenant)
    else:
        # OSS mode: Use traditional seeding (ignore tenant parameters)
        print("🔓 OSS mode detected - seeding default instance")
        seed_default_data(args.api_base, args.api_key)

def detect_dgraph_capabilities(api_base: str, api_key: str) -> dict:
    """Detect if Dgraph supports Enterprise features like namespaces."""
    try:
        resp = call_api(api_base, "/system/status", api_key)
        if resp["success"]:
            return resp.get("data", {})
    except:
        pass
    return {"namespacesSupported": False}

def seed_tenant_data(api_base: str, api_key: str, tenant_id: str, create_tenant: bool):
    """Seed data for a specific tenant in Enterprise mode."""
    # Set tenant context for all API calls
    tenant_headers = {"X-Tenant-Id": tenant_id}
    
    if create_tenant:
        # Create tenant via TenantManager
        create_resp = call_api(api_base, "/tenants", api_key, method="POST", 
                              payload={"tenantId": tenant_id}, extra_headers=tenant_headers)
        if not create_resp["success"]:
            print(f"⚠️ Tenant creation failed (may already exist): {create_resp.get('error')}")
    
    # Use existing seeding logic with tenant headers
    seed_with_context(api_base, api_key, tenant_headers)

def seed_default_data(api_base: str, api_key: str):
    """Seed data for OSS mode (no tenant context)."""
    # Use existing seeding logic without tenant headers
    seed_with_context(api_base, api_key, {})

def seed_with_context(api_base: str, api_key: str, extra_headers: dict):
    """Universal seeding logic that works with or without tenant context."""
    # 1. Drop all data (respects tenant context in Enterprise)
    if not drop_all_data(api_base, api_key, extra_headers):
        sys.exit(1)
    
    # 2. Push schema (respects tenant context in Enterprise)  
    if not push_schema(api_base, api_key, extra_headers):
        sys.exit(1)
    
    # ... rest of existing seeding logic with extra_headers passed through
```

### Phase 2: Real Database Testing (Days 3-4)

#### 2.1 Separate Test Data Management
**Goal:** Create dedicated test seeding separate from production seeding

**New Files:**
- `api/__tests__/helpers/testDataSeeder.js` - Dedicated test data seeding
- `frontend/tests/helpers/testDatabaseSetup.ts` - Frontend test database helpers

**Test-Specific Seeding Implementation:**
```javascript
// api/__tests__/helpers/testDataSeeder.js
const { TenantManager } = require('../../services/tenantManager');
const { DgraphTenantFactory } = require('../../services/dgraphTenant');

class TestDataSeeder {
  constructor() {
    this.tenantManager = new TenantManager();
    this.TEST_TENANT_ID = 'test-tenant';
  }

  async setupTestDatabase() {
    console.log('[TEST_SETUP] Initializing real test database');
    
    try {
      // Ensure test tenant exists
      const exists = await this.tenantManager.tenantExists(this.TEST_TENANT_ID);
      if (!exists) {
        await this.tenantManager.createTenant(this.TEST_TENANT_ID);
      }
      
      // Seed with minimal test data
      await this.seedTestData();
      
      console.log('[TEST_SETUP] Real test database ready');
      return true;
    } catch (error) {
      console.error('[TEST_SETUP] Failed to setup real test database:', error);
      return false;
    }
  }

  async cleanupTestDatabase() {
    console.log('[TEST_CLEANUP] Cleaning real test database');
    
    try {
      await this.tenantManager.deleteTenant(this.TEST_TENANT_ID);
      console.log('[TEST_CLEANUP] Real test database cleaned');
      return true;
    } catch (error) {
      console.error('[TEST_CLEANUP] Failed to cleanup real test database:', error);
      return false;
    }
  }

  async seedTestData() {
    console.log('[TEST_SEED] Seeding minimal test data');
    
    try {
      const testClient = DgraphTenantFactory.createTestTenant();
      
      // Create minimal test hierarchy (different from production data)
      const testHierarchy = {
        id: 'test-hierarchy-1',
        name: 'Test Hierarchy 1',
        levels: [
          { levelNumber: 1, label: 'Concepts', allowedTypes: ['concept'] },
          { levelNumber: 2, label: 'Examples', allowedTypes: ['example'] }
        ]
      };

      const mutation = `
        mutation CreateTestHierarchy($hierarchy: AddHierarchyInput!) {
          addHierarchy(input: [$hierarchy]) {
            hierarchy { id name }
          }
        }
      `;
      
      await testClient.executeGraphQL(mutation, { hierarchy: testHierarchy });
      
      // Add minimal test nodes
      await this.createTestNodes(testClient);
      
      console.log('[TEST_SEED] Test data seeded successfully');
      return true;
    } catch (error) {
      console.error('[TEST_SEED] Failed to seed test data:', error);
      return false;
    }
  }

  async createTestNodes(testClient) {
    const testNodes = [
      { id: 'test-concept-1', label: 'Test Concept', type: 'concept' },
      { id: 'test-example-1', label: 'Test Example', type: 'example' }
    ];

    const mutation = `
      mutation AddTestNodes($input: [AddNodeInput!]!) {
        addNode(input: $input) {
          node { id label type }
        }
      }
    `;

    await testClient.executeGraphQL(mutation, { input: testNodes });
  }
}

// Enhanced test utilities
global.testUtils = {
  ...global.testUtils,
  testDataSeeder: new TestDataSeeder(),
  
  setupTestDatabase: async () => {
    return await global.testUtils.testDataSeeder.setupTestDatabase();
  },
  
  cleanupTestDatabase: async () => {
    return await global.testUtils.testDataSeeder.cleanupTestDatabase();
  },
  
  seedTestData: async () => {
    return await global.testUtils.testDataSeeder.seedTestData();
  }
};

module.exports = { TestDataSeeder };
```

#### 2.2 Convert Integration Tests to Real Database
**Goal:** Replace mocks with real database interactions

**Enhanced Files:**
- `frontend/tests/integration/hierarchy-node-creation.test.tsx`
- `frontend/tests/integration/graph-expansion.test.tsx`
- `frontend/tests/integration/context-menu-interactions.test.tsx`

**Pattern for Real Database Tests:**
```typescript
// Example: frontend/tests/integration/hierarchy-node-creation.test.tsx
describe('Hierarchy Node Creation Integration (Real Database)', () => {
  beforeAll(async () => {
    await global.testUtils.setupTestDatabase();
  });

  afterAll(async () => {
    await global.testUtils.cleanupTestDatabase();
  });

  beforeEach(async () => {
    await global.testUtils.seedTestData();
  });

  it('creates node in correct hierarchy level with real API', async () => {
    // Set test tenant context
    const testHeaders = { 'X-Tenant-Id': 'test-tenant' };
    
    render(
      <TestProviders headers={testHeaders}>
        <App />
      </TestProviders>
    );

    // Wait for real data to load
    await waitFor(() => {
      expect(screen.getByText('Test Hierarchy 1')).toBeInTheDocument();
    });

    // Test real node creation through API
    // ... rest of test using real database
  });
});
```

### Phase 3: Frontend Tenant Context (Days 5-6)

#### 3.1 Universal Tenant Context Provider
**Goal:** Frontend tenant awareness that adapts to OSS/Enterprise

**New Files:**
- `frontend/src/context/TenantContext.tsx`

**Implementation:**
```typescript
// frontend/src/context/TenantContext.tsx
interface TenantContextType {
  tenantId: string | null;
  namespace: string | null;
  isTestTenant: boolean;
  isMultiTenantMode: boolean;
  switchTenant: (tenantId: string) => void;
}

const TenantContext = createContext<TenantContextType | undefined>(undefined);

export const TenantProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [tenantId, setTenantId] = useState<string | null>(
    localStorage.getItem('tenantId') || 'default'
  );
  const [namespace, setNamespace] = useState<string | null>(null);
  const [isMultiTenantMode, setIsMultiTenantMode] = useState(false);

  // Auto-detect multi-tenant capabilities on mount
  useEffect(() => {
    const detectCapabilities = async () => {
      try {
        const response = await fetch('/api/system/status');
        const systemStatus = await response.json();
        setIsMultiTenantMode(systemStatus.namespacesSupported || false);
      } catch (error) {
        console.warn('Could not detect multi-tenant capabilities, assuming OSS mode');
        setIsMultiTenantMode(false);
      }
    };
    
    detectCapabilities();
  }, []);

  const switchTenant = (newTenantId: string) => {
    if (!isMultiTenantMode && newTenantId !== 'default') {
      console.warn('Multi-tenant mode not supported, staying in default mode');
      return;
    }
    
    setTenantId(newTenantId);
    localStorage.setItem('tenantId', newTenantId);
    
    // Update namespace based on tenant (Enterprise only)
    if (isMultiTenantMode) {
      const newNamespace = newTenantId === 'test-tenant' ? '0x1' : null;
      setNamespace(newNamespace);
    }
  };

  const isTestTenant = tenantId === 'test-tenant';

  return (
    <TenantContext.Provider value={{
      tenantId,
      namespace,
      isTestTenant,
      isMultiTenantMode,
      switchTenant
    }}>
      {children}
    </TenantContext.Provider>
  );
};

export const useTenant = () => {
  const context = useContext(TenantContext);
  if (!context) {
    throw new Error('useTenant must be used within TenantProvider');
  }
  return context;
};
```

#### 3.2 Enhanced ApiService Integration
**Goal:** Build on existing axios interceptors with universal compatibility

**Enhanced Files:**
- `frontend/src/services/ApiService.ts` - Enhance existing tenant header logic

**Universal Enhancement:**
```typescript
// Enhanced frontend/src/services/ApiService.ts
// Update existing axios interceptor to be universally compatible
axios.interceptors.request.use(config => {
  config.headers = config.headers || {};
  
  // Only add tenant header if not in default/OSS mode
  const tenantId = localStorage.getItem('tenantId') || 'default';
  if (tenantId !== 'default') {
    config.headers['X-Tenant-Id'] = tenantId;
  }
  
  // Add hierarchy header for mutations (existing logic)
  if (config.data && config.data.mutation) {
    const hierarchyId = localStorage.getItem('hierarchyId');
    if (hierarchyId) {
      config.headers['X-Hierarchy-Id'] = hierarchyId;
    }
  }
  
  return config;
}, error => Promise.reject(error));
```

### Phase 4: Tenant Management APIs & Tools (Days 7-8)

#### 4.1 Universal Tenant Management REST API
**Goal:** Complete tenant CRUD operations with OSS compatibility

**New Files:**
- `api/routes/tenants.js` - Enhanced with full CRUD and OSS fallback
- `api/controllers/tenantController.js`

**Implementation:**
```javascript
// api/controllers/tenantController.js
const { TenantManager } = require('../services/tenantManager');
const { adaptiveTenantFactory } = require('../services/adaptiveTenantFactory');

class TenantController {
  constructor() {
    this.tenantManager = new TenantManager();
  }

  async createTenant(req, res, next) {
    try {
      const { tenantId } = req.body;
      
      // Check if multi-tenant mode is supported
      const capabilities = adaptiveTenantFactory.getCapabilities();
      if (!capabilities?.namespacesSupported) {
        return res.status(400).json({
          error: 'Multi-tenant mode not supported in OSS deployment'
        });
      }
      
      const namespace = await this.tenantManager.createTenant(tenantId);
      
      res.status(201).json({
        tenantId,
        namespace,
        message: 'Tenant created successfully'
      });
    } catch (error) {
      next(error);
    }
  }

  async listTenants(req, res, next) {
    try {
      const capabilities = adaptiveTenantFactory.getCapabilities();
      if (!capabilities?.namespacesSupported) {
        // OSS mode: return default tenant only
        return res.json([{
          tenantId: 'default',
          namespace: '0x0',
          mode: 'oss-single-tenant'
        }]);
      }
      
      // Enterprise mode: return all tenants
      const tenants = await this.tenantManager.listTenants();
      res.json(tenants);
    } catch (error) {
      next(error);
    }
  }

  // ... other methods with similar OSS/Enterprise adaptation
}

module.exports = { TenantController };
```

#### 4.2 Universal Migration & Analytics Tools
**Goal:** Basic operational utilities that work in both modes

**New Files:**
- `api/utils/tenantMigration.js`
- `api/services/tenantAnalytics.js`

**Universal Implementation:**
```javascript
// api/utils/tenantMigration.js
const { DgraphTenantFactory } = require('../services/dgraphTenant');
const { adaptiveTenantFactory } = require('../services/adaptiveTenantFactory');
const fs = require('fs').promises;

class TenantMigration {
  async backupTenant(tenantId, backupPath) {
    console.log(`[MIGRATION] Backing up tenant ${tenantId}`);
    
    // Use adaptive factory to get appropriate client
    const tenant = await adaptiveTenantFactory.createTenant(
      tenantId === 'default' ? null : tenantId
    );
    
    // Export all data (works in both OSS and Enterprise)
    const exportQuery = `
      query {
        nodes: queryNode { id label type }
        hierarchies: queryHierarchy { id name }
        edges: queryEdge { from { id } to { id } type }
      }
    `;
    
    const data = await tenant.executeGraphQL(exportQuery);
    await fs.writeFile(backupPath, JSON.stringify(data, null, 2));
    
    console.log(`[MIGRATION] Tenant ${tenantId} backed up to ${backupPath}`);
  }

  async restoreTenant(tenantId, backupPath) {
    console.log(`[MIGRATION] Restoring tenant ${tenantId}`);
    
    const data = JSON.parse(await fs.readFile(backupPath, 'utf8'));
    const tenant = await adaptiveTenantFactory.createTenant(
      tenantId === 'default' ? null : tenantId
    );
    
    // Restore hierarchies first, then nodes, then edges
    // Implementation details...
    
    console.log(`[MIGRATION] Tenant ${tenantId} restored from ${backupPath}`);
  }
}

module.exports = { TenantMigration };
```

## Data Seeding Strategy

### Production User Seeding
- **Purpose**: Initialize new user/tenant with starter data
- **Tool**: Enhanced `tools/seed_data.py` with universal compatibility
- **Usage**: 
  - OSS: `python tools/seed_data.py` (seeds default instance)
  - Enterprise: `python tools/seed_data.py --tenant-id user123 --create-tenant`

### Test Data Seeding  
- **Purpose**: Provide controlled test data for automated testing
- **Tool**: Dedicated `api/__tests__/helpers/testDataSeeder.js`
- **Usage**: Automatically called by test setup/teardown
- **Isolation**: Completely separate from production seeding

### Key Differences
- **Production seeding**: Rich, realistic starter data for new users
- **Test seeding**: Minimal, predictable data for test scenarios
- **No overlap**: Test data never interferes with production workflows

## Testing Strategy

### Unit Tests
- Enhanced dgraphClient namespace parameter
- Tenant context middleware validation
- Migration utility functions
- Universal compatibility functions

### Integration Tests
- Real database operations in test tenant
- Tenant provisioning workflows
- Cross-tenant isolation verification (Enterprise only)
- OSS/Enterprise mode detection and adaptation

### End-to-End Tests
- Complete tenant lifecycle (Enterprise)
- Frontend tenant switching (Enterprise)
- Data isolation verification (Enterprise)
- Single-user workflows (OSS)

## Implementation Guidelines

### Universal Adaptive Design
- **Single implementation** that works with both OSS and Enterprise Dgraph
- **Auto-detection** of capabilities using existing dgraphCapabilities service
- **Graceful degradation** when Enterprise features aren't available
- **No legacy code retention** - update functions directly, don't create fallbacks

### Code Style Alignment
- **Simple, clean implementations** - Follow existing DgraphTenant patterns
- **Factory pattern usage** - Build on existing DgraphTenantFactory
- **Consistent logging** - Use existing `[SERVICE_NAME]` prefix pattern
- **Environment defaults** - Follow `process.env.X || 'default'` pattern
- **Error handling** - Match existing try/catch and error propagation

### Adaptive Approach (Following AdaptiveTenantFactory Pattern)
- **Build on existing services** - Enhance TenantManager, don't replace
- **Leverage existing middleware** - Extend tenantContext, don't duplicate
- **Use established patterns** - Follow ApiService axios interceptor approach
- **Universal compatibility** - Code works seamlessly with OSS and Enterprise

## Success Metrics

### Technical Metrics
- **Universal Compatibility**: 100% functionality in both OSS and Enterprise modes
- **Data Isolation**: 100% tenant separation verified through testing (Enterprise)
- **Performance**: <5% overhead for namespace parameter addition
- **Reliability**: All existing functionality continues working
- **Test Coverage**: 100% real database test conversion
- **Schema Operations Working**: Seeding process completes without parameter order errors
- **Test Suite Passing**: All unit tests using correct function signatures

### Operational Metrics
- **User Onboarding**: <30 seconds for new user setup (both modes)
- **Data Migration**: <5 minutes for typical user backup/restore
- **Development Workflow**: Seamless tenant switching for testing (Enterprise)
- **OSS Compatibility**: Zero configuration changes needed for OSS deployments

## Risk Mitigation

### Technical Risks
- **Universal Compatibility**: Use optional parameters and capability detection
- **Performance Impact**: Minimal changes to core dgraphClient
- **Test Reliability**: Proper test database cleanup and isolation
- **Mode Detection**: Robust fallback when capabilities cannot be determined

### Operational Risks
- **Data Loss**: Comprehensive backup utilities before any destructive operations
- **Migration Issues**: Rollback capabilities and validation steps
- **OSS Regression**: Ensure no Enterprise-only dependencies in core functionality

This refactor completes the multi-tenant architecture by building on the solid foundation already in place, while maintaining full compatibility with OSS deployments through universal adaptive design patterns.

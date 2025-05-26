# Refactor 02: Multi-Tenant Architecture with Dgraph Namespaces

**Date:** 2025-05-26  
**Objective:** Implement multi-tenant capability using Dgraph namespaces, establishing our Test Graph as a prototype for the future multi-user architecture.

## Strategic Vision

### Current State
- Single Dgraph cluster serving all data in default namespace (0x0)
- All tests use mocks instead of real database interactions
- No user isolation or multi-tenancy support
- Manual data management without user-specific contexts

### Target State
- Namespace-based multi-tenancy with complete user isolation
- Test environment using dedicated namespace (0x1) as multi-user prototype
- Production-ready user provisioning and management system
- Real database integration testing with isolated test data

## Multi-Tenant Architecture Design

### Namespace Strategy
```
Dgraph Cluster Layout:
├── Namespace 0x0 (default) - System/Admin data
├── Namespace 0x1 - "test-user" (Test environment prototype)
├── Namespace 0x2 - "user-alice" (Production user)
├── Namespace 0x3 - "user-bob" (Production user)
└── ... (up to 2^64 namespaces)
```

### Benefits of Namespace Approach
- **Complete Data Isolation**: Users cannot access each other's data
- **Shared Infrastructure**: Single Dgraph cluster serves all users efficiently
- **Independent Schemas**: Each user can have customized node types and hierarchies
- **Operational Efficiency**: One cluster to maintain, backup, and monitor
- **Cost Effective**: No need for separate infrastructure per user

## Implementation Phases

### Phase 1: Namespace Infrastructure (Week 1)

#### 1.1 Enhanced Dgraph Client
**Goal:** Make dgraphClient namespace-aware

**File Changes:**
- `api/dgraphClient.js` - Add namespace parameter support
- `api/.env.example` - Add namespace configuration variables

**Implementation:**
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
    // ... rest of implementation
  } catch (error) {
    console.error(`[DGRAPH] Namespace ${namespace || 'default'} error:`, error.message);
    throw error;
  }
}

module.exports = { executeGraphQL };
```

**Environment Configuration:**
```bash
# Enhanced api/.env.example
# Namespace Configuration
DGRAPH_NAMESPACE_DEFAULT=0x0    # System/admin namespace
DGRAPH_NAMESPACE_TEST=0x1       # Test user namespace
DGRAPH_NAMESPACE_PREFIX=0x      # Prefix for dynamic user namespaces

# Multi-tenant Settings
ENABLE_MULTI_TENANT=true
DEFAULT_USER_NAMESPACE=0x0
```

#### 1.2 Namespace Management Service
**Goal:** Centralized namespace operations

**New Files:**
- `api/services/namespaceManager.js`
- `api/utils/namespaceUtils.js`

**Implementation:**
```javascript
// api/services/namespaceManager.js
class NamespaceManager {
  constructor() {
    this.defaultNamespace = process.env.DGRAPH_NAMESPACE_DEFAULT || '0x0';
    this.testNamespace = process.env.DGRAPH_NAMESPACE_TEST || '0x1';
    this.namespacePrefix = process.env.DGRAPH_NAMESPACE_PREFIX || '0x';
  }

  async createUserNamespace(userId) {
    const namespace = this.generateNamespaceId(userId);
    
    try {
      // Initialize schema in new namespace
      await this.initializeNamespaceSchema(namespace);
      
      // Seed with default hierarchies
      await this.seedDefaultHierarchies(namespace);
      
      // Store user -> namespace mapping
      await this.storeUserNamespaceMapping(userId, namespace);
      
      console.log(`[NAMESPACE] Created namespace ${namespace} for user ${userId}`);
      return namespace;
    } catch (error) {
      console.error(`[NAMESPACE] Failed to create namespace for user ${userId}:`, error);
      throw error;
    }
  }

  async initializeNamespaceSchema(namespace) {
    const { pushSchemaViaHttp } = require('../utils/pushSchema');
    const schemaContent = await this.getDefaultSchema();
    
    return await pushSchemaViaHttp(schemaContent, namespace);
  }

  async seedDefaultHierarchies(namespace) {
    const { executeGraphQL } = require('../dgraphClient');
    
    const defaultHierarchies = [
      {
        id: 'default-hierarchy',
        name: 'Default Hierarchy',
        levels: [
          { levelNumber: 1, label: 'Concepts', allowedTypes: ['concept'] },
          { levelNumber: 2, label: 'Examples', allowedTypes: ['example'] },
          { levelNumber: 3, label: 'Details', allowedTypes: ['question', 'note'] }
        ]
      }
    ];

    for (const hierarchy of defaultHierarchies) {
      await this.createHierarchyInNamespace(hierarchy, namespace);
    }
  }

  generateNamespaceId(userId) {
    // Generate deterministic namespace ID from user ID
    const hash = require('crypto').createHash('sha256').update(userId).digest('hex');
    const namespaceNum = parseInt(hash.substring(0, 8), 16) % 1000000 + 2; // Start from 0x2
    return `${this.namespacePrefix}${namespaceNum.toString(16)}`;
  }

  async getUserNamespace(userId) {
    // In production, this would query a user mapping table
    // For now, generate deterministically
    if (userId === 'test-user') return this.testNamespace;
    return this.generateNamespaceId(userId);
  }

  async deleteUserNamespace(userId) {
    const namespace = await this.getUserNamespace(userId);
    // Implementation for namespace cleanup
    console.log(`[NAMESPACE] Deleting namespace ${namespace} for user ${userId}`);
  }
}

module.exports = { NamespaceManager };
```

#### 1.3 User Context Middleware
**Goal:** Automatic namespace resolution per request

**New Files:**
- `api/middleware/userContext.js`

**Implementation:**
```javascript
// api/middleware/userContext.js
const { NamespaceManager } = require('../services/namespaceManager');

const namespaceManager = new NamespaceManager();

async function setUserNamespace(req, res, next) {
  try {
    // Extract user ID from headers, JWT, or default to test user
    const userId = req.headers['x-user-id'] || 
                   req.user?.id || 
                   (process.env.NODE_ENV === 'test' ? 'test-user' : 'default');
    
    // Resolve user's namespace
    const namespace = await namespaceManager.getUserNamespace(userId);
    
    // Attach to request context
    req.userContext = {
      userId,
      namespace,
      isTestUser: userId === 'test-user',
      isDefaultUser: userId === 'default'
    };

    console.log(`[USER_CONTEXT] User ${userId} -> Namespace ${namespace}`);
    next();
  } catch (error) {
    console.error('[USER_CONTEXT] Failed to resolve user namespace:', error);
    // Fallback to default namespace
    req.userContext = {
      userId: 'default',
      namespace: namespaceManager.defaultNamespace,
      isTestUser: false,
      isDefaultUser: true
    };
    next();
  }
}

module.exports = { setUserNamespace };
```

### Phase 2: Test Namespace Implementation (Week 2)

#### 2.1 Test Database Setup
**Goal:** Create isolated test environment using namespace 0x1

**Enhanced Files:**
- `api/__tests__/helpers/testSetup.js`
- `frontend/tests/helpers/testUtils.tsx`

**Test Database Configuration:**
```javascript
// api/__tests__/helpers/testSetup.js
const { NamespaceManager } = require('../../services/namespaceManager');
const { executeGraphQL } = require('../../dgraphClient');

const namespaceManager = new NamespaceManager();
const TEST_NAMESPACE = '0x1';

async function setupTestDatabase() {
  console.log('[TEST_SETUP] Initializing test namespace:', TEST_NAMESPACE);
  
  try {
    // Initialize schema in test namespace
    await namespaceManager.initializeNamespaceSchema(TEST_NAMESPACE);
    
    // Seed with test data
    await seedTestData(TEST_NAMESPACE);
    
    console.log('[TEST_SETUP] Test database ready');
  } catch (error) {
    console.error('[TEST_SETUP] Failed to setup test database:', error);
    throw error;
  }
}

async function seedTestData(namespace) {
  const testHierarchies = [
    {
      id: 'test-hierarchy-1',
      name: 'Test Hierarchy 1',
      levels: [
        { levelNumber: 1, label: 'Concepts', allowedTypes: ['concept'] },
        { levelNumber: 2, label: 'Examples', allowedTypes: ['example'] }
      ]
    },
    {
      id: 'test-hierarchy-2', 
      name: 'Test Hierarchy 2',
      levels: [
        { levelNumber: 1, label: 'Questions', allowedTypes: ['question'] },
        { levelNumber: 2, label: 'Answers', allowedTypes: ['answer'] }
      ]
    }
  ];

  for (const hierarchy of testHierarchies) {
    await createTestHierarchy(hierarchy, namespace);
  }

  // Create test nodes
  await createTestNodes(namespace);
}

async function cleanupTestDatabase() {
  console.log('[TEST_CLEANUP] Cleaning test namespace:', TEST_NAMESPACE);
  
  // Drop all data in test namespace
  const dropMutation = `
    mutation {
      deleteNode(filter: {}) {
        numUids
      }
      deleteHierarchy(filter: {}) {
        numUids
      }
    }
  `;
  
  await executeGraphQL(dropMutation, {}, TEST_NAMESPACE);
}

module.exports = {
  setupTestDatabase,
  cleanupTestDatabase,
  TEST_NAMESPACE
};
```

#### 2.2 Enhanced Integration Tests
**Goal:** Replace mocks with real database interactions

**Enhanced Files:**
- `frontend/tests/integration/hierarchy-node-creation.test.tsx`
- `frontend/tests/integration/graph-expansion.test.tsx`
- `frontend/tests/integration/context-menu-interactions.test.tsx`

**Real Database Integration Tests:**
```typescript
// frontend/tests/integration/hierarchy-node-creation.test.tsx
import { setupTestDatabase, cleanupTestDatabase } from '../helpers/testDatabaseSetup';

describe('Hierarchy Node Creation Integration (Real Database)', () => {
  beforeAll(async () => {
    await setupTestDatabase();
  });

  afterAll(async () => {
    await cleanupTestDatabase();
  });

  beforeEach(async () => {
    // Reset to known test state
    await resetTestData();
  });

  it('creates node in correct hierarchy level with real API', async () => {
    // Set test user context
    const testHeaders = { 'X-User-Id': 'test-user' };
    
    render(
      <TestProviders headers={testHeaders}>
        <App />
      </TestProviders>
    );

    // Wait for real data to load
    await waitFor(() => {
      expect(screen.getByText('Test Hierarchy 1')).toBeInTheDocument();
    });

    // Create node through real API
    const createButton = screen.getByTestId('create-node-button');
    fireEvent.click(createButton);

    // Fill form with test data
    const nameInput = screen.getByLabelText('Node Name');
    fireEvent.change(nameInput, { target: { value: 'Test Concept Node' } });

    const typeSelect = screen.getByLabelText('Node Type');
    fireEvent.change(typeSelect, { target: { value: 'concept' } });

    const submitButton = screen.getByText('Create Node');
    fireEvent.click(submitButton);

    // Verify node was created in database
    await waitFor(async () => {
      const nodes = await fetchNodesFromTestDB();
      expect(nodes).toContainEqual(
        expect.objectContaining({
          label: 'Test Concept Node',
          type: 'concept',
          assignments: expect.arrayContaining([
            expect.objectContaining({
              hierarchyId: 'test-hierarchy-1',
              levelNumber: 1
            })
          ])
        })
      );
    });
  });

  it('validates hierarchy constraints with real backend validation', async () => {
    // Test real validation logic
    const invalidNodeData = {
      label: 'Invalid Node',
      type: 'invalid-type', // Not allowed in any level
      hierarchyId: 'test-hierarchy-1'
    };

    const response = await fetch('/api/mutate', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-User-Id': 'test-user'
      },
      body: JSON.stringify({
        mutation: createNodeMutation,
        variables: { input: invalidNodeData }
      })
    });

    expect(response.status).toBe(400);
    const error = await response.json();
    expect(error.message).toContain('Node type not allowed');
  });
});
```

### Phase 3: Production Multi-User System (Week 3)

#### 3.1 User Management API
**Goal:** Complete user provisioning and management system

**New Files:**
- `api/routes/users.js`
- `api/controllers/userController.js`
- `api/services/userService.js`

**Implementation:**
```javascript
// api/controllers/userController.js
const { UserService } = require('../services/userService');
const { NamespaceManager } = require('../services/namespaceManager');

class UserController {
  constructor() {
    this.userService = new UserService();
    this.namespaceManager = new NamespaceManager();
  }

  async createUser(req, res, next) {
    try {
      const { userId, profile } = req.body;
      
      // Create user namespace
      const namespace = await this.namespaceManager.createUserNamespace(userId);
      
      // Initialize user profile
      const user = await this.userService.createUser({
        id: userId,
        namespace,
        profile,
        createdAt: new Date(),
        status: 'active'
      });

      res.status(201).json({
        user,
        namespace,
        message: 'User created successfully'
      });
    } catch (error) {
      next(error);
    }
  }

  async getUserInfo(req, res, next) {
    try {
      const { userId } = req.params;
      const user = await this.userService.getUser(userId);
      
      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }

      res.json(user);
    } catch (error) {
      next(error);
    }
  }

  async deleteUser(req, res, next) {
    try {
      const { userId } = req.params;
      
      // Delete user namespace and all data
      await this.namespaceManager.deleteUserNamespace(userId);
      
      // Remove user record
      await this.userService.deleteUser(userId);

      res.json({ message: 'User deleted successfully' });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = { UserController };
```

#### 3.2 Frontend Multi-User Support
**Goal:** User-aware frontend with namespace context

**Enhanced Files:**
- `frontend/src/context/UserContext.tsx` (new)
- `frontend/src/services/ApiService.ts`
- `frontend/src/App.tsx`

**Implementation:**
```typescript
// frontend/src/context/UserContext.tsx
interface UserContextType {
  userId: string | null;
  namespace: string | null;
  isTestUser: boolean;
  switchUser: (userId: string) => Promise<void>;
  createUser: (userId: string, profile: any) => Promise<void>;
}

const UserContext = createContext<UserContextType | undefined>(undefined);

export const UserProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [userId, setUserId] = useState<string | null>(null);
  const [namespace, setNamespace] = useState<string | null>(null);
  const [isTestUser, setIsTestUser] = useState(false);

  const switchUser = async (newUserId: string) => {
    try {
      // Get user info including namespace
      const response = await fetch(`/api/users/${newUserId}`);
      const userData = await response.json();
      
      setUserId(newUserId);
      setNamespace(userData.namespace);
      setIsTestUser(newUserId === 'test-user');
      
      // Store in localStorage for persistence
      localStorage.setItem('currentUserId', newUserId);
      localStorage.setItem('currentNamespace', userData.namespace);
      
    } catch (error) {
      console.error('Failed to switch user:', error);
    }
  };

  const createUser = async (newUserId: string, profile: any) => {
    try {
      const response = await fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: newUserId, profile })
      });
      
      const userData = await response.json();
      await switchUser(newUserId);
      
    } catch (error) {
      console.error('Failed to create user:', error);
      throw error;
    }
  };

  return (
    <UserContext.Provider value={{
      userId,
      namespace,
      isTestUser,
      switchUser,
      createUser
    }}>
      {children}
    </UserContext.Provider>
  );
};

export const useUser = () => {
  const context = useContext(UserContext);
  if (!context) {
    throw new Error('useUser must be used within UserProvider');
  }
  return context;
};
```

**Enhanced API Service:**
```typescript
// Enhanced frontend/src/services/ApiService.ts
import { useUser } from '../context/UserContext';

// Add user context to all API calls
const getRequestHeaders = () => {
  const userId = localStorage.getItem('currentUserId') || 'default';
  const hierarchyId = localStorage.getItem('hierarchyId');
  
  return {
    'Content-Type': 'application/json',
    'X-User-Id': userId,
    ...(hierarchyId && { 'X-Hierarchy-Id': hierarchyId })
  };
};

export const executeQuery = async (query: string, variables?: any) => {
  const response = await axios.post('/api/query', 
    { query, variables },
    { headers: getRequestHeaders() }
  );
  return response.data;
};

export const executeMutation = async (mutation: string, variables?: any) => {
  const response = await axios.post('/api/mutate',
    { mutation, variables },
    { headers: getRequestHeaders() }
  );
  return response.data;
};
```

### Phase 4: Advanced Features (Week 4)

#### 4.1 Namespace Migration Tools
**Goal:** Tools for managing user data and migrations

**New Files:**
- `api/utils/namespaceMigration.js`
- `tools/namespace_manager.py`

**Implementation:**
```javascript
// api/utils/namespaceMigration.js
class NamespaceMigration {
  async migrateUserData(fromNamespace, toNamespace) {
    console.log(`[MIGRATION] Moving data from ${fromNamespace} to ${toNamespace}`);
    
    // Export data from source namespace
    const data = await this.exportNamespaceData(fromNamespace);
    
    // Import data to target namespace
    await this.importNamespaceData(toNamespace, data);
    
    // Verify migration
    await this.verifyMigration(fromNamespace, toNamespace);
  }

  async backupNamespace(namespace, backupPath) {
    const data = await this.exportNamespaceData(namespace);
    await fs.writeFile(backupPath, JSON.stringify(data, null, 2));
    console.log(`[BACKUP] Namespace ${namespace} backed up to ${backupPath}`);
  }

  async restoreNamespace(namespace, backupPath) {
    const data = JSON.parse(await fs.readFile(backupPath, 'utf8'));
    await this.importNamespaceData(namespace, data);
    console.log(`[RESTORE] Namespace ${namespace} restored from ${backupPath}`);
  }
}
```

#### 4.2 Monitoring and Analytics
**Goal:** Multi-tenant monitoring and usage analytics

**New Files:**
- `api/services/analyticsService.js`
- `api/routes/analytics.js`

**Implementation:**
```javascript
// api/services/analyticsService.js
class AnalyticsService {
  async getUserUsageStats(userId) {
    const namespace = await namespaceManager.getUserNamespace(userId);
    
    const stats = await executeGraphQL(`
      query GetUserStats {
        nodeCount: aggregateNode { count }
        hierarchyCount: aggregateHierarchy { count }
        edgeCount: aggregateEdge { count }
      }
    `, {}, namespace);
    
    return {
      userId,
      namespace,
      ...stats,
      lastActivity: await this.getLastActivity(namespace)
    };
  }

  async getSystemStats() {
    // Aggregate stats across all namespaces
    const users = await this.getAllUsers();
    const stats = await Promise.all(
      users.map(user => this.getUserUsageStats(user.id))
    );
    
    return {
      totalUsers: users.length,
      totalNodes: stats.reduce((sum, s) => sum + s.nodeCount, 0),
      totalHierarchies: stats.reduce((sum, s) => sum + s.hierarchyCount, 0),
      activeUsers: stats.filter(s => this.isRecentlyActive(s.lastActivity)).length
    };
  }
}
```

## Testing Strategy

### Unit Tests
- Namespace manager functionality
- User context middleware
- Migration utilities
- Analytics services

### Integration Tests
- Real database operations in test namespace
- User provisioning workflows
- Cross-namespace isolation verification
- Migration and backup processes

### End-to-End Tests
- Complete user onboarding flow
- Multi-user scenarios
- Data isolation verification
- Performance testing with multiple namespaces

## Security Considerations

### Data Isolation
- Namespace-level access controls
- Request validation for namespace access
- Audit logging for cross-namespace operations

### User Authentication
- JWT-based user identification
- API key management for admin operations
- Rate limiting per namespace

### Backup and Recovery
- Namespace-specific backup strategies
- Point-in-time recovery capabilities
- Data retention policies

## Performance Optimization

### Namespace Efficiency
- Connection pooling across namespaces
- Query optimization for multi-tenant scenarios
- Caching strategies for user context

### Monitoring
- Namespace-level performance metrics
- Resource usage tracking
- Automated scaling triggers

## Migration Path

### Phase 1: Infrastructure (Immediate)
1. Implement namespace-aware dgraphClient
2. Create namespace management service
3. Add user context middleware

### Phase 2: Test Environment (Week 1)
1. Set up test namespace (0x1)
2. Migrate integration tests to real database
3. Validate multi-tenant architecture

### Phase 3: Production System (Week 2-3)
1. Implement user management API
2. Add frontend multi-user support
3. Deploy user provisioning system

### Phase 4: Advanced Features (Week 4)
1. Migration and backup tools
2. Analytics and monitoring
3. Performance optimization

## Success Metrics

### Technical Metrics
- **Data Isolation**: 100% namespace separation verified
- **Performance**: <10% overhead for multi-tenancy
- **Reliability**: 99.9% uptime for user operations
- **Scalability**: Support for 1000+ concurrent users

### Operational Metrics
- **User Onboarding**: <30 seconds for new user setup
- **Data Migration**: <5 minutes for typical user data
- **Backup/Restore**: <10 minutes for user namespace
- **Monitoring**: Real-time visibility into all namespaces

## Risk Mitigation

### Technical Risks
- **Namespace Conflicts**: Deterministic ID generation with collision detection
- **Data Leakage**: Comprehensive access control testing
- **Performance Degradation**: Load testing and optimization

### Operational Risks
- **User Data Loss**: Automated backup and recovery procedures
- **Migration Failures**: Rollback capabilities and validation
- **Scaling Issues**: Monitoring and automated scaling

## Future Enhancements

### Advanced Multi-Tenancy
- Hierarchical namespaces for organizations
- Cross-user collaboration features
- Federated identity management

### Enterprise Features
- Custom schema per tenant
- Advanced analytics and reporting
- Compliance and audit trails

This refactor establishes a robust foundation for multi-tenant architecture while using our test environment as a practical prototype for the production multi-user system.

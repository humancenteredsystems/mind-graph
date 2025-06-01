---
id: system-architecture
title: System Architecture
sidebar_label: Architecture
sidebar_position: 1
---

# 🧱 MakeItMakeSense.io System Architecture

> A modular, open-source platform for collaboratively building a living, visual knowledge graph.

## 🧭 System Overview

MakeItMakeSense.io is maintained by [Human-Centered Systems, LLC](https://humancenteredsystems.io) as an open-source demonstration of real-world systems architecture and collaborative knowledge management tools.

MakeItMakeSense.io is an interactive knowledge map designed to help users explore, contribute to, and curate structured knowledge through a hybrid **hierarchical + non-hierarchical** graph structure.

## 📐 High-Level Architecture

```plaintext
[User Browser]
    │
    ▼
[Static Frontend (React/Vite + react-cytoscapejs)] ───▶ [Backend API (Node.js/Express)]
                                                  │
                                                  ▼
                                        [Dgraph Graph Database]
                                                ▲
                                      [Admin/Curator Tools]
```

## 🏗️ Core Components

### **Frontend (Static Site)**
- **Technology**: React with Vite, TypeScript, react-cytoscapejs
- **Purpose**: Interactive graph visualization and user interface
- **Features**: Graph rendering, node editing, hierarchy navigation, theme system
- **Hosting**: Static site deployment (e.g., Render)

### **Backend API (Web Service)**
- **Technology**: Node.js with Express, TypeScript
- **Purpose**: GraphQL proxy, business logic, tenant management
- **Features**: Multi-tenant operations, hierarchy management, schema operations
- **Hosting**: Web service deployment (e.g., Render)

### **Dgraph Database (Private Service)**
- **Technology**: Dgraph graph database (OSS/Enterprise)
- **Purpose**: Graph data storage with GraphQL interface
- **Features**: High-speed traversal, schema validation, namespace isolation
- **Hosting**: Docker container with persistent storage

## 🔄 Data Flow

### **Graph Load Workflow**
1. **User Access**: Browser loads React frontend
2. **Hierarchy Selection**: Frontend loads available hierarchies and sets active context
3. **Graph Data**: Frontend fetches all node IDs, then traverses each node's immediate neighbors
4. **Visualization**: Data transformed for Cytoscape.js rendering with theme-based styling
5. **Interaction**: Users can switch hierarchies, triggering graph re-filtering

### **Node Creation Workflow**
1. **User Initiation**: Right-click context menu triggers node creation modal
2. **Hierarchy Context**: Modal loads current hierarchy and available levels
3. **Type Validation**: Available node types filtered by level restrictions
4. **Form Submission**: Client sends mutation with hierarchy assignments and tenant context
5. **Server Processing**: Backend validates and processes with proper tenant isolation
6. **Graph Update**: New node added to graph with correct styling and positioning

## 🌐 Multi-Tenant Architecture

### **Tenant Isolation**
- **Complete Data Separation**: Each tenant operates in dedicated Dgraph namespace
- **Shared Infrastructure**: Single Dgraph cluster efficiently serves all tenants
- **Adaptive Design**: Automatic OSS/Enterprise detection with graceful degradation

### **Request Context**
- **Tenant Headers**: `X-Tenant-Id` header resolves to specific namespace
- **Middleware Processing**: Automatic tenant context attachment to all requests
- **Namespace Routing**: All database operations scoped to tenant namespace

---

# 🌐 Frontend Architecture

The frontend is a React-based single-page application that provides an interactive graph visualization interface for exploring and editing knowledge graphs.

## 🧱 Frontend Tech Stack

### **Core Technologies**
- **React** (with Vite) - Modern React development with fast build times
- **TypeScript** - Complete type safety and enhanced developer experience
- **react-cytoscapejs** - Graph visualization with Cytoscape.js integration
- **cytoscape-klay** - Automatic graph layout algorithm
- **Axios** - HTTP client for API communication

### **Build & Development**
- **Vite** - Lightning-fast build tool and development server
- **ESLint** - Code linting with modern JavaScript/TypeScript rules
- **Playwright** - End-to-end testing framework
- **Hot Module Replacement** - Real-time development updates

## 🎨 Styling Architecture

### **Centralized Theme System**
The frontend uses a comprehensive theme system built on design tokens and CSS-in-JS styling:

#### **Design Tokens** (`frontend/src/config/tokens.ts`)
```typescript
export const designTokens = {
  colors: {
    primary: {
      50: '#f0f9ff',
      500: '#3b82f6',
      900: '#1e3a8a'
    },
    semantic: {
      success: '#10b981',
      warning: '#f59e0b',
      error: '#ef4444'
    }
  },
  spacing: {
    xs: '0.25rem',
    sm: '0.5rem',
    // ...
  },
  typography: {
    fontFamily: 'Inter, system-ui, sans-serif',
    fontSize: {
      sm: '0.875rem',
      base: '1rem',
      // ...
    }
  }
};
```

#### **Semantic Theme** (`frontend/src/config/theme.ts`)
```typescript
export const theme = {
  node: {
    concept: {
      backgroundColor: designTokens.colors.blue[100],
      borderColor: designTokens.colors.blue[500],
      textColor: designTokens.colors.blue[900]
    },
    example: {
      backgroundColor: designTokens.colors.green[100],
      borderColor: designTokens.colors.green[500],
      textColor: designTokens.colors.green[900]
    }
  },
  hierarchy: {
    level1: { color: '#e11d48' },
    level2: { color: '#7c3aed' },
    level3: { color: '#059669' }
  }
};
```

#### **Dynamic Level Colors**
```typescript
// Automatic color generation for hierarchy levels
export function generateLevelColor(levelNumber: number): string {
  const hue = (levelNumber * 137.5) % 360; // Golden angle distribution
  return `hsl(${hue}, 70%, 50%)`;
}
```

## 🏗️ Component Architecture

### **Core Components**

#### **App.tsx**
- Main application container
- Graph state management initialization
- Global context providers setup
- Route handling (if applicable)

#### **GraphView.tsx**
- Primary graph visualization component
- Cytoscape.js integration and configuration
- Event handling for user interactions
- Node and edge rendering with theme-based styling

#### **NodeFormModal.tsx**
- Node creation and editing interface
- Form validation and submission
- Hierarchy and level selection
- Type filtering based on level restrictions

#### **NodeDrawer.tsx**
- Node details and editing panel
- Slide-out interface for node properties
- Integration with graph selection state

#### **ContextMenu.tsx**
- Right-click context menu for graph interactions
- Add node, add connection, edit options
- Position-aware menu rendering

#### **SettingsModal.tsx**
- Application settings and preferences
- Theme customization options
- Graph layout configuration

### **Context Providers**

#### **HierarchyContext.tsx**
```typescript
interface HierarchyContextType {
  hierarchies: Hierarchy[];
  activeHierarchy: Hierarchy | null;
  setActiveHierarchy: (hierarchy: Hierarchy) => void;
  loading: boolean;
}
```
- Manages available hierarchies
- Tracks active hierarchy selection
- Persists hierarchy choice in localStorage

#### **TenantContext.tsx**
```typescript
interface TenantContextType {
  tenantId: string;
  setTenantId: (id: string) => void;
  tenantInfo: TenantInfo | null;
}
```
- Manages tenant context for multi-tenant operations
- Handles tenant switching and validation
- Provides tenant-specific configuration

## 🔄 Frontend State Management

### **Graph State Hook** (`useGraphState.ts`)
```typescript
export const useGraphState = () => {
  const [nodes, setNodes] = useState<Node[]>([]);
  const [edges, setEdges] = useState<Edge[]>([]);
  const [loading, setLoading] = useState(false);
  
  const loadCompleteGraph = async (hierarchyId: string) => {
    // Fetch all node IDs, then traverse each node's neighbors
  };
  
  const addNode = async (nodeData: NodeInput) => {
    // Create node with hierarchy assignments
  };
  
  const updateNode = async (nodeId: string, updates: Partial<Node>) => {
    // Update node properties
  };
  
  return {
    nodes,
    edges,
    loading,
    loadCompleteGraph,
    addNode,
    updateNode,
    // ...
  };
};
```

## 🌍 API Integration

### **API Service** (`frontend/src/services/ApiService.ts`)
```typescript
class ApiService {
  private baseURL: string;
  private tenantId?: string;
  
  async fetchTraversalData(nodeId: string, hierarchyId: string): Promise<TraversalData> {
    return this.post('/traverse', {
      nodeId,
      hierarchyId
    });
  }
  
  async createNode(nodeData: NodeInput): Promise<Node> {
    return this.post('/mutate', {
      mutation: ADD_NODE_MUTATION,
      variables: { input: nodeData }
    });
  }
  
  private async post(endpoint: string, data: any): Promise<any> {
    const headers = {
      'Content-Type': 'application/json',
      ...(this.tenantId && { 'X-Tenant-Id': this.tenantId })
    };
    
    const response = await axios.post(`${this.baseURL}${endpoint}`, data, { headers });
    return response.data;
  }
}
```

---

# 🧠 Backend API Architecture

The backend is a Node.js Express application that serves as the API layer between the frontend and the Dgraph database, providing GraphQL operations, multi-tenant management, and business logic.

## 🧱 Backend Tech Stack

### **Core Technologies**
- **Node.js** - JavaScript runtime for server-side development
- **Express.js** - Web application framework for API routes
- **TypeScript** - Complete type safety and enhanced developer experience
- **Axios** - HTTP client for Dgraph admin communications
- **dotenv** - Environment variable management

### **Development & Build**
- **TypeScript Compiler** - Transpilation to JavaScript
- **Jest** - Unit and integration testing framework
- **ESLint** - Code linting and style enforcement
- **Nodemon** - Development server with hot reload

## 🏗️ TypeScript Architecture Benefits

### **Complete Type Safety**
- All API routes, services, and utilities are fully typed
- Compile-time error detection prevents runtime issues
- IntelliSense support for enhanced developer productivity

### **Centralized Type System** (`api/src/types/`)
```typescript
// Domain types
export interface Node {
  id: string;
  label: string;
  type: string;
  status?: string;
  branch?: string;
}

// API request/response types
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  details?: string;
}

// Configuration types
export interface Config {
  port: number;
  dgraphBaseUrl: string;
  adminApiKey: string;
  enableMultiTenant: boolean;
}
```

## 📡 API Responsibilities

### **Core Endpoints**

#### **GraphQL Operations**
- **Query Endpoint** (`POST /api/query`) - Execute GraphQL queries with tenant context
- **Mutation Endpoint** (`POST /api/mutate`) - Execute GraphQL mutations with validation
- **Schema Endpoint** (`GET /api/schema`) - Retrieve current GraphQL schema
- **Traversal Endpoint** (`POST /api/traverse`) - Fetch node and immediate neighbors

#### **Multi-Tenant Operations**
- **Tenant Context Middleware** - Automatic tenant resolution from headers
- **Namespace Routing** - Database operations scoped to tenant namespaces
- **Tenant Management** - CRUD operations for tenant lifecycle
- **Adaptive Compatibility** - OSS/Enterprise mode detection and graceful degradation

#### **Administrative Functions**
- **Schema Management** - Push and validate GraphQL schemas
- **Data Operations** - Safe data clearing and seeding
- **Health Checks** - System status and connectivity verification
- **Hierarchy Management** - Complete CRUD for hierarchies and levels

## 🔧 Service Architecture

### **Core Services**

#### **DgraphTenant & DgraphTenantFactory** (`api/services/dgraphTenant.ts`)
```typescript
class DgraphTenant {
  constructor(private namespace: string) {}
  
  async query(query: string, variables?: any): Promise<any> {
    // Execute query in specific namespace
  }
  
  async mutate(mutation: string, variables?: any): Promise<any> {
    // Execute mutation in specific namespace
  }
  
  getNamespace(): string {
    return this.namespace;
  }
}

class DgraphTenantFactory {
  createTenant(namespace: string): DgraphTenant {
    return new DgraphTenant(namespace);
  }
  
  createTenantFromContext(context: TenantContext): DgraphTenant {
    return new DgraphTenant(context.namespace);
  }
}
```

#### **TenantManager** (`api/services/tenantManager.ts`)
```typescript
class TenantManager {
  async createTenant(tenantId: string): Promise<TenantInfo> {
    // Initialize tenant with schema and hierarchies
  }
  
  async deleteTenant(tenantId: string): Promise<void> {
    // Clean up tenant data and references
  }
  
  async getTenantInfo(tenantId: string): Promise<TenantInfo> {
    // Retrieve tenant metadata and status
  }
  
  generateNamespaceId(tenantId: string): string {
    // Deterministic namespace generation
  }
}
```

#### **SchemaRegistry** (`api/services/schemaRegistry.ts`)
```typescript
class SchemaRegistry {
  async pushSchema(schema: string, namespace?: string): Promise<void> {
    // Push GraphQL schema to Dgraph
  }
  
  async validateSchema(schema: string): Promise<ValidationResult> {
    // Validate schema syntax and compatibility
  }
  
  async getActiveSchema(namespace?: string): Promise<string> {
    // Retrieve current schema for namespace
  }
}
```

## 🛡️ Middleware Architecture

### **Tenant Context Middleware** (`api/middleware/tenantContext.ts`)
```typescript
export const setTenantContext = async (req: Request, res: Response, next: NextFunction) => {
  const tenantId = req.headers['x-tenant-id'] as string || 'default';
  
  try {
    const namespace = tenantManager.getTenantNamespace(tenantId);
    req.tenantContext = {
      tenantId,
      namespace,
      isDefault: namespace === '0x0'
    };
    next();
  } catch (error) {
    res.status(400).json({
      success: false,
      error: 'Invalid tenant context',
      details: error.message
    });
  }
};
```

### **Authentication Middleware** (`api/middleware/auth.ts`)
```typescript
export const requireAdminKey = (req: Request, res: Response, next: NextFunction) => {
  const providedKey = req.headers['x-admin-api-key'] as string;
  const requiredKey = config.adminApiKey;
  
  if (!requiredKey || providedKey !== requiredKey) {
    return res.status(401).json({
      success: false,
      error: 'Admin authentication required'
    });
  }
  
  next();
};
```

---

# 🗄️ Database Architecture

The database layer uses Dgraph, a native graph database that provides GraphQL interface, high-speed traversal, and optional multi-tenant namespace isolation.

## 🧱 Dgraph Implementation

### **Technology Choice**
- **Dgraph** - Native graph database optimized for complex relationships
- **GraphQL Interface** - Type-safe schema-driven operations
- **Docker Deployment** - Containerized for consistent deployment
- **Persistent Storage** - SSD volumes for data durability

### **OSS vs Enterprise**
#### **Dgraph OSS (Single-Tenant)**
- GraphQL interface with schema validation
- High-performance graph traversal
- Single namespace (0x0) operation
- Community support and regular updates

#### **Dgraph Enterprise (Multi-Tenant)**
- Complete namespace isolation for tenants
- Advanced security and access controls
- Enterprise support and SLA guarantees
- Commercial licensing requirements

## 📊 Schema Architecture

### **Current Schema** (`schemas/default.graphql`)
```graphql
type Node {
  id: String! @id
  label: String! @search(by: [term])
  type: String!
  status: String
  branch: String
  outgoing: [Edge] @hasInverse(field: "from")
  hierarchyAssignments: [HierarchyAssignment] @hasInverse(field: "node")
}

type Edge {
  from: Node! @hasInverse(field: "outgoing")
  fromId: String! @search(by: [hash])
  to: Node
  toId: String! @search(by: [hash])
  type: String!
}

type Hierarchy {
  id: String! @id
  name: String! @search(by: [exact])
  levels: [HierarchyLevel] @hasInverse(field: "hierarchy")
}

type HierarchyLevel {
  id: ID!
  hierarchy: Hierarchy!
  levelNumber: Int! @search
  label: String
  allowedTypes: [HierarchyLevelType] @hasInverse(field: "level")
  assignments: [HierarchyAssignment] @hasInverse(field: "level")
}

type HierarchyLevelType {
  id: ID!
  level: HierarchyLevel!
  typeName: String! @search(by: [exact])
}

type HierarchyAssignment {
  id: ID!
  node: Node!
  hierarchy: Hierarchy!
  level: HierarchyLevel! @hasInverse(field: "assignments")
}
```

### **Schema Design Principles**

#### **Graph-Native Structure**
- **Nodes and Edges** - Core graph entities with flexible properties
- **Inverse Relationships** - Bidirectional traversal optimization
- **Type System** - Strong typing with GraphQL validation

#### **Hierarchy Integration**
- **Multi-Level Organization** - Hierarchical structure overlay on graph
- **Type Constraints** - Level-specific node type restrictions
- **Assignment Flexibility** - Nodes can exist in multiple hierarchies

## 🏗️ Multi-Tenant Database Architecture

### **Namespace Isolation**
Each tenant operates in a completely isolated namespace:

#### **Namespace Mapping**
```typescript
const namespaceMapping = {
  'default': '0x0',      // Default tenant (OSS compatibility)
  'test-tenant': '0x1',  // Development and testing
  'customer-1': '0x2',   // Production tenant 1
  'customer-2': '0x3',   // Production tenant 2
  // ... up to 2^64 possible namespaces
};
```

#### **Data Separation**
- **Complete Isolation** - No cross-tenant data access possible
- **Independent Schemas** - Each namespace can have schema variations
- **Separate Indices** - Search and indexing isolated per namespace

#### **Request Routing**
```typescript
// Example: Namespace-aware GraphQL endpoint
const dgraphUrl = `${baseUrl}/graphql?namespace=${namespace}`;
```

### **Adaptive Compatibility**
The system automatically detects and adapts to available capabilities:

```typescript
// Capability detection
interface DgraphCapabilities {
  namespacesSupported: boolean;
  enterpriseFeatures: boolean;
  version: string;
}

// Adaptive client creation
function createDgraphClient(namespace?: string): DgraphClient {
  if (capabilities.namespacesSupported && namespace) {
    return new NamespacedDgraphClient(namespace);
  } else {
    return new StandardDgraphClient(); // OSS fallback
  }
}
```

## 🔄 Data Operations

### **Query Patterns**

#### **Node Traversal**
```graphql
# Get node with immediate neighbors
query GetNodeWithNeighbors($nodeId: String!) {
  getNode(id: $nodeId) {
    id
    label
    type
    outgoing {
      to {
        id
        label
        type
      }
      type
    }
  }
}
```

#### **Hierarchy-Aware Queries**
```graphql
# Get all nodes in a specific hierarchy level
query GetNodesInLevel($hierarchyId: String!, $levelNumber: Int!) {
  queryHierarchyAssignment(
    filter: {
      hierarchy: { id: { eq: $hierarchyId } }
      level: { levelNumber: { eq: $levelNumber } }
    }
  ) {
    node {
      id
      label
      type
    }
    level {
      levelNumber
      label
    }
  }
}
```

### **Administrative Operations**

#### **Schema Management**
```typescript
// Push schema to specific namespace
async function pushSchema(schema: string, namespace?: string): Promise<void> {
  const url = namespace 
    ? `${dgraphUrl}/admin/schema?namespace=${namespace}`
    : `${dgraphUrl}/admin/schema`;
    
  await axios.post(url, { schema });
}
```

#### **Data Management**
```typescript
// Safe namespace-scoped data clearing
async function clearNamespaceData(namespace: string): Promise<void> {
  // 1. Query all entities in namespace
  const nodes = await queryAllNodes(namespace);
  const edges = await queryAllEdges(namespace);
  
  // 2. Delete in correct order (edges first, then nodes)
  await deleteEdges(edges.map(e => e.id), namespace);
  await deleteNodes(nodes.map(n => n.id), namespace);
}
```

## 🚀 Performance Characteristics

### **Graph Traversal Performance**
- **Optimized for Relationships** - Native graph traversal algorithms
- **Index-Backed Queries** - Strategic indexing for common patterns
- **Efficient Joins** - GraphQL resolvers minimize round trips

### **Benchmark Results**
```typescript
// Example performance metrics
const performanceMetrics = {
  nodeTraversal: {
    singleHop: '<1ms',      // Direct neighbor access
    multiHop: '<10ms',      // 2-3 degree traversal
    deepTraversal: '<100ms' // Complex path queries
  },
  search: {
    termSearch: '<5ms',     // Full-text search
    exactMatch: '<1ms',     // ID-based lookup
    complexFilter: '<20ms'  // Multi-condition queries
  },
  mutations: {
    nodeCreation: '<10ms',  // Single node creation
    batchInsert: '<100ms',  // Batch operations
    schemaUpdate: '<1s'     // Schema modifications
  }
};
```

## 🔒 Data Integrity & Validation

### **Schema Validation**
- **Type Safety** - GraphQL schema enforces data types
- **Constraint Validation** - Required fields and relationships
- **Custom Validators** - Business logic validation hooks

### **Referential Integrity**
```graphql
# Example: Ensuring edges reference valid nodes
type Edge {
  from: Node! @hasInverse(field: "outgoing")  # Required relationship
  to: Node                                    # Optional for flexibility
  fromId: String! @search(by: [hash])        # Backup reference
  toId: String! @search(by: [hash])          # Backup reference
}
```

## 🚨 Known Database Limitations

### **Dgraph dropAll Behavior**
**Critical Issue**: In Dgraph Enterprise, the `drop_all` operation affects ALL namespaces in the cluster, despite namespace parameters.

**Impact & Workarounds**:
- Use namespace-scoped deletion for safe data clearing
- Implement explicit safety flags for cluster-wide operations
- Enhanced logging and confirmation for dangerous operations

## 🧱 Technology Stack Summary

| Component | Technology | Purpose |
|-----------|------------|---------|
| **Frontend** | React + Vite + TypeScript | Interactive graph visualization |
| **Graph Rendering** | react-cytoscapejs + Cytoscape.js | Network visualization |
| **Layout Engine** | Klay algorithm | Automatic graph positioning |
| **Backend** | Node.js + Express + TypeScript | API server and business logic |
| **Database** | Dgraph (OSS/Enterprise) | Graph data storage |
| **Schema** | GraphQL | Type-safe data operations |
| **Styling** | CSS-in-JS + Design Tokens | Centralized theme system |
| **Hosting** | Render (Static + Web + Private) | Cloud deployment |

## 🚀 Key Features

### **Current Implementation**
- ✅ **Interactive Graph Visualization** - Pan, zoom, node interaction via react-cytoscapejs
- ✅ **Hierarchy-Aware Navigation** - Multi-level knowledge organization
- ✅ **Multi-Tenant Support** - Complete data isolation with namespace routing
- ✅ **Real-Time Operations** - Add, edit, and connect nodes dynamically
- ✅ **Centralized Theme System** - Consistent styling with design tokens
- ✅ **Type-Safe Development** - Full TypeScript implementation
- ✅ **Comprehensive Testing** - Unit, integration, and real database tests

### **Future Goals**
- [ ] **Branching & Merging** - Contribution workflow with review process
- [ ] **Advanced Visualization** - Filtering, search, cross-hierarchy links
- [ ] **User Authentication** - GitHub OAuth and role-based access
- [ ] **Advanced Admin Tools** - Visual conflict resolution, audit trails
- [ ] **Performance Optimization** - Caching, lazy loading, pagination

## 🔒 Privacy & Trust Principles

- **Anonymous Contributions**: Optional pseudonymous contribution workflow
- **Curator Review**: Admin/curator roles control merge to main graph
- **Rate Limiting**: Spam filtering and abuse prevention
- **Data Protection**: No unnecessary storage of personal information

## 🏗️ Extensibility

The system is designed for future expansion:

- **Authentication Integration**: GitHub OAuth for contributor attribution
- **Embeddable Components**: Subgraph widgets for external sites
- **Advanced Analytics**: Contributor dashboards and usage metrics
- **AI Integration**: Semantic tagging and automated summaries
- **Custom Themes**: User-configurable styling and layouts

## See Also

- **[Infrastructure](./infrastructure)** - Deployment and operational architecture
- **[Multi-Tenant Guide](./multi-tenant-guide)** - Complete multi-tenant implementation guide
- **[Multi-Tenant Testing](./multi-tenant-testing)** - Testing strategies and development utilities
- **[Frontend Development](./frontend-development)** - Detailed theme system and development guide
- **[API Endpoints](./api-endpoints)** - Complete API reference
- **[Setup Guide](./setup-guide)** - Development environment setup

**MakeItMakeSense.io** provides a flexible, privacy-conscious, open-source platform for exploring and constructing complex knowledge maps. Designed to support hierarchy, non-linearity, asynchronous edits, and human curation — it turns concept mapping into a living collaborative act.

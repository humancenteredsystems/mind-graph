# 🧱 MakeItMakeSense.io System Architecture

> A modular, open-source platform for collaboratively building a living, visual knowledge graph.

---

## 🧭 Overview

MakeItMakeSense.io is maintained by [Human-Centered Systems, LLC](https://humancenteredsystems.io) as an open-source demonstration of real-world systems architecture and collaborative knowledge management tools.

MakeItMakeSense.io is an interactive knowledge map designed to help users explore, contribute to, and curate structured knowledge through a hybrid **hierarchical + non-hierarchical** graph structure. This document outlines the full system architecture: frontend, backend, database, and hosting.

---

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

---

## 🌐 Frontend (Static Site on Render)

### Tech Stack (Current Implementation)
- React (with Vite)
- TypeScript
- react-cytoscapejs (with `cytoscape-klay` layout plugin) for graph rendering
- Axios for API calls
- Centralized theme system with design tokens and CSS-in-JS styling
- **Target Hosting:** Static site (e.g., Render)

### Styling Architecture (Current Implementation)
- **Design Tokens** (`frontend/src/config/tokens.ts`): Base design values (colors, spacing, typography, shadows)
- **Theme Configuration** (`frontend/src/config/theme.ts`): Semantic theme built from tokens with component-specific styling
- **Style Utilities** (`frontend/src/utils/styleUtils.ts`): Helper functions for consistent component styling
- **Dynamic Level Colors**: Automatically generated colors for 8 hierarchy levels using HSL color space
- **CSS-in-JS Approach**: Type-safe styling with theme integration, no inline styles or hardcoded values

### Features (Current Implementation)
- Interactive graph visualization via react-cytoscapejs.
- On initial load, fetches all node IDs, then iteratively fetches data for each node and its immediate connections using the `/api/traverse` endpoint (which is hierarchy-aware) to build a view of the graph.
- Basic pan and zoom provided via react-cytoscapejs (Cytoscape.js plugin).
- Dynamic styling for different node types (`concept`, `example`, `question`) and hierarchy levels.
- Uses Klay layout algorithm.
- Add Node and Add Connected Node via context menu and NodeFormModal.
- Edit Node via context menu and NodeDrawer.
- Centralized theme-based styling system with consistent UI components.

### Features (Future Goals)
- Submit changes as branches for review.
- Advanced visualization controls (filtering, hierarchy depth, cross-links).
- Search functionality integration.
- Hotkeys for power users.
- Dark mode and custom theme support.

---

## 🧠 Backend API (Web Service on Render)

### Tech Stack (Current Implementation)
- Node.js (with Express.js)
- **TypeScript** for complete type safety and enhanced developer experience
- `dotenv` for environment variables
- `axios` for some Dgraph admin communications
- **Target Hosting:** Web service (e.g., Render)
- Communicates with Dgraph primarily via GraphQL through `api/dgraphClient.ts`.

### TypeScript Architecture Benefits
- **Complete Type Safety:** All API routes, services, and utilities are fully typed
- **Enhanced Developer Experience:** Full IntelliSense, autocomplete, and compile-time error detection
- **Self-Documenting Code:** Type definitions serve as inline documentation
- **Refactoring Safety:** Type system prevents breaking changes during code modifications
- **Centralized Type System:** Comprehensive type definitions in `api/src/types/` for domain models, configurations, and API contracts

### Responsibilities (Current Implementation)
- Provide GraphQL interaction endpoints (`/api/query`, `/api/mutate`) proxying requests to Dgraph.
- Offer a traversal endpoint (`/api/traverse`) fetching a node and its immediate neighbors, aware of hierarchy context.
- Provide a search endpoint (`/api/search`).
- Expose the Dgraph schema (`/api/schema`) and health checks (`/api/health`).
- Handle CORS.
- Provide administrative endpoints for schema management, data clearing, and hierarchy CRUD operations.
- **Multi-Tenant Operations:** Tenant context middleware, namespace routing, and complete data isolation.
- **Tenant Management:** Full CRUD operations for tenant lifecycle (create, list, delete, reset).
- **Adaptive Compatibility:** Automatic OSS/Enterprise mode detection with graceful feature degradation.

### Responsibilities (Future Goals)
- Validate and sanitize graph operations more thoroughly.
- Implement branching and merging logic for contributions.
- Manage user sessions and authentication/authorization.
- Enforce role-based access control (RBAC).

### Key Endpoints (Current Implementation)
- `GET /api/health`: Health check.
- `GET /api/schema`: Retrieve GraphQL schema text.
- `POST /api/query`: Execute arbitrary GraphQL queries.
- `POST /api/mutate`: Execute arbitrary GraphQL mutations.
- `POST /api/traverse`: Traversal (root + immediate neighbors), hierarchy-aware.
- `GET /api/search`: Node search by label.
- *Note: Additional administrative, schema management, and hierarchy CRUD endpoints exist.*

*(See `docs/api_endpoints.md` for a comprehensive list and details).*

### Key Endpoints (Future Goals)
- Endpoints for submitting, fetching, diffing, and merging branches.
- Endpoints for user management and authentication.

---

## 🧱 Dgraph (Graph Database on Render Private Service)

### Deployment
- **Current Development:** Runs locally via Docker Compose (`docker-compose.yml`).
- **Target Hosting:** Docker container on a private service (e.g., Render) with a persistent disk.
- **Multi-Tenant Support:** Dgraph Enterprise provides namespace isolation for complete tenant data separation.

### Multi-Tenant Architecture
- **Namespace Isolation:** Each tenant operates in a dedicated namespace (0x0=default, 0x1=test-tenant, 0x2+=production tenants)
- **Shared Infrastructure:** Single Dgraph cluster efficiently serves all tenants
- **Adaptive Design:** Automatically detects OSS vs Enterprise capabilities and adapts behavior
- **Complete Data Isolation:** Tenants cannot access each other's data or operations

### Schema Example (Reflects current `schemas/default.graphql`)

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
  id: String! @id # Corrected from ID! to String! @id
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

*(See `docs/schema_notes.md` regarding `@id` type requirements and other schema details).*

### Capabilities
- High-speed traversal of hierarchy and cross-links
- GraphQL query/mutation interface
- Schema-driven validation
- Versioning via `status` and `branch` metadata (potential)

---

## 🔧 Admin Tools (Future Goals)

- Branch diff viewer
- Visual conflict resolution
- Merge interface for curators
- Node/edge history + audit trails
- Optional backup/export scheduler

---

## 🔒 Privacy & Trust (Principles / Future Goals)

- IPs/emails not stored with submissions (if applicable to contribution model).
- Anonymous or pseudonymous contribution options.
- Only admin/curator roles can merge content into main graph.
- Rate limiting & spam filtering on submissions.

---

## 🏗️ Render Services Summary

| Component     | Service Type    | Description                                  |
|---------------|-----------------|----------------------------------------------|
| Frontend      | Static Site     | React/Vite/react-cytoscapejs graph viewer    |
| Backend API   | Web Service     | Node.js/Express API                          |
| Dgraph Engine | Private Service | Graph DB container (Docker) with volume      |
| Storage       | Persistent Disk | Long-term data store for Dgraph (persistent) |

---

## 🚀 Example Workflow (Current Implementation - Graph Load with Hierarchy)

1. User visits the frontend application in their browser.
2. Frontend (`HierarchyContext.tsx`) loads the available hierarchies (via `GET /api/hierarchy`) and sets an active hierarchy (either from user selection/localStorage or a default).
3. For initial graph display, `App.tsx` (via `useGraphState.loadCompleteGraph`) triggers a process:
    a. Fetches all node IDs (via `POST /api/query` with `GET_ALL_NODE_IDS_QUERY`).
    b. For each node ID, it calls `POST /api/traverse` (via `ApiService.fetchTraversalData`), passing the active `hierarchyId`. This endpoint returns the node and its immediate neighbors within that hierarchy.
    c. The frontend aggregates this data to build the graph view.
4. Frontend transforms the aggregated data into the format required by Cytoscape.
5. Frontend renders the graph via react-cytoscapejs. Nodes are dynamically styled based on their hierarchy level using the centralized theme system.
6. User can switch hierarchies via the UI, which updates the `hierarchyId` in `HierarchyContext` and triggers a re-load/re-filter of the graph data according to the new hierarchy.

## 🚀 Example Workflow (Current Implementation - Node Creation with Hierarchy)

1. **User Initiates Creation:** User right-clicks on graph background and selects "Add Node" from context menu.
2. **Modal Opens:** `NodeFormModal` component opens with form fields for label, type, hierarchy, and level.
3. **Hierarchy Context:** Modal loads current hierarchy from `HierarchyContext` and displays available levels.
4. **Type Filtering:** When user selects a level, available node types are filtered based on that level's `allowedTypes` restrictions.
5. **Form Validation:** Modal validates that label is provided and selected type is allowed at the chosen level.
6. **Submission:** User submits form, triggering `useGraphState.addNode` with `hierarchyAssignments` structure.
7. **API Request:** Frontend sends `POST /api/mutate` with:
   - `hierarchyAssignments` array containing nested `hierarchy.id` and `level.id`
   - `X-Hierarchy-Id` header for server context
8. **Server Processing:** Backend processes the client-provided `hierarchyAssignments` structure:
   - Validates hierarchy and level IDs exist
   - Validates node type is allowed at the specified level
   - Preserves client's hierarchy assignment structure
9. **Database Storage:** Server sends validated mutation to Dgraph with proper `hierarchyAssignments`.
10. **Response & Update:** New node is created with correct hierarchy assignment, frontend updates graph state and applies theme-based styling.

## 🚀 Example Workflow (Future Goal - Branching/Merging)

1. User visits map → loads public graph from API.
2. User creates a new node or link locally (changes tracked in frontend state).
3. User submits their changes → Frontend calls a (future) `/api/submit-branch` endpoint.
4. Backend saves the changes to Dgraph, associated with a user branch and marked as `pending`.
5. Admin/Curator uses Admin Tools to view diffs.
6. Admin merges or rejects the branch.
7. Approved data becomes part of the public graph.

---

## 🔁 Extensibility (Future Ideas)

- Auth: GitHub OAuth for attribution
- Embeddable subgraphs for external sites
- Contributor dashboards
- Multi-branch diffs and merge history
- Semantic tagging and AI-generated summaries
- Custom theme and styling extensions

---

## 🧠 Summary

**MakeItMakeSense.io** provides a flexible, privacy-conscious, open-source platform for exploring and constructing complex knowledge maps. Designed to support hierarchy, non-linearity, asynchronous edits, and human curation — it turns concept mapping into a living collaborative act.

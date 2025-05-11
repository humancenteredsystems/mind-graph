# 🧱 MakeItMakeSense.io System Architecture

> A modular, open-source platform for collaboratively building a living, visual knowledge graph.

---

## 🧭 Overview

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
- **Target Hosting:** Static site (e.g., Render)

### Features (Current Implementation)
- Interactive graph visualization via react-cytoscapejs.
- Fetches and displays the **complete graph** on initial load using the backend API (`/api/query`).
- Basic pan and zoom provided via react-cytoscapejs (Cytoscape.js plugin).
- Styling for different node types (`concept`, `example`, `question`).
- Uses Klay layout algorithm.
- Add Node and Add Connected Node via context menu and NodeFormModal.
- Edit Node via context menu and NodeDrawer.

### Features (Future Goals)
- Submit changes as branches for review.
- Advanced visualization controls (filtering, hierarchy depth, cross-links).
- Search functionality integration.
- Hotkeys for power users.

---

## 🧠 Backend API (Web Service on Render)

### Tech Stack (Current Implementation)
- Node.js (with Express.js)
- `dotenv` for environment variables
- `axios` for fetching schema from Dgraph admin
- **Target Hosting:** Web service (e.g., Render)
- Communicates with Dgraph via GraphQL (`dgraphClient.js`)

### Responsibilities (Current Implementation)
- Provide a GraphQL endpoint (`/api/query`, `/api/mutate`) proxying requests to Dgraph.
- Offer a basic traversal endpoint (`/api/traverse`) fetching a node and its immediate neighbors.
- Provide a basic search endpoint (`/api/search`).
- Expose the Dgraph schema (`/api/schema`).
- Offer a health check endpoint (`/api/health`).
- Handle CORS.

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
- `POST /api/traverse`: Basic traversal (root + immediate neighbors).
- `GET /api/search`: Basic node search by label.

*(See `docs/api_endpoints.md` for details).*

### Key Endpoints (Future Goals)
- Endpoints for submitting, fetching, diffing, and merging branches.
- Endpoints for user management and authentication.

---

## 🧱 Dgraph (Graph Database on Render Private Service)

### Deployment
- **Current Development:** Runs locally via Docker Compose (`docker-compose.yml`).
- **Target Hosting:** Docker container on a private service (e.g., Render) with a persistent disk.

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
  id: ID!
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

*(See `docs/schema_notes.md` regarding `@id` type requirements).*

### Capabilities
- High-speed traversal of hierarchy and cross-links
- GraphQL query/mutation interface
- Schema-driven validation
- Versioning via `status` and `branch` metadata

---

## 🔧 Admin Tools

- Branch diff viewer
- Visual conflict resolution
- Merge interface for curators
- Node/edge history + audit trails
- Optional backup/export scheduler

---

## 🔒 Privacy & Trust

- IPs/emails not stored with submissions
- Anonymous or pseudonymous contribution
- Only admin/curator roles can merge content
- Rate limiting & spam filtering on submissions

---

## 🏗️ Render Services Summary

| Component     | Service Type    | Description                                  |
|---------------|-----------------|----------------------------------------------|
| Frontend      | Static Site     | React/Vite/react-cytoscapejs graph viewer    |
| API Gateway   | Web Service     | Node.js/Express API                          |
| Dgraph Engine | Private Service | Graph DB container (Docker) with volume      |
| Storage       | Persistent Disk | Long-term data store for Dgraph (persistent) |

---

## 🚀 Example Workflow (Current Implementation - Graph Load with Hierarchy)

1. User visits the frontend application in their browser.
2. Frontend loads the available hierarchies and sets the active hierarchy (either from user selection or default).
3. Frontend (`App.tsx` -> `useGraphState.ts` -> `HierarchyContext.tsx`) calls the backend API with a GraphQL query that filters by the selected hierarchy.
4. Backend API executes the GraphQL query against Dgraph.
5. Frontend transforms the data into the format required by Cytoscape.
6. Frontend renders the graph via react-cytoscapejs, with nodes positioned according to their level in the active hierarchy.
7. User can switch hierarchies via the UI to view alternate organizational structures of the same knowledge graph.

## 🚀 Example Workflow (Future Goal - Branching/Merging)

1. User visits map → loads public graph from API.
2. User creates a new node or link locally (changes tracked in frontend state).
3. User submits their changes → Frontend calls a (future) `/api/submit-branch` endpoint.
4. Backend saves the changes to Dgraph, associated with a user branch and marked as `pending`.
5. Admin/Curator uses Admin Tools to view diffs.
6. Admin merges or rejects the branch.
7. Approved data becomes part of the public graph.

---

## 🔁 Extensibility

- Auth: GitHub OAuth for attribution
- Embeddable subgraphs for external sites
- Contributor dashboards
- Multi-branch diffs and merge history
- Semantic tagging and AI-generated summaries

---

## 🧠 Summary

**MakeItMakeSense.io** provides a flexible, privacy-conscious, open-source platform for exploring and constructing complex knowledge maps. Designed to support hierarchy, non-linearity, asynchronous edits, and human curation — it turns concept mapping into a living collaborative act.

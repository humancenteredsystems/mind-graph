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
[Static Frontend (React/Vite + Cytoscape.js)] ───▶ [Backend API (Node.js/Express)]
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
- Cytoscape.js (with `cytoscape-klay` layout) for graph rendering
- Axios for API calls
- **Target Hosting:** Static site (e.g., Render)

### Features (Current Implementation)
- Interactive graph visualization via Cytoscape.js.
- Fetches initial graph data from the backend API (`/api/traverse`).
- Basic pan and zoom provided by Cytoscape.js.
- Styling for different node types (`concept`, `example`, `question`).
- Uses Klay layout algorithm.

### Features (Future Goals)
- Add/edit nodes and edges locally.
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

### Schema Example (Reflects current `schema.graphql`)

```graphql
type Node {
  id: String! @id # Must be String!, Int!, or Int64! for Dgraph @id
  label: String! @search(by: [term])
  type: String!
  level: Int
  status: String  # For future use (e.g., "pending", "approved")
  branch: String  # For future use (contributor ID or branch name)
  outgoing: [Edge] @hasInverse(field: "from") # Link to outgoing edges
}

type Edge {
  from: Node! @hasInverse(field: "outgoing") # Link back to source node
  to: Node!
  type: String!
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
| Frontend      | Static Site     | React/Vite/Cytoscape.js graph viewer         |
| API Gateway   | Web Service     | Node.js/Express API                          |
| Dgraph Engine | Private Service | Graph DB container (Docker) with volume      |
| Storage       | Persistent Disk | Long-term data store for Dgraph (persistent) |

---

## 🚀 Example Workflow (Current Implementation)

1. User visits the frontend application in their browser.
2. Frontend (`App.tsx`) calls the backend API (`POST /api/traverse`) with a root node ID.
3. Backend API queries Dgraph for the root node and its immediate neighbors.
4. Backend API returns the data to the frontend.
5. Frontend (`App.tsx` + `graphUtils.ts`) transforms the data.
6. Frontend (`GraphView.tsx`) renders the nodes and edges using Cytoscape.js.

## 🚀 Example Workflow (Future Goal - Branching/Merging)

1. User visits map → loads public graph from API.
2. User creates a new node or link locally (changes tracked in frontend state).
3. User submits their changes → Frontend calls a (future) `/api/submit-branch` endpoint.
4. Backend saves the changes to Dgraph, associated with a user branch and marked as `pending`.
5. Admin/Curator uses (future) Admin Tools to view the diff between the branch and the main graph.
6. Admin merges or rejects the branch via API calls (`/api/merge` or `/api/reject`).
7. Merged data becomes part of the public graph (e.g., status updated to `approved`).

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

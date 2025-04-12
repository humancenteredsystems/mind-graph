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
[Static Frontend (React + Cytoscape.js)] ───────▶ [Backend API (Node.js or Flask)]
                                                │
                                                ▼
                                      [Dgraph Graph Database]
                                                ▲
                                      [Admin/Curator Tools]
```

---

## 🌐 Frontend (Static Site on Render)

### Tech Stack
- React (with Vite or Next.js in static export mode)
- Cytoscape.js or Reagraph for graph rendering
- Hosted as a **static site** on Render

### Features
- Interactive graph visualization
- Pan, zoom, filter, and visualize node types
- Add/edit nodes in local branch
- Submit branches for review
- Visualization controls (hierarchy depth, cross-links)
- Hotkeys for power users

---

## 🧠 Backend API (Web Service on Render)

### Tech Stack
- Node.js (Express) or Python (Flask/FastAPI)
- Hosted as a Render **web service**
- Communicates with Dgraph via GraphQL/DQL

### Responsibilities
- Validate and route graph operations
- Manage user-submitted branches
- Run diff/merge logic for curator reviews
- Enforce role-based logic (e.g., admin merge rights)

### Key Endpoints
- `GET /graph?id=xyz` – Load graph from a root node
- `POST /submit-node` – Submit new node + edges in a user branch
- `GET /branch?id=abc` – Fetch a user’s branch
- `GET /diff?branch=abc` – Show diff vs main graph
- `POST /merge` – Approve and merge into public graph

---

## 🧱 Dgraph (Graph Database on Render Private Service)

### Deployment
- Docker container on **Render Pro tier** private service
- Persistent disk attached for data storage

### Schema Example

```graphql
type Node {
  id: ID!
  label: String!
  type: String!
  level: Int
  status: String  # e.g., "pending", "approved"
  branch: String  # contributor ID or branch name
}

type Edge {
  from: Node!
  to: Node!
  type: String!
}
```

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

| Component     | Service Type    | Description                        |
|---------------|-----------------|------------------------------------|
| Frontend      | Static Site     | React/Cytoscape-based graph viewer |
| API Gateway   | Web Service     | Express/Flask API                  |
| Dgraph Engine | Private Service | Graph DB container with volume     |
| Storage       | Persistent Disk | Long-term data store for Dgraph    |

---

## 🚀 Example Workflow

1. User visits map → loads public graph from API  
2. User creates a new node or link in their branch  
3. Branch is saved to Dgraph with status = `pending`  
4. Admin reviews and compares with main graph  
5. Admin merges or rejects changes  
6. Merged data becomes part of public graph

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
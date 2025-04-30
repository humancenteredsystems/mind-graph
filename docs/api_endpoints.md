# API Endpoints Reference

This document describes each backend API endpoint, including paths, methods, request parameters, and example responses. All endpoints are prefixed with `/api` except the root health check.

---

## GET /

**Path:** `/`  
**Description:** API root. Verifies that the Express server is running.  
**Response:**  
```
MakeItMakeSense.io API is running!
```

---

## GET /api/health

**Path:** `/api/health`  
**Description:** Checks connectivity between the API and Dgraph.  
**Response (200 OK):**  
```json
{
  "apiStatus": "OK",
  "dgraphStatus": "OK"
}
```
**Response (500 Internal Server Error):**  
```json
{
  "apiStatus": "OK",
  "dgraphStatus": "Error",
  "error": "Error message"
}
```

---

## GET /api/schema

**Path:** `/api/schema`  
**Description:** Retrieves the current GraphQL schema from Dgraph’s admin API as plain text.  
**Response (200 OK):**  
```
type Node {
  id: String! @id
  label: String! @search(by: [term])
  …
}
```
**Response (500 Internal Server Error):**  
```json
{ "error": "Failed to fetch schema from Dgraph." }
```

---

## POST /api/query

**Path:** `/api/query`  
**Description:** Executes an arbitrary GraphQL query against Dgraph.  
**Request Body:**  
```json
{
  "query": "query { queryNode(limit:1) { id label } }",
  "variables": { /* optional */ }
}
```
**Response (200 OK):**  
```json
{ "queryNode": [ { "id": "node1", "label": "Example" } ] }
```
**Error Responses:**  
- 400 Bad Request if `query` field is missing.  
- 400 GraphQL error if Dgraph returns errors.  
- 500 Server error on unexpected failures.

---

## POST /api/mutate

**Path:** `/api/mutate`  
**Description:** Executes an arbitrary GraphQL mutation.  
**Request Body:**  
```json
{
  "mutation": "mutation { addNode(input: { label: \"New\" }) { node { id } } }",
  "variables": { /* optional */ }
}
```
**Response (200 OK):**
```json
{ "addNode": { "node": [ { "id": "newId" } ] } }
```

**Supported Mutations:**
- `addNode`: Create a new node.
- `addEdge`: Create a new edge connecting nodes.
- `updateNode`: Update properties of an existing node.
- `deleteNode`: Delete nodes matching specified filter.

**Example: Create Edge**
```graphql
mutation {
  addEdge(input: [{ from: { id: "parentId" }, to: { id: "childId" }, type: "simple" }]) {
    edge { from { id } to { id } type }
  }
}
```

**Example: Update Node**
```graphql
mutation {
  updateNode(input: { filter: { id: { eq: "nodeId" } }, set: { label: "New Label" } }) {
    node { id label type level status branch }
  }
}
```
**Error Responses:**  
- 400 Bad Request if `mutation` field is missing.  
- 400 GraphQL error if Dgraph returns errors.  
- 500 Server error on unexpected failures.

---

## POST /api/traverse

**Path:** `/api/traverse`  
**Description:** Fetches a node and its immediate neighbors.  
**Request Body:**  
```json
{
  "rootId": "node1",
  "currentLevel": 0,          // optional
  "fields": ["id","label"]    // optional
}
```
**Allowed Fields:** `id`, `label`, `type`, `level`, `status`, `branch`
**Response (200 OK):**  
```json
{
  "data": {
    "queryNode": [
      {
        "id": "node1",
        "label": "Root",
        "outgoing": [
          { "type": "child", "to": { "id": "node2", "label": "Child" } }
        ]
      }
    ]
  }
}
```
**Error Responses:**  
- 400 Bad Request if `rootId` is missing or invalid parameters supplied.  
- 400 GraphQL error if Dgraph returns errors.  
- 500 Server error on unexpected failures.

---

## GET /api/search

**Path:** `/api/search?term={term}&field={field}`  
**Description:** Searches nodes by text term on an indexed field.  
**Query Parameters:**  
- `term` (required): search string  
- `field` (optional, default `label`): field to search  
**Response (200 OK):**  
```json
{ "queryNode": [ { "id": "node1", "label": "Match", "type": "concept" } ] }
```
**Error Responses:**  
- 400 Bad Request if `term` is missing or `field` is invalid.  
- 500 Server error on unexpected failures.

---

## GET /api/debug/dgraph

**Path:** `/api/debug/dgraph`  
**Description:** Diagnostic endpoint to test DNS resolution, HTTP admin reachability, and GraphQL introspection on Dgraph.  
**Response (200 OK):**  
```json
{
  "dns": { "host": "10.0.1.5", "lookupMs": 12 },
  "httpAdmin": "reachable",
  "graphql": { "__schema": { "queryType": { "name": "Query" } } }
}
```
**Error Response (500 Internal Server Error):**  
```json
{
  "dnsError": "ENOTFOUND",
  "httpError": 503,
  "graphqlError": null
}
```

---

# Schema Management Endpoints

## GET /api/schemas

**Path:** `/api/schemas`  
**Description:** Lists all available schemas in the registry.  
**Authentication:** Requires admin API key via `X-Admin-API-Key` header.  
**Response (200 OK):**  
```json
[
  {
    "id": "default",
    "name": "Default Schema",
    "description": "The main production schema",
    "owner": "system",
    "created_at": "2025-04-20T00:00:00Z",
    "is_production": true
  },
  {
    "id": "simple",
    "name": "Simple Template",
    "description": "A simplified schema for basic graphs",
    "owner": "admin",
    "created_at": "2025-04-21T00:00:00Z",
    "is_production": false
  }
]
```

## GET /api/schemas/:id

**Path:** `/api/schemas/:id`  
**Description:** Gets metadata for a specific schema by ID.  
**Authentication:** Requires admin API key via `X-Admin-API-Key` header.  
**Response (200 OK):**  
```json
{
  "id": "default",
  "name": "Default Schema",
  "description": "The main production schema",
  "owner": "system",
  "created_at": "2025-04-20T00:00:00Z",
  "is_production": true
}
```

## GET /api/schemas/:id/content

**Path:** `/api/schemas/:id/content`  
**Description:** Gets the actual GraphQL schema content for a specific schema ID.  
**Authentication:** Requires admin API key via `X-Admin-API-Key` header.  
**Response (200 OK):** Plain text GraphQL schema  
```graphql
type Node {
  id: String! @id
  # ...schema content...
}
```

## POST /api/schemas

**Path:** `/api/schemas`  
**Description:** Creates a new schema in the registry.  
**Authentication:** Requires admin API key via `X-Admin-API-Key` header.  
**Request Body:**  
```json
{
  "schemaInfo": {
    "id": "new-schema",
    "name": "New Schema",
    "description": "A new schema for testing",
    "owner": "admin",
    "is_production": false
  },
  "content": "type Node { id: String! @id ... }"
}
```
**Response (201 Created):**  
```json
{
  "id": "new-schema",
  "name": "New Schema",
  "description": "A new schema for testing",
  "owner": "admin",
  "created_at": "2025-04-29T20:00:00Z",
  "is_production": false
}
```

## PUT /api/schemas/:id

**Path:** `/api/schemas/:id`  
**Description:** Updates an existing schema in the registry.  
**Authentication:** Requires admin API key via `X-Admin-API-Key` header.  
**Request Body:**  
```json
{
  "updates": {
    "name": "Updated Schema Name",
    "is_production": true
  },
  "content": "type Node { id: String! @id ... }" // Optional: include to update schema content
}
```
**Response (200 OK):**  
```json
{
  "id": "schema-id",
  "name": "Updated Schema Name",
  "description": "Original description",
  "owner": "admin",
  "created_at": "2025-04-20T00:00:00Z",
  "is_production": true
}
```

## POST /api/schemas/:id/push

**Path:** `/api/schemas/:id/push?target=local`  
**Description:** Pushes a specific schema from the registry to Dgraph instance(s).  
**Authentication:** Requires admin API key via `X-Admin-API-Key` header.  
**Query Parameters:**  
- `target` (optional): Where to push the schema (choices: "local", "remote", "both"; default: "local")  
**Response (200 OK):**  
```json
{
  "success": true,
  "message": "Schema schema-id successfully pushed to local",
  "results": {
    "local": {
      "success": true,
      "verification": { /* verification details */ }
    }
  }
}
```

## POST /api/admin/schema

**Path:** `/api/admin/schema`  
**Description:** Legacy endpoint for pushing a GraphQL schema to Dgraph instance(s).  
**Authentication:** Requires admin API key via `X-Admin-API-Key` header.  
**Request Body:**  
```json
{
  "schema": "type Node { id: String! @id ... }", // Direct schema content
  "schemaId": "default",                          // OR schema ID from registry
  "target": "local"                               // "local", "remote", or "both"
}
```
**Response (200 OK):**  
```json
{
  "success": true,
  "message": "Schema successfully pushed to local",
  "results": {
    "local": {
      "success": true,
      "verification": { /* verification details */ }
    }
  }
}
```
**Error Responses:**  
- 400 Bad Request if schema is missing or target is invalid.  
- 401 Unauthorized if API key is missing or invalid.  
- 500 Internal Server Error if schema push fails.

---

*This reference ensures you can integrate with the backend in both local and production environments.*

## POST /api/deleteNodeCascade

**Path:** `/api/deleteNodeCascade`  
**Description:** Performs cascade deletion of a node and all associated edges.  
**Request Body:**  
```json
{ "id": "node-id" }
```
**Response (200 OK):**  
```json
{
  "deleteEdgeFrom": {
    "edge": [ { "to": { "id": "..." } } ]
  },
  "deleteEdgeTo": {
    "edge": [ { "from": { "id": "..." } } ]
  },
  "deleteNode": {
    "node": [ { "id": "deleted-node-id" } ]
  }
}
```
**Error Responses:**  
- 400 Bad Request if `id` field is missing.  
- 500 Internal Server Error on unexpected failures.

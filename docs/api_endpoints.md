# API Endpoints Reference

This document describes each backend API endpoint, including paths, methods, request parameters, and example responses. All endpoints are prefixed with `/api` except the root path.

**Note on Admin Operations:** Endpoints marked as requiring admin authentication operate on the Dgraph instance configured by the API service's `DGRAPH_BASE_URL` environment variable. Parameters like `target` in some admin requests are validated by the API but do not change which Dgraph instance the API interacts with; they are primarily for the calling script's reference or future use.

**Note on Architecture:** As of the recent refactoring, the API has been restructured into a modular architecture with separate route files for different functional domains (GraphQL operations, admin functions, schema management, diagnostics, and hierarchy management), improving maintainability while preserving full backward compatibility.

---

## General Endpoints

### GET /

**Path:** `/`  
**Description:** API root. Verifies that the Express server is running.  
**Authentication:** None  
**Response (200 OK):**  
```
MakeItMakeSense.io API is running!
```

### GET /api/health

**Path:** `/api/health`  
**Description:** Checks connectivity between the API and Dgraph.  
**Authentication:** None  
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
  "error": "Error message detailing Dgraph communication failure"
}
```

---

## GraphQL Interaction Endpoints

### POST /api/query

**Path:** `/api/query`  
**Description:** Executes an arbitrary GraphQL query against Dgraph.  
**Authentication:** None  
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
- 400/500 errors if Dgraph returns errors or on unexpected failures.

### POST /api/mutate

**Path:** `/api/mutate`  
**Description:** Executes an arbitrary GraphQL mutation. For `addNode` mutations, the API enriches input with hierarchy assignments and performs validation.  
**Authentication:** None  
**Headers (for `addNode` operations):**  
- `X-Hierarchy-Id` (required): ID of the active hierarchy. This is used as the default hierarchy for node assignments unless overridden per item in the `input` array. The provided ID will be validated.
**Request Body:**  
```json
{
  "mutation": "mutation AddNodes($input: [AddNodeInput!]!) { addNode(input: $input) { node { id label type } } }",
  "variables": {
    "input": [
      { "label": "New Node 1", "type": "ConceptNode", "id": "node123" },
      { "label": "New Node 2", "type": "ExampleNode", "id": "node456", "hierarchyId": "specificH2", "levelId": "level_xyz" }
    ]
  }
}
```
**Response (200 OK):**
```json
{ "addNode": { "node": [ { "id": "newId", "label": "New Node 1", "type": "ConceptNode" } ] } }
```
**Error Responses:**  
- 400 Bad Request if `mutation` field is missing.
- 400 Bad Request if `X-Hierarchy-Id` header is missing when `addNode` mutation is used.
- 400 Bad Request if `X-Hierarchy-Id` (or `hierarchyId` in an input item) is invalid (e.g., hierarchy not found).
- 400 Bad Request if a `levelId` (either client-provided or calculated) is invalid (e.g., level not found, or calculated level number does not exist in the hierarchy).
- 400 Bad Request if a node's `type` is not allowed for its target `levelId` according to `HierarchyLevelType` definitions.
- 400/500 errors if Dgraph returns other errors or on unexpected server failures.

---

## Graph Traversal & Search Endpoints

### POST /api/traverse

**Path:** `/api/traverse`  
**Description:** Fetches a node and its immediate neighbors. Requires a valid hierarchy context.  
**Authentication:** None  
**Headers:**  
- `X-Hierarchy-Id` (optional, but see `hierarchyId` in body): ID of the active hierarchy.
**Request Body:**  
```json
{
  "rootId": "node1",
  "hierarchyId": "hierarchy1", // Required if not provided in X-Hierarchy-Id header. ID of a hierarchy for context. Will be validated.
  "fields": ["id","label"]    // Optional: defaults to id, label, type, status, branch, and hierarchyAssignments.
}
```
**Response (200 OK):** (Example structure)
```json
{
  "data": {
    "queryNode": [
      {
        "id": "node1", "label": "Root", /* ...other fields... */
        "hierarchyAssignments": [{ "hierarchy": { "id": "hierarchy1" }, "level": { "levelNumber": 1 } }],
        "outgoing": [ /* ...neighbor nodes... */ ]
      }
    ]
  }
}
```
**Error Responses:**  
- 400 Bad Request if `rootId` is missing or invalid parameters.  
- 400/500 errors on GraphQL or server failures.

### GET /api/search

**Path:** `/api/search`  
**Description:** Searches nodes by a text term on an indexed field.  
**Authentication:** None  
**Query Parameters:**  
- `term` (required): Search string.  
- `field` (optional, default `label`): Field to search (currently only `label` is supported).  
**Response (200 OK):**  
```json
{ "queryNode": [ { "id": "node1", "label": "Matching Label", "type": "ConceptNode" } ] }
```
**Error Responses:**  
- 400 Bad Request if `term` is missing or `field` is invalid.  
- 400/500 errors on GraphQL or server failures.

---

## Node Management Endpoints

### POST /api/deleteNodeCascade

**Path:** `/api/deleteNodeCascade`
**Description:** Performs cascade deletion of a node and all its associated edges.
**Authentication:** None (Consider if this should be admin-protected)
**Request Body:**
```json
{ "nodeId": "node-to-delete-id" }
```
**Request Body Parameters:**
- `nodeId` (required): The ID of the node to delete.
**Response (200 OK):**
```json
{
  "success": true,
  "deletedNode": "node-to-delete-id",
  "deletedEdgesCount": 3,
  "deletedNodesCount": 1
}
```
**Response (404 Not Found):** If the node doesn't exist.
```json
{
  "error": "Node node-to-delete-id not found or not deleted.",
  "deletedEdgesCount": 0
}
```
**Error Responses:**
- 400 Bad Request if `nodeId` is missing.
- 500 Internal Server Error on unexpected failures.

---

## Admin & Schema Endpoints

**Authentication:** All endpoints in this section require a valid admin API key via the `X-Admin-API-Key` header, unless otherwise noted.

### GET /api/schema

**Path:** `/api/schema`  
**Description:** Retrieves the current GraphQL schema text directly from the Dgraph instance.  
**Authentication:** None (Consider if this should be admin-protected, though often useful for clients)
**Response (200 OK):** Plain text GraphQL schema.
**Response (500 Internal Server Error):**  
```json
{ "error": "Failed to fetch schema from Dgraph." }
```

### POST /api/admin/schema

**Path:** `/api/admin/schema`  
**Description:** Pushes a GraphQL schema (provided directly or by ID from registry) to the Dgraph instance.  
**Request Body:**  
```json
{
  "schema": "type Node { id: String! @id ... }", // Option 1: Direct schema content
  "schemaId": "default",                          // Option 2: Schema ID from registry
  "target": "remote"                              // Validated but ignored by API for target selection. For script use.
}
```
**Response (200 OK):**  
```json
{
  "success": true,
  "results": { /* Result from the Dgraph push operation */ }
}
```
**Error Responses:**  
- 400 Bad Request for missing parameters or invalid `target`.
- 500 Internal Server Error if schema push fails.

### POST /api/admin/dropAll

**Path:** `/api/admin/dropAll`
**Description:** Clears all data from the Dgraph instance.
**Request Body:**
```json
{
  "target": "remote" // Validated but ignored by API for target selection. For script use.
}
```
**Response (200 OK):**
```json
{
  "success": true,
  "message": "Drop all data operation completed successfully for configured Dgraph instance",
  "data": { /* Result from the Dgraph drop operation */ }
}
```
**Error Responses:**
- 400 Bad Request if `target` field is missing or invalid.
- 500 Internal Server Error if the drop operation fails.

### GET /api/debug/dgraph

**Path:** `/api/debug/dgraph`  
**Description:** Diagnostic endpoint for Dgraph connectivity.  
**Authentication:** None (Consider if this should be admin-protected)
**Response (200 OK):**  
```json
{
  "dns": { "host": "10.0.1.5", "lookupMs": 12 },
  "httpAdmin": "reachable",
  "graphql": { "__schema": { "queryType": { "name": "Query" } } }
}
```

---

## Schema Registry Management Endpoints (Admin-Protected)

**Authentication:** All endpoints in this section require a valid admin API key via the `X-Admin-API-Key` header.

### GET /api/schemas

**Path:** `/api/schemas`  
**Description:** Lists metadata for all schemas in the registry.  
**Response (200 OK):** Array of schema metadata objects.

### GET /api/schemas/:id

**Path:** `/api/schemas/:id`  
**Description:** Gets metadata for a specific schema by ID.  
**Response (200 OK):** Schema metadata object.

### GET /api/schemas/:id/content

**Path:** `/api/schemas/:id/content`  
**Description:** Gets the GraphQL content of a specific schema.  
**Response (200 OK):** Plain text GraphQL schema.

### POST /api/schemas

**Path:** `/api/schemas`  
**Description:** Creates a new schema in the registry.  
**Request Body:** Contains `schemaInfo` (metadata) and `content` (GraphQL string).  
**Response (201 Created):** Created schema metadata object.

### PUT /api/schemas/:id

**Path:** `/api/schemas/:id`  
**Description:** Updates metadata and/or content of an existing schema.  
**Request Body:** Contains `updates` (metadata fields to change) and optionally `content`.  
**Response (200 OK):** Updated schema metadata object.

### POST /api/schemas/:id/push

**Path:** `/api/schemas/:id/push`  
**Description:** Pushes a specific schema from the registry to Dgraph.  
**Response (200 OK):** Success message and Dgraph operation result.

---

## Hierarchy Management Endpoints

### GET /api/hierarchy

**Path:** `/api/hierarchy`  
**Description:** Get all hierarchies. This endpoint is publicly accessible to allow clients (e.g., the frontend) to list available hierarchies for user selection.
**Authentication:** None
**Response (200 OK):** Array of hierarchy objects (`{id, name}`).

**Admin-Protected Hierarchy Endpoints:**
All other hierarchy management endpoints listed below (for creating, updating, deleting hierarchies, levels, and assignments, and fetching specific hierarchy details) require a valid admin API key via the `X-Admin-API-Key` header.

### POST /api/hierarchy

**Path:** `/api/hierarchy`  
**Description:** Create a new hierarchy.  
**Request Body:** `{ "id": "h1", "name": "Primary Hierarchy" }`  
**Response (201 Created):** Created hierarchy object.

### GET /api/hierarchy/:id

**Path:** `/api/hierarchy/:id`  
**Description:** Get a specific hierarchy by ID.  
**Response (200 OK):** Hierarchy object. (404 if not found)

### PUT /api/hierarchy/:id

**Path:** `/api/hierarchy/:id`  
**Description:** Update an existing hierarchy's name.  
**Request Body:** `{ "name": "Updated Name" }`  
**Response (200 OK):** Updated hierarchy object.

### DELETE /api/hierarchy/:id

**Path:** `/api/hierarchy/:id`  
**Description:** Delete a hierarchy.  
**Response (200 OK):** Dgraph deletion status message.

### POST /api/hierarchy/level

**Path:** `/api/hierarchy/level`  
**Description:** Create a new level within a hierarchy.  
**Request Body:** `{ "hierarchyId": "h1", "levelNumber": 1, "label": "Domain" }`  
**Response (201 Created):** Created hierarchy level object.

### PUT /api/hierarchy/level/:id

**Path:** `/api/hierarchy/level/:id`  
**Description:** Update an existing hierarchy level's label.  
**Request Body:** `{ "label": "Updated Level Label" }`  
**Response (200 OK):** Updated hierarchy level object.

### DELETE /api/hierarchy/level/:id

**Path:** `/api/hierarchy/level/:id`  
**Description:** Delete a hierarchy level.  
**Response (200 OK):** Dgraph deletion status message.

### POST /api/hierarchy/assignment

**Path:** `/api/hierarchy/assignment`  
**Description:** Assign a node to a specific level in a hierarchy.  
**Request Body:** `{ "nodeId": "node1", "hierarchyId": "h1", "levelId": "level_abc" }`  
**Response (201 Created):** Created hierarchy assignment object.

### DELETE /api/hierarchy/assignment/:id

**Path:** `/api/hierarchy/assignment/:id`  
**Description:** Delete a hierarchy assignment.  
**Response (200 OK):** Dgraph deletion status message.

---

*For troubleshooting Dgraph connectivity issues, see the [Dgraph Troubleshooting Guide](dgraph_troubleshooting.md).*

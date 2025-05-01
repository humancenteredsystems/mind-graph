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

**Path:** `/api/schemas/:id/push`  
**Description:** Pushes a specific schema from the registry to the Dgraph instance configured by the API service's `DGRAPH_BASE_URL`. The `target` query parameter is now redundant for the API's action, but may be used by calling scripts.  
**Authentication:** Requires admin API key via `X-Admin-API-Key` header.  
**Query Parameters:**  
- `target` (optional): This parameter is now primarily for the calling script's reference and does not affect which Dgraph instance the API pushes to. Accepted values: "local", "remote", or "both".  
**Response (200 OK):**  
```json
{
  "success": true,
  "message": "Schema schema-id successfully pushed to configured Dgraph instance",
  "results": { /* Result from the single push operation */ }
}
```
**Response (500 Internal Server Error):**  
```json
{
  "success": false,
  "message": "Schema schema-id push encountered errors",
  "results": { /* Error details from the single push operation */ }
}
```

## POST /api/admin/schema

**Path:** `/api/admin/schema`  
**Description:** Legacy endpoint for pushing a GraphQL schema directly or from the registry to the Dgraph instance configured by the API service's `DGRAPH_BASE_URL`. The `target` parameter in the request body is now redundant for the API's action, but may be used by calling scripts.  
**Authentication:** Requires admin API key via `X-Admin-API-Key` header.  
**Request Body:**  
```json
{
  "schema": "type Node { id: String! @id ... }", // Direct schema content
  "schemaId": "default",                          // OR schema ID from registry
  "target": "local"                               // This parameter is now primarily for the calling script's reference. Accepted values: "local", "remote", or "both".
}
```
**Response (200 OK):**  
```json
{
  "success": true,
  "message": "Schema successfully pushed to configured Dgraph instance",
  "results": { /* Result from the single push operation */ }
}
```
**Error Responses:**  
- 400 Bad Request if schema or schemaId is missing, or target is invalid.  
- 401 Unauthorized if API key is missing or invalid.  
- 500 Internal Server Error if schema push fails.

---

*This reference ensures you can integrate with the backend in both local and production environments. Note that Dgraph endpoint URLs (GraphQL, admin schema, alter) are now derived from a single `DGRAPH_BASE_URL` environment variable configured for the API service.*

## POST /api/admin/dropAll

**Path:** `/api/admin/dropAll`
**Description:** Clears all data (nodes and edges) from the Dgraph instance configured by the API service's `DGRAPH_BASE_URL`. The `target` parameter in the request body is now redundant for the API's action, but may be used by calling scripts.
**Authentication:** Requires admin API key via `X-Admin-API-Key` header.
**Request Body:**
```json
{
  "target": "local" // This parameter is now primarily for the calling script's reference. Accepted values: "local", "remote", or "both".
}
```
**Request Body Parameters:**
- `target` (required): This parameter is now primarily for the calling script's reference and does not affect which Dgraph instance the API drops data from. Accepted values: `"local"`, `"remote"`, or `"both"`.

**Response (200 OK):**
```json
{
  "success": true,
  "message": "Drop all data operation completed successfully for configured Dgraph instance",
  "results": { /* Result from the single drop operation */ }
}
```
**Response (500 Internal Server Error):**
```json
{
  "success": false,
  "message": "Drop all data operation encountered errors",
  "results": { /* Error details from the single drop operation */ }
}
```
**Error Responses:**
- 400 Bad Request if `target` field is missing or invalid.
- 401 Unauthorized if API key is missing or invalid.
- 500 Internal Server Error if the drop operation fails.

---

## POST /api/deleteNodeCascade

**Path:** `/api/deleteNodeCascade`
**Description:** Performs cascade deletion of a node and all associated edges.
**Request Body:**
```json
{ "id": "node-id" }
```
**Request Body Parameters:**
- `id` (required): The ID of the node to delete.

**Response (200 OK):**
```json
{
  "success": true,
  "deletedNode": "node-id",
  "deletedEdgesCount": 5, // Example count
  "deletedNodesCount": 1
}
```
**Response (404 Not Found):**
```json
{
  "error": "Node node-id not found or not deleted.",
  "deletedEdgesCount": 0 // Edges might still be deleted if they pointed to a non-existent node
}
```
**Error Responses:**
- 400 Bad Request if `id` field is missing.
- 500 Internal Server Error on unexpected failures.

---

# Troubleshooting Dgraph Connectivity

## Common Issues

### API Hangs When Pushing Schema or Testing Connectivity

**Issue:** The API server hangs or times out when attempting to push a schema to Dgraph or when testing connectivity via the `/api/debug/dgraph` endpoint.

**Root Cause:** Dgraph's admin endpoints expect specific HTTP methods with specific content types:
- `/admin/schema` endpoint requires POST requests with `Content-Type: application/graphql`
- Using GET requests to these endpoints results in a "Invalid method" error (400 Bad Request)

**Solution:**
1. Always use POST for schema operations with Dgraph
2. Set the correct content type header:
   ```javascript
   // Correct way to push a schema to Dgraph
   axios.post(
     'http://localhost:8080/admin/schema',
     schemaContent,  // Plain text schema, not JSON
     { headers: { 'Content-Type': 'application/graphql' } }
   )
   ```

### Python Scripts Import Issues

**Issue:** Python scripts in the tools directory may fail with `ModuleNotFoundError: No module named 'tools'` when running from different directories.

**Solution:** Add the project root directory to Python's path before imports:
```python
import os
import sys

# Add the parent directory to the Python path to be able to import tools
sys.path.append(os.path.join(os.path.dirname(__file__), '..'))
from tools.api_client import call_api
```

## Debugging Techniques

1. **Direct Dgraph Testing:**
   To verify if Dgraph itself is accessible and responding correctly:
   ```bash
   curl -X POST -H "Content-Type: application/graphql" -d "type Test { id: ID!, name: String! }" http://localhost:8080/admin/schema
   ```

2. **API Server Debug Endpoint:**
   Use the `/api/debug/dgraph` endpoint to check DNS resolution, HTTP connectivity, and GraphQL introspection:
   ```bash
   curl http://localhost:3000/api/debug/dgraph
   ```

3. **Check Docker Container Status:**
   If Dgraph is running in Docker, verify container health:
   ```bash
   docker-compose ps
   docker-compose logs dgraph-alpha
   ```

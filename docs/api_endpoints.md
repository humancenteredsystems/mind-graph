# API Endpoints

This document details the endpoints provided by the backend API server (`api/server.js`).

**Base URL:** `/api` (Handled by frontend proxy during development, points to the API server, e.g., `http://localhost:3000/api` if running locally)

---

## 1. Health Check

*   **Path:** `/api/health`
*   **Method:** `GET`
*   **Description:** Checks the status of the API server and its connection to the Dgraph database.
*   **Request Body:** None
*   **Success Response (200 OK):**
    ```json
    {
      "apiStatus": "OK",
      "dgraphStatus": "OK"
    }
    ```
*   **Error Response (500 Internal Server Error):**
    ```json
    {
      "apiStatus": "OK",
      "dgraphStatus": "Error",
      "error": "Detailed error message from Dgraph connection attempt"
    }
    ```

---

## 2. Get GraphQL Schema

*   **Path:** `/api/schema`
*   **Method:** `GET`
*   **Description:** Retrieves the current GraphQL schema directly from the Dgraph admin endpoint.
*   **Request Body:** None
*   **Success Response (200 OK):**
    *   **Content-Type:** `text/plain`
    *   **Body:** The raw GraphQL schema definition as a string.
    ```graphql
    # Example Schema Text
    type Node {
      id: String! @id
      label: String @search(by: [term])
      type: String @search
      # ... other fields
    }
    # ... other types and definitions
    ```
*   **Error Response (500 Internal Server Error):**
    ```json
    {
      "error": "Failed to fetch schema from Dgraph."
    }
    ```

---

## 3. Execute GraphQL Query

*   **Path:** `/api/query`
*   **Method:** `POST`
*   **Description:** Executes an arbitrary GraphQL query against the Dgraph database.
*   **Request Body:**
    ```json
    {
      "query": "GraphQL query string",
      "variables": { // Optional
        "varName": "value"
      }
    }
    ```
*   **Success Response (200 OK):**
    *   The standard GraphQL JSON response structure containing `data` or `errors`.
    ```json
    {
      "data": {
        "queryNode": [ /* ... results ... */ ]
      }
    }
    ```
*   **Error Response:**
    *   **400 Bad Request:** If `query` field is missing in the request body, or if the GraphQL query itself is invalid.
        ```json
        { "error": "Missing required field: query" }
        // or
        { "error": "GraphQL error: [Specific Dgraph error message]" }
        ```
    *   **500 Internal Server Error:** For unexpected server issues during query execution.
        ```json
        { "error": "Server error executing query." }
        ```

---

## 4. Execute GraphQL Mutation

*   **Path:** `/api/mutate`
*   **Method:** `POST`
*   **Description:** Executes an arbitrary GraphQL mutation against the Dgraph database.
*   **Request Body:**
    ```json
    {
      "mutation": "GraphQL mutation string",
      "variables": { // Optional
        "varName": "value"
      }
    }
    ```
*   **Success Response (200 OK):**
    *   The standard GraphQL JSON response structure containing `data` or `errors`.
    ```json
    {
      "data": {
        "addNode": { /* ... mutation result ... */ }
      }
    }
    ```
*   **Error Response:**
    *   **400 Bad Request:** If `mutation` field is missing, or if the GraphQL mutation is invalid.
        ```json
        { "error": "Missing required field: mutation" }
        // or
        { "error": "GraphQL error: [Specific Dgraph error message]" }
        ```
    *   **500 Internal Server Error:** For unexpected server issues during mutation execution.
        ```json
        { "error": "Server error executing mutation." }
        ```

---

## 5. Graph Traversal (Basic)

*   **Path:** `/api/traverse`
*   **Method:** `POST`
*   **Description:** Fetches a specific node (`rootId`) and its immediate outgoing connections and neighbors. *Note: Currently ignores the `depth` parameter and only fetches one level.*
*   **Request Body:**
    ```json
    {
      "rootId": "string", // ID of the starting node (Required)
      "depth": "number", // Currently ignored by the API implementation (Optional, defaults to 3)
      "fields": ["string"] // Array of node fields to retrieve (Optional, defaults to ['id', 'label', 'type'])
    }
    ```
*   **Success Response (200 OK):**
    *   GraphQL response containing the root node and its immediate `outgoing` edges and connected `to` nodes, including the requested fields.
    ```json
    {
      "data": {
        "queryNode": [
          {
            "id": "node1",
            "label": "Root Node",
            "type": "concept",
            "outgoing": [
              {
                "type": "connects_to",
                "to": {
                  "id": "node2",
                  "label": "Neighbor Node",
                  "type": "example"
                }
              }
              // ... other outgoing edges
            ]
          }
        ]
      }
    }
    ```
*   **Error Response:**
    *   **400 Bad Request:** If `rootId` is missing, or if `depth` or `fields` are invalid types. Also for GraphQL errors during execution.
        ```json
        { "error": "Missing required field: rootId" }
        // or
        { "error": "Invalid depth parameter..." }
        // or
        { "error": "GraphQL error during traversal: [Specific Dgraph error message]" }
        ```
    *   **500 Internal Server Error:** For unexpected server issues.
        ```json
        { "error": "Server error during traversal." }
        ```

---

## 6. Node Search

*   **Path:** `/api/search`
*   **Method:** `GET`
*   **Description:** Searches for nodes based on a term. Currently searches only the `label` field using `allofterms`.
*   **Query Parameters:**
    *   `term`: The search term (Required).
    *   `field`: The field to search on (Optional, defaults to `label`, currently only `label` is supported).
*   **Example Request:** `GET /api/search?term=example&field=label`
*   **Success Response (200 OK):**
    *   GraphQL response containing nodes matching the search term.
    ```json
    {
      "data": {
        "queryNode": [
          {
            "id": "node5",
            "label": "Example Node",
            "type": "example"
          }
          // ... other matching nodes
        ]
      }
    }
    ```
*   **Error Response:**
    *   **400 Bad Request:** If `term` query parameter is missing, if `field` is invalid, or for GraphQL errors.
        ```json
        { "error": "Missing required query parameter: term" }
        // or
        { "error": "Invalid search field: ..." }
        // or
        { "error": "GraphQL error during search: [Specific Dgraph error message]" }
        ```
    *   **500 Internal Server Error:** For unexpected server issues.
        ```json
        { "error": "Server error during search." }
        ```

---

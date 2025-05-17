# Hierarchies in MakeItMakeSense.io

This document describes the structure, management, and usage of hierarchies within the MakeItMakeSense.io platform. Hierarchies provide a way to organize nodes into structured, multi-level categorizations, and a single node can belong to multiple hierarchies simultaneously.

## Core Schema Entities

The hierarchy system is built upon several key Dgraph schema types that define its structure and relationships:

*   **`Node`**: These are the primary content entities within the graph. Nodes can be associated with one or more hierarchies through `HierarchyAssignment` objects.
*   **`Hierarchy`**: This type represents a distinct hierarchical tree or organizational structure (e.g., "Technical Skills," "Project Categories"). Each hierarchy has a name and contains multiple levels.
*   **`HierarchyLevel`**: This type defines a specific tier or depth within a particular `Hierarchy` (e.g., "Programming Languages" as a level within "Technical Skills"). Each level has a number and an optional descriptive label. It can also (optionally) specify allowed node types.
*   **`HierarchyAssignment`**: This is the central linking type. An instance of `HierarchyAssignment` explicitly connects a `Node` to a specific `HierarchyLevel` within a particular `Hierarchy`. This record is what places a node into the hierarchical structure.

For detailed Dgraph schema definitions and GraphQL interaction patterns related to these types, please refer to the [Dgraph Schema Notes](schema_notes.md).

*(Note: The `HierarchyLevelType` feature for restricting node types at specific levels is now actively enforced by the backend API during node assignment.)*

## Rationale for the `HierarchyAssignment` Model

The use of an intermediate `HierarchyAssignment` type (rather than a direct link from `Node` to `HierarchyLevel`) offers several advantages:

1.  **Multi-Hierarchy Support:** This is the primary benefit. A single `Node` can have multiple `HierarchyAssignment` objects, each linking it to a different `Hierarchy` (or even different levels within the same hierarchy, though less common). This allows for rich, multi-faceted organization of knowledge. For example, a "Python" node could be in a "Technical Skills" hierarchy at the "Programming Language" level, and simultaneously in a "Project Stack" hierarchy at the "Backend Technologies" level.

2.  **Rich Relationship Information (Future-Proofing):** The `HierarchyAssignment` node itself can be expanded to store metadata *about the assignment*. For instance, one could add fields like `assignmentDate`, `assignedBy`, or `relevanceInHierarchy` directly to the `HierarchyAssignment` type. This would be difficult if nodes linked directly to levels.

3.  **Querying Flexibility:** This model allows for versatile querying, such as finding all nodes in a specific level of a specific hierarchy, or all hierarchical contexts a particular node belongs to.

4.  **Clear Semantics:** It explicitly models the "act of assignment" as a first-class entity in the graph.

The main trade-off is a slightly more verbose data structure (an extra "hop" through the assignment node), but this is generally outweighed by the flexibility gained, especially for multi-hierarchy requirements.

## Hierarchy Management and Usage

### Backend API

*   **Direct Management (CRUD Operations):**
    *   The API provides RESTful endpoints (primarily under `/api/hierarchy/...`) for creating, reading, updating, and deleting `Hierarchy`, `HierarchyLevel`, and `HierarchyAssignment` entities. These are mostly admin-protected.
    *   Refer to `docs/api_endpoints.md` for detailed endpoint specifications.

*   **Automatic Assignment during Node Creation (`POST /api/mutate` with `addNode`):**
    *   When new nodes are created via the `addNode` GraphQL mutation, the API server (`api/server.js`) includes logic to automatically create a `HierarchyAssignment`.
    *   **Priority of Information for Assignment:**
        1.  **`X-Hierarchy-Id` Header (Required):** The API now requires an `X-Hierarchy-Id` request header for `addNode` operations. This header specifies the default target hierarchy for all nodes being added in the batch, unless overridden per node. The provided `hierarchyId` is validated to ensure it exists.
        2.  **Explicit `hierarchyId` and `levelId` in Input:** Individual items within the `AddNodeInput` array can specify their own `hierarchyId` (overriding the header for that item) and `levelId`. These are also validated.
            *   If `levelId` is provided, its existence is checked, and the node's type is validated against the level's `allowedTypes`.
            *   If `levelId` is not provided, it's calculated (see Parent Node Context).
        3.  **Parent Node Context:** If a `parentId` is provided in the `AddNodeInput` and `levelId` is not, the `getLevelIdForNode` helper function attempts to place the new node at `parent's level + 1` within the target hierarchy. The calculated `levelId` is then validated against the level's `allowedTypes` for the new node's type.
    *   The API will return a 400 Bad Request if the `X-Hierarchy-Id` header is missing, if any provided `hierarchyId` or `levelId` is invalid, or if a node's type is not permitted at the target level.
    *   The `getLevelIdForNode` function in `api/server.js` encapsulates the logic for determining the appropriate `level.id` when not explicitly provided by the client. It also now throws specific errors for invalid level calculations.

### Frontend Interaction

*   **`HierarchyContext` (`frontend/src/context/HierarchyContext.tsx`):**
    *   Manages the application-wide state for available hierarchies, the currently selected `hierarchyId`, and the levels of that selected hierarchy.
    *   Fetches hierarchy data from `GET /api/hierarchy` and level data using a GraphQL query.
    *   The `setHierarchyId` function updates the selected hierarchy in the context and now also automatically updates `localStorage.setItem('hierarchyId', newId)`, ensuring synchronization for `ApiService`.

*   **`ApiService` (`frontend/src/services/ApiService.ts`):**
    *   When `executeMutation` is called, it reads `hierarchyId` from `localStorage` and, if present, adds it as an `X-Hierarchy-Id` header to the request. This provides the backend with the "active hierarchy" context for its automatic assignment logic.

*   **`NodeFormModal` (`frontend/src/components/NodeFormModal.tsx`):**
    *   Allows users to select the target `Hierarchy` and `HierarchyLevel` when creating a new node.
    *   Provides default suggestions for the level (e.g., based on parent or Level 1).
    *   On submission, it passes the explicitly chosen `hierarchyId` and `levelId` to `useGraphState.addNode`.
    *   `useGraphState.addNode` then includes these explicit details in the `hierarchyAssignments` field of the `AddNodeInput` variables sent to the backend, making the UI choice the primary driver for assignment.

### Seeding

*   The `tools/seed_data.py` script demonstrates the programmatic creation of hierarchies, levels, and `HierarchyLevelType` entities using the API. It also shows how to create nodes and assign them to hierarchies, respecting the new validation rules (e.g., by passing the `X-Hierarchy-Id` header for mutations).

This multi-faceted approach allows for both explicit control over hierarchy assignments (primarily driven by the frontend UI or direct API calls) and robust server-side validation.

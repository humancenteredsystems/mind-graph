# Hierarchies in MakeItMakeSense.io

This document describes the structure, management, and usage of hierarchies within the MakeItMakeSense.io platform. Hierarchies provide a way to organize nodes into structured, multi-level categorizations, and a single node can belong to multiple hierarchies simultaneously.

## Core Schema Entities

The hierarchy system is built upon several key Dgraph schema types that define its structure and relationships:

*   **`Node`**: These are the primary content entities within the graph. Nodes can be associated with one or more hierarchies through `HierarchyAssignment` objects.
*   **`Hierarchy`**: This type represents a distinct hierarchical tree or organizational structure (e.g., "Technical Skills," "Project Categories"). Each hierarchy has a name and contains multiple levels.
*   **`HierarchyLevel`**: This type defines a specific tier or depth within a particular `Hierarchy` (e.g., "Programming Languages" as a level within "Technical Skills"). Each level has a number and an optional descriptive label. It can also (optionally) specify allowed node types.
*   **`HierarchyAssignment`**: This is the central linking type. An instance of `HierarchyAssignment` explicitly connects a `Node` to a specific `HierarchyLevel` within a particular `Hierarchy`. This record is what places a node into the hierarchical structure.

For detailed Dgraph schema definitions and GraphQL interaction patterns related to these types, please refer to the [Dgraph Schema Notes](schema_notes.md).

*(Note: The `HierarchyLevelType` feature for restricting node types at specific levels, and its backend enforcement, are areas for future enhancement.)*

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
        1.  **Explicit Assignment in Mutation:** If the `AddNodeInput` variables contain an explicit `hierarchyAssignments` object (specifying `hierarchy.id` and `level.id`), these values are used directly. This is the typical flow when adding nodes via the current frontend UI.
        2.  **`X-Hierarchy-Id` Header:** If no explicit assignment is in the variables, the API checks for an `X-Hierarchy-Id` request header to determine the target hierarchy.
        3.  **Parent Node Context:** If a `parentId` is provided in the `AddNodeInput`, the `getLevelIdForNode` helper function attempts to place the new node at `parent's level + 1` within the target hierarchy.
        4.  **Default Fallbacks:** If the hierarchy is still undetermined, it may default to the first available hierarchy. If the level is undetermined (and no parent context helps), it defaults to Level 1 of the target hierarchy.
    *   The `getLevelIdForNode` function in `api/server.js` encapsulates the logic for determining the appropriate `level.id` based on these rules when not explicitly provided.

### Frontend Interaction

*   **`HierarchyContext` (`frontend/src/context/HierarchyContext.tsx`):**
    *   Manages the application-wide state for available hierarchies, the currently selected `hierarchyId`, and the levels of that selected hierarchy.
    *   Fetches hierarchy data from `GET /api/hierarchy` and level data using a GraphQL query.
    *   The `setHierarchyId` function updates the selected hierarchy in the context. For this change to be reflected in the `X-Hierarchy-Id` header for subsequent mutations, the component invoking `setHierarchyId` should also update `localStorage.setItem('hierarchyId', newId)`.

*   **`ApiService` (`frontend/src/services/ApiService.ts`):**
    *   When `executeMutation` is called, it reads `hierarchyId` from `localStorage` and, if present, adds it as an `X-Hierarchy-Id` header to the request. This provides the backend with the "active hierarchy" context for its automatic assignment logic.

*   **`NodeFormModal` (`frontend/src/components/NodeFormModal.tsx`):**
    *   Allows users to select the target `Hierarchy` and `HierarchyLevel` when creating a new node.
    *   Provides default suggestions for the level (e.g., based on parent or Level 1).
    *   On submission, it passes the explicitly chosen `hierarchyId` and `levelId` to `useGraphState.addNode`.
    *   `useGraphState.addNode` then includes these explicit details in the `hierarchyAssignments` field of the `AddNodeInput` variables sent to the backend, making the UI choice the primary driver for assignment.

### Seeding

*   The `tools/seed_data.py` script demonstrates the programmatic creation of hierarchies and levels using the API, followed by node creation and explicit hierarchy assignments to ensure nodes are correctly placed.

This multi-faceted approach allows for both explicit control over hierarchy assignments (primarily driven by the frontend UI or direct API calls) and helpful server-side defaults or automatic placements based on context.

# Hierarchies in MakeItMakeSense.io

This document describes the structure, management, and usage of hierarchies within the MakeItMakeSense.io platform. Hierarchies provide a way to organize nodes into structured, multi-level categorizations, and a single node can belong to multiple hierarchies simultaneously.

## Core Schema Entities

The hierarchy system is built upon several key Dgraph schema types that define its structure and relationships:

*   **`Node`**: These are the primary content entities within the graph. Nodes can be associated with one or more hierarchies through `HierarchyAssignment` objects.
*   **`Hierarchy`**: This type represents a distinct hierarchical tree or organizational structure (e.g., "Technical Skills," "Project Categories"). Each hierarchy has a name and contains multiple levels.
*   **`HierarchyLevel`**: This type defines a specific tier or depth within a particular `Hierarchy` (e.g., "Programming Languages" as a level within "Technical Skills"). Each level has a number and an optional descriptive label. It can also (optionally) specify allowed node types.
*   **`HierarchyLevelType`**: Specifies which `Node` types are permitted at a given `HierarchyLevel`, controlling `allowedTypes` consumed by both backend validation and UI filtering.
*
*   **`HierarchyAssignment`**: This is the central linking type. An instance of `HierarchyAssignment` explicitly connects a `Node` to a specific `HierarchyLevel` within a particular `Hierarchy`. This record is what places a node into the hierarchical structure.

For detailed Dgraph schema definitions and GraphQL interaction patterns related to these types, please refer to the [Dgraph Schema Notes](schema-notes.md).

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
    *   The API provides RESTful endpoints (primarily under `/api/hierarchy/...`) for creating, reading, updating, and deleting `Hierarchy`, `HierarchyLevel`, and `HierarchyAssignment` entities. These are publicly accessible as hierarchies are user-managed knowledge organization tools.
    *   Refer to `docs/api-endpoints.md` for detailed endpoint specifications.

*   **Automatic Assignment during Node Creation (`POST /api/mutate` with `addNode`):**
    *   When new nodes are created via the `addNode` GraphQL mutation, the API server includes logic (implemented in `routes/graphql.ts` and `services/nodeEnrichment.ts`) to automatically create a `HierarchyAssignment`.
    *   **Processing Priority for Assignment (Current Implementation):**
        1.  **Client-Provided `hierarchyAssignments` Array (Primary):** The server first checks if the client provides a `hierarchyAssignments` array in the input. This is the standard structure sent by the frontend `NodeFormModal`. If present:
            *   Extracts `hierarchy.id` and `level.id` from the nested structure
            *   Validates the hierarchy and level IDs exist
            *   Validates the node type is allowed at the specified level
            *   Preserves the client's `hierarchyAssignments` structure in the Dgraph mutation
        2.  **Top-Level `levelId` (Compatibility):** If no `hierarchyAssignments` array is provided, checks for a top-level `levelId` property. If present:
            *   Uses the `X-Hierarchy-Id` header for the hierarchy context
            *   Validates the level ID and node type compatibility
            *   Constructs a `hierarchyAssignments` structure for Dgraph
        3.  **Parent Node Context (Calculated):** If neither `hierarchyAssignments` nor `levelId` is provided, but a `parentId` is specified:
            *   Uses `getLevelIdForNode` to calculate the appropriate level (parent's level + 1)
            *   Validates the calculated level and node type compatibility
            *   Constructs a `hierarchyAssignments` structure for Dgraph
    *   **Header Requirements:** The `X-Hierarchy-Id` header is required for `addNode` operations to provide hierarchy context for cases 2 and 3.
    *   **Validation:** All hierarchy and level IDs are validated for existence, and node types are checked against level restrictions (`allowedTypes`).
    *   **Error Handling:** Returns 400 Bad Request for missing headers, invalid IDs, or type restrictions violations.

### Frontend Interaction

*   **`HierarchyContext` (`frontend/src/context/HierarchyContext.tsx`):**
    *   Manages the application-wide state for available hierarchies, the currently selected `hierarchyId`, and the levels of that selected hierarchy.
    *   Fetches hierarchy data from `GET /api/hierarchy` and level data using a GraphQL query.
    *   The `setHierarchyId` function updates the selected hierarchy in the context and automatically updates `localStorage.setItem('hierarchyId', newId)`, ensuring synchronization for `ApiService`.

*   **`ApiService` (`frontend/src/services/ApiService.ts`):**
    *   When `executeMutation` is called, it reads `hierarchyId` from `localStorage` and, if present, adds it as an `X-Hierarchy-Id` header to the request. This provides the backend with the "active hierarchy" context for its automatic assignment logic.

*   **`NodeFormModal` (`frontend/src/components/NodeFormModal.tsx`):**
    *   Allows users to select the target `Hierarchy` and `HierarchyLevel` when creating a new node.
    *   Automatically updates available node types based on the selected level's restrictions.
    *   Synchronizes the selected type with available types when level selection changes.
    *   On submission, constructs a `hierarchyAssignments` array with the chosen `hierarchyId` and `levelId`.
    *   Passes this structure to `useGraphState.addNode`, which sends it to the backend as the primary source of hierarchy assignment information.

### Data Flow Summary

The complete node creation flow with hierarchy assignment works as follows:

1. **User Interaction:** User opens NodeFormModal and selects hierarchy, level, type, and label
2. **Frontend Validation:** Modal ensures selected type is allowed at the chosen level
3. **Form Submission:** Modal constructs `hierarchyAssignments` array and calls `useGraphState.addNode`
4. **API Request:** Frontend sends mutation with `hierarchyAssignments` structure and `X-Hierarchy-Id` header
5. **Server Processing:** Server processes the `hierarchyAssignments` array (Case 1), validates hierarchy/level/type compatibility
6. **Database Storage:** Server preserves the client's hierarchy assignment structure in the Dgraph mutation
7. **Response:** Node is created with proper hierarchy assignment

### Seeding

*   The `tools/seed_data.py` script demonstrates the programmatic creation of hierarchies, levels, and `HierarchyLevelType` entities using the API. It also shows how to create nodes and assign them to hierarchies, respecting the validation rules (e.g., by passing the `X-Hierarchy-Id` header for mutations).

This multi-faceted approach allows for both explicit control over hierarchy assignments (primarily driven by the frontend UI or direct API calls) and robust server-side validation, with the frontend-provided `hierarchyAssignments` structure taking precedence over other assignment methods.

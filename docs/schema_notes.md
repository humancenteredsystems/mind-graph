# 📄 Dgraph Schema Notes

## `@id` Directive Type Requirement (Dgraph v24.1.2)

When defining a GraphQL schema for Dgraph v24.1.2 (and related versions), fields marked with the `@id` directive **must** be explicitly typed as `String!`, `Int!`, or `Int64!`.
Using the GraphQL `ID!` type for `@id` fields will **cause schema push operations to fail internally**, even if the `/admin/schema` endpoint appears to return a success status.

> **Correct Usage Example**:
> ```graphql
> id: String! @id
> ```

Always ensure that any unique identifier fields use one of the required **concrete** types, not the abstract `ID!` type.

---

## Edge Relationship Fields (`from`, `to`) and Scalar IDs (`fromId`, `toId`)

The `Edge` type defines relationships between `Node` types using two **different mechanisms**:

| Field         | Type         | Purpose                                              |
|---------------|--------------|------------------------------------------------------|
| `from`, `to`  | `Node` object references | Real graph links for structural traversal. |
| `fromId`, `toId` | `String!` scalars | Flat text fields for simple filtering and deletion. |

### Graph Links (`from`, `to`)

- `from` and `to` are object references that establish **graph-native relationships** between Nodes.
- They enable true graph traversal in queries and mutations.
- When querying or mutating edges, you must provide subfields from the linked Node (e.g., `from { id }`, `to { id }`).

**Example Query Traversal**:
```graphql
query {
  queryEdge {
    type
    from { id label }
    to { id label }
  }
}
```

### Scalar IDs (`fromId`, `toId`)

- `fromId` and `toId` are scalar fields (`String!`) storing the UUID (`id`) of the connected nodes.
- These fields allow efficient GraphQL operations like **filtering** and **deletion** without requiring multi-hop nested queries.
- They are primarily operational fields; they do not replace the graph structure created by `from` and `to`.

**Example Simple Edge Deletion Using Scalars**:
```graphql
mutation {
  deleteEdge(filter: { fromId: { eq: "nodeA-uuid" } }) {
    numUids
  }
}
```

### Important Clarifications

- **Both** `from`/`to` and `fromId`/`toId` coexist intentionally.
- **Do not** remove `from` and `to`, as they are critical for graph traversal and internal Dgraph behavior.
- **Do not** rely solely on `fromId`/`toId`, as they are scalar helpers, not true graph connections.

---

## Multi-Hierarchy Node Structure

The graph supports **multiple concurrent hierarchies** through a relationship-based structure. This allows nodes to be organized and viewed in different structural contexts (e.g., a biological taxonomy, a project timeline, an organizational chart) simultaneously.

### Core Hierarchy Types

| Type                 | Purpose                                                                                                | Key Fields                                     |
|----------------------|--------------------------------------------------------------------------------------------------------|------------------------------------------------|
| `Hierarchy`          | Represents a named organizational structure or view (e.g., "Default Taxonomy", "Product Lineage").       | `id`, `name`, `levels`                         |
| `HierarchyLevel`     | Defines a numbered tier within a specific `Hierarchy`, optionally with a descriptive `label`.            | `id`, `hierarchy`, `levelNumber`, `label`      |
| `HierarchyLevelType` | (Optional) Specifies which `Node` types are permitted at a given `HierarchyLevel` for validation.    | `id`, `level`, `typeName`                      |
| `HierarchyAssignment`| The crucial link: assigns a specific `Node` to a particular `HierarchyLevel` within a `Hierarchy`. | `id`, `node`, `hierarchy`, `level`             |

### Node and HierarchyAssignment Relationship

- A `Node` can have multiple `HierarchyAssignment`s, meaning it can exist in several hierarchies at once, potentially at different levels in each.
- The `Node.hierarchyAssignments` field is an array of these assignments.

### Querying Nodes by Hierarchy

To retrieve nodes that are part of a specific hierarchy and at a particular level within that hierarchy, you filter by the `HierarchyAssignment`:

**Example: Get all nodes at level 2 of "hierarchy1"**
```graphql
query GetNodesInHierarchyLevel {
  queryNode(filter: {
    hierarchyAssignments: {
      hierarchy: { id: { eq: "hierarchy1" } },  # Assuming 'hierarchy1' is the ID of the Hierarchy
      level: { levelNumber: { eq: 2 } }
    }
  }) {
    id
    label
    type
    hierarchyAssignments {
      hierarchy {
        id
        name
      }
      level {
        id
        levelNumber
        label
      }
    }
  }
}
```

### Creating Nodes with Hierarchy Assignments

When creating a new `Node`, you typically also create its initial `HierarchyAssignment`(s) in the same mutation or a subsequent one.

**Example: Add a new Node and assign it to level 1 of "hierarchy1"**
```graphql
mutation AddNodeWithHierarchy {
  addNode(input: [{
    id: "newNode123",
    label: "New Concept",
    type: "Concept",
    hierarchyAssignments: [{
      hierarchy: { id: "hierarchy1" }, # Link to existing Hierarchy
      level: { id: "level1_of_hierarchy1" } # Link to existing HierarchyLevel
    }]
  }]) {
    node {
      id
      label
      hierarchyAssignments {
        id
        hierarchy { name }
        level { levelNumber }
      }
    }
  }
}
```
*Note: You would typically look up the `ID` for the `Hierarchy` and `HierarchyLevel` you want to assign to.*

### Key Constraints and Best Practices

- **Node Universality**: `Node` objects are universal. Their participation and position in different hierarchies are defined by `HierarchyAssignment`s, not by properties on the `Node` itself.
- **Edge Universality**: `Edge`s connect `Node`s directly and are not inherently part of any single hierarchy. When visualizing a specific hierarchy, edges are typically shown if both their source and target nodes are present in the current view (i.e., have assignments in the active hierarchy).
- **Context is Key**: The frontend application should maintain a "current hierarchy context" (e.g., selected by the user). Queries and data transformations for display should use this context to filter and present relevant nodes and their levels.
- **Default Assignments**: When creating a new standalone node, it should typically be assigned to a default level (e.g., level 1) in a default or currently active hierarchy.
- **Connected Node Levels**: When creating a new node connected to an existing parent node within a hierarchy, its level in that hierarchy is often inferred (e.g., parent's level + 1).

---

## Summary of Key Schema Practices

- Always use `String!`, `Int!`, or `Int64!` for fields marked with `@id`.
- Define both graph relationships (`from`, `to`) **and** scalar fields (`fromId`, `toId`) on `Edge` types.
- Use relational fields (`from`, `to`) for traversals.
- Use scalar fields (`fromId`, `toId`) for efficient filtering, especially for cascade deletions.
- Leverage `HierarchyAssignment` to manage node membership and levels across multiple hierarchies.

---

# ✅ Status

This approach ensures:
- Full graph-native traversal capabilities.
- Fast, simple GraphQL querying and mutation behavior.
- Clean separation between structural and operational concerns.
- Flexible multi-hierarchy support for diverse knowledge organization.

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

## Summary of Key Schema Practices

- Always use `String!`, `Int!`, or `Int64!` for fields marked with `@id`.
- Define both graph relationships (`from`, `to`) **and** scalar fields (`fromId`, `toId`) on `Edge` types.
- Use relational fields (`from`, `to`) for traversals.
- Use scalar fields (`fromId`, `toId`) for efficient filtering, especially for cascade deletions.

---

# ✅ Status

This approach ensures:
- Full graph-native traversal capabilities.
- Fast, simple GraphQL querying and mutation behavior.
- Clean separation between structural and operational concerns.

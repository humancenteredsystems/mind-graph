# Dgraph Schema Notes

## `@id` Directive Type Requirement (Dgraph v24.1.2)

When defining a GraphQL schema for Dgraph v24.1.2 (and potentially related versions), fields marked with the `@id` directive **must** be explicitly typed as `String!`, `Int!`, or `Int64!`. Using the standard GraphQL `ID!` type for `@id` fields will cause the schema push via the `/admin/schema` endpoint to fail internally, even though the endpoint may return a success status. Ensure unique identifier fields use one of the required concrete types (e.g., `id: String! @id`).

## Edge Relationship Fields (`from`, `to`)

The `Edge` type in the schema uses the fields `from` and `to` to represent the relationship between connected `Node` types. These fields are relationships to `Node` objects, not scalar ID fields. When querying or mutating edges, ensure you select or provide input for the related `Node`'s fields (e.g., `from { id }`, `to { id }`). This is in contrast to using scalar `fromId` and `toId` fields, which are not present in the deployed schema for relationships.

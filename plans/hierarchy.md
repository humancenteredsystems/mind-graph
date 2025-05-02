# What We Want
## Ability to implement a structured node hierarchy
    - New standalone nodes default to level 1
    - New connected nodes default to parent + 1
    - Levels, and only levels, determine the position in the hierarchy
    - Types are associated with levels, but their association is configurable as part of the graph settings.
    - Multiple types can be associated with a given level (e.g., Level 1 = Transportation, Level 2 = Car, Truck, Motorcycle)

Here is a full and well-scoped **LLM task definition document** for migrating from a **single-hierarchy model** (`Node.level`) to a **multi-hierarchy schema**, with background, purpose, and structured implementation steps.

---

````markdown
# 🧠 Task: Migrate to Robust Multi-Hierarchy Node Structure

## 🔍 Background

The current implementation of the MakeItMakeSense knowledge graph platform encodes a **single implicit hierarchy** using a `level` field on the `Node` type. While simple, this model is limiting:

- It **assumes only one hierarchy** can exist
- It couples structure directly to the node object
- It cannot support **alternate or parallel views** of knowledge (e.g., taxonomies vs manufacturers vs timelines)

We are migrating to a **multi-hierarchy architecture** that enables:
- Flexible, view-specific level assignments for each node
- Shared node usage across multiple hierarchies
- Independent labeling and validation per hierarchy
- Decoupled edge and structure logic (all edges remain global, views filter based on node assignments)

This task defines the necessary changes to eliminate the legacy `level` field and implement the new schema.

---

## 🎯 Objective

Fully remove the `Node.level` field and migrate to a **multi-hierarchy system** defined by these components:

- `Hierarchy`: named structure/view (e.g., "Transportation", "Lineage")
- `HierarchyLevel`: numbered tier in a hierarchy (e.g., 1 = root, 2 = subclass)
- `HierarchyLevelType`: valid node types per level per hierarchy
- `HierarchyAssignment`: which node is in which level of which hierarchy

---

## 🛠️ Deliverables

1. ✅ A revised `schema.graphql` file with the new multi-hierarchy structure
2. ✅ Revised graph seeding file to seed new graph with properly structured nodes
3. ✅ Refactored backend code to:
   - Use hierarchy-aware logic (queries, mutations, validations)
   - Replace any logic that directly references `Node.level`
4. ✅ Tests to ensure no regressions in graph traversal, search, or edge rendering
5. ✅ Optional: Admin interface update to allow CRUD for hierarchies, levels, and type mappings

---

## 📐 Schema (Final)

```graphql
type Node {
  id: String! @id
  label: String! @search(by: [term])
  type: String!
  status: String
  branch: String
  outgoing: [Edge] @hasInverse(field: "from")
  hierarchyAssignments: [HierarchyAssignment] @hasInverse(field: node)
}

type Edge {
  from: Node! @hasInverse(field: "outgoing")
  fromId: String! @search(by: [hash])
  to: Node
  toId: String! @search(by: [hash])
  type: String!
}

type Hierarchy {
  id: ID!
  name: String! @search(by: [exact])
  levels: [HierarchyLevel] @hasInverse(field: hierarchy)
}

type HierarchyLevel {
  id: ID!
  hierarchy: Hierarchy!
  levelNumber: Int! @search
  label: String
  allowedTypes: [HierarchyLevelType] @hasInverse(field: level)
}

type HierarchyLevelType {
  id: ID!
  level: HierarchyLevel!
  typeName: String! @search(by: [exact])
}

type HierarchyAssignment {
  id: ID!
  node: Node!
  hierarchy: Hierarchy!
  levelNumber: Int!
}
````

---

## 🧩 Migration Strategy

### Step 1: Schema Update

* Remove `level` from `Node`
* Add the `Hierarchy`, `HierarchyLevel`, etc. types

### Step 2: Default Hierarchy Ingestion

* Create a single default hierarchy (e.g., `"Legacy Hierarchy"` or `"Primary Structure"`)
* For each node with a legacy `level`, create:

  * `HierarchyAssignment` using that level value
  * If type validation is needed, generate associated `HierarchyLevelType`

### Step 3: Data Refactor

* Rewrite all GraphQL queries/mutations to:

  * Accept and return level information via `HierarchyAssignment`
  * Use filters like:

    ```graphql
    node(hierarchyAssignments: { hierarchy: "Hierarchy A", levelNumber: 2 })
    ```

### Step 4: UI and Logic Changes

* Graph viewer: determine current view (selected hierarchy) and filter nodes and edges accordingly
* Node creation:

  * Infer hierarchy context (e.g., from UI state)
  * Set level by context (standalone = 1, connected = source level + 1)
* Type validation:

  * When creating/editing a node in a hierarchy, restrict allowable types based on `HierarchyLevelType`

---

## 🧪 Test Plan

* [ ] Confirm legacy `level` field is completely removed
* [ ] Validate every node appears in exactly the same level in `"Legacy Hierarchy"` as it did under `Node.level`
* [ ] Ensure edges render as before when filtered by hierarchy assignments
* [ ] Add new hierarchy and validate it can assign different levels to the same node
* [ ] Confirm queries/mutations fail gracefully when attempting invalid assignments

---

## 🔒 Constraints

* Do **not preserve** compatibility with old `Node.level` logic
* Every node must have **at least one** `HierarchyAssignment`
* Nodes may appear in **multiple hierarchies** with different levels
* Avoid duplicating `Node` objects--structure is in the assignments

---

## ⏳ Estimated LLM Work Units

| Task                                | Est. LLM Time |
| ----------------------------------- | ------------- |
| Schema rewrite                      | 10–15 min     |
| Migration script (Dgraph mutations) | 30–45 min     |
| Codebase update for hierarchy logic | 60–90 min     |
| Unit/integration tests              | 30–45 min     |
| Optional: Admin UI for hierarchy    | 60+ min       |

---

## 🧠 Notes

This is a foundational evolution of the data model. Once complete, the platform will support:

* Multiple ways of organizing the same data
* Cleaner decoupling of semantic vs structural knowledge
* Richer visualizations and per-user perspectives

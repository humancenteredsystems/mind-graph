# MakeItMakeSense.io Graph Database Toolkit

A collection of tools for managing and interacting with the MakeItMakeSense.io Dgraph database.

## Toolkit Overview

This directory contains Python scripts and an HTML visualizer to operate on the graph:

- **drop_data.py**: Drop all data from the Dgraph database via the backend API.
- **api_push_schema.py**: Push your GraphQL schema via the backend API (supports local, remote, or both).
- **seed_data.py**: Populate the database with sample or test data.
- **query_graph.py**: Run predefined or custom GraphQL queries to test database connections.
- **export_graph.py**: Export the current graph to a JSON file for debugging or backup.
- **visualize_mermaid.html**: Load a JSON export in your browser and render it as a Mermaid diagram.

## Prerequisites

- Python 3.6+
- `requests` library (`pip install requests`)
- Backend API server running (for `drop_data.py` and `api_push_schema.py`).

## Usage Examples

### drop_data.py

Drop all data via the API:

```bash
python drop_data.py --target local --admin-api-key YOUR_ADMIN_API_KEY
```

Targets: `local`, `remote`, or `both`.

### api_push_schema.py

Push a schema file or registry schema via the API:

```bash
# Push a local schema file
python api_push_schema.py --schema ../schema.graphql --target both --api-key YOUR_ADMIN_API_KEY

# Push a schema by ID from the registry
python api_push_schema.py --schema-id default --target remote --api-key YOUR_ADMIN_API_KEY

# List available schemas in the registry
python api_push_schema.py --list --api-key YOUR_ADMIN_API_KEY
```

### seed_data.py

Populate the database with sample data:

```bash
python seed_data.py
```

Use `--data` to specify a JSON file of nodes and edges.

### query_graph.py

Run predefined queries or supply a custom query file:

```bash
python query_graph.py --query all_nodes
python query_graph.py --file custom_query.graphql
```

### export_graph.py

Export graph data to JSON:

```bash
python export_graph.py --output graph_backup.json
```

### visualize_mermaid.html

Open this file in a browser, load a JSON export, and visualize your graph.

## Extending the Toolkit

Share common logic by importing helpers from `api/utils`. Add new scripts following the existing patterns for HTTP requests or GraphQL queries.

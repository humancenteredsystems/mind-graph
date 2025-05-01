# MakeItMakeSense.io Graph Database Toolkit

A collection of tools for managing and interacting with the MakeItMakeSense.io Dgraph database via the backend API.

## Toolkit Overview

This directory contains Python scripts and an HTML visualizer to operate on the graph:

- **api_client.py**: Shared module for making authenticated requests to the backend API.
- **drop_data.py**: Drop all data from the Dgraph database via the backend API.
- **api_push_schema.py**: Push your GraphQL schema via the backend API.
- **seed_data.py**: Populate the database with sample or test data via the backend API.
- **query_graph.py**: Run predefined or custom GraphQL queries (currently direct to Dgraph, consider refactoring to use API).
- **export_graph.py**: Export the current graph to a JSON file (currently direct from Dgraph, consider refactoring to use API).

## Prerequisites

- Python 3.6+
- `requests` library (`pip install requests`)
- Backend API server running (required for `drop_data.py`, `api_push_schema.py`, and `seed_data.py`).

## Usage Examples

The API-interacting tools (`drop_data.py`, `api_push_schema.py`, `seed_data.py`) now share common arguments for specifying the API and authentication.

Common Arguments:
- `--api-base <URL>` or `-b <URL>`: Backend API base URL (default: `http://localhost:3000/api`). Can also be set via `MIMS_API_URL` environment variable.
- `--api-key <KEY>` or `-k <KEY>`: Admin API Key. Can also be set via `MIMS_ADMIN_API_KEY` environment variable.
- `--target {local,remote}` or `-t {local,remote}`: Target environment for the operation. Note that the API instance itself is configured for a specific Dgraph instance (local or remote) via its `DGRAPH_BASE_URL`. The `--target` argument in these scripts is primarily for selecting which API instance (local or remote API) to call.

### drop_data.py

Drop all data from the configured Dgraph instance via the API:

```bash
# Drop data from the local Dgraph (via local API)
python drop_data.py --target local --api-key YOUR_ADMIN_API_KEY

# Drop data from the remote Dgraph (via remote API)
python drop_data.py --target remote --api-base https://your-remote-api.onrender.com/api --api-key YOUR_ADMIN_API_KEY
```

Note: The API endpoint `/api/admin/dropAll` now drops data from the Dgraph instance configured by the API's `DGRAPH_BASE_URL`. The `--target` argument in the script determines which API instance you call.

### api_push_schema.py

Push a schema file or registry schema via the API:

```bash
# Push a local schema file to the local Dgraph (via local API)
python api_push_schema.py --schema ../schema.graphql --target local --api-key YOUR_ADMIN_API_KEY

# Push a schema by ID from the registry to the remote Dgraph (via remote API)
python api_push_schema.py --schema-id default --target remote --api-base https://your-remote-api.onrender.com/api --api-key YOUR_ADMIN_API_KEY

# List available schemas in the registry (via local API)
python api_push_schema.py --list --api-key YOUR_ADMIN_API_KEY
```

Note: The API endpoints `/api/schemas/:id/push` and `/api/admin/schema` now push schema to the Dgraph instance configured by the API's `DGRAPH_BASE_URL`. The `--target` argument in the script determines which API instance you call.

### seed_data.py

Populate the database with sample data via the API:

```bash
# Seed data to the local Dgraph (via local API)
python seed_data.py --target local --api-key YOUR_ADMIN_API_KEY

# Seed data to the remote Dgraph (via remote API)
python seed_data.py --target remote --api-base https://your-remote-api.onrender.com/api --api-key YOUR_ADMIN_API_KEY

# Use a custom data file
python seed_data.py --target local --api-key YOUR_ADMIN_API_KEY --data my_test_data.json
```

Note: The API endpoint `/api/mutate` is used for seeding data. The `--target` argument in the script determines which API instance you call.

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

For new scripts that interact with the backend API, import and use the `call_api` function from `tools/api_client.py` to handle authenticated API requests. This promotes code reuse and consistency.

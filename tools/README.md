# MakeItMakeSense.io Graph Database Toolkit

A collection of tools for managing and interacting with the MakeItMakeSense.io Dgraph database, primarily via the backend API.

## Toolkit Overview

This directory contains Python scripts and an HTML visualizer to operate on the graph:

- **`api_client.py`**: Shared Python module for making authenticated requests to the backend API. Used by other scripts.
- **`drop_data.py`**: Drops all data from the Dgraph database via the backend API.
- **`api_push_schema.py`**: Pushes your GraphQL schema (`schemas/default.graphql` or other specified files/registry IDs) to Dgraph via the backend API. This is the recommended way to update the schema.
- **`seed_data.py`**: Populates the database with sample data (nodes, edges, hierarchies, assignments) via the backend API.
- **`query_graph.py`**: Runs predefined or custom GraphQL queries. **Note:** This script currently connects *directly* to the Dgraph GraphQL endpoint, not via the backend API. Configuration for Dgraph URL might be required within the script or via environment variables it recognizes.
- **`export_graph.py`**: Exports the current graph data to a JSON file. **Note:** This script currently connects *directly* to Dgraph, not via the backend API.
- **`visualize_mermaid.html`**: A browser-based tool to load a JSON export (e.g., from `export_graph.py`) and visualize the graph using Mermaid.js.

## Prerequisites

- Python 3.7+ (Python 3.6+ was listed, but 3.7+ is a safer bet for modern practices)
- `requests` Python library: Install via `pip install requests` (preferably within a virtual environment or Conda environment).
- For tools interacting with the API (`drop_data.py`, `api_push_schema.py`, `seed_data.py`):
    - The backend API server must be running and accessible.
    - A valid Admin API Key.
- For tools interacting directly with Dgraph (`query_graph.py`, `export_graph.py`):
    - The Dgraph Alpha server must be running and its GraphQL port (usually 8080) accessible to the machine running the script.
    - These scripts might require Dgraph connection details (e.g., URL) to be configured, potentially via environment variables they define or hardcoded defaults.

## Usage Examples

The API-interacting tools (`drop_data.py`, `api_push_schema.py`, `seed_data.py`) share common arguments for specifying the API endpoint and authentication:

**Common Arguments:**
- `--api-base <URL>` or `-b <URL>`: Backend API base URL (default: `http://localhost:3000/api`). Can also be set via the `MIMS_API_URL` environment variable.
- `--api-key <KEY>` or `-k <KEY>`: Admin API Key for the backend API. Can also be set via the `MIMS_ADMIN_API_KEY` environment variable.
- `--target {local,remote}` or `-t {local,remote}`: This argument is primarily for the script's context (e.g., if you have different API instances for local and remote environments). The API service itself is configured with a specific `DGRAPH_BASE_URL` and will interact with that Dgraph instance regardless of this script's `--target` flag. The flag helps the script decide *which API URL to call*.

### `drop_data.py`

Drops all data from the Dgraph instance targeted by the configured API service.

```bash
# Example: Drop data using the local API instance
python tools/drop_data.py --api-key YOUR_ADMIN_API_KEY 
# (Assumes local API at http://localhost:3000/api)

# Example: Drop data using a remote API instance
python tools/drop_data.py --api-base https://your-remote-api.onrender.com/api --api-key YOUR_ADMIN_API_KEY
```

### `api_push_schema.py`

Pushes a schema file or a schema from the API's registry to the Dgraph instance targeted by the configured API service.

```bash
# Example: Push the default schema file using the local API
python tools/api_push_schema.py --schema schemas/default.graphql --api-key YOUR_ADMIN_API_KEY

# Example: Push a schema by ID from the registry using a remote API
python tools/api_push_schema.py --schema-id default --api-base https://your-remote-api.onrender.com/api --api-key YOUR_ADMIN_API_KEY

# Example: List available schemas in the registry via the local API
python tools/api_push_schema.py --list --api-key YOUR_ADMIN_API_KEY
```

### `seed_data.py`

Populates the database with sample data via the API.

```bash
# Example: Seed data using the local API
python tools/seed_data.py --api-key YOUR_ADMIN_API_KEY

# Example: Seed data using a remote API
python tools/seed_data.py --api-base https://your-remote-api.onrender.com/api --api-key YOUR_ADMIN_API_KEY

# Example: Use a custom data file for seeding (via local API)
python tools/seed_data.py --api-key YOUR_ADMIN_API_KEY --data path/to/my_custom_data.json
```

### `query_graph.py`

Runs GraphQL queries directly against a Dgraph instance.
(Ensure Dgraph is accessible and check script for configuration of Dgraph endpoint).

```bash
# Example: Run a predefined query named 'all_nodes' (if defined in the script)
python tools/query_graph.py --query all_nodes

# Example: Run a query from a file
python tools/query_graph.py --file path/to/your_query.graphql
```

### `export_graph.py`

Exports graph data to a JSON file directly from a Dgraph instance.
(Ensure Dgraph is accessible and check script for configuration of Dgraph endpoint).

```bash
# Example: Export data to graph_export.json
python tools/export_graph.py --output graph_export.json
```

### `visualize_mermaid.html`

1. Generate a JSON export of your graph data (e.g., using `export_graph.py`).
2. Open `tools/visualize_mermaid.html` in your web browser.
3. Use the file input to load the JSON file.
4. The graph will be rendered using Mermaid.js.

## Extending the Toolkit

For new Python scripts that need to interact with the backend API, import and use the `call_api` function from `tools/api_client.py`. This helps maintain consistency in how API requests are made and authenticated. Consider adopting command-line arguments (`--api-base`, `--api-key`) and environment variable support (`MIMS_API_URL`, `MIMS_ADMIN_API_KEY`) for configuration.

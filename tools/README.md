# MakeItMakeSense.io Graph Database Toolkit

A collection of tools for working with the MakeItMakeSense.io Dgraph database.

## Overview

This toolkit provides simple utilities for managing and interacting with the graph database:

- `drop_data.py`: Drop all data from the Dgraph database
- `push_schema.py`: Push your schema.graphql to the Dgraph admin endpoint
- `seed_graph.py`: Add test data via GraphQL mutations
- `query_graph.py`: Run simple queries to test connections
- `export_graph.py`: Export current graph to JSON for debugging or backup
- `visualize_mermaid.html`: Visualize graph data in a browser using Mermaid diagrams

All tools interact with the Dgraph database and are designed to work with a local Dgraph instance running in Docker.

## Prerequisites

- Python 3.6+
- `requests` library (`pip install requests`)
- Running Dgraph instance (see docker-compose.yml in the root directory)

## Usage

### push_schema.py

Push a GraphQL schema directly to local Dgraph:

```bash
python push_schema.py --schema ../schema.graphql
```

Options:
- `--schema`, `-s`: Path to the schema file (default: ../schema.graphql)
- `--endpoint`, `-e`: Dgraph admin schema endpoint (default: http://localhost:8080/admin/schema)

### api_push_schema.py

Push a GraphQL schema via the API (supports both local and remote Dgraph instances):

```bash
# Set your admin API key
export MIMS_ADMIN_API_KEY=your_secure_key

# Push to local Dgraph
python api_push_schema.py --target local

# Push to remote Dgraph
python api_push_schema.py --target remote

# Push to both local and remote
python api_push_schema.py --target both
```

Options:
- `--schema`, `-s`: Path to the schema file (default: ../schema.graphql)
- `--target`, `-t`: Target environment(s) to push to (choices: local, remote, both; default: local)
- `--api-endpoint`, `-e`: API endpoint URL (default: from MIMS_API_URL env var or http://localhost:3000/api/admin/schema)
- `--api-key`, `-k`: Admin API Key (default: from MIMS_ADMIN_API_KEY environment variable)

### seed_graph.py

Add test data to the graph database:

```bash
python seed_graph.py
```

Options:
- `--data`, `-d`: Path to JSON file with test data (default: use built-in test data)
- `--endpoint`, `-e`: Dgraph GraphQL endpoint (default: http://localhost:8080/graphql)

Example test data format:

```json
{
  "nodes": [
    {"id": "node1", "label": "Concept 1", "type": "concept", "level": 1, "status": "approved", "branch": "main"},
    {"id": "node2", "label": "Concept 2", "type": "concept", "level": 1, "status": "approved", "branch": "main"}
  ],
  "edges": [
    {"from": "node1", "fromId": "node1", "to": "node2", "toId": "node2", "type": "related"}
  ]
}
```

### query_graph.py

Run GraphQL queries against the database:

```bash
python query_graph.py --query all_nodes
```

Options:
- `--query`, `-q`: Predefined query to run (choices: all_nodes, nodes_by_type, node_connections, node_with_depth)
- `--file`, `-f`: Path to a file containing a custom GraphQL query
- `--variables`, `-v`: JSON string or path to JSON file with query variables
- `--endpoint`, `-e`: Dgraph GraphQL endpoint (default: http://localhost:8080/graphql)
- `--output`, `-o`: Path to save the query result (default: print to stdout)

Example with variables:

```bash
python query_graph.py --query nodes_by_type --variables '{"type": "concept"}'
```

### dump_graph.py

Export the graph data to a JSON file:

```bash
python dump_graph.py --output graph_backup.json
```

Options:
- `--node`, `-n`: Export a specific node and its connections (by ID)
- `--depth`, `-d`: Recursion depth for node connections (default: 3)
- `--endpoint`, `-e`: Dgraph GraphQL endpoint (default: http://localhost:8080/graphql)
- `--output`, `-o`: Output file path (default: graph_export_TIMESTAMP.json)
- `--raw`: Export raw GraphQL response without processing

Example exporting a specific node:

```bash
python dump_graph.py --node node1 --depth 2
```

## Common Workflow

1. Start the Dgraph containers:
   ```bash
   docker-compose up -d
   ```

2. Push the schema:
   ```bash
   cd tools
   python push_schema.py
   ```

3. Seed the database with test data:
   ```bash
   python seed_graph.py
   ```

4. Query the data:
   ```bash
   python query_graph.py --query all_nodes
   ```

5. Export the data:
   ```bash
   python dump_graph.py
   ```

## Extending the Toolkit

The toolkit is designed to be modular and extensible. Common functionality is in the `utils.py` module, which can be imported by new tools.

## Graph Visualization

The toolkit includes a lightweight browser-based graph visualizer:

```bash
# First, export your graph data
python dump_graph.py --output graph_data.json

# Then open the visualizer in your browser
# (You can simply double-click the HTML file)
open visualize_mermaid.html
```

For quick testing, you can use the included sample data:

```bash
# Open the visualizer and load the sample data
open visualize_mermaid.html
# Then select 'sample_graph.json' when prompted
```

The visualizer features:
- Simple file input to load JSON data
- Mermaid-based graph rendering
- Multiple layout options (top-down, left-right, etc.)
- Color-coded nodes based on node type
- No server required - works entirely in the browser

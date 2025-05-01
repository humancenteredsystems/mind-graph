# Dgraph Connectivity Issues - Resolution Summary

## Problem
The API server was experiencing persistent hangs when attempting to:
1. Push schemas to Dgraph via the `/api/admin/schema` endpoint
2. Test connectivity with the `/api/debug/dgraph` endpoint
3. Send data via Python scripts that relied on these endpoints

## Root Causes

We identified two primary issues:

### 1. Incorrect HTTP Method for Dgraph Admin API

Dgraph's admin endpoints require specific HTTP methods and content types:
- `/admin/schema` endpoint expects POST requests with `Content-Type: application/graphql`
- Using GET requests resulted in a "Invalid method" error (400 Bad Request)

The API server was attempting to use GET requests in the debug endpoint, which caused errors when communicating with Dgraph.

### 2. Python Import Path Issues

Python scripts in the `tools/` directory couldn't find the `tools` module when run from certain directories, resulting in:
```
ModuleNotFoundError: No module named 'tools'
```

## Fixes Implemented

### 1. Dgraph Communication Fix

Modified `api/server.js` to use POST instead of GET for the Dgraph admin schema endpoint in the debug endpoint:

```javascript
// Before:
const adminRes = await axios.get(adminSchemaUrl);

// After:
const adminRes = await axios.post(
  adminSchemaUrl,
  "# Empty schema for testing connectivity",
  { headers: { 'Content-Type': 'application/graphql' } }
);
```

This fix ensures the correct HTTP method and content type are used when communicating with Dgraph's admin API.

### 2. Python Script Imports Fix

Added code to each Python script to append the parent directory to Python's path before imports:

```python
# Add the parent directory to the Python path to be able to import tools
import os
import sys
sys.path.append(os.path.join(os.path.dirname(__file__), '..'))
from tools.api_client import call_api
```

This fix was added to:
- `tools/api_push_schema.py`
- `tools/test_dgraph_connection.py`
- `tools/drop_data.py`
- `tools/seed_data.py`

### 3. Seed Data Schema Alignment

Updated the test data in `tools/seed_data.py` to match the fields defined in the schema being used:

```python
# Updated to match simple.graphql schema
DEFAULT_TEST_DATA = {
    "nodes": [
        {"id": "node1", "label": "Concept 1", "type": "concept", "description": "First test concept"},
        # ... other nodes
    ],
    "edges": [
        {"from": {"id": "node1"}, "to": {"id": "node2"}, "type": "related"},
        # ... other edges
    ]
}
```

Also updated the GraphQL mutation templates to match the schema structure.

## Documentation

Added a new troubleshooting section to the API documentation (`docs/api_endpoints.md`) that explains:
- Common connectivity issues with Dgraph
- The required HTTP methods and content types
- How to fix Python import issues
- Debugging techniques, including direct curl testing

## Verification

All fixes were tested and confirmed to be working:
1. The debug endpoint now successfully connects to Dgraph
2. Schema push operations complete successfully
3. Data seeding operations complete successfully

## Future Considerations

1. Improve error handling in the API server when communicating with Dgraph
2. Consider using a more consistent approach for Python module imports
3. Ensure schemas and utility scripts are kept in sync to avoid field mismatch errors
4. Add schema validation before pushing to Dgraph

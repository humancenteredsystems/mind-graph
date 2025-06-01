---
sidebar_position: 3
---

# Tools Library Reference

Shared utilities for all MIMS-Graph tools to reduce duplication and improve maintainability.

## Overview

This library consolidates common functionality from multiple tools into a single, well-tested codebase:

- **API Client**: Enhanced HTTP client with tenant support and proper error handling
- **Dgraph Operations**: Consolidated data clearing, schema, and administrative operations  
- **Tenant Utilities**: Centralized tenant context handling and validation
- **Base Tool Classes**: Standardized argument parsing, error handling, and setup
- **Custom Exceptions**: Proper error hierarchy for different failure modes

## Quick Start

```python
from tools.lib import APIClient, DgraphOperations, TenantUtils

# Create API client with tenant context
client = APIClient(tenant_id="test-tenant")

# Perform Dgraph operations
ops = DgraphOperations(client, tenant_id="test-tenant")
ops.clear_namespace_data()  # Safe namespace-scoped deletion

# Tenant utilities
utils = TenantUtils(client)
if utils.tenant_exists("test-tenant"):
    namespace = utils.get_tenant_namespace("test-tenant")
    print(f"Tenant namespace: {namespace}")
```

## Components

### APIClient

Enhanced HTTP client that replaces duplicate request handling across tools.

**Features:**
- Automatic tenant context headers (`X-Tenant-Id`)
- Proper error handling with custom exceptions
- Smart API base URL resolution from environment variables
- Session management with connection pooling
- GraphQL-specific error detection

**Usage:**
```python
from tools.lib import APIClient

client = APIClient(
    api_base="http://localhost:3000/api",
    api_key="your-api-key",
    tenant_id="test-tenant"
)

# Query with tenant context
result = client.query("{ queryNode { id label } }")

# Mutation with tenant context  
result = client.mutate("mutation { addNode(input: {...}) { node { id } } }")
```

### DgraphOperations

Consolidates duplicate data clearing and schema operations from multiple tools.

**Features:**
- Safe namespace-scoped data deletion (consolidates from `seed_data.py` and `drop_data.py`)
- DropAll operations with safety checks and namespace confirmation
- Schema pushing with tenant context
- Batch processing for large datasets
- Progress tracking and status reporting

**Usage:**
```python
from tools.lib import DgraphOperations

ops = DgraphOperations(tenant_id="test-tenant")

# Safe namespace clearing (recommended)
ops.clear_namespace_data()

# DropAll with safety checks (dangerous!)
ops.drop_all_data(
    target="remote",
    confirm_namespace="0x1"  # Required for safety
)

# Schema operations
ops.push_schema(schema_file="schemas/default.graphql")
ops.wait_for_schema_processing()
```

### TenantUtils

Centralized tenant context handling and validation.

**Features:**
- Tenant ID validation
- Namespace mapping (removes hardcoded mappings from tools)
- System capability detection (OSS vs Enterprise)
- Tenant existence checking
- Helper functions for tenant classification

**Usage:**
```python
from tools.lib import TenantUtils

utils = TenantUtils()

# Validate tenant
utils.validate_tenant_id("test-tenant")  # Raises ValidationError if invalid

# Get namespace mapping
namespace = utils.get_tenant_namespace("test-tenant")  # Returns "0x1"

# Check capabilities
caps = utils.get_system_capabilities()
if caps["namespaces_supported"]:
    print("Multi-tenant mode enabled")
```

### BaseTool Classes

Standardized base classes for creating new tools.

**Features:**
- Common argument parsing (`--tenant-id`, `--api-key`, `--verbose`, etc.)
- Automatic setup of API client and utilities
- Consistent error handling and logging
- Tenant validation and existence checking
- Safety confirmations for production tenants

**Usage:**
```python
from tools.lib import BaseTool

class MyTool(BaseTool):
    def __init__(self):
        super().__init__("My custom tool")
    
    def add_tool_arguments(self, parser):
        parser.add_argument("--my-option", help="Tool-specific option")
    
    def execute(self):
        # Tool logic here
        self.info(f"Running for tenant: {self.args.tenant_id}")
        
        # API client and utilities are already set up
        result = self.api_client.query("{ queryNode { id } }")
        return 0  # Success

if __name__ == "__main__":
    tool = MyTool()
    exit_code = tool.run()
    sys.exit(exit_code)
```

### Error Handling

Custom exception hierarchy for proper error handling:

```python
from tools.lib.errors import (
    TenantNotFoundError, 
    NamespaceError, 
    SchemaError,
    APIError
)

try:
    ops.clear_namespace_data("nonexistent-tenant")
except TenantNotFoundError as e:
    print(f"Tenant not found: {e.tenant_id}")
except NamespaceError as e:
    print(f"Namespace operation failed: {e}")
```

## Migration Guide

### From Old API Client

**Before:**
```python
from tools.api_client import call_api

response = call_api(api_base, "/query", api_key, method="POST", 
                   payload=query, extra_headers={"X-Tenant-Id": tenant_id})
if response["success"]:
    data = response["data"]
```

**After:**
```python
from tools.lib import APIClient

client = APIClient(api_base, api_key, tenant_id=tenant_id)
data = client.query(query["query"])  # Raises exception on error
```

### From Manual Namespace Clearing

**Before (duplicated in multiple files):**
```python
# 100+ lines of duplicate code in each tool
def clear_namespace_data_via_api(api_base_url, tenant_id, admin_api_key):
    # Query nodes...
    # Delete edges in batches...
    # Delete nodes in batches...
```

**After:**
```python
from tools.lib import DgraphOperations

ops = DgraphOperations(tenant_id=tenant_id)
ops.clear_namespace_data()  # Single line, consistent implementation
```

## Testing

Run the test suite to verify the library works correctly:

```bash
cd tools/lib
python test_utils.py
```

Expected output:
```
==================================================
TESTING MIMS-GRAPH SHARED LIBRARY
==================================================
🧪 Testing imports...
  ✅ All imports successful

🧪 Testing API client...
  ✅ API client initialized: http://localhost:3000/api
  ✅ Tenant context setting works
  ✅ Tenant context clearing works

🧪 Testing tenant utilities...
  ✅ Valid tenant ID accepted
  ✅ Invalid tenant ID properly rejected
  ✅ Standard tenant mapping works
  ✅ Tenant classification works

🧪 Testing Dgraph operations...
  ✅ DgraphOperations initialized
  ✅ Tenant context setting works
  ✅ Tenant context clearing works

==================================================
RESULTS: 4/4 tests passed
==================================================
```

## Benefits

1. **Reduced Code Duplication**: Eliminates ~40% of duplicate code across tools
2. **Consistent Behavior**: All tools work the same way
3. **Better Error Handling**: Proper exception hierarchy with helpful messages
4. **Easier Testing**: Test shared library once instead of testing each tool
5. **Simplified Maintenance**: Fix bugs in one place
6. **Safer Operations**: Built-in safety checks and confirmations
7. **Better Documentation**: Clear API with type hints and docstrings

## Environment Variables

The library automatically detects configuration from environment variables:

- `MIMS_API_URL` or `MIMS_ADMIN_API_KEY` - API configuration
- `DGRAPH_BASE_URL` - Fallback for API base URL derivation

## Development Phases

### Current State: Phase 1 (Complete)
The shared library provides core functionality with consistent interfaces.

### Future Development
- **Phase 2**: Migrate existing tools to use the shared library
- **Phase 3**: Add progress bars, better logging, and enhanced features
- **Phase 4**: Create comprehensive documentation and examples

## Safety Features

:::warning Production Safety

The library includes built-in safety features:

- Namespace confirmation for destructive operations
- Tenant validation before operations
- Production environment detection
- Confirmation prompts for dangerous operations

Always verify your target environment before running destructive operations.

:::

## Support

For issues with the shared library:

1. Run the test suite to verify basic functionality
2. Check environment variables are set correctly  
3. Ensure API server is running and accessible
4. Review error messages for specific guidance

## Next Steps

- Review the [Tools Overview](./tools-overview.md) for individual tool usage
- Check the [API Reference](./api-endpoints.md) for available backend endpoints
- See the [Setup Guide](./setup-guide.md) for environment configuration

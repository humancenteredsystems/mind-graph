# Dgraph Connectivity Troubleshooting Guide

This document provides solutions to common connectivity issues between the API server and Dgraph.

## Common Issues

### API Hangs When Pushing Schema or Testing Connectivity

**Issue:** The API server hangs or times out when attempting to push a schema to Dgraph or when testing connectivity via the `/api/debug/dgraph` endpoint.

**Root Cause:** Dgraph's admin endpoints expect specific HTTP methods with specific content types:
- `/admin/schema` endpoint requires POST requests with `Content-Type: application/graphql`
- Using GET requests to these endpoints results in a "Invalid method" error (400 Bad Request)

**Solution:**
1. Always use POST for schema operations with Dgraph
2. Set the correct content type header:
   ```javascript
   // Correct way to push a schema to Dgraph
   axios.post(
     'http://localhost:8080/admin/schema',
     schemaContent,  // Plain text schema, not JSON
     { headers: { 'Content-Type': 'application/graphql' } }
   )
   ```

### Python Scripts Import Issues

**Issue:** Python scripts in the tools directory may fail with `ModuleNotFoundError: No module named 'tools'` when running from different directories.

**Solution:** Add the project root directory to Python's path before imports:
```python
import os
import sys

# Add the parent directory to the Python path to be able to import tools
sys.path.append(os.path.join(os.path.dirname(__file__), '..'))
from tools.api_client import call_api
```

## Debugging Techniques

1. **Direct Dgraph Testing:**
   To verify if Dgraph itself is accessible and responding correctly:
   ```bash
   curl -X POST -H "Content-Type: application/graphql" -d "type Test { id: ID!, name: String! }" http://localhost:8080/admin/schema
   ```

2. **API Server Debug Endpoint:**
   Use the `/api/debug/dgraph` endpoint to check DNS resolution, HTTP connectivity, and GraphQL introspection:
   ```bash
   curl http://localhost:3000/api/debug/dgraph
   ```

3. **Check Docker Container Status:**
   If Dgraph is running in Docker, verify container health:
   ```bash
   docker-compose ps
   docker-compose logs dgraph-alpha
   ```

## Environment Configuration

The API server uses environment variables to configure Dgraph connectivity:

- `DGRAPH_BASE_URL`: Base URL for the Dgraph instance (e.g., `http://localhost:8080`). The API derives other URLs from this.
- `ADMIN_API_KEY`: Authentication key for admin endpoints.

Make sure these are properly configured in `.env` for local development or in deployment environment.

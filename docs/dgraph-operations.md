# Dgraph Operations Guide

This comprehensive guide covers Dgraph connectivity, troubleshooting, and critical operational considerations for the MakeItMakeSense.io platform.

## Table of Contents
- [Connectivity Troubleshooting](#connectivity-troubleshooting)
- [Critical Multi-Tenant Limitations](#critical-multi-tenant-limitations)
- [Environment Configuration](#environment-configuration)
- [Debugging Techniques](#debugging-techniques)
- [Safety Guidelines](#safety-guidelines)

---

## Connectivity Troubleshooting

### Common Issues

#### API Hangs When Pushing Schema or Testing Connectivity

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

#### Python Scripts Import Issues

**Issue:** Python scripts in the tools directory may fail with `ModuleNotFoundError: No module named 'tools'` when running from different directories.

**Solution:** Add the project root directory to Python's path before imports:
```python
import os
import sys

# Add the parent directory to the Python path to be able to import tools
sys.path.append(os.path.join(os.path.dirname(__file__), '..'))
from tools.api_client import call_api
```

---

## Critical Multi-Tenant Limitations

### Dgraph dropAll Namespace Isolation Issue

**Date:** 2025-05-26  
**Status:** Critical Issue Identified & Workarounds Implemented  
**Severity:** High - Affects Multi-Tenant Data Safety

#### Issue Summary

Dgraph Enterprise's `drop_all` operation **affects ALL namespaces in the cluster**, even when correct namespace parameters are provided. This violates the expected namespace isolation behavior and poses a significant risk in multi-tenant environments.

#### Technical Details

**Expected Behavior:**
```bash
# Should only affect namespace 0x1
curl -X POST "http://localhost:8080/alter?namespace=0x1" \
  -H "Content-Type: application/json" \
  -d '{"drop_all": true}'
```

**Actual Behavior:**
- The above request clears **ALL namespaces** (0x0, 0x1, 0x2, etc.)
- Namespace parameter is ignored for `drop_all` operations
- This affects the entire cluster regardless of namespace specification

**Verification:**
Comprehensive testing confirms:
1. Both namespaces (0x0 and 0x1) populated with different data
2. dropAll called on test-tenant (0x1) with correct namespace parameter
3. **Result**: Both namespaces cleared, confirming cluster-wide impact

Server logs show correct URLs being called:
```
[DGRAPH ADMIN REQUEST] Sending request to http://localhost:8080/alter?namespace=0x1 (namespace: 0x1)
```

But the operation still affects all namespaces.

#### Workarounds Implemented

**1. Default Safe Behavior**
All data management scripts now use namespace-scoped deletion by default:

**seed_data.py**:
```bash
# Safe: Uses namespace-scoped deletion (default)
python tools/seed_data.py -k $ADMIN_KEY -t test-tenant

# Dangerous: Uses cluster-wide dropAll (explicit flag required)
python tools/seed_data.py -k $ADMIN_KEY --enable-drop-all
```

**drop_data.py**:
```bash
# Safe: Uses namespace-scoped deletion (default)
python tools/drop_data.py -t remote --tenant-id test-tenant --admin-api-key $ADMIN_KEY

# Dangerous: Uses cluster-wide dropAll (explicit flag + confirmation required)
python tools/drop_data.py -t remote --enable-drop-all --confirm-namespace 0x1 --admin-api-key $ADMIN_KEY
```

**2. Namespace-Scoped Deletion Function**
Implemented `clear_namespace_data()` function that:
- Queries all nodes and edges within the target namespace
- Deletes edges first (avoiding referential integrity issues)
- Deletes nodes in batches
- Provides detailed logging and progress tracking
- **Respects namespace boundaries completely**

**3. Enhanced Safety Measures**
- **Namespace Confirmation Required**: Multi-tenant dropAll operations require explicit namespace confirmation
- **Capability Detection**: Auto-detects Enterprise vs OSS mode
- **Prominent Warnings**: Clear messaging about operation scope
- **Audit Logging**: Detailed logs for all admin operations

**4. API Safety Implementation**
Backend API includes:
- Namespace confirmation validation
- Enhanced logging for audit trails
- Safety checks for multi-tenant operations
- Clear error messages for missing confirmations

#### Usage Guidelines

**✅ Safe Operations (Recommended)**
```bash
# Seed data safely (namespace-scoped)
python tools/seed_data.py -k $ADMIN_KEY -t test-tenant

# Drop data safely (namespace-scoped)
python tools/drop_data.py -t remote --tenant-id test-tenant --admin-api-key $ADMIN_KEY

# API calls with tenant context
curl -X POST http://localhost:3000/api/query \
  -H "X-Tenant-Id: test-tenant" \
  -d '{"query": "{ queryNode { id } }"}'
```

**⚠️ Dangerous Operations (Use with Extreme Caution)**
```bash
# Cluster-wide dropAll (affects ALL namespaces)
python tools/seed_data.py -k $ADMIN_KEY --enable-drop-all

# API dropAll with confirmation
curl -X POST http://localhost:3000/api/admin/dropAll \
  -H "X-Tenant-Id: test-tenant" \
  -H "X-Admin-API-Key: $ADMIN_KEY" \
  -d '{"target": "remote", "confirmNamespace": "0x1"}'
```

---

## Environment Configuration

The API server uses environment variables to configure Dgraph connectivity:

- `DGRAPH_BASE_URL`: Base URL for the Dgraph instance (e.g., `http://localhost:8080`). The API derives other URLs from this.
- `ADMIN_API_KEY`: Authentication key for admin endpoints.
- `ENABLE_MULTI_TENANT`: Enable multi-tenant features (requires Dgraph Enterprise)
- `DGRAPH_NAMESPACE_DEFAULT`: Default namespace (typically `0x0`)
- `DGRAPH_NAMESPACE_TEST`: Test tenant namespace (typically `0x1`)

Make sure these are properly configured in `.env` for local development or in deployment environment.

---

## Debugging Techniques

### 1. Direct Dgraph Testing
To verify if Dgraph itself is accessible and responding correctly:
```bash
curl -X POST -H "Content-Type: application/graphql" -d "type Test { id: ID!, name: String! }" http://localhost:8080/admin/schema
```

### 2. API Server Debug Endpoint
Use the `/api/debug/dgraph` endpoint to check DNS resolution, HTTP connectivity, and GraphQL introspection:
```bash
curl http://localhost:3000/api/debug/dgraph
```

### 3. Check Docker Container Status
If Dgraph is running in Docker, verify container health:
```bash
docker-compose ps
docker-compose logs dgraph-alpha
```

### 4. Multi-Tenant Capability Testing
Check if Enterprise features are detected:
```bash
curl https://your-api-url.onrender.com/api/debug/dgraph
```

### 5. Namespace Configuration Verification
Verify namespace environment variables:
```bash
curl https://your-api-url.onrender.com/api/system/config
```

### 6. Tenant Operations Testing
Test tenant creation:
```bash
curl -X POST https://your-api-url.onrender.com/api/tenant/test/init
```

---

## Safety Guidelines

### Immediate Actions
1. **Always use namespace-scoped operations** in multi-tenant environments
2. **Avoid dropAll** unless intentionally clearing the entire cluster
3. **Test thoroughly** when implementing new admin operations
4. **Monitor logs** for unexpected cross-namespace effects

### Long-term Actions
1. **Contact Dgraph Support** to report the dropAll behavior
2. **Monitor Dgraph releases** for fixes to this issue
3. **Consider alternative approaches** for cluster-wide operations
4. **Implement additional safeguards** for admin operations

### Risk Assessment

**Risk Level: HIGH**
- **Data Loss Potential**: Complete cluster data loss
- **Tenant Isolation**: Violated by admin operations
- **Production Impact**: Could affect all tenants simultaneously

**Mitigation Status: IMPLEMENTED**
- ✅ Default safe behavior implemented
- ✅ Workarounds provide full functionality
- ✅ Safety measures prevent accidental data loss
- ✅ Clear documentation and warnings in place

### Testing and Validation

**Validation Scripts:**
- `tools/test_namespace_safety.py` - Tests safety confirmation mechanisms
- `tools/test_namespace_isolation_comprehensive.py` - Comprehensive isolation testing

**Test Results:**
- ✅ Namespace-scoped deletion works correctly
- ✅ Safety measures prevent accidental cluster-wide operations
- ✅ Enterprise capability detection functions properly
- ❌ Dgraph dropAll still affects all namespaces (confirmed limitation)

---

## Conclusion

While Dgraph's `drop_all` operation has a significant limitation in multi-tenant environments, comprehensive workarounds have been implemented to ensure safe operation. The system now defaults to safe, namespace-scoped operations while still providing access to cluster-wide functionality when explicitly requested.

**Key Takeaway**: Always use the implemented safety measures and avoid direct `drop_all` operations in multi-tenant environments unless absolutely necessary and with full understanding of the cluster-wide impact.

For additional troubleshooting and multi-tenant implementation details, see the [Multi-Tenant Implementation Guide](multi-tenant-implementation.md) and [Testing Guide](testing-guide.md).

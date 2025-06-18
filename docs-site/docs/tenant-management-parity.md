# Tenant Management Parity: OSS vs Enterprise

## Overview

This document describes the implementation of tenant management parity between Dgraph OSS (single-tenant) and Dgraph Enterprise (multi-tenant) modes in the Admin Tools interface.

## Problem Statement

Previously, the Admin Tools modal displayed "Tenant management requires Dgraph Enterprise" for OSS mode, completely hiding all tenant management operations. However, even in OSS mode, there is still a default tenant (namespace 0x0) that needs management capabilities.

## Solution

### Frontend Changes

Updated `frontend/src/components/AdminModal.tsx` to provide feature parity:

#### Core Operations (Available in Both Modes)
- ✅ **Clear Data**: Safe namespace-scoped deletion of nodes and edges
- ✅ **Clear Schema**: Push minimal schema to reset type definitions
- ✅ **Push Schema**: Deploy fresh default schema
- ✅ **Seed Data**: Populate with hierarchy and sample data
- ✅ **View Status**: Tenant health, node counts, and schema information
- ✅ **Schema Inspection**: View and copy schema content

#### Enterprise-Only Operations
- ❌ **Create Tenant**: Only available in multi-tenant mode
- ❌ **Delete Tenant**: Only available in multi-tenant mode
- ❌ **Reset Tenant**: Only available in multi-tenant mode (except default)

### UI Improvements

#### Before
```
Mode: Single-tenant (Dgraph OSS) • Tenant management requires Dgraph Enterprise
[No action buttons visible]
```

#### After
```
Mode: Single-tenant (Dgraph OSS) • Creating additional tenants requires Dgraph Enterprise
[Clear Data] [Clear Schema] [Push Schema] [Seed Data] [View Schema]
```

### Smart Button States

Buttons are now intelligently disabled based on tenant health:
- **Accessible tenants**: All core operations available
- **Not-accessible tenants**: Buttons disabled with helpful tooltips
- **Enterprise-only operations**: Only shown in multi-tenant mode

## Backend Support

### Backend Changes Required

Updated `api/utils/namespaceValidator.ts` to allow default namespace operations in OSS mode:

#### Key Fix: Default Namespace Exception
The namespace validator was blocking ALL namespace operations in OSS mode, including operations on the default namespace (`0x0`). The fix adds special handling:

```typescript
// Allow operations on default namespace (0x0) in OSS mode
// This enables core tenant operations without requiring Enterprise
if (namespace === '0x0' || namespace === 'default') {
  console.log(`[NAMESPACE_VALIDATOR] Allowing ${operationName} on default namespace ${namespace} (OSS compatible)`);
  return fn(...args);
}

// For non-default namespaces, require multi-tenant support
requiresMultiTenant(operationName);
```

#### Functions Updated
- `withNamespaceValidation()` - General namespace validation wrapper
- `withNamespaceValidationAt()` - Parameter-specific validation wrapper  
- `withNamespaceValidationConstructor()` - Constructor validation wrapper
- `validateNamespaceUrl()` - URL parameter validation
- `validateNamespaceParam()` - Direct parameter validation

### TenantManager Capabilities
- **Health checking**: Properly detects OSS vs Enterprise capabilities
- **Default tenant operations**: All core operations work with namespace 0x0
- **Safety checks**: Prevents unsafe operations on inaccessible namespaces

### API Endpoints
All admin endpoints now support both modes:
- `/api/admin/tenant/clear-data` - Namespace-scoped data deletion
- `/api/admin/tenant/clear-schema` - Schema reset operations
- `/api/admin/schema` - Schema deployment with tenant context
- `/api/admin/tenant/seed` - Data seeding operations

## Benefits

### For OSS Users
- **Full tenant management**: Can manage their default tenant effectively
- **Clear messaging**: Understands what requires Enterprise vs what's available
- **Consistent experience**: Same interface patterns as Enterprise mode

### For Enterprise Users
- **No changes**: Existing functionality preserved exactly
- **Enhanced clarity**: Better distinction between core and Enterprise-only features

### For Developers
- **Unified codebase**: Single interface handles both modes gracefully
- **Reduced complexity**: No need for separate OSS/Enterprise UI paths

## Implementation Details

### Conditional Rendering Logic
```typescript
// Core operations - always available for accessible tenants
<button
  disabled={tenant.health === 'not-accessible'}
  onClick={() => clearTenantData(tenant.tenantId)}
>
  Clear Data
</button>

// Enterprise-only operations
{isMultiTenantMode && tenant.tenantId !== 'default' && (
  <button onClick={() => deleteTenant(tenant.tenantId)}>
    Delete
  </button>
)}
```

### Health-Based Disabling
Buttons automatically disable for tenants that are not accessible (e.g., non-default namespaces in OSS mode), with appropriate tooltips explaining why.

## Testing

The implementation maintains backward compatibility and doesn't break existing functionality:
- ✅ Frontend builds successfully
- ✅ TenantManager health checks pass
- ✅ Core tenant operations work in both modes
- ✅ Enterprise-only features remain restricted appropriately

## Future Enhancements

Potential improvements for future development:
1. **Tenant creation wizard**: Guided setup for new Enterprise tenants
2. **Bulk operations**: Multi-tenant operations for Enterprise mode
3. **Tenant templates**: Pre-configured tenant setups
4. **Resource monitoring**: Per-tenant usage statistics

## Conclusion

This implementation successfully brings parity to tenant management operations while maintaining clear distinctions between OSS and Enterprise capabilities. OSS users can now effectively manage their default tenant, while Enterprise users retain all existing functionality with improved clarity about feature availability.

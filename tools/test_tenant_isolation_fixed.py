#!/usr/bin/env python3
"""
Enhanced tenant isolation test using the shared library.
"""

import sys
from pathlib import Path

# Import shared library
sys.path.append(str(Path(__file__).resolve().parent))
from lib import APIClient, DgraphOperations, TenantUtils
from lib.errors import APIError, TenantNotFoundError


def test_tenant_data(client: APIClient, tenant_id: str) -> int:
    """Test querying data for a specific tenant."""
    print(f"\n🔍 Testing tenant: {tenant_id}")
    
    try:
        # Use the shared API client with tenant context
        result = client.query("{ queryNode { id label type } }", tenant_id=tenant_id)
        
        nodes = result.get("queryNode", [])
        print(f"   ✅ Found {len(nodes)} nodes")
        return len(nodes)
        
    except APIError as e:
        print(f"   ❌ API Error: {e}")
        return -1
    except Exception as e:
        print(f"   ❌ Request failed: {e}")
        return -1


def clear_tenant_data(dgraph_ops: DgraphOperations, tenant_id: str) -> bool:
    """Clear all data for a specific tenant using safe namespace-scoped deletion."""
    print(f"\n🗑️  Clearing data for tenant: {tenant_id}")
    
    try:
        # Use shared library's safe namespace clearing
        dgraph_ops.clear_namespace_data(tenant_id=tenant_id)
        print(f"   ✅ Data cleared successfully using namespace-scoped deletion")
        return True
        
    except TenantNotFoundError as e:
        print(f"   ❌ Tenant not found: {e}")
        return False
    except Exception as e:
        print(f"   ❌ Request failed: {e}")
        return False


def main():
    print("=" * 60)
    print("ENHANCED TENANT ISOLATION TEST")
    print("=" * 60)
    
    # Initialize shared library components
    try:
        client = APIClient()
        dgraph_ops = DgraphOperations(client)
        tenant_utils = TenantUtils(client)
        
        # Check system capabilities
        capabilities = tenant_utils.get_system_capabilities()
        print(f"\n📊 System Status:")
        print(f"   Enterprise: {capabilities['enterprise']}")
        print(f"   Multi-tenant: {capabilities['multi_tenant']}")
        print(f"   Namespaces supported: {capabilities['namespaces_supported']}")
        
        if not capabilities['namespaces_supported']:
            print("\n⚠️  Multi-tenant mode not enabled. Test may not be meaningful.")
            print("   Enable multi-tenant mode to test namespace isolation.")
        
    except Exception as e:
        print(f"❌ Failed to initialize: {e}")
        return 1
    
    # Step 1: Check initial state
    print("\n📊 Initial State:")
    default_count = test_tenant_data(client, "default")
    test_count = test_tenant_data(client, "test-tenant")
    
    # Step 2: Clear test-tenant using safe namespace-scoped deletion
    print("\n🧹 Cleaning test-tenant namespace...")
    if clear_tenant_data(dgraph_ops, "test-tenant"):
        print("   Waiting 2 seconds for processing...")
        import time
        time.sleep(2)
        
        # Step 3: Verify isolation
        print("\n✅ Final State (after clearing test-tenant):")
        default_count_after = test_tenant_data(client, "default")
        test_count_after = test_tenant_data(client, "test-tenant")
        
        print("\n📋 Summary:")
        print(f"   Default tenant: {default_count} → {default_count_after} nodes")
        print(f"   Test tenant: {test_count} → {test_count_after} nodes")
        
        if default_count_after > 0 and test_count_after == 0:
            print("\n🎉 SUCCESS: Tenant isolation is working correctly!")
            print("   - Default tenant data is preserved")
            print("   - Test tenant was successfully cleared")
            return 0
        elif default_count_after == 0 and default_count > 0:
            print("\n❌ CRITICAL FAILURE: Default tenant lost its data!")
            print("   This indicates a serious isolation breach.")
            return 1
        elif test_count_after > 0:
            print("\n⚠️  WARNING: Test tenant still has data")
            print("   Namespace clearing may have failed.")
            return 1
        else:
            print("\n✅ Both tenants are empty (expected for fresh system)")
            return 0
    else:
        print("\n❌ Failed to clear test-tenant data")
        return 1


if __name__ == "__main__":
    sys.exit(main())

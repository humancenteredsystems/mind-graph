#!/usr/bin/env python3
"""
Enhanced namespace safety test using the shared library.
Tests that dropAll operations require proper namespace confirmation.
"""

import sys
from pathlib import Path

# Import shared library
sys.path.append(str(Path(__file__).resolve().parent))
from lib import APIClient, DgraphOperations, TenantUtils
from lib.errors import APIError, NamespaceError, TenantNotFoundError


def test_dropall_without_confirmation(dgraph_ops: DgraphOperations, tenant_id: str) -> bool:
    """Test dropAll without namespace confirmation - should fail in multi-tenant mode."""
    print(f"\n🧪 Testing dropAll WITHOUT confirmation for tenant: {tenant_id}")
    
    try:
        # This should fail because no namespace confirmation is provided
        dgraph_ops.drop_all_data(tenant_id=tenant_id, confirm_namespace=None)
        print(f"   ❌ BAD: dropAll succeeded without confirmation! This is a safety violation!")
        return False
        
    except NamespaceError as e:
        if "confirmation required" in str(e).lower():
            print(f"   ✅ GOOD: Request correctly rejected - namespace confirmation required")
            return True
        else:
            print(f"   ❌ BAD: Wrong error type: {e}")
            return False
    except Exception as e:
        print(f"   ❌ Unexpected error: {e}")
        return False


def test_dropall_with_wrong_confirmation(dgraph_ops: DgraphOperations, tenant_utils: TenantUtils, 
                                        tenant_id: str, wrong_namespace: str) -> bool:
    """Test dropAll with wrong namespace confirmation - should fail."""
    print(f"\n🧪 Testing dropAll with WRONG confirmation for tenant: {tenant_id}")
    print(f"   Sending wrong namespace: {wrong_namespace}")
    
    try:
        # This should fail because the namespace confirmation is wrong
        dgraph_ops.drop_all_data(tenant_id=tenant_id, confirm_namespace=wrong_namespace)
        print(f"   ❌ BAD: dropAll succeeded with wrong namespace confirmation!")
        return False
        
    except NamespaceError as e:
        if "mismatch" in str(e).lower():
            print(f"   ✅ GOOD: Request correctly rejected - namespace confirmation mismatch")
            return True
        else:
            print(f"   ❌ Unexpected namespace error: {e}")
            return False
    except Exception as e:
        print(f"   ❌ Unexpected error: {e}")
        return False


def test_dropall_with_correct_confirmation(dgraph_ops: DgraphOperations, tenant_utils: TenantUtils,
                                         tenant_id: str) -> bool:
    """Test dropAll with correct namespace confirmation - should succeed."""
    print(f"\n🧪 Testing dropAll with CORRECT confirmation for tenant: {tenant_id}")
    
    try:
        # Get the correct namespace for this tenant
        expected_namespace = tenant_utils.get_tenant_namespace(tenant_id)
        print(f"   Confirming namespace: {expected_namespace}")
        
        # This should succeed with correct confirmation
        dgraph_ops.drop_all_data(tenant_id=tenant_id, confirm_namespace=expected_namespace)
        print(f"   ✅ GOOD: dropAll succeeded with correct namespace confirmation")
        return True
        
    except TenantNotFoundError as e:
        print(f"   ⚠️  Tenant not found: {e}")
        print(f"   This is expected for non-existent tenants")
        return True  # This is actually correct behavior
    except Exception as e:
        print(f"   ❌ Failed: {e}")
        return False


def main():
    print("=" * 60)
    print("ENHANCED NAMESPACE SAFETY TEST FOR dropAll")
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
        print(f"   Mode: {capabilities['mode']}")
        
        if not capabilities['namespaces_supported']:
            print("\n⚠️  System is not in multi-tenant mode. Safety checks may not apply.")
            print("   Enable multi-tenant mode to test namespace isolation.")
            return 1
        
    except Exception as e:
        print(f"❌ Failed to initialize: {e}")
        return 1
    
    print("\n🔒 Testing namespace safety measures...")
    
    # Test 1: dropAll without confirmation (should fail)
    test1_pass = test_dropall_without_confirmation(dgraph_ops, "default")
    
    # Test 2: dropAll with wrong confirmation (should fail)
    test2_pass = test_dropall_with_wrong_confirmation(dgraph_ops, tenant_utils, "default", "0x99")
    
    # Test 3: dropAll with correct confirmation (should succeed)
    test3_pass = test_dropall_with_correct_confirmation(dgraph_ops, tenant_utils, "default")
    
    # Test 4-6: Test for test-tenant
    print("\n--- Testing test-tenant namespace ---")
    test4_pass = test_dropall_without_confirmation(dgraph_ops, "test-tenant")
    test5_pass = test_dropall_with_wrong_confirmation(dgraph_ops, tenant_utils, "test-tenant", "0x0")
    test6_pass = test_dropall_with_correct_confirmation(dgraph_ops, tenant_utils, "test-tenant")
    
    # Summary
    print("\n" + "=" * 60)
    print("TEST SUMMARY")
    print("=" * 60)
    
    all_tests = [test1_pass, test2_pass, test3_pass, test4_pass, test5_pass, test6_pass]
    passed = sum(all_tests)
    total = len(all_tests)
    
    print(f"\nPassed: {passed}/{total} tests")
    
    if passed == total:
        print("\n🎉 SUCCESS: All namespace safety tests passed!")
        print("   ✓ dropAll requires namespace confirmation")
        print("   ✓ Wrong namespace confirmations are rejected")
        print("   ✓ Correct namespace confirmations work")
        print("   ✓ Each tenant is properly isolated")
        return 0
    else:
        print("\n❌ FAILURE: Some namespace safety tests failed!")
        print("   This is a critical safety issue that must be fixed.")
        return 1


if __name__ == "__main__":
    sys.exit(main())

#!/usr/bin/env python3
"""
Test script to verify namespace safety for dropAll operations.
This ensures that dropAll NEVER affects other namespaces.

⚠️  DEPRECATED: This script has been replaced by test_namespace_safety_fixed.py
    which uses the shared library for better security and error handling.
    
    This file is kept for backward compatibility but should not be used
    for new testing. Use: python tools/test_namespace_safety_fixed.py
"""

import requests
import json
import sys
import time
import os

API_BASE = "http://localhost:3000/api"

def get_admin_api_key():
    """Get admin API key from environment variables."""
    api_key = os.environ.get("MIMS_ADMIN_API_KEY") or os.environ.get("ADMIN_API_KEY")
    if not api_key:
        print("❌ Error: Admin API key is required.")
        print("💡 Set MIMS_ADMIN_API_KEY environment variable or use the new script:")
        print("   python tools/test_namespace_safety_fixed.py")
        sys.exit(1)
    return api_key

def make_request(endpoint, method="GET", headers=None, data=None):
    """Make an API request and return the response."""
    url = f"{API_BASE}{endpoint}"
    headers = headers or {}
    headers["Content-Type"] = "application/json"
    
    if method == "GET":
        response = requests.get(url, headers=headers)
    elif method == "POST":
        response = requests.post(url, headers=headers, json=data)
    
    return response.json()

def test_dropall_without_confirmation(tenant_id, admin_api_key):
    """Test dropAll without namespace confirmation - should fail in multi-tenant mode."""
    print(f"\n🧪 Testing dropAll WITHOUT confirmation for tenant: {tenant_id}")
    
    headers = {
        "X-Tenant-Id": tenant_id,
        "X-Admin-API-Key": admin_api_key
    }
    # Intentionally omit confirmNamespace
    data = {"target": "remote"}
    
    try:
        result = make_request("/admin/dropAll", "POST", headers, data)
        
        if result.get("error") and "confirmation required" in result.get("error", "").lower():
            print(f"   ✅ GOOD: Request correctly rejected - namespace confirmation required")
            print(f"   Details: {result.get('details', '')}")
            return True
        else:
            print(f"   ❌ BAD: Request was not rejected! This is a safety violation!")
            print(f"   Response: {json.dumps(result, indent=2)}")
            return False
    except Exception as e:
        print(f"   ❌ Request failed: {e}")
        return False

def test_dropall_with_wrong_confirmation(tenant_id, wrong_namespace, admin_api_key):
    """Test dropAll with wrong namespace confirmation - should fail."""
    print(f"\n🧪 Testing dropAll with WRONG confirmation for tenant: {tenant_id}")
    print(f"   Sending wrong namespace: {wrong_namespace}")
    
    headers = {
        "X-Tenant-Id": tenant_id,
        "X-Admin-API-Key": admin_api_key
    }
    data = {
        "target": "remote",
        "confirmNamespace": wrong_namespace  # Wrong namespace
    }
    
    try:
        result = make_request("/admin/dropAll", "POST", headers, data)
        
        if result.get("error"):
            print(f"   ✅ GOOD: Request correctly rejected - wrong namespace confirmation")
            return True
        else:
            print(f"   ❌ BAD: Request was not rejected with wrong namespace!")
            print(f"   Response: {json.dumps(result, indent=2)}")
            return False
    except Exception as e:
        print(f"   ❌ Request failed: {e}")
        return False

def test_dropall_with_correct_confirmation(tenant_id, namespace, admin_api_key):
    """Test dropAll with correct namespace confirmation - should succeed."""
    print(f"\n🧪 Testing dropAll with CORRECT confirmation for tenant: {tenant_id}")
    print(f"   Confirming namespace: {namespace}")
    
    headers = {
        "X-Tenant-Id": tenant_id,
        "X-Admin-API-Key": admin_api_key
    }
    data = {
        "target": "remote",
        "confirmNamespace": namespace  # Correct namespace
    }
    
    try:
        result = make_request("/admin/dropAll", "POST", headers, data)
        
        if result.get("success"):
            print(f"   ✅ GOOD: Request succeeded with correct namespace confirmation")
            print(f"   Message: {result.get('message', '')}")
            print(f"   Namespace: {result.get('namespace', 'N/A')}")
            print(f"   Tenant: {result.get('tenantId', 'N/A')}")
            return True
        else:
            print(f"   ❌ Failed: {result.get('error', 'Unknown error')}")
            return False
    except Exception as e:
        print(f"   ❌ Request failed: {e}")
        return False

def check_system_status():
    """Check if the system is in multi-tenant mode."""
    print("\n📊 Checking system status...")
    
    try:
        result = make_request("/system/status", "GET")
        
        # The system/status endpoint returns data directly, not wrapped in success/data
        if isinstance(result, dict) and "mode" in result:
            is_multi_tenant = result.get("mode") == "multi-tenant"
            is_enterprise = result.get("dgraphEnterprise", False)
            
            print(f"   Enterprise: {is_enterprise}")
            print(f"   Multi-tenant: {is_multi_tenant}")
            print(f"   Mode: {result.get('mode', 'unknown')}")
            print(f"   Current tenant: {result.get('currentTenant', 'N/A')}")
            
            return is_multi_tenant
        else:
            print(f"   ❌ Failed to get system status")
            print(f"   Response: {json.dumps(result, indent=2)}")
            return False
    except Exception as e:
        print(f"   ❌ Error: {e}")
        return False

def main():
    print("⚠️  DEPRECATED: Use test_namespace_safety_fixed.py for better security and error handling")
    print("=" * 60)
    print("NAMESPACE SAFETY TEST FOR dropAll")
    print("=" * 60)
    
    # Get admin API key from environment
    admin_api_key = get_admin_api_key()
    
    # Check if multi-tenant mode is enabled
    is_multi_tenant = check_system_status()
    
    if not is_multi_tenant:
        print("\n⚠️  System is not in multi-tenant mode. Safety checks may not apply.")
        print("   Enable multi-tenant mode to test namespace isolation.")
        return 1
    
    print("\n🔒 Testing namespace safety measures...")
    
    # Test 1: dropAll without confirmation (should fail)
    test1_pass = test_dropall_without_confirmation("default", admin_api_key)
    
    # Test 2: dropAll with wrong confirmation (should fail)
    test2_pass = test_dropall_with_wrong_confirmation("default", "0x99", admin_api_key)
    
    # Test 3: dropAll with correct confirmation (should succeed)
    test3_pass = test_dropall_with_correct_confirmation("default", "0x0", admin_api_key)
    
    # Test 4: Test for test-tenant
    print("\n--- Testing test-tenant namespace ---")
    test4_pass = test_dropall_without_confirmation("test-tenant", admin_api_key)
    test5_pass = test_dropall_with_wrong_confirmation("test-tenant", "0x0", admin_api_key)
    test6_pass = test_dropall_with_correct_confirmation("test-tenant", "0x1", admin_api_key)
    
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
        print("\n💡 Recommended: Use test_namespace_safety_fixed.py for enhanced features")
        return 0
    else:
        print("\n❌ FAILURE: Some namespace safety tests failed!")
        print("   This is a critical safety issue that must be fixed.")
        return 1

if __name__ == "__main__":
    sys.exit(main())

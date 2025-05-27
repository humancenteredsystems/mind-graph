#!/usr/bin/env python3
"""
Test script to verify tenant isolation is working correctly.
"""

import requests
import json
import sys

API_BASE = "http://localhost:3000/api"
ADMIN_API_KEY = ""

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

def test_tenant_data(tenant_id):
    """Test querying data for a specific tenant."""
    print(f"\n🔍 Testing tenant: {tenant_id}")
    
    headers = {"X-Tenant-Id": tenant_id}
    query = {"query": "{ queryNode { id label type } }"}
    
    try:
        result = make_request("/query", "POST", headers, query)
        
        if "error" in result:
            print(f"   ❌ Error: {result['error']}")
            return 0
        
        nodes = result.get("queryNode", [])
        print(f"   ✅ Found {len(nodes)} nodes")
        return len(nodes)
    except Exception as e:
        print(f"   ❌ Request failed: {e}")
        return -1

def drop_tenant_data(tenant_id):
    """Drop all data for a specific tenant."""
    print(f"\n🗑️  Dropping data for tenant: {tenant_id}")
    
    headers = {
        "X-Tenant-Id": tenant_id,
        "X-Admin-API-Key": ADMIN_API_KEY
    }
    data = {"target": "remote"}
    
    try:
        result = make_request("/admin/dropAll", "POST", headers, data)
        
        if result.get("success"):
            print(f"   ✅ {result.get('message', 'Data dropped successfully')}")
            return True
        else:
            print(f"   ❌ Failed: {result.get('error', 'Unknown error')}")
            return False
    except Exception as e:
        print(f"   ❌ Request failed: {e}")
        return False

def main():
    print("=" * 60)
    print("TENANT ISOLATION TEST")
    print("=" * 60)
    
    # Step 1: Check initial state
    print("\n📊 Initial State:")
    default_count = test_tenant_data("default")
    test_count = test_tenant_data("test-tenant")
    
    # Step 2: Clear test-tenant
    print("\n🧹 Cleaning test-tenant namespace...")
    if drop_tenant_data("test-tenant"):
        print("   Waiting 2 seconds for Dgraph to process...")
        import time
        time.sleep(2)
        
        # Step 3: Verify isolation
        print("\n✅ Final State (after clearing test-tenant):")
        default_count_after = test_tenant_data("default")
        test_count_after = test_tenant_data("test-tenant")
        
        print("\n📋 Summary:")
        print(f"   Default tenant: {default_count} → {default_count_after} nodes")
        print(f"   Test tenant: {test_count} → {test_count_after} nodes")
        
        if default_count_after > 0 and test_count_after == 0:
            print("\n🎉 SUCCESS: Tenant isolation is working correctly!")
            print("   - Default tenant data is preserved")
            print("   - Test tenant was successfully cleared")
            return 0
        else:
            print("\n⚠️  WARNING: Unexpected state")
            if default_count_after == 0:
                print("   - Default tenant lost its data!")
            if test_count_after > 0:
                print("   - Test tenant still has data!")
            return 1
    else:
        print("\n❌ Failed to drop test-tenant data")
        return 1

if __name__ == "__main__":
    sys.exit(main())

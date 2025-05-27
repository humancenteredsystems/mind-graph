#!/usr/bin/env python3
"""
Comprehensive test to verify that dropAll operations are truly namespace-isolated.
This test seeds both namespaces with different data, then verifies that dropping
one namespace doesn't affect the other.

⚠️  DEPRECATED: This script should be updated to use the shared library.
    For now, it uses proper environment variable handling for API keys.
"""

import requests
import json
import sys
import time
import os
from pathlib import Path

# Add the parent directory to the Python path
sys.path.append(str(Path(__file__).resolve().parent.parent))
from tools.api_client import call_api

API_BASE = "http://localhost:3000/api"

def get_admin_api_key():
    """Get admin API key from environment variables."""
    api_key = os.environ.get("MIMS_ADMIN_API_KEY") or os.environ.get("ADMIN_API_KEY")
    if not api_key:
        print("❌ Error: Admin API key is required.")
        print("💡 Set MIMS_ADMIN_API_KEY environment variable")
        print("💡 Recommended: Use the enhanced test tools with shared library:")
        print("   python tools/test_tenant_isolation_fixed.py")
        print("   python tools/test_namespace_safety_fixed.py")
        sys.exit(1)
    return api_key

# Different test data for each namespace
DEFAULT_NODES = [
    {"id": "default1", "label": "Default Node 1", "type": "domain", "status": "approved", "branch": "main"},
    {"id": "default2", "label": "Default Node 2", "type": "concept", "status": "approved", "branch": "main"},
    {"id": "default3", "label": "Default Node 3", "type": "example", "status": "approved", "branch": "main"},
]

TEST_NODES = [
    {"id": "test1", "label": "Test Node 1", "type": "domain", "status": "approved", "branch": "test"},
    {"id": "test2", "label": "Test Node 2", "type": "concept", "status": "approved", "branch": "test"},
    {"id": "test3", "label": "Test Node 3", "type": "example", "status": "approved", "branch": "test"},
]

ADD_NODE_MUTATION = """
mutation AddNode($input: [AddNodeInput!]!) {
  addNode(input: $input) {
    node {
      id
      label
      type
    }
  }
}
"""

def setup_tenant_with_data(tenant_id, namespace, nodes, admin_api_key):
    """Set up a tenant with schema and test data."""
    print(f"\n📦 Setting up {tenant_id} with test data...")
    
    headers = {"X-Tenant-Id": tenant_id}
    
    # 1. Drop existing data (with confirmation)
    print(f"  1️⃣ Dropping existing data...")
    drop_payload = {
        "target": "remote",
        "confirmNamespace": namespace
    }
    resp = call_api(API_BASE, "/admin/dropAll", admin_api_key, 
                   method="POST", payload=drop_payload, extra_headers=headers)
    if not resp["success"]:
        print(f"     ❌ Failed to drop data: {resp.get('error')}")
        return False
    print(f"     ✅ Data dropped")
    
    # 2. Push schema
    print(f"  2️⃣ Pushing schema...")
    schema_path = Path(__file__).resolve().parent.parent / "schemas" / "default.graphql"
    schema_text = schema_path.read_text()
    
    schema_payload = {
        "schema": schema_text,
        "target": "remote"
    }
    resp = call_api(API_BASE, "/admin/schema", admin_api_key, 
                   method="POST", payload=schema_payload, extra_headers=headers)
    if not resp["success"]:
        print(f"     ❌ Failed to push schema: {resp.get('error')}")
        return False
    print(f"     ✅ Schema pushed")
    
    # Wait for schema to be processed
    print(f"  ⏳ Waiting 5 seconds for schema processing...")
    time.sleep(5)
    
    # 3. Create a hierarchy (required for nodes)
    print(f"  3️⃣ Creating hierarchy...")
    hierarchy_payload = {
        "id": f"h_{tenant_id}",
        "name": f"{tenant_id} Test Hierarchy"
    }
    resp = call_api(API_BASE, "/hierarchy", admin_api_key, 
                   method="POST", payload=hierarchy_payload, extra_headers=headers)
    if not resp["success"]:
        print(f"     ❌ Failed to create hierarchy: {resp.get('error')}")
        return False
    hierarchy_id = resp["data"].get("id", f"h_{tenant_id}")
    print(f"     ✅ Hierarchy created: {hierarchy_id}")
    
    # 4. Add nodes
    print(f"  4️⃣ Adding {len(nodes)} test nodes...")
    mutate_headers = {"X-Hierarchy-Id": hierarchy_id}
    mutate_headers.update(headers)
    
    mutation_payload = {
        "mutation": ADD_NODE_MUTATION,
        "variables": {"input": nodes}
    }
    resp = call_api(API_BASE, "/mutate", admin_api_key, 
                   method="POST", payload=mutation_payload, extra_headers=mutate_headers)
    if not resp["success"]:
        print(f"     ❌ Failed to add nodes: {resp.get('error')}")
        return False
    print(f"     ✅ Added {len(nodes)} nodes")
    
    return True

def count_nodes_in_tenant(tenant_id):
    """Count the number of nodes in a tenant."""
    headers = {"X-Tenant-Id": tenant_id}
    
    # Use requests directly to get the raw response
    try:
        resp = requests.post(
            f"{API_BASE}/query",
            headers=headers,
            json={"query": "{ queryNode { id label type } }"}
        )
        
        data = resp.json()
        
        # Check if we got nodes back
        if "queryNode" in data:
            nodes = data["queryNode"]
            return len(nodes), nodes
        
        # Check for error indicating no schema
        if "error" in data:
            error_msg = data["error"].lower()
            if "no graphql schema" in error_msg or "not resolving" in error_msg:
                # No schema = empty namespace, which is expected after dropAll
                return 0, []
            else:
                print(f"        Query error: {data['error']}")
                return -1, data["error"]
        
        # Unexpected response format
        return -1, f"Unexpected response: {data}"
        
    except Exception as e:
        print(f"        Exception: {e}")
        return -1, str(e)

def test_namespace_isolation(drop_tenant, drop_namespace, preserve_tenant, admin_api_key):
    """Test that dropping one namespace doesn't affect the other."""
    print(f"\n🧪 Testing: Drop {drop_tenant} and verify {preserve_tenant} is unaffected")
    
    # 1. Check initial state
    print(f"\n  📊 Initial state:")
    drop_count, drop_nodes = count_nodes_in_tenant(drop_tenant)
    preserve_count, preserve_nodes = count_nodes_in_tenant(preserve_tenant)
    
    print(f"     {drop_tenant}: {drop_count} nodes")
    print(f"     {preserve_tenant}: {preserve_count} nodes")
    
    if drop_count <= 0:
        print(f"     ⚠️  {drop_tenant} has no data to drop")
        return False
    
    if preserve_count <= 0:
        print(f"     ⚠️  {preserve_tenant} has no data to preserve")
        return False
    
    # 2. Drop the target namespace
    print(f"\n  🗑️  Dropping all data in {drop_tenant} (namespace {drop_namespace})...")
    headers = {
        "X-Tenant-Id": drop_tenant, 
        "X-Admin-API-Key": admin_api_key,
        "Content-Type": "application/json"
    }
    drop_payload = {
        "target": "remote",
        "confirmNamespace": drop_namespace
    }
    
    resp = requests.post(f"{API_BASE}/admin/dropAll", 
                        headers=headers, json=drop_payload).json()
    
    if not resp.get("success"):
        print(f"     ❌ Drop failed: {resp.get('error')}")
        return False
    
    print(f"     ✅ Drop completed: {resp.get('message')}")
    
    # 3. Wait a moment for operation to complete
    time.sleep(2)
    
    # 4. Verify the dropped namespace is empty
    print(f"\n  🔍 Verifying {drop_tenant} is now empty...")
    new_drop_count, _ = count_nodes_in_tenant(drop_tenant)
    
    if new_drop_count != 0:
        print(f"     ❌ FAILED: {drop_tenant} still has {new_drop_count} nodes!")
        return False
    
    print(f"     ✅ Confirmed: {drop_tenant} is empty")
    
    # 5. Verify the preserved namespace is intact
    print(f"\n  🔍 Verifying {preserve_tenant} is unaffected...")
    new_preserve_count, new_preserve_nodes = count_nodes_in_tenant(preserve_tenant)
    
    if new_preserve_count != preserve_count:
        print(f"     ❌ FAILED: {preserve_tenant} node count changed from {preserve_count} to {new_preserve_count}!")
        return False
    
    # Check that the actual nodes are the same
    if isinstance(new_preserve_nodes, list) and isinstance(preserve_nodes, list):
        old_ids = {n["id"] for n in preserve_nodes}
        new_ids = {n["id"] for n in new_preserve_nodes}
        
        if old_ids != new_ids:
            print(f"     ❌ FAILED: Node IDs changed!")
            print(f"        Before: {old_ids}")
            print(f"        After: {new_ids}")
            return False
    
    print(f"     ✅ SUCCESS: {preserve_tenant} still has all {new_preserve_count} nodes intact!")
    print(f"        Node IDs: {[n['id'] for n in new_preserve_nodes]}")
    
    return True

def main():
    print("⚠️  DEPRECATED: Consider using the enhanced test tools with shared library")
    print("=" * 70)
    print("COMPREHENSIVE NAMESPACE ISOLATION TEST")
    print("=" * 70)
    
    # Get admin API key from environment
    admin_api_key = get_admin_api_key()
    
    # Step 1: Set up both namespaces with different data
    print("\n🚀 STEP 1: Setting up both namespaces with different data")
    
    if not setup_tenant_with_data("default", "0x0", DEFAULT_NODES, admin_api_key):
        print("❌ Failed to set up default tenant")
        return 1
    
    if not setup_tenant_with_data("test-tenant", "0x1", TEST_NODES, admin_api_key):
        print("❌ Failed to set up test-tenant")
        return 1
    
    # Step 2: Test dropping test-tenant doesn't affect default
    print("\n" + "=" * 70)
    print("🚀 STEP 2: Test dropping test-tenant doesn't affect default")
    
    if not test_namespace_isolation("test-tenant", "0x1", "default", admin_api_key):
        print("\n❌ CRITICAL FAILURE: Namespace isolation is broken!")
        return 1
    
    # Step 3: Re-seed test-tenant for reverse test
    print("\n" + "=" * 70)
    print("🚀 STEP 3: Re-seeding test-tenant for reverse test")
    
    if not setup_tenant_with_data("test-tenant", "0x1", TEST_NODES, admin_api_key):
        print("❌ Failed to re-seed test-tenant")
        return 1
    
    # Step 4: Test dropping default doesn't affect test-tenant
    print("\n" + "=" * 70)
    print("🚀 STEP 4: Test dropping default doesn't affect test-tenant")
    
    if not test_namespace_isolation("default", "0x0", "test-tenant", admin_api_key):
        print("\n❌ CRITICAL FAILURE: Namespace isolation is broken!")
        return 1
    
    # Success!
    print("\n" + "=" * 70)
    print("🎉 SUCCESS: Complete namespace isolation verified!")
    print("=" * 70)
    print("\n✅ Key findings:")
    print("   1. dropAll on test-tenant (0x1) does NOT affect default (0x0)")
    print("   2. dropAll on default (0x0) does NOT affect test-tenant (0x1)")
    print("   3. Each namespace is completely isolated")
    print("   4. The namespace safety measures are working correctly!")
    print("\n💡 Recommended: Migrate to enhanced test tools with shared library:")
    print("   python tools/test_tenant_isolation_fixed.py")
    print("   python tools/test_namespace_safety_fixed.py")
    
    return 0

if __name__ == "__main__":
    sys.exit(main())

#!/usr/bin/env python3
"""
Drop data from the Dgraph database using the backend API.

This tool calls the /api/admin/dropAll endpoint on the backend API with enhanced safety measures
for multi-tenant environments.

IMPORTANT: By default, this script uses namespace-scoped deletion which safely clears data
only within the target namespace. Use --enable-drop-all for cluster-wide dropAll operation.

WARNING: Dgraph's dropAll operation affects ALL namespaces in the cluster, even when
namespace parameters are correctly provided. Use with extreme caution in multi-tenant environments.
"""
import argparse
import sys
import os # Import os to read environment variables

# Add the parent directory to the Python path to be able to import tools
sys.path.append(os.path.join(os.path.dirname(__file__), '..'))
from tools.api_client import call_api # Import the shared API client

# --- Constants (API base derived from env) ---
env_api_base = os.environ.get("MIMS_API_URL")
if not env_api_base and os.environ.get("DGRAPH_BASE_URL"):
    env_api_base = os.environ["DGRAPH_BASE_URL"].replace("/graphql", "/api")
DEFAULT_API_BASE_URL = env_api_base or "http://localhost:3000/api"
# --- End Constants ---

def detect_dgraph_capabilities(api_base_url: str) -> dict:
    """Detect if Dgraph supports Enterprise features like namespaces."""
    try:
        # System endpoints don't require admin authentication
        resp = call_api(api_base_url, "/system/status", "", method="GET")
        if resp["success"]:
            data = resp.get("data", {})
            # Check if enterprise features are available and multi-tenant mode is enabled
            is_enterprise = data.get("dgraphEnterprise", False)
            is_multi_tenant = data.get("mode") == "multi-tenant"
            print(f"[CAPABILITY_DETECTION] Enterprise: {is_enterprise}, Multi-tenant: {is_multi_tenant}")
            return {
                "namespacesSupported": is_enterprise and is_multi_tenant
            }
    except Exception as e:
        print(f"[CAPABILITY_DETECTION] Error: {e}")
        pass
    return {"namespacesSupported": False}

def clear_namespace_data_via_api(api_base_url: str, tenant_id: str, admin_api_key: str) -> bool:
    """Safely clear all data within a namespace using the backend API."""
    print(f"🔒 Clearing data for tenant '{tenant_id}' using namespace-scoped deletion...")
    
    # Set tenant context headers
    tenant_headers = {"X-Tenant-Id": tenant_id}
    
    try:
        # 1. Query all nodes to get their UIDs and IDs
        print("  1️⃣ Querying all nodes...")
        query_payload = {"query": "{ queryNode { uid id } }"}
        
        resp = call_api(api_base_url, "/query", "", method="POST", 
                       payload=query_payload, extra_headers=tenant_headers)
        
        if not resp["success"]:
            print(f"❌ Failed to query nodes: {resp.get('error')}")
            return False
        
        nodes = resp.get("data", {}).get("queryNode", [])
        node_count = len(nodes)
        
        if node_count == 0:
            print("  ✅ No nodes found - namespace is already empty")
            return True
        
        print(f"  📊 Found {node_count} nodes to delete")
        
        # 2. Query all edges to get their UIDs
        print("  2️⃣ Querying all edges...")
        edge_query_payload = {"query": "{ queryEdge { uid from { uid } to { uid } } }"}
        
        resp = call_api(api_base_url, "/query", "", method="POST",
                       payload=edge_query_payload, extra_headers=tenant_headers)
        
        edges = []
        if resp["success"]:
            edges = resp.get("data", {}).get("queryEdge", [])
        
        edge_count = len(edges)
        print(f"  📊 Found {edge_count} edges to delete")
        
        # 3. Delete all edges first (to avoid referential integrity issues)
        if edges:
            print(f"  3️⃣ Deleting {edge_count} edges...")
            edge_uids = [edge["uid"] for edge in edges if "uid" in edge]
            
            if edge_uids:
                delete_edges_mutation = """
                mutation DeleteEdges($filter: EdgeFilter!) {
                  deleteEdge(filter: $filter) {
                    msg
                    numUids
                  }
                }
                """
                
                # Delete edges in batches to avoid large payloads
                batch_size = 100
                total_edges_deleted = 0
                for i in range(0, len(edge_uids), batch_size):
                    batch_uids = edge_uids[i:i + batch_size]
                    variables = {"filter": {"uid": batch_uids}}
                    payload = {"mutation": delete_edges_mutation, "variables": variables}
                    
                    resp = call_api(api_base_url, "/mutate", admin_api_key, method="POST",
                                   payload=payload, extra_headers=tenant_headers)
                    
                    if not resp["success"]:
                        print(f"⚠️ Warning: Failed to delete edge batch {i//batch_size + 1}: {resp.get('error')}")
                    else:
                        deleted_count = resp.get("data", {}).get("deleteEdge", {}).get("numUids", 0)
                        total_edges_deleted += deleted_count
                        print(f"    ✅ Deleted {deleted_count} edges in batch {i//batch_size + 1}")
        
        # 4. Delete all nodes
        print(f"  4️⃣ Deleting {node_count} nodes...")
        node_uids = [node["uid"] for node in nodes if "uid" in node]
        
        if node_uids:
            delete_nodes_mutation = """
            mutation DeleteNodes($filter: NodeFilter!) {
              deleteNode(filter: $filter) {
                msg
                numUids
              }
            }
            """
            
            # Delete nodes in batches
            batch_size = 100
            total_nodes_deleted = 0
            for i in range(0, len(node_uids), batch_size):
                batch_uids = node_uids[i:i + batch_size]
                variables = {"filter": {"uid": batch_uids}}
                payload = {"mutation": delete_nodes_mutation, "variables": variables}
                
                resp = call_api(api_base_url, "/mutate", admin_api_key, method="POST",
                               payload=payload, extra_headers=tenant_headers)
                
                if not resp["success"]:
                    print(f"⚠️ Warning: Failed to delete node batch {i//batch_size + 1}: {resp.get('error')}")
                else:
                    deleted_count = resp.get("data", {}).get("deleteNode", {}).get("numUids", 0)
                    total_nodes_deleted += deleted_count
                    print(f"    ✅ Deleted {deleted_count} nodes in batch {i//batch_size + 1}")
        
        print(f"✅ Namespace cleared: deleted {total_nodes_deleted} nodes and {total_edges_deleted} edges (tenant: {tenant_id})")
        return True
        
    except Exception as e:
        print(f"❌ Error during namespace data clearing: {e}")
        return False

def drop_all_data_via_api(api_base_url: str, target: str, admin_api_key: str, tenant_id: str = None, confirm_namespace: str = None) -> bool:
    """Calls the backend API's /api/admin/dropAll endpoint using the API client."""
    print(f"⚠️  WARNING: Using dropAll (affects ALL namespaces in cluster)")
    print(f"Attempting to drop all data via API at {api_base_url} for target: {target}...")

    # Build payload with safety measures
    payload = {"target": target}
    extra_headers = {}
    
    # Add tenant context if provided
    if tenant_id:
        extra_headers["X-Tenant-Id"] = tenant_id
        print(f"  🔒 Tenant context: {tenant_id}")
    
    # Add namespace confirmation if provided
    if confirm_namespace:
        payload["confirmNamespace"] = confirm_namespace
        print(f"  🔒 Namespace confirmation: {confirm_namespace}")

    response = call_api(api_base_url, "/admin/dropAll", admin_api_key, method='POST', 
                       payload=payload, extra_headers=extra_headers)

    if response["success"]:
        print('✅ Drop operation request successful via API.')
        # The API client already prints basic success/error messages.
        # We can optionally print more details from the 'data' or 'results' field
        if response.get("data") and response["data"].get("results"):
             print("API Results:")
             for instance, res in response["data"]["results"].items():
                 status = "SUCCESS" if res.get("success") else "FAILED"
                 print(f"  {instance.capitalize()}: {status}")
                 if res.get("error"):
                     print(f"    Error: {res['error']}")
        return True
    else:
        print(f'❌ Drop operation request failed via API: {response["error"]}')
        if response.get("details"):
            print("Details:", response["details"])
        return False


def main():
    """Main entry point for the script."""
    parser = argparse.ArgumentParser(description="Drop data from the Dgraph database using the backend API")
    parser.add_argument(
        "--api-base",
        default=DEFAULT_API_BASE_URL,
        help=f"Backend API base URL (default: {DEFAULT_API_BASE_URL})"
    )
    parser.add_argument(
        "--target", "-t",
        required=True,
        choices=['local', 'remote', 'both'],
        help="Target Dgraph instance(s): 'local', 'remote', or 'both'"
    )
    parser.add_argument(
        "--tenant-id",
        default="default",
        help="Tenant ID for Enterprise mode (default: 'default')"
    )
    parser.add_argument(
        "--enable-drop-all",
        action="store_true",
        help="Enable cluster-wide dropAll operation (WARNING: affects ALL namespaces)"
    )
    parser.add_argument(
        "--confirm-namespace",
        help="Namespace confirmation for dropAll safety (required in multi-tenant mode)"
    )
    parser.add_argument(
        "--admin-api-key",
        help="Admin API Key (can also be set via ADMIN_API_KEY environment variable)"
    )
    args = parser.parse_args()

    admin_api_key = args.admin_api_key or os.environ.get("ADMIN_API_KEY")

    if not admin_api_key:
        print("❌ Error: Admin API Key is required. Provide via --admin-api-key or ADMIN_API_KEY environment variable.")
        sys.exit(1)

    # Auto-detect Enterprise vs OSS capabilities
    capabilities = detect_dgraph_capabilities(args.api_base)
    
    # Determine operation mode
    if capabilities.get('namespacesSupported'):
        print(f"🏢 Enterprise mode detected - targeting tenant: {args.tenant_id}")
        
        if args.enable_drop_all:
            print("\n" + "="*60)
            print("🚨 DANGER: You are about to use dropAll in multi-tenant mode!")
            print("This will affect ALL namespaces in the cluster!")
            print("="*60)
            
            # Require namespace confirmation for safety
            if not args.confirm_namespace:
                print("❌ Error: --confirm-namespace is required when using --enable-drop-all in multi-tenant mode")
                print("Example: --confirm-namespace 0x1 (for test-tenant)")
                sys.exit(1)
            
            # Perform the drop operation via API
            if not drop_all_data_via_api(args.api_base, args.target, admin_api_key, 
                                       args.tenant_id, args.confirm_namespace):
                sys.exit(1)
        else:
            # Use safe namespace-scoped deletion
            print("🔒 Using namespace-scoped deletion (safe for multi-tenant)")
            if not clear_namespace_data_via_api(args.api_base, args.tenant_id, admin_api_key):
                sys.exit(1)
    else:
        print("🔓 OSS mode detected - using dropAll")
        
        # Perform the drop operation via API
        if not drop_all_data_via_api(args.api_base, args.target, admin_api_key):
            sys.exit(1)

    print("✅ Data drop process completed via API.")
    sys.exit(0) # Exit successfully

if __name__ == "__main__":
    main()

#!/usr/bin/env python3
"""
Seed the Dgraph database with a complete, clean graph.
Universal OSS/Enterprise compatible seeding tool.

This tool performs the following actions:
1. Auto-detects OSS vs Enterprise capabilities
2. Clears existing data from target namespace (default: namespace-scoped deletion, or dropAll with --enable-drop-all flag)
3. Pushes the GraphQL schema (schemas/default.graphql).
4. Creates a single, predefined hierarchy with levels and level types.
5. Adds sample nodes and edges.
6. Assigns these nodes to the created hierarchy and its levels.

IMPORTANT: By default, this script uses namespace-scoped deletion which safely clears data
only within the target namespace. Use --enable-drop-all for cluster-wide dropAll operation.
"""
import argparse
import os
import sys
import json
import time
from pathlib import Path
from typing import Dict, Any, List, Tuple, Optional

# Add the parent directory to the Python path to be able to import tools
sys.path.append(str(Path(__file__).resolve().parent.parent))
from tools.api_client import call_api # Import the shared API client

# Default API base URL (override with MIMS_API_URL env var)
DEFAULT_API_BASE = "http://localhost:3000/api"
DEFAULT_HIERARCHY_ID = "h1"
DEFAULT_HIERARCHY_NAME = "Primary Knowledge Graph"

# GraphQL mutation templates
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

ADD_EDGE_MUTATION = """
mutation AddEdge($input: [AddEdgeInput!]!) {
  addEdge(input: $input) {
    edge {
      from { id }
      fromId
      to { id }
      toId
      type
    }
  }
}
"""

ADD_HIERARCHY_ASSIGNMENT_MUTATION = """
mutation AddHierarchyAssignment($input: [AddHierarchyAssignmentInput!]!) {
  addHierarchyAssignment(input: $input) {
    hierarchyAssignment {
      id
      node { id label }
      hierarchy { id name }
      level { id label levelNumber }
    }
  }
}
"""

def detect_dgraph_capabilities(api_base: str, api_key: str) -> dict:
    """Detect if Dgraph supports Enterprise features like namespaces."""
    try:
        # System endpoints don't require admin authentication, so don't send API key
        resp = call_api(api_base, "/system/status", "", method="GET")
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

def seed_tenant_data(api_base: str, api_key: str, tenant_id: str, create_tenant: bool, enable_drop_all: bool = False):
    """Seed data for a specific tenant in Enterprise mode."""
    # Set tenant context for all API calls
    tenant_headers = {"X-Tenant-Id": tenant_id}
    
    if create_tenant:
        # Create tenant via TenantManager
        create_resp = call_api(api_base, "/tenant", api_key, method="POST", 
                              payload={"tenantId": tenant_id}, extra_headers=tenant_headers)
        if not create_resp["success"]:
            print(f"⚠️ Tenant creation failed (may already exist): {create_resp.get('error')}")
    
    # Use existing seeding logic with tenant headers
    seed_with_context(api_base, api_key, tenant_headers, enable_drop_all)

def seed_default_data(api_base: str, api_key: str, enable_drop_all: bool = False):
    """Seed data for OSS mode (no tenant context)."""
    # Use existing seeding logic without tenant headers
    seed_with_context(api_base, api_key, {}, enable_drop_all)

def seed_with_context(api_base: str, api_key: str, extra_headers: dict, enable_drop_all: bool = False):
    """Universal seeding logic that works with or without tenant context."""
    # 1. Clear existing data (either dropAll or namespace-scoped deletion)
    if enable_drop_all:
        print("⚠️  Using dropAll (affects ALL namespaces in cluster)")
        if not drop_all_data(api_base, api_key, extra_headers):
            sys.exit(1)
    else:
        print("🔒 Using namespace-scoped deletion (safe for multi-tenant)")
        if not clear_namespace_data(api_base, api_key, extra_headers):
            sys.exit(1)
    
    # 2. Push schema (respects tenant context in Enterprise)  
    if not push_schema(api_base, api_key, extra_headers):
        sys.exit(1)
    
    print("Waiting 15 seconds for Dgraph to process the schema...")
    time.sleep(15)

    # 3. Create a single hierarchy
    hierarchy_id = create_single_hierarchy(api_base, api_key, DEFAULT_HIERARCHY_ID, DEFAULT_HIERARCHY_NAME, extra_headers)
    if not hierarchy_id:
        print("❌ Failed to create the primary hierarchy. Aborting.")
        sys.exit(1)

    # 4. Create levels for this hierarchy
    levels_data = [
        (1, "Domains"),
        (2, "Key Concepts"),
        (3, "Detailed Examples")
    ]
    level_ids_map = create_levels_for_hierarchy(api_base, api_key, hierarchy_id, levels_data, extra_headers)
    if len(level_ids_map) != len(levels_data):
        print("❌ Error: Failed to create all hierarchy levels. Aborting.")
        sys.exit(1)
    
    # 5. Create level types for these levels (two types per level)
    level_types_all_ok = True
    if level_ids_map.get(1):
        if not create_level_types_for_level(api_base, api_key, level_ids_map[1], ["domain", "category"], extra_headers):
            level_types_all_ok = False
    if level_ids_map.get(2):
        if not create_level_types_for_level(api_base, api_key, level_ids_map[2], ["concept", "principle"], extra_headers):
            level_types_all_ok = False
    if level_ids_map.get(3):
        if not create_level_types_for_level(api_base, api_key, level_ids_map[3], ["example", "application"], extra_headers):
            level_types_all_ok = False
    
    if not level_types_all_ok:
        print("❌ Error: Failed to create all necessary hierarchy level types. Assignments might fail. Aborting.")
        sys.exit(1)
        
    print("Waiting 5 seconds for Dgraph to process level type creations...")
    time.sleep(5)

    # 6. Get data payload (nodes, edges, assignments)
    seed_payload = get_seed_data_payload(hierarchy_id, level_ids_map)

    # Prepare headers for calls to /api/mutate that require hierarchy context
    mutate_context_headers = {"X-Hierarchy-Id": hierarchy_id}
    mutate_context_headers.update(extra_headers)  # Include tenant headers if any

    # 7. Add nodes
    print(f"Attempting to add nodes with X-Hierarchy-Id: {hierarchy_id}")
    if not add_nodes(api_base, api_key, seed_payload["nodes"], extra_headers=mutate_context_headers):
        print("❌ Node creation failed. This might be due to missing X-Hierarchy-Id header or type enforcement. Aborting.")
        sys.exit(1)
    
    # 8. Add edges
    if not add_edges(api_base, api_key, seed_payload["edges"], extra_headers=extra_headers): 
        print("⚠️ Warning: Edge creation failed or partially failed.")

    # 9. Add hierarchy assignments
    print(f"Attempting to add assignments...")
    if not add_hierarchy_assignments(api_base, api_key, seed_payload["hierarchyAssignments"], extra_headers=extra_headers):
        print("❌ Hierarchy assignment creation failed. Aborting.")
        sys.exit(1)

    print("✅ Full seeding process completed.")

# --- Functions adapted from seed_hierarchy.py ---
def drop_all_data(api_base: str, api_key: str, extra_headers: Optional[Dict[str, str]] = None) -> bool:
    """Drop all existing data via admin endpoint. WARNING: This affects ALL namespaces in the cluster."""
    print("Dropping all data...")
    
    # Extract namespace from tenant headers if present
    namespace = None
    tenant_id = None
    if extra_headers and "X-Tenant-Id" in extra_headers:
        tenant_id = extra_headers["X-Tenant-Id"]
        # Map tenant ID to namespace (this should match your backend logic)
        if tenant_id == "default":
            namespace = "0x0"
        elif tenant_id == "test-tenant":
            namespace = "0x1"
        else:
            # For other tenants, you might need to query the tenant manager
            namespace = None
    
    # Build payload with namespace confirmation for safety
    payload = {"target": "remote"}
    if namespace:
        payload["confirmNamespace"] = namespace
        print(f"  🔒 Safety: Confirming namespace {namespace} for tenant {tenant_id}")
    
    resp = call_api(api_base, "/admin/dropAll", api_key, method="POST", payload=payload, extra_headers=extra_headers)
    if not resp["success"]:
        print(f"❌ dropAll failed: {resp['error']}")
        if resp.get("details"): 
            print(f"Details: {resp['details']}")
        if resp.get("data", {}).get("currentNamespace"):
            print(f"Current namespace: {resp['data']['currentNamespace']}")
            print(f"Current tenant: {resp['data']['currentTenant']}")
        return False
    
    # Log success with namespace info
    if namespace:
        print(f"✅ All data dropped in namespace {namespace} (tenant: {tenant_id}).")
    else:
        print("✅ All data dropped.")
    return True

def clear_namespace_data(api_base: str, api_key: str, extra_headers: Optional[Dict[str, str]] = None) -> bool:
    """Safely clear all data within a namespace without affecting other namespaces."""
    print("Clearing all nodes and edges in namespace...")
    
    # Extract tenant info for logging
    tenant_id = extra_headers.get("X-Tenant-Id", "default") if extra_headers else "default"
    
    try:
        # 1. Query all nodes to get their IDs
        print("  1️⃣ Querying all nodes...")
        query_payload = {"query": "{ queryNode { id } }"}
        
        resp = call_api(api_base, "/query", "", method="POST", 
                       payload=query_payload, extra_headers=extra_headers)
        
        if not resp["success"]:
            print(f"❌ Failed to query nodes: {resp.get('error')}")
            return False
        
        nodes = resp.get("data", {}).get("queryNode", [])
        node_count = len(nodes)
        
        if node_count == 0:
            print("  ✅ No nodes found - namespace is already empty")
            return True
        
        print(f"  📊 Found {node_count} nodes to delete")
        
        # 2. Query all edges to get their IDs
        print("  2️⃣ Querying all edges...")
        edge_query_payload = {"query": "{ queryEdge { id from { id } to { id } } }"}
        
        resp = call_api(api_base, "/query", "", method="POST",
                       payload=edge_query_payload, extra_headers=extra_headers)
        
        edges = []
        if resp["success"]:
            edges = resp.get("data", {}).get("queryEdge", [])
        
        edge_count = len(edges)
        print(f"  📊 Found {edge_count} edges to delete")
        
        # 3. Delete all edges first (to avoid referential integrity issues)
        if edges:
            print(f"  3️⃣ Deleting {edge_count} edges...")
            edge_ids = [edge["id"] for edge in edges if "id" in edge]
            
            if edge_ids:
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
                for i in range(0, len(edge_ids), batch_size):
                    batch_ids = edge_ids[i:i + batch_size]
                    variables = {"filter": {"id": batch_ids}}
                    payload = {"mutation": delete_edges_mutation, "variables": variables}
                    
                    resp = call_api(api_base, "/mutate", api_key, method="POST",
                                   payload=payload, extra_headers=extra_headers)
                    
                    if not resp["success"]:
                        print(f"⚠️ Warning: Failed to delete edge batch {i//batch_size + 1}: {resp.get('error')}")
                    else:
                        deleted_count = resp.get("data", {}).get("deleteEdge", {}).get("numUids", 0)
                        print(f"    ✅ Deleted {deleted_count} edges in batch {i//batch_size + 1}")
        
        # 4. Delete all nodes
        print(f"  4️⃣ Deleting {node_count} nodes...")
        node_ids = [node["id"] for node in nodes if "id" in node]
        
        if node_ids:
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
            total_deleted = 0
            for i in range(0, len(node_ids), batch_size):
                batch_ids = node_ids[i:i + batch_size]
                variables = {"filter": {"id": batch_ids}}
                payload = {"mutation": delete_nodes_mutation, "variables": variables}
                
                resp = call_api(api_base, "/mutate", api_key, method="POST",
                               payload=payload, extra_headers=extra_headers)
                
                if not resp["success"]:
                    print(f"⚠️ Warning: Failed to delete node batch {i//batch_size + 1}: {resp.get('error')}")
                else:
                    deleted_count = resp.get("data", {}).get("deleteNode", {}).get("numUids", 0)
                    total_deleted += deleted_count
                    print(f"    ✅ Deleted {deleted_count} nodes in batch {i//batch_size + 1}")
        
        print(f"✅ Namespace cleared: deleted {total_deleted} nodes and {edge_count} edges (tenant: {tenant_id})")
        return True
        
    except Exception as e:
        print(f"❌ Error during namespace data clearing: {e}")
        return False

def push_schema(api_base: str, api_key: str, extra_headers: Optional[Dict[str, str]] = None) -> bool:
    """Push GraphQL schema to Dgraph."""
    print("Pushing GraphQL schema to Dgraph...")
    schema_file_path = Path(__file__).resolve().parent.parent / "schemas" / "default.graphql"
    try:
        schema_text = schema_file_path.read_text()
    except Exception as e:
        print(f"❌ Failed to read schema file {schema_file_path}: {str(e)}")
        return False

    resp = call_api(api_base, "/admin/schema", api_key, method="POST", payload={"schema": schema_text, "target": "remote"}, extra_headers=extra_headers)
    if not resp["success"]:
        print(f"❌ Failed to push GraphQL schema: {resp['error']}")
        if resp.get("details"): print(f"Details: {resp['details']}")
        return False
    print("✅ Schema pushed.")
    return True

def create_single_hierarchy(api_base: str, api_key: str, hierarchy_id: str, hierarchy_name: str, extra_headers: Optional[Dict[str, str]] = None) -> Optional[str]:
    """Create a single hierarchy and return its ID."""
    print(f"Creating hierarchy '{hierarchy_name}'...")
    # Use REST endpoint for hierarchy creation
    resp = call_api(
        api_base,
        "/hierarchy",
        api_key,
        method="POST",
        payload={"id": hierarchy_id, "name": hierarchy_name},
        extra_headers=extra_headers
    )
    if not resp["success"]:
        print(f"❌ Failed to create hierarchy '{hierarchy_name}': {resp['error']}")
        if resp.get("details"): print(f"Details: {resp['details']}")
        return None
    try:
        # Support both REST endpoint and GraphQL response formats
        if isinstance(resp["data"], dict) and "addHierarchy" in resp["data"]:
            created_hier_id = resp["data"]["addHierarchy"]["hierarchy"][0]["id"]
        else:
            created_hier_id = resp["data"].get("id")
        print(f"✅ Created hierarchy '{hierarchy_name}' (id: {created_hier_id})")
        return created_hier_id
    except Exception as e:
        print(f"❌ Error parsing hierarchy creation response: {e}")
        print(f"Full response: {json.dumps(resp, indent=2)}")
        return None

def create_levels_for_hierarchy(api_base: str, api_key: str, hierarchy_id_str: str, levels_data: List[Tuple[int, str]], extra_headers: Optional[Dict[str, str]] = None) -> Dict[int, str]:
    """Create levels for a given hierarchy and return a dict levelNumber->id."""
    level_ids_map = {}  # Stores levelNumber -> id
    print(f"Creating levels for hierarchy ID '{hierarchy_id_str}'...")
    for level_num, label in levels_data:
        # Use the dedicated REST endpoint for creating hierarchy levels
        resp = call_api(
            api_base,
            "/hierarchy/level",
            api_key,
            method="POST",
            payload={
                "hierarchyId": hierarchy_id_str,
                "levelNumber": level_num,
                "label": label
            },
            extra_headers=extra_headers
        )
        if not resp["success"]:
            print(f"❌ Failed to create level {label} (num: {level_num}): {resp['error']}")
            if resp.get("details"): print(f"Details: {resp['details']}")
            # Continue trying to create other levels
            continue
        try:
            # The response should contain the level ID directly
            level_id = resp["data"]["id"]
            level_ids_map[level_num] = level_id
            print(f"✅ Created level '{label}' (levelNumber={level_num}, id={level_id}) for hierarchy {hierarchy_id_str}")
        except (KeyError, IndexError) as e:
            print(f"❌ Error parsing level creation response for {label}: {e}")
            print(f"Full response: {json.dumps(resp, indent=2)}")
    return level_ids_map

def create_level_types_for_level(api_base: str, api_key: str, level_id_str: str, type_names: List[str], extra_headers: Optional[Dict[str, str]] = None) -> bool:
    """Create HierarchyLevelType entries for a given level."""
    print(f"Creating level types for level ID '{level_id_str}' with allowed types: {', '.join(type_names)}...")
    all_successful = True
    for type_name in type_names:
        print(f"  Attempting to allow type '{type_name}' for level '{level_id_str}'...")
        mutation = """
        mutation AddHLT($levelId: ID!, $typeName: String!) {
          addHierarchyLevelType(input: [{level: {id: $levelId}, typeName: $typeName}]) {
            hierarchyLevelType { id }
          }
        }
        """
        variables = {"levelId": level_id_str, "typeName": type_name}
        payload_hlt = {"mutation": mutation, "variables": variables}
        
        resp = call_api(api_base, "/mutate", api_key, method='POST', payload=payload_hlt, extra_headers=extra_headers)

        if not resp["success"] or not resp.get("data", {}).get("addHierarchyLevelType"):
            print(f"❌ Failed to allow type '{type_name}' for level '{level_id_str}': {resp.get('error', 'Unknown error')}")
            if resp.get("details"): print(f"Details: {resp['details']}")
            if resp.get("data", {}).get("errors"): print(f"GraphQL Errors: {resp['data']['errors']}")
            all_successful = False
        else:
            print(f"✅ Successfully allowed type '{type_name}' for level '{level_id_str}'.")
            
    return all_successful
# --- End of functions adapted from seed_hierarchy.py ---

# --- Functions for seeding graph data (nodes, edges, assignments) ---
def add_nodes(api_base: str, api_key: str, nodes: List[Dict[str, Any]], extra_headers: Optional[Dict[str, str]] = None) -> bool:
    """Add nodes to the graph database via the API, with optional extra headers."""
    if not nodes: return True
    print(f"Adding {len(nodes)} nodes...")
    payload = {"mutation": ADD_NODE_MUTATION, "variables": {"input": nodes}}
    response = call_api(api_base, "/mutate", api_key, method='POST', payload=payload, extra_headers=extra_headers)
    if response["success"] and response.get("data", {}).get("addNode"):
        added_nodes = response.get("data", {}).get("addNode", {}).get("node", [])
        print(f"✅ Added {len(added_nodes)} nodes.")
        return True
    else:
        print(f"❌ Failed to add nodes: {response.get('error', 'Unknown error')}")
        if response.get("details"): print(f"Details: {response['details']}")
        if response.get("data", {}).get("errors"): print(f"GraphQL Errors: {response['data']['errors']}")
        return False

def add_edges(api_base: str, api_key: str, edges: List[Dict[str, Any]], extra_headers: Optional[Dict[str, str]] = None) -> bool:
    """Add edges to the graph database via the API, with optional extra headers."""
    if not edges: return True
    print(f"Adding {len(edges)} edges...")
    payload = {"mutation": ADD_EDGE_MUTATION, "variables": {"input": edges}}
    response = call_api(api_base, "/mutate", api_key, method='POST', payload=payload, extra_headers=extra_headers)
    if response["success"] and response.get("data", {}).get("addEdge"):
        added_edges = response.get("data", {}).get("addEdge", {}).get("edge", [])
        print(f"✅ Added {len(added_edges)} edges.")
        return True
    else:
        print(f"❌ Failed to add edges: {response.get('error', 'Unknown error')}")
        if response.get("details"): print(f"Details: {response['details']}")
        if response.get("data", {}).get("errors"): print(f"GraphQL Errors: {response['data']['errors']}")
        return False

def add_hierarchy_assignments(api_base: str, api_key: str, assignments: List[Dict[str, Any]], extra_headers: Optional[Dict[str, str]] = None) -> bool:
    """Add hierarchy assignments via the API, with optional extra headers."""
    if not assignments: return True
    print(f"Adding {len(assignments)} hierarchy assignments...")
    payload = {"mutation": ADD_HIERARCHY_ASSIGNMENT_MUTATION, "variables": {"input": assignments}}
    response = call_api(api_base, "/mutate", api_key, method='POST', payload=payload, extra_headers=extra_headers)
    if response["success"] and response.get("data", {}).get("addHierarchyAssignment"):
        added_assignments = response.get("data", {}).get("addHierarchyAssignment", {}).get("hierarchyAssignment", [])
        print(f"✅ Added {len(added_assignments)} hierarchy assignments.")
        return True
    else:
        print(f"❌ Failed to add hierarchy assignments: {response.get('error', 'Unknown error')}")
        if response.get("details"): print(f"Details: {response['details']}")
        if response.get("data", {}).get("errors"): print(f"GraphQL Errors: {response['data']['errors']}")
        return False
# --- End of functions for seeding graph data ---

def get_seed_data_payload(hierarchy_id_str: str, level_ids_map: Dict[int, str]) -> Dict[str, List[Dict[str, Any]]]:
    """Generate the data payload for nodes, edges, and assignments."""
    
    nodes = [
        # Level 1: Domains & Categories
        {"id": "dom1", "label": "Software Engineering", "type": "domain", "status": "approved", "branch": "main"},
        {"id": "dom2", "label": "Data Science", "type": "domain", "status": "approved", "branch": "main"},
        {"id": "cat1", "label": "Development Methodologies", "type": "category", "status": "approved", "branch": "main"},
        
        # Level 2: Concepts & Principles
        {"id": "con1", "label": "API Design", "type": "concept", "status": "approved", "branch": "main"},
        {"id": "con2", "label": "Microservices", "type": "concept", "status": "approved", "branch": "main"},
        {"id": "con3", "label": "Machine Learning", "type": "concept", "status": "approved", "branch": "main"},
        {"id": "pri1", "label": "REST Principles", "type": "principle", "status": "approved", "branch": "main"},
        
        # Level 3: Examples & Applications
        {"id": "ex1", "label": "GraphQL Implementation", "type": "example", "status": "approved", "branch": "main"},
        {"id": "ex2", "label": "Event Sourcing Pattern", "type": "example", "status": "approved", "branch": "main"},
        {"id": "ex3", "label": "Regression Analysis", "type": "example", "status": "approved", "branch": "main"},
        {"id": "app1", "label": "Docker Container Setup", "type": "application", "status": "approved", "branch": "main"},
    ]

    edges = [
        # Connect domains/categories to concepts/principles
        {"from": {"id": "dom1"}, "fromId": "dom1", "to": {"id": "con1"}, "toId": "con1", "type": "simple"},
        {"from": {"id": "dom1"}, "fromId": "dom1", "to": {"id": "con2"}, "toId": "con2", "type": "simple"},
        {"from": {"id": "dom2"}, "fromId": "dom2", "to": {"id": "con3"}, "toId": "con3", "type": "simple"},
        {"from": {"id": "cat1"}, "fromId": "cat1", "to": {"id": "pri1"}, "toId": "pri1", "type": "simple"},
        
        # Connect concepts/principles to examples/applications
        {"from": {"id": "con1"}, "fromId": "con1", "to": {"id": "ex1"}, "toId": "ex1", "type": "simple"},
        {"from": {"id": "con2"}, "fromId": "con2", "to": {"id": "ex2"}, "toId": "ex2", "type": "simple"},
        {"from": {"id": "con3"}, "fromId": "con3", "to": {"id": "ex3"}, "toId": "ex3", "type": "simple"},
        {"from": {"id": "pri1"}, "fromId": "pri1", "to": {"id": "app1"}, "toId": "app1", "type": "simple"},
        
        # Cross-connections within levels
        {"from": {"id": "con1"}, "fromId": "con1", "to": {"id": "con2"}, "toId": "con2", "type": "simple"}
    ]

    hierarchy_assignments = []
    if level_ids_map.get(1) and level_ids_map.get(2) and level_ids_map.get(3):
        hierarchy_assignments = [
            # Level 1 assignments
            {"node": {"id": "dom1"}, "hierarchy": {"id": hierarchy_id_str}, "level": {"id": level_ids_

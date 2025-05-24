#!/usr/bin/env python3
"""
Seed the Dgraph database with a complete, clean graph.

This tool performs the following actions:
1. Drops all existing data and schema from Dgraph.
2. Pushes the GraphQL schema (schemas/default.graphql).
3. Creates a single, predefined hierarchy with levels and level types.
4. Adds sample nodes and edges.
5. Assigns these nodes to the created hierarchy and its levels.
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

# --- Functions adapted from seed_hierarchy.py ---
def drop_all_data(api_base: str, api_key: str) -> bool:
    """Drop all existing data via admin endpoint."""
    print("Dropping all data...")
    resp = call_api(api_base, "/admin/dropAll", api_key, method="POST", payload={"target": "remote"})
    if not resp["success"]:
        print(f"❌ dropAll failed: {resp['error']}")
        if resp.get("details"): print(f"Details: {resp['details']}")
        return False
    print("✅ All data dropped.")
    return True

def push_schema(api_base: str, api_key: str) -> bool:
    """Push GraphQL schema to Dgraph."""
    print("Pushing GraphQL schema to Dgraph...")
    schema_file_path = Path(__file__).resolve().parent.parent / "schemas" / "default.graphql"
    try:
        schema_text = schema_file_path.read_text()
    except Exception as e:
        print(f"❌ Failed to read schema file {schema_file_path}: {str(e)}")
        return False

    resp = call_api(api_base, "/admin/schema", api_key, method="POST", payload={"schema": schema_text, "target": "remote"})
    if not resp["success"]:
        print(f"❌ Failed to push GraphQL schema: {resp['error']}")
        if resp.get("details"): print(f"Details: {resp['details']}")
        return False
    print("✅ Schema pushed.")
    return True

def create_single_hierarchy(api_base: str, api_key: str, hierarchy_id: str, hierarchy_name: str) -> Optional[str]:
    """Create a single hierarchy and return its ID."""
    print(f"Creating hierarchy '{hierarchy_name}'...")
    mutation = '''
    mutation AddHierarchy($name: String!) {
      addHierarchy(input: [{ name: $name }]) {
        hierarchy { id name }
      }
    }
    '''
    # Use REST endpoint for hierarchy creation
    resp = call_api(
        api_base,
        "/hierarchy",
        api_key,
        method="POST",
        payload={"id": hierarchy_id, "name": hierarchy_name}
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
    except (KeyError, IndexError) as e:
        print(f"❌ Error parsing hierarchy creation response: {e}")
        print(f"Full response: {json.dumps(resp, indent=2)}")
        return None


def create_levels_for_hierarchy(api_base: str, api_key: str, hierarchy_id_str: str, levels_data: List[Tuple[int, str]]) -> Dict[int, str]:
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
            }
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

def create_level_types_for_level(api_base: str, api_key: str, level_id_str: str, type_names: List[str]) -> bool:
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
        
        resp = call_api(api_base, "/mutate", api_key, method='POST', payload=payload_hlt)

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
    # Edges typically don't need X-Hierarchy-Id, but pass if provided for consistency or future use
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
            {"node": {"id": "dom1"}, "hierarchy": {"id": hierarchy_id_str}, "level": {"id": level_ids_map[1]}},
            {"node": {"id": "dom2"}, "hierarchy": {"id": hierarchy_id_str}, "level": {"id": level_ids_map[1]}},
            {"node": {"id": "cat1"}, "hierarchy": {"id": hierarchy_id_str}, "level": {"id": level_ids_map[1]}},
            
            # Level 2 assignments
            {"node": {"id": "con1"}, "hierarchy": {"id": hierarchy_id_str}, "level": {"id": level_ids_map[2]}},
            {"node": {"id": "con2"}, "hierarchy": {"id": hierarchy_id_str}, "level": {"id": level_ids_map[2]}},
            {"node": {"id": "con3"}, "hierarchy": {"id": hierarchy_id_str}, "level": {"id": level_ids_map[2]}},
            {"node": {"id": "pri1"}, "hierarchy": {"id": hierarchy_id_str}, "level": {"id": level_ids_map[2]}},
            
            # Level 3 assignments
            {"node": {"id": "ex1"}, "hierarchy": {"id": hierarchy_id_str}, "level": {"id": level_ids_map[3]}},
            {"node": {"id": "ex2"}, "hierarchy": {"id": hierarchy_id_str}, "level": {"id": level_ids_map[3]}},
            {"node": {"id": "ex3"}, "hierarchy": {"id": hierarchy_id_str}, "level": {"id": level_ids_map[3]}},
            {"node": {"id": "app1"}, "hierarchy": {"id": hierarchy_id_str}, "level": {"id": level_ids_map[3]}},
        ]
    else:
        print("⚠️ Warning: Not all level IDs were found. Hierarchy assignments will be incomplete or skipped.")
        if not level_ids_map.get(1): print("  - Missing ID for level 1 (Domains)")
        if not level_ids_map.get(2): print("  - Missing ID for level 2 (Key Concepts)")
        if not level_ids_map.get(3): print("  - Missing ID for level 3 (Detailed Examples)")


    return {
        "nodes": nodes,
        "edges": edges,
        "hierarchyAssignments": hierarchy_assignments
    }

def main():
    """Main entry point for the script."""
    parser = argparse.ArgumentParser(description="Seed Dgraph with a clean, single-hierarchy graph via API")
    parser.add_argument(
        "--api-base", "-b",
        default=os.environ.get("MIMS_API_URL", DEFAULT_API_BASE),
        help=f"API base URL (default: {DEFAULT_API_BASE})"
    )
    parser.add_argument(
        "--api-key", "-k",
        default=os.environ.get("MIMS_ADMIN_API_KEY", ""),
        help="Admin API Key (default: from MIMS_ADMIN_API_KEY environment variable)"
    )
    # --target argument is removed as we always target 'local' for this consolidated script.
    
    args = parser.parse_args()

    if not args.api_key:
        print("❌ Error: Admin API key is required. Set MIMS_ADMIN_API_KEY environment variable or use --api-key.")
        sys.exit(1)

    api_base_url = args.api_base
    api_key_val = args.api_key

    # 1. Drop all existing data and schema
    if not drop_all_data(api_base_url, api_key_val):
        sys.exit(1)

    # 2. Push GraphQL schema
    if not push_schema(api_base_url, api_key_val):
        sys.exit(1)
    
    print("Waiting 15 seconds for Dgraph to process the schema...")
    time.sleep(15)

    # 3. Create a single hierarchy
    hierarchy_id = create_single_hierarchy(api_base_url, api_key_val, DEFAULT_HIERARCHY_ID, DEFAULT_HIERARCHY_NAME)
    if not hierarchy_id:
        print("❌ Failed to create the primary hierarchy. Aborting.")
        sys.exit(1)

    # 4. Create levels for this hierarchy
    levels_data = [
        (1, "Domains"),
        (2, "Key Concepts"),
        (3, "Detailed Examples")
    ]
    level_ids_map = create_levels_for_hierarchy(api_base_url, api_key_val, hierarchy_id, levels_data)
    if len(level_ids_map) != len(levels_data):
        print("❌ Error: Failed to create all hierarchy levels. Aborting.")
        sys.exit(1)
    
    # 5. Create level types for these levels (two types per level)
    level_types_all_ok = True
    if level_ids_map.get(1):
        if not create_level_types_for_level(api_base_url, api_key_val, level_ids_map[1], ["domain", "category"]):
            level_types_all_ok = False
    if level_ids_map.get(2):
        if not create_level_types_for_level(api_base_url, api_key_val, level_ids_map[2], ["concept", "principle"]):
            level_types_all_ok = False
    if level_ids_map.get(3):
        if not create_level_types_for_level(api_base_url, api_key_val, level_ids_map[3], ["example", "application"]):
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

    # 7. Add nodes
    print(f"Attempting to add nodes with X-Hierarchy-Id: {hierarchy_id}")
    if not add_nodes(api_base_url, api_key_val, seed_payload["nodes"], extra_headers=mutate_context_headers):
        print("❌ Node creation failed. This might be due to missing X-Hierarchy-Id header or type enforcement. Aborting.")
        sys.exit(1)
    
    # 8. Add edges
    if not add_edges(api_base_url, api_key_val, seed_payload["edges"]): 
        print("⚠️ Warning: Edge creation failed or partially failed.")

    # 9. Add hierarchy assignments
    print(f"Attempting to add assignments...")
    if not add_hierarchy_assignments(api_base_url, api_key_val, seed_payload["hierarchyAssignments"]):
        print("❌ Hierarchy assignment creation failed. Aborting.")
        sys.exit(1)

    print("✅ Full seeding process completed.")
    sys.exit(0)

if __name__ == "__main__":
    main()

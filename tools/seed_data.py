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
    resp = call_api(api_base, "/admin/dropAll", api_key, method="POST", payload={"target": "local"})
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

    resp = call_api(api_base, "/admin/schema", api_key, method="POST", payload={"schema": schema_text, "target": "local"})
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
    # Skip level types creation for now as it's not critical for the basic functionality
    print(f"Skipping level types creation for level ID '{level_id_str}'...")
    return True
# --- End of functions adapted from seed_hierarchy.py ---


# --- Functions for seeding graph data (nodes, edges, assignments) ---
def add_nodes(api_base: str, api_key: str, nodes: List[Dict[str, Any]]) -> bool:
    """Add nodes to the graph database via the API."""
    if not nodes: return True
    print(f"Adding {len(nodes)} nodes...")
    payload = {"mutation": ADD_NODE_MUTATION, "variables": {"input": nodes}}
    response = call_api(api_base, "/mutate", api_key, method='POST', payload=payload)
    if response["success"]:
        added_nodes = response.get("data", {}).get("addNode", {}).get("node", [])
        print(f"✅ Added {len(added_nodes)} nodes.")
        # for node in added_nodes: print(f"  - Node ID: {node.get('id')}, Label: {node.get('label')}")
        return True
    else:
        print(f"❌ Failed to add nodes: {response['error']}")
        if response.get("details"): print(f"Details: {response['details']}")
        return False

def add_edges(api_base: str, api_key: str, edges: List[Dict[str, Any]]) -> bool:
    """Add edges to the graph database via the API."""
    if not edges: return True
    print(f"Adding {len(edges)} edges...")
    payload = {"mutation": ADD_EDGE_MUTATION, "variables": {"input": edges}}
    response = call_api(api_base, "/mutate", api_key, method='POST', payload=payload)
    if response["success"]:
        added_edges = response.get("data", {}).get("addEdge", {}).get("edge", [])
        print(f"✅ Added {len(added_edges)} edges.")
        return True
    else:
        print(f"❌ Failed to add edges: {response['error']}")
        if response.get("details"): print(f"Details: {response['details']}")
        return False

def add_hierarchy_assignments(api_base: str, api_key: str, assignments: List[Dict[str, Any]]) -> bool:
    """Add hierarchy assignments via the API."""
    if not assignments: return True
    print(f"Adding {len(assignments)} hierarchy assignments...")
    payload = {"mutation": ADD_HIERARCHY_ASSIGNMENT_MUTATION, "variables": {"input": assignments}}
    response = call_api(api_base, "/mutate", api_key, method='POST', payload=payload)
    if response["success"]:
        added_assignments = response.get("data", {}).get("addHierarchyAssignment", {}).get("hierarchyAssignment", [])
        print(f"✅ Added {len(added_assignments)} hierarchy assignments.")
        return True
    else:
        print(f"❌ Failed to add hierarchy assignments: {response['error']}")
        if response.get("details"): print(f"Details: {response['details']}")
        return False
# --- End of functions for seeding graph data ---

def get_seed_data_payload(hierarchy_id_str: str, level_ids_map: Dict[int, str]) -> Dict[str, List[Dict[str, Any]]]:
    """Generate the data payload for nodes, edges, and assignments."""
    
    nodes = [
        {"id": "dom1", "label": "Software Engineering", "type": "DomainNode", "status": "approved", "branch": "main"},
        {"id": "dom2", "label": "Data Science", "type": "DomainNode", "status": "approved", "branch": "main"},
        {"id": "con1", "label": "API Design", "type": "ConceptNode", "status": "approved", "branch": "main"},
        {"id": "con2", "label": "Microservices", "type": "ConceptNode", "status": "approved", "branch": "main"},
        {"id": "con3", "label": "Machine Learning", "type": "ConceptNode", "status": "approved", "branch": "main"},
        {"id": "ex1", "label": "REST API Best Practices", "type": "ExampleNode", "status": "approved", "branch": "main"},
        {"id": "ex2", "label": "Event Sourcing Pattern", "type": "ExampleNode", "status": "approved", "branch": "main"},
        {"id": "ex3", "label": "Regression Analysis Example", "type": "ExampleNode", "status": "approved", "branch": "main"}
    ]

    edges = [
        {"from": {"id": "dom1"}, "fromId": "dom1", "to": {"id": "con1"}, "toId": "con1", "type": "has_concept"},
        {"from": {"id": "dom1"}, "fromId": "dom1", "to": {"id": "con2"}, "toId": "con2", "type": "has_concept"},
        {"from": {"id": "dom2"}, "fromId": "dom2", "to": {"id": "con3"}, "toId": "con3", "type": "has_concept"},
        {"from": {"id": "con1"}, "fromId": "con1", "to": {"id": "ex1"}, "toId": "ex1", "type": "has_example"},
        {"from": {"id": "con2"}, "fromId": "con2", "to": {"id": "ex2"}, "toId": "ex2", "type": "has_example"},
        {"from": {"id": "con3"}, "fromId": "con3", "to": {"id": "ex3"}, "toId": "ex3", "type": "has_example"},
        {"from": {"id": "con1"}, "fromId": "con1", "to": {"id": "con2"}, "toId": "con2", "type": "related_concept"}
    ]

    hierarchy_assignments = []
    if level_ids_map.get(1) and level_ids_map.get(2) and level_ids_map.get(3):
        hierarchy_assignments = [
            {"node": {"id": "dom1"}, "hierarchy": {"id": hierarchy_id_str}, "level": {"id": level_ids_map[1]}},
            {"node": {"id": "dom2"}, "hierarchy": {"id": hierarchy_id_str}, "level": {"id": level_ids_map[1]}},
            {"node": {"id": "con1"}, "hierarchy": {"id": hierarchy_id_str}, "level": {"id": level_ids_map[2]}},
            {"node": {"id": "con2"}, "hierarchy": {"id": hierarchy_id_str}, "level": {"id": level_ids_map[2]}},
            {"node": {"id": "con3"}, "hierarchy": {"id": hierarchy_id_str}, "level": {"id": level_ids_map[2]}},
            {"node": {"id": "ex1"}, "hierarchy": {"id": hierarchy_id_str}, "level": {"id": level_ids_map[3]}},
            {"node": {"id": "ex2"}, "hierarchy": {"id": hierarchy_id_str}, "level": {"id": level_ids_map[3]}},
            {"node": {"id": "ex3"}, "hierarchy": {"id": hierarchy_id_str}, "level": {"id": level_ids_map[3]}}
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
    
    # 5. (Optional) Create level types for these levels - skipping for now
    if level_ids_map.get(1):
        create_level_types_for_level(api_base_url, api_key_val, level_ids_map[1], ["DomainNode"])
    if level_ids_map.get(2):
        create_level_types_for_level(api_base_url, api_key_val, level_ids_map[2], ["ConceptNode"])
    if level_ids_map.get(3):
        create_level_types_for_level(api_base_url, api_key_val, level_ids_map[3], ["ExampleNode"])

    # 6. Get data payload (nodes, edges, assignments)
    seed_payload = get_seed_data_payload(hierarchy_id, level_ids_map)

    # 7. Add nodes
    if not add_nodes(api_base_url, api_key_val, seed_payload["nodes"]):
        # Non-fatal, try to continue if possible
        print("⚠️ Warning: Node creation failed or partially failed.")
    
    # 8. Add edges
    if not add_edges(api_base_url, api_key_val, seed_payload["edges"]):
        # Non-fatal
        print("⚠️ Warning: Edge creation failed or partially failed.")

    # 9. Add hierarchy assignments
    if not add_hierarchy_assignments(api_base_url, api_key_val, seed_payload["hierarchyAssignments"]):
        print("⚠️ Warning: Hierarchy assignment creation failed or partially failed.")

    print("✅ Full seeding process completed.")
    sys.exit(0)

if __name__ == "__main__":
    main()

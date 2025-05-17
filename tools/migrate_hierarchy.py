#!/usr/bin/env python3
"""
Migration script to convert legacy Node.level to new multi-hierarchy assignments.
Creates a default "Legacy Hierarchy," corresponding levels, and hierarchy assignments.
"""

import os
import sys
import json
from pathlib import Path

# Ensure project root is on the Python path
sys.path.append(str(Path(__file__).resolve().parent.parent))
from tools.api_client import call_api

# Configuration
API_BASE = os.environ.get("MIMS_API_URL", "http://localhost:3000/api")
API_KEY = os.environ.get("MIMS_ADMIN_API_KEY", "")

if not API_KEY:
    print("❌ Error: MIMS_ADMIN_API_KEY environment variable is required.")
    sys.exit(1)

def fetch_nodes_with_levels():
    """Fetch all existing nodes and their legacy level via DQL predicate query."""
    import requests
    DGRAPH_BASE_URL = os.environ.get("DGRAPH_BASE_URL", "http://localhost:8080")
    dql_query = """
    {
      nodes(func: has(level)) {
        id
        level
      }
    }
    """
    try:
        res = requests.post(f"{DGRAPH_BASE_URL}/query", json={"query": dql_query})
        res.raise_for_status()
        data = res.json()
    except Exception as e:
        print("❌ Failed to fetch nodes with DQL:", str(e))
        sys.exit(1)
    nodes = data.get("nodes", [])
    print(f"Fetched {len(nodes)} nodes with legacy levels via DQL.")
    return [{"id": n.get("id"), "level": n.get("level", 1)} for n in nodes]

def create_hierarchy(name="Legacy Hierarchy"):
    """Create a default hierarchy and return its new ID."""
    mutation = f'''
    mutation {{
      addHierarchy(input: [{{ name: "{name}" }}]) {{
        hierarchy {{ id name }}
      }}
    }}
    '''
    response = call_api(API_BASE, "/mutate", API_KEY, method="POST", payload={"mutation": mutation})
    if not response["success"]:
        print("❌ Failed to create hierarchy:", response["error"])
        sys.exit(1)
    hierarchy = response["data"]["addHierarchy"]["hierarchy"][0]
    print(f"Created hierarchy '{hierarchy['name']}' with ID {hierarchy['id']}")
    return hierarchy["id"]

def create_levels(hierarchy_id, levels):
    """Create HierarchyLevel entries for each unique legacy level."""
    level_ids = {}
    for lvl in sorted(levels):
        mutation = f'''
        mutation {{
          addHierarchyLevel(input: [{{ hierarchy: {{ id: "{hierarchy_id}" }}, levelNumber: {lvl} }}]) {{
            hierarchyLevel {{ id levelNumber }}
          }}
        }}
        '''
        response = call_api(API_BASE, "/mutate", API_KEY, method="POST", payload={"mutation": mutation})
        if not response["success"]:
            print(f"❌ Failed to create level {lvl}:", response["error"])
            sys.exit(1)
        hl = response["data"]["addHierarchyLevel"]["hierarchyLevel"][0]
        print(f"Created HierarchyLevel number={hl['levelNumber']} id={hl['id']}")
        level_ids[lvl] = hl["id"]
    return level_ids

def create_assignments(nodes, hierarchy_id):
    """Batch-create HierarchyAssignment entries associating nodes with levels."""
    assignments = [
        {"node": {"id": node["id"]}, "hierarchy": {"id": hierarchy_id}, "levelNumber": node.get("level", 1)}
        for node in nodes
    ]
    chunk_size = 50
    for i in range(0, len(assignments), chunk_size):
        chunk = assignments[i:i + chunk_size]
        mutation_input = json.dumps(chunk)
        mutation = f'''
        mutation {{
          addHierarchyAssignment(input: {mutation_input}) {{
            hierarchyAssignment {{ id node {{ id }} levelNumber }}
          }}
        }}
        '''
        response = call_api(API_BASE, "/mutate", API_KEY, method="POST", payload={"mutation": mutation})
        if not response["success"]:
            print("❌ Failed to create assignments chunk:", response["error"])
            sys.exit(1)
        print(f"Created {len(chunk)} HierarchyAssignments.")
    print("All HierarchyAssignments created.")

def main():
    nodes = fetch_nodes_with_levels()
    if not nodes:
        print("No nodes found to migrate. Exiting.")
        return
    unique_levels = {node.get("level", 1) for node in nodes}
    hierarchy_id = create_hierarchy()
    create_levels(hierarchy_id, unique_levels)
    create_assignments(nodes, hierarchy_id)
    print("✅ Legacy hierarchy migration completed successfully.")

if __name__ == "__main__":
    main()

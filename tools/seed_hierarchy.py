#!/usr/bin/env python3
"""
Seed script to drop existing data and create hierarchies, levels, and level types.

Usage:
  export MIMS_API_URL="http://localhost:3000/api"
  export MIMS_ADMIN_API_KEY="your_admin_key"
  tools/seed_hierarchy.py
"""

import os
import sys
import json
from pathlib import Path

# Ensure project root on Python path
sys.path.append(str(Path(__file__).resolve().parent.parent))
from tools.api_client import call_api

API_BASE = os.environ.get("MIMS_API_URL", "http://localhost:3000/api")
API_KEY = os.environ.get("MIMS_ADMIN_API_KEY", "")
if not API_KEY:
    print("❌ Error: MIMS_ADMIN_API_KEY environment variable is required.")
    sys.exit(1)

def drop_all_data():
    """Drop all existing data via admin endpoint."""
    print("Dropping all data...")
    resp = call_api(API_BASE, "/admin/dropAll", API_KEY, method="POST", payload={"target": "local"})
    if not resp["success"]:
        print("❌ dropAll failed:", resp["error"])
        sys.exit(1)
    print("✅ All data dropped.")

def create_hierarchies(names):
    """Create hierarchies and return a dict name->id."""
    ids = {}
    for name in names:
        mutation = f'''
        mutation {{
          addHierarchy(input: [{{ name: "{name}" }}]) {{
            hierarchy {{ id name }}
          }}
        }}
        '''
        resp = call_api(API_BASE, "/mutate", API_KEY, method="POST", payload={"mutation": mutation})
        if not resp["success"]:
            print(f"❌ Failed to create hierarchy '{name}':", resp["error"])
            if resp.get("details"):
                print("Details:", resp["details"])
            sys.exit(1)
        hier = resp["data"]["addHierarchy"]["hierarchy"][0]
        ids[name] = hier["id"]
        print(f"Created hierarchy '{name}' (id: {hier['id']})")
    return ids

def create_levels(hierarchy_id, levels):
    """
    Create levels for a given hierarchy.
    levels: list of tuples (levelNumber, label)
    Returns dict levelNumber->id.
    """
    ids = {}
    for level_num, label in levels:
        mutation = f'''
        mutation {{
          addHierarchyLevel(input: [{{ hierarchy: {{ id: "{hierarchy_id}" }}, levelNumber: {level_num}, label: "{label}" }}]) {{
            hierarchyLevel {{ id levelNumber label }}
          }}
        }}
        '''
        resp = call_api(API_BASE, "/mutate", API_KEY, method="POST", payload={"mutation": mutation})
        if not resp["success"]:
            print(f"❌ Failed to create level {label}:", resp["error"])
            sys.exit(1)
        lvl = resp["data"]["addHierarchyLevel"]["hierarchyLevel"][0]
        ids[level_num] = lvl["id"]
        print(f"Created level '{label}' (levelNumber={level_num}, id={lvl['id']})")
    return ids

def create_level_types(level_id, type_names):
    """
    Create HierarchyLevelType entries for a given level.
    type_names: list of strings
    """
    for type_name in type_names:
        mutation = f'''
        mutation {{
          addHierarchyLevelType(input: [{{ level: {{ id: "{level_id}" }}, typeName: "{type_name}" }}]) {{
            hierarchyLevelType {{ id typeName }}
          }}
        }}
        '''
        resp = call_api(API_BASE, "/mutate", API_KEY, method="POST", payload={"mutation": mutation})
        if not resp["success"]:
            print(f"❌ Failed to create levelType '{type_name}':", resp["error"])
            sys.exit(1)
        lt = resp["data"]["addHierarchyLevelType"]["hierarchyLevelType"][0]
        print(f"Created levelType '{type_name}' (id: {lt['id']})")

def main():
    # 1. Drop all existing data
    drop_all_data()

    # Push GraphQL schema to Dgraph (schema reset after drop)
    print("Pushing GraphQL schema to Dgraph...")
    schema_path = Path(__file__).resolve().parent.parent / "schemas" / "default.graphql"
    schema_text = schema_path.read_text()
    resp = call_api(API_BASE, "/admin/schema", API_KEY, method="POST", payload={"schema": schema_text})
    if not resp["success"]:
        print("❌ Failed to push GraphQL schema:", resp["error"])
        if resp.get("details"):
            print("Details:", resp["details"])
        sys.exit(1)
    print("✅ Schema pushed.")

    # 2. Create hierarchies
    hierarchy_names = ["hierarchy1", "hierarchy2"]
    hier_ids = create_hierarchies(hierarchy_names)

    # 3. Create levels with labels
    # hierarchy1: levels 1->"1.1", 2->"1.2", 3->"1.3"
    levels_h1 = [(1, "1.1"), (2, "1.2"), (3, "1.3")]
    h1_level_ids = create_levels(hier_ids["hierarchy1"], levels_h1)

    # hierarchy2: levels 1->"2.1", 2->"2.2", 3->"2.3"
    levels_h2 = [(1, "2.1"), (2, "2.2"), (3, "2.3")]
    h2_level_ids = create_levels(hier_ids["hierarchy2"], levels_h2)

    # 4. Create level types
    # For hierarchy1 level 1 -> types ["type1a", "type1b"]
    create_level_types(h1_level_ids[1], ["type1a", "type1b"])

    # For hierarchy2 level 2 -> types ["type2b", "type2c", "type2d"]
    create_level_types(h2_level_ids[2], ["type2b", "type2c", "type2d"])

    print("✅ Seeding complete.")

if __name__ == "__main__":
    main()

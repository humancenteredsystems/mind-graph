#!/usr/bin/env python3
"""
Seed the Dgraph database with test data.

This tool adds test nodes and edges to the graph database using GraphQL mutations.
"""
import argparse
import os # Import os to read environment variables
import sys
import json
from pathlib import Path
from typing import Dict, Any, List, Optional

# Add the parent directory to the Python path to be able to import tools
sys.path.append(os.path.join(os.path.dirname(__file__), '..'))
from tools.api_client import call_api # Import the shared API client

# Default API base URL (override with MIMS_API_URL env var)
DEFAULT_API_BASE = "http://localhost:3000/api"

# Sample test data
DEFAULT_TEST_DATA = {
    "nodes": [
        {"id": "node1", "label": "Concept 1", "type": "concept", "status": "approved", "branch": "main"},
        {"id": "node2", "label": "Concept 2", "type": "concept", "status": "approved", "branch": "main"},
        {"id": "node3", "label": "Concept 3", "type": "concept", "status": "approved", "branch": "main"},
        {"id": "node4", "label": "Example 1", "type": "example", "status": "approved", "branch": "main"},
        {"id": "node5", "label": "Question 1", "type": "question", "status": "pending", "branch": "user1"}
    ],
    "edges": [
        # Note: Dgraph GraphQL requires 'from' and 'to' to be objects with 'id'
        # Also include fromId and toId scalar fields
        {"from": {"id": "node1"}, "fromId": "node1", "to": {"id": "node2"}, "toId": "node2", "type": "related"},
        {"from": {"id": "node1"}, "fromId": "node1", "to": {"id": "node3"}, "toId": "node3", "type": "parent"},
        {"from": {"id": "node2"}, "fromId": "node2", "to": {"id": "node4"}, "toId": "node4", "type": "has_example"},
        {"from": {"id": "node3"}, "fromId": "node3", "to": {"id": "node5"}, "toId": "node5", "type": "has_question"}
    ]
}

# GraphQL mutation templates
ADD_NODE_MUTATION = """
mutation AddNode($input: [AddNodeInput!]!) {
  addNode(input: $input) {
    node {
      id
      label
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

def add_nodes(nodes: List[Dict[str, Any]], api_base: str, api_key: str) -> bool:
    """Add nodes to the graph database via the API."""
    print(f"Adding {len(nodes)} nodes via API at {api_base}...")
    payload = {
        "mutation": ADD_NODE_MUTATION,
        "variables": {"input": nodes}
    }
    response = call_api(api_base, "/mutate", api_key, method='POST', payload=payload)

    if response["success"]:
        added_nodes = response.get("data", {}).get("addNode", {}).get("node", [])
        print(f"✅ Added {len(added_nodes)} nodes.")
        return True
    else:
        print(f"❌ Failed to add nodes: {response['error']}")
        if response.get("details"):
            print("Details:", response["details"])
        return False

def add_edges(edges: List[Dict[str, Any]], api_base: str, api_key: str) -> bool:
    """Add edges to the graph database via the API."""
    print(f"Adding {len(edges)} edges via API at {api_base}...")
    payload = {
        "mutation": ADD_EDGE_MUTATION,
        "variables": {"input": edges}
    }
    response = call_api(api_base, "/mutate", api_key, method='POST', payload=payload)

    if response["success"]:
        added_edges = response.get("data", {}).get("addEdge", {}).get("edge", [])
        print(f"✅ Added {len(added_edges)} edges.")
        return True
    else:
        print(f"❌ Failed to add edges: {response['error']}")
        if response.get("details"):
            print("Details:", response["details"])
        return False

def main():
    """Main entry point for the script."""
    parser = argparse.ArgumentParser(description="Seed the Dgraph database with test data via API")
    parser.add_argument(
        "--data", "-d",
        help="Path to JSON file with test data (default: use built-in test data)"
    )
    parser.add_argument(
        "--target", "-t",
        choices=["local", "remote"], # Initially support local and remote
        required=True, # Target is now required
        help="Target environment to seed data to ('local' or 'remote')"
    )
    parser.add_argument(
        "--api-base", "-b",
        default=os.environ.get("MIMS_API_URL", DEFAULT_API_BASE),
        help=f"API base URL for the target environment (default: {DEFAULT_API_BASE})"
    )
    parser.add_argument(
        "--api-key", "-k",
        default=os.environ.get("MIMS_ADMIN_API_KEY", ""),
        help="Admin API Key (default: from MIMS_ADMIN_API_KEY environment variable)"
    )
    
    args = parser.parse_args()

    # Check for API key
    if not args.api_key:
        print("❌ Error: Admin API key is required. Set MIMS_ADMIN_API_KEY environment variable or use --api-key.")
        return 1

    # Determine API base URL based on target (if not explicitly provided)
    # If --api-base is provided, it overrides the default based on target.
    api_base_url = args.api_base
    # Note: A more sophisticated approach might involve looking up URLs based on target
    # from a config file or environment variables specific to local/remote APIs.
    # For now, we rely on the user providing the correct --api-base for the target.

    # Load test data
    if args.data:
        try:
            data_path = Path(args.data).resolve()
            with open(data_path, "r", encoding="utf-8") as f:
                test_data = json.load(f)
            print(f"Loaded test data from {data_path}")
        except Exception as e:
            print(f"❌ Failed to load test data file '{args.data}': {str(e)}")
            return 1
    else:
        test_data = DEFAULT_TEST_DATA
        print("Using built-in test data")

    # Add nodes
    nodes_to_add = test_data.get("nodes", [])
    if nodes_to_add:
        if not add_nodes(nodes_to_add, api_base_url, args.api_key):
            return 1
    else:
        print("No nodes found in test data.")

    # Add edges
    edges_to_add = test_data.get("edges", [])
    if edges_to_add:
        if not add_edges(edges_to_add, api_base_url, args.api_key):
            return 1
    else:
        print("No edges found in test data.")

    print("✅ Test data seeding process completed.")
    return 0

if __name__ == "__main__":
    sys.exit(main())

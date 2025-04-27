#!/usr/bin/env python3
"""
Seed the Dgraph database with test data.

This tool adds test nodes and edges to the graph database using GraphQL mutations.
"""
import argparse
import sys
import json
import requests
from pathlib import Path
from typing import Dict, Any, List, Optional

# --- Constants moved from utils.py ---
DEFAULT_ENDPOINT = "http://localhost:8080/graphql"
# --- End Constants ---

# --- execute_graphql logic moved here ---
def _execute_graphql_http(
    query: str,
    variables: Optional[Dict[str, Any]] = None,
    endpoint: str = DEFAULT_ENDPOINT
) -> Dict[str, Any]:
    """Internal function to execute GraphQL via HTTP POST."""
    headers = {"Content-Type": "application/json"}
    payload = {"query": query}
    if variables:
        payload["variables"] = variables

    try:
        response = requests.post(endpoint, json=payload, headers=headers)
        response.raise_for_status()
        return response.json()
    except requests.RequestException as e:
        print(f"❌ GraphQL request failed: {str(e)}") # Replaced logger
        if hasattr(response, 'text'):
            print(f"Response: {response.text}") # Replaced logger
        # Re-raise the exception to be caught by the calling function
        raise
    except Exception as e:
        print(f"❌ An unexpected error occurred during GraphQL request: {str(e)}") # Replaced logger
        raise
# --- End execute_graphql logic ---


# Sample test data
DEFAULT_TEST_DATA = {
    "nodes": [
        {"id": "node1", "label": "Concept 1", "type": "concept", "level": 1, "status": "approved", "branch": "main"},
        {"id": "node2", "label": "Concept 2", "type": "concept", "level": 1, "status": "approved", "branch": "main"},
        {"id": "node3", "label": "Concept 3", "type": "concept", "level": 2, "status": "approved", "branch": "main"},
        {"id": "node4", "label": "Example 1", "type": "example", "level": 2, "status": "approved", "branch": "main"},
        {"id": "node5", "label": "Question 1", "type": "question", "level": 3, "status": "pending", "branch": "user1"}
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

def add_nodes(nodes: List[Dict[str, Any]], endpoint: str) -> bool:
    """Add nodes to the graph database."""
    try:
        variables = {"input": nodes}
        result = _execute_graphql_http(ADD_NODE_MUTATION, variables, endpoint) # Use internal function

        if "errors" in result:
            error_messages = [err.get('message', 'Unknown error') for err in result['errors']]
            print(f"❌ Failed to add nodes: {'; '.join(error_messages)}") # Replaced logger
            return False

        added_nodes = result.get("data", {}).get("addNode", {}).get("node", [])
        print(f"Added {len(added_nodes)} nodes") # Replaced logger
        return True
    except Exception as e:
        # Error already printed by _execute_graphql_http
        print(f"Error during node addition process.")
        return False

def add_edges(edges: List[Dict[str, Any]], endpoint: str) -> bool:
    """Add edges to the graph database."""
    try:
        # Ensure edge 'from' and 'to' are formatted correctly for GraphQL input
        # The input data should already include fromId and toId
        variables = {"input": edges} # Use edges directly as they should be formatted
        result = _execute_graphql_http(ADD_EDGE_MUTATION, variables, endpoint) # Use internal function

        if "errors" in result:
            error_messages = [err.get('message', 'Unknown error') for err in result['errors']]
            print(f"❌ Failed to add edges: {'; '.join(error_messages)}") # Replaced logger
            return False

        added_edges = result.get("data", {}).get("addEdge", {}).get("edge", [])
        print(f"Added {len(added_edges)} edges") # Replaced logger
        return True
    except Exception as e:
        # Error already printed by _execute_graphql_http
        print(f"Error during edge addition process.")
        return False

def main():
    """Main entry point for the script."""
    parser = argparse.ArgumentParser(description="Seed the Dgraph database with test data")
    parser.add_argument(
        "--data", "-d",
        help="Path to JSON file with test data (default: use built-in test data)"
    )
    parser.add_argument(
        "--endpoint", "-e",
        default=DEFAULT_ENDPOINT, # Use local constant
        help=f"Dgraph GraphQL endpoint (default: {DEFAULT_ENDPOINT})"
    )
    args = parser.parse_args()

    # Load test data
    if args.data:
        try:
            data_path = Path(args.data).resolve()
            with open(data_path, "r", encoding="utf-8") as f:
                test_data = json.load(f)
            print(f"Loaded test data from {data_path}")
        except Exception as e:
            print(f"❌ Failed to load test data file '{args.data}': {str(e)}") # Replaced logger
            return 1
    else:
        test_data = DEFAULT_TEST_DATA
        print("Using built-in test data") # Replaced logger

    # Add nodes
    nodes_to_add = test_data.get("nodes", [])
    if nodes_to_add:
        print(f"Adding {len(nodes_to_add)} nodes to {args.endpoint}") # Replaced logger
        if not add_nodes(nodes_to_add, args.endpoint):
            return 1
    else:
        print("No nodes found in test data.")

    # Add edges
    edges_to_add = test_data.get("edges", [])
    if edges_to_add:
        print(f"Adding {len(edges_to_add)} edges to {args.endpoint}") # Replaced logger
        if not add_edges(edges_to_add, args.endpoint):
            return 1
    else:
        print("No edges found in test data.")

    print("✅ Test data seeding process completed.") # Replaced logger
    return 0

if __name__ == "__main__":
    sys.exit(main())

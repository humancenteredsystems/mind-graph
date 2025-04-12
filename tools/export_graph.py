#!/usr/bin/env python3
"""
Export the Dgraph database to JSON for debugging or backup.

This tool exports the current graph data to a JSON file, which can be used
for debugging, backup, or data migration purposes.
"""
import argparse
import sys
import os
import json
import requests
from pathlib import Path
from typing import Dict, Any, Optional
from datetime import datetime

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
        raise
    except Exception as e:
        print(f"❌ An unexpected error occurred during GraphQL request: {str(e)}") # Replaced logger
        raise
# --- End execute_graphql logic ---

# --- save_json logic moved here ---
def _save_json(data: Any, filename: str) -> None:
    """Internal function to save data as a JSON file."""
    output_path = Path(filename).resolve() # Resolve path relative to CWD
    with open(output_path, 'w', encoding='utf-8') as f:
        json.dump(data, f, indent=2, ensure_ascii=False)
    print(f"Data saved to {output_path}") # Replaced logger
# --- End save_json logic ---

# --- get_timestamp_str logic moved here ---
def _get_timestamp_str() -> str:
    """Internal function to get a formatted timestamp string."""
    return datetime.now().strftime("%Y%m%d_%H%M%S")
# --- End get_timestamp_str logic ---


# Query to export all nodes and edges
EXPORT_QUERY = """
query {
  queryNode {
    id
    label
    type
    level
    status
    branch
    outgoing {
      type
      from {
        id
      }
      to {
        id
      }
    }
  }
}
"""

# Query to export a specific node and its connections
EXPORT_NODE_QUERY = """
query ExportNode($id: String!, $depth: Int!) { # Changed ID! to String!
  getNode(id: $id) {
    id
    label
    type
    level
    status
    branch
    outgoing @recurse(depth: $depth) {
      type
      to {
        id
        label
        type
        level
        status
        branch
      }
    }
  }
}
"""

def export_graph(endpoint: str) -> Dict[str, Any]:
    """Export the entire graph from Dgraph."""
    try:
        result = _execute_graphql_http(EXPORT_QUERY, None, endpoint) # Use internal function
        return result
    except Exception as e:
        # Error already printed by _execute_graphql_http
        print(f"Graph export failed.")
        return {"error": str(e)}

def export_node(node_id: str, depth: int, endpoint: str) -> Dict[str, Any]:
    """Export a specific node and its connections from Dgraph."""
    try:
        variables = {"id": node_id, "depth": depth}
        result = _execute_graphql_http(EXPORT_NODE_QUERY, variables, endpoint) # Use internal function
        return result
    except Exception as e:
        # Error already printed by _execute_graphql_http
        print(f"Node export failed.")
        return {"error": str(e)}

def process_export_data(data: Dict[str, Any]) -> Dict[str, Any]:
    """Process the exported data to a more readable format."""
    if "data" not in data:
        print("⚠️ No 'data' key found in export result.")
        return data

    nodes = []
    edges = []
    processed_node_ids = set() # Keep track of nodes already added

    # Check if we're processing a full graph export or a node export
    if "queryNode" in data["data"]:
        raw_nodes = data["data"].get("queryNode", [])
        if not raw_nodes:
            print("No nodes found in full graph export data.")
            return {"nodes": [], "edges": []}

        for node in raw_nodes:
            if node is None or node.get("id") is None: continue # Skip null nodes
            node_id = node["id"]
            if node_id in processed_node_ids: continue # Skip duplicates

            # Extract node data
            node_data = {
                "id": node_id,
                "label": node.get("label"),
                "type": node.get("type"),
                "level": node.get("level"),
                "status": node.get("status"),
                "branch": node.get("branch")
            }
            nodes.append(node_data)
            processed_node_ids.add(node_id)

            # Extract edge data
            if node.get("outgoing"):
                for edge in node["outgoing"]:
                    if edge is None or edge.get("from") is None or edge.get("to") is None: continue
                    edge_data = {
                        "from": edge["from"]["id"],
                        "to": edge["to"]["id"],
                        "type": edge.get("type")
                    }
                    # Avoid duplicate edges (simple check based on from/to/type)
                    if edge_data not in edges:
                        edges.append(edge_data)

    # If we're processing a node export
    elif "getNode" in data["data"] and data["data"]["getNode"]:
        root_node = data["data"]["getNode"]
        if root_node is None or root_node.get("id") is None:
             print("Root node not found or invalid in node export data.")
             return {"nodes": [], "edges": []}

        # Use a stack for iterative traversal instead of deep recursion
        stack = [root_node]
        while stack:
            current_node = stack.pop()
            if current_node is None or current_node.get("id") is None: continue
            node_id = current_node["id"]

            # Add node if not already processed
            if node_id not in processed_node_ids:
                node_data = {
                    "id": node_id,
                    "label": current_node.get("label"),
                    "type": current_node.get("type"),
                    "level": current_node.get("level"),
                    "status": current_node.get("status"),
                    "branch": current_node.get("branch")
                }
                nodes.append(node_data)
                processed_node_ids.add(node_id)

            # Process outgoing edges
            if current_node.get("outgoing"):
                for edge in current_node["outgoing"]:
                    if edge is None or edge.get("to") is None: continue
                    to_node = edge["to"]
                    if to_node is None or to_node.get("id") is None: continue

                    edge_data = {
                        "from": node_id,
                        "to": to_node["id"],
                        "type": edge.get("type")
                    }
                    # Avoid duplicate edges
                    if edge_data not in edges:
                        edges.append(edge_data)

                    # Add the target node to the stack if not processed
                    if to_node["id"] not in processed_node_ids:
                        stack.append(to_node) # Add neighbor to stack for processing

    else:
        print("⚠️ Export data format not recognized (expected 'queryNode' or 'getNode').")


    return {"nodes": nodes, "edges": edges}


def main():
    """Main entry point for the script."""
    parser = argparse.ArgumentParser(description="Export the Dgraph database to JSON")
    parser.add_argument(
        "--node", "-n",
        help="Export a specific node and its connections (by ID)"
    )
    parser.add_argument(
        "--depth", "-d",
        type=int,
        default=3,
        help="Recursion depth for node connections (default: 3)"
    )
    parser.add_argument(
        "--endpoint", "-e",
        default=DEFAULT_ENDPOINT, # Use local constant
        help=f"Dgraph GraphQL endpoint (default: {DEFAULT_ENDPOINT})"
    )
    parser.add_argument(
        "--output", "-o",
        help="Output file path (default: graph_export_TIMESTAMP.json or node_NODEID_export_TIMESTAMP.json)"
    )
    parser.add_argument(
        "--raw",
        action="store_true",
        help="Export raw GraphQL response without processing"
    )
    args = parser.parse_args()

    # Export the data
    if args.node:
        print(f"Exporting node {args.node} with depth {args.depth} from {args.endpoint}") # Replaced logger
        result = export_node(args.node, args.depth, args.endpoint)
    else:
        print(f"Exporting entire graph from {args.endpoint}") # Replaced logger
        result = export_graph(args.endpoint)

    # Check for errors
    if "error" in result:
        print("❌ Export failed.") # Replaced logger
        return 1

    # Process the data if requested
    processed_result = result
    if not args.raw:
        print("Processing exported data...")
        processed_result = process_export_data(result)
        if not processed_result.get("nodes") and not processed_result.get("edges"):
             print("⚠️ Processing resulted in empty nodes and edges.")
             # Still save the empty structure if requested
        else:
             print(f"Processed {len(processed_result.get('nodes',[]))} nodes and {len(processed_result.get('edges',[]))} edges.")

    # --- Determine output paths ---
    timestamp = _get_timestamp_str()
    exports_dir = Path("exports") # Define exports directory

    # Determine timestamped output path
    if args.output:
        timestamped_output_path = Path(args.output)
    else:
        if args.node:
            safe_node_id = "".join(c if c.isalnum() else "_" for c in args.node)
            # Place node exports also in exports dir for consistency
            timestamped_output_path = exports_dir / f"node_{safe_node_id}_export_{timestamp}.json"
        else:
            timestamped_output_path = exports_dir / f"graph_export_{timestamp}.json"

    # Define fixed 'latest' output path as requested (always in exports dir)
    latest_output_path = exports_dir / "latest_json_graph.json" # Changed filename

    # --- Ensure directories exist ---
    try:
        timestamped_output_path.parent.mkdir(parents=True, exist_ok=True)
        # Ensure exports dir exists for the 'latest' file as well
        latest_output_path.parent.mkdir(parents=True, exist_ok=True)
    except OSError as e:
        print(f"❌ Failed to create output directories: {e}")
        return 1

    # --- Save the data ---
    save_timestamped_ok = False
    try:
        _save_json(processed_result, str(timestamped_output_path))
        # Success message printed by _save_json
        save_timestamped_ok = True
    except Exception as e:
        print(f"❌ Failed to save timestamped output file '{timestamped_output_path}': {str(e)}")
        # Don't proceed to save 'latest' if timestamped failed

    save_latest_ok = False
    if save_timestamped_ok: # Only attempt saving 'latest' if timestamped succeeded
        try:
            _save_json(processed_result, str(latest_output_path))
            print(f"Also updated {latest_output_path}") # Custom message for 'latest'
            save_latest_ok = True
        except Exception as e:
            print(f"❌ Failed to save latest output file '{latest_output_path}': {str(e)}")
            # Log error, but script might still be considered partially successful

    # Determine final exit code
    if save_timestamped_ok and save_latest_ok:
        return 0 # Both succeeded
    elif save_timestamped_ok:
        print("⚠️ Saved timestamped file, but failed to update latest file.")
        return 1 # Indicate partial failure
    else:
        # Timestamped save failed, error already printed
        return 1

if __name__ == "__main__":
    sys.exit(main())

#!/usr/bin/env python3
"""
Export the Dgraph database to JSON for debugging or backup.

This tool exports the current graph data to a JSON file, which can be used
for debugging, backup, or data migration purposes.
"""
import argparse
import sys
import os
from pathlib import Path
from typing import Dict, Any, Optional

# Add parent directory to path to import utils
sys.path.append(str(Path(__file__).parent))
from utils import execute_graphql, save_json, get_timestamp_str, logger, DEFAULT_ENDPOINT

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
query ExportNode($id: ID!, $depth: Int!) {
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
    """
    Export the entire graph from Dgraph.
    
    Args:
        endpoint: The GraphQL endpoint URL
        
    Returns:
        The exported graph data
    """
    try:
        result = execute_graphql(EXPORT_QUERY, None, endpoint)
        return result
    except Exception as e:
        logger.error(f"Export failed: {str(e)}")
        return {"error": str(e)}

def export_node(node_id: str, depth: int, endpoint: str) -> Dict[str, Any]:
    """
    Export a specific node and its connections from Dgraph.
    
    Args:
        node_id: The ID of the node to export
        depth: The recursion depth for connections
        endpoint: The GraphQL endpoint URL
        
    Returns:
        The exported node data
    """
    try:
        variables = {"id": node_id, "depth": depth}
        result = execute_graphql(EXPORT_NODE_QUERY, variables, endpoint)
        return result
    except Exception as e:
        logger.error(f"Export failed: {str(e)}")
        return {"error": str(e)}

def process_export_data(data: Dict[str, Any]) -> Dict[str, Any]:
    """
    Process the exported data to a more readable format.
    
    Args:
        data: The raw exported data
        
    Returns:
        The processed data
    """
    if "data" not in data:
        return data
    
    # Extract nodes and edges
    nodes = []
    edges = []
    
    # Check if we're processing a full graph export or a node export
    if "queryNode" in data["data"]:
        raw_nodes = data["data"]["queryNode"]
        
        for node in raw_nodes:
            # Extract node data
            node_data = {
                "id": node["id"],
                "label": node["label"],
                "type": node["type"],
                "level": node["level"],
                "status": node["status"],
                "branch": node["branch"]
            }
            nodes.append(node_data)
            
            # Extract edge data
            if "outgoing" in node and node["outgoing"]:
                for edge in node["outgoing"]:
                    edge_data = {
                        "from": edge["from"]["id"],
                        "to": edge["to"]["id"],
                        "type": edge["type"]
                    }
                    edges.append(edge_data)
    
    # If we're processing a node export
    elif "getNode" in data["data"] and data["data"]["getNode"]:
        node = data["data"]["getNode"]
        
        # Extract the root node
        node_data = {
            "id": node["id"],
            "label": node["label"],
            "type": node["type"],
            "level": node["level"],
            "status": node["status"],
            "branch": node["branch"]
        }
        nodes.append(node_data)
        
        # Process the node's connections recursively
        def process_connections(node, visited=None):
            if visited is None:
                visited = set()
            
            if "outgoing" not in node or not node["outgoing"]:
                return
            
            for edge in node["outgoing"]:
                to_node = edge["to"]
                
                # Add the edge
                edge_data = {
                    "from": node["id"],
                    "to": to_node["id"],
                    "type": edge["type"]
                }
                edges.append(edge_data)
                
                # Add the target node if not already processed
                if to_node["id"] not in visited:
                    visited.add(to_node["id"])
                    node_data = {
                        "id": to_node["id"],
                        "label": to_node["label"],
                        "type": to_node["type"],
                        "level": to_node.get("level"),
                        "status": to_node.get("status"),
                        "branch": to_node.get("branch")
                    }
                    nodes.append(node_data)
                    
                    # Process the target node's connections
                    if "outgoing" in to_node:
                        process_connections(to_node, visited)
        
        process_connections(node)
    
    return {
        "nodes": nodes,
        "edges": edges
    }

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
        default=DEFAULT_ENDPOINT,
        help=f"Dgraph GraphQL endpoint (default: {DEFAULT_ENDPOINT})"
    )
    parser.add_argument(
        "--output", "-o",
        help="Output file path (default: graph_export_TIMESTAMP.json)"
    )
    parser.add_argument(
        "--raw",
        action="store_true",
        help="Export raw GraphQL response without processing"
    )
    args = parser.parse_args()
    
    # Export the data
    if args.node:
        logger.info(f"Exporting node {args.node} with depth {args.depth} from {args.endpoint}")
        result = export_node(args.node, args.depth, args.endpoint)
    else:
        logger.info(f"Exporting entire graph from {args.endpoint}")
        result = export_graph(args.endpoint)
    
    # Check for errors
    if "error" in result:
        logger.error("Export failed")
        return 1
    
    # Process the data if requested
    if not args.raw:
        result = process_export_data(result)
    
    # Determine the output file path
    if args.output:
        output_path = args.output
    else:
        timestamp = get_timestamp_str()
        if args.node:
            output_path = f"node_{args.node}_export_{timestamp}.json"
        else:
            output_path = f"graph_export_{timestamp}.json"
    
    # Save the data
    try:
        save_json(result, output_path)
        logger.info(f"✅ Graph data exported to {output_path}")
        return 0
    except Exception as e:
        logger.error(f"Failed to save output file: {str(e)}")
        return 1

if __name__ == "__main__":
    sys.exit(main())

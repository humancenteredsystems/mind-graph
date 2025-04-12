#!/usr/bin/env python3
"""
Seed the Dgraph database with test data.

This tool adds test nodes and edges to the graph database using GraphQL mutations.
"""
import argparse
import sys
import json
from pathlib import Path
from typing import Dict, Any, List

# Add parent directory to path to import utils
sys.path.append(str(Path(__file__).parent))
from utils import execute_graphql, logger, DEFAULT_ENDPOINT

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
        {"from": "node1", "to": "node2", "type": "related"},
        {"from": "node1", "to": "node3", "type": "parent"},
        {"from": "node2", "to": "node4", "type": "has_example"},
        {"from": "node3", "to": "node5", "type": "has_question"}
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
      from {
        id
      }
      to {
        id
      }
      type
    }
  }
}
"""

def add_nodes(nodes: List[Dict[str, Any]], endpoint: str) -> bool:
    """
    Add nodes to the graph database.
    
    Args:
        nodes: List of node data
        endpoint: GraphQL endpoint
        
    Returns:
        True if successful, False otherwise
    """
    try:
        variables = {"input": nodes}
        result = execute_graphql(ADD_NODE_MUTATION, variables, endpoint)
        
        if "errors" in result:
            logger.error(f"Failed to add nodes: {result['errors']}")
            return False
        
        added_nodes = result.get("data", {}).get("addNode", {}).get("node", [])
        logger.info(f"Added {len(added_nodes)} nodes")
        return True
    except Exception as e:
        logger.error(f"Error adding nodes: {str(e)}")
        return False

def add_edges(edges: List[Dict[str, Any]], endpoint: str) -> bool:
    """
    Add edges to the graph database.
    
    Args:
        edges: List of edge data
        endpoint: GraphQL endpoint
        
    Returns:
        True if successful, False otherwise
    """
    try:
        variables = {"input": edges}
        result = execute_graphql(ADD_EDGE_MUTATION, variables, endpoint)
        
        if "errors" in result:
            logger.error(f"Failed to add edges: {result['errors']}")
            return False
        
        added_edges = result.get("data", {}).get("addEdge", {}).get("edge", [])
        logger.info(f"Added {len(added_edges)} edges")
        return True
    except Exception as e:
        logger.error(f"Error adding edges: {str(e)}")
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
        default=DEFAULT_ENDPOINT,
        help=f"Dgraph GraphQL endpoint (default: {DEFAULT_ENDPOINT})"
    )
    args = parser.parse_args()
    
    # Load test data
    if args.data:
        try:
            with open(args.data, "r", encoding="utf-8") as f:
                test_data = json.load(f)
        except Exception as e:
            logger.error(f"Failed to load test data file: {str(e)}")
            return 1
    else:
        test_data = DEFAULT_TEST_DATA
        logger.info("Using built-in test data")
    
    # Add nodes
    logger.info(f"Adding {len(test_data['nodes'])} nodes to {args.endpoint}")
    if not add_nodes(test_data["nodes"], args.endpoint):
        return 1
    
    # Add edges
    logger.info(f"Adding {len(test_data['edges'])} edges to {args.endpoint}")
    if not add_edges(test_data["edges"], args.endpoint):
        return 1
    
    logger.info("✅ Test data added successfully")
    return 0

if __name__ == "__main__":
    sys.exit(main())

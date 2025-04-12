#!/usr/bin/env python3
"""
Test script to add a single node to Dgraph.
"""
import sys
from pathlib import Path

# Add parent directory to path to import utils
sys.path.append(str(Path(__file__).parent))
from utils import execute_graphql, logger, DEFAULT_ENDPOINT

# Simple mutation to add a node
ADD_NODE_MUTATION = """
mutation {
  addNode(input: [{
    id: "test1",
    label: "Test Node",
    type: "test"
  }]) {
    node {
      id
      label
    }
  }
}
"""

def main():
    """Main entry point for the script."""
    try:
        logger.info("Attempting to add a test node...")
        result = execute_graphql(ADD_NODE_MUTATION, None, DEFAULT_ENDPOINT)
        
        if "errors" in result:
            logger.error(f"Failed to add node: {result['errors']}")
            return 1
        
        logger.info("Node added successfully!")
        logger.info(f"Result: {result}")
        return 0
    except Exception as e:
        logger.error(f"Error: {str(e)}")
        return 1

if __name__ == "__main__":
    sys.exit(main())

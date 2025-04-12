#!/usr/bin/env python3
"""
Run GraphQL queries against the Dgraph database.

This tool allows running predefined or custom GraphQL queries to test connections
and retrieve data from the graph database.
"""
import argparse
import sys
import json
from pathlib import Path
from typing import Dict, Any, Optional

# Add parent directory to path to import utils
sys.path.append(str(Path(__file__).parent))
from utils import execute_graphql, logger, DEFAULT_ENDPOINT

# Predefined query templates
QUERIES = {
    "all_nodes": """
    query {
      queryNode {
        id
        label
        type
        level
        status
        branch
      }
    }
    """,
    
    "nodes_by_type": """
    query NodesByType($type: String!) {
      queryNode(filter: {type: {eq: $type}}) {
        id
        label
        level
        status
        branch
      }
    }
    """,
    
    "node_connections": """
    query NodeConnections($id: ID!) {
      getNode(id: $id) {
        id
        label
        type
        outgoing {
          type
          to {
            id
            label
            type
          }
        }
      }
    }
    """,
    
    "node_with_depth": """
    query NodeWithDepth($id: ID!, $depth: Int!) {
      getNode(id: $id) {
        id
        label
        type
        outgoing @recurse(depth: $depth) {
          type
          to {
            id
            label
            type
            outgoing {
              type
            }
          }
        }
      }
    }
    """
}

def format_result(result: Dict[str, Any], pretty: bool = True) -> str:
    """
    Format a GraphQL result for display.
    
    Args:
        result: The GraphQL result
        pretty: Whether to pretty-print the result
        
    Returns:
        A formatted string representation of the result
    """
    if pretty:
        return json.dumps(result, indent=2)
    else:
        return json.dumps(result)

def run_query(
    query: str, 
    variables: Optional[Dict[str, Any]] = None, 
    endpoint: str = DEFAULT_ENDPOINT
) -> Dict[str, Any]:
    """
    Run a GraphQL query against the Dgraph endpoint.
    
    Args:
        query: The GraphQL query string
        variables: Optional variables for the query
        endpoint: The GraphQL endpoint URL
        
    Returns:
        The query result
    """
    try:
        result = execute_graphql(query, variables, endpoint)
        return result
    except Exception as e:
        logger.error(f"Query failed: {str(e)}")
        return {"error": str(e)}

def main():
    """Main entry point for the script."""
    parser = argparse.ArgumentParser(description="Run GraphQL queries against the Dgraph database")
    parser.add_argument(
        "--query", "-q",
        choices=list(QUERIES.keys()),
        help="Predefined query to run"
    )
    parser.add_argument(
        "--file", "-f",
        help="Path to a file containing a custom GraphQL query"
    )
    parser.add_argument(
        "--variables", "-v",
        help="JSON string or path to JSON file with query variables"
    )
    parser.add_argument(
        "--endpoint", "-e",
        default=DEFAULT_ENDPOINT,
        help=f"Dgraph GraphQL endpoint (default: {DEFAULT_ENDPOINT})"
    )
    parser.add_argument(
        "--output", "-o",
        help="Path to save the query result (default: print to stdout)"
    )
    args = parser.parse_args()
    
    # Validate arguments
    if not args.query and not args.file:
        logger.error("Either --query or --file must be specified")
        return 1
    
    # Get the query
    if args.query:
        query = QUERIES[args.query]
        logger.info(f"Using predefined query: {args.query}")
    else:
        try:
            with open(args.file, "r", encoding="utf-8") as f:
                query = f.read()
            logger.info(f"Using custom query from file: {args.file}")
        except Exception as e:
            logger.error(f"Failed to read query file: {str(e)}")
            return 1
    
    # Parse variables
    variables = None
    if args.variables:
        try:
            # Check if the variables argument is a file path
            if Path(args.variables).exists():
                with open(args.variables, "r", encoding="utf-8") as f:
                    variables = json.load(f)
            else:
                # Assume it's a JSON string
                variables = json.loads(args.variables)
        except Exception as e:
            logger.error(f"Failed to parse variables: {str(e)}")
            return 1
    
    # Run the query
    logger.info(f"Running query against {args.endpoint}")
    result = run_query(query, variables, args.endpoint)
    
    # Output the result
    formatted_result = format_result(result)
    if args.output:
        try:
            with open(args.output, "w", encoding="utf-8") as f:
                f.write(formatted_result)
            logger.info(f"Query result saved to {args.output}")
        except Exception as e:
            logger.error(f"Failed to write output file: {str(e)}")
            return 1
    else:
        print(formatted_result)
    
    # Check for errors in the result
    if "errors" in result:
        logger.warning("Query returned errors")
        return 1
    
    logger.info("✅ Query executed successfully")
    return 0

if __name__ == "__main__":
    sys.exit(main())

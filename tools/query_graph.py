#!/usr/bin/env python3
"""
Run GraphQL queries against the Dgraph database.

This tool allows running predefined or custom GraphQL queries to test connections
and retrieve data from the graph database.
"""
import argparse
import sys
import json
import requests
from pathlib import Path
from typing import Dict, Any, Optional

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
    query NodeConnections($id: String!) { # Changed ID! to String!
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
    query NodeWithDepth($id: String!, $depth: Int!) { # Changed ID! to String!
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
    """Format a GraphQL result for display."""
    if pretty:
        return json.dumps(result, indent=2)
    else:
        return json.dumps(result)

def run_query(
    query: str,
    variables: Optional[Dict[str, Any]] = None,
    endpoint: str = DEFAULT_ENDPOINT
) -> Dict[str, Any]:
    """Run a GraphQL query against the Dgraph endpoint."""
    try:
        result = _execute_graphql_http(query, variables, endpoint) # Use internal function
        return result
    except Exception as e:
        # Error already printed by _execute_graphql_http
        print(f"Query execution failed.")
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
        default=DEFAULT_ENDPOINT, # Use local constant
        help=f"Dgraph GraphQL endpoint (default: {DEFAULT_ENDPOINT})"
    )
    parser.add_argument(
        "--output", "-o",
        help="Path to save the query result (default: print to stdout)"
    )
    args = parser.parse_args()

    # Validate arguments
    if not args.query and not args.file:
        print("❌ Either --query or --file must be specified") # Replaced logger
        return 1

    # Get the query
    if args.query:
        query = QUERIES[args.query]
        print(f"Using predefined query: {args.query}") # Replaced logger
    else:
        try:
            query_path = Path(args.file).resolve()
            with open(query_path, "r", encoding="utf-8") as f:
                query = f.read()
            print(f"Using custom query from file: {query_path}") # Replaced logger
        except Exception as e:
            print(f"❌ Failed to read query file '{args.file}': {str(e)}") # Replaced logger
            return 1

    # Parse variables
    variables = None
    if args.variables:
        try:
            var_path = Path(args.variables)
            if var_path.exists():
                with open(var_path.resolve(), "r", encoding="utf-8") as f:
                    variables = json.load(f)
                print(f"Loaded variables from file: {var_path.resolve()}")
            else:
                variables = json.loads(args.variables)
                print("Parsed variables from JSON string.")
        except Exception as e:
            print(f"❌ Failed to parse variables: {str(e)}") # Replaced logger
            return 1

    # Run the query
    print(f"Running query against {args.endpoint}") # Replaced logger
    result = run_query(query, variables, args.endpoint)

    # Output the result
    formatted_result = format_result(result)
    if args.output:
        try:
            output_path = Path(args.output).resolve()
            with open(output_path, "w", encoding="utf-8") as f:
                f.write(formatted_result)
            print(f"Query result saved to {output_path}") # Replaced logger
        except Exception as e:
            print(f"❌ Failed to write output file '{args.output}': {str(e)}") # Replaced logger
            return 1
    else:
        # Print separator for clarity
        print("-" * 20 + " Query Result " + "-" * 20)
        print(formatted_result)
        print("-" * 54)


    # Check for errors in the result
    if "errors" in result:
        print("⚠️ Query returned errors.") # Replaced logger
        return 1

    print("✅ Query executed successfully.") # Replaced logger
    return 0

if __name__ == "__main__":
    sys.exit(main())

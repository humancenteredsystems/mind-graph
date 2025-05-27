#!/usr/bin/env python3
"""
Run GraphQL queries against the MIMS-Graph API with tenant support.

This tool allows running predefined or custom GraphQL queries with proper
tenant isolation and API routing.
"""
import argparse
import sys
import json
from pathlib import Path
from typing import Dict, Any, Optional

# Import shared library
sys.path.append(str(Path(__file__).resolve().parent))
from lib import QueryTool, APIError, TenantNotFoundError, GraphQLError

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
    query NodeConnections($id: String!) {
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
    query NodeWithDepth($id: String!, $depth: Int!) {
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


class GraphQueryTool(QueryTool):
    """GraphQL query tool with tenant support."""
    
    def __init__(self):
        super().__init__("Run GraphQL queries against the MIMS-Graph API with tenant support")
    
    def add_tool_arguments(self, parser: argparse.ArgumentParser):
        """Add query-specific arguments."""
        super().add_tool_arguments(parser)
        
        # Query source (mutually exclusive)
        query_group = parser.add_mutually_exclusive_group(required=True)
        query_group.add_argument(
            "--query", "-q",
            choices=list(QUERIES.keys()),
            help="Predefined query to run"
        )
        query_group.add_argument(
            "--file", "-F",
            help="Path to a file containing a custom GraphQL query"
        )
        
        # Query variables
        parser.add_argument(
            "--variables",
            help="JSON string or path to JSON file with query variables"
        )
        
        # Output options
        parser.add_argument(
            "--output", "-o",
            help="Path to save the query result (default: print to stdout)"
        )
    
    def execute(self) -> int:
        """Execute the GraphQL query."""
        try:
            # Get the query
            if self.args.query:
                query = QUERIES[self.args.query]
                self.info(f"Using predefined query: {self.args.query}")
            else:
                query = self._load_query_from_file(self.args.file)
                self.info(f"Using custom query from file: {self.args.file}")
            
            # Parse variables
            variables = self._parse_variables()
            
            # Show context if verbose
            if self.args.verbose:
                self.debug(f"Query: {query}")
                if variables:
                    self.debug(f"Variables: {json.dumps(variables, indent=2)}")
            
            # Execute query via API (with tenant context)
            self.info(f"Executing query for tenant: {self.args.tenant_id}")
            
            try:
                result = self.api_client.query(query, variables, tenant_id=self.args.tenant_id)
            except GraphQLError as e:
                self.error(f"GraphQL query failed: {e}")
                if self.args.verbose and e.graphql_errors:
                    for error in e.graphql_errors:
                        self.debug(f"GraphQL Error: {error}")
                return 1
            except APIError as e:
                self.error(f"API request failed: {e}")
                return 1
            
            # Format and output result
            self._output_result(result)
            
            self.success("Query executed successfully")
            return 0
            
        except Exception as e:
            self.error(f"Query execution failed: {e}")
            if self.args.verbose:
                import traceback
                self.debug(traceback.format_exc())
            return 1
    
    def _load_query_from_file(self, file_path: str) -> str:
        """Load GraphQL query from file."""
        try:
            query_path = Path(file_path).resolve()
            with open(query_path, "r", encoding="utf-8") as f:
                return f.read()
        except Exception as e:
            raise Exception(f"Failed to read query file '{file_path}': {str(e)}")
    
    def _parse_variables(self) -> Optional[Dict[str, Any]]:
        """Parse GraphQL variables from argument."""
        if not self.args.variables:
            return None
        
        try:
            # Check if it's a file path
            var_path = Path(self.args.variables)
            if var_path.exists():
                with open(var_path.resolve(), "r", encoding="utf-8") as f:
                    variables = json.load(f)
                self.debug(f"Loaded variables from file: {var_path.resolve()}")
                return variables
            else:
                # Parse as JSON string
                variables = json.loads(self.args.variables)
                self.debug("Parsed variables from JSON string")
                return variables
        except Exception as e:
            raise Exception(f"Failed to parse variables: {str(e)}")
    
    def _output_result(self, result: Dict[str, Any]):
        """Output query result."""
        # Format result based on format argument
        if self.args.format == "simple":
            formatted_result = self._format_simple(result)
        elif self.args.format == "table":
            formatted_result = self._format_table(result)
        else:  # json (default)
            formatted_result = json.dumps(result, indent=2)
        
        # Apply limit if specified
        if hasattr(self.args, 'limit') and self.args.limit:
            # For now, just truncate the JSON output
            # TODO: Implement proper limiting at query level
            pass
        
        # Output to file or stdout
        if self.args.output:
            try:
                output_path = Path(self.args.output).resolve()
                with open(output_path, "w", encoding="utf-8") as f:
                    f.write(formatted_result)
                self.info(f"Query result saved to {output_path}")
            except Exception as e:
                raise Exception(f"Failed to write output file '{self.args.output}': {str(e)}")
        else:
            # Print to stdout with separator
            print("-" * 20 + " Query Result " + "-" * 20)
            print(formatted_result)
            print("-" * 54)
    
    def _format_simple(self, result: Dict[str, Any]) -> str:
        """Format result in simple text format."""
        lines = []
        
        # Handle different query result structures
        for key, value in result.items():
            if isinstance(value, list):
                lines.append(f"{key}: {len(value)} items")
                for i, item in enumerate(value):
                    if isinstance(item, dict):
                        if 'id' in item and 'label' in item:
                            lines.append(f"  {i+1}. {item['id']}: {item['label']}")
                        else:
                            lines.append(f"  {i+1}. {item}")
                    else:
                        lines.append(f"  {i+1}. {item}")
            else:
                lines.append(f"{key}: {value}")
        
        return "\n".join(lines)
    
    def _format_table(self, result: Dict[str, Any]) -> str:
        """Format result in table format (basic implementation)."""
        lines = []
        
        for key, value in result.items():
            if isinstance(value, list) and value:
                # Create table for list of objects
                if isinstance(value[0], dict):
                    # Get headers from first object
                    headers = list(value[0].keys())
                    
                    # Calculate column widths
                    widths = {}
                    for header in headers:
                        widths[header] = len(header)
                        for item in value:
                            if header in item:
                                widths[header] = max(widths[header], len(str(item[header])))
                    
                    # Create header row
                    header_row = " | ".join(h.ljust(widths[h]) for h in headers)
                    separator = "-" * len(header_row)
                    
                    lines.append(f"\n{key}:")
                    lines.append(header_row)
                    lines.append(separator)
                    
                    # Create data rows
                    for item in value:
                        row = " | ".join(str(item.get(h, "")).ljust(widths[h]) for h in headers)
                        lines.append(row)
                else:
                    # Simple list
                    lines.append(f"\n{key}:")
                    for item in value:
                        lines.append(f"  - {item}")
            else:
                lines.append(f"{key}: {value}")
        
        return "\n".join(lines)


def main():
    """Main entry point."""
    tool = GraphQueryTool()
    return tool.run()


if __name__ == "__main__":
    sys.exit(main())

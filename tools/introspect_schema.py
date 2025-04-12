#!/usr/bin/env python3
"""
Introspect the Dgraph GraphQL schema to see available types and mutations.
"""
import sys
from pathlib import Path

# Add parent directory to path to import utils
sys.path.append(str(Path(__file__).parent))
from utils import execute_graphql, logger, DEFAULT_ENDPOINT, DEFAULT_ADMIN_ENDPOINT

# GraphQL introspection query
INTROSPECTION_QUERY = """
query IntrospectionQuery {
  __schema {
    types {
      name
      kind
      description
      inputFields {
        name
        type {
          name
          kind
        }
      }
    }
    mutationType {
      name
      fields {
        name
        args {
          name
          type {
            name
            kind
            ofType {
              name
              kind
            }
          }
        }
      }
    }
  }
}
"""

def main():
    """Main entry point for the script."""
    try:
        # Use the GraphQL endpoint, not the admin endpoint
        graphql_endpoint = f"{DEFAULT_ADMIN_ENDPOINT.replace('/admin', '')}/graphql"
        result = execute_graphql(INTROSPECTION_QUERY, None, graphql_endpoint)
        
        if "errors" in result:
            logger.error(f"Introspection query failed: {result['errors']}")
            return 1
        
        # Extract input types
        types = result["data"]["__schema"]["types"]
        input_types = [t for t in types if t["kind"] == "INPUT_OBJECT"]
        
        print("\n=== Available Input Types ===")
        for input_type in input_types:
            print(f"- {input_type['name']}")
            if input_type["inputFields"]:
                for field in input_type["inputFields"]:
                    field_type = field["type"]["name"] or field["type"]["kind"]
                    print(f"  - {field['name']}: {field_type}")
        
        # Extract mutations
        mutations = result["data"]["__schema"]["mutationType"]["fields"]
        
        print("\n=== Available Mutations ===")
        for mutation in mutations:
            args = ", ".join([f"{arg['name']}: {arg['type']['name'] or arg['type']['ofType']['name']}" for arg in mutation["args"]])
            print(f"- {mutation['name']}({args})")
        
        return 0
    except Exception as e:
        logger.error(f"Error introspecting schema: {str(e)}")
        return 1

if __name__ == "__main__":
    sys.exit(main())

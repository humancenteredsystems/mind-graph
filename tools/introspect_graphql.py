#!/usr/bin/env python3
"""
Sends a GraphQL introspection query to the Dgraph /graphql endpoint
to check if a GraphQL API is active and retrieve its schema.
"""
import sys
import json
from pathlib import Path

# Add parent directory to path to import utils
sys.path.append(str(Path(__file__).parent))
from utils import execute_graphql, logger, DEFAULT_ENDPOINT

# Standard GraphQL Introspection Query
INTROSPECTION_QUERY = """
  query IntrospectionQuery {
    __schema {
      queryType { name }
      mutationType { name }
      subscriptionType { name }
      types {
        ...FullType
      }
      directives {
        name
        description
        locations
        args {
          ...InputValue
        }
      }
    }
  }

  fragment FullType on __Type {
    kind
    name
    description
    fields(includeDeprecated: true) {
      name
      description
      args {
        ...InputValue
      }
      type {
        ...TypeRef
      }
      isDeprecated
      deprecationReason
    }
    inputFields {
      ...InputValue
    }
    interfaces {
      ...TypeRef
    }
    enumValues(includeDeprecated: true) {
      name
      description
      isDeprecated
      deprecationReason
    }
    possibleTypes {
      ...TypeRef
    }
  }

  fragment InputValue on __InputValue {
    name
    description
    type { ...TypeRef }
    defaultValue
  }

  fragment TypeRef on __Type {
    kind
    name
    ofType {
      kind
      name
      ofType {
        kind
        name
        ofType {
          kind
          name
          ofType {
            kind
            name
            ofType {
              kind
              name
              ofType {
                kind
                name
                ofType {
                  kind
                  name
                }
              }
            }
          }
        }
      }
    }
  }
"""

def run_introspection():
    """Executes the introspection query and logs the result."""
    logger.info(f"Sending introspection query to {DEFAULT_ENDPOINT}")
    try:
        result = execute_graphql(query=INTROSPECTION_QUERY, endpoint=DEFAULT_ENDPOINT)
        logger.info("Introspection query successful.")
        # Pretty print the result (can be large)
        # logger.info(json.dumps(result, indent=2))
        if "errors" in result:
            logger.error(f"GraphQL errors received: {result['errors']}")
            return 1
        elif "data" in result and result["data"].get("__schema"):
             logger.info("✅ GraphQL API seems active. Introspection returned schema data.")
             # Optionally save the schema
             # with open("introspection_result.json", "w") as f:
             #     json.dump(result, f, indent=2)
             # logger.info("Full introspection result saved to introspection_result.json")
             return 0
        else:
             logger.warning("Introspection query succeeded but returned unexpected data (no __schema).")
             logger.info(f"Response data: {result.get('data')}")
             return 1

    except Exception as e:
        # execute_graphql already logs errors, but we catch to return status code
        logger.error(f"Introspection query failed: {str(e)}")
        return 1

if __name__ == "__main__":
    sys.exit(run_introspection())

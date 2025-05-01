#!/usr/bin/env python3
"""
Push a GraphQL schema to Dgraph via the API.

This tool uploads a GraphQL schema file to the MakeItMakeSense.io API endpoint,
which can then push the schema to local and/or remote Dgraph instances.
"""
import argparse
import os
import sys
import json
from pathlib import Path

# Add the parent directory to the Python path to be able to import tools
sys.path.append(os.path.join(os.path.dirname(__file__), '..'))
from tools.api_client import call_api # Import the shared API client

# Default API endpoints (override with MIMS_API_URL env var)
DEFAULT_API_BASE = "http://localhost:3000/api"
DEFAULT_ADMIN_SCHEMA_ENDPOINT = f"{DEFAULT_API_BASE}/admin/schema"
DEFAULT_SCHEMAS_ENDPOINT = f"{DEFAULT_API_BASE}/schemas"

def list_schemas(api_base, api_key):
    """List all available schemas using the API client."""
    print(f"Listing schemas from API at {api_base}...")
    response = call_api(api_base, "/schemas", api_key, method='GET')

    if response["success"]:
        schemas = response["data"]
        print("Available schemas:")
        print("-" * 70)
        format_str = "{:<15} {:<30} {:<15} {:<10}"
        print(format_str.format("ID", "NAME", "OWNER", "PRODUCTION"))
        print("-" * 70)
        for schema in schemas:
            print(format_str.format(
                schema.get("id", ""),
                schema.get("name", "")[:30],
                schema.get("owner", ""),
                "✓" if schema.get("is_production") else ""
            ))
        return True
    else:
        print(f"❌ Failed to list schemas: {response['error']}")
        if response.get("details"):
            print("Details:", response["details"])
        return False

def push_schema_file(schema_path, target, api_base, api_key):
    """Push a schema file via the API client."""
    try:
        # Read the schema file
        with open(schema_path, "r", encoding="utf-8") as f:
            schema_text = f.read()
    except Exception as e:
        print(f"❌ Failed to read schema file: {str(e)}")
        return False

    # Send request to API using the client
    print(f"Pushing schema from {schema_path} to {target} via API at {api_base}...")
    response = call_api(
        api_base,
        "/admin/schema", # Endpoint path
        api_key,
        method='POST',
        payload={
            "schema": schema_text,
            "target": target # Keep target in payload for API logic
        }
    )

    if response["success"]:
        print("✅ Schema push successful!")
        if response.get("data"):
             print(json.dumps(response["data"], indent=2))
        return True
    else:
        print(f"❌ Schema push failed: {response['error']}")
        if response.get("details"):
            print("Details:", response["details"])
        return False

def push_schema_by_id(schema_id, target, api_base, api_key):
    """Push a schema from the registry by ID using the API client."""
    endpoint_path = f"/schemas/{schema_id}/push"
    # Pass target as a query parameter as per API docs
    params = {"target": target}
    
    print(f"Pushing schema ID '{schema_id}' to {target} via API at {api_base}...")
    response = call_api(
        api_base,
        endpoint_path,
        api_key,
        method='POST', # This endpoint is POST
        params=params
    )

    if response["success"]:
        print("✅ Schema push successful!")
        if response.get("data"):
             print(json.dumps(response["data"], indent=2))
        return True
    else:
        print(f"❌ Schema push failed: {response['error']}")
        if response.get("details"):
            print("Details:", response["details"])
        return False

def main():
    """Main entry point for the script."""
    parser = argparse.ArgumentParser(description="Push a GraphQL schema to Dgraph via API")
    
    # Schema source group (mutually exclusive)
    schema_source = parser.add_mutually_exclusive_group()
    schema_source.add_argument(
        "--schema", "-s",
        metavar="FILE",
        help="Path to a schema file to push"
    )
    schema_source.add_argument(
        "--schema-id", "-i",
        metavar="ID",
        help="ID of a schema from the registry to push"
    )
    schema_source.add_argument(
        "--list", "-l",
        action="store_true",
        help="List available schemas in the registry"
    )
    
    # Other arguments
    parser.add_argument(
        "--target", "-t",
        choices=["local", "remote", "both"],
        default="local",
        help="Target environment(s) to push the schema to (default: local)"
    )
    parser.add_argument(
        "--api-base", "-b",
        default=os.environ.get("MIMS_API_URL", DEFAULT_API_BASE),
        help=f"API base URL (default: {DEFAULT_API_BASE})"
    )
    parser.add_argument(
        "--api-key", "-k",
        default=os.environ.get("MIMS_ADMIN_API_KEY", ""),
        help="Admin API Key (default: from MIMS_ADMIN_API_KEY environment variable)"
    )
    
    args = parser.parse_args()

    # Check for API key
    if not args.api_key:
        print("❌ Error: Admin API key is required. Set MIMS_ADMIN_API_KEY environment variable or use --api-key.")
        return 1

    # Handle list option
    if args.list:
        success = list_schemas(args.api_base, args.api_key)
        return 0 if success else 1
    
    # Handle schema ID option
    if args.schema_id:
        success = push_schema_by_id(args.schema_id, args.target, args.api_base, args.api_key)
        return 0 if success else 1

    # Handle schema file option (default if nothing else specified)
    schema_path = args.schema
    if not schema_path:
        # Default schema path relative to the script
        script_dir = Path(__file__).parent
        schema_path = str(script_dir / "../schema.graphql")
        
    # Resolve schema path
    resolved_path = Path(schema_path).resolve()

    if not resolved_path.exists():
        print(f"❌ Schema file not found at '{resolved_path}'")
        return 1

    # Push schema file using the API client
    success = push_schema_file(resolved_path, args.target, args.api_base, args.api_key)
    return 0 if success else 1

if __name__ == "__main__":
    sys.exit(main())

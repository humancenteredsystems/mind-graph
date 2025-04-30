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
import requests
from pathlib import Path

# Default API endpoints (override with MIMS_API_URL env var)
DEFAULT_API_BASE = "http://localhost:3000/api"
DEFAULT_ADMIN_SCHEMA_ENDPOINT = f"{DEFAULT_API_BASE}/admin/schema"
DEFAULT_SCHEMAS_ENDPOINT = f"{DEFAULT_API_BASE}/schemas"

def list_schemas(api_base, api_key):
    """List all available schemas."""
    try:
        response = requests.get(
            f"{api_base}/schemas",
            headers={
                "Content-Type": "application/json",
                "X-Admin-API-Key": api_key
            }
        )
        
        if response.status_code == 200:
            schemas = response.json()
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
            print(f"❌ Failed to list schemas: {response.status_code}")
            try:
                print(json.dumps(response.json(), indent=2))
            except:
                print(response.text)
            return False
    except requests.RequestException as e:
        print(f"❌ API request failed: {str(e)}")
        return False

def push_schema_file(schema_path, target, api_endpoint, api_key):
    """Push a schema file via the API."""
    try:
        # Read the schema file
        with open(schema_path, "r", encoding="utf-8") as f:
            schema_text = f.read()
    except Exception as e:
        print(f"❌ Failed to read schema file: {str(e)}")
        return False

    # Send request to API
    print(f"Pushing schema from {schema_path} to {target} via API...")
    
    try:
        response = requests.post(
            api_endpoint,
            headers={
                "Content-Type": "application/json",
                "X-Admin-API-Key": api_key
            },
            json={
                "schema": schema_text,
                "target": target
            }
        )
        
        # Parse and display the response
        try:
            json_response = response.json()
            if response.status_code == 200 and json_response.get("success", False):
                print("✅ Schema push successful!")
                print(json.dumps(json_response, indent=2))
                return True
            else:
                print(f"❌ Schema push failed with status code {response.status_code}:")
                print(json.dumps(json_response, indent=2))
                return False
        except ValueError:
            # Response is not JSON
            print(f"❌ Schema push failed with status code {response.status_code}:")
            print(response.text)
            return False
            
    except requests.RequestException as e:
        print(f"❌ API request failed: {str(e)}")
        return False

def push_schema_by_id(schema_id, target, api_base, api_key):
    """Push a schema from the registry by ID."""
    api_endpoint = f"{api_base}/schemas/{schema_id}/push?target={target}"
    
    print(f"Pushing schema ID '{schema_id}' to {target} via API...")
    
    try:
        response = requests.post(
            api_endpoint,
            headers={
                "Content-Type": "application/json",
                "X-Admin-API-Key": api_key
            }
        )
        
        # Parse and display the response
        try:
            json_response = response.json()
            if response.status_code == 200 and json_response.get("success", False):
                print("✅ Schema push successful!")
                print(json.dumps(json_response, indent=2))
                return True
            else:
                print(f"❌ Schema push failed with status code {response.status_code}:")
                print(json.dumps(json_response, indent=2))
                return False
        except ValueError:
            # Response is not JSON
            print(f"❌ Schema push failed with status code {response.status_code}:")
            print(response.text)
            return False
    except requests.RequestException as e:
        print(f"❌ API request failed: {str(e)}")
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

    # Construct full API endpoints
    admin_schema_endpoint = f"{args.api_base}/admin/schema"
    
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
        schema_path = "../schema.graphql"  # Default
        
    # Resolve schema path (similar to push_schema.py)
    schema_path_arg = Path(schema_path)
    resolved_path = schema_path_arg.resolve()

    if not resolved_path.exists():
        script_dir = Path(__file__).parent
        schema_path_rel_script = (script_dir / schema_path_arg).resolve()
        if schema_path_rel_script.exists():
            resolved_path = schema_path_rel_script
        else:
            print(f"❌ Schema file not found at '{resolved_path}' (or relative to script at '{schema_path_rel_script}')")
            return 1

    success = push_schema_file(resolved_path, args.target, admin_schema_endpoint, args.api_key)
    return 0 if success else 1

if __name__ == "__main__":
    sys.exit(main())

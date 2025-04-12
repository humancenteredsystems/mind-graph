#!/usr/bin/env python3
"""
Push a GraphQL schema to Dgraph.

This tool uploads a GraphQL schema file to the Dgraph admin endpoint.
"""
import argparse
import sys
import requests
import time
from pathlib import Path

# --- Constants moved from utils.py ---
DEFAULT_ENDPOINT = "http://localhost:8080/graphql"
DEFAULT_ADMIN_ENDPOINT = "http://localhost:8080/admin"
# --- End Constants ---

# --- push_schema_to_dgraph logic moved here ---
def _push_schema_http(schema: str, endpoint: str) -> bool:
    """Internal function to push schema via HTTP POST."""
    headers = {"Content-Type": "application/graphql"}
    try:
        response = requests.post(endpoint, data=schema, headers=headers)
        response.raise_for_status()
        print("Schema push request sent successfully.") # Replaced logger
        return True
    except requests.RequestException as e:
        print(f"❌ Failed to push schema: {str(e)}") # Replaced logger
        if hasattr(response, 'text'):
            print(f"Response: {response.text}") # Replaced logger
        return False
# --- End push_schema_to_dgraph logic ---

def verify_schema_loaded() -> bool:
    """
    Simple verification that the schema was loaded into Dgraph.
    Uses standard introspection query.
    Returns:
        True if the schema is loaded, False otherwise
    """
    try:
        print("Waiting for schema to apply...") # Replaced logger
        time.sleep(10)  # Wait for the schema to be loaded
        introspection_query = "{ __schema { queryType { name } } }"
        verify_response = requests.post(
            DEFAULT_ENDPOINT,  # Use locally defined constant
            json={"query": introspection_query},
            headers={"Content-Type": "application/json"}
        )

        print(f"Verification response status: {verify_response.status_code}") # Replaced logger

        if verify_response.status_code == 200:
            result = verify_response.json()
            print(f"Verification response: {result}") # Replaced logger

            # Check if the introspection query returned data for __schema
            if "errors" not in result and result.get("data", {}).get("__schema"):
                return True
            else:
                if "errors" in result:
                    # Extract just the message for cleaner output
                    error_messages = [err.get('message', 'Unknown error') for err in result['errors']]
                    print(f"GraphQL errors during verification: {'; '.join(error_messages)}") # Replaced logger
        else:
            print(f"Verification request failed with status {verify_response.status_code}") # Replaced logger
            print(f"Response: {verify_response.text}") # Replaced logger

        return False
    except Exception as e:
        print(f"Schema verification error: {str(e)}") # Replaced logger
        return False

def main():
    """Main entry point for the script."""
    parser = argparse.ArgumentParser(description="Push a GraphQL schema to Dgraph")
    parser.add_argument(
        "--schema", "-s",
        default="../schema.graphql", # Adjusted default path relative to scripts/
        help="Path to the schema file (default: ../schema.graphql)"
    )
    # Construct endpoint default using local constant
    admin_schema_endpoint = f"{DEFAULT_ADMIN_ENDPOINT}/schema"
    parser.add_argument(
        "--endpoint", "-e",
        default=admin_schema_endpoint,
        help=f"Dgraph admin schema endpoint (default: {admin_schema_endpoint})"
    )
    parser.add_argument(
        "--no-verify", "-n",
        action="store_true",
        help="Skip schema verification after pushing"
    )
    args = parser.parse_args()

    # Resolve the schema path:
    # 1. Try the provided path directly (could be absolute or relative to CWD)
    # 2. If not found, try resolving relative to the script's directory
    schema_path_arg = Path(args.schema)
    schema_path = schema_path_arg.resolve() # Resolve relative to CWD first

    if not schema_path.exists():
        # If not found relative to CWD, try relative to script dir
        script_dir = Path(__file__).parent
        schema_path_rel_script = (script_dir / schema_path_arg).resolve()
        if schema_path_rel_script.exists():
            schema_path = schema_path_rel_script
        else:
            # If neither works, report error using the CWD-resolved path as primary
            print(f"❌ Schema file not found at '{schema_path}' (or relative to script at '{schema_path_rel_script}')")
            return 1

    # Read the schema file
    try:
        with open(schema_path, "r", encoding="utf-8") as f:
            schema_text = f.read()
    except Exception as e:
        print(f"❌ Failed to read schema file: {str(e)}") # Replaced logger
        return 1

    # Push the schema using the internal function
    print(f"Pushing schema from {schema_path} to {args.endpoint}") # Replaced logger
    success = _push_schema_http(schema_text, args.endpoint)

    if not success:
        # Error already printed by _push_schema_http
        return 1

    # Verify the schema was loaded if not disabled
    if not args.no_verify:
        print("Verifying schema was loaded...") # Replaced logger
        if verify_schema_loaded():
            print("✅ Schema verified successfully") # Replaced logger
        else:
            print("❌ Schema verification failed") # Replaced logger
            return 1

    print("✅ Schema push process completed successfully.") # Replaced logger
    return 0

if __name__ == "__main__":
    sys.exit(main())

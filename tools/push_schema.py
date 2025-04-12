#!/usr/bin/env python3
"""
Push a GraphQL schema to Dgraph.

This tool uploads a GraphQL schema file to the Dgraph admin endpoint.
"""
import argparse
import sys
import os
import requests
import time
from pathlib import Path

# Add parent directory to path to import utils
sys.path.append(str(Path(__file__).parent))
from utils import push_schema_to_dgraph, logger, DEFAULT_ADMIN_ENDPOINT, DEFAULT_ENDPOINT

def verify_schema_loaded() -> bool:
    """
    Simple verification that the schema was loaded into Dgraph.

    Returns:
        True if the schema is loaded, False otherwise
    """
    try:
        time.sleep(10)  # Wait longer for the schema to be loaded
        # Use a minimal standard introspection query for verification
        introspection_query = "{ __schema { queryType { name } } }"
        verify_response = requests.post(
            DEFAULT_ENDPOINT,  # Use the GraphQL endpoint for verification
            json={"query": introspection_query},
            headers={"Content-Type": "application/json"}
        )

        logger.info(f"Verification response status: {verify_response.status_code}")

        if verify_response.status_code == 200:
            result = verify_response.json()
            logger.info(f"Verification response: {result}")

            # Check if the introspection query returned data for __schema
            if "errors" not in result and result.get("data", {}).get("__schema"):
                return True
            else:
                if "errors" in result:
                    logger.error(f"GraphQL errors: {result['errors']}")
        else:
            logger.error(f"Verification request failed with status {verify_response.status_code}")
            logger.error(f"Response: {verify_response.text}")

        return False
    except Exception as e:
        logger.error(f"Schema verification error: {str(e)}")
        return False

def main():
    """Main entry point for the script."""
    parser = argparse.ArgumentParser(description="Push a GraphQL schema to Dgraph")
    parser.add_argument(
        "--schema", "-s",
        default="../schema.graphql",
        help="Path to the schema file (default: ../schema.graphql)"
    )
    parser.add_argument(
        "--endpoint", "-e",
        default=f"{DEFAULT_ADMIN_ENDPOINT}/schema",
        help=f"Dgraph admin schema endpoint (default: {DEFAULT_ADMIN_ENDPOINT}/schema)"
    )
    parser.add_argument(
        "--no-verify", "-n",
        action="store_true",
        help="Skip schema verification after pushing"
    )
    args = parser.parse_args()

    # Resolve the schema path relative to the current working directory
    schema_path = Path(args.schema).resolve()

    # Check if the schema file exists
    if not schema_path.exists():
        # Try resolving relative to script location if CWD fails (common if run from outside project root)
        script_dir_schema_path = (Path(__file__).parent / args.schema).resolve()
        if script_dir_schema_path.exists():
             schema_path = script_dir_schema_path
        else:
             logger.error(f"Schema file not found at {schema_path} or {script_dir_schema_path}")
             return 1


    # Read the schema file
    try:
        with open(schema_path, "r", encoding="utf-8") as f:
            schema_text = f.read()
    except Exception as e:
        logger.error(f"Failed to read schema file: {str(e)}")
        return 1

    # Push the schema to Dgraph
    logger.info(f"Pushing schema from {schema_path} to {args.endpoint}")
    success = push_schema_to_dgraph(schema_text, args.endpoint)

    if not success:
        logger.error("❌ Failed to push schema")
        return 1

    # Verify the schema was loaded if not disabled
    if not args.no_verify:
        logger.info("Verifying schema was loaded...")
        if verify_schema_loaded():
            logger.info("✅ Schema verified successfully")
        else:
            logger.error("❌ Schema verification failed")
            return 1

    logger.info("✅ Schema pushed successfully")
    return 0

if __name__ == "__main__":
    sys.exit(main())

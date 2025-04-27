#!/usr/bin/env python3
"""
Drop all data from the Dgraph database.

This tool sends a DropAll operation to the Dgraph /alter endpoint.
"""
import argparse
import sys
import requests
from typing import Dict, Any, Optional

# --- Constants ---
DEFAULT_ALTER_ENDPOINT = "http://localhost:8080/alter"
DEFAULT_GRAPHQL_ENDPOINT = "http://localhost:8080/graphql" # Add GraphQL endpoint for verification
# --- End Constants ---

def drop_all_data(endpoint: str) -> bool:
    """Sends a DropAll operation to the Dgraph /alter endpoint."""
    headers = {"Content-Type": "application/json"}
    payload = {"drop_all": True}

    print(f"Attempting to drop all data from Dgraph at {endpoint}...")

    try:
        response = requests.post(endpoint, json=payload, headers=headers)
        response.raise_for_status() # Raise an HTTPError for bad responses (4xx or 5xx)

        # Dgraph /alter endpoint for DropAll typically returns a success message or empty JSON on success
        print('✅ Drop operation request successful.')
        return True

    except requests.exceptions.RequestException as e:
        print(f"❌ Failed to send drop all data request: {str(e)}")
        if hasattr(response, 'text'):
            print(f"Response: {response.text}")
        return False
    except Exception as e:
        print(f"❌ An unexpected error occurred during drop request: {str(e)}")
        return False

def verify_data_dropped(graphql_endpoint: str) -> bool:
    """Queries Dgraph to verify if data has been dropped."""
    query = """
        query {
          queryNode {
            id
          }
        }
    """
    headers = {"Content-Type": "application/json"}
    payload = {"query": query}

    print(f"Verifying data drop by querying {graphql_endpoint}...")

    try:
        response = requests.post(graphql_endpoint, json=payload, headers=headers)
        response.raise_for_status()

        result = response.json()

        if result.get("data", {}).get("queryNode") is None:
             # Schema might be gone, queryNode might be null or missing
             print("✅ Verification successful: queryNode is null or missing (schema likely dropped).")
             return True
        elif len(result["data"]["queryNode"]) == 0:
            print("✅ Verification successful: No nodes found.")
            return True
        else:
            print(f"❌ Verification failed: Found {len(result['data']['queryNode'])} nodes after drop.")
            return False

    except requests.exceptions.RequestException as e:
        print(f"❌ Verification query failed: {str(e)}")
        if hasattr(response, 'text'):
            print(f"Response: {response.text}")
        # If the schema is dropped, the GraphQL endpoint might return an error on query.
        # This is acceptable verification.
        if response.status_code == 400 and "Unknown type \"queryNode\"" in response.text:
             print("✅ Verification successful: Schema appears to be dropped.")
             return True
        return False
    except Exception as e:
        print(f"❌ An unexpected error occurred during verification: {str(e)}")
        return False


def main():
    """Main entry point for the script."""
    parser = argparse.ArgumentParser(description="Drop all data from the Dgraph database")
    parser.add_argument(
        "--endpoint", "-e",
        default=DEFAULT_ALTER_ENDPOINT,
        help=f"Dgraph /alter endpoint (default: {DEFAULT_ALTER_ENDPOINT})"
    )
    parser.add_argument(
        "--graphql-endpoint", "-g",
        default=DEFAULT_GRAPHQL_ENDPOINT,
        help=f"Dgraph GraphQL endpoint for verification (default: {DEFAULT_GRAPHQL_ENDPOINT})"
    )
    args = parser.parse_args()

    # Perform the drop operation
    if not drop_all_data(args.endpoint):
        sys.exit(1) # Exit if the drop request failed

    # Add a small delay to allow Dgraph to process the drop
    import time
    time.sleep(2) # Adjust delay if needed

    # Verify the data has been dropped
    if not verify_data_dropped(args.graphql_endpoint):
        sys.exit(1) # Exit if verification failed

    print("✅ Data drop process completed and verified.")
    sys.exit(0) # Exit successfully

if __name__ == "__main__":
    main()

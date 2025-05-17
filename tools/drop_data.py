#!/usr/bin/env python3
"""
Drop all data from the Dgraph database using the backend API.

This tool calls the /api/admin/dropAll endpoint on the backend API.
"""
import argparse
import sys
import os # Import os to read environment variables

# Add the parent directory to the Python path to be able to import tools
sys.path.append(os.path.join(os.path.dirname(__file__), '..'))
from tools.api_client import call_api # Import the shared API client

# --- Constants (API base derived from env) ---
env_api_base = os.environ.get("MIMS_API_URL")
if not env_api_base and os.environ.get("DGRAPH_BASE_URL"):
    env_api_base = os.environ["DGRAPH_BASE_URL"].replace("/graphql", "/api")
DEFAULT_API_BASE_URL = env_api_base or "http://localhost:3000/api"
# --- End Constants ---

def drop_all_data_via_api(api_base_url: str, target: str, admin_api_key: str) -> bool:
    """Calls the backend API's /api/admin/dropAll endpoint using the API client."""
    print(f"Attempting to drop all data via API at {api_base_url} for target: {target}...")

    payload = {"target": target}
    response = call_api(api_base_url, "/admin/dropAll", admin_api_key, method='POST', payload=payload)

    if response["success"]:
        print('✅ Drop operation request successful via API.')
        # The API client already prints basic success/error messages.
        # We can optionally print more details from the 'data' or 'results' field
        if response.get("data") and response["data"].get("results"):
             print("API Results:")
             for instance, res in response["data"]["results"].items():
                 status = "SUCCESS" if res.get("success") else "FAILED"
                 print(f"  {instance.capitalize()}: {status}")
                 if res.get("error"):
                     print(f"    Error: {res['error']}")
        return True
    else:
        print(f'❌ Drop operation request failed via API: {response["error"]}')
        if response.get("details"):
            print("Details:", response["details"])
        return False


def main():
    """Main entry point for the script."""
    parser = argparse.ArgumentParser(description="Drop all data from the Dgraph database using the backend API")
    parser.add_argument(
        "--api-base",
        default=DEFAULT_API_BASE_URL,
        help=f"Backend API base URL (default: {DEFAULT_API_BASE_URL})"
    )
    parser.add_argument(
        "--target", "-t",
        required=True,
        choices=['local', 'remote', 'both'],
        help="Target Dgraph instance(s): 'local', 'remote', or 'both'"
    )
    parser.add_argument(
        "--admin-api-key",
        help="Admin API Key (can also be set via ADMIN_API_KEY environment variable)"
    )
    args = parser.parse_args()

    admin_api_key = args.admin_api_key or os.environ.get("ADMIN_API_KEY")

    if not admin_api_key:
        print("Error: Admin API Key is required. Provide via --admin-api-key or ADMIN_API_KEY environment variable.")
        sys.exit(1)

    # Perform the drop operation via API
    if not drop_all_data_via_api(args.api_base, args.target, admin_api_key):
        sys.exit(1) # Exit if the API request failed

    print("✅ Data drop process completed via API.")
    sys.exit(0) # Exit successfully

if __name__ == "__main__":
    main()

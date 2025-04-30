#!/usr/bin/env python3
"""
Drop all data from the Dgraph database using the backend API.

This tool calls the /api/admin/dropAll endpoint on the backend API.
"""
import argparse
import sys
import requests
import os # Import os to read environment variables

# --- Constants ---
DEFAULT_API_BASE_URL = "http://localhost:3000/api"
# --- End Constants ---

def drop_all_data_via_api(api_base_url: str, target: str, admin_api_key: str) -> bool:
    """Calls the backend API's /api/admin/dropAll endpoint."""
    url = f"{api_base_url}/admin/dropAll"
    headers = {
        "Content-Type": "application/json",
        "X-Admin-API-Key": admin_api_key
    }
    payload = {"target": target}

    print(f"Attempting to drop all data via API at {url} for target: {target}...")

    try:
        response = requests.post(url, json=payload, headers=headers)
        response.raise_for_status() # Raise an HTTPError for bad responses (4xx or 5xx)

        result = response.json()

        if result.get("success"):
            print('✅ Drop operation request successful via API.')
            # Optionally print detailed results from the API response
            if result.get("results"):
                print("API Results:")
                for instance, res in result["results"].items():
                    status = "SUCCESS" if res.get("success") else "FAILED"
                    print(f"  {instance.capitalize()}: {status}")
                    if res.get("error"):
                        print(f"    Error: {res['error']}")
            return True
        else:
            print('❌ Drop operation request failed via API.')
            if result.get("message"):
                print(f"Message: {result['message']}")
            if result.get("results"):
                 print("API Results:")
                 for instance, res in result["results"].items():
                     status = "SUCCESS" if res.get("success") else "FAILED"
                     print(f"  {instance.capitalize()}: {status}")
                     if res.get("error"):
                         print(f"    Error: {res['error']}")
            return False

    except requests.exceptions.RequestException as e:
        print(f"❌ Failed to send drop all data request to API: {str(e)}")
        if hasattr(response, 'text'):
            print(f"Response: {response.text}")
        return False
    except Exception as e:
        print(f"❌ An unexpected error occurred during API request: {str(e)}")
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

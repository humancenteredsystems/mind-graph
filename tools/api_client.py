import requests
import json
from typing import Dict, Any, Optional

def call_api(
    api_base_url: str,
    endpoint_path: str,
    api_key: str,
    method: str = 'POST',
    payload: Optional[Dict[str, Any]] = None,
    params: Optional[Dict[str, Any]] = None,
    extra_headers: Optional[Dict[str, str]] = None
) -> Dict[str, Any]:
    """
    Makes an authenticated request to the backend API.

    Args:
        api_base_url: The base URL of the backend API (e.g., "http://localhost:3000/api").
        endpoint_path: The path of the API endpoint (e.g., "/mutate", "/admin/schema").
        api_key: The Admin API Key.
        method: The HTTP method (e.g., 'POST', 'GET'). Defaults to 'POST'.
        payload: The JSON payload for POST/PUT requests.
        params: The query parameters for GET requests.

    Returns:
        A dictionary containing the API response:
        {
            "success": bool,
            "status_code": int,
            "data": Optional[Any],
            "error": Optional[str],
            "details": Optional[Any] # More detailed error info if available
        }
    """
    url = f"{api_base_url.rstrip('/')}{endpoint_path}"
    headers = {
        "Content-Type": "application/json",
        "X-Admin-API-Key": api_key
    }
    if extra_headers:
        headers.update(extra_headers)

    try:
        response = requests.request(
            method,
            url,
            headers=headers,
            json=payload if method in ['POST', 'PUT'] else None,
            params=params if method == 'GET' else None
        )

        # Dgraph GraphQL errors are often in the response body even with 200 status
        # API server might also return errors in body with 200 status
        try:
            response_data = response.json()
        except json.JSONDecodeError:
            response_data = response.text # Fallback to text if not JSON

        if response.status_code >= 200 and response.status_code < 300:
            # Check for GraphQL errors in the response body for GraphQL endpoints
            if endpoint_path in ['/query', '/mutate'] and isinstance(response_data, dict) and "errors" in response_data:
                 error_messages = [err.get('message', 'Unknown GraphQL error') for err in response_data['errors']]
                 print(f"❌ API request to {url} failed with GraphQL errors: {'; '.join(error_messages)}")
                 return {
                    "success": False,
                    "status_code": response.status_code,
                    "data": response_data, # Include data for inspection
                    "error": "GraphQL errors in response",
                    "details": response_data.get("errors")
                 }

            # Check for API-level success flag if present
            if isinstance(response_data, dict) and response_data.get("success") is False:
                 print(f"❌ API request to {url} failed with API-level error: {response_data.get('message', 'Unknown API error')}")
                 return {
                    "success": False,
                    "status_code": response.status_code,
                    "data": response_data,
                    "error": response_data.get("message", "API reported failure"),
                    "details": response_data.get("results") # Include results for dropAll/push endpoints
                 }


            # If we reach here, it's a 2xx status and no obvious errors in body
            print(f"✅ API request to {url} successful.")
            return {
                "success": True,
                "status_code": response.status_code,
                "data": response_data,
                "error": None,
                "details": None
            }
        else:
            # Handle non-2xx HTTP status codes
            print(f"❌ API request to {url} failed with status code: {response.status_code}")
            return {
                "success": False,
                "status_code": response.status_code,
                "data": response_data,
                "error": f"HTTP error: {response.status_code} - {response.reason}",
                "details": response_data
            }

    except requests.exceptions.RequestException as e:
        print(f"❌ API request to {url} failed: {str(e)}")
        return {
            "success": False,
            "status_code": None,
            "data": None,
            "error": f"Request Exception: {str(e)}",
            "details": None
        }
    except Exception as e:
        print(f"❌ An unexpected error occurred during API request to {url}: {str(e)}")
        return {
            "success": False,
            "status_code": None,
            "data": None,
            "error": f"Unexpected Error: {str(e)}",
            "details": None
        }

if __name__ == '__main__':
    # Example Usage (for testing the client itself)
    # This part won't run when imported as a module
    print("This is the API client module. Import and use the 'call_api' function.")
    print("Example:")
    print("from tools.api_client import call_api")
    print("api_base = 'http://localhost:3000/api'")
    print("api_key = os.environ.get('ADMIN_API_KEY', 'your_default_key')")
    print("response = call_api(api_base, '/health', api_key, method='GET')")
    print("print(response)")

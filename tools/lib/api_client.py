"""
Enhanced API client for MIMS-Graph with tenant support and proper error handling.
Consolidates functionality from multiple duplicate implementations.
"""

import requests
import json
import os
from typing import Dict, Any, Optional, Union
from .errors import APIError, AuthenticationError, GraphQLError, ValidationError


class APIClient:
    """Enhanced API client with tenant context and proper error handling."""
    
    def __init__(self, 
                 api_base: str = None, 
                 api_key: str = None,
                 tenant_id: str = None,
                 timeout: int = 30):
        """
        Initialize API client.
        
        Args:
            api_base: Base API URL (defaults to env var or localhost)
            api_key: Admin API key (defaults to env var)
            tenant_id: Default tenant context
            timeout: Request timeout in seconds
        """
        self.api_base = self._resolve_api_base(api_base)
        self.api_key = self._resolve_api_key(api_key)
        self.tenant_id = tenant_id
        self.timeout = timeout
        self.session = requests.Session()
        
        # Set default headers
        self.session.headers.update({
            "Content-Type": "application/json",
            "User-Agent": "MIMS-Graph-Tools/1.0"
        })
        
        if self.api_key:
            self.session.headers.update({
                "X-Admin-API-Key": self.api_key
            })
    
    def _resolve_api_base(self, api_base: str) -> str:
        """Resolve API base URL from various sources."""
        if api_base:
            return api_base.rstrip('/')
        
        # Try environment variables
        env_api_base = os.environ.get("MIMS_API_URL")
        if env_api_base:
            return env_api_base.rstrip('/')
        
        # Try deriving from DGRAPH_BASE_URL
        dgraph_base = os.environ.get("DGRAPH_BASE_URL")
        if dgraph_base:
            return dgraph_base.replace("/graphql", "/api").rstrip('/')
        
        # Default fallback
        return "http://localhost:3000/api"
    
    def _resolve_api_key(self, api_key: str) -> str:
        """Resolve API key from various sources."""
        return (api_key or 
                os.environ.get("MIMS_ADMIN_API_KEY") or 
                os.environ.get("ADMIN_API_KEY") or 
                "")
    
    def _build_headers(self, extra_headers: Dict[str, str] = None, tenant_id: str = None) -> Dict[str, str]:
        """Build headers with tenant context."""
        headers = {}
        
        # Add tenant context
        effective_tenant_id = tenant_id or self.tenant_id
        if effective_tenant_id:
            headers["X-Tenant-Id"] = effective_tenant_id
        
        # Add extra headers
        if extra_headers:
            headers.update(extra_headers)
        
        return headers
    
    def request(self, 
                endpoint: str,
                method: str = "POST",
                payload: Dict[str, Any] = None,
                params: Dict[str, Any] = None,
                tenant_id: str = None,
                extra_headers: Dict[str, str] = None) -> Dict[str, Any]:
        """
        Make an API request with proper error handling.
        
        Args:
            endpoint: API endpoint path (e.g., "/mutate", "/admin/schema")
            method: HTTP method
            payload: JSON payload for POST/PUT requests
            params: Query parameters for GET requests
            tenant_id: Override default tenant context
            extra_headers: Additional headers
            
        Returns:
            Response data
            
        Raises:
            APIError: For HTTP errors
            AuthenticationError: For auth failures
            GraphQLError: For GraphQL errors
            ValidationError: For validation errors
        """
        url = f"{self.api_base}{endpoint}"
        headers = self._build_headers(extra_headers, tenant_id)
        
        try:
            response = self.session.request(
                method,
                url,
                headers=headers,
                json=payload if method in ['POST', 'PUT'] else None,
                params=params if method == 'GET' else None,
                timeout=self.timeout
            )
            
            # Try to parse JSON response
            try:
                response_data = response.json()
            except json.JSONDecodeError:
                response_data = {"text": response.text}
            
            # Check HTTP status
            if response.status_code == 401:
                raise AuthenticationError("Invalid or missing API key")
            elif response.status_code >= 400:
                error_msg = response_data.get("error", f"HTTP {response.status_code}: {response.reason}")
                raise APIError(error_msg, response.status_code, response_data)
            
            # Check for GraphQL errors
            if endpoint in ['/query', '/mutate'] and isinstance(response_data, dict):
                if "errors" in response_data:
                    error_messages = [err.get('message', 'Unknown GraphQL error') 
                                    for err in response_data['errors']]
                    raise GraphQLError("; ".join(error_messages), response_data['errors'])
            
            # Check for API-level success flag
            if isinstance(response_data, dict) and response_data.get("success") is False:
                error_msg = response_data.get("message", "API reported failure")
                raise APIError(error_msg, response.status_code, response_data)
            
            return response_data
            
        except requests.exceptions.Timeout:
            raise APIError(f"Request to {url} timed out after {self.timeout} seconds")
        except requests.exceptions.ConnectionError:
            raise APIError(f"Failed to connect to {url}")
        except requests.exceptions.RequestException as e:
            raise APIError(f"Request failed: {str(e)}")
    
    def get(self, endpoint: str, params: Dict[str, Any] = None, tenant_id: str = None, **kwargs) -> Dict[str, Any]:
        """Make a GET request."""
        return self.request(endpoint, "GET", params=params, tenant_id=tenant_id, **kwargs)
    
    def post(self, endpoint: str, payload: Dict[str, Any] = None, tenant_id: str = None, **kwargs) -> Dict[str, Any]:
        """Make a POST request."""
        return self.request(endpoint, "POST", payload=payload, tenant_id=tenant_id, **kwargs)
    
    def put(self, endpoint: str, payload: Dict[str, Any] = None, tenant_id: str = None, **kwargs) -> Dict[str, Any]:
        """Make a PUT request."""
        return self.request(endpoint, "PUT", payload=payload, tenant_id=tenant_id, **kwargs)
    
    def delete(self, endpoint: str, tenant_id: str = None, **kwargs) -> Dict[str, Any]:
        """Make a DELETE request."""
        return self.request(endpoint, "DELETE", tenant_id=tenant_id, **kwargs)
    
    def query(self, query: str, variables: Dict[str, Any] = None, tenant_id: str = None) -> Dict[str, Any]:
        """Execute a GraphQL query."""
        payload = {"query": query}
        if variables:
            payload["variables"] = variables
        
        return self.post("/query", payload, tenant_id=tenant_id)
    
    def mutate(self, mutation: str, variables: Dict[str, Any] = None, tenant_id: str = None) -> Dict[str, Any]:
        """Execute a GraphQL mutation."""
        payload = {"mutation": mutation}
        if variables:
            payload["variables"] = variables
        
        return self.post("/mutate", payload, tenant_id=tenant_id)
    
    def check_system_status(self) -> Dict[str, Any]:
        """Check system status (no auth required)."""
        # Don't use session headers for system status
        url = f"{self.api_base}/system/status"
        try:
            response = requests.get(url, timeout=self.timeout)
            return response.json()
        except Exception as e:
            raise APIError(f"Failed to get system status: {str(e)}")
    
    def set_tenant_context(self, tenant_id: str):
        """Set default tenant context for subsequent requests."""
        self.tenant_id = tenant_id
    
    def clear_tenant_context(self):
        """Clear tenant context."""
        self.tenant_id = None


# Legacy compatibility function
def call_api(api_base_url: str,
             endpoint_path: str,
             api_key: str,
             method: str = 'POST',
             payload: Optional[Dict[str, Any]] = None,
             params: Optional[Dict[str, Any]] = None,
             extra_headers: Optional[Dict[str, str]] = None) -> Dict[str, Any]:
    """
    Legacy compatibility function for existing code.
    
    Returns old format: {"success": bool, "status_code": int, "data": Any, "error": str, "details": Any}
    """
    client = APIClient(api_base_url, api_key)
    
    try:
        data = client.request(endpoint_path, method, payload, params, extra_headers=extra_headers)
        print(f"✅ API request to {api_base_url}{endpoint_path} successful.")
        return {
            "success": True,
            "status_code": 200,
            "data": data,
            "error": None,
            "details": None
        }
    except APIError as e:
        print(f"❌ API request to {api_base_url}{endpoint_path} failed: {e}")
        return {
            "success": False,
            "status_code": e.status_code,
            "data": e.details,
            "error": str(e),
            "details": e.details
        }
    except Exception as e:
        print(f"❌ API request to {api_base_url}{endpoint_path} failed: {e}")
        return {
            "success": False,
            "status_code": None,
            "data": None,
            "error": str(e),
            "details": None
        }

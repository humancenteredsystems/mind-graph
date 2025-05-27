"""
Tenant utilities for MIMS-Graph tools.
Provides centralized tenant context handling and validation.
"""

import os
from typing import Dict, Optional, List
from .api_client import APIClient
from .errors import TenantNotFoundError, ValidationError, APIError


class TenantUtils:
    """Utilities for tenant management and context."""
    
    # Standard tenant mappings (can be overridden by querying the API)
    STANDARD_TENANTS = {
        "default": "0x0",
        "test-tenant": "0x1"
    }
    
    def __init__(self, api_client: APIClient = None):
        """
        Initialize tenant utilities.
        
        Args:
            api_client: Optional API client instance
        """
        self.api_client = api_client or APIClient()
        self._namespace_cache = {}
    
    def validate_tenant_id(self, tenant_id: str) -> bool:
        """
        Validate that a tenant ID is valid.
        
        Args:
            tenant_id: Tenant ID to validate
            
        Returns:
            True if valid
            
        Raises:
            ValidationError: If tenant ID is invalid
        """
        if not tenant_id:
            raise ValidationError("Tenant ID cannot be empty")
        
        if not isinstance(tenant_id, str):
            raise ValidationError("Tenant ID must be a string")
        
        # Check for invalid characters
        invalid_chars = [' ', '\t', '\n', '\r', '/', '\\', '?', '#']
        for char in invalid_chars:
            if char in tenant_id:
                raise ValidationError(f"Tenant ID cannot contain '{char}'")
        
        return True
    
    def get_tenant_namespace(self, tenant_id: str, use_cache: bool = True) -> str:
        """
        Get the namespace for a tenant.
        
        Args:
            tenant_id: Tenant ID
            use_cache: Whether to use cached namespace mappings
            
        Returns:
            Namespace string (e.g., "0x0", "0x1")
            
        Raises:
            TenantNotFoundError: If tenant doesn't exist
        """
        self.validate_tenant_id(tenant_id)
        
        # Check cache first
        if use_cache and tenant_id in self._namespace_cache:
            return self._namespace_cache[tenant_id]
        
        # Try standard mappings first
        if tenant_id in self.STANDARD_TENANTS:
            namespace = self.STANDARD_TENANTS[tenant_id]
            self._namespace_cache[tenant_id] = namespace
            return namespace
        
        # Query the API for dynamic tenant mappings
        try:
            # This endpoint may not exist yet, so fall back gracefully
            response = self.api_client.get(f"/tenants/{tenant_id}")
            namespace = response.get("namespace")
            if namespace:
                self._namespace_cache[tenant_id] = namespace
                return namespace
        except APIError:
            # Fall back to generated namespace if API doesn't support it
            pass
        
        # If we can't find the tenant, raise an error
        raise TenantNotFoundError(tenant_id)
    
    def tenant_exists(self, tenant_id: str) -> bool:
        """
        Check if a tenant exists.
        
        Args:
            tenant_id: Tenant ID to check
            
        Returns:
            True if tenant exists
        """
        try:
            self.get_tenant_namespace(tenant_id)
            return True
        except TenantNotFoundError:
            return False
    
    def list_available_tenants(self) -> List[Dict[str, str]]:
        """
        List all available tenants.
        
        Returns:
            List of tenant dictionaries with 'id' and 'namespace' keys
        """
        tenants = []
        
        # Add standard tenants
        for tenant_id, namespace in self.STANDARD_TENANTS.items():
            tenants.append({
                "id": tenant_id,
                "namespace": namespace,
                "type": "standard"
            })
        
        # Try to get additional tenants from API
        try:
            response = self.api_client.get("/tenants")
            if isinstance(response, list):
                for tenant_data in response:
                    if tenant_data.get("id") not in self.STANDARD_TENANTS:
                        tenants.append({
                            "id": tenant_data["id"],
                            "namespace": tenant_data.get("namespace", "unknown"),
                            "type": "dynamic"
                        })
        except APIError:
            # API endpoint may not exist yet
            pass
        
        return tenants
    
    def get_system_capabilities(self) -> Dict[str, bool]:
        """
        Get system capabilities (enterprise, multi-tenant, etc.).
        
        Returns:
            Dictionary of capabilities
        """
        try:
            status = self.api_client.check_system_status()
            is_enterprise = status.get("dgraphEnterprise", False)
            is_multi_tenant = status.get("mode") == "multi-tenant"
            
            return {
                "enterprise": is_enterprise,
                "multi_tenant": is_multi_tenant,
                "namespaces_supported": is_enterprise and is_multi_tenant,
                "mode": status.get("mode", "unknown")
            }
        except APIError:
            # Return conservative defaults
            return {
                "enterprise": False,
                "multi_tenant": False,
                "namespaces_supported": False,
                "mode": "oss"
            }
    
    def create_tenant_context(self, tenant_id: str) -> Dict[str, str]:
        """
        Create tenant context headers.
        
        Args:
            tenant_id: Tenant ID
            
        Returns:
            Dictionary of headers for API requests
        """
        self.validate_tenant_id(tenant_id)
        return {"X-Tenant-Id": tenant_id}
    
    def clear_namespace_cache(self):
        """Clear the namespace cache."""
        self._namespace_cache.clear()
    
    def suggest_tenant_creation(self, tenant_id: str) -> str:
        """
        Generate a helpful message for creating a tenant.
        
        Args:
            tenant_id: Tenant ID that doesn't exist
            
        Returns:
            Helpful message string
        """
        return (f"💡 Tenant '{tenant_id}' not found. "
                f"You may need to create it first:\n"
                f"   python tools/create_tenant.py {tenant_id}")
    
    @classmethod
    def is_test_tenant(cls, tenant_id: str) -> bool:
        """
        Check if a tenant ID represents a test tenant.
        
        Args:
            tenant_id: Tenant ID to check
            
        Returns:
            True if this is a test tenant
        """
        return tenant_id in ["test-tenant", "test", "testing"] or tenant_id.startswith("test-")
    
    @classmethod
    def is_production_tenant(cls, tenant_id: str) -> bool:
        """
        Check if a tenant ID represents a production tenant.
        
        Args:
            tenant_id: Tenant ID to check
            
        Returns:
            True if this is a production tenant
        """
        return tenant_id in ["default", "production", "prod", "main"]


# Convenience functions for quick access
def get_tenant_namespace(tenant_id: str, api_client: APIClient = None) -> str:
    """Get namespace for a tenant (convenience function)."""
    utils = TenantUtils(api_client)
    return utils.get_tenant_namespace(tenant_id)


def tenant_exists(tenant_id: str, api_client: APIClient = None) -> bool:
    """Check if tenant exists (convenience function)."""
    utils = TenantUtils(api_client)
    return utils.tenant_exists(tenant_id)


def create_tenant_headers(tenant_id: str) -> Dict[str, str]:
    """Create tenant context headers (convenience function)."""
    utils = TenantUtils()
    return utils.create_tenant_context(tenant_id)

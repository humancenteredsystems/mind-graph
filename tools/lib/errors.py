"""
Custom exception classes for the MIMS-Graph tools library.
"""


class MIMSError(Exception):
    """Base exception for all MIMS-Graph related errors."""
    pass


class APIError(MIMSError):
    """Error during API communication."""
    
    def __init__(self, message, status_code=None, details=None):
        super().__init__(message)
        self.status_code = status_code
        self.details = details
    
    def __str__(self):
        base_msg = super().__str__()
        if self.status_code:
            base_msg += f" (HTTP {self.status_code})"
        return base_msg


class TenantNotFoundError(MIMSError):
    """Tenant does not exist."""
    
    def __init__(self, tenant_id):
        self.tenant_id = tenant_id
        super().__init__(f"Tenant '{tenant_id}' not found")


class NamespaceError(MIMSError):
    """Error related to namespace operations."""
    
    def __init__(self, message, namespace=None):
        super().__init__(message)
        self.namespace = namespace


class SchemaError(MIMSError):
    """Error during schema operations."""
    
    def __init__(self, message, schema_details=None):
        super().__init__(message)
        self.schema_details = schema_details


class ValidationError(MIMSError):
    """Error during input validation."""
    pass


class AuthenticationError(MIMSError):
    """Error with API authentication."""
    pass


class GraphQLError(MIMSError):
    """Error in GraphQL operations."""
    
    def __init__(self, message, graphql_errors=None):
        super().__init__(message)
        self.graphql_errors = graphql_errors or []

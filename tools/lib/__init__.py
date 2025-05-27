"""
MIMS-Graph Tools Library

Shared utilities for all tools to reduce duplication and improve maintainability.
"""

__version__ = "1.0.0"

# Import core modules for easy access
from .api_client import APIClient
from .dgraph_ops import DgraphOperations
from .tenant_utils import TenantUtils
from .base_tool import BaseTool, QueryTool, MutationTool
from .errors import *

__all__ = [
    'APIClient',
    'DgraphOperations', 
    'TenantUtils',
    'BaseTool',
    'QueryTool', 
    'MutationTool',
    # Error classes
    'TenantNotFoundError',
    'NamespaceError',
    'SchemaError',
    'APIError',
    'MIMSError',
    'ValidationError',
    'AuthenticationError',
    'GraphQLError'
]

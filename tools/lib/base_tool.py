"""
Base class for all MIMS-Graph tools.
Provides standardized argument parsing, error handling, and setup.
"""

import argparse
import sys
import os
from typing import Dict, Any, Optional, List
from .api_client import APIClient
from .dgraph_ops import DgraphOperations
from .tenant_utils import TenantUtils
from .errors import MIMSError, TenantNotFoundError, ValidationError, AuthenticationError


class BaseTool:
    """Base class for all MIMS-Graph tools."""
    
    def __init__(self, description: str = None):
        """
        Initialize base tool.
        
        Args:
            description: Tool description for help text
        """
        self.description = description or "MIMS-Graph tool"
        self.parser = None
        self.args = None
        self.api_client = None
        self.dgraph_ops = None
        self.tenant_utils = None
    
    def create_parser(self) -> argparse.ArgumentParser:
        """Create argument parser with common arguments."""
        parser = argparse.ArgumentParser(description=self.description)
        
        # Add common arguments that all tools should have
        self.add_common_arguments(parser)
        
        # Subclasses can override this to add specific arguments
        self.add_tool_arguments(parser)
        
        return parser
    
    def add_common_arguments(self, parser: argparse.ArgumentParser):
        """Add common arguments used by all tools."""
        # Tenant context
        parser.add_argument(
            "--tenant-id", "-t",
            default="default",
            help="Tenant ID for multi-tenant operations (default: 'default')"
        )
        
        # API configuration
        parser.add_argument(
            "--api-key", "-k",
            default=os.environ.get("ADMIN_API_KEY", ""),
            help="Admin API key (default: from ADMIN_API_KEY env var)"
        )
        
        parser.add_argument(
            "--api-base", "-b",
            default=self._get_default_api_base(),
            help="API base URL (default: auto-detected)"
        )
        
        # Common flags
        parser.add_argument(
            "--verbose", "-v",
            action="store_true",
            help="Enable verbose output"
        )
        
        parser.add_argument(
            "--test",
            action="store_true",
            help="Use test-tenant context (shorthand for --tenant-id test-tenant)"
        )
        
        parser.add_argument(
            "--dry-run",
            action="store_true",
            help="Show what would be done without executing"
        )
    
    def add_tool_arguments(self, parser: argparse.ArgumentParser):
        """Override this method to add tool-specific arguments."""
        pass
    
    def _get_default_api_base(self) -> str:
        """Get default API base URL."""
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
    
    def parse_args(self, args: List[str] = None) -> argparse.Namespace:
        """Parse command line arguments."""
        if self.parser is None:
            self.parser = self.create_parser()
        
        self.args = self.parser.parse_args(args)
        
        # Handle --test shorthand
        if getattr(self.args, 'test', False):
            self.args.tenant_id = "test-tenant"
        
        return self.args
    
    def validate_args(self) -> bool:
        """Validate parsed arguments. Override in subclasses."""
        # Check API key
        if not self.args.api_key:
            self.error("API key is required. Set ADMIN_API_KEY environment variable or use --api-key.")
            return False
        
        # Validate tenant ID
        try:
            if self.tenant_utils:
                self.tenant_utils.validate_tenant_id(self.args.tenant_id)
        except ValidationError as e:
            self.error(f"Invalid tenant ID: {e}")
            return False
        
        return True
    
    def setup(self):
        """Setup API client and utilities."""
        self.api_client = APIClient(
            api_base=self.args.api_base,
            api_key=self.args.api_key,
            tenant_id=self.args.tenant_id
        )
        
        self.dgraph_ops = DgraphOperations(
            api_client=self.api_client,
            tenant_id=self.args.tenant_id
        )
        
        self.tenant_utils = TenantUtils(self.api_client)
    
    def run(self, args: List[str] = None) -> int:
        """
        Main entry point for the tool.
        
        Args:
            args: Command line arguments (defaults to sys.argv)
            
        Returns:
            Exit code (0 for success, non-zero for failure)
        """
        try:
            # Parse arguments
            self.parse_args(args)
            
            # Setup utilities
            self.setup()
            
            # Validate arguments
            if not self.validate_args():
                return 1
            
            # Show context if verbose
            if self.args.verbose:
                self.show_context()
            
            # Check tenant exists (if not default)
            if self.args.tenant_id != "default":
                if not self.tenant_utils.tenant_exists(self.args.tenant_id):
                    self.error(f"Tenant '{self.args.tenant_id}' not found")
                    self.info(self.tenant_utils.suggest_tenant_creation(self.args.tenant_id))
                    return 1
            
            # Run the tool logic
            return self.execute()
            
        except KeyboardInterrupt:
            self.info("\n❌ Operation cancelled by user")
            return 130
        except AuthenticationError as e:
            self.error(f"Authentication failed: {e}")
            self.info("💡 Check your API key in ADMIN_API_KEY environment variable")
            return 1
        except TenantNotFoundError as e:
            self.error(str(e))
            self.info(self.tenant_utils.suggest_tenant_creation(e.tenant_id))
            return 1
        except MIMSError as e:
            self.error(f"Operation failed: {e}")
            if self.args.verbose and hasattr(e, 'details') and e.details:
                self.debug(f"Details: {e.details}")
            return 1
        except Exception as e:
            self.error(f"Unexpected error: {e}")
            if self.args.verbose:
                import traceback
                self.debug(traceback.format_exc())
            return 1
    
    def execute(self) -> int:
        """
        Override this method to implement tool-specific logic.
        
        Returns:
            Exit code (0 for success, non-zero for failure)
        """
        raise NotImplementedError("Subclasses must implement execute() method")
    
    def show_context(self):
        """Show current context information."""
        capabilities = self.tenant_utils.get_system_capabilities()
        
        self.info("🔧 Tool Context:")
        self.info(f"  API Base: {self.args.api_base}")
        self.info(f"  Tenant: {self.args.tenant_id}")
        self.info(f"  Mode: {capabilities['mode']}")
        if capabilities['namespaces_supported']:
            try:
                namespace = self.tenant_utils.get_tenant_namespace(self.args.tenant_id)
                self.info(f"  Namespace: {namespace}")
            except TenantNotFoundError:
                self.info(f"  Namespace: unknown (tenant not found)")
    
    def info(self, message: str):
        """Print info message."""
        print(message)
    
    def error(self, message: str):
        """Print error message."""
        print(f"❌ {message}", file=sys.stderr)
    
    def warning(self, message: str):
        """Print warning message."""
        print(f"⚠️  {message}")
    
    def success(self, message: str):
        """Print success message."""
        print(f"✅ {message}")
    
    def debug(self, message: str):
        """Print debug message if verbose mode is enabled."""
        if getattr(self.args, 'verbose', False):
            print(f"🔍 DEBUG: {message}")
    
    def confirm(self, message: str, default: bool = False) -> bool:
        """
        Ask user for confirmation.
        
        Args:
            message: Confirmation message
            default: Default response if user just presses Enter
            
        Returns:
            True if user confirms
        """
        if getattr(self.args, 'dry_run', False):
            self.info(f"DRY RUN: Would ask: {message}")
            return False
        
        suffix = " [Y/n]" if default else " [y/N]"
        try:
            response = input(f"❓ {message}{suffix}: ").strip().lower()
            
            if not response:
                return default
            
            return response in ['y', 'yes', 'true', '1']
        except (EOFError, KeyboardInterrupt):
            return False


class QueryTool(BaseTool):
    """Base class for tools that query data."""
    
    def add_tool_arguments(self, parser: argparse.ArgumentParser):
        """Add query-specific arguments."""
        parser.add_argument(
            "--format", "-f",
            choices=["json", "table", "simple"],
            default="json",
            help="Output format (default: json)"
        )
        
        parser.add_argument(
            "--limit", "-l",
            type=int,
            help="Limit number of results"
        )


class MutationTool(BaseTool):
    """Base class for tools that modify data."""
    
    def add_tool_arguments(self, parser: argparse.ArgumentParser):
        """Add mutation-specific arguments."""
        parser.add_argument(
            "--force",
            action="store_true",
            help="Skip confirmation prompts"
        )
        
        parser.add_argument(
            "--batch-size",
            type=int,
            default=100,
            help="Batch size for bulk operations (default: 100)"
        )
    
    def validate_args(self) -> bool:
        """Additional validation for mutation tools."""
        if not super().validate_args():
            return False
        
        # Warn about destructive operations on production tenants
        if (hasattr(self.args, 'force') and 
            not self.args.force and 
            self.tenant_utils.is_production_tenant(self.args.tenant_id)):
            
            self.warning(f"About to perform operation on production tenant '{self.args.tenant_id}'")
            if not self.confirm("Are you sure you want to continue?", default=False):
                self.info("Operation cancelled")
                return False
        
        return True

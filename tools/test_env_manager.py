#!/usr/bin/env python3
"""
Test Environment Manager

A unified tool for managing the test environment using the shared library.
Provides setup, reset, status, and switch functionality for test development workflows.
"""

import sys
import json
from pathlib import Path

# Import shared library
sys.path.append(str(Path(__file__).resolve().parent))
from lib import BaseTool, APIError, TenantNotFoundError, SchemaError


class TestEnvironmentManager(BaseTool):
    """Test environment management tool."""
    
    def __init__(self):
        super().__init__("Manage test environment for safe development and testing")
    
    def add_tool_arguments(self, parser):
        """Add tool-specific arguments."""
        # Action to perform
        parser.add_argument(
            "action",
            choices=["setup", "reset", "status", "seed", "clear"],
            help="Action to perform on test environment"
        )
        
        # Options
        parser.add_argument(
            "--create-tenant",
            action="store_true",
            help="Create test-tenant if it doesn't exist during setup"
        )
        
        parser.add_argument(
            "--seed-schema",
            action="store_true",
            help="Push schema during setup/reset"
        )
    
    def execute(self) -> int:
        """Execute the requested action."""
        action = self.args.action
        
        try:
            if action == "setup":
                return self._setup_test_environment()
            elif action == "reset":
                return self._reset_test_environment()
            elif action == "status":
                return self._show_status()
            elif action == "seed":
                return self._seed_test_data()
            elif action == "clear":
                return self._clear_test_data()
            else:
                self.error(f"Unknown action: {action}")
                return 1
                
        except Exception as e:
            self.error(f"Action '{action}' failed: {e}")
            if self.args.verbose:
                import traceback
                self.debug(traceback.format_exc())
            return 1
    
    def _setup_test_environment(self) -> int:
        """Set up the test environment."""
        self.info("🏗️  Setting up test environment...")
        
        # Check system capabilities
        capabilities = self.tenant_utils.get_system_capabilities()
        
        if not capabilities["namespaces_supported"]:
            self.warning("Multi-tenant mode not enabled - test isolation may not work")
            if not self.confirm("Continue anyway?", default=False):
                return 1
        
        # Check if test-tenant exists
        if not self.tenant_utils.tenant_exists("test-tenant"):
            if self.args.create_tenant:
                self.info("Creating test-tenant...")
                try:
                    response = self.api_client.post("/tenant", {"tenantId": "test-tenant"})
                    self.success("Test tenant created successfully")
                except APIError as e:
                    # Tenant might already exist
                    if "already exists" in str(e).lower():
                        self.info("Test tenant already exists")
                    else:
                        self.error(f"Failed to create test tenant: {e}")
                        return 1
            else:
                self.error("Test tenant doesn't exist. Use --create-tenant to create it")
                return 1
        else:
            self.info("✅ Test tenant already exists")
        
        # Push schema if requested
        if self.args.seed_schema:
            self.info("📤 Pushing schema to test environment...")
            try:
                self.dgraph_ops.push_schema(tenant_id="test-tenant")
                self.dgraph_ops.wait_for_schema_processing(tenant_id="test-tenant")
                self.success("Schema pushed successfully")
            except SchemaError as e:
                self.error(f"Schema push failed: {e}")
                return 1
        
        # Show final status
        self._show_test_environment_info()
        
        self.success("Test environment setup complete!")
        self.info("💡 Use 'python tools/test_env_manager.py status' to check status")
        self.info("💡 Use '--test' flag with other tools to use test environment")
        
        return 0
    
    def _reset_test_environment(self) -> int:
        """Reset the test environment."""
        self.info("🔄 Resetting test environment...")
        
        if not self.tenant_utils.tenant_exists("test-tenant"):
            self.error("Test tenant doesn't exist. Run 'setup --create-tenant' first")
            return 1
        
        # Confirm reset
        if not self.args.force:
            self.warning("This will clear ALL data in the test environment")
            if not self.confirm("Are you sure?", default=False):
                self.info("Reset cancelled")
                return 0
        
        # Clear test data
        self.info("🧹 Clearing test data...")
        try:
            self.dgraph_ops.clear_namespace_data(tenant_id="test-tenant")
            self.success("Test data cleared")
        except Exception as e:
            self.error(f"Failed to clear test data: {e}")
            return 1
        
        # Push schema if requested
        if self.args.seed_schema:
            self.info("📤 Re-pushing schema...")
            try:
                self.dgraph_ops.push_schema(tenant_id="test-tenant")
                self.dgraph_ops.wait_for_schema_processing(tenant_id="test-tenant")
                self.success("Schema pushed successfully")
            except SchemaError as e:
                self.error(f"Schema push failed: {e}")
                return 1
        
        self.success("Test environment reset complete!")
        return 0
    
    def _show_status(self) -> int:
        """Show test environment status."""
        self.info("📊 Test Environment Status")
        self.info("=" * 40)
        
        # System capabilities
        capabilities = self.tenant_utils.get_system_capabilities()
        self.info(f"🔧 System Mode: {capabilities['mode']}")
        self.info(f"🏢 Enterprise: {'✅' if capabilities['enterprise'] else '❌'}")
        self.info(f"🏠 Multi-tenant: {'✅' if capabilities['multi_tenant'] else '❌'}")
        self.info(f"🔒 Namespaces: {'✅' if capabilities['namespaces_supported'] else '❌'}")
        
        # Test tenant status
        self.info("\n🧪 Test Tenant Status:")
        if self.tenant_utils.tenant_exists("test-tenant"):
            self.info("   ✅ Test tenant exists")
            
            try:
                namespace = self.tenant_utils.get_tenant_namespace("test-tenant")
                self.info(f"   📍 Namespace: {namespace}")
            except TenantNotFoundError:
                self.info("   ❌ Namespace: unknown")
            
            # Check test data
            try:
                result = self.api_client.query("{ queryNode { id } }", tenant_id="test-tenant")
                node_count = len(result.get("queryNode", []))
                self.info(f"   📊 Nodes: {node_count}")
            except Exception as e:
                self.info(f"   ❌ Data query failed: {e}")
            
            # Check schema status
            schema_status = self.dgraph_ops.get_schema_status(tenant_id="test-tenant")
            if schema_status["schema_loaded"]:
                self.info(f"   📋 Schema: ✅ ({schema_status['type_count']} types)")
            else:
                self.info(f"   📋 Schema: ❌ ({schema_status.get('error', 'Not loaded')})")
            
        else:
            self.info("   ❌ Test tenant does not exist")
            self.info("   💡 Run: python tools/test_env_manager.py setup --create-tenant")
        
        # Default tenant comparison
        self.info("\n🏠 Default Tenant (for comparison):")
        try:
            result = self.api_client.query("{ queryNode { id } }", tenant_id="default")
            default_node_count = len(result.get("queryNode", []))
            self.info(f"   📊 Nodes: {default_node_count}")
        except Exception as e:
            self.info(f"   ❌ Data query failed: {e}")
        
        # Usage tips
        self.info("\n💡 Usage Tips:")
        self.info("   • Use --test flag with tools to target test environment")
        self.info("   • Example: python tools/query_graph.py --test --query all_nodes")
        self.info("   • Example: python tools/seed_data.py --test")
        
        return 0
    
    def _seed_test_data(self) -> int:
        """Seed test environment with sample data."""
        self.info("🌱 Seeding test environment...")
        
        if not self.tenant_utils.tenant_exists("test-tenant"):
            self.error("Test tenant doesn't exist. Run 'setup --create-tenant' first")
            return 1
        
        # Use the seeding script with test tenant
        import subprocess
        import os
        
        cmd = [
            sys.executable, "tools/seed_data.py",
            "--tenant-id", "test-tenant",
            "--api-key", os.environ.get("MIMS_ADMIN_API_KEY", "")
        ]
        
        if self.args.verbose:
            cmd.append("--verbose")
        
        try:
            result = subprocess.run(cmd, capture_output=True, text=True)
            
            if result.returncode == 0:
                self.success("Test data seeded successfully")
                if self.args.verbose:
                    self.debug(f"Output: {result.stdout}")
                return 0
            else:
                self.error(f"Seeding failed with exit code {result.returncode}")
                if result.stderr:
                    self.error(f"Error: {result.stderr}")
                return 1
                
        except Exception as e:
            self.error(f"Failed to run seeding script: {e}")
            return 1
    
    def _clear_test_data(self) -> int:
        """Clear test environment data."""
        self.info("🧹 Clearing test environment data...")
        
        if not self.tenant_utils.tenant_exists("test-tenant"):
            self.error("Test tenant doesn't exist")
            return 1
        
        # Confirm unless force is used
        if not self.args.force:
            if not self.confirm("Clear all test data?", default=False):
                self.info("Clear cancelled")
                return 0
        
        try:
            self.dgraph_ops.clear_namespace_data(tenant_id="test-tenant")
            self.success("Test data cleared successfully")
            return 0
        except Exception as e:
            self.error(f"Failed to clear test data: {e}")
            return 1
    
    def _show_test_environment_info(self):
        """Show information about the test environment."""
        self.info("\n📋 Test Environment Info:")
        self.info("   🆔 Tenant ID: test-tenant")
        
        try:
            namespace = self.tenant_utils.get_tenant_namespace("test-tenant")
            self.info(f"   📍 Namespace: {namespace}")
        except TenantNotFoundError:
            self.info("   📍 Namespace: unknown")
        
        self.info("   🔒 Isolation: Complete namespace separation")
        self.info("   ✅ Safe for: Development, testing, experimentation")


def main():
    """Main entry point."""
    tool = TestEnvironmentManager()
    return tool.run()


if __name__ == "__main__":
    sys.exit(main())

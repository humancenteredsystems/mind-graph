"""
Dgraph operations for MIMS-Graph tools.
Consolidates duplicate data clearing, schema, and administrative operations.
"""

import time
from typing import Dict, Any, List, Optional
from pathlib import Path
from .api_client import APIClient
from .tenant_utils import TenantUtils
from .errors import APIError, NamespaceError, SchemaError, TenantNotFoundError


class DgraphOperations:
    """Consolidated Dgraph operations with tenant support."""
    
    def __init__(self, api_client: APIClient = None, tenant_id: str = None):
        """
        Initialize Dgraph operations.
        
        Args:
            api_client: API client instance
            tenant_id: Default tenant context
        """
        self.api_client = api_client or APIClient()
        self.tenant_utils = TenantUtils(self.api_client)
        self.tenant_id = tenant_id
        
        if tenant_id:
            self.api_client.set_tenant_context(tenant_id)
    
    def clear_namespace_data(self, tenant_id: str = None, batch_size: int = 100) -> bool:
        """
        Safely clear all data within a namespace without affecting other namespaces.
        Consolidates functionality from seed_data.py and drop_data.py.
        
        Args:
            tenant_id: Target tenant (overrides default)
            batch_size: Number of items to delete per batch
            
        Returns:
            True if successful
            
        Raises:
            TenantNotFoundError: If tenant doesn't exist
            NamespaceError: If namespace operations fail
        """
        effective_tenant_id = tenant_id or self.tenant_id or "default"
        
        # Validate tenant exists
        if not self.tenant_utils.tenant_exists(effective_tenant_id):
            raise TenantNotFoundError(effective_tenant_id)
        
        print(f"🔒 Clearing data for tenant '{effective_tenant_id}' using namespace-scoped deletion...")
        
        try:
            # 1. Query all nodes
            print("  1️⃣ Querying all nodes...")
            nodes_query = {"query": "{ queryNode { uid id } }"}
            
            response = self.api_client.post("/query", nodes_query, tenant_id=effective_tenant_id)
            nodes = response.get("queryNode", [])
            node_count = len(nodes)
            
            if node_count == 0:
                print("  ✅ No nodes found - namespace is already empty")
                return True
            
            print(f"  📊 Found {node_count} nodes to delete")
            
            # 2. Query all edges
            print("  2️⃣ Querying all edges...")
            edges_query = {"query": "{ queryEdge { uid from { uid } to { uid } } }"}
            
            response = self.api_client.post("/query", edges_query, tenant_id=effective_tenant_id)
            edges = response.get("queryEdge", [])
            edge_count = len(edges)
            
            print(f"  📊 Found {edge_count} edges to delete")
            
            # 3. Delete all edges first (to avoid referential integrity issues)
            total_edges_deleted = 0
            if edges:
                print(f"  3️⃣ Deleting {edge_count} edges...")
                edge_uids = [edge["uid"] for edge in edges if "uid" in edge]
                
                if edge_uids:
                    total_edges_deleted = self._delete_edges_in_batches(
                        edge_uids, batch_size, effective_tenant_id)
            
            # 4. Delete all nodes
            total_nodes_deleted = 0
            if nodes:
                print(f"  4️⃣ Deleting {node_count} nodes...")
                node_uids = [node["uid"] for node in nodes if "uid" in node]
                
                if node_uids:
                    total_nodes_deleted = self._delete_nodes_in_batches(
                        node_uids, batch_size, effective_tenant_id)
            
            print(f"✅ Namespace cleared: deleted {total_nodes_deleted} nodes and {total_edges_deleted} edges (tenant: {effective_tenant_id})")
            return True
            
        except Exception as e:
            raise NamespaceError(f"Failed to clear namespace data: {str(e)}")
    
    def _delete_edges_in_batches(self, edge_uids: List[str], batch_size: int, tenant_id: str) -> int:
        """Delete edges in batches."""
        delete_edges_mutation = """
        mutation DeleteEdges($filter: EdgeFilter!) {
          deleteEdge(filter: $filter) {
            msg
            numUids
          }
        }
        """
        
        total_deleted = 0
        for i in range(0, len(edge_uids), batch_size):
            batch_uids = edge_uids[i:i + batch_size]
            variables = {"filter": {"uid": batch_uids}}
            
            response = self.api_client.mutate(delete_edges_mutation, variables, tenant_id=tenant_id)
            
            deleted_count = response.get("deleteEdge", {}).get("numUids", 0)
            total_deleted += deleted_count
            print(f"    ✅ Deleted {deleted_count} edges in batch {i//batch_size + 1}")
        
        return total_deleted
    
    def _delete_nodes_in_batches(self, node_uids: List[str], batch_size: int, tenant_id: str) -> int:
        """Delete nodes in batches."""
        delete_nodes_mutation = """
        mutation DeleteNodes($filter: NodeFilter!) {
          deleteNode(filter: $filter) {
            msg
            numUids
          }
        }
        """
        
        total_deleted = 0
        for i in range(0, len(node_uids), batch_size):
            batch_uids = node_uids[i:i + batch_size]
            variables = {"filter": {"uid": batch_uids}}
            
            response = self.api_client.mutate(delete_nodes_mutation, variables, tenant_id=tenant_id)
            
            deleted_count = response.get("deleteNode", {}).get("numUids", 0)
            total_deleted += deleted_count
            print(f"    ✅ Deleted {deleted_count} nodes in batch {i//batch_size + 1}")
        
        return total_deleted
    
    def drop_all_data(self, 
                      target: str = "remote", 
                      tenant_id: str = None,
                      confirm_namespace: str = None,
                      force: bool = False) -> bool:
        """
        Perform dropAll operation with safety checks.
        
        Args:
            target: Target Dgraph instance ('local', 'remote', 'both')
            tenant_id: Target tenant (overrides default)
            confirm_namespace: Required namespace confirmation for safety
            force: Skip safety confirmation prompts
            
        Returns:
            True if successful
            
        Raises:
            TenantNotFoundError: If tenant doesn't exist
            NamespaceError: If namespace confirmation fails
        """
        effective_tenant_id = tenant_id or self.tenant_id or "default"
        
        # Check if multi-tenant mode is enabled
        capabilities = self.tenant_utils.get_system_capabilities()
        
        if capabilities["namespaces_supported"]:
            print("⚠️  WARNING: Using dropAll in multi-tenant mode!")
            print("This will affect ALL namespaces in the cluster!")
            
            # Validate tenant exists
            if not self.tenant_utils.tenant_exists(effective_tenant_id):
                raise TenantNotFoundError(effective_tenant_id)
            
            # Require namespace confirmation
            if not confirm_namespace:
                expected_namespace = self.tenant_utils.get_tenant_namespace(effective_tenant_id)
                raise NamespaceError(
                    f"Namespace confirmation required for safety. "
                    f"Add --confirm-namespace {expected_namespace} to proceed."
                )
            
            # Validate namespace confirmation
            expected_namespace = self.tenant_utils.get_tenant_namespace(effective_tenant_id)
            if confirm_namespace != expected_namespace:
                raise NamespaceError(
                    f"Namespace confirmation mismatch. "
                    f"Expected '{expected_namespace}' for tenant '{effective_tenant_id}', "
                    f"got '{confirm_namespace}'"
                )
        
        # Build payload
        payload = {"target": target}
        if confirm_namespace:
            payload["confirmNamespace"] = confirm_namespace
        
        print(f"⚠️  Executing dropAll for target: {target}")
        if effective_tenant_id:
            print(f"  🔒 Tenant context: {effective_tenant_id}")
        if confirm_namespace:
            print(f"  🔒 Namespace confirmation: {confirm_namespace}")
        
        try:
            response = self.api_client.post("/admin/dropAll", payload, tenant_id=effective_tenant_id)
            
            print("✅ DropAll operation completed successfully")
            if response.get("results"):
                for instance, result in response["results"].items():
                    status = "SUCCESS" if result.get("success") else "FAILED"
                    print(f"  {instance.capitalize()}: {status}")
                    if result.get("error"):
                        print(f"    Error: {result['error']}")
            
            return True
            
        except Exception as e:
            raise NamespaceError(f"DropAll operation failed: {str(e)}")
    
    def push_schema(self, 
                    schema_content: str = None,
                    schema_file: str = None,
                    target: str = "remote",
                    tenant_id: str = None) -> bool:
        """
        Push GraphQL schema to Dgraph.
        
        Args:
            schema_content: Schema content as string
            schema_file: Path to schema file (alternative to schema_content)
            target: Target Dgraph instance ('local', 'remote', 'both')
            tenant_id: Target tenant (overrides default)
            
        Returns:
            True if successful
            
        Raises:
            SchemaError: If schema operation fails
            TenantNotFoundError: If tenant doesn't exist
        """
        effective_tenant_id = tenant_id or self.tenant_id or "default"
        
        # Validate tenant exists (if multi-tenant)
        capabilities = self.tenant_utils.get_system_capabilities()
        if capabilities["namespaces_supported"]:
            if not self.tenant_utils.tenant_exists(effective_tenant_id):
                raise TenantNotFoundError(effective_tenant_id)
        
        # Get schema content
        if schema_content is None:
            if schema_file is None:
                # Default to standard schema
                schema_file = Path(__file__).parent.parent.parent / "schemas" / "default.graphql"
            
            try:
                with open(schema_file, 'r', encoding='utf-8') as f:
                    schema_content = f.read()
                print(f"📖 Loaded schema from: {schema_file}")
            except Exception as e:
                raise SchemaError(f"Failed to read schema file '{schema_file}': {str(e)}")
        
        if not schema_content.strip():
            raise SchemaError("Schema content cannot be empty")
        
        # Push schema
        payload = {
            "schema": schema_content,
            "target": target
        }
        
        print(f"📤 Pushing schema to {target}...")
        if effective_tenant_id:
            print(f"  🔒 Tenant context: {effective_tenant_id}")
        
        try:
            response = self.api_client.post("/admin/schema", payload, tenant_id=effective_tenant_id)
            
            print("✅ Schema pushed successfully")
            if response.get("results"):
                for instance, result in response["results"].items():
                    status = "SUCCESS" if result.get("success") else "FAILED"
                    print(f"  {instance.capitalize()}: {status}")
                    if result.get("error"):
                        print(f"    Error: {result['error']}")
            
            return True
            
        except Exception as e:
            raise SchemaError(f"Schema push failed: {str(e)}")
    
    def get_schema_status(self, tenant_id: str = None) -> Dict[str, Any]:
        """
        Get current schema status.
        
        Args:
            tenant_id: Target tenant (overrides default)
            
        Returns:
            Schema status information
        """
        effective_tenant_id = tenant_id or self.tenant_id or "default"
        
        try:
            # Try to get schema via introspection
            introspection_query = """
            query IntrospectionQuery {
              __schema {
                types {
                  name
                  kind
                }
              }
            }
            """
            
            response = self.api_client.query(introspection_query, tenant_id=effective_tenant_id)
            
            if "__schema" in response:
                types = response["__schema"]["types"]
                custom_types = [t for t in types if not t["name"].startswith("__")]
                
                return {
                    "schema_loaded": True,
                    "type_count": len(custom_types),
                    "types": [t["name"] for t in custom_types],
                    "tenant": effective_tenant_id
                }
            else:
                return {
                    "schema_loaded": False,
                    "error": "No schema found",
                    "tenant": effective_tenant_id
                }
                
        except Exception as e:
            return {
                "schema_loaded": False,
                "error": str(e),
                "tenant": effective_tenant_id
            }
    
    def wait_for_schema_processing(self, max_wait: int = 30, tenant_id: str = None):
        """
        Wait for Dgraph to process the schema.
        
        Args:
            max_wait: Maximum wait time in seconds
            tenant_id: Target tenant (overrides default)
        """
        effective_tenant_id = tenant_id or self.tenant_id or "default"
        
        print(f"⏳ Waiting for schema processing (max {max_wait}s)...")
        
        for i in range(max_wait):
            status = self.get_schema_status(effective_tenant_id)
            if status["schema_loaded"]:
                print(f"✅ Schema processing complete (waited {i}s)")
                return
            
            time.sleep(1)
            if i % 5 == 0 and i > 0:
                print(f"  Still waiting... ({i}s elapsed)")
        
        print(f"⚠️  Schema processing may still be ongoing after {max_wait}s")
    
    def set_tenant_context(self, tenant_id: str):
        """Set tenant context for operations."""
        self.tenant_id = tenant_id
        self.api_client.set_tenant_context(tenant_id)
    
    def clear_tenant_context(self):
        """Clear tenant context."""
        self.tenant_id = None
        self.api_client.clear_tenant_context()

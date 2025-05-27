"""
Test utilities for validating the shared library functionality.
"""

import sys
import os
from pathlib import Path

# Add parent directory to path so we can import the library
sys.path.insert(0, str(Path(__file__).parent.parent))

from lib import APIClient, TenantUtils, DgraphOperations
from lib.errors import TenantNotFoundError, ValidationError


def test_api_client():
    """Test basic API client functionality."""
    print("🧪 Testing API client...")
    
    # Test initialization
    client = APIClient()
    print(f"  ✅ API client initialized: {client.api_base}")
    
    # Test tenant context
    client.set_tenant_context("test-tenant")
    assert client.tenant_id == "test-tenant"
    print("  ✅ Tenant context setting works")
    
    client.clear_tenant_context()
    assert client.tenant_id is None
    print("  ✅ Tenant context clearing works")
    
    return True


def test_tenant_utils():
    """Test tenant utilities."""
    print("🧪 Testing tenant utilities...")
    
    utils = TenantUtils()
    
    # Test validation
    try:
        utils.validate_tenant_id("valid-tenant")
        print("  ✅ Valid tenant ID accepted")
    except ValidationError:
        print("  ❌ Valid tenant ID rejected")
        return False
    
    # Test invalid tenant ID
    try:
        utils.validate_tenant_id("invalid tenant with spaces")
        print("  ❌ Invalid tenant ID was accepted")
        return False
    except ValidationError:
        print("  ✅ Invalid tenant ID properly rejected")
    
    # Test standard tenant mapping
    try:
        namespace = utils.get_tenant_namespace("default")
        assert namespace == "0x0"
        print("  ✅ Standard tenant mapping works")
    except Exception as e:
        print(f"  ❌ Standard tenant mapping failed: {e}")
        return False
    
    # Test tenant classification
    assert utils.is_test_tenant("test-tenant")
    assert utils.is_production_tenant("default")
    print("  ✅ Tenant classification works")
    
    return True


def test_dgraph_ops():
    """Test Dgraph operations (without real API calls)."""
    print("🧪 Testing Dgraph operations...")
    
    # Test initialization
    ops = DgraphOperations()
    print("  ✅ DgraphOperations initialized")
    
    # Test tenant context
    ops.set_tenant_context("test-tenant")
    assert ops.tenant_id == "test-tenant"
    print("  ✅ Tenant context setting works")
    
    ops.clear_tenant_context()
    assert ops.tenant_id is None
    print("  ✅ Tenant context clearing works")
    
    return True


def test_imports():
    """Test that all imports work properly."""
    print("🧪 Testing imports...")
    
    try:
        from lib import (
            APIClient, DgraphOperations, TenantUtils,
            BaseTool, QueryTool, MutationTool,
            TenantNotFoundError, NamespaceError, SchemaError
        )
        print("  ✅ All imports successful")
        return True
    except ImportError as e:
        print(f"  ❌ Import failed: {e}")
        return False


def run_all_tests():
    """Run all tests."""
    print("=" * 50)
    print("TESTING MIMS-GRAPH SHARED LIBRARY")
    print("=" * 50)
    
    tests = [
        test_imports,
        test_api_client,
        test_tenant_utils,
        test_dgraph_ops
    ]
    
    passed = 0
    total = len(tests)
    
    for test in tests:
        try:
            if test():
                passed += 1
            print()
        except Exception as e:
            print(f"  ❌ Test failed with exception: {e}")
            print()
    
    print("=" * 50)
    print(f"RESULTS: {passed}/{total} tests passed")
    print("=" * 50)
    
    return passed == total


if __name__ == "__main__":
    success = run_all_tests()
    sys.exit(0 if success else 1)

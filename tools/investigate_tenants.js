#!/usr/bin/env node

/**
 * Investigation script to determine active tenants and data distribution
 */

const axios = require('axios');

const DGRAPH_BASE_URL = process.env.DGRAPH_BASE_URL || 'http://localhost:8080';

/**
 * Query a specific namespace for hierarchies and nodes
 */
async function queryNamespace(namespace = null) {
  const endpoint = namespace 
    ? `${DGRAPH_BASE_URL}/graphql?namespace=${namespace}`
    : `${DGRAPH_BASE_URL}/graphql`;
    
  console.log(`\n🔍 Querying ${namespace ? `namespace ${namespace}` : 'default namespace'}`);
  console.log(`   Endpoint: ${endpoint}`);
  
  const query = `
    query InvestigateNamespace {
      queryHierarchy {
        id
        name
      }
      queryNode(first: 5) {
        id
        label
        type
      }
      queryEdge(first: 3) {
        type
        fromId
        toId
      }
    }
  `;
  
  try {
    const response = await axios.post(endpoint, { query });
    
    if (response.data.errors) {
      console.log(`   ❌ GraphQL Errors:`, response.data.errors);
      return null;
    }
    
    const data = response.data.data;
    console.log(`   ✅ Query successful`);
    console.log(`   📊 Hierarchies: ${data.queryHierarchy?.length || 0}`);
    console.log(`   📊 Nodes: ${data.queryNode?.length || 0}`);
    console.log(`   📊 Edges: ${data.queryEdge?.length || 0}`);
    
    if (data.queryHierarchy?.length > 0) {
      console.log(`   📋 Hierarchy names:`);
      data.queryHierarchy.forEach(h => console.log(`      - ${h.name} (${h.id})`));
    }
    
    if (data.queryNode?.length > 0) {
      console.log(`   📋 Sample nodes:`);
      data.queryNode.slice(0, 3).forEach(n => console.log(`      - ${n.label} (${n.type})`));
    }
    
    return data;
    
  } catch (error) {
    console.log(`   ❌ Error: ${error.message}`);
    if (error.response?.data) {
      console.log(`   📄 Response:`, error.response.data);
    }
    return null;
  }
}

/**
 * Check API system status with different tenant headers
 */
async function checkAPITenantStatus() {
  console.log(`\n🌐 Checking API System Status`);
  console.log(`=`.repeat(40));
  
  const scenarios = [
    { name: 'No tenant header', headers: {} },
    { name: 'Default tenant', headers: { 'X-Tenant-Id': 'default' } },
    { name: 'Test tenant', headers: { 'X-Tenant-Id': 'test-tenant' } }
  ];
  
  for (const scenario of scenarios) {
    console.log(`\n📋 ${scenario.name}:`);
    try {
      const response = await axios.get('http://localhost:3000/api/system/status', {
        headers: scenario.headers
      });
      
      const status = response.data;
      console.log(`   Current Tenant: ${status.currentTenant}`);
      console.log(`   Mode: ${status.mode}`);
      console.log(`   Multi-tenant Verified: ${status.multiTenantVerified}`);
      console.log(`   Namespace: ${status.namespace || 'null'}`);
      
    } catch (error) {
      console.log(`   ❌ Error: ${error.message}`);
    }
  }
}

/**
 * Check what the frontend would send based on localStorage simulation
 */
async function simulateFrontendBehavior() {
  console.log(`\n🖥️  Frontend Behavior Simulation`);
  console.log(`=`.repeat(40));
  
  // Simulate different localStorage states
  const scenarios = [
    { localStorage: {}, description: 'Fresh browser (no localStorage)' },
    { localStorage: { tenantId: 'default' }, description: 'OSS mode localStorage' },
    { localStorage: { tenantId: 'test-tenant' }, description: 'Test mode localStorage' }
  ];
  
  for (const scenario of scenarios) {
    console.log(`\n📱 ${scenario.description}:`);
    
    // Simulate TenantContext logic
    const tenantId = scenario.localStorage.tenantId || 'default';
    console.log(`   localStorage.tenantId: ${scenario.localStorage.tenantId || 'undefined'}`);
    console.log(`   Resolved tenantId: ${tenantId}`);
    console.log(`   Would send X-Tenant-Id: ${tenantId}`);
    
    // Test what API would return
    try {
      const response = await axios.get('http://localhost:3000/api/system/status', {
        headers: { 'X-Tenant-Id': tenantId }
      });
      console.log(`   API would return currentTenant: ${response.data.currentTenant}`);
    } catch (error) {
      console.log(`   ❌ API Error: ${error.message}`);
    }
  }
}

/**
 * Main investigation function
 */
async function main() {
  console.log('🕵️  Tenant Investigation Report');
  console.log('================================\n');
  
  console.log('📍 Investigation Goal: Determine why UI shows "test-tenant" and verify accuracy\n');
  
  // 1. Query both namespaces directly
  console.log('🔍 STEP 1: Direct Dgraph Namespace Queries');
  console.log('='.repeat(50));
  
  const defaultData = await queryNamespace(null);
  const testData = await queryNamespace('0x1');
  
  // 2. Check API behavior
  await checkAPITenantStatus();
  
  // 3. Simulate frontend behavior
  await simulateFrontendBehavior();
  
  // 4. Analysis and recommendations
  console.log(`\n📊 ANALYSIS`);
  console.log('='.repeat(20));
  
  const defaultHasData = defaultData && (defaultData.queryHierarchy?.length > 0 || defaultData.queryNode?.length > 0);
  const testHasData = testData && (testData.queryHierarchy?.length > 0 || testData.queryNode?.length > 0);
  
  console.log(`\n📈 Data Distribution:`);
  console.log(`   Default namespace (0x0): ${defaultHasData ? 'HAS DATA' : 'EMPTY'}`);
  console.log(`   Test namespace (0x1): ${testHasData ? 'HAS DATA' : 'EMPTY'}`);
  
  console.log(`\n🎯 Recommendations:`);
  if (testHasData && !defaultHasData) {
    console.log(`   ✅ UI showing 'test-tenant' is CORRECT - data is in test namespace`);
    console.log(`   💡 This suggests you're working with test data`);
  } else if (defaultHasData && !testHasData) {
    console.log(`   ❌ UI showing 'test-tenant' is INCORRECT - data is in default namespace`);
    console.log(`   💡 localStorage should be reset to 'default'`);
  } else if (defaultHasData && testHasData) {
    console.log(`   ⚠️  Both namespaces have data - need to determine which is active`);
    console.log(`   💡 Check which data matches what you see in the UI`);
  } else {
    console.log(`   ❓ Neither namespace has data - possible setup issue`);
  }
  
  console.log(`\n🏁 Investigation Complete!`);
}

// Run if called directly
if (require.main === module) {
  main().catch(error => {
    console.error('\n💥 Investigation failed:', error.message);
    process.exit(1);
  });
}

module.exports = { queryNamespace, checkAPITenantStatus, simulateFrontendBehavior };

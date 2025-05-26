#!/usr/bin/env node

/**
 * Diagnostic script to test tenant resolution flow
 * Tests the complete chain from frontend localStorage to backend tenant context
 */

const axios = require('axios');

// Configuration
const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:3001/api';
const TEST_SCENARIOS = [
  { name: 'Default OSS Tenant', tenantId: 'default' },
  { name: 'Test Enterprise Tenant', tenantId: 'test-tenant' },
  { name: 'Custom Tenant', tenantId: 'custom-tenant' },
  { name: 'No Tenant Header', tenantId: null }
];

/**
 * Test system status endpoint with different tenant scenarios
 */
async function testTenantResolution() {
  console.log('🔍 Testing Tenant Resolution Flow\n');
  console.log('='.repeat(50));
  
  for (const scenario of TEST_SCENARIOS) {
    console.log(`\n📋 Testing: ${scenario.name}`);
    console.log('-'.repeat(30));
    
    try {
      // Prepare headers
      const headers = {};
      if (scenario.tenantId) {
        headers['X-Tenant-Id'] = scenario.tenantId;
        console.log(`   Sending X-Tenant-Id: ${scenario.tenantId}`);
      } else {
        console.log('   No X-Tenant-Id header sent');
      }
      
      // Make request to system status
      const response = await axios.get(`${API_BASE_URL}/system/status`, { headers });
      const status = response.data;
      
      // Display results
      console.log(`✅ Response received:`);
      console.log(`   Current Tenant: ${status.currentTenant}`);
      console.log(`   Mode: ${status.mode}`);
      console.log(`   Multi-tenant Verified: ${status.multiTenantVerified}`);
      console.log(`   Namespace: ${status.namespace || 'null'}`);
      
      // Validate expected behavior
      if (scenario.tenantId === 'default' && status.currentTenant === 'default') {
        console.log(`✅ PASS: Default tenant correctly resolved`);
      } else if (scenario.tenantId === 'test-tenant' && status.currentTenant === 'test-tenant') {
        console.log(`✅ PASS: Test tenant correctly resolved`);
      } else if (scenario.tenantId === null && status.currentTenant === 'default') {
        console.log(`✅ PASS: Missing tenant header defaults to 'default'`);
      } else if (scenario.tenantId && status.currentTenant === scenario.tenantId) {
        console.log(`✅ PASS: Custom tenant correctly resolved`);
      } else {
        console.log(`❌ FAIL: Expected '${scenario.tenantId || 'default'}', got '${status.currentTenant}'`);
      }
      
    } catch (error) {
      console.log(`❌ ERROR: ${error.message}`);
      if (error.response) {
        console.log(`   Status: ${error.response.status}`);
        console.log(`   Data: ${JSON.stringify(error.response.data, null, 2)}`);
      }
    }
  }
}

/**
 * Test health endpoint
 */
async function testHealthEndpoint() {
  console.log('\n\n🏥 Testing Health Endpoint');
  console.log('='.repeat(30));
  
  try {
    const response = await axios.get(`${API_BASE_URL}/system/health`);
    const health = response.data;
    
    console.log(`✅ Health Status: ${health.status}`);
    console.log(`   Multi-tenant Supported: ${health.multiTenantSupported}`);
    console.log(`   Mode: ${health.mode}`);
    console.log(`   Timestamp: ${health.timestamp}`);
    
  } catch (error) {
    console.log(`❌ Health check failed: ${error.message}`);
  }
}

/**
 * Test frontend localStorage simulation
 */
async function testFrontendSimulation() {
  console.log('\n\n🌐 Simulating Frontend Behavior');
  console.log('='.repeat(35));
  
  const frontendScenarios = [
    { localStorage: { tenantId: 'default' }, description: 'OSS mode with default tenant' },
    { localStorage: { tenantId: 'test-tenant' }, description: 'Enterprise mode with test tenant' },
    { localStorage: {}, description: 'Fresh install (no localStorage)' }
  ];
  
  for (const scenario of frontendScenarios) {
    console.log(`\n📱 ${scenario.description}`);
    console.log('-'.repeat(25));
    
    // Simulate axios interceptor logic
    const tenantId = scenario.localStorage.tenantId || 'default';
    console.log(`   localStorage.tenantId: ${scenario.localStorage.tenantId || 'undefined'}`);
    console.log(`   Resolved tenantId: ${tenantId}`);
    console.log(`   Would send X-Tenant-Id: ${tenantId}`);
    
    // Test actual request
    try {
      const response = await axios.get(`${API_BASE_URL}/system/status`, {
        headers: { 'X-Tenant-Id': tenantId }
      });
      
      console.log(`   Backend received: ${response.data.currentTenant}`);
      
      if (response.data.currentTenant === tenantId) {
        console.log(`   ✅ PASS: End-to-end tenant resolution working`);
      } else {
        console.log(`   ❌ FAIL: Mismatch in tenant resolution`);
      }
      
    } catch (error) {
      console.log(`   ❌ ERROR: ${error.message}`);
    }
  }
}

/**
 * Main test runner
 */
async function main() {
  console.log('🚀 Tenant Resolution Diagnostic Tool');
  console.log('=====================================\n');
  
  try {
    await testTenantResolution();
    await testHealthEndpoint();
    await testFrontendSimulation();
    
    console.log('\n\n🎉 Diagnostic Complete!');
    console.log('Check the results above to verify tenant resolution is working correctly.');
    
  } catch (error) {
    console.error('\n💥 Diagnostic failed:', error.message);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  main();
}

module.exports = { testTenantResolution, testHealthEndpoint, testFrontendSimulation };

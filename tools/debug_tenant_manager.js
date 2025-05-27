#!/usr/bin/env node

const { TenantManager } = require('../api/services/tenantManager');

async function debugTenantManager() {
  console.log('🔍 Debugging Tenant Manager');
  console.log('='.repeat(40));
  
  const tm = new TenantManager();
  
  console.log('\n📋 Configuration:');
  console.log(`  Default namespace: ${tm.defaultNamespace}`);
  console.log(`  Test namespace: ${tm.testNamespace}`);
  console.log(`  Multi-tenant enabled: ${tm.enableMultiTenant}`);
  console.log(`  Namespace prefix: ${tm.namespacePrefix}`);
  
  console.log('\n🔄 Namespace Resolution:');
  try {
    const defaultNs = await tm.getTenantNamespace('default');
    console.log(`  'default' -> '${defaultNs}'`);
    
    const testNs = await tm.getTenantNamespace('test-tenant');
    console.log(`  'test-tenant' -> '${testNs}'`);
    
    // Test the generation logic directly
    console.log('\n🧮 Generation Logic:');
    console.log(`  generateNamespaceId('default'): ${tm.generateNamespaceId('default')}`);
    console.log(`  generateNamespaceId('test-tenant'): ${tm.generateNamespaceId('test-tenant')}`);
    
  } catch (error) {
    console.error('❌ Error in namespace resolution:', error.message);
  }
  
  console.log('\n📊 Tenant Info:');
  try {
    const defaultInfo = await tm.getTenantInfo('default');
    console.log('  Default tenant info:');
    console.log(`    Tenant ID: ${defaultInfo.tenantId}`);
    console.log(`    Namespace: ${defaultInfo.namespace}`);
    console.log(`    Exists: ${defaultInfo.exists}`);
    console.log(`    Is Test: ${defaultInfo.isTestTenant}`);
    console.log(`    Is Default: ${defaultInfo.isDefaultTenant}`);
    
    const testInfo = await tm.getTenantInfo('test-tenant');
    console.log('  Test tenant info:');
    console.log(`    Tenant ID: ${testInfo.tenantId}`);
    console.log(`    Namespace: ${testInfo.namespace}`);
    console.log(`    Exists: ${testInfo.exists}`);
    console.log(`    Is Test: ${testInfo.isTestTenant}`);
    console.log(`    Is Default: ${testInfo.isDefaultTenant}`);
    
  } catch (error) {
    console.error('❌ Error getting tenant info:', error.message);
  }
}

debugTenantManager().catch(console.error);

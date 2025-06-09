const { TenantManager } = require('./services/tenantManager');

async function debugNamespace() {
  console.log('Creating TenantManager...');
  const tenantManager = new TenantManager();
  
  console.log('Testing namespace resolution...');
  
  // Test the generateNamespaceId method directly
  console.log('generateNamespaceId("test-tenant"):', tenantManager.generateNamespaceId('test-tenant'));
  console.log('generateNamespaceId("default"):', tenantManager.generateNamespaceId('default'));
  
  // Test the getTenantNamespace method
  const testTenantNamespace = await tenantManager.getTenantNamespace('test-tenant');
  console.log('getTenantNamespace("test-tenant"):', testTenantNamespace);
  
  const defaultNamespace = await tenantManager.getTenantNamespace('default');
  console.log('getTenantNamespace("default"):', defaultNamespace);
  
  // Check the config values
  console.log('tenantManager.testNamespace:', tenantManager.testNamespace);
  console.log('tenantManager.defaultNamespace:', tenantManager.defaultNamespace);
}

debugNamespace();

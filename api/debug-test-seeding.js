// Use ts-node to run TypeScript files directly
require('ts-node/register');

const { DgraphTenantFactory } = require('./services/dgraphTenant.ts');
const { TenantManager } = require('./services/tenantManager.ts');
const config = require('./config/index.ts').default;

// Set up environment
process.env.NODE_ENV = 'test';
process.env.DGRAPH_BASE_URL = 'http://localhost:8080';
process.env.ENABLE_MULTI_TENANT = 'true';
process.env.DGRAPH_NAMESPACE_TEST = '0x1';
process.env.DGRAPH_NAMESPACE_DEFAULT = '0x0';

async function debugTestSeeding() {
  console.log('🔍 DEBUG: Starting test data seeding investigation...');
  console.log('Config:', {
    dgraphBaseUrl: config.dgraphBaseUrl,
    testNamespace: config.testNamespace,
    enableMultiTenant: config.enableMultiTenant
  });

  const tenantManager = new TenantManager();
  const TEST_TENANT_ID = 'test-tenant';

  try {
    // Step 1: Ensure test tenant exists
    console.log('\n📋 Step 1: Setting up test tenant...');
    const exists = await tenantManager.tenantExists(TEST_TENANT_ID);
    console.log(`Test tenant exists: ${exists}`);
    
    if (!exists) {
      console.log('Creating test tenant...');
      await tenantManager.createTenant(TEST_TENANT_ID);
      console.log('✅ Test tenant created');
    }

    // Step 2: Get test client
    console.log('\n📋 Step 2: Creating test client...');
    const testClient = DgraphTenantFactory.createTestTenant();
    console.log('✅ Test client created');

    // Step 3: Clear any existing data
    console.log('\n📋 Step 3: Clearing existing test data...');
    await tenantManager.deleteTenant(TEST_TENANT_ID);
    await tenantManager.createTenant(TEST_TENANT_ID);
    console.log('✅ Test tenant reset');

    // Wait a bit for operations to complete
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Step 4: Create test hierarchy
    console.log('\n📋 Step 4: Creating test hierarchy...');
    const hierarchyMutation = `
      mutation CreateTestHierarchy($input: [AddHierarchyInput!]!) {
        addHierarchy(input: $input) {
          hierarchy {
            id
            name
          }
        }
      }
    `;
    
    const hierarchyResult = await testClient.executeGraphQL(hierarchyMutation, {
      input: [{
        id: 'test-hierarchy-1',
        name: 'Test Hierarchy 1'
      }]
    });
    
    console.log('Hierarchy creation result:', JSON.stringify(hierarchyResult, null, 2));
    
    if (!hierarchyResult?.addHierarchy?.hierarchy?.[0]?.id) {
      throw new Error('Failed to create test hierarchy');
    }
    console.log('✅ Created hierarchy:', hierarchyResult.addHierarchy.hierarchy[0]);

    // Step 5: Verify hierarchy exists immediately
    console.log('\n📋 Step 5: Verifying hierarchy exists...');
    const verifyHierarchyQuery = `
      query {
        queryHierarchy {
          id
          name
        }
      }
    `;
    
    const verifyResult = await testClient.executeGraphQL(verifyHierarchyQuery);
    console.log('Hierarchy verification result:', JSON.stringify(verifyResult, null, 2));

    // Step 6: Create hierarchy levels
    console.log('\n📋 Step 6: Creating hierarchy levels...');
    const levelMutation = `
      mutation CreateTestLevels($input: [AddHierarchyLevelInput!]!) {
        addHierarchyLevel(input: $input) {
          hierarchyLevel {
            id
            levelNumber
            label
          }
        }
      }
    `;
    
    const levelsResult = await testClient.executeGraphQL(levelMutation, {
      input: [
        {
          levelNumber: 1,
          label: 'Concepts',
          hierarchy: { id: 'test-hierarchy-1' }
        },
        {
          levelNumber: 2,
          label: 'Examples',
          hierarchy: { id: 'test-hierarchy-1' }
        }
      ]
    });
    
    console.log('Levels creation result:', JSON.stringify(levelsResult, null, 2));
    
    if (!levelsResult?.addHierarchyLevel?.hierarchyLevel) {
      throw new Error('Failed to create test levels');
    }
    console.log('✅ Created levels:', levelsResult.addHierarchyLevel.hierarchyLevel);

    // Get the actual level IDs
    const level1Id = levelsResult.addHierarchyLevel.hierarchyLevel.find(l => l.levelNumber === 1)?.id;
    const level2Id = levelsResult.addHierarchyLevel.hierarchyLevel.find(l => l.levelNumber === 2)?.id;
    
    console.log('Level IDs:', { level1Id, level2Id });

    // Step 7: Create test nodes
    console.log('\n📋 Step 7: Creating test nodes...');
    const nodeMutation = `
      mutation CreateTestNodes($input: [AddNodeInput!]!) {
        addNode(input: $input) {
          node {
            id
            label
            type
          }
        }
      }
    `;
    
    const nodesResult = await testClient.executeGraphQL(nodeMutation, {
      input: [
        {
          id: 'test-concept-1',
          label: 'Test Concept',
          type: 'concept'
        },
        {
          id: 'test-example-1',
          label: 'Test Example', 
          type: 'example'
        }
      ]
    });
    
    console.log('Nodes creation result:', JSON.stringify(nodesResult, null, 2));
    
    if (!nodesResult?.addNode?.node) {
      throw new Error('Failed to create test nodes');
    }
    console.log('✅ Created nodes:', nodesResult.addNode.node);

    // Step 8: Verify all data exists
    console.log('\n📋 Step 8: Final verification...');
    
    // Check hierarchies
    const finalHierarchyCheck = await testClient.executeGraphQL(`
      query {
        queryHierarchy {
          id
          name
          levels {
            id
            levelNumber
            label
          }
        }
      }
    `);
    console.log('Final hierarchy check:', JSON.stringify(finalHierarchyCheck, null, 2));

    // Check nodes
    const finalNodeCheck = await testClient.executeGraphQL(`
      query {
        queryNode {
          id
          label
          type
        }
      }
    `);
    console.log('Final node check:', JSON.stringify(finalNodeCheck, null, 2));

    // Step 9: Test the same queries that the tests use
    console.log('\n📋 Step 9: Testing actual test queries...');
    
    // Test the specific hierarchy query from the failing test
    const specificHierarchyQuery = await testClient.executeGraphQL(`
      query {
        getHierarchy(id: "test-hierarchy-1") {
          id
          name
          levels {
            id
            levelNumber
            label
          }
        }
      }
    `);
    console.log('Specific hierarchy query result:', JSON.stringify(specificHierarchyQuery, null, 2));

    // Test the specific node queries from the failing tests
    const specificNodeQuery = await testClient.executeGraphQL(`
      query {
        getNode(id: "test-concept-1") {
          id
          label
          type
        }
      }
    `);
    console.log('Specific node query result:', JSON.stringify(specificNodeQuery, null, 2));

    console.log('\n✅ DEBUG: Test data seeding investigation completed successfully!');

  } catch (error) {
    console.error('\n❌ DEBUG: Test data seeding investigation failed:', error);
    if (error.response) {
      console.error('Response data:', error.response.data);
    }
    process.exit(1);
  }
}

// Run the debug
debugTestSeeding().catch(console.error);

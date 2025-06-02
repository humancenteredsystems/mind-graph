"use strict";
// Debug script to inspect test tenant data
require('dotenv').config();
const { adaptiveTenantFactory } = require('./dist/services/adaptiveTenantFactory');
async function debugTestTenant() {
    console.log('=== DEBUG: Test Tenant Data ===');
    try {
        // Create test tenant client
        const testClient = await adaptiveTenantFactory.createTestTenant();
        // Query all nodes
        console.log('\n1. Querying all nodes in test tenant:');
        const nodesResult = await testClient.executeGraphQL(`
      query {
        queryNode {
          id
          label
          type
          status
          branch
        }
      }
    `);
        console.log('Nodes:', JSON.stringify(nodesResult, null, 2));
        // Query all hierarchies
        console.log('\n2. Querying all hierarchies in test tenant:');
        const hierarchiesResult = await testClient.executeGraphQL(`
      query {
        queryHierarchy {
          id
          name
        }
      }
    `);
        console.log('Hierarchies:', JSON.stringify(hierarchiesResult, null, 2));
        // Query all hierarchy levels
        console.log('\n3. Querying all hierarchy levels in test tenant:');
        const levelsResult = await testClient.executeGraphQL(`
      query {
        queryHierarchyLevel {
          id
          levelNumber
          label
        }
      }
    `);
        console.log('Levels:', JSON.stringify(levelsResult, null, 2));
        // Query all hierarchy assignments
        console.log('\n4. Querying all hierarchy assignments in test tenant:');
        const assignmentsResult = await testClient.executeGraphQL(`
      query {
        queryHierarchyAssignment {
          id
          node { id label }
          hierarchy { id name }
          level { id levelNumber label }
        }
      }
    `);
        console.log('Assignments:', JSON.stringify(assignmentsResult, null, 2));
        // Query all edges
        console.log('\n5. Querying all edges in test tenant:');
        const edgesResult = await testClient.executeGraphQL(`
      query {
        queryEdge {
          fromId
          toId
          type
        }
      }
    `);
        console.log('Edges:', JSON.stringify(edgesResult, null, 2));
    }
    catch (error) {
        console.error('Error debugging test tenant:', error);
    }
}
debugTestTenant().then(() => {
    console.log('\n=== Debug complete ===');
    process.exit(0);
}).catch(error => {
    console.error('Debug script failed:', error);
    process.exit(1);
});

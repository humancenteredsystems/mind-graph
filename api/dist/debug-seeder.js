"use strict";
const { TestDataSeeder } = require('./__tests__/helpers/testDataSeeder');
async function debugSeeder() {
    console.log('Creating TestDataSeeder...');
    const seeder = new TestDataSeeder();
    try {
        console.log('Setting up test database...');
        await seeder.setupTestDatabase();
        console.log('Checking if data was seeded...');
        // Let's check what's actually in the database after seeding
        const { adaptiveTenantFactory } = require('./services/adaptiveTenantFactory');
        const tenantClient = await adaptiveTenantFactory.createTenantFromContext({
            namespace: 'test-tenant',
            tenantId: 'test-tenant'
        });
        const hierarchiesQuery = `
      query {
        queryHierarchy {
          id
          name
          levels {
            id
            levelNumber
            label
            allowedTypes {
              typeName
            }
          }
        }
      }
    `;
        const hierarchies = await tenantClient.executeGraphQL(hierarchiesQuery);
        console.log('Hierarchies after seeding:', JSON.stringify(hierarchies, null, 2));
        const nodesQuery = `
      query {
        queryNode {
          id
          label
          type
        }
      }
    `;
        const nodes = await tenantClient.executeGraphQL(nodesQuery);
        console.log('Nodes after seeding:', JSON.stringify(nodes, null, 2));
    }
    catch (error) {
        console.error('Debug error:', error);
    }
}
debugSeeder();

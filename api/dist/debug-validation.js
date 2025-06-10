"use strict";
const { adaptiveTenantFactory } = require('./services/adaptiveTenantFactory');
const { getLevelIdForNode, validateLevelIdAndAllowedType } = require('./services/validation');
async function debugValidation() {
    try {
        console.log('Creating tenant client...');
        const tenantClient = await adaptiveTenantFactory.createTenantFromContext({
            namespace: 'test-tenant',
            tenantId: 'test-tenant'
        });
        console.log('Testing hierarchy lookup...');
        // First, let's see what hierarchies exist
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
        console.log('Hierarchies:', JSON.stringify(hierarchies, null, 2));
        if (hierarchies.queryHierarchy && hierarchies.queryHierarchy.length > 0) {
            const hierarchy = hierarchies.queryHierarchy[0];
            console.log('Testing getLevelIdForNode...');
            try {
                const levelId = await getLevelIdForNode(null, hierarchy.id, tenantClient);
                console.log('Got level ID:', levelId);
                console.log('Testing validateLevelIdAndAllowedType...');
                const validation = await validateLevelIdAndAllowedType(levelId, 'concept', hierarchy.id, tenantClient);
                console.log('Validation result:', validation);
            }
            catch (error) {
                console.error('Validation error:', error.message);
            }
        }
    }
    catch (error) {
        console.error('Debug error:', error);
    }
}
debugValidation();

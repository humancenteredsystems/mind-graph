/**
 * System Initialization Service
 * Handles startup tasks including h0 hierarchy creation
 */

import { adaptiveTenantFactory } from './adaptiveTenantFactory';

export let schemaLoaded = false;

/**
 * Set schema loaded state - can be called independently of h0 hierarchy creation
 * @param loaded - whether schema is loaded and ready
 */
export function setSchemaLoaded(loaded: boolean): void {
  schemaLoaded = loaded;
  console.log(`[SYSTEM_INIT] Schema loaded state set to: ${loaded}`);
}

export class SystemInitializationService {
  /**
   * Initialize h0 hierarchy if it doesn't exist
   * h0 is the special "None" hierarchy for categorization
   */
  static async initializeH0Hierarchy(): Promise<void> {
    try {
      console.log('[SYSTEM_INIT] Checking h0 hierarchy...');
      
      // Get default tenant client for system operations
      const tenantClient = await adaptiveTenantFactory.createTenantFromContext(null);
      
      // Check if h0 hierarchy already exists
      const checkQuery = `
        query CheckH0Exists {
          getHierarchy(id: "h0") {
            id
            name
          }
        }
      `;
      
      const checkResult = await tenantClient.executeGraphQL(checkQuery);
      
      if (checkResult.getHierarchy) {
        console.log('[SYSTEM_INIT] h0 hierarchy already exists');
        return;
      }
      
      console.log('[SYSTEM_INIT] Creating h0 hierarchy...');
      
      // Create h0 hierarchy
      const createHierarchyMutation = `
        mutation CreateH0Hierarchy($input: [AddHierarchyInput!]!) {
          addHierarchy(input: $input) {
            hierarchy {
              id
              name
            }
          }
        }
      `;
      
      const hierarchyResult = await tenantClient.executeGraphQL(createHierarchyMutation, {
        input: [{
          id: "h0",
          name: "None"
        }]
      });
      
      console.log('[SYSTEM_INIT] Created h0 hierarchy:', hierarchyResult.addHierarchy.hierarchy[0]);
      
      // Create Level 1 for h0 with hardcoded ID
      const createLevelMutation = `
        mutation CreateH0Level($input: [AddHierarchyLevelInput!]!) {
          addHierarchyLevel(input: $input) {
            hierarchyLevel {
              id
              levelNumber
              label
            }
          }
        }
      `;
      
      const levelResult = await tenantClient.executeGraphQL(createLevelMutation, {
        input: [{
          id: "1",
          hierarchy: { id: "h0" },
          levelNumber: 1,
          label: "Categories"
        }]
      });
      
      console.log('[SYSTEM_INIT] Created h0 Level 1:', levelResult.addHierarchyLevel.hierarchyLevel[0]);
      
      // Create default 'None' hierarchy level type for Level 1 with hardcoded ID
      const createHierarchyLevelTypeMutation = `
        mutation CreateH0HierarchyLevelType($input: [AddHierarchyLevelTypeInput!]!) {
          addHierarchyLevelType(input: $input) {
            hierarchyLevelType {
              id
              typeName
            }
          }
        }
      `;
      
      const hierarchyLevelTypeResult = await tenantClient.executeGraphQL(createHierarchyLevelTypeMutation, {
        input: [{
          id: "None",
          level: { id: "1" },
          typeName: "None"
        }]
      });
      
      console.log('[SYSTEM_INIT] Created default None hierarchy level type:', hierarchyLevelTypeResult.addHierarchyLevelType.hierarchyLevelType[0]);
      console.log('[SYSTEM_INIT] h0 hierarchy initialization complete');
    } catch (error) {
      console.error('[SYSTEM_INIT] Failed to initialize h0 hierarchy:', error);
      return;
    }
  }
  
  /**
   * Run all system initialization tasks
   */
  static async initialize(): Promise<void> {
    console.log('[SYSTEM_INIT] Starting system initialization...');
    
    try {
      await this.initializeH0Hierarchy();
      console.log('[SYSTEM_INIT] System initialization complete');
    } catch (error) {
      console.error('[SYSTEM_INIT] System initialization failed:', error);
      return;
    }
  }
}

import { 
  validateHierarchyId, 
  validateLevelIdAndAllowedType, 
  getLevelIdForNode,
  InvalidLevelError,
  NodeTypeNotAllowedError
} from '../../../services/validation';

// Mock tenant client interface
interface MockTenantClient {
  executeGraphQL<T = any>(query: string, variables?: Record<string, any>): Promise<T>;
}

describe('validation service', () => {
  let mockTenantClient: MockTenantClient;

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Create mock tenant client
    mockTenantClient = {
      executeGraphQL: jest.fn()
    };
  });

  describe('validateHierarchyId', () => {
    it('should return true for valid hierarchy ID', async () => {
      (mockTenantClient.executeGraphQL as jest.Mock).mockResolvedValueOnce({
        getHierarchy: { id: 'hierarchy1' }
      });

      const result = await validateHierarchyId('hierarchy1', mockTenantClient);
      expect(result).toBe(true);
    });

    it('should return false for invalid hierarchy ID', async () => {
      (mockTenantClient.executeGraphQL as jest.Mock).mockResolvedValueOnce({
        getHierarchy: null
      });

      const result = await validateHierarchyId('nonexistent', mockTenantClient);
      expect(result).toBe(false);
    });

    it('should return false for invalid input types', async () => {
      const result1 = await validateHierarchyId(null as any, mockTenantClient);
      const result2 = await validateHierarchyId(123 as any, mockTenantClient);
      const result3 = await validateHierarchyId('', mockTenantClient);

      expect(result1).toBe(false);
      expect(result2).toBe(false);
      expect(result3).toBe(false);
    });

    it('should handle database errors gracefully', async () => {
      (mockTenantClient.executeGraphQL as jest.Mock).mockRejectedValueOnce(new Error('Database error'));

      const result = await validateHierarchyId('hierarchy1', mockTenantClient);
      expect(result).toBe(false);
    });
  });

  describe('validateLevelIdAndAllowedType', () => {
    it('should validate successfully for allowed node type at level', async () => {
      (mockTenantClient.executeGraphQL as jest.Mock).mockResolvedValueOnce({
        getHierarchyLevel: {
          id: 'level1',
          levelNumber: 1,
          hierarchy: { id: 'hierarchy1' },
          allowedTypes: [
            { typeName: 'concept' },
            { typeName: 'question' }
          ]
        }
      });

      const result = await validateLevelIdAndAllowedType('level1', 'concept', 'hierarchy1', mockTenantClient);
      expect(result).toBeDefined();
      expect(result.id).toBe('level1');
    });

    it('should throw NodeTypeNotAllowedError for disallowed node type', async () => {
      (mockTenantClient.executeGraphQL as jest.Mock).mockResolvedValueOnce({
        getHierarchyLevel: {
          id: 'level1',
          levelNumber: 1,
          hierarchy: { id: 'hierarchy1' },
          allowedTypes: [
            { typeName: 'concept' }
          ]
        }
      });

      await expect(validateLevelIdAndAllowedType('level1', 'invalid-type', 'hierarchy1', mockTenantClient))
        .rejects
        .toThrow(NodeTypeNotAllowedError);
    });

    it('should allow any type when allowedTypes is empty', async () => {
      (mockTenantClient.executeGraphQL as jest.Mock).mockResolvedValueOnce({
        getHierarchyLevel: {
          id: 'level1',
          levelNumber: 1,
          hierarchy: { id: 'hierarchy1' },
          allowedTypes: []
        }
      });

      const result = await validateLevelIdAndAllowedType('level1', 'any-type', 'hierarchy1', mockTenantClient);
      expect(result).toBeDefined();
    });

    it('should throw InvalidLevelError for missing level', async () => {
      (mockTenantClient.executeGraphQL as jest.Mock).mockResolvedValueOnce({
        getHierarchyLevel: null
      });

      await expect(validateLevelIdAndAllowedType('nonexistent-level', 'concept', 'hierarchy1', mockTenantClient))
        .rejects
        .toThrow(InvalidLevelError);
    });

    it('should throw error for invalid input parameters', async () => {
      await expect(validateLevelIdAndAllowedType(null as any, 'concept', 'hierarchy1', mockTenantClient))
        .rejects
        .toThrow(InvalidLevelError);

      await expect(validateLevelIdAndAllowedType('level1', null as any, 'hierarchy1', mockTenantClient))
        .rejects
        .toThrow('A valid nodeType string must be provided');
    });
  });

  describe('getLevelIdForNode', () => {
    it('should return level 1 when no parent provided and no type-specific level found', async () => {
      // Mock hierarchy levels query for type-aware lookup (will find no matching types)
      (mockTenantClient.executeGraphQL as jest.Mock).mockResolvedValueOnce({
        queryHierarchy: [{
          levels: [
            { id: 'level1', levelNumber: 1, allowedTypes: [{ typeName: 'concept' }] },
            { id: 'level2', levelNumber: 2, allowedTypes: [{ typeName: 'question' }] }
          ]
        }]
      });

      // Mock fallback levels query (after type-aware lookup fails)
      (mockTenantClient.executeGraphQL as jest.Mock).mockResolvedValueOnce({
        queryHierarchy: [{
          levels: [
            { id: 'level1', levelNumber: 1 },
            { id: 'level2', levelNumber: 2 }
          ]
        }]
      });

      const result = await getLevelIdForNode(null, 'hierarchy1', 'unknown-type', mockTenantClient);
      expect(result).toBe('level1');
    });

    it('should use type-aware assignment when no parent provided', async () => {
      // Mock hierarchy levels query for type-aware lookup  
      (mockTenantClient.executeGraphQL as jest.Mock).mockResolvedValueOnce({
        queryHierarchy: [{
          levels: [
            { id: 'level1', levelNumber: 1, allowedTypes: [{ typeName: 'country' }] },
            { id: 'level2', levelNumber: 2, allowedTypes: [{ typeName: 'state' }] }
          ]
        }]
      });

      // Mock second levels query to get level ID by levelNumber
      (mockTenantClient.executeGraphQL as jest.Mock).mockResolvedValueOnce({
        queryHierarchy: [{
          levels: [
            { id: 'level1', levelNumber: 1 },
            { id: 'level2', levelNumber: 2 }
          ]
        }]
      });

      const result = await getLevelIdForNode(null, 'hierarchy1', 'state', mockTenantClient);
      expect(result).toBe('level2');
    });

    it('should return next level when parent has assignment in hierarchy', async () => {
      // Mock parent query
      (mockTenantClient.executeGraphQL as jest.Mock).mockResolvedValueOnce({
        queryNode: [{
          hierarchyAssignments: [{
            hierarchy: { id: 'hierarchy1' },
            level: { levelNumber: 1 }
          }]
        }]
      });

      // Mock levels query
      (mockTenantClient.executeGraphQL as jest.Mock).mockResolvedValueOnce({
        queryHierarchy: [{
          levels: [
            { id: 'level1', levelNumber: 1 },
            { id: 'level2', levelNumber: 2 }
          ]
        }]
      });

      const result = await getLevelIdForNode('parent-node', 'hierarchy1', 'concept', mockTenantClient);
      expect(result).toBe('level2');
    });

    it('should return level 1 when parent has no assignment in target hierarchy', async () => {
      // Mock parent query - parent exists but no assignment in target hierarchy
      (mockTenantClient.executeGraphQL as jest.Mock).mockResolvedValueOnce({
        queryNode: [{
          hierarchyAssignments: [{
            hierarchy: { id: 'other-hierarchy' },
            level: { levelNumber: 1 }
          }]
        }]
      });

      // Mock type-aware lookup (fallback when parent has no assignment)
      (mockTenantClient.executeGraphQL as jest.Mock).mockResolvedValueOnce({
        queryHierarchy: [{
          levels: [
            { id: 'level1', levelNumber: 1, allowedTypes: [{ typeName: 'concept' }] },
            { id: 'level2', levelNumber: 2, allowedTypes: [{ typeName: 'question' }] }
          ]
        }]
      });

      // Mock final levels query to get level ID by levelNumber
      (mockTenantClient.executeGraphQL as jest.Mock).mockResolvedValueOnce({
        queryHierarchy: [{
          levels: [
            { id: 'level1', levelNumber: 1 },
            { id: 'level2', levelNumber: 2 }
          ]
        }]
      });

      const result = await getLevelIdForNode('parent-node', 'hierarchy1', 'concept', mockTenantClient);
      expect(result).toBe('level1');
    });

    it('should throw InvalidLevelError when calculated level does not exist', async () => {
      // Mock parent query - parent at level 2
      (mockTenantClient.executeGraphQL as jest.Mock).mockResolvedValueOnce({
        queryNode: [{
          hierarchyAssignments: [{
            hierarchy: { id: 'hierarchy1' },
            level: { levelNumber: 2 }
          }]
        }]
      });

      // Mock levels query - only has levels 1 and 2, so level 3 doesn't exist
      (mockTenantClient.executeGraphQL as jest.Mock).mockResolvedValueOnce({
        queryHierarchy: [{
          levels: [
            { id: 'level1', levelNumber: 1 },
            { id: 'level2', levelNumber: 2 }
          ]
        }]
      });

      await expect(getLevelIdForNode('parent-node', 'hierarchy1', 'concept', mockTenantClient))
        .rejects
        .toThrow(InvalidLevelError);
    });

    it('should throw InvalidLevelError when hierarchy has no levels', async () => {
      // Mock type-aware lookup (will fail due to no levels)
      (mockTenantClient.executeGraphQL as jest.Mock).mockResolvedValueOnce({
        queryHierarchy: [{
          levels: []
        }]
      });

      // Mock fallback levels query (also empty)
      (mockTenantClient.executeGraphQL as jest.Mock).mockResolvedValueOnce({
        queryHierarchy: [{
          levels: []
        }]
      });

      await expect(getLevelIdForNode(null, 'hierarchy1', 'concept', mockTenantClient))
        .rejects
        .toThrow(InvalidLevelError);
    });

    it('should handle multiple matching levels and return first one', async () => {
      // Mock hierarchy levels query - multiple levels allow 'concept'
      (mockTenantClient.executeGraphQL as jest.Mock).mockResolvedValueOnce({
        queryHierarchy: [{
          levels: [
            { id: 'level1', levelNumber: 1, allowedTypes: [{ typeName: 'concept' }] },
            { id: 'level2', levelNumber: 2, allowedTypes: [{ typeName: 'concept' }, { typeName: 'question' }] }
          ]
        }]
      });

      // Mock second levels query to get level ID by levelNumber
      (mockTenantClient.executeGraphQL as jest.Mock).mockResolvedValueOnce({
        queryHierarchy: [{
          levels: [
            { id: 'level1', levelNumber: 1 },
            { id: 'level2', levelNumber: 2 }
          ]
        }]
      });

      const result = await getLevelIdForNode(null, 'hierarchy1', 'concept', mockTenantClient);
      expect(result).toBe('level1'); // Should return the first matching level
    });
  });
});

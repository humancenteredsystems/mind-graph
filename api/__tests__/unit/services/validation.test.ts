import {
  validateHierarchyId,
  validateLevelIdAndAllowedType,
  getLevelIdForNode,
  InvalidLevelError,
  NodeTypeNotAllowedError
} from '../../../services/validation';
import { mockHierarchies } from '../../helpers/mockData'; // Assuming mockHierarchies is still needed, though not directly used in the logic here

// Mock the dgraphClient
jest.mock('../../../dgraphClient', () => ({
  executeGraphQL: jest.fn()
}));

// Import the mocked executeGraphQL function and assert its type
import { executeGraphQL as _executeGraphQL } from '../../../dgraphClient';
const executeGraphQL = _executeGraphQL as jest.Mock<Promise<any>>; // Assert as a mock function returning a Promise


describe('validation service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('validateHierarchyId', () => {
    it('should return true for valid hierarchy ID', async () => {
      executeGraphQL.mockResolvedValueOnce({
        getHierarchy: { id: 'hierarchy1' }
      });

      const result = await validateHierarchyId('hierarchy1');
      expect(result).toBe(true);
    });

    it('should return false for invalid hierarchy ID', async () => {
      executeGraphQL.mockResolvedValueOnce({
        getHierarchy: null
      });

      const result = await validateHierarchyId('nonexistent');
      expect(result).toBe(false);
    });

    it('should return false for invalid input types', async () => {
      const result1 = await validateHierarchyId(null as any); // Cast to any for testing invalid input
      const result2 = await validateHierarchyId(123 as any); // Cast to any for testing invalid input
      const result3 = await validateHierarchyId('');

      expect(result1).toBe(false);
      expect(result2).toBe(false);
      expect(result3).toBe(false);
    });

    it('should handle database errors gracefully', async () => {
      executeGraphQL.mockRejectedValueOnce(new Error('Database error'));

      const result = await validateHierarchyId('hierarchy1');
      expect(result).toBe(false);
    });
  });

  describe('validateLevelIdAndAllowedType', () => {
    it('should validate successfully for allowed node type at level', async () => {
      executeGraphQL.mockResolvedValueOnce({
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

      const result = await validateLevelIdAndAllowedType('level1', 'concept', 'hierarchy1');
      expect(result).toBeDefined();
      expect(result.id).toBe('level1');
    });

    it('should throw NodeTypeNotAllowedError for disallowed node type', async () => {
      executeGraphQL.mockResolvedValueOnce({
        getHierarchyLevel: {
          id: 'level1',
          levelNumber: 1,
          hierarchy: { id: 'hierarchy1' },
          allowedTypes: [
            { typeName: 'concept' }
          ]
        }
      });

      await expect(validateLevelIdAndAllowedType('level1', 'invalid-type', 'hierarchy1'))
        .rejects
        .toThrow(NodeTypeNotAllowedError);
    });

    it('should allow any type when allowedTypes is empty', async () => {
      executeGraphQL.mockResolvedValueOnce({
        getHierarchyLevel: {
          id: 'level1',
          levelNumber: 1,
          hierarchy: { id: 'hierarchy1' },
          allowedTypes: []
        }
      });

      const result = await validateLevelIdAndAllowedType('level1', 'any-type', 'hierarchy1');
      expect(result).toBeDefined();
    });

    it('should throw InvalidLevelError for missing level', async () => {
      executeGraphQL.mockResolvedValueOnce({
        getHierarchyLevel: null
      });

      await expect(validateLevelIdAndAllowedType('nonexistent-level', 'concept', 'hierarchy1'))
        .rejects
        .toThrow(InvalidLevelError);
    });

    it('should throw error for invalid input parameters', async () => {
      await expect(validateLevelIdAndAllowedType(null as any, 'concept', 'hierarchy1')) // Cast to any
        .rejects
        .toThrow(InvalidLevelError);

      await expect(validateLevelIdAndAllowedType('level1', null as any, 'hierarchy1')) // Cast to any
        .rejects
        .toThrow('A valid nodeType string must be provided');
    });
  });

  describe('getLevelIdForNode', () => {
    it('should return level 1 when no parent provided', async () => {
      executeGraphQL.mockResolvedValueOnce({
        queryHierarchy: [{
          levels: [
            { id: 'level1', levelNumber: 1 },
            { id: 'level2', levelNumber: 2 }
          ]
        }]
      });

      const result = await getLevelIdForNode(null, 'hierarchy1');
      expect(result).toBe('level1');
    });

    it('should return next level when parent has assignment in hierarchy', async () => {
      // Mock parent query
      executeGraphQL.mockResolvedValueOnce({
        queryNode: [{
          hierarchyAssignments: [{
            hierarchy: { id: 'hierarchy1' },
            level: { levelNumber: 1 }
          }]
        }]
      });

      // Mock levels query
      executeGraphQL.mockResolvedValueOnce({
        queryHierarchy: [{
          levels: [
            { id: 'level1', levelNumber: 1 },
            { id: 'level2', levelNumber: 2 }
          ]
        }]
      });

      const result = await getLevelIdForNode('parent-node', 'hierarchy1');
      expect(result).toBe('level2');
    });

    it('should return level 1 when parent has no assignment in target hierarchy', async () => {
      // Mock parent query - parent exists but no assignment in target hierarchy
      executeGraphQL.mockResolvedValueOnce({
        queryNode: [{
          hierarchyAssignments: [{
            hierarchy: { id: 'other-hierarchy' },
            level: { levelNumber: 1 }
          }]
        }]
      });

      // Mock levels query
      executeGraphQL.mockResolvedValueOnce({
        queryHierarchy: [{
          levels: [
            { id: 'level1', levelNumber: 1 },
            { id: 'level2', levelNumber: 2 }
          ]
        }]
      });

      const result = await getLevelIdForNode('parent-node', 'hierarchy1');
      expect(result).toBe('level1');
    });

    it('should throw InvalidLevelError when calculated level does not exist', async () => {
      // Mock parent query - parent at level 2
      executeGraphQL.mockResolvedValueOnce({
        queryNode: [{
          hierarchyAssignments: [{
            hierarchy: { id: 'hierarchy1' },
            level: { levelNumber: 2 }
          }]
        }]
      });

      // Mock levels query - only has levels 1 and 2, so level 3 doesn't exist
      executeGraphQL.mockResolvedValueOnce({
        queryHierarchy: [{
          levels: [
            { id: 'level1', levelNumber: 1 },
            { id: 'level2', levelNumber: 2 }
          ]
        }]
      });

      await expect(getLevelIdForNode('parent-node', 'hierarchy1'))
        .rejects
        .toThrow(InvalidLevelError);
    });

    it('should throw InvalidLevelError when hierarchy has no levels', async () => {
      executeGraphQL.mockResolvedValueOnce({
        queryHierarchy: [{
          levels: []
        }]
      });

      await expect(getLevelIdForNode(null, 'hierarchy1'))
        .rejects
        .toThrow(InvalidLevelError);
    });
  });
});

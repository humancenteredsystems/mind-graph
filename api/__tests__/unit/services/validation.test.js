const { jest } = require('@jest/globals');
const { validateHierarchyId, validateNodeType, validateLevelId } = require('../../../services/validation');
const { mockHierarchies } = require('../../helpers/mockData');

// Mock the dgraphClient
jest.mock('../../../dgraphClient', () => ({
  executeQuery: jest.fn()
}));

const dgraphClient = require('../../../dgraphClient');

describe('validation service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('validateHierarchyId', () => {
    it('should return true for valid hierarchy ID', async () => {
      dgraphClient.executeQuery.mockResolvedValueOnce({
        data: {
          queryHierarchy: [mockHierarchies[0]]
        }
      });

      const result = await validateHierarchyId('hierarchy1');
      expect(result).toBe(true);
    });

    it('should return false for invalid hierarchy ID', async () => {
      dgraphClient.executeQuery.mockResolvedValueOnce({
        data: {
          queryHierarchy: []
        }
      });

      const result = await validateHierarchyId('nonexistent');
      expect(result).toBe(false);
    });

    it('should handle database errors gracefully', async () => {
      dgraphClient.executeQuery.mockRejectedValueOnce(new Error('Database error'));

      await expect(validateHierarchyId('hierarchy1'))
        .rejects
        .toThrow('Database error');
    });
  });

  describe('validateNodeType', () => {
    it('should return true for valid node type at level', async () => {
      dgraphClient.executeQuery.mockResolvedValueOnce({
        data: {
          queryHierarchy: [mockHierarchies[0]]
        }
      });

      const result = await validateNodeType('concept', 'level1', 'hierarchy1');
      expect(result).toBe(true);
    });

    it('should return false for invalid node type at level', async () => {
      dgraphClient.executeQuery.mockResolvedValueOnce({
        data: {
          queryHierarchy: [mockHierarchies[0]]
        }
      });

      const result = await validateNodeType('invalid-type', 'level1', 'hierarchy1');
      expect(result).toBe(false);
    });

    it('should handle missing level', async () => {
      dgraphClient.executeQuery.mockResolvedValueOnce({
        data: {
          queryHierarchy: [mockHierarchies[0]]
        }
      });

      const result = await validateNodeType('concept', 'nonexistent-level', 'hierarchy1');
      expect(result).toBe(false);
    });
  });

  describe('validateLevelId', () => {
    it('should return true for valid level ID', async () => {
      dgraphClient.executeQuery.mockResolvedValueOnce({
        data: {
          queryHierarchy: [mockHierarchies[0]]
        }
      });

      const result = await validateLevelId('level1', 'hierarchy1');
      expect(result).toBe(true);
    });

    it('should return false for invalid level ID', async () => {
      dgraphClient.executeQuery.mockResolvedValueOnce({
        data: {
          queryHierarchy: [mockHierarchies[0]]
        }
      });

      const result = await validateLevelId('nonexistent-level', 'hierarchy1');
      expect(result).toBe(false);
    });

    it('should handle missing hierarchy', async () => {
      dgraphClient.executeQuery.mockResolvedValueOnce({
        data: {
          queryHierarchy: []
        }
      });

      const result = await validateLevelId('level1', 'nonexistent-hierarchy');
      expect(result).toBe(false);
    });
  });
});

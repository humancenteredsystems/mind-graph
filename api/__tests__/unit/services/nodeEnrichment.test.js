const { jest } = require('@jest/globals');
const { enrichAddNodeInput } = require('../../../services/nodeEnrichment');
const { createMockAddNodeInput, mockHierarchies } = require('../../helpers/mockData');

// Mock the dgraphClient
jest.mock('../../../dgraphClient', () => ({
  executeQuery: jest.fn()
}));

const dgraphClient = require('../../../dgraphClient');

describe('nodeEnrichment service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('enrichAddNodeInput', () => {
    it('should enrich node input with hierarchy assignments', async () => {
      const hierarchyId = 'hierarchy1';
      const input = [createMockAddNodeInput()];

      // Mock hierarchy query response
      dgraphClient.executeQuery.mockResolvedValueOnce({
        data: {
          queryHierarchy: [mockHierarchies[0]]
        }
      });

      const result = await enrichAddNodeInput(input, hierarchyId);

      expect(result).toHaveLength(1);
      expect(result[0]).toHaveProperty('hierarchyAssignments');
      expect(result[0].hierarchyAssignments).toHaveLength(1);
      expect(result[0].hierarchyAssignments[0]).toEqual({
        hierarchy: { id: 'hierarchy1' },
        level: { id: 'level1' }
      });
    });

    it('should validate node type against level restrictions', async () => {
      const hierarchyId = 'hierarchy1';
      const input = [createMockAddNodeInput({ 
        type: 'invalid-type',
        hierarchyAssignments: [
          {
            hierarchy: { id: 'hierarchy1' },
            level: { id: 'level1' }
          }
        ]
      })];

      // Mock hierarchy query response
      dgraphClient.executeQuery.mockResolvedValueOnce({
        data: {
          queryHierarchy: [mockHierarchies[0]]
        }
      });

      await expect(enrichAddNodeInput(input, hierarchyId))
        .rejects
        .toThrow('Node type "invalid-type" is not allowed at level "Domain"');
    });

    it('should handle missing hierarchy', async () => {
      const hierarchyId = 'nonexistent';
      const input = [createMockAddNodeInput()];

      // Mock empty hierarchy query response
      dgraphClient.executeQuery.mockResolvedValueOnce({
        data: {
          queryHierarchy: []
        }
      });

      await expect(enrichAddNodeInput(input, hierarchyId))
        .rejects
        .toThrow('Hierarchy "nonexistent" not found');
    });

    it('should handle missing level', async () => {
      const hierarchyId = 'hierarchy1';
      const input = [createMockAddNodeInput({
        hierarchyAssignments: [
          {
            hierarchy: { id: 'hierarchy1' },
            level: { id: 'nonexistent-level' }
          }
        ]
      })];

      // Mock hierarchy query response
      dgraphClient.executeQuery.mockResolvedValueOnce({
        data: {
          queryHierarchy: [mockHierarchies[0]]
        }
      });

      await expect(enrichAddNodeInput(input, hierarchyId))
        .rejects
        .toThrow('Level "nonexistent-level" not found in hierarchy "Test Hierarchy"');
    });

    it('should assign default level when none specified', async () => {
      const hierarchyId = 'hierarchy1';
      const input = [createMockAddNodeInput({ 
        hierarchyAssignments: undefined 
      })];

      // Mock hierarchy query response
      dgraphClient.executeQuery.mockResolvedValueOnce({
        data: {
          queryHierarchy: [mockHierarchies[0]]
        }
      });

      const result = await enrichAddNodeInput(input, hierarchyId);

      expect(result[0].hierarchyAssignments).toHaveLength(1);
      expect(result[0].hierarchyAssignments[0].level.id).toBe('level1');
    });

    it('should handle multiple nodes in batch', async () => {
      const hierarchyId = 'hierarchy1';
      const input = [
        createMockAddNodeInput({ id: 'node1', type: 'concept' }),
        createMockAddNodeInput({ id: 'node2', type: 'question' })
      ];

      // Mock hierarchy query response
      dgraphClient.executeQuery.mockResolvedValueOnce({
        data: {
          queryHierarchy: [mockHierarchies[0]]
        }
      });

      const result = await enrichAddNodeInput(input, hierarchyId);

      expect(result).toHaveLength(2);
      expect(result[0].id).toBe('node1');
      expect(result[1].id).toBe('node2');
      expect(result[0].hierarchyAssignments).toBeDefined();
      expect(result[1].hierarchyAssignments).toBeDefined();
    });
  });
});

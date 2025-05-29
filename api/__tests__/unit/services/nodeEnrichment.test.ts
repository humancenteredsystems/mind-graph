import { enrichNodeInputs } from '../../../services/nodeEnrichment';
import { createMockAddNodeInput, mockHierarchies } from '../../helpers/mockData';
import { JestMockOf } from '../../../src/types/jest'; // Assuming a type helper for Jest mocks exists or will be created

// Mock the validation service
jest.mock('../../../services/validation', () => ({
  validateHierarchyId: jest.fn(),
  validateLevelIdAndAllowedType: jest.fn(),
  getLevelIdForNode: jest.fn()
}));

// Import the mocked validation module and assert its type
import * as validationModule from '../../../services/validation';
const validation = validationModule as JestMockOf<typeof validationModule>;


describe('nodeEnrichment service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('enrichNodeInputs', () => {
    it('should return variables unchanged for non-AddNodeWithHierarchy mutations', async () => {
      const variables = { input: [createMockAddNodeInput()] };
      const hierarchyId = 'hierarchy1';
      const mutation = 'mutation AddNode($input: [AddNodeInput!]!) { addNode(input: $input) { node { id } } }';

      const result = await enrichNodeInputs(variables, hierarchyId, mutation);

      expect(result).toEqual(variables);
    });

    it('should enrich node input with hierarchy assignments for AddNodeWithHierarchy mutations', async () => {
      const input = [createMockAddNodeInput({
        hierarchyAssignments: [
          {
            hierarchy: { id: 'hierarchy1' },
            level: { id: 'level1' }
          }
        ]
      })];
      const variables = { input };
      const hierarchyId = 'hierarchy1';
      const mutation = 'mutation AddNodeWithHierarchy($input: [AddNodeInput!]!) { addNode(input: $input) { node { id } } }';

      // Mock with a value matching the expected return type
      validation.validateLevelIdAndAllowedType.mockResolvedValueOnce({
        id: 'level1',
        levelNumber: 1,
        hierarchy: { id: 'hierarchy1' },
        allowedTypes: [{ typeName: 'concept' }]
      });

      const result = await enrichNodeInputs(variables, hierarchyId, mutation);

      expect(result.input).toHaveLength(1);
      expect(result.input[0]!).toHaveProperty('hierarchyAssignments'); // Add non-null assertion
      expect(result.input[0]!.hierarchyAssignments).toHaveLength(1); // Add non-null assertion
      expect(result.input[0]!.hierarchyAssignments![0]).toEqual({ // Add non-null assertions
        hierarchy: { id: 'hierarchy1' },
        level: { id: 'level1' }
      });
    });

    it('should validate node type against level restrictions', async () => {
      const input = [createMockAddNodeInput({
        type: 'invalid-type',
        hierarchyAssignments: [
          {
            hierarchy: { id: 'hierarchy1' },
            level: { id: 'level1' }
          }
        ]
      })];
      const variables = { input };
      const hierarchyId = 'hierarchy1';
      const mutation = 'mutation AddNodeWithHierarchy($input: [AddNodeInput!]!) { addNode(input: $input) { node { id } } }';

      validation.validateLevelIdAndAllowedType.mockRejectedValueOnce(
        new Error('Node type "invalid-type" is not allowed at level "Domain"')
      );

      await expect(enrichNodeInputs(variables, hierarchyId, mutation))
        .rejects
        .toThrow('Node type "invalid-type" is not allowed at level "Domain"');
    });

    it('should handle levelId provided directly', async () => {
      const input = [createMockAddNodeInput({
        hierarchyAssignments: undefined, // Remove default hierarchyAssignments
        levelId: 'level1'
      })];
      const variables = { input };
      const hierarchyId = 'hierarchy1';
      const mutation = 'mutation AddNodeWithHierarchy($input: [AddNodeInput!]!) { addNode(input: $input) { node { id } } }';

      // Mock with a value matching the expected return type
      validation.validateLevelIdAndAllowedType.mockResolvedValueOnce({
        id: 'level1',
        levelNumber: 1,
        hierarchy: { id: 'hierarchy1' },
        allowedTypes: [{ typeName: 'concept' }]
      });

      const result = await enrichNodeInputs(variables, hierarchyId, mutation);

      expect(result.input[0]!).toHaveProperty('hierarchyAssignments'); // Add non-null assertion
      expect(result.input[0]!.hierarchyAssignments![0]).toEqual({ // Add non-null assertions
        hierarchy: { id: 'hierarchy1' },
        level: { id: 'level1' }
      });
    });

    it('should handle parentId by calculating level', async () => {
      const input = [createMockAddNodeInput({
        hierarchyAssignments: undefined, // Remove default hierarchyAssignments
        parentId: 'parent-node'
      })];
      const variables = { input };
      const hierarchyId = 'hierarchy1';
      const mutation = 'mutation AddNodeWithHierarchy($input: [AddNodeInput!]!) { addNode(input: $input) { node { id } } }';

      validation.getLevelIdForNode.mockResolvedValueOnce('level2');
      // Mock with a value matching the expected return type
      validation.validateLevelIdAndAllowedType.mockResolvedValueOnce({
        id: 'level2',
        levelNumber: 2,
        hierarchy: { id: 'hierarchy1' },
        allowedTypes: [{ typeName: 'concept' }]
      });

      const result = await enrichNodeInputs(variables, hierarchyId, mutation);

      expect(validation.getLevelIdForNode).toHaveBeenCalledWith('parent-node', hierarchyId); // Corrected hierarchyId
      expect(result.input[0]!).toHaveProperty('hierarchyAssignments'); // Add non-null assertion
      expect(result.input[0]!.hierarchyAssignments![0]).toEqual({ // Add non-null assertions
        hierarchy: { id: 'hierarchy1' },
        level: { id: 'level2' }
      });
    });

    it('should handle multiple nodes in batch', async () => {
      const input = [
        createMockAddNodeInput({ id: 'node1', type: 'concept', hierarchyAssignments: undefined, levelId: 'level1' }),
        createMockAddNodeInput({ id: 'node2', type: 'concept', hierarchyAssignments: undefined, levelId: 'level1' })
      ];
      const variables = { input };
      const hierarchyId = 'hierarchy1';
      const mutation = 'mutation AddNodeWithHierarchy($input: [AddNodeInput!]!) { addNode(input: $input) { node { id } } }';

      // Mock with a value matching the expected return type
      validation.validateLevelIdAndAllowedType.mockResolvedValue({
        id: 'level1',
        levelNumber: 1,
        hierarchy: { id: 'hierarchy1' },
        allowedTypes: [{ typeName: 'concept' }]
      });

      const result = await enrichNodeInputs(variables, hierarchyId, mutation);

      expect(result.input).toHaveLength(2);
      expect(result.input[0]!.id).toBe('node1'); // Add non-null assertion
      expect(result.input[1]!.id).toBe('node2'); // Add non-null assertion
      expect(result.input[0]!).toHaveProperty('hierarchyAssignments'); // Add non-null assertion
      expect(result.input[1]!).toHaveProperty('hierarchyAssignments'); // Add non-null assertion
    });

    it('should create node without assignment when no hierarchy info provided', async () => {
      const input = [createMockAddNodeInput({
        hierarchyAssignments: undefined,
        levelId: undefined,
        parentId: undefined
      })];
      const variables = { input };
      const hierarchyId = 'hierarchy1';
      const mutation = 'mutation AddNodeWithHierarchy($input: [AddNodeInput!]!) { addNode(input: $input) { node { id } } }';

      const result = await enrichNodeInputs(variables, hierarchyId, mutation);

      expect(result.input[0]).not.toHaveProperty('hierarchyAssignments');
    });
  });
});

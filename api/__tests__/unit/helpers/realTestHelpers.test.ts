import { createTestHierarchyAssignment, createTestNodeData, verifyInTestTenant } from '../../helpers/realTestHelpers';

describe('realTestHelpers', () => {
  describe('createTestHierarchyAssignment', () => {
    it('should create assignment object with provided parameters', () => {
      const result = createTestHierarchyAssignment(
        'test-node-123',
        'test-hierarchy-1',
        'dynamic-level-id-456'
      );

      expect(result).toEqual({
        nodeId: 'test-node-123',
        hierarchyId: 'test-hierarchy-1',
        levelId: 'dynamic-level-id-456'
      });
    });

    it('should use default hierarchy when not provided', () => {
      const result = createTestHierarchyAssignment(
        'test-node-123',
        undefined as any, // TypeScript will complain but test the runtime behavior
        'dynamic-level-id-456'
      );

      expect(result).toEqual({
        nodeId: 'test-node-123',
        hierarchyId: 'test-hierarchy-1',
        levelId: 'dynamic-level-id-456'
      });
    });

    it('should throw error when levelId is not provided', () => {
      expect(() => {
        createTestHierarchyAssignment(
          'test-node-123',
          'test-hierarchy-1',
          '' // Empty string should trigger error
        );
      }).toThrow('levelId is required and must be a real Dgraph-generated ID');
    });

    it('should throw error when levelId is undefined', () => {
      expect(() => {
        createTestHierarchyAssignment(
          'test-node-123',
          'test-hierarchy-1',
          undefined as any // Test undefined levelId
        );
      }).toThrow('levelId is required and must be a real Dgraph-generated ID');
    });

    it('should throw error when levelId is null', () => {
      expect(() => {
        createTestHierarchyAssignment(
          'test-node-123',
          'test-hierarchy-1',
          null as any // Test null levelId
        );
      }).toThrow('levelId is required and must be a real Dgraph-generated ID');
    });

    it('should throw descriptive error referencing Issues #6/#13', () => {
      expect(() => {
        createTestHierarchyAssignment(
          'test-node-123',
          'test-hierarchy-1',
          ''
        );
      }).toThrow(/See Issues #6\/#13 for context/);
    });

    it('should prevent hardcoded test-level-1 usage by requiring explicit levelId', () => {
      // This test ensures the old hardcoded default 'test-level-1' is no longer available
      // If someone tries to use the function without providing levelId, it should fail
      expect(() => {
        // @ts-ignore - Intentionally testing runtime behavior despite TypeScript errors
        createTestHierarchyAssignment('test-node-123', 'test-hierarchy-1');
      }).toThrow('levelId is required');
    });

    it('should work with realistic Dgraph-generated level IDs', () => {
      // Test with realistic Dgraph-style IDs
      const dgraphStyleLevelId = '0x4e21'; // Example Dgraph-generated ID
      
      const result = createTestHierarchyAssignment(
        'test-node-123',
        'test-hierarchy-1',
        dgraphStyleLevelId
      );

      expect(result.levelId).toBe(dgraphStyleLevelId);
      expect(result).toEqual({
        nodeId: 'test-node-123',
        hierarchyId: 'test-hierarchy-1',
        levelId: dgraphStyleLevelId
      });
    });
  });

  describe('createTestNodeData', () => {
    it('should create node data with unique IDs', () => {
      const node1 = createTestNodeData();
      const node2 = createTestNodeData();
      
      expect(node1.id).not.toBe(node2.id);
      expect(node1.id).toMatch(/^test-node-\d+-[a-z0-9]{4}$/);
      expect(node1.label).toBe('Test Node');
      expect(node1.type).toBe('concept');
    });

    it('should apply overrides correctly', () => {
      const overrides = {
        label: 'Custom Label',
        type: 'example',
        customField: 'custom value'
      };
      
      const result = createTestNodeData(overrides);
      
      expect(result.label).toBe('Custom Label');
      expect(result.type).toBe('example');
      expect((result as any).customField).toBe('custom value');
      expect(result.id).toMatch(/^test-node-\d+-[a-z0-9]{4}$/);
    });
  });
});

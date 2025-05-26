import { describe, it, expect } from 'vitest';
import { transformTraversalData } from '../../../src/utils/graphUtils';

describe('transformTraversalData', () => {
  it('should correctly transform basic traversal data', () => {
    const traversalData = {
      queryNode: [
        {
          id: 'node1',
          label: 'Test Node 1',
          type: 'concept',
          hierarchyAssignments: [
            {
              hierarchy: { id: 'h1', name: 'Test Hierarchy' },
              level: { id: 'l1', levelNumber: 1, label: 'Domain' }
            }
          ],
          outgoing: [
            {
              id: 'edge1',
              type: 'connects_to',
              target: {
                id: 'node2',
                label: 'Test Node 2',
                type: 'example'
              }
            }
          ]
        }
      ]
    };

    const result = transformTraversalData(traversalData);

    expect(result.nodes).toHaveLength(2);
    expect(result.edges).toHaveLength(1);
    
    expect(result.nodes[0]).toEqual({
      id: 'node1',
      label: 'Test Node 1',
      type: 'concept',
      assignments: [
        {
          hierarchyId: 'h1',
          hierarchyName: 'Test Hierarchy',
          levelId: 'l1',
          levelNumber: 1,
          levelLabel: 'Domain'
        }
      ],
      status: undefined,
      branch: undefined
    });

    expect(result.edges[0]).toEqual({
      source: 'node1',
      target: 'node2',
      type: 'connects_to'
    });
  });

  it('should handle empty traversal data', () => {
    const traversalData = { queryNode: [] };
    const result = transformTraversalData(traversalData);

    expect(result.nodes).toHaveLength(0);
    expect(result.edges).toHaveLength(0);
  });

  it('should handle nodes without outgoing edges', () => {
    const traversalData = {
      queryNode: [
        {
          id: 'node1',
          label: 'Isolated Node',
          type: 'concept',
          hierarchyAssignments: [],
          outgoing: []
        }
      ]
    };

    const result = transformTraversalData(traversalData);

    expect(result.nodes).toHaveLength(1);
    expect(result.edges).toHaveLength(0);
  });
});

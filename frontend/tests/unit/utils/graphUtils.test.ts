// Test file for graphUtils.ts
import { describe, it, expect } from 'vitest';
import { transformTraversalData } from './graphUtils';

describe('transformTraversalData', () => {
  it('should correctly transform basic traversal data', () => {
    // TODO: Add test case with sample raw data and expected nodes/edges
    const rawData = {
      queryNode: [
        {
          id: 'node1',
          label: 'Concept 1',
          type: 'concept',
          outgoing: [
            { type: 'RELATES_TO', to: { id: 'node2', label: 'Concept 2', type: 'concept' } },
            { type: 'RELATES_TO', to: { id: 'node3', label: 'Concept 3', type: 'concept' } }
          ]
        },
        // Note: node2 and node3 might be included here again if fetched directly,
        // but the function should handle duplicates via the 'visited' set.
         { id: 'node2', label: 'Concept 2', type: 'concept', outgoing: [] },
         { id: 'node3', label: 'Concept 3', type: 'concept', outgoing: [] }
      ]
    };

    const expectedNodes = [
      { id: 'node1', label: 'Concept 1', type: 'concept' },
      { id: 'node2', label: 'Concept 2', type: 'concept' },
      { id: 'node3', label: 'Concept 3', type: 'concept' },
    ];
    const expectedEdges = [
      { source: 'node1', target: 'node2', type: 'RELATES_TO' },
      { source: 'node1', target: 'node3', type: 'RELATES_TO' },
    ];

    const result = transformTraversalData(rawData);

    // Use expect(...).toEqual(...) for deep equality checks on arrays/objects
    // Use expect(...).toHaveLength(...) for array length checks
    expect(result.nodes).toHaveLength(expectedNodes.length);
    expect(result.nodes).toEqual(expect.arrayContaining(expectedNodes.map(n => expect.objectContaining(n))));

    expect(result.edges).toHaveLength(expectedEdges.length);
    expect(result.edges).toEqual(expect.arrayContaining(expectedEdges.map(e => expect.objectContaining(e))));
  });

  it('should handle empty input data', () => {
    const result = transformTraversalData({ queryNode: [] });
    expect(result.nodes).toEqual([]);
    expect(result.edges).toEqual([]);
  });

   it('should handle null or undefined input data', () => {
    expect(transformTraversalData(null)).toEqual({ nodes: [], edges: [] });
    expect(transformTraversalData(undefined)).toEqual({ nodes: [], edges: [] });
    expect(transformTraversalData({})).toEqual({ nodes: [], edges: [] });
  });

  // TODO: Add more test cases for different data structures, missing fields, etc.
});

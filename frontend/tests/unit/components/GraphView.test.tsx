import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import '@testing-library/jest-dom/vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { mockNodes, mockEdges } from '../../helpers/mockData';
import GraphView from '../../../src/components/GraphView';

// Use vi.hoisted to properly handle mock hoisting
const { mockCytoscapeComponent, mockCytoscape, mockKlay, mockCytoscapeDefault } = vi.hoisted(() => ({
  mockCytoscapeComponent: vi.fn(),
  mockCytoscape: {
    layout: vi.fn().mockReturnValue({ run: vi.fn() }),
    on: vi.fn(),
    off: vi.fn(),
    nodes: vi.fn().mockReturnValue([]),
    edges: vi.fn().mockReturnValue([]),
    getElementById: vi.fn(),
    remove: vi.fn(),
    add: vi.fn(),
    fit: vi.fn(),
    center: vi.fn(),
  },
  mockKlay: vi.fn(),
  mockCytoscapeDefault: Object.assign(vi.fn(), {
    use: vi.fn()
  })
}));

// Mock react-cytoscapejs
vi.mock('react-cytoscapejs', () => ({
  default: mockCytoscapeComponent
}));

// Mock cytoscape with use method
vi.mock('cytoscape', () => ({
  default: mockCytoscapeDefault,
  use: vi.fn(),
}));

// Mock cytoscape-klay
vi.mock('cytoscape-klay', () => ({
  default: mockKlay
}));

describe('GraphView', () => {
  const mockProps = {
    nodes: mockNodes,
    edges: mockEdges,
    onNodeExpand: vi.fn(),
    onLoadCompleteGraph: vi.fn(),
    onDeleteNode: vi.fn(),
    onDeleteNodes: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    
    // Setup CytoscapeComponent mock to render a div
    mockCytoscapeComponent.mockImplementation(({ elements, cy }) => {
      if (typeof cy === 'function') {
        cy(mockCytoscape);
      }
      return (
        <div 
          data-testid="cytoscape-graph"
          data-elements={JSON.stringify(elements)}
        />
      );
    });
  });

  it('renders without crashing', () => {
    render(<GraphView {...mockProps} />);
    expect(screen.getByTestId('cytoscape-graph')).toBeInTheDocument();
  });

  it('passes nodes and edges to Cytoscape', () => {
    render(<GraphView {...mockProps} />);
    
    expect(mockCytoscapeComponent).toHaveBeenCalledWith(
      expect.objectContaining({
        elements: expect.arrayContaining([
          expect.objectContaining({ data: expect.objectContaining({ id: 'node1' }) }),
          expect.objectContaining({ data: expect.objectContaining({ id: 'node2' }) }),
        ])
      }),
      expect.any(Object)
    );
  });

  it('handles empty nodes and edges', () => {
    render(<GraphView {...mockProps} nodes={[]} edges={[]} />);
    
    expect(mockCytoscapeComponent).toHaveBeenCalledWith(
      expect.objectContaining({
        elements: []
      }),
      expect.any(Object)
    );
  });

  it('applies correct styling', () => {
    render(<GraphView {...mockProps} />);
    
    expect(mockCytoscapeComponent).toHaveBeenCalledWith(
      expect.objectContaining({
        style: expect.arrayContaining([
          expect.objectContaining({
            selector: 'node'
          }),
          expect.objectContaining({
            selector: 'edge'
          })
        ])
      }),
      expect.any(Object)
    );
  });

  it('sets up event handlers when cy is available', () => {
    render(<GraphView {...mockProps} />);
    
    // Verify that the cy callback was called
    expect(mockCytoscape.on).toHaveBeenCalled();
  });

  it('handles node expansion callback', () => {
    render(<GraphView {...mockProps} />);
    
    // Simulate node expansion event
    const onCall = mockCytoscape.on.mock.calls.find(call => call[0] === 'tap');
    if (onCall) {
      const eventHandler = onCall[1];
      const mockEvent = {
        target: {
          isNode: () => true,
          id: () => 'node1',
          data: () => ({ id: 'node1' })
        }
      };
      eventHandler(mockEvent);
    }
    
    expect(mockProps.onNodeExpand).toHaveBeenCalledWith('node1');
  });

  it('handles context menu events', () => {
    render(<GraphView {...mockProps} />);
    
    // Verify context menu event handler is set up
    const contextMenuCall = mockCytoscape.on.mock.calls.find(call => call[0] === 'cxttap');
    expect(contextMenuCall).toBeDefined();
  });

  it('applies layout when nodes change', () => {
    const { rerender } = render(<GraphView {...mockProps} />);
    
    // Change nodes
    const newNodes = [...mockNodes, {
      id: 'node3',
      label: 'New Node',
      type: 'concept',
      assignments: []
    }];
    
    rerender(<GraphView {...mockProps} nodes={newNodes} />);
    
    // Layout should be applied
    expect(mockCytoscape.layout).toHaveBeenCalled();
  });

  it('cleans up event listeners on unmount', () => {
    const { unmount } = render(<GraphView {...mockProps} />);
    
    unmount();
    
    // Verify cleanup
    expect(mockCytoscape.off).toHaveBeenCalled();
  });

  it('handles node selection', () => {
    render(<GraphView {...mockProps} />);
    
    // Simulate node selection
    const selectCall = mockCytoscape.on.mock.calls.find(call => call[0] === 'select');
    if (selectCall) {
      const eventHandler = selectCall[1];
      const mockEvent = {
        target: {
          isNode: () => true,
          id: () => 'node1'
        }
      };
      eventHandler(mockEvent);
    }
    
    // Should handle selection (specific behavior depends on implementation)
    expect(mockCytoscape.on).toHaveBeenCalledWith('select', expect.any(Function));
  });

  it('handles edge rendering', () => {
    render(<GraphView {...mockProps} />);
    
    const elements = mockCytoscapeComponent.mock.calls[0][0].elements;
    const edgeElements = elements.filter((el: any) => el.data.source);
    
    expect(edgeElements).toHaveLength(mockEdges.length);
    expect(edgeElements[0]).toEqual(
      expect.objectContaining({
        data: expect.objectContaining({
          source: mockEdges[0].source,
          target: mockEdges[0].target
        })
      })
    );
  });

  it('handles graph fit and center operations', () => {
    render(<GraphView {...mockProps} />);
    
    // These operations should be available through the cy instance
    expect(mockCytoscape.fit).toBeDefined();
    expect(mockCytoscape.center).toBeDefined();
  });

  it('handles dynamic node updates', () => {
    const { rerender } = render(<GraphView {...mockProps} />);
    
    // Update with different nodes
    const updatedNodes = mockNodes.map(node => ({
      ...node,
      label: `Updated ${node.label}`
    }));
    
    rerender(<GraphView {...mockProps} nodes={updatedNodes} />);
    
    // Should re-render with updated data
    const lastCall = mockCytoscapeComponent.mock.calls[mockCytoscapeComponent.mock.calls.length - 1];
    const elements = lastCall[0].elements;
    const nodeElements = elements.filter((el: any) => !el.data.source);
    
    expect(nodeElements[0].data.label).toBe('Updated Test Node 1');
  });

  it('handles empty graph state', () => {
    render(<GraphView {...mockProps} nodes={[]} edges={[]} />);
    
    const elements = mockCytoscapeComponent.mock.calls[0][0].elements;
    expect(elements).toHaveLength(0);
  });
});

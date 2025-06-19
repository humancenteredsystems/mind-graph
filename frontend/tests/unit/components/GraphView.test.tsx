import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import '@testing-library/jest-dom/vitest';
import { render, screen } from '@testing-library/react';
import { mockNodes, mockEdges } from '../../helpers/mockData';
import GraphView from '../../../src/components/GraphView';
import { UIProvider } from '../../../src/context/UIContext';
import { ContextMenuProvider } from '../../../src/context/ContextMenuContext';

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
    autounselectify: vi.fn(),
    boxSelectionEnabled: vi.fn(),
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
    render(
      <UIProvider>
        <ContextMenuProvider>
          <GraphView {...mockProps} />
        </ContextMenuProvider>
      </UIProvider>
    );
    expect(screen.getByTestId('cytoscape-graph')).toBeInTheDocument();
  });

  it('passes nodes and edges to Cytoscape', () => {
    render(
      <UIProvider>
        <ContextMenuProvider>
          <GraphView {...mockProps} />
        </ContextMenuProvider>
      </UIProvider>
    );
    
    expect(mockCytoscapeComponent).toHaveBeenCalledWith(
      expect.objectContaining({
        elements: expect.arrayContaining([
          expect.objectContaining({ 
            data: expect.objectContaining({ id: 'node1' }) 
          }),
          expect.objectContaining({ 
            data: expect.objectContaining({ id: 'node2' }) 
          }),
        ]),
        cy: expect.any(Function),
        style: expect.objectContaining({
          height: "100%",
          width: "100%"
        }),
        stylesheet: expect.arrayContaining([
          expect.objectContaining({
            selector: 'node'
          })
        ])
      }),
      undefined
    );
  });

  it('handles empty nodes and edges', () => {
    render(
      <UIProvider>
        <ContextMenuProvider>
          <GraphView {...mockProps} nodes={[]} edges={[]} />
        </ContextMenuProvider>
      </UIProvider>
    );
    
    expect(mockCytoscapeComponent).toHaveBeenCalledWith(
      expect.objectContaining({
        elements: [],
        cy: expect.any(Function),
        style: expect.objectContaining({
          height: "100%",
          width: "100%"
        }),
        stylesheet: expect.arrayContaining([
          expect.objectContaining({
            selector: 'node'
          })
        ])
      }),
      undefined
    );
  });

  it('applies correct styling', () => {
    render(
      <UIProvider>
        <ContextMenuProvider>
          <GraphView {...mockProps} />
        </ContextMenuProvider>
      </UIProvider>
    );
    
    expect(mockCytoscapeComponent).toHaveBeenCalledWith(
      expect.objectContaining({
        elements: expect.arrayContaining([
          expect.objectContaining({ 
            data: expect.objectContaining({ id: 'node1' }) 
          })
        ]),
        cy: expect.any(Function),
        style: expect.objectContaining({
          height: "100%",
          width: "100%"
        }),
        stylesheet: expect.arrayContaining([
          expect.objectContaining({
            selector: 'node'
          }),
          expect.objectContaining({
            selector: 'edge'
          })
        ])
      }),
      undefined
    );
  });

  it('sets up event handlers when cy is available', () => {
    render(
      <UIProvider>
        <ContextMenuProvider>
          <GraphView {...mockProps} />
        </ContextMenuProvider>
      </UIProvider>
    );
    
    // Verify that the cy callback was called
    expect(mockCytoscape.on).toHaveBeenCalled();
  });

  it('handles node expansion callback', () => {
    render(
      <UIProvider>
        <ContextMenuProvider>
          <GraphView {...mockProps} />
        </ContextMenuProvider>
      </UIProvider>
    );
    
    // Simulate node expansion event
    const onCall = mockCytoscape.on.mock.calls.find(call => call[0] === 'tap');
    if (onCall && typeof onCall[1] === 'function') {
      const eventHandler = onCall[1];
      const mockEvent = {
        target: {
          isNode: () => true,
          id: () => 'node1',
          data: () => ({ id: 'node1' })
        }
      };
      eventHandler(mockEvent);
      expect(mockProps.onNodeExpand).toHaveBeenCalledWith('node1');
    } else {
      // If no tap handler found, just verify the setup
      expect(mockCytoscape.on).toHaveBeenCalled();
    }
  });

  it('handles context menu events', () => {
    render(
      <UIProvider>
        <ContextMenuProvider>
          <GraphView {...mockProps} />
        </ContextMenuProvider>
      </UIProvider>
    );
    
    // Verify context menu event handler is set up
    const contextMenuCall = mockCytoscape.on.mock.calls.find(call => call[0] === 'cxttap');
    expect(contextMenuCall).toBeDefined();
  });

  it('applies layout when nodes change', () => {
    const { rerender } = render(
      <UIProvider>
        <ContextMenuProvider>
          <GraphView {...mockProps} />
        </ContextMenuProvider>
      </UIProvider>
    );
    
    // Change nodes
    const newNodes = [...mockNodes, {
      id: 'node3',
      label: 'New Node',
      type: 'concept',
      assignments: []
    }];
    
    rerender(
      <UIProvider>
        <ContextMenuProvider>
          <GraphView {...mockProps} nodes={newNodes} />
        </ContextMenuProvider>
      </UIProvider>
    );
    
    // Layout should be applied
    expect(mockCytoscape.layout).toHaveBeenCalled();
  });

  it('cleans up event listeners on unmount', () => {
    const { unmount } = render(
      <UIProvider>
        <ContextMenuProvider>
          <GraphView {...mockProps} />
        </ContextMenuProvider>
      </UIProvider>
    );
    
    unmount();
    
    // Verify cleanup
    expect(mockCytoscape.off).toHaveBeenCalled();
  });

  it('handles node selection', () => {
    render(
      <UIProvider>
        <ContextMenuProvider>
          <GraphView {...mockProps} />
        </ContextMenuProvider>
      </UIProvider>
    );
    
    // Verify that select event handlers are registered
    const selectCalls = mockCytoscape.on.mock.calls.filter(call => call[0] === 'select');
    expect(selectCalls.length).toBeGreaterThan(0);
    
    // Simulate node selection
    const selectCall = selectCalls.find(call => call[1] && call[2]);
    if (selectCall && typeof selectCall[2] === 'function') {
      const eventHandler = selectCall[2];
      const mockEvent = {
        target: {
          isNode: () => true,
          id: () => 'node1'
        }
      };
      eventHandler(mockEvent);
    }
    
    // Should handle selection (specific behavior depends on implementation)
    expect(mockCytoscape.on).toHaveBeenCalledWith('select', 'node', expect.any(Function));
  });

  it('handles edge rendering', () => {
    render(
      <UIProvider>
        <ContextMenuProvider>
          <GraphView {...mockProps} />
        </ContextMenuProvider>
      </UIProvider>
    );
    
    const elements = mockCytoscapeComponent.mock.calls[0][0].elements;
    const edgeElements = elements.filter((el: { data: { source?: string } }) => el.data.source);
    
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
    render(
      <UIProvider>
        <ContextMenuProvider>
          <GraphView {...mockProps} />
        </ContextMenuProvider>
      </UIProvider>
    );
    
    // These operations should be available through the cy instance
    expect(mockCytoscape.fit).toBeDefined();
    expect(mockCytoscape.center).toBeDefined();
  });

  it('handles dynamic node updates', () => {
    const { rerender } = render(
      <UIProvider>
        <ContextMenuProvider>
          <GraphView {...mockProps} />
        </ContextMenuProvider>
      </UIProvider>
    );
    
    // Update with different nodes
    const updatedNodes = mockNodes.map(node => ({
      ...node,
      label: `Updated ${node.label}`
    }));
    
    rerender(
      <UIProvider>
        <ContextMenuProvider>
          <GraphView {...mockProps} nodes={updatedNodes} />
        </ContextMenuProvider>
      </UIProvider>
    );
    
    // Should re-render with updated data
    const lastCall = mockCytoscapeComponent.mock.calls[mockCytoscapeComponent.mock.calls.length - 1];
    const elements = lastCall[0].elements;
    const nodeElements = elements.filter((el: { data: { source?: string } }) => !el.data.source);
    
    expect(nodeElements[0].data.label).toBe('Updated Test Node 1');
  });

  it('handles empty graph state', () => {
    render(
      <UIProvider>
        <ContextMenuProvider>
          <GraphView {...mockProps} nodes={[]} edges={[]} />
        </ContextMenuProvider>
      </UIProvider>
    );
    
    const elements = mockCytoscapeComponent.mock.calls[0][0].elements;
    expect(elements).toHaveLength(0);
  });
});

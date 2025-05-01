import React from 'react';
import { describe, it, expect, vi, beforeEach, afterAll } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import GraphView from './GraphView';

// Mock the context menu hook
vi.mock('../context/ContextMenuContext', () => ({
  useContextMenu: () => ({
    open: false,
    position: { x: 0, y: 0 },
    items: [],
    openMenu: vi.fn(),
    closeMenu: vi.fn(),
  }),
}));

const mockNodes = [{ id: 'n1', label: 'Node 1' }];
const mockEdges = [{ source: 'n1', target: 'n1', type: 'SELF' }];

// Enhanced mock for react-cytoscapejs to simulate events and capture handlers
vi.mock('react-cytoscapejs', () => {
  // Store registered event handlers
  const eventHandlers: Record<string, ((event: any) => void)[]> = {};

  const fakeCy = {
    layout: vi.fn().mockReturnValue({ run: vi.fn() }),
    autounselectify: vi.fn(), // Mock autounselectify method
    on: vi.fn((event: string, selector: string, handler: (event: any) => void) => {
      // Store handler based on event type and selector
      const key = `${event}-${selector}`;
      if (!eventHandlers[key]) {
        eventHandlers[key] = [];
      }
      eventHandlers[key].push(handler);
    }),
    off: vi.fn(), // Mock off method
    removeListener: vi.fn((event: string, selector: string, handler: (event: any) => void) => {
      const key = `${event}-${selector}`;
      if (eventHandlers[key]) {
        eventHandlers[key] = eventHandlers[key].filter(h => h !== handler);
      }
    }),
    // Simulate selecting/unselecting nodes
    nodes: vi.fn((selector?: string) => {
      if (selector === ':selected') {
        // In this mock, we'll just return a mock element for 'n1' if it's considered selected
        // A more sophisticated mock might track selection state
        return mockNodes.filter(node => (window as any).selectedNodeId === node.id).map(node => ({ id: () => node.id }));
      }
      return []; // Default to no nodes or handle other selectors if needed
    }),
    // Method to trigger simulated events
    trigger: (event: string, targetId: string, originalEvent?: any) => {
      const key = `${event}-node`; // Assuming we only care about node events for now
      if (eventHandlers[key]) {
        const mockTarget = {
          isNode: true,
          id: () => targetId,
          data: () => mockNodes.find(n => n.id === targetId), // Provide mock node data
          select: () => { (window as any).selectedNodeId = targetId; }, // Simulate selection
          unselect: () => { (window as any).selectedNodeId = undefined; }, // Simulate unselection
        };

        // Simulate node selection on tap event
        if (event === 'tap') {
          mockTarget.select();
        } else if (event === 'unselect') { // Although we don't have an unselect handler, good to have the mock
           mockTarget.unselect();
        }


        const mockEvent = {
          target: mockTarget,
          originalEvent: originalEvent || {},
          preventDefault: vi.fn(), // Mock preventDefault
        };
        eventHandlers[key].forEach(handler => handler(mockEvent));
      }
    },
    // Method to clear all registered handlers (useful for cleanup)
    clearEventHandlers: () => {
      for (const key in eventHandlers) {
        delete eventHandlers[key];
      }
    },
  };

  return {
    default: ({ elements, cy }: { elements: any[]; cy: any }) => {
      // Pass the fakeCy instance to the component
      if (typeof cy === 'function') cy(fakeCy);
      // Expose trigger method for tests
      (window as any).cyTrigger = fakeCy.trigger;
      (window as any).cyClearEventHandlers = fakeCy.clearEventHandlers;
      (window as any).cyInstance = fakeCy; // Expose fakeCy for direct interaction if needed
      return <div data-testid="cytoscape-component" data-elements={JSON.stringify(elements)} />;
    }
  };
});

describe('GraphView Component', () => {
  // Mock console.warn to check if warnings are logged
  const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
  const onEditNodeMock = vi.fn();

  beforeEach(() => {
    // Clear mock calls and simulated selection state before each test
    consoleWarnSpy.mockClear();
    onEditNodeMock.mockClear();
    if ((window as any).cyClearEventHandlers) {
      (window as any).cyClearEventHandlers();
    }
    (window as any).selectedNodeId = undefined; // Reset simulated selection
  });

  afterAll(() => {
    // Restore console.warn after all tests
    consoleWarnSpy.mockRestore();
  });

  it('renders graph container and CytoscapeComponent', () => {
    render(<GraphView nodes={[]} edges={[]} />);
    expect(screen.getByTestId('graph-container')).toBeInTheDocument();
    expect(screen.getByTestId('cytoscape-component')).toBeInTheDocument();
  });

  it('passes correct elements to CytoscapeComponent', () => {
    render(<GraphView nodes={mockNodes} edges={mockEdges} />);
    const comp = screen.getByTestId('cytoscape-component');
    const elementsAttr = comp.getAttribute('data-elements');
    const elements = JSON.parse(elementsAttr || '[]');
    expect(elements).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ data: expect.objectContaining({ id: 'n1' }) }),
        expect.objectContaining({ data: expect.objectContaining({ source: 'n1', target: 'n1' }) })
      ])
    );
    expect(consoleWarnSpy).not.toHaveBeenCalled(); // No warnings for valid edges
  });

  it('filters out dangling edges before passing to CytoscapeComponent', () => {
    const nodes = [
      { id: 'n1', label: 'Node 1' },
      { id: 'n2', label: 'Node 2' },
    ];
    const edges = [
      { source: 'n1', target: 'n2', type: 'valid' }, // Valid edge
      { source: 'n1', target: 'n3', type: 'dangling-target' }, // Dangling target
      { source: 'n4', target: 'n2', type: 'dangling-source' }, // Dangling source
      { source: 'n5', target: 'n6', type: 'both-dangling' }, // Both dangling
    ];

    render(<GraphView nodes={nodes} edges={edges} />);
    const comp = screen.getByTestId('cytoscape-component');
    const elementsAttr = comp.getAttribute('data-elements');
    const elements = JSON.parse(elementsAttr || '[]');

    // Expect only the valid edge and the two nodes
    expect(elements.length).toBe(3);
    expect(elements).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ data: expect.objectContaining({ id: 'n1' }) }),
        expect.objectContaining({ data: expect.objectContaining({ id: 'n2' }) }),
        expect.objectContaining({ data: expect.objectContaining({ source: 'n1', target: 'n2' }) }),
      ])
    );

    // Ensure the dangling edges are NOT present
    expect(elements).not.toEqual(
      expect.arrayContaining([
        expect.objectContaining({ data: expect.objectContaining({ source: 'n1', target: 'n3' }) }),
        expect.objectContaining({ data: expect.objectContaining({ source: 'n4', target: 'n2' }) }),
        expect.objectContaining({ data: expect.objectContaining({ source: 'n5', target: 'n6' }) }),
      ])
    );

    // With the updated implementation, we no longer log warnings about invalid edges
    // since we filter them out cleanly
    expect(consoleWarnSpy).not.toHaveBeenCalled();
  });

  it('does not filter valid edges', () => {
    const nodes = [
      { id: 'n1', label: 'Node 1' },
      { id: 'n2', label: 'Node 2' },
      { id: 'n3', label: 'Node 3' },
    ];
    const edges = [
      { source: 'n1', target: 'n2', type: 'valid1' },
      { source: 'n2', target: 'n3', type: 'valid2' },
    ];

    render(<GraphView nodes={nodes} edges={edges} />);
    const comp = screen.getByTestId('cytoscape-component');
    const elementsAttr = comp.getAttribute('data-elements');
    const elements = JSON.parse(elementsAttr || '[]');

    // Expect all nodes and edges to be present
    expect(elements.length).toBe(5);
    expect(elements).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ data: expect.objectContaining({ id: 'n1' }) }),
        expect.objectContaining({ data: expect.objectContaining({ id: 'n2' }) }),
        expect.objectContaining({ data: expect.objectContaining({ id: 'n3' }) }),
        expect.objectContaining({ data: expect.objectContaining({ source: 'n1', target: 'n2' }) }),
        expect.objectContaining({ data: expect.objectContaining({ source: 'n2', target: 'n3' }) }),
      ])
    );
    expect(consoleWarnSpy).not.toHaveBeenCalled(); // No warnings for valid edges
  });

  // New tests for event interactions

  it('does not call onEditNode on single tap', () => {
    render(<GraphView nodes={mockNodes} edges={[]} onEditNode={onEditNodeMock} />);
    
    // Effects run synchronously in tests
    
    // Trigger a single tap
    const cyTrigger = (window as any).cyTrigger;
    cyTrigger('tap', 'n1');
    
    // Should never call the handler
    expect(onEditNodeMock).not.toHaveBeenCalled();
  });

  it('calls onEditNode on double tap', () => {
    render(<GraphView nodes={mockNodes} edges={[]} onEditNode={onEditNodeMock} />);
    
    // Effects run synchronously in tests
    
    // Trigger a double tap
    const cyTrigger = (window as any).cyTrigger;
    cyTrigger('doubleTap', 'n1');
    
    // Should call the handler with the node ID
    expect(onEditNodeMock).toHaveBeenCalledWith('n1');
  });

  it('still does not call onEditNode after multiple single taps', () => {
    render(<GraphView nodes={mockNodes} edges={[]} onEditNode={onEditNodeMock} />);
    const cyTrigger = (window as any).cyTrigger;
    
    // Tap once - should do nothing
    cyTrigger('tap', 'n1');
    expect(onEditNodeMock).not.toHaveBeenCalled();
    
    // Tap again, but NOT fast enough to be a double-click - should still do nothing
    cyTrigger('tap', 'n1');
    expect(onEditNodeMock).not.toHaveBeenCalled();
    
    // Tap a third time - should still do nothing
    cyTrigger('tap', 'n1');
    expect(onEditNodeMock).not.toHaveBeenCalled();
  });

  // Note: Simulating a "rapid sequence of two single clicks" that Cytoscape
  // interprets as a dblclick in a mock can be complex and might require
  // more sophisticated event timing simulation than this basic mock provides.
  // The test 'calls onEditNode on double click' covers the intended dblclick behavior.
  // The test 'does not call onEditNode on single tap after selection' covers the
  // specific scenario the user reported as problematic.
});

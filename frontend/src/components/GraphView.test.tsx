import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import GraphView from './GraphView';
vi.mock('../context/ContextMenuContext', () => ({
  useContextMenu: () => ({
    open: false,
    position: { x: 0, y: 0 },
    items: [],
    openMenu: () => {},
    closeMenu: () => {},
  }),
}));

const mockNodes = [{ id: 'n1', label: 'Node 1' }];
const mockEdges = [{ source: 'n1', target: 'n1', type: 'SELF' }];

// Mock react-cytoscapejs to capture elements prop
    vi.mock('react-cytoscapejs', () => {
      return {
        default: ({ elements, cy }: { elements: any[]; cy: any }) => {
      // Simulate cytoscape instance and layout call
      const fakeCy = {
        layout: vi.fn().mockReturnValue({ run: vi.fn() }),
        on: vi.fn()
      };
      if (typeof cy === 'function') cy(fakeCy);
      return <div data-testid="cytoscape-component" data-elements={JSON.stringify(elements)} />;
    }
  };
});

describe('GraphView Component', () => {
  // Mock console.warn to check if warnings are logged
  const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

  beforeEach(() => {
    // Clear mock calls before each test
    consoleWarnSpy.mockClear();
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

    // Check if a warning was logged for skipped edges
    expect(consoleWarnSpy).toHaveBeenCalledTimes(1);
    expect(consoleWarnSpy).toHaveBeenCalledWith(expect.stringContaining('[GRAPH RENDER] Skipped 3 invalid edges.'));
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
});

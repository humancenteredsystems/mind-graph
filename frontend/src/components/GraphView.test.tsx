import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import GraphView from './GraphView';

const mockNodes = [{ id: 'n1', label: 'Node 1' }];
const mockEdges = [{ source: 'n1', target: 'n1', type: 'SELF' }];

// Mock react-cytoscapejs to capture elements prop
    vi.mock('react-cytoscapejs', () => {
      return {
        default: ({ elements, cy }: { elements: any[]; cy: any }) => {
      // Simulate cytoscape instance and layout call
      const fakeCy = {
        layout: vi.fn().mockReturnValue({ run: vi.fn() })
      };
      if (typeof cy === 'function') cy(fakeCy);
      return <div data-testid="cytoscape-component" data-elements={JSON.stringify(elements)} />;
    }
  };
});

describe('GraphView Component', () => {
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
  });
});

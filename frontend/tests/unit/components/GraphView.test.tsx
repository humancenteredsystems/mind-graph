import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import '@testing-library/jest-dom/vitest';
import { screen } from '@testing-library/react';
import { render } from '../../helpers/testUtils';
import { mockNodes, mockEdges, createMockNode } from '../../helpers/mockData';
import { 
  createMinimalCytoscapeMock, 
  createEventCapableCytoscapeMock,
  createMockNodeTarget 
} from '../../helpers/cytoscapeTestUtils';
import GraphView from '../../../src/components/GraphView';

// Mock the context menu hook
vi.mock('../../../src/context/ContextMenuContext', () => ({
  useContextMenu: () => ({
    open: false,
    position: { x: 0, y: 0 },
    items: [],
    openMenu: vi.fn(),
    closeMenu: vi.fn(),
  }),
}));

describe('GraphView Component', () => {
  const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
  const onEditNodeMock = vi.fn();

  beforeEach(() => {
    consoleWarnSpy.mockClear();
    onEditNodeMock.mockClear();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Rendering', () => {
    beforeEach(() => {
      vi.mock('react-cytoscapejs', createMinimalCytoscapeMock);
    });

    it('renders graph container and CytoscapeComponent', () => {
      render(<GraphView nodes={[]} edges={[]} />);
      expect(screen.getByTestId('graph-container')).toBeInTheDocument();
      expect(screen.getByTestId('cytoscape-component')).toBeInTheDocument();
    });

    it('renders with correct node and edge counts', () => {
      render(<GraphView nodes={mockNodes} edges={mockEdges} />);
      const component = screen.getByTestId('cytoscape-component');
      expect(component).toHaveAttribute('data-node-count', '3');
      expect(component).toHaveAttribute('data-edge-count', '2');
    });

    it('passes correct elements to CytoscapeComponent', () => {
      const testNodes = [createMockNode({ id: 'n1', label: 'Node 1' })];
      const testEdges = [{ source: 'n1', target: 'n1', type: 'SELF' }];
      
      render(<GraphView nodes={testNodes} edges={testEdges} />);
      const comp = screen.getByTestId('cytoscape-component');
      const elementsAttr = comp.getAttribute('data-elements');
      const elements = JSON.parse(elementsAttr || '[]');
      
      expect(elements).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ data: expect.objectContaining({ id: 'n1' }) }),
          expect.objectContaining({ data: expect.objectContaining({ source: 'n1', target: 'n1' }) })
        ])
      );
      expect(consoleWarnSpy).not.toHaveBeenCalled();
    });

    it('filters dangling edges', () => {
      const nodes = [
        createMockNode({ id: 'n1', label: 'Node 1' }),
        createMockNode({ id: 'n2', label: 'Node 2' })
      ];
      const edges = [
        { source: 'n1', target: 'n2', type: 'valid' }, // Valid edge
        { source: 'n1', target: 'n3', type: 'dangling-target' }, // Dangling target
        { source: 'n4', target: 'n2', type: 'dangling-source' }, // Dangling source
        { source: 'n5', target: 'n6', type: 'both-dangling' }, // Both dangling
      ];

      render(<GraphView nodes={nodes} edges={edges} />);
      const component = screen.getByTestId('cytoscape-component');
      expect(component).toHaveAttribute('data-node-count', '2');
      expect(component).toHaveAttribute('data-edge-count', '1');
      expect(consoleWarnSpy).not.toHaveBeenCalled();
    });

    it('does not filter valid edges', () => {
      const nodes = [
        createMockNode({ id: 'n1', label: 'Node 1' }),
        createMockNode({ id: 'n2', label: 'Node 2' }),
        createMockNode({ id: 'n3', label: 'Node 3' })
      ];
      const edges = [
        { source: 'n1', target: 'n2', type: 'valid1' },
        { source: 'n2', target: 'n3', type: 'valid2' },
      ];

      render(<GraphView nodes={nodes} edges={edges} />);
      const component = screen.getByTestId('cytoscape-component');
      expect(component).toHaveAttribute('data-node-count', '3');
      expect(component).toHaveAttribute('data-edge-count', '2');
      expect(consoleWarnSpy).not.toHaveBeenCalled();
    });
  });

  describe('Interactions', () => {
    let mockCytoscape: any;

    beforeEach(() => {
      const cytoscapeMock = createEventCapableCytoscapeMock();
      mockCytoscape = cytoscapeMock.mockCy;
      vi.mock('react-cytoscapejs', () => cytoscapeMock);
    });

    it('does not call onEditNode on single tap', () => {
      render(<GraphView nodes={mockNodes} edges={[]} onEditNode={onEditNodeMock} />);
      
      const mockTarget = createMockNodeTarget(mockNodes[0]);
      mockCytoscape.__triggerEvent('tap', 'node', mockTarget);
      
      expect(onEditNodeMock).not.toHaveBeenCalled();
    });

    it('calls onEditNode on double tap', () => {
      render(<GraphView nodes={mockNodes} edges={[]} onEditNode={onEditNodeMock} />);
      
      const mockTarget = createMockNodeTarget(mockNodes[0]);
      mockCytoscape.__triggerEvent('doubleTap', 'node', mockTarget);
      
      expect(onEditNodeMock).toHaveBeenCalledWith(expect.objectContaining({ id: 'node1' }));
    });

    it('handles multiple single taps without triggering edit', () => {
      render(<GraphView nodes={mockNodes} edges={[]} onEditNode={onEditNodeMock} />);
      
      const mockTarget = createMockNodeTarget(mockNodes[0]);
      
      // Multiple single taps should not trigger edit
      mockCytoscape.__triggerEvent('tap', 'node', mockTarget);
      mockCytoscape.__triggerEvent('tap', 'node', mockTarget);
      mockCytoscape.__triggerEvent('tap', 'node', mockTarget);
      
      expect(onEditNodeMock).not.toHaveBeenCalled();
    });
  });
});

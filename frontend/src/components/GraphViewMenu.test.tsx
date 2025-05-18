import React from 'react';
import { render } from '@testing-library/react';
import GraphView from './GraphView';
import type { NodeData, EdgeData } from '../types/graph';
import { useHierarchyContext } from '../context/HierarchyContext';
import { useContextMenu } from '../context/ContextMenuContext';
import type { Mock } from 'vitest';
import { vi } from 'vitest';

// Mock HierarchyContext and ContextMenuContext
vi.mock('../context/HierarchyContext');
vi.mock('../context/ContextMenuContext');
vi.mock('react-cytoscapejs', () => {
  const handlers: Record<string, ((e: any) => void)[]> = {};
  const fakeCy = {
    on: (ev: string, sel: string, h: (e: any) => void) => {
      handlers[`${ev}-${sel}`] = [h];
    },
    off: () => {},
  };
  return {
    default: ({ cy }: any) => {
      cy(fakeCy);
      // Expose trigger for tests
      (window as any).cyTrigger = (ev: string, id: string) => {
        const hlist = handlers[`${ev}-node`] || [];
        const mockEvent = {
          originalEvent: { button: 2 },
          target: {
            isEdge: () => false,
            isNode: () => true,
            id: () => id,
            data: () => ({ id, assignments: [{ hierarchyId: 'h1', hierarchyName: 'H1', levelId: 'lvl1', levelNumber: 1 }] }),
          },
          preventDefault: vi.fn(),
        };
        hlist.forEach(fn => fn(mockEvent));
      };
      return <div data-testid="cy" />;
    },
  };
});

describe('GraphView context-menu "Add Node" gating', () => {
  const useHierarchyMock = useHierarchyContext as unknown as Mock;
  const useContextMenuMock = useContextMenu as unknown as Mock;
  const openMenuMock = vi.fn();

  const baseHierarchy = {
    hierarchyId: 'h1',
    levels: [
      { id: 'lvl1', levelNumber: 1, label: 'L1' },
      { id: 'lvl2', levelNumber: 2, label: 'L2' },
    ],
    allowedTypesMap: {},
  };

  beforeEach(() => {
    openMenuMock.mockClear();
    useHierarchyMock.mockReturnValue({ ...baseHierarchy });
    useContextMenuMock.mockReturnValue({ openMenu: openMenuMock, closeMenu: vi.fn() });
  });

  const node: NodeData = {
    id: 'n1',
    label: 'N1',
    type: 'T1',
    assignments: [{ hierarchyId: 'h1', hierarchyName: 'H1', levelId: 'lvl1', levelNumber: 1 }],
  };
  const edge: EdgeData = { source: 'n1', target: 'n1', type: 'SELF' };

  it('includes onAddNode when next level has allowedTypes', () => {
    useHierarchyMock.mockReturnValueOnce({
      ...baseHierarchy,
      allowedTypesMap: { 'h1l2': ['T1'] },
    });
    render(<GraphView nodes={[node]} edges={[edge]} onAddNode={() => {}} />);
    (window as any).cyTrigger('cxttap', 'n1');
    expect(openMenuMock).toHaveBeenCalledTimes(1);
    const opts = openMenuMock.mock.calls[0][2];
    expect(opts).toHaveProperty('onAddNode');
  });

  it('omits onAddNode when next level has no allowedTypes', () => {
    useHierarchyMock.mockReturnValueOnce({
      ...baseHierarchy,
      allowedTypesMap: { 'h1l2': [] },
    });
    render(<GraphView nodes={[node]} edges={[edge]} onAddNode={() => {}} />);
    (window as any).cyTrigger('cxttap', 'n1');
    expect(openMenuMock).toHaveBeenCalledTimes(1);
    const opts = openMenuMock.mock.calls[0][2];
    expect(opts).not.toHaveProperty('onAddNode');
  });
});

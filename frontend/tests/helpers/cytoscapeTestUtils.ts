import React from 'react';
import { vi } from 'vitest';

/**
 * Minimal mock for basic rendering tests
 * Use this for tests that only need to verify element counts and basic rendering
 */
export const createMinimalCytoscapeMock = () => ({
  default: ({ elements, cy }: { elements: Array<{ data: { source?: string } }>; cy?: (instance: unknown) => void }) => {
    // Simple mock that just renders a div with test data
    if (typeof cy === 'function') {
      cy({
        layout: vi.fn().mockReturnValue({ run: vi.fn() }),
        on: vi.fn(),
        off: vi.fn(),
        nodes: vi.fn().mockReturnValue([]),
        autounselectify: vi.fn(),
        boxSelectionEnabled: vi.fn(),
      });
    }
    return React.createElement('div', {
      'data-testid': 'cytoscape-component',
      'data-elements': JSON.stringify(elements),
      'data-node-count': elements.filter(el => !el.data.source).length,
      'data-edge-count': elements.filter(el => el.data.source).length
    });
  }
});

/**
 * Event-capable mock for interaction tests
 * Use this for tests that need to simulate user interactions like clicks, double-clicks, etc.
 */
export const createEventCapableCytoscapeMock = () => {
  const eventHandlers: Record<string, Array<(event: unknown) => void>> = {};
  
  const mockCy = {
    layout: vi.fn().mockReturnValue({ run: vi.fn() }),
    on: vi.fn((event: string, selector: string, handler: (event: unknown) => void) => {
      const key = `${event}-${selector}`;
      if (!eventHandlers[key]) eventHandlers[key] = [];
      eventHandlers[key].push(handler);
    }),
    off: vi.fn(),
    removeListener: vi.fn(),
    autounselectify: vi.fn(),
    boxSelectionEnabled: vi.fn(),
    nodes: vi.fn((selector?: string) => {
      if (selector === ':selected') {
        // Return mock selected nodes based on test state
        return [];
      }
      return [];
    }),
    // Test helper to trigger events - exposed via returned object, not global window
    __triggerEvent: (event: string, selector: string, mockTarget: unknown) => {
      const key = `${event}-${selector}`;
      eventHandlers[key]?.forEach(handler => 
        handler({ 
          target: mockTarget, 
          preventDefault: vi.fn(),
          originalEvent: {}
        })
      );
    },
    // Method to clear all registered handlers (useful for cleanup)
    __clearEventHandlers: () => {
      for (const key in eventHandlers) {
        delete eventHandlers[key];
      }
    }
  };

  return {
    default: ({ elements, cy }: { elements: unknown[]; cy?: (instance: unknown) => void }) => {
      if (typeof cy === 'function') cy(mockCy);
      return React.createElement('div', {
        'data-testid': 'cytoscape-component',
        'data-elements': JSON.stringify(elements)
      });
    },
    // Expose test utilities without polluting global namespace
    mockCy
  };
};

/**
 * Helper to create mock node targets for event simulation
 */
export const createMockNodeTarget = (nodeData: { id: string; [key: string]: unknown }) => ({
  isNode: () => true,
  isEdge: () => false,
  id: () => nodeData.id,
  data: () => nodeData,
  select: vi.fn(),
  unselect: vi.fn(),
});

/**
 * Helper to create mock edge targets for event simulation
 */
export const createMockEdgeTarget = (edgeData: { source: string; target: string; [key: string]: unknown }) => ({
  isNode: () => false,
  isEdge: () => true,
  id: () => `${edgeData.source}-${edgeData.target}`,
  data: () => edgeData,
  select: vi.fn(),
  unselect: vi.fn(),
});

/**
 * Full mock for complex scenarios (use sparingly)
 * Only implement specific methods needed rather than full API coverage
 */
export const createFullCytoscapeMock = (customMethods: Record<string, unknown> = {}) => {
  const eventHandlers: Record<string, Array<(event: unknown) => void>> = {};
  
  const mockCy = {
    layout: vi.fn().mockReturnValue({ run: vi.fn() }),
    on: vi.fn((event: string, selector: string, handler: (event: unknown) => void) => {
      const key = `${event}-${selector}`;
      if (!eventHandlers[key]) eventHandlers[key] = [];
      eventHandlers[key].push(handler);
    }),
    off: vi.fn(),
    removeListener: vi.fn(),
    autounselectify: vi.fn(),
    boxSelectionEnabled: vi.fn(),
    nodes: vi.fn().mockReturnValue([]),
    edges: vi.fn().mockReturnValue([]),
    elements: vi.fn().mockReturnValue([]),
    // Add custom methods as needed
    ...customMethods,
    // Test utilities
    __triggerEvent: (event: string, selector: string, mockTarget: unknown) => {
      const key = `${event}-${selector}`;
      eventHandlers[key]?.forEach(handler => 
        handler({ 
          target: mockTarget, 
          preventDefault: vi.fn(),
          originalEvent: {}
        })
      );
    },
    __clearEventHandlers: () => {
      for (const key in eventHandlers) {
        delete eventHandlers[key];
      }
    }
  };

  return {
    default: ({ elements, cy }: { elements: unknown[]; cy?: (instance: unknown) => void }) => {
      if (typeof cy === 'function') cy(mockCy);
      return React.createElement('div', {
        'data-testid': 'cytoscape-component',
        'data-elements': JSON.stringify(elements)
      });
    },
    mockCy
  };
};

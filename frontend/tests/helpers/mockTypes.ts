/**
 * Shared type definitions for test mocks
 * Provides consistent typing across all test files
 */

// Cytoscape element type for test mocks
export interface CytoscapeElementType {
  data: {
    id: string;
    label?: string;
    source?: string;
    target?: string;
    [key: string]: unknown;
  };
  group?: 'nodes' | 'edges';
  [key: string]: unknown;
}

// Cytoscape mock instance interface
export interface CytoscapeMockInstance {
  layout: () => { run: () => void };
  on: (event: string, selector?: string, handler?: (event: unknown) => void) => void;
  off: (event?: string) => void;
  nodes: () => { length: number; first?: () => unknown };
  edges: () => { length: number };
  elements: () => { length: number };
  autounselectify: (enabled: boolean) => void;
  boxSelectionEnabled: (enabled: boolean) => void;
  getElementById?: (id: string) => { length: number };
  container?: () => Element | null;
  zoom?: () => number;
  pan?: () => { x: number; y: number };
}

// Props interface for Cytoscape component mocks
export interface CytoscapeComponentProps {
  elements: CytoscapeElementType[];
  cy?: (instance: CytoscapeMockInstance) => void;
  style?: Record<string, unknown>;
  stylesheet?: unknown[];
  layout?: Record<string, unknown>;
  [key: string]: unknown;
}

// Mock data interfaces
export interface MockNode {
  id: string;
  label: string;
  type: string;
  assignments: Array<{
    hierarchyId: string;
    hierarchyName: string;
    levelId: string;
    levelNumber: number;
  }>;
}

export interface MockEdge {
  source: string;
  target: string;
  type: string;
}

// API response mock types
export interface MockApiResponse<T = unknown> {
  data?: T;
  error?: string;
  status?: number;
}

export interface MockHierarchy {
  id: string;
  name: string;
  levels?: Array<{
    id: string;
    levelNumber: number;
    label: string;
    allowedTypes: string[];
  }>;
}

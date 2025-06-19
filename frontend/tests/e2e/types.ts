/**
 * Shared type definitions for E2E tests
 * Provides proper typing for Playwright and Cytoscape interactions
 */

import { Page } from '@playwright/test';

// Cytoscape node interface
export interface CytoscapeNode {
  id(): string;
  renderedPosition(): { x: number; y: number };
}

// Cytoscape node collection interface
export interface CytoscapeNodeCollection {
  length: number;
  first(): CytoscapeNode;
  map<T>(fn: (node: CytoscapeNode) => T): T[];
}

// Cytoscape instance interface
export interface CytoscapeInstance {
  nodes(): { 
    length: number; 
    first(): CytoscapeNode;
    slice(start: number, end: number): CytoscapeNodeCollection;
  };
  edges(): { length: number };
  elements(): { length: number };
  zoom(): number;
  pan(): { x: number; y: number };
  container(): Element | null;
  getElementById(id: string): { length: number };
}

// Window interface with cytoscape instance
export interface TestWindow {
  cyInstance?: CytoscapeInstance;
}

// Node position for interactions
export interface NodePosition {
  x: number;
  y: number;
  id: string;
}

// Graph counts helper return type
export interface GraphCounts {
  nodes: number;
  edges: number;
}

// Playwright page with typed evaluate methods
export interface TypedPage extends Page {
  evaluate<T>(pageFunction: () => T): Promise<T>;
  evaluate<T, A>(pageFunction: (arg: A) => T, arg: A): Promise<T>;
}

// GraphQL response types for tests
export interface GraphQLResponse {
  queryNode?: Array<{
    id: string;
    label: string;
    type: string;
  }>;
  queryEdge?: Array<{
    source: string;
    target: string;
  }>;
  [key: string]: unknown; // Allow additional properties
}

/**
 * Shared TypeScript types for MakeItMakeSense.io Graph Views/Lens System
 * 
 * This package provides type definitions used by both frontend and backend
 * for the Graph Views/Lens system implementation.
 */

import { ElementDefinition, Css } from 'cytoscape';

// Re-export common types that might be needed
export type { ElementDefinition, Css } from 'cytoscape';

/**
 * Basic graph data structures
 */
export interface Node {
  id: string;
  label?: string;
  type?: string;
  [key: string]: any;
}

export interface Edge {
  id?: string;
  source: string;
  target: string;
  type?: string;
  [key: string]: any;
}

export interface Graph {
  nodes: Node[];
  edges: Edge[];
}

/**
 * Lens metadata and identification
 */
export interface LensMeta {
  id: string;          // "hierarchy-h1", "default", "type-cluster"
  label: string;       // "Primary Knowledge Graph", "Default", "Type Clusters"
  icon?: string;       // "🌳", "⚪", "📦"
}

/**
 * Function types for lens operations
 */
export type FilterFn = (node: Node | null, edge?: Edge) => boolean;
export type MapFn = (el: Node | Edge) => Partial<Node | Edge>;
export type StyleFn = (el: Node | Edge) => Record<string, any>;

/**
 * Layout specification for Cytoscape.js
 */
export interface LayoutSpec {
  name: string;                    // "fcose", "dagre", "cose-bilkent", etc.
  options?: Record<string, any>;   // Layout-specific options
}

/**
 * Backend compute specification for heavy operations
 */
export interface ComputeSpec {
  endpoint: string;                // "/api/compute/hierarchyView"
  params: Record<string, any>;     // { hierarchyId: "h1" }
}

/**
 * Complete lens definition combining all aspects
 */
export interface LensDefinition extends LensMeta {
  filter?: FilterFn;      // Optional node/edge filtering
  map?: MapFn;           // Optional data transformation
  style?: StyleFn;       // Optional styling function
  layout?: LayoutSpec;   // Optional layout specification
  compute?: ComputeSpec; // Optional backend computation
}

/**
 * Hierarchy-specific types for dynamic lens generation
 */
export interface Hierarchy {
  id: string;
  name: string;
  version?: string;
}

export interface HierarchyLevel {
  id: string;
  levelNumber: number;
  label?: string;
  allowedTypes?: { id: string; typeName: string }[];
}

/**
 * View context state management
 */
export interface ViewState {
  active: string;
  setActive: (id: string) => void;
  hideUnassociated: boolean;
  setHideUnassociated: (hide: boolean) => void;
}

/**
 * Lens registry type for organizing available lenses
 */
export type LensRegistry = Record<string, LensDefinition>;

/**
 * Lens group for UI organization
 */
export interface LensGroup {
  label: string;
  items: Array<{
    id: string;
    label: string;
    icon?: string;
  }>;
}

/**
 * Backend compute response format
 */
export interface ComputeResponse {
  nodes: Node[];
  edges: Edge[];
  metadata?: Record<string, any>;
}

/**
 * Error types for lens operations
 */
export class LensError extends Error {
  constructor(
    message: string,
    public lensId: string,
    public operation: string
  ) {
    super(message);
    this.name = 'LensError';
  }
}

export class ComputeError extends Error {
  constructor(
    message: string,
    public endpoint: string,
    public params: Record<string, any>
  ) {
    super(message);
    this.name = 'ComputeError';
  }
}

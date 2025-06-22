export { Css, ElementDefinition } from 'cytoscape';

/**
 * Shared TypeScript types for MakeItMakeSense.io Graph Views/Lens System
 *
 * This package provides type definitions used by both frontend and backend
 * for the Graph Views/Lens system implementation.
 */

/**
 * Basic graph data structures
 */
interface Node {
    id: string;
    label?: string;
    type?: string;
    [key: string]: any;
}
interface Edge {
    id?: string;
    source: string;
    target: string;
    type?: string;
    [key: string]: any;
}
interface Graph {
    nodes: Node[];
    edges: Edge[];
}
/**
 * Lens metadata and identification
 */
interface LensMeta {
    id: string;
    label: string;
    icon?: string;
}
/**
 * Function types for lens operations
 */
type FilterFn = (node: Node | null, edge?: Edge) => boolean;
type MapFn = (el: Node | Edge) => Partial<Node | Edge>;
type StyleFn = (el: Node | Edge) => Record<string, any>;
/**
 * Layout specification for Cytoscape.js
 */
interface LayoutSpec {
    name: string;
    options?: Record<string, any>;
}
/**
 * Backend compute specification for heavy operations
 */
interface ComputeSpec {
    endpoint: string;
    params: Record<string, any>;
}
/**
 * Complete lens definition combining all aspects
 */
interface LensDefinition extends LensMeta {
    filter?: FilterFn;
    map?: MapFn;
    style?: StyleFn;
    layout?: LayoutSpec;
    compute?: ComputeSpec;
}
/**
 * Hierarchy-specific types for dynamic lens generation
 */
interface Hierarchy {
    id: string;
    name: string;
    version?: string;
}
interface HierarchyLevel {
    id: string;
    levelNumber: number;
    label?: string;
    allowedTypes?: {
        id: string;
        typeName: string;
    }[];
}
/**
 * View context state management
 */
interface ViewState {
    active: string;
    setActive: (id: string) => void;
    hideUnassociated: boolean;
    setHideUnassociated: (hide: boolean) => void;
}
/**
 * Lens registry type for organizing available lenses
 */
type LensRegistry = Record<string, LensDefinition>;
/**
 * Lens group for UI organization
 */
interface LensGroup {
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
interface ComputeResponse {
    nodes: Node[];
    edges: Edge[];
    metadata?: Record<string, any>;
}
/**
 * Error types for lens operations
 */
declare class LensError extends Error {
    lensId: string;
    operation: string;
    constructor(message: string, lensId: string, operation: string);
}
declare class ComputeError extends Error {
    endpoint: string;
    params: Record<string, any>;
    constructor(message: string, endpoint: string, params: Record<string, any>);
}

export { ComputeError, type ComputeResponse, type ComputeSpec, type Edge, type FilterFn, type Graph, type Hierarchy, type HierarchyLevel, type LayoutSpec, type LensDefinition, LensError, type LensGroup, type LensMeta, type LensRegistry, type MapFn, type Node, type StyleFn, type ViewState };

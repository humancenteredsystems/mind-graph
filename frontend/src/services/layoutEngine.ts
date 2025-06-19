/**
 * Layout Engine - Simplified hierarchy-aware layout management for Cytoscape.js graphs
 * 
 * Provides multiple layout algorithms with hierarchy-aware positioning using a factory pattern.
 * All layouts respect node hierarchy levels for consistent visual organization.
 */

import cytoscape, { Core, LayoutOptions, NodeSingular } from 'cytoscape';
import { NodeData, EdgeData } from '../types/graph';
import { log } from '../utils/logger';
import { getNodeHierarchyLevel } from '../utils/graphUtils';

// Layout algorithm types
export type LayoutAlgorithm = 
  | 'tree'
  | 'hierarchical'
  | 'force-directed' 
  | 'circular'
  | 'grid'
  | 'deterministic';

// Position cache for maintaining stability
interface PositionCache {
  [nodeId: string]: {
    x: number;
    y: number;
    timestamp: number;
    layoutAlgorithm: LayoutAlgorithm;
  };
}

// Layout configuration interface
export interface LayoutConfig {
  algorithm: LayoutAlgorithm;
  animate: boolean;
  animationDuration: number;
  fit: boolean;
  padding: number;
  // Hierarchy-specific options
  respectHierarchy: boolean;
  levelSpacing: number;
  nodeSpacing: number;
  // Algorithm-specific parameters
  forceStrength?: number;
  repulsionStrength?: number;
  springLength?: number;
  circularRadius?: number;
  gridSpacing?: number;
  maxExecutionTime?: number;
  // Live update for continuous simulation
  liveUpdate?: boolean;
}

// Layout factory function type
type LayoutFactory = (cy: Core, config: LayoutConfig, nodes: NodeData[], edges: EdgeData[], hierarchyId: string) => LayoutOptions;

/**
 * Generate hierarchy-aware grid positions
 */
function generateHierarchyGridPositions(nodes: NodeData[], config: LayoutConfig, hierarchyId: string): { [nodeId: string]: { x: number; y: number } } {
  const nodesByLevel: { [level: number]: NodeData[] } = {};
  nodes.forEach(node => {
    const level = getNodeHierarchyLevel(node, hierarchyId);
    if (!nodesByLevel[level]) {
      nodesByLevel[level] = [];
    }
    nodesByLevel[level].push(node);
  });

  const positions: { [nodeId: string]: { x: number; y: number } } = {};
  const gridSpacing = config.gridSpacing || 120;
  const levelSpacing = config.levelSpacing || 200;

  Object.keys(nodesByLevel).forEach(levelStr => {
    const level = parseInt(levelStr);
    const levelNodes = nodesByLevel[level];
    const nodesPerRow = Math.ceil(Math.sqrt(levelNodes.length));
    
    levelNodes.forEach((node, index) => {
      const row = Math.floor(index / nodesPerRow);
      const col = index % nodesPerRow;
      
      positions[node.id] = {
        x: level * levelSpacing + col * gridSpacing,
        y: row * gridSpacing,
      };
    });
  });

  return positions;
}

/**
 * Generate stable hierarchy-based positions for preset layout
 */
function generateHierarchyPositions(nodes: NodeData[], config: LayoutConfig, hierarchyId: string): { [nodeId: string]: { x: number; y: number } } {
  const positions: { [nodeId: string]: { x: number; y: number } } = {};
  const levelCounters: Record<number, number> = {};

  nodes.forEach(node => {
    const level = getNodeHierarchyLevel(node, hierarchyId);
    const index = levelCounters[level] || 0;
    levelCounters[level] = index + 1;

    positions[node.id] = {
      x: level * (config.levelSpacing || 200),
      y: index * (config.nodeSpacing || 100),
    };
  });

  return positions;
}

/**
 * Hierarchy-aware layout factories
 * Each factory returns a LayoutOptions object configured for the specific algorithm
 */
const layoutFactories: Record<LayoutAlgorithm, LayoutFactory> = {
  hierarchical: (cy, config) => ({
    name: 'dagre',
    animate: config.animate,
    animationDuration: config.animationDuration,
    directed: true,
    rankDir: 'TB', // Top to bottom hierarchy
    align: 'UL', // Upper left alignment
    ranker: 'longest-path',
    nodeSep: config.nodeSpacing || 100,
    rankSep: config.levelSpacing || 200,
  }),

  'force-directed': (cy, config, nodes, edges, hierarchyId) => ({
    name: 'cose-bilkent',
    animate: config.animate,
    animationDuration: config.animationDuration,
    nodeRepulsion: config.repulsionStrength || 4500,
    idealEdgeLength: config.springLength || 50,
    edgeElasticity: config.forceStrength || 0.45,
    nestingFactor: 1.2, // Always respect hierarchy in force-directed
    gravity: 0.25,
    numIter: 1000,
    tile: true,
    randomize: false,
    refresh: 20,
    ungrabifyWhileSimulating: false,
    convergenceThreshold: 0.02,
    maxSimulationTime: config.liveUpdate ? Infinity : 2000,
    liveUpdate: config.liveUpdate || false,
  }),

  circular: (cy, config, nodes, edges, hierarchyId) => ({
    name: 'concentric',
    animate: config.animate,
    animationDuration: config.animationDuration,
    concentric: (node: NodeSingular) => {
      const nodeData = node.data() as NodeData;
      const level = getNodeHierarchyLevel(nodeData, hierarchyId);
      return 10 - level; // Higher levels get smaller circles (closer to center)
    },
    levelWidth: () => 1,
    minNodeSpacing: config.nodeSpacing || 100,
  }),

  grid: (cy, config, nodes, edges, hierarchyId) => {
    const positions = generateHierarchyGridPositions(nodes, config, hierarchyId);
    return {
      name: 'preset',
      animate: config.animate,
      animationDuration: config.animationDuration,
      positions,
    };
  },

  tree: (cy, config) => ({
    name: 'breadthfirst',
    animate: config.animate,
    animationDuration: config.animationDuration,
    directed: true,
    spacingFactor: 1.5,
    avoidOverlap: true,
    maximal: false,
  }),

  deterministic: (cy, config, nodes, edges, hierarchyId) => {
    const positions = generateHierarchyPositions(nodes, config, hierarchyId);
    return {
      name: 'preset',
      animate: config.animate,
      animationDuration: config.animationDuration,
      positions,
    };
  },
};

// Default layout configurations
const DEFAULT_CONFIGS: Record<LayoutAlgorithm, Partial<LayoutConfig>> = {
  tree: {
    algorithm: 'tree',
    animate: true,
    animationDuration: 400,
    fit: true,
    padding: 50,
    respectHierarchy: true,
    levelSpacing: 180,
    nodeSpacing: 80,
  },
  hierarchical: {
    algorithm: 'hierarchical',
    animate: true,
    animationDuration: 300,
    fit: true,
    padding: 50,
    respectHierarchy: true,
    levelSpacing: 200,
    nodeSpacing: 100,
  },
  'force-directed': {
    algorithm: 'force-directed',
    animate: true,
    animationDuration: 600,
    fit: true,
    padding: 50,
    respectHierarchy: true,
    forceStrength: 0.1,
    repulsionStrength: 4500,
    springLength: 50,
  },
  circular: {
    algorithm: 'circular',
    animate: true,
    animationDuration: 400,
    fit: true,
    padding: 50,
    respectHierarchy: true,
    circularRadius: 150,
  },
  grid: {
    algorithm: 'grid',
    animate: true,
    animationDuration: 300,
    fit: true,
    padding: 50,
    respectHierarchy: true,
    gridSpacing: 120,
  },
  deterministic: {
    algorithm: 'deterministic',
    animate: true,
    animationDuration: 200,
    fit: true,
    padding: 50,
    respectHierarchy: true,
    levelSpacing: 200,
    nodeSpacing: 100,
  },
};

/**
 * Universal layout runner with timeout protection and error handling
 */
async function runHierarchyAwareLayout(
  cy: Core,
  algorithm: LayoutAlgorithm,
  config: LayoutConfig,
  nodes: NodeData[],
  edges: EdgeData[],
  hierarchyId: string
): Promise<void> {
  return new Promise((resolve) => {
    try {
      const layoutOptions = layoutFactories[algorithm](cy, config, nodes, edges, hierarchyId);
      const layout = cy.layout(layoutOptions);
      
      // Check if layout object has required methods (for test environment compatibility)
      if (!layout || typeof layout.on !== 'function' || typeof layout.run !== 'function') {
        log('LayoutEngine', `Layout object missing required methods, applying fallback centering`);
        cy.center();
        cy.fit(cy.nodes(), config.padding);
        resolve();
        return;
      }
      
      // Universal timeout protection
      const timeout = setTimeout(() => {
        if (typeof layout.stop === 'function') {
          layout.stop();
        }
        log('LayoutEngine', `Layout ${layoutOptions.name} timed out after ${config.maxExecutionTime || 5000}ms, applying fallback centering`);
        cy.center();
        cy.fit(cy.nodes(), config.padding);
        resolve();
      }, config.maxExecutionTime || 5000);
      
      // Error handler for layout failures
      layout.on('layouterror', (error: any) => {
        clearTimeout(timeout);
        log('LayoutEngine', `Layout ${layoutOptions.name} error:`, error);
        cy.center();
        cy.fit(cy.nodes(), config.padding);
        resolve();
      });
      
      // Success handler
      layout.on('layoutstop', () => {
        clearTimeout(timeout);
        log('LayoutEngine', `Layout ${layoutOptions.name} completed successfully`);
        cy.center();
        cy.fit(cy.nodes(), config.padding);
        resolve();
      });
      
      log('LayoutEngine', `Starting layout ${layoutOptions.name}`);
      layout.run();
    } catch (error) {
      log('LayoutEngine', `Exception during layout ${algorithm} setup:`, error);
      cy.center();
      cy.fit(cy.nodes(), config.padding);
      resolve();
    }
  });
}

/**
 * Layout Engine Class - Simplified with factory pattern
 */
export class LayoutEngine {
  private cy: Core | null = null;
  private positionCache: PositionCache = {};
  private currentConfig: LayoutConfig;
  private hierarchyId: string = '';
  private nodes: NodeData[] = [];
  private edges: EdgeData[] = [];
  private currentLayout: any = null; // Track current layout instance for live updates

  constructor(initialConfig?: Partial<LayoutConfig>) {
    // Default to tree layout
    this.currentConfig = {
      ...DEFAULT_CONFIGS.tree,
      ...initialConfig,
    } as LayoutConfig;
  }

  /**
   * Initialize the layout engine with Cytoscape instance
   */
  initialize(cy: Core, hierarchyId: string, nodes: NodeData[], edges: EdgeData[]) {
    this.cy = cy;
    this.hierarchyId = hierarchyId;
    this.nodes = nodes;
    this.edges = edges;
    log('LayoutEngine', `Initialized with ${nodes.length} nodes, ${edges.length} edges`);
  }

  /**
   * Helper method to create and manage layout instances
   */
  private createLayout(options: LayoutOptions): any {
    if (!this.cy) return null;
    
    // Stop any existing layout first
    this.stopCurrentLayout();
    
    // Create new layout instance
    const layout = this.cy.layout(options);
    this.currentLayout = layout;
    
    return layout;
  }

  /**
   * Stop the current layout if it exists
   */
  private stopCurrentLayout(): void {
    if (this.currentLayout && typeof this.currentLayout.stop === 'function') {
      this.currentLayout.stop();
      log('LayoutEngine', 'Stopped current layout');
    }
    this.currentLayout = null;
  }

  /**
   * Apply a layout algorithm to the graph
   */
  async applyLayout(algorithm?: LayoutAlgorithm, customConfig?: Partial<LayoutConfig>): Promise<void> {
    if (!this.cy) {
      log('LayoutEngine', 'ERROR: Cytoscape instance not initialized');
      return;
    }

    const targetAlgorithm = algorithm || this.currentConfig.algorithm;
    const config = {
      ...DEFAULT_CONFIGS[targetAlgorithm],
      ...this.currentConfig,
      ...customConfig,
      algorithm: targetAlgorithm,
    } as LayoutConfig;

    log('LayoutEngine', `Applying ${targetAlgorithm} layout${config.liveUpdate ? ' (live update)' : ''}`);

    try {
      // Stop any running layouts first
      this.stopCurrentLayout();
      
      // Clear position cache when switching algorithms for fresh start
      if (targetAlgorithm !== this.currentConfig.algorithm) {
        this.clearCache();
        log('LayoutEngine', `Cleared position cache for algorithm switch to ${targetAlgorithm}`);
      } else {
        // Cache current positions only when staying with same algorithm
        this.cacheCurrentPositions(targetAlgorithm);
      }

      // Handle live update mode for force-directed layout
      if (config.liveUpdate && targetAlgorithm === 'force-directed') {
        const layoutOptions = layoutFactories[targetAlgorithm](this.cy, config, this.nodes, this.edges, this.hierarchyId);
        const layout = this.createLayout(layoutOptions);
        
        if (layout && typeof layout.run === 'function') {
          log('LayoutEngine', 'Starting live force-directed layout');
          layout.run();
          // Don't await - let it run continuously
        }
      } else {
        // Run standard one-shot layout
        await runHierarchyAwareLayout(
          this.cy,
          targetAlgorithm,
          config,
          this.nodes,
          this.edges,
          this.hierarchyId
        );
      }

      this.currentConfig = config;
      log('LayoutEngine', `Successfully applied ${targetAlgorithm} layout`);
    } catch (error) {
      log('LayoutEngine', `Error applying ${targetAlgorithm} layout:`, error);
    }
  }

  /**
   * Cache current node positions for stability
   */
  private cacheCurrentPositions(algorithm: LayoutAlgorithm): void {
    if (!this.cy) return;

    const timestamp = Date.now();
    const nodes = this.cy.nodes();
    
    // Handle both real Cytoscape and test environments
    if (nodes && typeof nodes.forEach === 'function') {
      nodes.forEach(node => {
        const position = node.position();
        this.positionCache[node.id()] = {
          x: position.x,
          y: position.y,
          timestamp,
          layoutAlgorithm: algorithm,
        };
      });
    } else if (nodes && nodes.length !== undefined) {
      // Handle array-like objects in test environment
      for (let i = 0; i < nodes.length; i++) {
        const node = nodes[i];
        if (node && typeof node.position === 'function' && typeof node.id === 'function') {
          const position = node.position();
          this.positionCache[node.id()] = {
            x: position.x,
            y: position.y,
            timestamp,
            layoutAlgorithm: algorithm,
          };
        }
      }
    }

    log('LayoutEngine', `Cached positions for ${Object.keys(this.positionCache).length} nodes`);
  }

  /**
   * Get current layout configuration
   */
  getConfig(): LayoutConfig {
    return { ...this.currentConfig };
  }

  /**
   * Update layout configuration
   */
  updateConfig(updates: Partial<LayoutConfig>): void {
    this.currentConfig = { ...this.currentConfig, ...updates };
  }

  /**
   * Clear position cache
   */
  clearCache(): void {
    this.positionCache = {};
    log('LayoutEngine', 'Position cache cleared');
  }

  /**
   * Get available layout algorithms
   */
  static getAvailableAlgorithms(): LayoutAlgorithm[] {
    return Object.keys(DEFAULT_CONFIGS) as LayoutAlgorithm[];
  }

  /**
   * Get default configuration for an algorithm
   */
  static getDefaultConfig(algorithm: LayoutAlgorithm): LayoutConfig {
    return { ...DEFAULT_CONFIGS[algorithm] } as LayoutConfig;
  }
}

// Export singleton instance with tree as default
export const layoutEngine = new LayoutEngine({ algorithm: 'tree' });

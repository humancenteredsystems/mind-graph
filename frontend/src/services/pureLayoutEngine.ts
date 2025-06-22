/**
 * Pure Layout Engine - Clean Cytoscape.js layout management
 * 
 * Provides pure Cytoscape.js layout algorithms with no hierarchy coupling.
 * Each layout works on any set of nodes/edges without assumptions about data structure.
 */

import cytoscape, { Core, LayoutOptions } from 'cytoscape';
import { log } from '../utils/logger';

// Pure layout algorithm types
export type PureLayoutAlgorithm = 
  | 'fcose'        // Default - modern force-directed
  | 'tree'         // Breadthfirst tree structure
  | 'hierarchical' // Dagre directed graph
  | 'force'        // Classic Cose force-directed
  | 'circular'     // Simple circle layout
  | 'concentric'   // Concentric circles (no hierarchy logic)
  | 'grid';        // Regular grid arrangement

// Pure layout configuration interface
export interface PureLayoutConfig {
  algorithm: PureLayoutAlgorithm;
  animate: boolean;
  animationDuration: number;
  fit: boolean;
  padding: number;
  maxExecutionTime?: number;
  // Algorithm-specific parameters (no hierarchy parameters)
  forceStrength?: number;
  repulsionStrength?: number;
  springLength?: number;
  liveUpdate?: boolean;
}

/**
 * Pure Cytoscape.js layout factories
 * Each factory returns a clean LayoutOptions object with no hierarchy logic
 */
const pureLayoutFactories: Record<PureLayoutAlgorithm, (config: PureLayoutConfig) => LayoutOptions> = {
  fcose: (config) => ({
    name: 'fcose',
    animate: config.animate,
    animationDuration: config.animationDuration,
    fit: config.fit,
    padding: config.padding,
    // Modern force-directed with good defaults
    quality: 'default',
    randomize: false,
    animationEasing: undefined,
    animateFilter: () => true,
    ready: undefined,
    stop: undefined,
    transform: (node: any, position: any) => position,
    // Force-directed parameters
    nodeRepulsion: config.repulsionStrength || 4500,
    idealEdgeLength: config.springLength || 50,
    edgeElasticity: config.forceStrength || 0.45,
    nestingFactor: 1.2,
    gravity: 0.25,
    numIter: 1000,
    tile: true,
    tilingPaddingVertical: 10,
    tilingPaddingHorizontal: 10,
    gravityRangeCompound: 1.5,
    gravityCompound: 1.0,
    gravityRange: 3.8,
    initialEnergyOnIncremental: 0.5,
  }),

  tree: (config) => ({
    name: 'breadthfirst',
    animate: config.animate,
    animationDuration: config.animationDuration,
    fit: config.fit,
    padding: config.padding,
    directed: true,
    spacingFactor: 1.5,
    avoidOverlap: true,
    maximal: false,
  }),

  hierarchical: (config) => ({
    name: 'dagre',
    animate: config.animate,
    animationDuration: config.animationDuration,
    fit: config.fit,
    padding: config.padding,
    directed: true,
    rankDir: 'TB', // Top to bottom
    align: 'UL', // Upper left alignment
    ranker: 'longest-path',
    nodeSep: 100,
    rankSep: 200,
  }),

  force: (config) => ({
    name: 'cose',
    animate: config.animate,
    animationDuration: config.animationDuration,
    fit: config.fit,
    padding: config.padding,
    // Classic force-directed parameters
    nodeRepulsion: config.repulsionStrength || 400000,
    nodeOverlap: 10,
    idealEdgeLength: config.springLength || 10,
    edgeElasticity: config.forceStrength || 100,
    nestingFactor: 5,
    gravity: 80,
    numIter: 1000,
    initialTemp: 200,
    coolingFactor: 0.95,
    minTemp: 1.0,
  }),

  circular: (config) => ({
    name: 'circle',
    animate: config.animate,
    animationDuration: config.animationDuration,
    fit: config.fit,
    padding: config.padding,
    radius: undefined, // Auto-calculate radius
    startAngle: 3 / 2 * Math.PI, // Start at top
    sweep: undefined, // Full circle
    clockwise: true,
    sort: undefined, // No sorting
    transform: (node: any, position: any) => position,
  }),

  concentric: (config) => ({
    name: 'concentric',
    animate: config.animate,
    animationDuration: config.animationDuration,
    fit: config.fit,
    padding: config.padding,
    // Pure concentric - no hierarchy logic
    concentric: () => 1, // All nodes same level
    levelWidth: () => 1,
    minNodeSpacing: 100,
    startAngle: 3 / 2 * Math.PI,
    sweep: undefined,
    clockwise: true,
    equidistant: false,
  }),

  grid: (config) => ({
    name: 'grid',
    animate: config.animate,
    animationDuration: config.animationDuration,
    fit: config.fit,
    padding: config.padding,
    avoidOverlap: true,
    avoidOverlapPadding: 10,
    nodeDimensionsIncludeLabels: false,
    spacingFactor: undefined, // Auto-calculate
    condense: false,
    rows: undefined, // Auto-calculate
    cols: undefined, // Auto-calculate
    position: (node: any) => undefined, // Auto-position
    sort: undefined, // No sorting
    transform: (node: any, position: any) => position,
  }),
};

// Default configurations for each algorithm
const DEFAULT_PURE_CONFIGS: Record<PureLayoutAlgorithm, Partial<PureLayoutConfig>> = {
  fcose: {
    algorithm: 'fcose',
    animate: true,
    animationDuration: 500,
    fit: true,
    padding: 50,
    forceStrength: 0.45,
    repulsionStrength: 4500,
    springLength: 50,
  },
  tree: {
    algorithm: 'tree',
    animate: true,
    animationDuration: 400,
    fit: true,
    padding: 50,
  },
  hierarchical: {
    algorithm: 'hierarchical',
    animate: true,
    animationDuration: 300,
    fit: true,
    padding: 50,
  },
  force: {
    algorithm: 'force',
    animate: true,
    animationDuration: 600,
    fit: true,
    padding: 50,
    forceStrength: 100,
    repulsionStrength: 400000,
    springLength: 10,
  },
  circular: {
    algorithm: 'circular',
    animate: true,
    animationDuration: 400,
    fit: true,
    padding: 50,
  },
  concentric: {
    algorithm: 'concentric',
    animate: true,
    animationDuration: 400,
    fit: true,
    padding: 50,
  },
  grid: {
    algorithm: 'grid',
    animate: true,
    animationDuration: 300,
    fit: true,
    padding: 50,
  },
};

/**
 * Check if Cytoscape renderer is valid before operations
 */
function isValidRenderer(cy: Core): boolean {
  try {
    const renderer = (cy as any)._private?.renderer;
    return renderer !== null && renderer !== undefined;
  } catch (error) {
    return false;
  }
}

/**
 * Safe wrapper for Cytoscape operations that might fail with null renderer
 */
function safeCytoscapeOperation(cy: Core, operation: () => void, operationName: string): void {
  try {
    if (isValidRenderer(cy)) {
      operation();
    } else {
      log('PureLayoutEngine', `Skipping ${operationName} - renderer is null`);
    }
  } catch (error) {
    log('PureLayoutEngine', `Error during ${operationName}:`, error);
  }
}

/**
 * Universal pure layout runner with timeout protection and error handling
 */
async function runPureLayout(
  cy: Core,
  algorithm: PureLayoutAlgorithm,
  config: PureLayoutConfig
): Promise<void> {
  return new Promise((resolve) => {
    try {
      // Check renderer before starting layout
      if (!isValidRenderer(cy)) {
        log('PureLayoutEngine', 'Renderer is null, skipping layout');
        resolve();
        return;
      }

      const layoutOptions = pureLayoutFactories[algorithm](config);
      const layout = cy.layout(layoutOptions);
      
      // Check if layout object has required methods (for test environment compatibility)
      if (!layout || typeof layout.on !== 'function' || typeof layout.run !== 'function') {
        log('PureLayoutEngine', `Layout object missing required methods, applying fallback centering`);
        safeCytoscapeOperation(cy, () => {
          cy.center();
          cy.fit(cy.nodes(), config.padding);
        }, 'fallback centering');
        resolve();
        return;
      }
      
      // Universal timeout protection
      const timeout = setTimeout(() => {
        if (typeof layout.stop === 'function') {
          layout.stop();
        }
        log('PureLayoutEngine', `Layout ${layoutOptions.name} timed out after ${config.maxExecutionTime || 5000}ms, applying fallback centering`);
        safeCytoscapeOperation(cy, () => {
          cy.center();
          cy.fit(cy.nodes(), config.padding);
        }, 'timeout fallback centering');
        resolve();
      }, config.maxExecutionTime || 5000);
      
      // Error handler for layout failures
      layout.on('layouterror', (error: any) => {
        clearTimeout(timeout);
        log('PureLayoutEngine', `Layout ${layoutOptions.name} error:`, error);
        safeCytoscapeOperation(cy, () => {
          cy.center();
          cy.fit(cy.nodes(), config.padding);
        }, 'error fallback centering');
        resolve();
      });
      
      // Success handler
      layout.on('layoutstop', () => {
        clearTimeout(timeout);
        log('PureLayoutEngine', `Layout ${layoutOptions.name} completed successfully`);
        safeCytoscapeOperation(cy, () => {
          cy.center();
          cy.fit(cy.nodes(), config.padding);
        }, 'success centering');
        resolve();
      });
      
      log('PureLayoutEngine', `Starting layout ${layoutOptions.name}`);
      layout.run();
    } catch (error) {
      log('PureLayoutEngine', `Exception during layout ${algorithm} setup:`, error);
      safeCytoscapeOperation(cy, () => {
        cy.center();
        cy.fit(cy.nodes(), config.padding);
      }, 'exception fallback centering');
      resolve();
    }
  });
}

/**
 * Pure Layout Engine Class - No hierarchy coupling
 */
export class PureLayoutEngine {
  private cy: Core | null = null;
  private currentConfig: PureLayoutConfig;
  private currentLayout: any = null; // Track current layout instance for live updates
  private isDestroyed: boolean = false; // Track if instance is destroyed

  constructor(initialConfig?: Partial<PureLayoutConfig>) {
    // Default to fcose layout
    this.currentConfig = {
      ...DEFAULT_PURE_CONFIGS.fcose,
      ...initialConfig,
    } as PureLayoutConfig;
  }

  /**
   * Initialize the layout engine with Cytoscape instance
   */
  initialize(cy: Core) {
    this.isDestroyed = false;
    this.cy = cy;
    log('PureLayoutEngine', `Initialized with pure layout engine`);
  }

  /**
   * Check if Cytoscape instance and renderer are valid
   */
  private isValidCytoscape(): boolean {
    if (this.isDestroyed) {
      log('PureLayoutEngine', 'Layout engine is destroyed, skipping operation');
      return false;
    }
    
    if (!this.cy) {
      log('PureLayoutEngine', 'No Cytoscape instance available');
      return false;
    }

    // Check if renderer exists and is not null
    try {
      const renderer = (this.cy as any)._private?.renderer;
      if (!renderer) {
        log('PureLayoutEngine', 'Cytoscape renderer is null or undefined, skipping operation');
        return false;
      }
      return true;
    } catch (error) {
      log('PureLayoutEngine', 'Error checking renderer state:', error);
      return false;
    }
  }

  /**
   * Destroy the layout engine and clean up resources
   */
  destroy(): void {
    log('PureLayoutEngine', 'Destroying layout engine');
    this.isDestroyed = true;
    this.stopCurrentLayout();
    this.cy = null;
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
      log('PureLayoutEngine', 'Stopped current layout');
    }
    this.currentLayout = null;
  }

  /**
   * Apply a pure layout algorithm to the graph
   */
  async applyLayout(algorithm?: PureLayoutAlgorithm, customConfig?: Partial<PureLayoutConfig>): Promise<void> {
    // Validate Cytoscape instance and renderer before proceeding
    if (!this.isValidCytoscape()) {
      return;
    }

    const targetAlgorithm = algorithm || this.currentConfig.algorithm;
    const config = {
      ...DEFAULT_PURE_CONFIGS[targetAlgorithm],
      ...this.currentConfig,
      ...customConfig,
      algorithm: targetAlgorithm,
    } as PureLayoutConfig;

    log('PureLayoutEngine', `Applying ${targetAlgorithm} layout${config.liveUpdate ? ' (live update)' : ''}`);

    try {
      // Stop any running layouts first
      this.stopCurrentLayout();
      
      // Re-validate after stopping layout (renderer might have been destroyed)
      if (!this.isValidCytoscape()) {
        return;
      }

      // Handle live update mode for force-directed layouts
      if (config.liveUpdate && (targetAlgorithm === 'fcose' || targetAlgorithm === 'force')) {
        const layoutOptions = pureLayoutFactories[targetAlgorithm](config);
        const layout = this.createLayout(layoutOptions);
        
        if (layout && typeof layout.run === 'function') {
          log('PureLayoutEngine', `Starting live ${targetAlgorithm} layout`);
          layout.run();
          // Don't await - let it run continuously
        }
      } else {
        // Run standard one-shot layout
        await runPureLayout(this.cy!, targetAlgorithm, config);
      }

      this.currentConfig = config;
      log('PureLayoutEngine', `Successfully applied ${targetAlgorithm} layout`);
    } catch (error) {
      log('PureLayoutEngine', `Error applying ${targetAlgorithm} layout:`, error);
    }
  }

  /**
   * Get current layout configuration
   */
  getConfig(): PureLayoutConfig {
    return { ...this.currentConfig };
  }

  /**
   * Update layout configuration
   */
  updateConfig(updates: Partial<PureLayoutConfig>): void {
    this.currentConfig = { ...this.currentConfig, ...updates };
  }

  /**
   * Get available layout algorithms
   */
  static getAvailableAlgorithms(): PureLayoutAlgorithm[] {
    return Object.keys(DEFAULT_PURE_CONFIGS) as PureLayoutAlgorithm[];
  }

  /**
   * Get default configuration for an algorithm
   */
  static getDefaultConfig(algorithm: PureLayoutAlgorithm): PureLayoutConfig {
    return { ...DEFAULT_PURE_CONFIGS[algorithm] } as PureLayoutConfig;
  }

  /**
   * Get human-readable names for layout algorithms
   */
  static getLayoutDisplayNames(): Record<PureLayoutAlgorithm, string> {
    return {
      fcose: 'Force-Directed (Modern)',
      tree: 'Tree Structure',
      hierarchical: 'Hierarchical (Dagre)',
      force: 'Force-Directed (Classic)',
      circular: 'Circular',
      concentric: 'Concentric Circles',
      grid: 'Grid Layout',
    };
  }
}

// Export singleton instance with fcose as default
export const pureLayoutEngine = new PureLayoutEngine({ algorithm: 'fcose' });

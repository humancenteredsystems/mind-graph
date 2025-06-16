/**
 * Layout Engine - Advanced layout management for Cytoscape.js graphs
 * 
 * Provides multiple layout algorithms with hierarchy-aware positioning,
 * position caching for stability, and smooth transitions between layouts.
 */

import cytoscape, { Core, LayoutOptions, NodeSingular, EdgeSingular } from 'cytoscape';
import { NodeData, EdgeData } from '../types/graph';
import { log } from '../utils/logger';
import { normalizeHierarchyId, getNodeHierarchyLevel } from '../utils/graphUtils';

// Layout algorithm types
export type LayoutAlgorithm = 
  | 'hierarchical'
  | 'force-directed' 
  | 'circular'
  | 'grid'
  | 'tree'
  | 'manual'
  | 'preset';

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
}

// Default layout configurations - SET HIERARCHICAL AS DEFAULT
const DEFAULT_CONFIGS: Record<LayoutAlgorithm, Partial<LayoutConfig>> = {
  hierarchical: {
    algorithm: 'hierarchical',
    animate: true,
    animationDuration: 300,
    fit: true,
    padding: 20,
    respectHierarchy: true,
    levelSpacing: 200,
    nodeSpacing: 100,
  },
  'force-directed': {
    algorithm: 'force-directed',
    animate: true,
    animationDuration: 600,
    fit: true,
    padding: 20,
    respectHierarchy: false,
    forceStrength: 0.1,
    repulsionStrength: 1000,
    springLength: 100,
  },
  circular: {
    algorithm: 'circular',
    animate: true,
    animationDuration: 400,
    fit: true,
    padding: 20,
    respectHierarchy: true,
    circularRadius: 150,
  },
  grid: {
    algorithm: 'grid',
    animate: true,
    animationDuration: 300,
    fit: true,
    padding: 20,
    respectHierarchy: true,
    gridSpacing: 120,
  },
  tree: {
    algorithm: 'tree',
    animate: true,
    animationDuration: 400,
    fit: true,
    padding: 20,
    respectHierarchy: true,
    levelSpacing: 180,
    nodeSpacing: 80,
  },
  manual: {
    algorithm: 'manual',
    animate: false,
    animationDuration: 0,
    fit: false,
    padding: 20,
    respectHierarchy: false,
  },
  preset: {
    algorithm: 'preset',
    animate: true,
    animationDuration: 200,
    fit: true,
    padding: 10,
    respectHierarchy: true,
    levelSpacing: 200,
    nodeSpacing: 100,
  },
};

/**
 * Layout Engine Class
 * Manages layout algorithms, position caching, and smooth transitions
 */
export class LayoutEngine {
  private cy: Core | null = null;
  private positionCache: PositionCache = {};
  private currentConfig: LayoutConfig;
  private hierarchyId: string = '';
  private nodes: NodeData[] = [];
  private edges: EdgeData[] = [];

  constructor(initialConfig?: Partial<LayoutConfig>) {
    // Default to hierarchical layout
    this.currentConfig = {
      ...DEFAULT_CONFIGS.hierarchical,
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

    log('LayoutEngine', `Applying ${targetAlgorithm} layout`);

    try {
      // Stop any running layouts first
      this.cy.layout({ name: 'null' }).stop();
      
      // Clear position cache when switching algorithms for fresh start
      if (targetAlgorithm !== this.currentConfig.algorithm) {
        this.clearCache();
        log('LayoutEngine', `Cleared position cache for algorithm switch to ${targetAlgorithm}`);
      } else {
        // Cache current positions only when staying with same algorithm
        this.cacheCurrentPositions(targetAlgorithm);
      }

      // Apply the specific layout algorithm
      switch (targetAlgorithm) {
        case 'hierarchical':
          await this.applyHierarchicalLayout(config);
          break;
        case 'force-directed':
          await this.applyForceDirectedLayout(config);
          break;
        case 'circular':
          await this.applyCircularLayout(config);
          break;
        case 'grid':
          await this.applyGridLayout(config);
          break;
        case 'tree':
          await this.applyTreeLayout(config);
          break;
        case 'preset':
          await this.applyPresetLayout(config);
          break;
        case 'manual':
          // Manual layout doesn't change positions automatically
          break;
        default:
          log('LayoutEngine', `Unknown layout algorithm: ${targetAlgorithm}`);
          return;
      }

      this.currentConfig = config;
      log('LayoutEngine', `Successfully applied ${targetAlgorithm} layout`);
    } catch (error) {
      log('LayoutEngine', `Error applying ${targetAlgorithm} layout:`, error);
    }
  }

  /**
   * Apply hierarchical layout using Klay algorithm with hierarchy awareness
   */
  private async applyHierarchicalLayout(config: LayoutConfig): Promise<void> {
    if (!this.cy) return;

    const layoutOptions: any = {
      name: 'klay',
      fit: false, // We'll handle fit separately for faster animation
      padding: config.padding,
      klay: {
        direction: 'DOWN',
        spacing: config.nodeSpacing || 100,
        layoutHierarchy: config.respectHierarchy,
        intCoordinates: true,
        nodePlacement: 'BRANDES_KOEPF',
        edgeRouting: 'ORTHOGONAL',
      },
    };

    return new Promise((resolve) => {
      const layout = this.cy!.layout(layoutOptions);
      
      layout.on('layoutstop', () => {
        if (config.fit) {
          if (config.animate) {
            this.cy!.animate({
              fit: { eles: this.cy!.elements(), padding: config.padding },
            }, {
              duration: 200, // Fast fit animation
              complete: () => resolve(),
            });
          } else {
            this.cy!.fit(this.cy!.elements(), config.padding);
            resolve();
          }
        } else {
          resolve();
        }
      });
      
      layout.run();
    });
  }

  /**
   * Apply force-directed layout with optimized parameters to prevent hanging
   */
  private async applyForceDirectedLayout(config: LayoutConfig): Promise<void> {
    if (!this.cy) return;

    const layoutOptions: any = {
      name: 'cose-bilkent',
      fit: false, // We'll handle fit separately
      padding: config.padding,
      nodeRepulsion: config.repulsionStrength || 4500,
      idealEdgeLength: config.springLength || 50,
      edgeElasticity: config.forceStrength || 0.45,
      nestingFactor: config.respectHierarchy ? 1.2 : 1,
      gravity: 0.25,
      numIter: 1000, // Reduced iterations to prevent hanging
      tile: true,
      animate: config.animate ? 'end' : false, // Use 'end' instead of 'during' to prevent hanging
      animationDuration: config.animationDuration,
      randomize: false,
      // Simplified simulation parameters
      refresh: 20, // Reduced refresh rate
      ungrabifyWhileSimulating: false,
      // More aggressive stop conditions
      convergenceThreshold: 0.02, // Less strict convergence
      maxSimulationTime: 2000, // Shorter maximum time
    };

    return new Promise((resolve) => {
      const layout = this.cy!.layout(layoutOptions);
      
      // Add timeout to prevent infinite hanging
      const timeout = setTimeout(() => {
        layout.stop();
        log('LayoutEngine', 'Force-directed layout timed out, stopping');
        if (config.fit) {
          this.cy!.fit(this.cy!.elements(), config.padding);
        }
        resolve();
      }, 3000); // 3 second timeout
      
      layout.on('layoutstop', () => {
        clearTimeout(timeout);
        if (config.fit) {
          if (config.animate) {
            this.cy!.animate({
              fit: { eles: this.cy!.elements(), padding: config.padding },
            }, {
              duration: 200,
              complete: () => resolve(),
            });
          } else {
            this.cy!.fit(this.cy!.elements(), config.padding);
            resolve();
          }
        } else {
          resolve();
        }
      });
      
      layout.run();
    });
  }

  /**
   * Apply circular layout with hierarchy-based concentric circles
   */
  private async applyCircularLayout(config: LayoutConfig): Promise<void> {
    if (!this.cy) return;

    if (config.respectHierarchy) {
      // Custom concentric layout based on hierarchy levels
      await this.applyConcentricLayout(config);
    } else {
      // Simple circular layout
      const layoutOptions: any = {
        name: 'circle',
        fit: false,
        padding: config.padding,
        radius: config.circularRadius || 150,
      };

      return new Promise((resolve) => {
        const layout = this.cy!.layout(layoutOptions);
        
        layout.on('layoutstop', () => {
          if (config.fit) {
            if (config.animate) {
              this.cy!.animate({
                fit: { eles: this.cy!.elements(), padding: config.padding },
              }, {
                duration: 200,
                complete: () => resolve(),
              });
            } else {
              this.cy!.fit(this.cy!.elements(), config.padding);
              resolve();
            }
          } else {
            resolve();
          }
        });
        
        layout.run();
      });
    }
  }

  /**
   * Apply concentric circular layout based on hierarchy levels
   */
  private async applyConcentricLayout(config: LayoutConfig): Promise<void> {
    if (!this.cy) return;

    const layoutOptions: any = {
      name: 'concentric',
      fit: false,
      padding: config.padding,
      concentric: (node: NodeSingular) => {
        const nodeData = node.data() as NodeData;
        const level = getNodeHierarchyLevel(nodeData, this.hierarchyId);
        return 10 - level; // Higher levels get smaller circles (closer to center)
      },
      levelWidth: () => 1,
      minNodeSpacing: config.nodeSpacing || 100,
    };

    return new Promise((resolve) => {
      const layout = this.cy!.layout(layoutOptions);
      
      layout.on('layoutstop', () => {
        if (config.fit) {
          if (config.animate) {
            this.cy!.animate({
              fit: { eles: this.cy!.elements(), padding: config.padding },
            }, {
              duration: 200,
              complete: () => resolve(),
            });
          } else {
            this.cy!.fit(this.cy!.elements(), config.padding);
            resolve();
          }
        } else {
          resolve();
        }
      });
      
      layout.run();
    });
  }

  /**
   * Apply hierarchy-aware grid layout
   */
  private async applyGridLayout(config: LayoutConfig): Promise<void> {
    if (!this.cy) return;

    if (config.respectHierarchy) {
      // Custom hierarchy-aware grid positioning
      await this.applyHierarchyGridLayout(config);
    } else {
      // Standard grid layout
      const layoutOptions: any = {
        name: 'grid',
        fit: false,
        padding: config.padding,
        spacingFactor: (config.gridSpacing || 120) / 100,
      };

      return new Promise((resolve) => {
        const layout = this.cy!.layout(layoutOptions);
        
        layout.on('layoutstop', () => {
          if (config.fit) {
            if (config.animate) {
              this.cy!.animate({
                fit: { eles: this.cy!.elements(), padding: config.padding },
              }, {
                duration: 200,
                complete: () => resolve(),
              });
            } else {
              this.cy!.fit(this.cy!.elements(), config.padding);
              resolve();
            }
          } else {
            resolve();
          }
        });
        
        layout.run();
      });
    }
  }

  /**
   * Apply custom hierarchy-aware grid layout
   */
  private async applyHierarchyGridLayout(config: LayoutConfig): Promise<void> {
    if (!this.cy) return;

    // Group nodes by hierarchy level
    const nodesByLevel: { [level: number]: NodeData[] } = {};
    this.nodes.forEach(node => {
      const level = getNodeHierarchyLevel(node, this.hierarchyId);
      if (!nodesByLevel[level]) {
        nodesByLevel[level] = [];
      }
      nodesByLevel[level].push(node);
    });

    // Generate positions for hierarchy-aware grid
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

    const layoutOptions: any = {
      name: 'preset',
      fit: false,
      padding: config.padding,
      positions,
    };

    return new Promise((resolve) => {
      const layout = this.cy!.layout(layoutOptions);
      
      layout.on('layoutstop', () => {
        if (config.fit) {
          if (config.animate) {
            this.cy!.animate({
              fit: { eles: this.cy!.elements(), padding: config.padding },
            }, {
              duration: 200,
              complete: () => resolve(),
            });
          } else {
            this.cy!.fit(this.cy!.elements(), config.padding);
            resolve();
          }
        } else {
          resolve();
        }
      });
      
      layout.run();
    });
  }

  /**
   * Apply hierarchy-aware tree layout using Dagre
   */
  private async applyTreeLayout(config: LayoutConfig): Promise<void> {
    if (!this.cy) return;

    if (config.respectHierarchy) {
      // Use Dagre for proper hierarchical tree layout
      const layoutOptions: any = {
        name: 'dagre',
        fit: false,
        padding: config.padding,
        directed: true,
        rankDir: 'TB', // Top to bottom
        align: 'UL', // Upper left alignment
        ranker: 'longest-path',
        nodeSep: config.nodeSpacing || 80,
        rankSep: config.levelSpacing || 180,
      };

      return new Promise((resolve) => {
        const layout = this.cy!.layout(layoutOptions);
        
        layout.on('layoutstop', () => {
          if (config.fit) {
            if (config.animate) {
              this.cy!.animate({
                fit: { eles: this.cy!.elements(), padding: config.padding },
              }, {
                duration: 200,
                complete: () => resolve(),
              });
            } else {
              this.cy!.fit(this.cy!.elements(), config.padding);
              resolve();
            }
          } else {
            resolve();
          }
        });
        
        layout.run();
      });
    } else {
      // Use breadthfirst as fallback
      const layoutOptions: any = {
        name: 'breadthfirst',
        fit: false,
        padding: config.padding,
        directed: true,
        spacingFactor: 1.5,
        avoidOverlap: true,
        maximal: false,
      };

      return new Promise((resolve) => {
        const layout = this.cy!.layout(layoutOptions);
        
        layout.on('layoutstop', () => {
          if (config.fit) {
            if (config.animate) {
              this.cy!.animate({
                fit: { eles: this.cy!.elements(), padding: config.padding },
              }, {
                duration: 200,
                complete: () => resolve(),
              });
            } else {
              this.cy!.fit(this.cy!.elements(), config.padding);
              resolve();
            }
          } else {
            resolve();
          }
        });
        
        layout.run();
      });
    }
  }

  /**
   * Apply preset layout (current implementation) with improved stability
   */
  private async applyPresetLayout(config: LayoutConfig): Promise<void> {
    if (!this.cy) return;

    // Generate stable positions based on hierarchy
    const positions = this.generateHierarchyPositions(config);

    const layoutOptions: any = {
      name: 'preset',
      fit: false,
      padding: config.padding,
      positions,
    };

    return new Promise((resolve) => {
      const layout = this.cy!.layout(layoutOptions);
      
      layout.on('layoutstop', () => {
        if (config.fit) {
          if (config.animate) {
            this.cy!.animate({
              fit: { eles: this.cy!.elements(), padding: config.padding },
            }, {
              duration: 200,
              complete: () => resolve(),
            });
          } else {
            this.cy!.fit(this.cy!.elements(), config.padding);
            resolve();
          }
        } else {
          resolve();
        }
      });
      
      layout.run();
    });
  }

  /**
   * Generate stable hierarchy-based positions
   */
  private generateHierarchyPositions(config: LayoutConfig): { [nodeId: string]: { x: number; y: number } } {
    const positions: { [nodeId: string]: { x: number; y: number } } = {};
    const levelCounters: Record<number, number> = {};

    this.nodes.forEach(node => {
      const level = getNodeHierarchyLevel(node, this.hierarchyId);
      const index = levelCounters[level] || 0;
      levelCounters[level] = index + 1;

      // Check cache for stable positioning
      const cached = this.positionCache[node.id];
      if (cached && cached.layoutAlgorithm === 'preset') {
        positions[node.id] = { x: cached.x, y: cached.y };
      } else {
        // Generate new position
        positions[node.id] = {
          x: level * (config.levelSpacing || 200),
          y: index * (config.nodeSpacing || 100),
        };
      }
    });

    return positions;
  }

  /**
   * Cache current node positions for stability
   */
  private cacheCurrentPositions(algorithm: LayoutAlgorithm): void {
    if (!this.cy) return;

    const timestamp = Date.now();
    this.cy.nodes().forEach(node => {
      const position = node.position();
      this.positionCache[node.id()] = {
        x: position.x,
        y: position.y,
        timestamp,
        layoutAlgorithm: algorithm,
      };
    });

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

// Export singleton instance with hierarchical as default
export const layoutEngine = new LayoutEngine({ algorithm: 'hierarchical' });

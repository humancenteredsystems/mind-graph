/**
 * Layout Context - Pure layout state management
 * 
 * Manages layout algorithms independently of hierarchy concerns.
 * Uses the pure layout engine for clean Cytoscape.js positioning.
 */

import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { PureLayoutAlgorithm, PureLayoutConfig } from '../services/pureLayoutEngine';
import { log } from '../utils/logger';

interface LayoutContextType {
  // Current layout state
  activeLayout: PureLayoutAlgorithm;
  layoutConfig: PureLayoutConfig;
  
  // Layout control methods
  setActiveLayout: (layout: PureLayoutAlgorithm) => void;
  updateLayoutConfig: (updates: Partial<PureLayoutConfig>) => void;
  
  // Layout application (will be called by GraphView)
  applyLayoutToGraph: (cy: any) => Promise<void>;
  
  // Available layouts
  availableLayouts: PureLayoutAlgorithm[];
  layoutDisplayNames: Record<PureLayoutAlgorithm, string>;
}

const LayoutContext = createContext<LayoutContextType | undefined>(undefined);

interface LayoutProviderProps {
  children: ReactNode;
}

export const LayoutProvider: React.FC<LayoutProviderProps> = ({ children }) => {
  // Default to fcose layout
  const [activeLayout, setActiveLayoutState] = useState<PureLayoutAlgorithm>('fcose');
  const [layoutConfig, setLayoutConfig] = useState<PureLayoutConfig>({
    algorithm: 'fcose',
    animate: true,
    animationDuration: 500,
    fit: true,
    padding: 50,
    forceStrength: 0.45,
    repulsionStrength: 4500,
    springLength: 50,
  });

  // Available layouts and display names
  const availableLayouts: PureLayoutAlgorithm[] = [
    'fcose',
    'tree', 
    'hierarchical',
    'force',
    'circular',
    'concentric',
    'grid'
  ];

  const layoutDisplayNames: Record<PureLayoutAlgorithm, string> = {
    fcose: 'Force-Directed (Modern)',
    tree: 'Tree Structure',
    hierarchical: 'Hierarchical (Dagre)',
    force: 'Force-Directed (Classic)',
    circular: 'Circular',
    concentric: 'Concentric Circles',
    grid: 'Grid Layout',
  };

  // Set active layout and update config
  const setActiveLayout = useCallback((layout: PureLayoutAlgorithm) => {
    log('LayoutContext', `Setting active layout to: ${layout}`);
    setActiveLayoutState(layout);
    
    // Update config to match new layout
    setLayoutConfig(prev => ({
      ...prev,
      algorithm: layout,
    }));
  }, []);

  // Update layout configuration
  const updateLayoutConfig = useCallback((updates: Partial<PureLayoutConfig>) => {
    log('LayoutContext', `Updating layout config:`, updates);
    setLayoutConfig(prev => ({
      ...prev,
      ...updates,
    }));
  }, []);

  // Apply layout to Cytoscape graph (called by GraphView)
  const applyLayoutToGraph = useCallback(async (cy: any) => {
    if (!cy) {
      log('LayoutContext', 'No Cytoscape instance provided');
      return;
    }

    log('LayoutContext', `Applying ${activeLayout} layout to graph`);
    
    try {
      // Import the pure layout engine dynamically to avoid circular dependencies
      const { pureLayoutEngine } = await import('../services/pureLayoutEngine');
      
      // Initialize with current Cytoscape instance
      pureLayoutEngine.initialize(cy);
      
      // Apply the current layout
      await pureLayoutEngine.applyLayout(activeLayout, layoutConfig);
      
      log('LayoutContext', `Successfully applied ${activeLayout} layout`);
    } catch (error) {
      log('LayoutContext', `Error applying ${activeLayout} layout:`, error);
    }
  }, [activeLayout, layoutConfig]);

  const contextValue: LayoutContextType = {
    activeLayout,
    layoutConfig,
    setActiveLayout,
    updateLayoutConfig,
    applyLayoutToGraph,
    availableLayouts,
    layoutDisplayNames,
  };

  return (
    <LayoutContext.Provider value={contextValue}>
      {children}
    </LayoutContext.Provider>
  );
};

// Hook to use layout context
export const useLayout = (): LayoutContextType => {
  const context = useContext(LayoutContext);
  if (context === undefined) {
    throw new Error('useLayout must be used within a LayoutProvider');
  }
  return context;
};

// Export context for testing
export { LayoutContext };

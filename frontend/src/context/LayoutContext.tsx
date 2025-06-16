/**
 * Layout Context - Manages layout state and configuration
 * 
 * Provides centralized layout management with persistent preferences,
 * algorithm switching, and configuration updates.
 */

import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { LayoutAlgorithm, LayoutConfig, LayoutEngine, layoutEngine } from '../services/layoutEngine';
import { log } from '../utils/logger';

// Layout algorithm display names
const ALGORITHM_NAMES: Record<LayoutAlgorithm, string> = {
  hierarchical: 'Hierarchical (Klay)',
  'force-directed': 'Force-Directed',
  circular: 'Circular',
  grid: 'Grid',
  tree: 'Tree',
  manual: 'Manual',
  preset: 'Preset (Legacy)',
};

// Default layout configuration - SET HIERARCHICAL AS DEFAULT
const DEFAULT_LAYOUT_CONFIG: LayoutConfig = {
  algorithm: 'hierarchical',
  animate: true,
  animationDuration: 300,
  fit: true,
  padding: 20,
  respectHierarchy: true,
  levelSpacing: 200,
  nodeSpacing: 100,
};

// Context interface
interface LayoutContextType {
  // Current state
  currentAlgorithm: LayoutAlgorithm;
  currentConfig: LayoutConfig;
  availableAlgorithms: LayoutAlgorithm[];
  isLayouting: boolean;
  
  // Layout engine access
  layoutEngine: LayoutEngine;
  
  // Actions
  applyLayout: (algorithm?: LayoutAlgorithm, customConfig?: Partial<LayoutConfig>) => Promise<void>;
  updateConfig: (updates: Partial<LayoutConfig>) => void;
  resetToDefaults: () => void;
}

// Create context
const LayoutContext = createContext<LayoutContextType | undefined>(undefined);

// Storage key for persistence
const STORAGE_KEY = 'mims-graph-layout-config';

/**
 * Layout Provider Component
 */
export const LayoutProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentConfig, setCurrentConfig] = useState<LayoutConfig>(() => {
    // Load from localStorage if available
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        return { ...DEFAULT_LAYOUT_CONFIG, ...parsed };
      }
    } catch (error) {
      log('LayoutContext', 'Error loading layout config from storage:', error);
    }
    return DEFAULT_LAYOUT_CONFIG;
  });
  
  const [isLayouting, setIsLayouting] = useState(false);
  const availableAlgorithms = LayoutEngine.getAvailableAlgorithms();

  // Persist config changes to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(currentConfig));
    } catch (error) {
      log('LayoutContext', 'Error saving layout config to storage:', error);
    }
  }, [currentConfig]);

  // Update layout engine config when context config changes
  useEffect(() => {
    layoutEngine.updateConfig(currentConfig);
  }, [currentConfig]);

  const applyLayout = useCallback(async (algorithm?: LayoutAlgorithm, customConfig?: Partial<LayoutConfig>) => {
    setIsLayouting(true);
    try {
      await layoutEngine.applyLayout(algorithm, customConfig);
      
      // Update current config if algorithm changed
      if (algorithm && algorithm !== currentConfig.algorithm) {
        const newConfig = {
          ...currentConfig,
          ...LayoutEngine.getDefaultConfig(algorithm),
          ...customConfig,
          algorithm,
        };
        setCurrentConfig(newConfig);
      }
    } catch (error) {
      log('LayoutContext', 'Error applying layout:', error);
    } finally {
      setIsLayouting(false);
    }
  }, [currentConfig]);

  const updateConfig = useCallback((updates: Partial<LayoutConfig>) => {
    setCurrentConfig(prev => ({ ...prev, ...updates }));
  }, []);

  const resetToDefaults = useCallback(() => {
    setCurrentConfig(DEFAULT_LAYOUT_CONFIG);
    layoutEngine.clearCache();
  }, []);

  const contextValue: LayoutContextType = {
    currentAlgorithm: currentConfig.algorithm,
    currentConfig,
    availableAlgorithms,
    isLayouting,
    layoutEngine,
    applyLayout,
    updateConfig,
    resetToDefaults,
  };

  return (
    <LayoutContext.Provider value={contextValue}>
      {children}
    </LayoutContext.Provider>
  );
};

/**
 * Hook to use layout context
 */
export const useLayoutContext = (): LayoutContextType => {
  const context = useContext(LayoutContext);
  if (!context) {
    throw new Error('useLayoutContext must be used within a LayoutProvider');
  }
  return context;
};

/**
 * Hook to get algorithm display names
 */
export const useLayoutAlgorithmNames = (): Record<LayoutAlgorithm, string> => {
  return ALGORITHM_NAMES;
};

/**
 * Hook for layout configuration management
 */
export const useLayoutConfig = () => {
  const { currentConfig, updateConfig, resetToDefaults } = useLayoutContext();
  
  return {
    config: currentConfig,
    updateConfig,
    resetToDefaults,
    
    // Convenience setters
    setAnimate: (animate: boolean) => updateConfig({ animate }),
    setFit: (fit: boolean) => updateConfig({ fit }),
    setRespectHierarchy: (respectHierarchy: boolean) => updateConfig({ respectHierarchy }),
    setAnimationDuration: (animationDuration: number) => updateConfig({ animationDuration }),
    setPadding: (padding: number) => updateConfig({ padding }),
  };
};

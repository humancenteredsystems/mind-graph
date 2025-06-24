import { useState, useCallback, useEffect } from 'react';
import { NodeTypeStyle, HierarchyStyleConfig, generateStyleKey, getDefaultStyleForType } from '../types/nodeStyle';
import { log } from '../utils/logger';

interface UseHierarchyStyles {
  customStyles: Map<string, NodeTypeStyle>;
  getStyleForType: (hierarchyId: string, levelId: string, nodeType: string) => NodeTypeStyle;
  updateStyle: (hierarchyId: string, levelId: string, nodeType: string, style: NodeTypeStyle) => void;
  resetToDefault: (hierarchyId: string, levelId: string, nodeType: string) => void;
  hasCustomStyle: (hierarchyId: string, levelId: string, nodeType: string) => boolean;
  loadStyles: () => void;
  saveStyles: () => void;
}

/**
 * Hook for managing custom node type styles within hierarchy levels
 * Provides local storage persistence and style resolution
 */
export const useHierarchyStyles = (): UseHierarchyStyles => {
  const [customStyles, setCustomStyles] = useState<Map<string, NodeTypeStyle>>(new Map());

  // Load styles from localStorage on mount
  useEffect(() => {
    loadStyles();
  }, []);

  const loadStyles = useCallback(() => {
    try {
      const stored = localStorage.getItem('hierarchyStyles');
      if (stored) {
        const parsed = JSON.parse(stored) as HierarchyStyleConfig[];
        const styleMap = new Map<string, NodeTypeStyle>();
        
        parsed.forEach(config => {
          const key = generateStyleKey(config.hierarchyId, config.levelId, config.nodeType);
          styleMap.set(key, config.style);
        });
        
        setCustomStyles(styleMap);
        log('useHierarchyStyles', `Loaded ${styleMap.size} custom styles from localStorage`);
      }
    } catch (error) {
      log('useHierarchyStyles', 'Error loading styles from localStorage:', error);
    }
  }, []);

  const saveStyles = useCallback(() => {
    try {
      const configs: HierarchyStyleConfig[] = [];
      
      customStyles.forEach((style, key) => {
        const [hierarchyId, levelId, nodeType] = key.split('-');
        configs.push({
          hierarchyId,
          levelId,
          nodeType,
          style
        });
      });
      
      localStorage.setItem('hierarchyStyles', JSON.stringify(configs));
      log('useHierarchyStyles', `Saved ${configs.length} custom styles to localStorage`);
    } catch (error) {
      log('useHierarchyStyles', 'Error saving styles to localStorage:', error);
    }
  }, [customStyles]);

  const getStyleForType = useCallback((
    hierarchyId: string, 
    levelId: string, 
    nodeType: string
  ): NodeTypeStyle => {
    const key = generateStyleKey(hierarchyId, levelId, nodeType);
    const customStyle = customStyles.get(key);
    
    if (customStyle) {
      return customStyle;
    }
    
    // Return default style for the node type
    return getDefaultStyleForType(nodeType);
  }, [customStyles]);

  const updateStyle = useCallback((
    hierarchyId: string, 
    levelId: string, 
    nodeType: string, 
    style: NodeTypeStyle
  ) => {
    const key = generateStyleKey(hierarchyId, levelId, nodeType);
    
    setCustomStyles(prev => {
      const newMap = new Map(prev);
      newMap.set(key, style);
      return newMap;
    });
    
    log('useHierarchyStyles', `Updated style for ${nodeType} in ${hierarchyId}-${levelId}`);
    
    // Auto-save after update
    setTimeout(() => saveStyles(), 100);
  }, [saveStyles]);

  const resetToDefault = useCallback((
    hierarchyId: string, 
    levelId: string, 
    nodeType: string
  ) => {
    const key = generateStyleKey(hierarchyId, levelId, nodeType);
    
    setCustomStyles(prev => {
      const newMap = new Map(prev);
      newMap.delete(key);
      return newMap;
    });
    
    log('useHierarchyStyles', `Reset style to default for ${nodeType} in ${hierarchyId}-${levelId}`);
    
    // Auto-save after reset
    setTimeout(() => saveStyles(), 100);
  }, [saveStyles]);

  const hasCustomStyle = useCallback((
    hierarchyId: string, 
    levelId: string, 
    nodeType: string
  ): boolean => {
    const key = generateStyleKey(hierarchyId, levelId, nodeType);
    return customStyles.has(key);
  }, [customStyles]);

  return {
    customStyles,
    getStyleForType,
    updateStyle,
    resetToDefault,
    hasCustomStyle,
    loadStyles,
    saveStyles,
  };
};

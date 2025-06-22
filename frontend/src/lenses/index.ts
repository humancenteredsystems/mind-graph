/**
 * Lens Registry - Central registry for all available graph lenses
 * 
 * Manages dynamic hierarchy lens generation only.
 * Layout is handled separately by LayoutContext.
 */

import { LensDefinition, LensRegistry, Hierarchy } from '@mims/lens-types';
import { theme } from '../config';

// No static lenses - only dynamic hierarchy lenses
export const staticLensRegistry: LensRegistry = {};

/**
 * Generate a hierarchy-specific lens dynamically
 */
export const generateHierarchyLens = (hierarchy: Hierarchy): LensDefinition => ({
  id: `hierarchy-${hierarchy.id}`,
  label: `${hierarchy.name}${hierarchy.version ? ` (${hierarchy.version})` : ''}`,
  icon: '🌳',
  compute: {
    endpoint: '/api/compute/hierarchyView',
    params: { hierarchyId: hierarchy.id }
  },
  filter: (node) => {
    // Filter nodes that have assignments to this hierarchy
    if (!node || !node.assignments) return false;
    return Array.isArray(node.assignments) && 
           node.assignments.some((assignment: any) => 
             assignment.hierarchyId === hierarchy.id || 
             assignment.hierarchy?.id === hierarchy.id
           );
  },
  map: (el) => {
    // Add hierarchy-specific data to elements
    if ('assignments' in el && Array.isArray(el.assignments)) {
      const hierarchyAssignment = el.assignments.find((assignment: any) => 
        assignment.hierarchyId === hierarchy.id || 
        assignment.hierarchy?.id === hierarchy.id
      );
      
      if (hierarchyAssignment) {
        return {
          ...el,
          hierarchyLevel: hierarchyAssignment.levelNumber || hierarchyAssignment.level?.levelNumber,
          levelLabel: hierarchyAssignment.levelLabel || hierarchyAssignment.level?.label,
        };
      }
    }
    return el;
  },
  style: (el) => {
    // Style nodes based on hierarchy level
    const levelNumber = (el as any).hierarchyLevel || 1;
    const levelColor = (theme.colors.levels as any)[levelNumber] || theme.colors.node.default;
    
    return {
      'background-color': levelColor,
      'border-color': theme.colors.node.border.default,
      'border-width': 2,
      // Add special styling for level 1 (top level)
      ...(levelNumber === 1 && { shape: 'ellipse' }),
    };
  },
  layout: { 
    name: 'dagre', 
    options: { 
      rankDir: 'TB',
      animate: true,
      fit: true,
      padding: 30,
    } 
  }
});

/**
 * Get complete lens registry including dynamic hierarchy lenses
 */
export const getLensRegistry = (hierarchies: Hierarchy[]): LensRegistry => {
  const dynamicLenses: LensRegistry = {};
  
  // Generate hierarchy lenses
  hierarchies.forEach(hierarchy => {
    const lens = generateHierarchyLens(hierarchy);
    dynamicLenses[lens.id] = lens;
  });
  
  return {
    ...staticLensRegistry,
    ...dynamicLenses,
  };
};

/**
 * Get lens by ID from complete registry
 */
export const getLens = (lensId: string, hierarchies: Hierarchy[]): LensDefinition | undefined => {
  const registry = getLensRegistry(hierarchies);
  return registry[lensId];
};

/**
 * Check if a lens ID represents a hierarchy lens
 */
export const isHierarchyLens = (lensId: string): boolean => {
  return lensId.startsWith('hierarchy-');
};

/**
 * Extract hierarchy ID from hierarchy lens ID
 */
export const getHierarchyIdFromLens = (lensId: string): string | null => {
  if (!isHierarchyLens(lensId)) return null;
  return lensId.replace('hierarchy-', '');
};

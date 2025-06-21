/**
 * Type Cluster Lens - Groups nodes by type with distinct colors
 */

import { LensDefinition } from '@mims/lens-types';
import { theme } from '../config';

const typeClusterLens: LensDefinition = {
  id: 'type-cluster',
  label: 'Type Clusters',
  icon: '📦',
  layout: { 
    name: 'cose-bilkent',
    options: {
      animate: true,
      fit: true,
      padding: 30,
      nodeRepulsion: 4500,
      idealEdgeLength: 50,
    }
  },
  style: (el) => {
    // Color nodes based on their type
    const nodeType = el.type || 'default';
    const typeColors: Record<string, string> = {
      'Person': theme.colors.levels[1],
      'Organization': theme.colors.levels[2], 
      'Project': theme.colors.levels[3],
      'Technology': theme.colors.levels[4],
      'Concept': theme.colors.levels[5],
      'Event': theme.colors.levels[6],
      'Location': theme.colors.levels[7],
      'default': theme.colors.node.default,
    };
    
    return {
      'background-color': typeColors[nodeType] || typeColors.default,
      'border-color': theme.colors.node.border.default,
      'border-width': 2,
    };
  },
};

export default typeClusterLens;

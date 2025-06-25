import type { NodeTypeStyle } from '../types/nodeStyle';
import { theme } from '../config/theme';

/**
 * Generate Cytoscape style entries for hierarchy levels based on theme colors.
 */
export function getLevelStyles(): any[] {
  return Object.entries(theme.colors.levels).map(([level, color]) => ({
    selector: `node[levelNumber=${level}][isAssigned="true"]`,
    style: {
      'background-color': color,
      // You can add default shapes or other style for specific levels here
    },
  }));
}

/**
 * Generate style for unassigned nodes.
 */
export function getUnassignedStyle(): any {
  return {
    selector: 'node[isAssigned="false"]',
    style: {
      'background-color': theme.colors.node.unassigned,
      'border-style': 'dashed',
      'border-width': '2px',
      'border-color': theme.colors.border.default,
      'opacity': 0.7,
    },
  };
}

/**
 * Generate Cytoscape style entries for node type default shapes from theme.
 */
export function getTypeShapeStyles(): any[] {
  return Object.entries(theme.components.node.typeStyles.shapes).map(([type, shape]) => ({
    selector: `node[type="${type}"]`,
    style: { shape }
  }));
}

/**
 * Generate Cytoscape style entries for node type border styles from theme.
 */
export function getTypeBorderStyles(): any[] {
  return Object.entries(theme.components.node.typeStyles.borders).map(([type, border]) => ({
    selector: `node[type="${type}"]`,
    style: {
      'border-style': border.style,
      'border-width': `${border.width}px`
    }
  }));
}

/**
 * Generate Cytoscape style entries for user-defined custom styles.
 * customStyles: Map with keys "hierarchyId-levelId-nodeType"
 */
export function getCustomStyles(customStyles: Map<string, NodeTypeStyle>, hierarchyId: string): any[] {
  const styles: any[] = [];
  customStyles.forEach((style, key) => {
    const [hid, levelId, nodeType] = key.split('-');
    if (hid !== hierarchyId) return;
    // Match by hierarchyId, levelId and type
    const selector = `node[hierarchyId="${hid}"][levelId="${levelId}"][type="${nodeType}"]`;
    styles.push({
      selector,
      style: {
        shape: style.shape,
        'background-color': style.backgroundColor,
        'border-color': style.borderColor,
        'border-width': `${style.borderWidth}px`,
        'border-style': style.borderStyle,
        'color': style.textColor,
        'text-halign': style.textAlign,
        'text-valign': style.textAlign,
      }
    });
  });
  return styles;
}

/**
 * Compose all dynamic Cytoscape styles for a given hierarchy.
 */
export function getCytoscapeStyles(customStyles: Map<string, NodeTypeStyle>, hierarchyId: string): any[] {
  const levelStyles = getLevelStyles();
  const unassigned = getUnassignedStyle();
  const shapeStyles = getTypeShapeStyles();
  const borderStyles = getTypeBorderStyles();
  const custom = getCustomStyles(customStyles, hierarchyId);
  return [...levelStyles, unassigned, ...shapeStyles, ...borderStyles, ...custom];
}

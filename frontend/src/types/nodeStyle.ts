/**
 * Node Type Styling System Types
 * Defines interfaces for customizable node styling within hierarchy levels
 */

export interface NodeTypeStyle {
  shape: 'ellipse' | 'round-rectangle' | 'diamond' | 'hexagon' | 'triangle' | 'octagon' | 'star';
  backgroundColor: string;
  textColor: string;
  textAlign: 'left' | 'center' | 'right';
  borderColor: string;
  borderWidth: number;
  borderStyle: 'solid' | 'dashed' | 'dotted' | 'double';
}

export interface HierarchyStyleConfig {
  hierarchyId: string;
  levelId: string;
  nodeType: string;
  style: NodeTypeStyle;
}

export interface NodeTypeStyleModalProps {
  open: boolean;
  hierarchyId: string;
  levelId: string;
  nodeType: string;
  currentStyle?: NodeTypeStyle;
  onSave: (style: NodeTypeStyle) => void;
  onCancel: () => void;
}

export interface NodeStylePreviewProps {
  style: NodeTypeStyle;
  nodeType: string;
  label?: string;
}

// Default styles for different node types
export const DEFAULT_NODE_TYPE_STYLES: Record<string, NodeTypeStyle> = {
  Person: {
    shape: 'ellipse',
    backgroundColor: '#3b82f6',
    textColor: '#ffffff',
    textAlign: 'center',
    borderColor: '#1e40af',
    borderWidth: 2,
    borderStyle: 'solid',
  },
  Concept: {
    shape: 'round-rectangle',
    backgroundColor: '#10b981',
    textColor: '#ffffff',
    textAlign: 'center',
    borderColor: '#047857',
    borderWidth: 1,
    borderStyle: 'solid',
  },
  Project: {
    shape: 'diamond',
    backgroundColor: '#f59e0b',
    textColor: '#ffffff',
    textAlign: 'center',
    borderColor: '#d97706',
    borderWidth: 2,
    borderStyle: 'dashed',
  },
  Skill: {
    shape: 'hexagon',
    backgroundColor: '#8b5cf6',
    textColor: '#ffffff',
    textAlign: 'center',
    borderColor: '#7c3aed',
    borderWidth: 1,
    borderStyle: 'solid',
  },
  Tool: {
    shape: 'triangle',
    backgroundColor: '#ef4444',
    textColor: '#ffffff',
    textAlign: 'center',
    borderColor: '#dc2626',
    borderWidth: 2,
    borderStyle: 'dotted',
  },
  Resource: {
    shape: 'octagon',
    backgroundColor: '#06b6d4',
    textColor: '#ffffff',
    textAlign: 'center',
    borderColor: '#0891b2',
    borderWidth: 3,
    borderStyle: 'double',
  },
  Event: {
    shape: 'star',
    backgroundColor: '#84cc16',
    textColor: '#ffffff',
    textAlign: 'center',
    borderColor: '#65a30d',
    borderWidth: 1,
    borderStyle: 'dashed',
  },
  default: {
    shape: 'round-rectangle',
    backgroundColor: '#6b7280',
    textColor: '#ffffff',
    textAlign: 'center',
    borderColor: '#4b5563',
    borderWidth: 1,
    borderStyle: 'solid',
  },
};

// Shape options for the style modal
export const SHAPE_OPTIONS = [
  { value: 'round-rectangle', label: 'Rectangle' },
  { value: 'ellipse', label: 'Circle' },
  { value: 'diamond', label: 'Diamond' },
  { value: 'hexagon', label: 'Hexagon' },
  { value: 'triangle', label: 'Triangle' },
  { value: 'octagon', label: 'Octagon' },
  { value: 'star', label: 'Star' },
] as const;

// Border style options for the style modal
export const BORDER_STYLE_OPTIONS = [
  { value: 'solid', label: 'Solid' },
  { value: 'dashed', label: 'Dashed' },
  { value: 'dotted', label: 'Dotted' },
  { value: 'double', label: 'Double' },
] as const;

// Text alignment options for the style modal
export const TEXT_ALIGN_OPTIONS = [
  { value: 'left', label: 'Left' },
  { value: 'center', label: 'Center' },
  { value: 'right', label: 'Right' },
] as const;

// Utility function to get default style for a node type
export const getDefaultStyleForType = (nodeType: string): NodeTypeStyle => {
  return DEFAULT_NODE_TYPE_STYLES[nodeType] || DEFAULT_NODE_TYPE_STYLES.default;
};

// Utility function to generate style key for storage
export const generateStyleKey = (hierarchyId: string, levelId: string, nodeType: string): string => {
  return `${hierarchyId}-${levelId}-${nodeType}`;
};

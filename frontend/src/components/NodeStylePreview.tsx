import React from 'react';
import { NodeTypeStyle } from '../types/nodeStyle';
import { buildNodePreviewStyle } from '../utils/styleUtils';

interface NodeStylePreviewProps {
  style: NodeTypeStyle;
  nodeType: string;
  size?: { width: number; height: number };
  fontSize?: number;
  showLabel?: boolean;
}

/**
 * Reusable component for displaying styled node previews
 * Used in both NodeTypeStyleModal and HierarchyLandingPad
 */
const NodeStylePreview: React.FC<NodeStylePreviewProps> = ({
  style,
  nodeType,
  size = { width: 60, height: 30 },
  fontSize = 11,
  showLabel = true
}) => {
  const previewStyle = buildNodePreviewStyle(style, size, fontSize);

  return (
    <div style={previewStyle}>
      {showLabel ? nodeType : ''}
    </div>
  );
};

export default NodeStylePreview;

/**
 * Graph Tools Panel - Reorganized with General and Views sub-panels
 * 
 * Provides organized access to graph management tools with clear separation:
 * - General Sub-Panel: Data management and analysis tools
 * - Views Sub-Panel: Layout, hierarchy, and filtering controls
 */

import React from 'react';
import { theme } from '../config';
import GeneralSubPanel from './GeneralSubPanel';
import ViewsSubPanel from './ViewsSubPanel';

interface GraphToolsPanelProps {
  style?: React.CSSProperties;
}

const GraphToolsPanel: React.FC<GraphToolsPanelProps> = ({ style }) => {
  // Main panel styles
  const panelStyle: React.CSSProperties = {
    background: theme.colors.background.primary,
    border: `1px solid ${theme.colors.border.default}`,
    borderRadius: '8px',
    padding: '12px',
    boxShadow: theme.components.modal.shadow,
    display: 'flex',
    flexDirection: 'column',
    gap: '20px',
    height: 'fit-content',
    ...style,
  };

  const subPanelStyle: React.CSSProperties = {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
  };

  const dividerStyle: React.CSSProperties = {
    height: '1px',
    backgroundColor: theme.colors.border.default,
    margin: '8px 0',
  };

  return (
    <div style={panelStyle}>
      {/* General Sub-Panel */}
      <div style={subPanelStyle}>
        <GeneralSubPanel />
      </div>

      {/* Divider */}
      <div style={dividerStyle} />

      {/* Views Sub-Panel */}
      <div style={subPanelStyle}>
        <ViewsSubPanel />
      </div>
    </div>
  );
};

export default GraphToolsPanel;

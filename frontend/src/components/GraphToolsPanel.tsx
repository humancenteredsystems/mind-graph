/**
 * Graph Tools Panel - Enhanced right panel with collapsible sections
 * 
 * Provides organized access to graph management tools including:
 * - Data Tools: Import/Export, Bulk Operations
 * - Layout: Layout algorithm controls
 * - Analysis: Future graph analysis tools
 * - View: Future filters and search tools
 */

import React from 'react';
import { useLayoutContext, useLayoutAlgorithmNames } from '../context/LayoutContext';
import { useUIContext } from '../hooks/useUI';
import { theme } from '../config';
import { log } from '../utils/logger';
import { buildDataToolsButtonStyle, buildGraphToolsSectionStyle, css } from '../utils/styleUtils';
import CollapsibleSection from './CollapsibleSection';

interface GraphToolsPanelProps {
  style?: React.CSSProperties;
}

const GraphToolsPanel: React.FC<GraphToolsPanelProps> = ({ style }) => {
  const { 
    currentAlgorithm, 
    availableAlgorithms, 
    applyLayout, 
    isLayouting,
    currentConfig,
    updateConfig,
    layoutEngine 
  } = useLayoutContext();
  
  const { openImportExportModal } = useUIContext();
  const algorithmNames = useLayoutAlgorithmNames();

  // Layout control handlers (moved from original LayoutControls)
  const handleAlgorithmChange = async (algorithm: string) => {
    log('GraphToolsPanel', `Switching to ${algorithm} layout`);
    await applyLayout(algorithm as any);
  };

  const handleAnimationToggle = () => {
    const newValue = !currentConfig.animate;
    updateConfig({ animate: newValue });
    log('GraphToolsPanel', `Animation ${newValue ? 'enabled' : 'disabled'}`);
  };

  const handleFitToggle = () => {
    const newValue = !currentConfig.fit;
    updateConfig({ fit: newValue });
    log('GraphToolsPanel', `Fit to view ${newValue ? 'enabled' : 'disabled'}`);
  };

  const handleHierarchyToggle = () => {
    const newValue = !currentConfig.respectHierarchy;
    updateConfig({ respectHierarchy: newValue });
    log('GraphToolsPanel', `Hierarchy respect ${newValue ? 'enabled' : 'disabled'}`);
  };

  const handleResetLayout = async () => {
    log('GraphToolsPanel', 'Resetting layout and clearing cache');
    layoutEngine.clearCache();
    await applyLayout(currentAlgorithm);
  };

  // Import/Export handlers
  const handleImportExport = () => {
    log('GraphToolsPanel', 'Opening Import/Export wizard');
    openImportExportModal();
  };

  // Styles (reusing existing patterns)
  const panelStyle: React.CSSProperties = {
    background: theme.colors.background.primary,
    border: `1px solid ${theme.colors.border.default}`,
    borderRadius: '8px',
    padding: '12px',
    boxShadow: theme.components.modal.shadow,
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
    height: 'fit-content',
    ...style,
  };

  const selectStyle: React.CSSProperties = {
    padding: '6px 8px',
    border: `1px solid ${theme.colors.border.default}`,
    borderRadius: '4px',
    fontSize: '14px',
    backgroundColor: theme.colors.background.primary,
    color: theme.colors.text.primary,
    cursor: 'pointer',
  };

  const buttonStyle: React.CSSProperties = {
    padding: '4px 8px',
    border: `1px solid ${theme.colors.border.default}`,
    borderRadius: '4px',
    fontSize: '12px',
    backgroundColor: theme.colors.background.secondary,
    color: theme.colors.text.primary,
    cursor: 'pointer',
    transition: 'all 0.2s ease',
  };

  const activeButtonStyle: React.CSSProperties = {
    ...buttonStyle,
    backgroundColor: theme.colors.node.selected,
    borderColor: theme.colors.border.active,
  };

  const resetButtonStyle: React.CSSProperties = {
    ...buttonStyle,
    backgroundColor: theme.colors.background.error,
    color: theme.colors.text.inverse,
    fontSize: '11px',
    padding: '3px 6px',
  };

  const toggleRowStyle: React.CSSProperties = {
    display: 'flex',
    gap: '8px',
    alignItems: 'center',
  };

  const toggleStyle: React.CSSProperties = {
    fontSize: '11px',
    padding: '2px 6px',
    minWidth: '50px',
    textAlign: 'center' as const,
  };

  return (
    <div style={panelStyle}>
      {/* Data Tools Section */}
      <CollapsibleSection 
        title="Data Tools" 
        icon="📊"
        defaultExpanded={true}
      >
        <div style={buildGraphToolsSectionStyle()}>
          <button
            onClick={handleImportExport}
            style={buildDataToolsButtonStyle(false)}
            title="Import or export graph data"
          >
            📥📤 Import/Export
          </button>
          
          {/* Placeholder for future bulk operations */}
          <button
            disabled
            style={buildDataToolsButtonStyle(true)}
            title="Coming soon: Bulk operations for selected nodes"
          >
            🔧 Bulk Operations
          </button>
        </div>
      </CollapsibleSection>

      {/* Layout Section */}
      <CollapsibleSection 
        title="Layout" 
        icon="🎯"
        defaultExpanded={true}
      >
        <div style={buildGraphToolsSectionStyle()}>
          <div>
            <select
              value={currentAlgorithm}
              onChange={(e) => handleAlgorithmChange(e.target.value)}
              disabled={isLayouting}
              style={{
                ...selectStyle,
                opacity: isLayouting ? 0.6 : 1,
                cursor: isLayouting ? 'not-allowed' : 'pointer',
                width: '100%',
              }}
            >
              {availableAlgorithms.map(algorithm => (
                <option key={algorithm} value={algorithm}>
                  {algorithmNames[algorithm]}
                </option>
              ))}
            </select>
          </div>

          <div style={toggleRowStyle}>
            <button
              onClick={handleAnimationToggle}
              style={currentConfig.animate ? activeButtonStyle : { ...buttonStyle, ...toggleStyle }}
              disabled={isLayouting}
            >
              Animate
            </button>
            
            <button
              onClick={handleFitToggle}
              style={currentConfig.fit ? activeButtonStyle : { ...buttonStyle, ...toggleStyle }}
              disabled={isLayouting}
            >
              Fit View
            </button>
          </div>

          <div>
            <button
              onClick={handleHierarchyToggle}
              style={currentConfig.respectHierarchy ? activeButtonStyle : { ...buttonStyle, ...toggleStyle }}
              disabled={isLayouting}
            >
              Respect Hierarchy
            </button>
          </div>

          <div>
            <button
              onClick={handleResetLayout}
              style={resetButtonStyle}
              disabled={isLayouting}
              title="Clear cached positions and reset layout"
            >
              Reset Layout
            </button>
          </div>

          {isLayouting && (
            <div style={{
              fontSize: '12px',
              color: theme.colors.text.secondary,
              textAlign: 'center' as const,
              fontStyle: 'italic',
            }}>
              Applying layout...
            </div>
          )}
        </div>
      </CollapsibleSection>

      {/* Analysis Section */}
      <CollapsibleSection 
        title="Analysis" 
        icon="📈"
        defaultExpanded={false}
      >
        <div style={buildGraphToolsSectionStyle()}>
          <button
            disabled
            style={buildDataToolsButtonStyle(true)}
            title="Coming soon: Graph metrics and analysis tools"
          >
            📊 Graph Metrics
          </button>
          
          <button
            disabled
            style={buildDataToolsButtonStyle(true)}
            title="Coming soon: Path finding and analysis"
          >
            🔍 Path Analysis
          </button>
        </div>
      </CollapsibleSection>

      {/* View Section */}
      <CollapsibleSection 
        title="View" 
        icon="👁️"
        defaultExpanded={false}
      >
        <div style={buildGraphToolsSectionStyle()}>
          <button
            disabled
            style={buildDataToolsButtonStyle(true)}
            title="Coming soon: Node and edge filtering"
          >
            🔽 Filters
          </button>
          
          <button
            disabled
            style={buildDataToolsButtonStyle(true)}
            title="Coming soon: Search functionality"
          >
            🔍 Search
          </button>
        </div>
      </CollapsibleSection>
    </div>
  );
};

export default GraphToolsPanel;

/**
 * Layout Controls - UI component for switching between layout algorithms
 * 
 * Provides a toolbar with layout algorithm selection and quick controls
 * for applying different layouts to the graph visualization.
 */

import React from 'react';
import { useLayoutContext, useLayoutAlgorithmNames } from '../context/LayoutContext';
import { theme } from '../config';
import { log } from '../utils/logger';

interface LayoutControlsProps {
  style?: React.CSSProperties;
}

const LayoutControls: React.FC<LayoutControlsProps> = ({ style }) => {
  const { 
    currentAlgorithm, 
    availableAlgorithms, 
    applyLayout, 
    isLayouting,
    currentConfig,
    updateConfig,
    layoutEngine 
  } = useLayoutContext();
  
  const algorithmNames = useLayoutAlgorithmNames();

  const handleAlgorithmChange = async (algorithm: string) => {
    log('LayoutControls', `Switching to ${algorithm} layout`);
    await applyLayout(algorithm as any);
  };

  const handleAnimationToggle = () => {
    const newValue = !currentConfig.animate;
    updateConfig({ animate: newValue });
    log('LayoutControls', `Animation ${newValue ? 'enabled' : 'disabled'}`);
  };

  const handleFitToggle = () => {
    const newValue = !currentConfig.fit;
    updateConfig({ fit: newValue });
    log('LayoutControls', `Fit to view ${newValue ? 'enabled' : 'disabled'}`);
  };

  const handleHierarchyToggle = () => {
    const newValue = !currentConfig.respectHierarchy;
    updateConfig({ respectHierarchy: newValue });
    log('LayoutControls', `Hierarchy respect ${newValue ? 'enabled' : 'disabled'}`);
  };

  const handleResetLayout = async () => {
    log('LayoutControls', 'Resetting layout and clearing cache');
    layoutEngine.clearCache();
    await applyLayout(currentAlgorithm);
  };

  const controlsStyle: React.CSSProperties = {
    position: 'absolute',
    top: '10px',
    right: '10px',
    background: theme.colors.background.primary,
    border: `1px solid ${theme.colors.border.default}`,
    borderRadius: '8px',
    padding: '12px',
    boxShadow: theme.components.modal.shadow,
    zIndex: theme.zIndex.dropdown,
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
    minWidth: '200px',
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

  const labelStyle: React.CSSProperties = {
    fontSize: '12px',
    fontWeight: 600,
    color: theme.colors.text.primary,
    marginBottom: '4px',
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
    <div style={controlsStyle}>
      <div>
        <div style={labelStyle}>Layout Algorithm</div>
        <select
          value={currentAlgorithm}
          onChange={(e) => handleAlgorithmChange(e.target.value)}
          disabled={isLayouting}
          style={{
            ...selectStyle,
            opacity: isLayouting ? 0.6 : 1,
            cursor: isLayouting ? 'not-allowed' : 'pointer',
          }}
        >
          {availableAlgorithms.map(algorithm => (
            <option key={algorithm} value={algorithm}>
              {algorithmNames[algorithm]}
            </option>
          ))}
        </select>
      </div>

      <div>
        <div style={labelStyle}>Options</div>
        
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

        <div style={{ marginTop: '4px' }}>
          <button
            onClick={handleHierarchyToggle}
            style={currentConfig.respectHierarchy ? activeButtonStyle : { ...buttonStyle, ...toggleStyle }}
            disabled={isLayouting}
          >
            Respect Hierarchy
          </button>
        </div>

        <div style={{ marginTop: '8px' }}>
          <button
            onClick={handleResetLayout}
            style={resetButtonStyle}
            disabled={isLayouting}
            title="Clear cached positions and reset layout"
          >
            Reset Layout
          </button>
        </div>
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
  );
};

export default LayoutControls;

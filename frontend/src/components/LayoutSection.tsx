/**
 * LayoutSection - Layout algorithm selection and controls
 * 
 * Extracted from GraphToolsPanel to be part of ViewsSubPanel.
 * Manages layout algorithm selection and configuration.
 */

import React from 'react';
import { useLayoutContext, useLayoutAlgorithmNames } from '../context/LayoutContext';
import CollapsibleSection from './CollapsibleSection';
import { theme } from '../config';
import { log } from '../utils/logger';

export const LayoutSection: React.FC = () => {
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

  // Layout control handlers
  const handleAlgorithmChange = async (algorithm: string) => {
    log('LayoutSection', `Switching to ${algorithm} layout`);
    await applyLayout(algorithm as any);
  };

  const handleAnimationToggle = () => {
    const newValue = !currentConfig.animate;
    updateConfig({ animate: newValue });
    log('LayoutSection', `Animation ${newValue ? 'enabled' : 'disabled'}`);
  };

  const handleFitToggle = () => {
    const newValue = !currentConfig.fit;
    updateConfig({ fit: newValue });
    log('LayoutSection', `Fit to view ${newValue ? 'enabled' : 'disabled'}`);
  };

  const handleHierarchyToggle = () => {
    const newValue = !currentConfig.respectHierarchy;
    updateConfig({ respectHierarchy: newValue });
    log('LayoutSection', `Hierarchy respect ${newValue ? 'enabled' : 'disabled'}`);
  };

  const handleResetLayout = async () => {
    log('LayoutSection', 'Resetting layout and clearing cache');
    layoutEngine.clearCache();
    await applyLayout(currentAlgorithm);
  };

  // Styles (reusing existing patterns)
  const selectStyle: React.CSSProperties = {
    padding: '6px 8px',
    border: `1px solid ${theme.colors.border.default}`,
    borderRadius: '4px',
    fontSize: '14px',
    backgroundColor: theme.colors.background.primary,
    color: theme.colors.text.primary,
    cursor: 'pointer',
    width: '100%',
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
    <CollapsibleSection 
      title="Layout" 
      icon="🎯"
      defaultExpanded={true}
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        {/* Algorithm Selection */}
        <div>
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

        {/* Layout Options */}
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
  );
};

export default LayoutSection;

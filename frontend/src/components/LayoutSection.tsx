/**
 * LayoutSection - Pure layout algorithm selection and controls
 * 
 * Uses the new pure layout system with no hierarchy coupling.
 * Manages spatial positioning algorithms independently.
 */

import React, { useState } from 'react';
import { useLayout } from '../context/LayoutContext';
import CollapsibleSection from './CollapsibleSection';
import { theme } from '../config';
import { log } from '../utils/logger';

export const LayoutSection: React.FC = () => {
  const { 
    activeLayout,
    layoutConfig,
    availableLayouts,
    layoutDisplayNames,
    setActiveLayout,
    updateLayoutConfig,
  } = useLayout();
  
  const [isApplying, setIsApplying] = useState(false);

  // Layout control handlers
  const handleAlgorithmChange = async (algorithm: string) => {
    log('LayoutSection', `Switching to ${algorithm} layout`);
    setIsApplying(true);
    try {
      setActiveLayout(algorithm as any);
      // Layout will be applied automatically by GraphView when context changes
    } finally {
      setIsApplying(false);
    }
  };

  const handleAnimationToggle = () => {
    const newValue = !layoutConfig.animate;
    updateLayoutConfig({ animate: newValue });
    log('LayoutSection', `Animation ${newValue ? 'enabled' : 'disabled'}`);
  };

  const handleFitToggle = () => {
    const newValue = !layoutConfig.fit;
    updateLayoutConfig({ fit: newValue });
    log('LayoutSection', `Fit to view ${newValue ? 'enabled' : 'disabled'}`);
  };

  const handleLiveUpdateToggle = () => {
    const newValue = !layoutConfig.liveUpdate;
    updateLayoutConfig({ liveUpdate: newValue });
    log('LayoutSection', `Live update ${newValue ? 'enabled' : 'disabled'}`);
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

  // Show live update toggle only for force-directed layouts
  const showLiveUpdate = activeLayout === 'fcose' || activeLayout === 'force';

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
            value={activeLayout}
            onChange={(e) => handleAlgorithmChange(e.target.value)}
            disabled={isApplying}
            style={{
              ...selectStyle,
              opacity: isApplying ? 0.6 : 1,
              cursor: isApplying ? 'not-allowed' : 'pointer',
            }}
          >
            {availableLayouts.map(algorithm => (
              <option key={algorithm} value={algorithm}>
                {layoutDisplayNames[algorithm]}
              </option>
            ))}
          </select>
        </div>

        {/* Layout Options */}
        <div style={toggleRowStyle}>
          <button
            onClick={handleAnimationToggle}
            style={layoutConfig.animate ? activeButtonStyle : { ...buttonStyle, ...toggleStyle }}
            disabled={isApplying}
            title="Enable smooth animations when applying layouts"
          >
            Animate
          </button>
          
          <button
            onClick={handleFitToggle}
            style={layoutConfig.fit ? activeButtonStyle : { ...buttonStyle, ...toggleStyle }}
            disabled={isApplying}
            title="Automatically fit the graph to the viewport"
          >
            Fit View
          </button>
        </div>

        {/* Live Update Toggle (only for force-directed layouts) */}
        {showLiveUpdate && (
          <div>
            <button
              onClick={handleLiveUpdateToggle}
              style={layoutConfig.liveUpdate ? activeButtonStyle : { ...buttonStyle, ...toggleStyle }}
              disabled={isApplying}
              title="Enable continuous simulation for force-directed layouts"
            >
              Live Update
            </button>
          </div>
        )}

        {isApplying && (
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

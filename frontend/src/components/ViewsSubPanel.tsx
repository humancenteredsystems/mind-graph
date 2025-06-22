/**
 * ViewsSubPanel - Graph visualization and view controls
 * 
 * Contains layout algorithms, hierarchy selection, and filtering
 * controls that affect how the graph is visualized.
 */

import React from 'react';
import CollapsibleSection from './CollapsibleSection';
import LayoutSection from './LayoutSection';
import HierarchiesSection from './HierarchiesSection';
import { useView } from '../context/ViewContext';
import { theme } from '../config';
import { buildDataToolsButtonStyle, buildGraphToolsSectionStyle } from '../utils/styleUtils';

export const ViewsSubPanel: React.FC = () => {
  const viewContext = useView() as any; // Type assertion to work around caching issue
  const { active, hideUnassociated, setHideUnassociated } = viewContext;
  
  // Determine if toggle should be enabled (only when a hierarchy is selected)
  const isToggleEnabled = active !== 'none';
  
  const toggleContainerStyle = {
    marginBottom: '16px',
    padding: '8px 0',
    borderBottom: `1px solid ${theme.colors.border.default}`,
  };
  
  const toggleRowStyle = {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: '8px',
  };
  
  const toggleLabelStyle = {
    fontSize: '12px',
    fontWeight: 500,
    color: isToggleEnabled ? theme.colors.text.primary : theme.colors.text.secondary,
    flex: 1,
  };
  
  const toggleSwitchStyle = {
    position: 'relative' as const,
    width: '36px',
    height: '20px',
    backgroundColor: isToggleEnabled 
      ? (hideUnassociated ? theme.colors.node.selected : theme.colors.background.secondary)
      : '#f3f4f6', // Light gray for disabled state
    borderRadius: '10px',
    border: isToggleEnabled 
      ? `1px solid ${theme.colors.border.default}`
      : '2px dashed #d1d5db', // Dashed border for disabled state
    cursor: isToggleEnabled ? 'pointer' : 'not-allowed',
    opacity: isToggleEnabled ? 1 : 0.8, // More visible when disabled
    transition: 'all 0.2s ease',
    // Add subtle pattern for disabled state
    backgroundImage: isToggleEnabled ? 'none' : 'repeating-linear-gradient(45deg, transparent, transparent 2px, rgba(255,255,255,0.3) 2px, rgba(255,255,255,0.3) 4px)',
  };
  
  const toggleKnobStyle = {
    position: 'absolute' as const,
    top: isToggleEnabled ? '2px' : '1px', // Adjust for thicker border when disabled
    left: hideUnassociated ? (isToggleEnabled ? '18px' : '17px') : '2px',
    width: '14px',
    height: '14px',
    backgroundColor: isToggleEnabled ? 'white' : '#e5e7eb', // Grayer knob when disabled
    borderRadius: '50%',
    transition: 'all 0.2s ease',
    boxShadow: isToggleEnabled 
      ? '0 1px 2px rgba(0, 0, 0, 0.2)'
      : '0 1px 2px rgba(0, 0, 0, 0.1)', // Lighter shadow when disabled
    border: isToggleEnabled ? 'none' : '1px solid #d1d5db', // Border on disabled knob
  };

  const handleToggleClick = () => {
    if (isToggleEnabled) {
      setHideUnassociated(!hideUnassociated);
    }
  };

  return (
    <div className="views-sub-panel">
      <h3 style={{ 
        fontSize: '14px', 
        fontWeight: 600, 
        marginBottom: '12px',
        color: theme.colors.text.primary 
      }}>
        Views
      </h3>
      
      {/* Pinned Association Filter Toggle */}
      <div style={toggleContainerStyle}>
        <div style={toggleRowStyle}>
          <span style={toggleLabelStyle}>
            Hide Un-Associated Nodes
          </span>
          <div 
            style={toggleSwitchStyle}
            onClick={handleToggleClick}
            title={
              isToggleEnabled 
                ? `${hideUnassociated ? 'Show' : 'Hide'} nodes not associated with the selected hierarchy`
                : 'Select a hierarchy to enable this filter'
            }
          >
            <div style={toggleKnobStyle} />
          </div>
        </div>
      </div>
      
      {/* Layout Section */}
      <LayoutSection />

      {/* Hierarchies Section - Dynamic hierarchy-based views */}
      <HierarchiesSection />

      {/* Filters Section */}
      <CollapsibleSection 
        title="Filters" 
        icon="🔽"
        defaultExpanded={false}
      >
        <div style={buildGraphToolsSectionStyle()}>
          <button
            disabled
            style={buildDataToolsButtonStyle(true)}
            title="Coming soon: Node and edge filtering"
          >
            🔽 Node Filters
          </button>
          
          <button
            disabled
            style={buildDataToolsButtonStyle(true)}
            title="Coming soon: Edge filtering"
          >
            🔗 Edge Filters
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

export default ViewsSubPanel;

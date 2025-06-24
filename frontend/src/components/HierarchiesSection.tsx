/**
 * HierarchiesSection - Hierarchy-specific views selection component
 * 
 * Provides UI for switching between hierarchy-specific graph views
 * including dynamic hierarchy views generated from available hierarchies.
 */

import React, { useEffect } from 'react';
import { useView } from '../context/ViewContext';
import { useHierarchyContext } from '../hooks/useHierarchy';
import { executeQuery } from '../services/ApiService';
import { GET_LEVELS_FOR_HIERARCHY } from '../graphql/queries';
import { theme } from '../config';
import { css } from '../utils/styleUtils';
import CollapsibleSection from './CollapsibleSection';

export const HierarchiesSection: React.FC = () => {
  const { active, setActive } = useView();
  const { hierarchies } = useHierarchyContext();

  // No competing default logic - h0 is the stable default set by ViewContext

  // Hierarchy options with h0 (None/Categories) at the top
  const hierarchyOptions = [
    { id: 'hierarchy-h0', label: 'None', icon: '📂' },
    ...hierarchies.filter(h => h.id !== 'h0').map(h => ({
      id: `hierarchy-${h.id}`,
      label: h.name,
      icon: '🌳'
    }))
  ];

  // Style definitions using existing theme system
  const buttonStyle = css({
    padding: '6px 10px',
    border: `1px solid ${theme.colors.border.default}`,
    borderRadius: '4px',
    fontSize: '12px',
    backgroundColor: theme.colors.background.secondary,
    color: theme.colors.text.primary,
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    width: '100%',
    textAlign: 'left' as const,
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    fontWeight: 500,
  });

  const activeButtonStyle = css({
    ...buttonStyle,
    backgroundColor: theme.colors.node.selected,
    borderColor: theme.colors.border.active,
    color: theme.colors.text.inverse,
  });

  const sectionContainerStyle = css({
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '2px',
  });

  return (
    <CollapsibleSection 
      title="Hierarchies" 
      icon="🌳"
      defaultExpanded={true}
    >
      <div style={sectionContainerStyle}>
        {hierarchyOptions.map((item) => {
          const selected = active === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setActive(item.id)}
              style={selected ? activeButtonStyle : buttonStyle}
              title={item.id === 'hierarchy-h0' 
                ? 'Categorize nodes using the None hierarchy'
                : `Switch to ${item.label} hierarchy view`
              }
            >
              <span>{item.icon}</span>
              <span>{item.label}</span>
            </button>
          );
        })}
        
        {/* Show message if no hierarchies available */}
        {hierarchies.length === 0 && (
          <div style={{
            fontSize: '11px',
            color: theme.colors.text.secondary,
            fontStyle: 'italic',
            padding: '8px 4px',
            textAlign: 'center' as const,
          }}>
            No hierarchies available.<br />
            Create hierarchies in Settings to see hierarchy views.
          </div>
        )}
      </div>
    </CollapsibleSection>
  );
};

export default HierarchiesSection;

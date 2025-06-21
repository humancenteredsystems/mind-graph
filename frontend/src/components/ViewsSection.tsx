/**
 * ViewsSection - Graph views/lens selection component
 * 
 * Provides UI for switching between different graph views (lenses)
 * including dynamic hierarchy views and static views like Default and Type Clusters.
 */

import React from 'react';
import { useView } from '../context/ViewContext';
import { useHierarchyContext } from '../hooks/useHierarchy';
import { LensGroup } from '@mims/lens-types';
import { theme } from '../config';
import { css } from '../utils/styleUtils';
import CollapsibleSection from './CollapsibleSection';

export const ViewsSection: React.FC = () => {
  const { active, setActive } = useView();
  const { hierarchies } = useHierarchyContext();

  // Dynamic grouping based on available hierarchies
  const groups: LensGroup[] = [
    {
      label: "Hierarchies",
      items: hierarchies.map(h => ({
        id: `hierarchy-${h.id}`,
        label: h.name,
        icon: "🌳"
      }))
    },
    {
      label: "General",
      items: [
        { id: "default", label: "Default", icon: "⚪" },
        { id: "type-cluster", label: "Type Clusters", icon: "📦" }
      ]
    }
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

  const groupLabelStyle = css({
    fontSize: '10px',
    fontWeight: 600,
    color: theme.colors.text.secondary,
    marginBottom: '4px',
    marginTop: '8px',
    textTransform: 'uppercase' as const,
    letterSpacing: '0.5px',
  });

  const groupContainerStyle = css({
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '2px',
  });

  const sectionContainerStyle = css({
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '4px',
  });

  // Don't show the first group label if it's the first group
  const showGroupLabel = (groupIndex: number, group: LensGroup) => {
    return groupIndex > 0 || group.items.length === 0;
  };

  return (
    <CollapsibleSection 
      title="Views" 
      icon="👁️"
      defaultExpanded={true}
    >
      <div style={sectionContainerStyle}>
        {groups.map((group, groupIndex) => (
          <div key={group.label} style={groupContainerStyle}>
            {showGroupLabel(groupIndex, group) && group.items.length > 0 && (
              <div style={groupLabelStyle}>{group.label}</div>
            )}
            {group.items.map((item) => {
              const selected = active === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => setActive(item.id)}
                  style={selected ? activeButtonStyle : buttonStyle}
                  title={`Switch to ${item.label} view`}
                >
                  <span>{item.icon}</span>
                  <span>{item.label}</span>
                </button>
              );
            })}
          </div>
        ))}
        
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

export default ViewsSection;

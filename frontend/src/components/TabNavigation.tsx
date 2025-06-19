import React from 'react';
import { buildTabStyle } from '../utils/styleUtils';
import { theme } from '../config/theme';

export interface Tab {
  id: string;
  label: string;
  disabled?: boolean;
}

interface TabNavigationProps {
  tabs: Tab[];
  activeTab: string;
  onTabChange: (tabId: string) => void;
  variant?: 'default' | 'admin';
}

/**
 * Reusable tab navigation component
 * Provides consistent tab styling and behavior across modals
 */
const TabNavigation: React.FC<TabNavigationProps> = ({
  tabs,
  activeTab,
  onTabChange,
  variant = 'default',
}) => {
  const getTabStyle = (tab: Tab, isActive: boolean) => {
    if (variant === 'admin') {
      // Use admin-specific tab styling
      return {
        flex: 1,
        padding: '12px 16px',
        border: 'none',
        background: isActive 
          ? theme.components.adminModal.tab.active.background 
          : theme.components.adminModal.tab.inactive.background,
        cursor: tab.disabled ? 'not-allowed' : 'pointer',
        fontWeight: isActive 
          ? theme.components.adminModal.tab.active.fontWeight 
          : theme.components.adminModal.tab.inactive.fontWeight,
        borderBottom: `2px solid ${isActive 
          ? theme.components.adminModal.tab.active.borderColor 
          : theme.components.adminModal.tab.inactive.borderColor}`,
        opacity: tab.disabled ? 0.6 : 1,
      };
    }
    
    // Use default tab styling
    return {
      ...buildTabStyle(isActive),
      cursor: tab.disabled ? 'not-allowed' : 'pointer',
      opacity: tab.disabled ? 0.6 : 1,
    };
  };

  const handleTabClick = (tab: Tab) => {
    if (!tab.disabled) {
      onTabChange(tab.id);
    }
  };

  return (
    <div style={{
      display: 'flex',
      borderBottom: `1px solid ${theme.colors.border.light}`,
      flexShrink: 0,
    }}>
      {tabs.map((tab) => {
        const isActive = tab.id === activeTab;
        
        return (
          <button
            key={tab.id}
            onClick={() => handleTabClick(tab)}
            disabled={tab.disabled}
            style={getTabStyle(tab, isActive)}
            aria-selected={isActive}
            role="tab"
          >
            {tab.label}
          </button>
        );
      })}
    </div>
  );
};

export default TabNavigation;

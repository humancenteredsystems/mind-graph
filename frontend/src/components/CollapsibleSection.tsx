/**
 * CollapsibleSection - Reusable collapsible section component
 * 
 * Provides a consistent collapsible section with smooth animations
 * following the established theme and styling patterns.
 */

import React, { useState } from 'react';
import { theme } from '../config';
import { css } from '../utils/styleUtils';

interface CollapsibleSectionProps {
  title: string;
  icon?: string;
  defaultExpanded?: boolean;
  badge?: string | number;
  children: React.ReactNode;
}

const CollapsibleSection: React.FC<CollapsibleSectionProps> = ({
  title,
  icon,
  defaultExpanded = true,
  badge,
  children,
}) => {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);

  const headerStyle = css({
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '8px 0',
    cursor: 'pointer',
    borderBottom: `1px solid ${theme.colors.border.default}`,
    marginBottom: isExpanded ? '8px' : '0',
    transition: 'all 0.2s ease',
  });

  const titleContainerStyle = css({
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
  });

  const titleStyle = css({
    fontSize: '12px',
    fontWeight: 600,
    color: theme.colors.text.primary,
    margin: 0,
  });

  const iconStyle = css({
    fontSize: '12px',
  });

  const badgeStyle = css({
    fontSize: '10px',
    padding: '2px 6px',
    borderRadius: '10px',
    background: theme.colors.background.secondary,
    color: theme.colors.text.secondary,
    fontWeight: 500,
  });

  const chevronStyle = css({
    fontSize: '10px',
    color: theme.colors.text.secondary,
    transform: isExpanded ? 'rotate(90deg)' : 'rotate(0deg)',
    transition: 'transform 0.2s ease',
  });

  const contentStyle = css({
    overflow: 'hidden',
    transition: 'all 0.2s ease',
    maxHeight: isExpanded ? '1000px' : '0',
    opacity: isExpanded ? 1 : 0,
  });

  const contentInnerStyle = css({
    paddingTop: isExpanded ? '4px' : '0',
  });

  return (
    <div>
      <div 
        style={headerStyle}
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div style={titleContainerStyle}>
          {icon && <span style={iconStyle}>{icon}</span>}
          <span style={titleStyle}>{title}</span>
          {badge && <span style={badgeStyle}>{badge}</span>}
        </div>
        <span style={chevronStyle}>▶</span>
      </div>
      
      <div style={contentStyle}>
        <div style={contentInnerStyle}>
          {children}
        </div>
      </div>
    </div>
  );
};

export default CollapsibleSection;

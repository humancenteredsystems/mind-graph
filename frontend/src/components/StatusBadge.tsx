import React from 'react';
import { buildStatusBadgeStyle } from '../utils/styleUtils';

export type StatusType = 
  | 'running' 
  | 'completed' 
  | 'failed' 
  | 'healthy' 
  | 'not-accessible' 
  | 'error' 
  | 'unknown'
  | 'active'
  | 'inactive';

interface StatusBadgeProps {
  status: StatusType;
  label?: string;
  title?: string;
  onClick?: () => void;
}

/**
 * Reusable status badge component
 * Provides consistent status indicator styling across the application
 */
const StatusBadge: React.FC<StatusBadgeProps> = ({
  status,
  label,
  title,
  onClick,
}) => {
  // Map some status types to the buildStatusBadgeStyle function
  const getStatusForStyle = (status: StatusType): StatusType => {
    switch (status) {
      case 'active':
        return 'healthy';
      case 'inactive':
        return 'error';
      default:
        return status;
    }
  };

  // Get display label
  const getDisplayLabel = (status: StatusType, customLabel?: string): string => {
    if (customLabel) return customLabel;
    
    switch (status) {
      case 'running':
        return 'Running';
      case 'completed':
        return 'Completed';
      case 'failed':
        return 'Failed';
      case 'healthy':
        return 'Healthy';
      case 'not-accessible':
        return 'Not Accessible';
      case 'error':
        return 'Error';
      case 'unknown':
        return 'Unknown';
      case 'active':
        return 'Active';
      case 'inactive':
        return 'Inactive';
      default:
        return status;
    }
  };

  const styleStatus = getStatusForStyle(status);
  const displayLabel = getDisplayLabel(status, label);

  const badgeStyle = {
    ...buildStatusBadgeStyle(styleStatus as 'running' | 'completed' | 'failed' | 'healthy' | 'not-accessible' | 'error' | 'unknown'),
    ...(onClick && { cursor: 'pointer' }),
  };

  return (
    <span
      style={badgeStyle}
      title={title || `Status: ${displayLabel}`}
      onClick={onClick}
    >
      {displayLabel}
    </span>
  );
};

interface StatusIconProps {
  isActive: boolean;
  activeColor?: string;
  inactiveColor?: string;
  size?: number;
}

/**
 * Simple status icon component (✓/✗)
 * Used for boolean status indicators
 */
export const StatusIcon: React.FC<StatusIconProps> = ({
  isActive,
  activeColor = '#22c55e',
  inactiveColor = '#ef4444',
  size = 18,
}) => (
  <span 
    style={{
      color: isActive ? activeColor : inactiveColor,
      fontWeight: 'bold',
      fontSize: size,
    }}
  >
    {isActive ? '✓' : '✗'}
  </span>
);

export default StatusBadge;

import React from 'react';
import { theme } from '../config';

interface EmptyGraphStateProps {
  onAddNode?: (parentId?: string, position?: { x: number; y: number }) => void;
}

const EmptyGraphState: React.FC<EmptyGraphStateProps> = ({ onAddNode }) => {
  return (
    <div
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'rgba(255, 255, 255, 0.9)',
        zIndex: 10,
        pointerEvents: 'none', // Let clicks pass through to GraphView underneath
      }}
    >
      <div
        style={{
          textAlign: 'center',
          color: theme.colors.text.secondary,
          fontSize: '1.2rem',
          pointerEvents: 'auto', // Re-enable pointer events for this content
        }}
      >
        <div
          onClick={() => onAddNode?.()}
          style={{
            cursor: 'pointer',
            padding: '1rem',
            borderRadius: '8px',
            transition: 'all 0.2s ease',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = theme.colors.background.secondary;
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = 'transparent';
          }}
        >
          Click to add first node
        </div>
        <div
          style={{
            fontSize: '0.9rem',
            marginTop: '0.5rem',
            color: theme.colors.text.muted,
          }}
        >
          Or right-click anywhere to open menu
        </div>
      </div>
    </div>
  );
};

export default EmptyGraphState;

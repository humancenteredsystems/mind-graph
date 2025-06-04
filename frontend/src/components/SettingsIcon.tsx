import React from 'react';
import { useUIContext } from '../hooks/useUI';

const SettingsIcon: React.FC = () => {
  const { openSettingsModal } = useUIContext();

  return (
    <button 
      onClick={openSettingsModal}
      style={{
        position: 'fixed',
        top: 16,
        left: 16,
        zIndex: 1000,
        background: 'rgba(255, 255, 255, 0.95)',
        border: '1px solid #ddd',
        borderRadius: '50%',
        padding: 10,
        cursor: 'pointer',
        fontSize: 16,
        width: 40,
        height: 40,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        transition: 'all 0.2s ease',
        boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.background = 'rgba(255, 255, 255, 1)';
        e.currentTarget.style.transform = 'rotate(90deg)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.background = 'rgba(255, 255, 255, 0.95)';
        e.currentTarget.style.transform = 'rotate(0deg)';
      }}
      aria-label="Open Settings"
      title="Settings"
    >
      ⚙️
    </button>
  );
};

export default SettingsIcon;

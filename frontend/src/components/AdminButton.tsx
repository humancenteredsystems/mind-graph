import React from 'react';
import { useUIContext } from '../hooks/useUI';

const AdminButton: React.FC = () => {
  const { openAdminModal } = useUIContext();

  return (
    <button
      onClick={openAdminModal}
      style={{
        position: 'fixed',
        bottom: 20,
        left: 20,
        zIndex: 1000,
        padding: '12px 16px',
        background: '#374151',
        color: 'white',
        border: 'none',
        borderRadius: 8,
        fontSize: 14,
        fontWeight: 500,
        cursor: 'pointer',
        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        transition: 'all 0.2s ease',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.background = '#1f2937';
        e.currentTarget.style.transform = 'translateY(-2px)';
        e.currentTarget.style.boxShadow = '0 6px 16px rgba(0, 0, 0, 0.2)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.background = '#374151';
        e.currentTarget.style.transform = 'translateY(0)';
        e.currentTarget.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.15)';
      }}
      title="Open Admin Tools"
    >
      <span style={{ fontSize: 16 }}>🔧</span>
      Admin Tools
    </button>
  );
};

export default AdminButton;

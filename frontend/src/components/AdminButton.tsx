import React from 'react';
import { useUIContext } from '../hooks/useUI';

const AdminButton: React.FC = () => {
  const { openAdminModal } = useUIContext();

  const accentColor = 'var(--color-accent, #2563eb)';
  const accentHoverColor = 'color-mix(in srgb, var(--color-accent, #2563eb) 85%, black)';
  const accentContrastColor = 'var(--color-accent-contrast, #f8fafc)';

  return (
    <button
      onClick={openAdminModal}
      style={{
        position: 'fixed',
        bottom: 20,
        left: 20,
        zIndex: 1000,
        padding: '12px 16px',
        background: accentColor,
        color: accentContrastColor,
        border: '1px solid var(--color-border-strong, rgba(148, 163, 184, 0.35))',
        borderRadius: 8,
        fontSize: 14,
        fontWeight: 500,
        cursor: 'pointer',
        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        transition: 'transform 0.2s ease, box-shadow 0.2s ease, background 0.2s ease',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.background = accentHoverColor;
        e.currentTarget.style.transform = 'translateY(-2px)';
        e.currentTarget.style.boxShadow = '0 6px 16px rgba(0, 0, 0, 0.2)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.background = accentColor;
        e.currentTarget.style.transform = 'translateY(0)';
        e.currentTarget.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.15)';
      }}
      title="Open Admin Tools"
    >
      <span style={{ fontSize: 16, color: accentContrastColor }}>🔧</span>
      Admin Tools
    </button>
  );
};

export default AdminButton;

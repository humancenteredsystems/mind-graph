import React, { useRef, useEffect } from 'react';
import { MenuType, MenuItem } from '../types/contextMenu';
import { useContextMenu } from '../context/ContextMenuContext';

const ContextMenu: React.FC = () => {
  const { open, position, items, closeMenu } = useContextMenu();
  const menuRef = useRef<HTMLUListElement>(null);

  // Close when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        closeMenu();
      }
    };
    if (open) {
      window.addEventListener('mousedown', handleClickOutside);
    }
    return () => window.removeEventListener('mousedown', handleClickOutside);
  }, [open, closeMenu]);

  if (!open) return null;

  return (
    <ul
      ref={menuRef}
      role="menu"
      style={{
        position: 'fixed',
        top: position.y,
        left: position.x,
        listStyle: 'none',
        padding: 0,
        margin: 0,
        background: '#fff',
        border: '1px solid #ccc',
        boxShadow: '0 2px 10px rgba(0,0,0,0.2)',
        zIndex: 1000,
        minWidth: 160,
      }}
    >
      {items.map((item) => (
        <li
          key={item.id}
          role="menuitem"
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: '4px 8px',
            cursor: 'pointer',
          }}
          onClick={() => {
            item.action();
            closeMenu();
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              item.action();
              closeMenu();
            }
          }}
          tabIndex={0}
        >
          <span>
            {item.icon} {item.label}
          </span>
          {item.shortcut && (
            <span style={{ marginLeft: 8, color: '#888', fontSize: '0.8em' }}>
              {item.shortcut}
            </span>
          )}
        </li>
      ))}
    </ul>
  );
};

export default ContextMenu;
